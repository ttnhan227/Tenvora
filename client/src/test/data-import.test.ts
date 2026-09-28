import { describe, expect, it } from "vitest";
import {
  importDate,
  importDefinitions,
  importNumber,
  normalizeImportText,
  readImportFile,
} from "@/lib/dataImport";

function csvFile(contents: string) {
  const blob = new Blob([contents], { type: "text/csv" });
  return Object.assign(blob, {
    name: "records.csv",
    lastModified: Date.now(),
    text: async () => contents,
  }) as File;
}

describe("data import parsing", () => {
  it("parses quoted commas without splitting a field", async () => {
    const rows = await readImportFile(
      csvFile('Name,Phone,Address\n"Nguyen, An",0901,"12 Main Street, Da Nang"'),
      importDefinitions.customers,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].data.name).toBe("Nguyen, An");
    expect(rows[0].data.address).toBe("12 Main Street, Da Nang");
  });

  it("recognizes Vietnamese headers and semicolon-separated decimal values", async () => {
    const rows = await readImportFile(
      csvFile("Tên hàng;Đơn vị;Giá bán;Giá vốn;Tồn kho\nCà phê Robusta;túi;12,50;8,25;20"),
      importDefinitions.products,
    );

    expect(rows[0].data.name).toBe("Cà phê Robusta");
    expect(importNumber(rows[0].data.defaultPrice)).toBe(12.5);
    expect(importNumber(rows[0].data.costPrice)).toBe(8.25);
  });

  it("accepts accounting headers that include currency labels", async () => {
    const rows = await readImportFile(
      csvFile("Category,Amount (USD),Expense Date\nUtilities,125.50,2026-09-28"),
      importDefinitions.expenses,
    );

    expect(rows[0].data.category).toBe("Utilities");
    expect(importNumber(rows[0].data.amount)).toBe(125.5);
  });

  it("rejects files that omit a required column", async () => {
    await expect(readImportFile(csvFile("Phone,Address\n0901,Hanoi"), importDefinitions.customers))
      .rejects.toThrow("Missing required column: Name");
  });

  it("normalizes accents and parses common financial number and date formats", () => {
    expect(normalizeImportText("Cà phê Đắk Lắk")).toBe("ca phe dak lak");
    expect(importNumber("1.234,56 ₫")).toBe(1234.56);
    expect(importNumber("25,000")).toBe(25000);
    expect(importDate("28/09/2026")).toContain("2026-09-28");
  });
});
