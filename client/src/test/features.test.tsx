import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Index from "@/pages/Index";

describe("Product story", () => {
  it("showcases the small-business workflow", () => {
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );
    expect(screen.getByRole("heading", { name: /Leave the notebooks behind/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Record a sale" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Know who owes you" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Track what you buy" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Remember every expense" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Start your business notebook/i })).toHaveAttribute("href", "/register");
  });
});
