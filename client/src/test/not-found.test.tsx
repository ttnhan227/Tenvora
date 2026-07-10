import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import NotFound from "@/pages/NotFound";

describe("NotFound", () => {
  it("gives users a route back to the application", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <MemoryRouter initialEntries={["/missing-report"]}>
        <NotFound />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "404" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /return to home/i })).toHaveAttribute("href", "/");
  });
});
