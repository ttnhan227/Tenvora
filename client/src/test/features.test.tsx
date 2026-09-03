import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Features from "@/components/landing/Features";

describe("Features Component", () => {
  it("renders core Tenvora PayOps capabilities", () => {
    render(<Features />);

    expect(screen.getByText(/Double-Entry Balance Invariant/i)).toBeInTheDocument();
    expect(screen.getByText(/PostgreSQL Native RLS/i)).toBeInTheDocument();
    expect(screen.getByText(/Deadlock-Free Ascending Locks/i)).toBeInTheDocument();
    expect(screen.getByText(/Continuous Reconciliation/i)).toBeInTheDocument();
    expect(screen.getByText(/Automated Multi-Currency Clearing/i)).toBeInTheDocument();
  });
});
