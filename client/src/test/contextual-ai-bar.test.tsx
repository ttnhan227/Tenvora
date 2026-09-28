import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContextualAiBar } from "@/components/assistant/ContextualAiBar";

describe("Contextual AI bar", () => {
  it("offers customer-aware actions and sends the selected prompt to the agent", () => {
    const onPrompt = vi.fn();
    render(<ContextualAiBar pathname="/customers" isVietnamese={false} onPrompt={onPrompt} />);

    expect(screen.getByText("AI copilot for customers")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Who owes us money/i }));

    expect(onPrompt).toHaveBeenCalledWith("Who owes us money?");
  });

  it("does not add an assistant banner to settings", () => {
    const { container } = render(
      <ContextualAiBar pathname="/settings" isVietnamese={false} onPrompt={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
