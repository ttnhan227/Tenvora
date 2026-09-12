import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Index from "@/pages/Index";

describe("Product story", () => {
  it("showcases the freelancer cash-flow workflow", () => {
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: /Know what came in/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Statement Import & Matching/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /Free Workspace/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /From client to confirmed income/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Open this step/i })).not.toBeInTheDocument();
    expect(document.querySelector('a[href="/payments?import=1"]')).toBeNull();
    expect(screen.queryByText(/Create Your Workspace/i)).not.toBeInTheDocument();
    expect(document.querySelectorAll('img[src^="/product/"]')).toHaveLength(0);
    expect(screen.queryByText("1. Invoice")).not.toBeInTheDocument();
  });
});
