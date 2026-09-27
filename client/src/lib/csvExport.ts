/**
 * CSV Export utility with UTF-8 BOM for Microsoft Excel & Google Sheets compatibility.
 */

export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
}

export function exportToCsv<T>(filename: string, columns: CsvColumn<T>[], data: T[]): void {
  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const headerLine = columns.map((col) => escapeCell(col.header)).join(",");
  const rowsLines = data.map((row) =>
    columns.map((col) => escapeCell(col.accessor(row))).join(",")
  );

  // Prepend UTF-8 BOM (\uFEFF) so Excel respects UTF-8 (Vietnamese characters, currencies)
  const csvContent = "\uFEFF" + [headerLine, ...rowsLines].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
