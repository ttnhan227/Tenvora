import React, { useState, useEffect, useRef } from "react";
import { 
  AlertCircle, 
  Save, 
  Trash2, 
  Info,
  Download,
  Upload,
  Plus,
  Check,
  FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { expenseService, Expense } from "@/services/expenseService";

interface UnsavedChanges {
  [expenseId: string]: {
    merchant?: string;
    category?: string;
    amount?: number;
    currency?: string;
    date?: string;
    description?: string;
  };
}

interface CellValidationErrors {
  [expenseId: string]: {
    [field: string]: string;
  };
}

const CATEGORIES = ["Travel", "Meals", "Accommodation", "Office Supplies", "Software", "Alcohol", "Other"];
const CURRENCIES = ["USD", "VND", "EUR"];

interface SpreadsheetGridProps {
  initialExpenses: Expense[];
  onSaved: () => void;
  userRole?: string;
}

export const SpreadsheetGrid = ({ initialExpenses, onSaved }: SpreadsheetGridProps) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [unsaved, setUnsaved] = useState<UnsavedChanges>({});
  const [errors, setErrors] = useState<CellValidationErrors>({});
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [editing, setEditing] = useState<boolean>(false);
  const [editValue, setEditValue] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const gridRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const columns = ["Date", "Merchant", "Category", "Amount", "Currency", "Risk Score"];

  useEffect(() => {
    setExpenses(initialExpenses);
  }, [initialExpenses]);

  const validateCell = (field: string, value: unknown): string => {
    const strVal = String(value ?? "").trim();
    if (field === "amount") {
      const num = Number(value);
      if (isNaN(num)) return "Amount must be a valid number";
      if (num <= 0) return "Amount must be greater than 0";
    }
    if (field === "merchant") {
      if (!strVal) return "Merchant name is required";
      if (strVal.length < 2) return "Merchant name must be at least 2 characters";
    }
    if (field === "date") {
      if (!strVal) return "Date is required";
      const date = new Date(strVal);
      if (isNaN(date.getTime())) return "Invalid date format";
    }
    return "";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!activeCell) return;
    
    if (editing) {
      if (e.key === "Enter") {
        saveCellEdit();
        e.preventDefault();
      } else if (e.key === "Escape") {
        setEditing(false);
        e.preventDefault();
      }
      return;
    }

    const { row, col } = activeCell;

    switch (e.key) {
      case "ArrowUp":
        if (row > 0) setActiveCell({ row: row - 1, col });
        e.preventDefault();
        break;
      case "ArrowDown":
        if (row < expenses.length - 1) setActiveCell({ row: row + 1, col });
        e.preventDefault();
        break;
      case "ArrowLeft":
        if (col > 0) setActiveCell({ row, col: col - 1 });
        e.preventDefault();
        break;
      case "ArrowRight":
        if (col < columns.length - 1) setActiveCell({ row, col: col + 1 });
        e.preventDefault();
        break;
      case "Tab":
        if (e.shiftKey) {
          if (col > 0) setActiveCell({ row, col: col - 1 });
          else if (row > 0) setActiveCell({ row: row - 1, col: columns.length - 1 });
        } else {
          if (col < columns.length - 1) setActiveCell({ row, col: col + 1 });
          else if (row < expenses.length - 1) setActiveCell({ row: row + 1, col: 0 });
        }
        e.preventDefault();
        break;
      case "Enter":
        startEditing();
        e.preventDefault();
        break;
      case "Delete":
      case "Backspace": {
        const currentExp = expenses[row];
        const fieldName = columns[col].toLowerCase() as keyof UnsavedChanges[string];
        if (currentExp.status === "Draft") {
          const emptyVal = fieldName === "amount" ? 0 : "";
          const err = validateCell(fieldName, emptyVal);
          
          setErrors(prev => ({
            ...prev,
            [currentExp.id]: {
              ...(prev[currentExp.id] || {}),
              [fieldName]: err
            }
          }));

          setUnsaved(prev => ({
            ...prev,
            [currentExp.id]: {
              ...(prev[currentExp.id] || {}),
              [fieldName]: emptyVal
            }
          }));
        }
        e.preventDefault();
        break;
      }
    }
  };

  const startEditing = () => {
    if (!activeCell) return;
    const { row, col } = activeCell;
    const expense = expenses[row];
    if (expense.status !== "Draft") {
      toast.info("Only draft expenses can be modified in the ledger");
      return;
    }

    const fieldName = columns[col].toLowerCase();
    const currentVal = unsaved[expense.id]?.[fieldName as keyof UnsavedChanges[string]] ?? (expense as Record<string, unknown>)[fieldName];
    setEditValue(currentVal !== undefined ? String(currentVal) : "");
    setEditing(true);
  };

  const saveCellEdit = () => {
    if (!activeCell) return;
    const { row, col } = activeCell;
    const expense = expenses[row];
    const fieldName = columns[col].toLowerCase();

    let parsedVal: string | number = editValue.trim();
    if (fieldName === "amount") {
      parsedVal = Number(parsedVal);
    }

    const err = validateCell(fieldName, parsedVal);

    setErrors(prev => {
      const currentExpErrors = { ...(prev[expense.id] || {}) };
      if (err) {
        currentExpErrors[fieldName] = err;
      } else {
        delete currentExpErrors[fieldName];
      }
      return {
        ...prev,
        [expense.id]: currentExpErrors
      };
    });

    setUnsaved(prev => ({
      ...prev,
      [expense.id]: {
        ...(prev[expense.id] || {}),
        [fieldName]: parsedVal
      }
    }));

    setEditing(false);
  };

  const handleBulkUpdate = async () => {
    setIsSubmitting(true);
    try {
      const updates = Object.entries(unsaved).map(([id, payload]) => {
        return expenseService.update(id, payload as Parameters<typeof expenseService.update>[1]);
      });

      await Promise.all(updates);
      toast.success("Ledger saved successfully");
      setUnsaved({});
      setErrors({});
      onSaved();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message || "Failed to save ledger updates";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDisplayCurrency = (val: number, cur: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
    }).format(val);
  };

  const stats = {
    totalCount: expenses.length,
    draftCount: expenses.filter(e => e.status === "Draft").length,
    highRiskCount: expenses.filter(e => e.riskAssessment?.riskLevel === "High").length,
    totalErrors: Object.values(errors).reduce((acc, errs) => acc + Object.keys(errs).length, 0),
    selectedAmount: activeCell ? (expenses[activeCell.row]?.amount || 0) : null
  };

  return (
    <div className="space-y-3 font-sans">
      {/* Action controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 border border-border rounded-md">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-foreground" />
          <span className="text-xs font-bold text-foreground">Rapid Ledger Fast-Entry</span>
          <span className="text-[10px] text-muted-foreground font-mono">
            (Arrow keys to navigate, Enter to edit, Esc to cancel)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {Object.keys(unsaved).length > 0 && (
            <Button
              size="xs"
              variant="signal"
              onClick={handleBulkUpdate}
              disabled={isSubmitting || stats.totalErrors > 0}
              className="gap-1.5"
            >
              <Save className="h-3 w-3" />
              Save {Object.keys(unsaved).length} Changes
            </Button>
          )}
        </div>
      </div>

      {/* Spreadsheet Grid Viewport */}
      <div
        ref={gridRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="rounded-md border border-border bg-card overflow-hidden focus:outline-none focus:ring-1 focus:ring-primary/40"
      >
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                <th className="w-10 px-2 py-2 text-center border-r border-border/60">#</th>
                <th className="w-32 px-3 py-2 text-left border-r border-border/60">Date</th>
                <th className="px-3 py-2 text-left border-r border-border/60">Merchant</th>
                <th className="w-36 px-3 py-2 text-left border-r border-border/60">Category</th>
                <th className="w-28 px-3 py-2 text-right border-r border-border/60">Amount</th>
                <th className="w-20 px-3 py-2 text-center border-r border-border/60">Currency</th>
                <th className="w-28 px-3 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {expenses.map((expense, rIdx) => {
                const isDraft = expense.status === "Draft";
                const rowUnsaved = unsaved[expense.id] || {};
                const rowErrors = errors[expense.id] || {};

                return (
                  <tr key={expense.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-2 py-1.5 text-center font-mono text-[10px] text-muted-foreground border-r border-border/60 bg-muted/10">
                      {rIdx + 1}
                    </td>

                    {/* Date */}
                    <td
                      onClick={() => setActiveCell({ row: rIdx, col: 0 })}
                      onDoubleClick={() => isDraft && startEditing()}
                      className={`px-3 py-1.5 font-mono text-[11px] border-r border-border/60 cursor-pointer ${
                        activeCell?.row === rIdx && activeCell?.col === 0
                          ? "bg-secondary ring-1 ring-inset ring-foreground font-semibold"
                          : ""
                      } ${rowUnsaved.date ? "text-foreground font-bold" : "text-muted-foreground"}`}
                    >
                      {editing && activeCell?.row === rIdx && activeCell?.col === 0 ? (
                        <input
                          autoFocus
                          type="date"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveCellEdit}
                          className="w-full bg-card px-1 py-0.5 text-xs rounded border border-primary focus:outline-none"
                        />
                      ) : (
                        rowUnsaved.date || expense.date || expense.createdAt.split("T")[0]
                      )}
                    </td>

                    {/* Merchant */}
                    <td
                      onClick={() => setActiveCell({ row: rIdx, col: 1 })}
                      onDoubleClick={() => isDraft && startEditing()}
                      className={`px-3 py-1.5 border-r border-border/60 cursor-pointer ${
                        activeCell?.row === rIdx && activeCell?.col === 1
                          ? "bg-secondary ring-1 ring-inset ring-foreground font-semibold"
                          : ""
                      }`}
                    >
                      {editing && activeCell?.row === rIdx && activeCell?.col === 1 ? (
                        <input
                          autoFocus
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveCellEdit}
                          className="w-full bg-card px-1 py-0.5 text-xs rounded border border-primary focus:outline-none"
                        />
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground truncate">
                            {rowUnsaved.merchant || expense.merchant}
                          </span>
                          {rowErrors.merchant && (
                            <span title={rowErrors.merchant}>
                              <AlertCircle className="h-3 w-3 text-destructive" />
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td
                      onClick={() => setActiveCell({ row: rIdx, col: 2 })}
                      onDoubleClick={() => isDraft && startEditing()}
                      className={`px-3 py-1.5 border-r border-border/60 cursor-pointer ${
                        activeCell?.row === rIdx && activeCell?.col === 2
                          ? "bg-secondary ring-1 ring-inset ring-foreground font-semibold"
                          : ""
                      }`}
                    >
                      {editing && activeCell?.row === rIdx && activeCell?.col === 2 ? (
                        <select
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveCellEdit}
                          className="w-full bg-card px-1 py-0.5 text-xs rounded border border-primary focus:outline-none"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-muted/60 text-[10px] font-medium text-foreground">
                          {rowUnsaved.category || expense.category}
                        </span>
                      )}
                    </td>

                    {/* Amount */}
                    <td
                      onClick={() => setActiveCell({ row: rIdx, col: 3 })}
                      onDoubleClick={() => isDraft && startEditing()}
                      className={`px-3 py-1.5 text-right font-mono font-bold tabular-nums border-r border-border/60 cursor-pointer ${
                        activeCell?.row === rIdx && activeCell?.col === 3
                          ? "bg-secondary ring-1 ring-inset ring-foreground"
                          : ""
                      }`}
                    >
                      {editing && activeCell?.row === rIdx && activeCell?.col === 3 ? (
                        <input
                          autoFocus
                          type="number"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveCellEdit}
                          className="w-full text-right bg-card px-1 py-0.5 text-xs rounded border border-primary focus:outline-none font-mono"
                        />
                      ) : (
                        formatDisplayCurrency(
                          rowUnsaved.amount !== undefined ? rowUnsaved.amount : expense.amount,
                          rowUnsaved.currency || expense.currency
                        )
                      )}
                    </td>

                    {/* Currency */}
                    <td
                      onClick={() => setActiveCell({ row: rIdx, col: 4 })}
                      className="px-2 py-1.5 text-center font-mono text-[10px] text-muted-foreground border-r border-border/60"
                    >
                      {rowUnsaved.currency || expense.currency}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-1.5 text-center">
                      <Badge
                        variant={
                          expense.status === "Approved"
                            ? "success"
                            : expense.status === "Pending"
                            ? "warning"
                            : expense.status === "Rejected"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {expense.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Ledger Bottom Stats Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-3 text-[11px]">
            <span>
              Total: <strong className="font-mono text-foreground">{stats.totalCount}</strong>
            </span>
            <span>•</span>
            <span>
              Drafts: <strong className="font-mono text-foreground">{stats.draftCount}</strong>
            </span>
            <span>•</span>
            <span>
              High Risk: <strong className="font-mono text-red-600">{stats.highRiskCount}</strong>
            </span>
          </div>

          {activeCell && (
            <div className="text-[11px] font-mono text-muted-foreground">
              Row {activeCell.row + 1}, Col: {columns[activeCell.col]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
