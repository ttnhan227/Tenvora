import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreatableCombobox, ComboboxOption } from "@/components/business/CreatableCombobox";
import { FloatingActionBar } from "@/components/business/FloatingActionBar";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { businessService } from "@/services/businessService";

vi.mock("@/services/businessService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/businessService")>();
  return {
    ...actual,
    businessService: {
      ...actual.businessService,
      createSupplier: vi.fn(),
      createCustomer: vi.fn(),
      createProduct: vi.fn(),
      getSupplierSmartDefaults: vi.fn(),
      getProductSmartDefaults: vi.fn(),
    },
  };
});

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LanguageProvider defaultLanguage="en">{ui}</LanguageProvider>
    </QueryClientProvider>
  );
}

describe("Phase 2: CreatableCombobox & Inline Create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockOptions: ComboboxOption[] = [
    { id: "s-1", label: "Acme Supplies", sublabel: "owes: $500" },
    { id: "s-2", label: "Global Trading" },
  ];

  it("renders existing options and selects an item", async () => {
    const handleChange = vi.fn();
    renderWithProviders(
      <CreatableCombobox
        entityType="supplier"
        value=""
        onChange={handleChange}
        options={mockOptions}
        placeholder="Search or create supplier..."
      />
    );

    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveTextContent("Search or create supplier...");

    fireEvent.click(trigger);
    expect(screen.getByText("Acme Supplies")).toBeInTheDocument();
    expect(screen.getByText("Global Trading")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Acme Supplies"));
    expect(handleChange).toHaveBeenCalledWith("s-1", undefined);
  });

  it("filters options when typing and offers + Create when unknown name typed", async () => {
    const handleChange = vi.fn();
    renderWithProviders(
      <CreatableCombobox
        entityType="supplier"
        value=""
        onChange={handleChange}
        options={mockOptions}
        placeholder="Search or create supplier..."
      />
    );

    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: "Brand New Supplier" } });

    expect(screen.queryByText("Acme Supplies")).not.toBeInTheDocument();
    const createButton = screen.getByText(/Create "Brand New Supplier"/i);
    expect(createButton).toBeInTheDocument();
  });

  it("submits quick create inline and injects newly created entity without page reload", async () => {
    const handleChange = vi.fn();
    const handleCreated = vi.fn();
    vi.mocked(businessService.createSupplier).mockResolvedValue({
      id: "s-new",
      name: "New Inline Supplier",
      status: "Active",
      paymentTermsDays: 15,
      outstandingBalance: 0,
      totalPurchases: 0,
      totalPaid: 0,
      purchaseCount: 0,
      currency: "USD",
      createdAt: new Date().toISOString(),
    });

    renderWithProviders(
      <CreatableCombobox
        entityType="supplier"
        value=""
        onChange={handleChange}
        onCreated={handleCreated}
        options={mockOptions}
      />
    );

    // Open dropdown
    fireEvent.click(screen.getByRole("combobox"));
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: "New Inline Supplier" } });

    // Click "+ Create"
    fireEvent.click(screen.getByText(/Create "New Inline Supplier"/i));

    // Inline dialog opens
    expect(screen.getByText("Quick Add Supplier")).toBeInTheDocument();
    const nameInput = screen.getByDisplayValue("New Inline Supplier");
    expect(nameInput).toBeInTheDocument();

    // Submit inline dialog
    const saveButton = screen.getByRole("button", { name: /save & select/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(businessService.createSupplier).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New Inline Supplier" })
      );
      expect(handleChange).toHaveBeenCalledWith(
        "s-new",
        expect.objectContaining({ id: "s-new", name: "New Inline Supplier" })
      );
      expect(handleCreated).toHaveBeenCalled();
    });
  });

  it("supports creating product inline with unit and prices", async () => {
    const handleChange = vi.fn();
    vi.mocked(businessService.createProduct).mockResolvedValue({
      id: "p-new",
      name: "Organic Coffee Beans",
      unit: "kg",
      defaultPrice: 150000,
      costPrice: 90000,
      stockQuantity: 0,
      minStockLevel: 0,
      trackInventory: true,
      currency: "VND",
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    renderWithProviders(
      <CreatableCombobox
        entityType="product"
        value=""
        onChange={handleChange}
        options={[]}
      />
    );

    fireEvent.click(screen.getByRole("combobox"));
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: "Organic Coffee Beans" } });

    fireEvent.click(screen.getByText(/Create "Organic Coffee Beans"/i));

    expect(screen.getByText("Quick Add Product")).toBeInTheDocument();
    const saveBtn = screen.getByRole("button", { name: /save & select/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(businessService.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Organic Coffee Beans",
        })
      );
      expect(handleChange).toHaveBeenCalledWith("p-new", expect.anything());
    });
  });
});

describe("Phase 2: FloatingActionBar Component", () => {
  it("renders selected count, clear button, and children actions", () => {
    const onClear = vi.fn();
    renderWithProviders(
      <FloatingActionBar selectedCount={4} onClear={onClear}>
        <button type="button">Archive</button>
      </FloatingActionBar>
    );

    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("items selected")).toBeInTheDocument();
    expect(screen.getByText("Archive")).toBeInTheDocument();

    const clearBtn = screen.getByTitle("Clear selection");
    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalled();
  });
});
