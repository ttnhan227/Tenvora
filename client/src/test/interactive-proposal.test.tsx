import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { InteractiveProposalCard } from "@/components/assistant/InteractiveProposalCard";

describe("InteractiveProposalCard", () => {
  it("submits an edited product through the persisted AI action exactly once", async () => {
    const onDecision = vi.fn().mockResolvedValue(true);
    render(
      <InteractiveProposalCard
        proposal={{
          actionId: "action-product",
          intent: "create_product",
          status: "PendingConfirmation",
          riskLevel: "Low",
          requiresConfirmation: true,
          summary: "Create product cappuccino?",
          details: { Product: "cappuccino", Unit: "item", "Default price": "0 VND" },
        }}
        busy={false}
        isVietnamese={false}
        currency="VND"
        onDecision={onDecision}
      />
    );

    fireEvent.change(screen.getByDisplayValue("item"), { target: { value: "cup" } });
    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "35000" } });
    fireEvent.click(screen.getByRole("button", { name: /Save & Create Product/i }));

    await waitFor(() => expect(onDecision).toHaveBeenCalledTimes(1));
    expect(onDecision).toHaveBeenCalledWith(true, {
      name: "cappuccino",
      unit: "cup",
      unitPrice: 35000,
    });
  });

  it("turns a missing sale product into a prefilled product draft with a required price", async () => {
    const onReply = vi.fn();
    render(
      <InteractiveProposalCard
        proposal={{
          actionId: null,
          intent: "create_product",
          status: "NeedsClarification",
          riskLevel: "Low",
          requiresConfirmation: false,
          summary: "Robusta coffee is not in the product catalog yet.",
          details: {
            Product: "Robusta coffee",
            Unit: "kg",
            "Default price": "0 USD",
            "Price required": "true",
            "Pending sale": "Cong Huynh bought 1kg bag of Robusta coffee",
          },
        }}
        busy={false}
        isVietnamese={false}
        currency="USD"
        onDecision={vi.fn()}
        onReply={onReply}
      />
    );

    expect(screen.getByDisplayValue("Robusta coffee")).toBeInTheDocument();
    expect(screen.getByDisplayValue("kg")).toBeInTheDocument();
    const save = screen.getByRole("button", { name: /Save & Create Product/i });
    expect(save).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "18" } });
    await waitFor(() => expect(screen.getByRole("button", { name: /Save & Create Product/i })).toBeEnabled());
    fireEvent.submit(screen.getByRole("button", { name: /Save & Create Product/i }).closest("form")!);

    await waitFor(() => expect(onReply).toHaveBeenCalledWith(
      "Create product Robusta coffee, unit kg, price 18 USD. After creating it, continue pending sale: Cong Huynh bought 1kg bag of Robusta coffee",
    ));
  });

  it("removes a generic article and confirms the completed customer draft", async () => {
    const onDecision = vi.fn().mockResolvedValue(true);
    render(
      <InteractiveProposalCard
        proposal={{
          actionId: "action-customer",
          intent: "create_customer",
          status: "PendingConfirmation",
          riskLevel: "Low",
          requiresConfirmation: true,
          summary: "Create a customer?",
          details: { Name: "a" },
        }}
        busy={false}
        isVietnamese={false}
        onDecision={onDecision}
      />
    );

    const nameInput = screen.getByPlaceholderText(/Enter customer name/i);
    expect(nameInput).toHaveValue("");
    fireEvent.change(nameInput, { target: { value: "Anh Minh" } });
    fireEvent.change(screen.getByPlaceholderText("Phone..."), { target: { value: "0901234567" } });
    fireEvent.click(screen.getByRole("button", { name: /Save & Create Customer/i }));

    await waitFor(() => expect(onDecision).toHaveBeenCalledTimes(1));
    expect(onDecision).toHaveBeenCalledWith(true, {
      name: "Anh Minh",
      phone: "0901234567",
      address: null,
      email: null,
    });
  });

  it("submits an edited expense through the confirmation endpoint", async () => {
    const onDecision = vi.fn().mockResolvedValue(true);
    render(
      <InteractiveProposalCard
        proposal={{
          actionId: "action-expense",
          intent: "expense",
          status: "PendingConfirmation",
          riskLevel: "Financial",
          requiresConfirmation: true,
          summary: "Record the expense?",
          details: { Category: "Electricity", Amount: "450,000 VND", Description: "September" },
        }}
        busy={false}
        isVietnamese={false}
        currency="VND"
        onDecision={onDecision}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Confirm & Record Expense/i }));

    await waitFor(() => expect(onDecision).toHaveBeenCalledTimes(1));
    expect(onDecision).toHaveBeenCalledWith(true, {
      category: "Electricity",
      amount: 450000,
      description: "September",
    });
  });

  it.each(["Executed", "Cancelled", "Expired", "Failed"])(
    "does not reopen an editable form for %s actions",
    (status) => {
      render(
        <InteractiveProposalCard
          proposal={{
            actionId: "finished-action",
            intent: "create_customer",
            status,
            riskLevel: "Low",
            requiresConfirmation: false,
            summary: "Create a customer?",
            details: {},
          }}
          busy={false}
          isVietnamese={false}
          onDecision={vi.fn()}
        />
      );

      expect(screen.queryByPlaceholderText(/Enter customer name/i)).not.toBeInTheDocument();
    }
  );

  it("keeps the completed entity identity visible", () => {
    render(
      <InteractiveProposalCard
        proposal={{
          actionId: "finished-customer",
          intent: "create_customer",
          status: "Executed",
          riskLevel: "Low",
          requiresConfirmation: false,
          summary: "Customer created: Anh Minh.",
          details: {
            name: "Anh Minh",
            phone: "0901234567",
            Result: "Customer created: Anh Minh.",
          },
        }}
        busy={false}
        isVietnamese={false}
        onDecision={vi.fn()}
      />
    );

    expect(screen.getByText("Customer created: Anh Minh.")).toBeInTheDocument();
    expect(screen.getByText("Anh Minh")).toBeInTheDocument();
    expect(screen.getByText("0901234567")).toBeInTheDocument();
  });
});
