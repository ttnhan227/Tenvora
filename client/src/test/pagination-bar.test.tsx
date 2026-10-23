import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaginationBar } from "@/components/business/PaginationBar";
import { LanguageProvider } from "@/contexts/LanguageContext";

describe("PaginationBar", () => {
  it("renders correctly with currentPage and totalItems signature", () => {
    const handlePageChange = vi.fn();

    render(
      <LanguageProvider>
        <PaginationBar
          currentPage={1}
          totalItems={45}
          pageSize={20}
          onPageChange={handlePageChange}
        />
      </LanguageProvider>
    );

    // Displays page indicator 1 / 3
    expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();

    // Check count text
    expect(screen.getByText(/45/)).toBeInTheDocument();

    // Prev button is disabled on page 1
    const prevButton = screen.getByRole("button", { name: /trước|prev/i });
    expect(prevButton).toBeDisabled();

    // Next button is enabled on page 1
    const nextButton = screen.getByRole("button", { name: /sau|next/i });
    expect(nextButton).not.toBeDisabled();

    // Clicking Next calls onPageChange with 2
    fireEvent.click(nextButton);
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it("renders correctly with page, totalPages, and totalCount signature", () => {
    const handlePageChange = vi.fn();

    render(
      <LanguageProvider>
        <PaginationBar
          page={3}
          totalPages={3}
          totalCount={45}
          pageSize={20}
          onPageChange={handlePageChange}
          itemName="products"
        />
      </LanguageProvider>
    );

    // Displays page indicator 3 / 3
    expect(screen.getByText(/3 \/ 3/)).toBeInTheDocument();

    // Next button is disabled on the last page
    const nextButton = screen.getByRole("button", { name: /sau|next/i });
    expect(nextButton).toBeDisabled();

    // Prev button is enabled
    const prevButton = screen.getByRole("button", { name: /trước|prev/i });
    expect(prevButton).not.toBeDisabled();

    // Clicking Prev calls onPageChange with 2
    fireEvent.click(prevButton);
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it("renders compact total when total count fits in a single page", () => {
    const handlePageChange = vi.fn();

    render(
      <LanguageProvider>
        <PaginationBar
          currentPage={1}
          totalItems={8}
          pageSize={20}
          onPageChange={handlePageChange}
        />
      </LanguageProvider>
    );

    // Does not render prev/next buttons
    expect(screen.queryByRole("button", { name: /sau|next/i })).not.toBeInTheDocument();
    expect(screen.getByText(/8/)).toBeInTheDocument();
  });
});
