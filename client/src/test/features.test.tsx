import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Features from "@/components/landing/Features";

describe("Features Component", () => {
  it("renders core spend lifecycle capabilities", () => {
    render(<Features />);

    expect(screen.getByText(/Explainable Risk Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/Approval Orchestration/i)).toBeInTheDocument();
    expect(screen.getByText(/Finance Intelligence/i)).toBeInTheDocument();
    expect(screen.getByText(/Multi-tenant Architecture/i)).toBeInTheDocument();
    expect(screen.getByText(/Compliance Evidence/i)).toBeInTheDocument();
  });
});
