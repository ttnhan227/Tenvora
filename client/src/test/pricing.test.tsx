import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Pricing from "@/components/landing/Pricing";
import { AuthProvider } from "@/contexts/AuthContext";

describe("Pricing Component", () => {
  it("renders all subscription tiers and CTA buttons", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Pricing />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /Starter/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Professional/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Enterprise/i })).toBeInTheDocument();
    expect(screen.getByText("$29")).toBeInTheDocument();
    expect(screen.getByText("$79")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });
});
