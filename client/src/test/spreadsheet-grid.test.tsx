import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SpreadsheetGrid } from "@/components/expenses/SpreadsheetGrid";
import { Expense } from "@/services/expenseService";

const mockExpenses: Expense[] = [
  {
    id: "exp-1",
    amount: 85.50,
    currency: "USD",
    merchant: "Delta Air Lines",
    category: "Travel",
    description: "Flight to client site",
    status: "Draft",
    flagged: false,
    receiptUrls: [],
    date: "2026-08-10T00:00:00.000Z",
    createdAt: "2026-08-10T00:00:00.000Z",
    riskAssessment: {
      riskScore: 15,
      riskLevel: "Low",
      riskReasons: ["Routine travel"],
      policyTriggers: [],
      anomalyFlags: []
    }
  }
];

describe("SpreadsheetGrid Component", () => {
  it("renders table column headers and expense row cells", () => {
    const onSaved = vi.fn();
    render(<SpreadsheetGrid initialExpenses={mockExpenses} onSaved={onSaved} />);

    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Merchant")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("Currency")).toBeInTheDocument();
    expect(screen.getByText("Delta Air Lines")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });
});
