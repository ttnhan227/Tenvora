import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AssistantMessageContent } from "@/components/assistant/AssistantMessageContent";
import { normalizeAssistantMarkdown } from "@/lib/assistantMarkdown";

describe("Assistant response formatting", () => {
  it("renders headings, lists, tables, and financial values as readable content", () => {
    render(
      <AssistantMessageContent
        text={`## Cash-flow summary

- Confirmed income: $10,000.00 USD
- Tax reserve: 25%

| Item | Amount |
| --- | ---: |
| Safe to spend | $7,500.00 USD |`}
      />
    );

    expect(screen.getByRole("heading", { name: "Cash-flow summary" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("$7,500.00 USD")).toHaveClass("font-mono");
  });

  it("normalizes common plain-text list markers and separates dense sentences", () => {
    expect(normalizeAssistantMarkdown("1) First step\n2) Second step")).toBe("1. First step\n2. Second step");
    expect(normalizeAssistantMarkdown("Income is confirmed. Tax is estimated."))
      .toBe("Income is confirmed.\n\nTax is estimated.");
  });
});
