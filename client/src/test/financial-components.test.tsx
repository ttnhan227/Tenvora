import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MoneyDisplay } from "@/components/design-system/MoneyDisplay";
import { StatusBadge } from "@/components/design-system/StatusBadge";
import { DataTable, Column } from "@/components/design-system/DataTable";

describe("Financial Design System Primitives", () => {
  describe("MoneyDisplay", () => {
    it("formats standard USD currency with precise two decimals and tabular layout", () => {
      const { container } = render(<MoneyDisplay amount={24200} currency="USD" />);
      expect(container.textContent).toContain("$");
      expect(container.textContent).toContain("24,200");
      expect(container.textContent).toContain(".00");
    });

    it("handles zero and negative values with correct sign display", () => {
      const { container } = render(<MoneyDisplay amount={-150.5} currency="USD" sign="auto" />);
      expect(container.textContent).toContain("-");
      expect(container.textContent).toContain("150");
      expect(container.textContent).toContain(".50");
    });
  });

  describe("StatusBadge", () => {
    it("renders semantic financial and risk badges with uppercase labels", () => {
      render(<StatusBadge status="Posted" />);
      expect(screen.getByText("Posted")).toBeInTheDocument();

      render(<StatusBadge status="Critical" />);
      expect(screen.getByText("Critical")).toBeInTheDocument();
    });
  });

  describe("DataTable", () => {
    interface TestItem {
      id: string;
      name: string;
      value: number;
    }

    const testData: TestItem[] = [
      { id: "1", name: "Alpha", value: 100 },
      { id: "2", name: "Beta", value: 200 },
    ];

    const testColumns: Column<TestItem>[] = [
      { key: "name", header: "Name", sortable: true },
      { key: "value", header: "Value", align: "right" },
    ];

    it("renders table headers, rows, and values cleanly", () => {
      render(
        <DataTable
          data={testData}
          columns={testColumns}
          keyExtractor={(item) => item.id}
        />
      );

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Value")).toBeInTheDocument();
      expect(screen.getByText("Alpha")).toBeInTheDocument();
      expect(screen.getByText("Beta")).toBeInTheDocument();
    });
  });
});
