import React, { useState, useEffect, useRef } from "react";
import { 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  Clipboard, 
  Sparkles, 
  X, 
  Trash2, 
  ArrowLeft,
  ArrowRight,
  TrendingDown,
  Info,
  Download,
  Upload
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
    [field: string]: string; // Field name to error message mapping
  };
}

const CATEGORIES = ["Travel", "Meals", "Accommodation", "Office Supplies", "Software", "Alcohol", "Other"];
const CURRENCIES = ["USD", "VND", "EUR"];

interface SpreadsheetGridProps {
  initialExpenses: Expense[];
  onSaved: () => void;
  userRole?: string;
}

export const SpreadsheetGrid = ({ initialExpenses, onSaved, userRole }: SpreadsheetGridProps) => {
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

  // Client-Side Validator to enforce strict data integrity rules
  const validateCell = (field: string, value: any): string => {
    const strVal = String(value).trim();
    if (field === "amount") {
      const num = Number(value);
      if (isNaN(num)) return "Amount must be a valid number";
      if (num <= 0) return "Amount must be a positive number greater than 0";
    }
    if (field === "merchant") {
      if (!strVal) return "Merchant name is required";
      if (strVal.length < 2) return "Merchant name must be at least 2 characters";
    }
    if (field === "date") {
      if (!strVal) return "Date is required";
      const date = new Date(strVal);
      if (isNaN(date.getTime())) return "Invalid date format";
      if (date > new Date()) return "Date cannot be set in the future";
    }
    if (field === "category") {
      if (!CATEGORIES.includes(value)) return "Please select a standard corporate category";
    }
    if (field === "currency") {
      if (!CURRENCIES.includes(value)) return "Please select a standard currency (USD, VND, EUR)";
    }
    return "";
  };

  // Handle cell navigation via Arrow Keys, Tab, and Enter
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

    let { row, col } = activeCell;

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
      case "Backspace":
        const currentExp = expenses[row];
        const fieldName = columns[col].toLowerCase() as keyof UnsavedChanges[string];
        if (currentExp.status === "Draft") {
          const emptyVal = fieldName === "amount" ? 0 : "";
          
          // Validate empty value
          const err = validateCell(fieldName, emptyVal);
          setErrors(prev => {
            const rowErrors = { ...prev[currentExp.id] };
            if (err) rowErrors[fieldName] = err;
            else delete rowErrors[fieldName];
            
            const newErrors = { ...prev };
            if (Object.keys(rowErrors).length > 0) newErrors[currentExp.id] = rowErrors;
            else delete newErrors[currentExp.id];
            return newErrors;
          });

          setUnsaved(prev => ({
            ...prev,
            [currentExp.id]: {
              ...prev[currentExp.id],
              [fieldName]: emptyVal
            }
          }));
        }
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          startEditing(e.key);
        }
        break;
    }
  };

  const startEditing = (initialChar = "") => {
    if (!activeCell) return;
    const expense = expenses[activeCell.row];
    if (expense.status !== "Draft") {
      toast.error("Only draft expenses can be inline edited.");
      return;
    }

    const field = columns[activeCell.col].toLowerCase();
    if (field === "risk score") {
      toast.error("Risk score is calculated automatically by the VeriSpend risk engine.");
      return;
    }

    setEditing(true);
    const currentValue = unsaved[expense.id]?.[field as keyof UnsavedChanges[string]] ?? (expense as any)[field];
    setEditValue(initialChar || String(currentValue));
  };

  const saveCellEdit = () => {
    if (!activeCell) return;
    const expense = expenses[activeCell.row];
    const field = columns[activeCell.col].toLowerCase();
    let validatedValue: string | number = editValue;
    
    if (field === "amount") {
      validatedValue = parseFloat(editValue) || 0;
    }

    // Run custom data integrity validation checks
    const err = validateCell(field, validatedValue);
    
    setErrors(prev => {
      const rowErrors = { ...prev[expense.id] };
      if (err) {
        rowErrors[field] = err;
      } else {
        delete rowErrors[field];
      }
      
      const newErrors = { ...prev };
      if (Object.keys(rowErrors).length > 0) {
        newErrors[expense.id] = rowErrors;
      } else {
        delete newErrors[expense.id];
      }
      return newErrors;
    });

    setUnsaved(prev => ({
      ...prev,
      [expense.id]: {
        ...prev[expense.id],
        [field]: validatedValue
      }
    }));
    setEditing(false);
  };

  // Support direct Ctrl+V copy paste from Excel/Sheets (TSV data format)
  const handlePaste = async (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text");
    if (!text) return;

    const rows = text.split(/\r?\n/).filter(line => line.trim() !== "");
    if (rows.length === 0) return;

    const parsedRows = rows.map(row => row.split("\t"));
    const toastId = toast.loading(`Parsing ${parsedRows.length} items from clipboard...`);

    let importedCount = 0;
    let failedCount = 0;

    for (const data of parsedRows) {
      try {
        if (data.length < 3) continue;

        const dateStr = data[0] || new Date().toISOString().split("T")[0];
        const merchant = data[1] || "Excel Import";
        
        let category = data[2] || "Other";
        if (!CATEGORIES.includes(category)) {
          const matched = CATEGORIES.find(c => c.toLowerCase() === category.toLowerCase());
          category = matched || "Other";
        }

        const amount = parseFloat(data[3].replace(/[$,VND]/g, "")) || 0;
        
        let currency = data[4] || "USD";
        if (!CURRENCIES.includes(currency)) {
          const matched = CURRENCIES.find(c => c.toLowerCase() === currency.toLowerCase());
          currency = matched || "USD";
        }

        const description = data[5] || "Bulk imported from spreadsheet";

        const result = await expenseService.create({
          amount,
          currency,
          merchant,
          category,
          date: dateStr,
          description
        });

        if (result.success && result.data) {
          importedCount++;
        } else {
          failedCount++;
        }
      } catch (err) {
        failedCount++;
      }
    }

    toast.dismiss(toastId);
    if (importedCount > 0) {
      toast.success(`Successfully imported ${importedCount} draft expenses!`);
      onSaved();
    }
    if (failedCount > 0) {
      toast.error(`Failed to import ${failedCount} items. Please verify data formats.`);
    }
  };

  // Support Importing standard CSV files
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvText = event.target?.result as string;
      if (!csvText) return;

      const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== "");
      if (lines.length <= 1) {
        toast.error("CSV file is empty or missing data rows.");
        return;
      }

      const hasHeader = lines[0].toLowerCase().includes("date") || lines[0].toLowerCase().includes("merchant");
      const dataLines = hasHeader ? lines.slice(1) : lines;

      const toastId = toast.loading(`Parsing ${dataLines.length} rows from CSV...`);
      let importedCount = 0;
      let failedCount = 0;

      for (const line of dataLines) {
        const data = line.split(",").map(cell => cell.replace(/^["']|["']$/g, "").trim());
        try {
          if (data.length < 3) continue;

          const dateStr = data[0] || new Date().toISOString().split("T")[0];
          const merchant = data[1] || "CSV Import";
          
          let category = data[2] || "Other";
          if (!CATEGORIES.includes(category)) {
            const matched = CATEGORIES.find(c => c.toLowerCase() === category.toLowerCase());
            category = matched || "Other";
          }

          const amount = parseFloat(data[3].replace(/[$,VND]/g, "")) || 0;
          
          let currency = data[4] || "USD";
          if (!CURRENCIES.includes(currency)) {
            const matched = CURRENCIES.find(c => c.toLowerCase() === currency.toLowerCase());
            currency = matched || "USD";
          }

          const description = data[5] || "Bulk imported from CSV file";

          const result = await expenseService.create({
            amount,
            currency,
            merchant,
            category,
            date: dateStr,
            description
          });

          if (result.success && result.data) {
            importedCount++;
          } else {
            failedCount++;
          }
        } catch (err) {
          failedCount++;
        }
      }

      toast.dismiss(toastId);
      if (importedCount > 0) {
        toast.success(`Successfully imported ${importedCount} draft expenses!`);
        onSaved();
      }
      if (failedCount > 0) {
        toast.error(`Failed to import ${failedCount} rows. Please verify formatting.`);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset
  };

  // Support exporting current grid to CSV
  const handleExportCSV = () => {
    if (expenses.length === 0) {
      toast.error("No data available to export.");
      return;
    }

    const headers = ["Date", "Merchant", "Category", "Amount", "Currency", "Risk Score", "Status"];
    const rows = expenses.map(e => [
      e.date.split("T")[0],
      `"${e.merchant.replace(/"/g, '""')}"`,
      e.category,
      e.amount,
      e.currency,
      `${e.riskAssessment?.riskScore || 0}%`,
      e.status
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `expenses-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Spreadsheet data successfully exported to CSV!");
  };

  const handleBulkUpdate = async () => {
    // Rigid Gate: Block submit completely if client-side validation errors exist
    const totalErrorsCount = Object.values(errors).reduce((acc, rowErr) => acc + Object.keys(rowErr).length, 0);
    if (totalErrorsCount > 0) {
      toast.error(`Cannot save. Please correct the ${totalErrorsCount} validation errors highlighted in red.`);
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Saving spreadsheet changes...");
    
    try {
      const payload = Object.entries(unsaved).map(([id, changes]) => {
        const original = expenses.find(e => e.id === id)!;
        return {
          id,
          amount: changes.amount !== undefined ? changes.amount : original.amount,
          currency: changes.currency !== undefined ? changes.currency : original.currency,
          merchant: changes.merchant !== undefined ? changes.merchant : original.merchant,
          category: changes.category !== undefined ? changes.category : original.category,
          date: changes.date !== undefined ? changes.date : original.date,
          description: changes.description !== undefined ? changes.description : original.description || "Updated inline",
        };
      });

      const response = await expenseService.bulkUpdate(payload);
      toast.dismiss(toastId);

      if (response.success) {
        toast.success("Spreadsheet changes saved successfully & auto-audited by AI!");
        setUnsaved({});
        setErrors({});
        onSaved();
      } else {
        toast.error(response.error || "Failed to save edits.");
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("A network error occurred while updating.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (confirm("Are you sure you want to delete this draft expense?")) {
      const result = await expenseService.delete(id);
      if (result.success) {
        toast.success("Draft deleted");
        
        // Clean up state
        setUnsaved(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setErrors(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });

        onSaved();
      } else {
        toast.error(result.error || "Failed to delete");
      }
    }
  };

  const stats = (() => {
    const totalCount = expenses.length;
    const drafts = expenses.filter(e => e.status === "Draft");
    const highRisk = expenses.filter(e => e.riskAssessment?.riskLevel === "High");
    
    let selectedAmount = 0;
    if (activeCell) {
      const exp = expenses[activeCell.row];
      const field = columns[activeCell.col].toLowerCase();
      selectedAmount = unsaved[exp.id]?.[field as keyof UnsavedChanges[string]] as number ?? (exp as any)[field];
    }

    const totalErrors = Object.values(errors).reduce((acc, rowErr) => acc + Object.keys(rowErr).length, 0);

    return {
      totalCount,
      draftCount: drafts.length,
      highRiskCount: highRisk.length,
      selectedAmount,
      totalErrors
    };
  })();

  const formatDisplayCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const getActiveCellErrorMessage = (): string | null => {
    if (!activeCell) return null;
    const exp = expenses[activeCell.row];
    const field = columns[activeCell.col].toLowerCase();
    return errors[exp?.id]?.[field] || null;
  };

  const activeCellErrorMessage = getActiveCellErrorMessage();

  return (
    <div className="space-y-4">
      {/* Friendly Guide Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-primary shadow-sm backdrop-blur-md">
        <Sparkles className="h-5 w-5 text-primary mt-0.5 animate-pulse shrink-0" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-foreground">Spreadsheet View (Enterprise Data Grid)</p>
          <p>
            • **Quick Navigation:** Click any cell and use arrow keys <span className="font-mono bg-secondary border border-border px-1 rounded">↑ ↓ ← →</span> or <span className="font-mono bg-secondary border border-border px-1 rounded">Tab</span> to move.
          </p>
          <p>
            • **Inline Editing:** Double-click or press <span className="font-mono bg-secondary border border-border px-1 rounded">Enter</span> on any **Draft** row to edit details instantly.
          </p>
          <p>
            • **Copy-Paste Sync:** Copy a row range from Excel/Sheets and press <span className="font-mono bg-secondary border border-border px-1 rounded">Ctrl+V</span> directly on the grid to bulk import drafts!
          </p>
        </div>
      </div>

      {/* Spreadsheet container */}
      <div 
        ref={gridRef}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        tabIndex={0}
        className="outline-none border border-border rounded-2xl overflow-hidden bg-card/75 backdrop-blur-xl shadow-2xl focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-300"
      >
        {/* Ribbon toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" />
            <span className="font-semibold tracking-wider text-[10px] uppercase">Corporate Grid Mode</span>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileImport} 
              accept=".csv" 
              className="hidden" 
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fileInputRef.current?.click()} 
              className="h-8 rounded-xl border-border hover:bg-muted text-xs font-semibold gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              Import CSV
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportCSV} 
              className="h-8 rounded-xl border-border hover:bg-muted text-xs font-semibold gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Monospace fx Formula Bar & Real-Time Validator Message */}
        <div className={`flex items-center gap-3 border-b border-border px-4 py-2.5 text-sm transition-colors ${
          activeCellErrorMessage ? "bg-red-500/5 border-b-red-500/20" : "bg-card"
        }`}>
          <span className={`font-bold select-none text-xs shrink-0 ${activeCellErrorMessage ? "text-red-500" : "text-primary"}`}>
            {activeCellErrorMessage ? "⚠️ Cell Error:" : "Active Cell Value:"}
          </span>
          <input 
            type="text" 
            value={
              editing 
                ? editValue 
                : activeCell 
                  ? String(
                      unsaved[expenses[activeCell.row]?.id]?.[columns[activeCell.col].toLowerCase() as keyof UnsavedChanges[string]] ?? 
                      (expenses[activeCell.row] as any)?.[columns[activeCell.col].toLowerCase()] ?? 
                      ""
                    ) 
                  : ""
            } 
            disabled={!editing}
            onChange={(e) => setEditValue(e.target.value)}
            className="bg-transparent outline-none w-full text-xs text-foreground select-all border-none focus:ring-0 placeholder:text-muted-foreground/30 font-sans"
            placeholder="Double-click a cell or press Enter to edit details..."
          />
          {activeCellErrorMessage && (
            <Badge variant="destructive" className="shrink-0 bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/10 font-bold font-sans text-[10px] rounded-lg px-2.5 py-0.5">
              {activeCellErrorMessage}
            </Badge>
          )}
        </div>

        {/* Spreadsheet Data Grid */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-muted/50 text-[11px] font-medium tracking-wider text-muted-foreground uppercase border-b border-border">
                <th className="px-4 py-3 border-r border-border w-12 text-center select-none bg-muted/20">#</th>
                {columns.map((col, idx) => (
                  <th key={idx} className="px-4 py-3 border-r border-border text-foreground font-semibold">{col}</th>
                ))}
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense, rIdx) => {
                const isDraft = expense.status === "Draft";
                const rowUnsaved = unsaved[expense.id] !== undefined;

                return (
                  <tr 
                    key={expense.id} 
                    className={`hover:bg-muted/30 transition-colors border-b border-border ${
                      rowUnsaved ? "bg-primary/[0.01]" : ""
                    }`}
                  >
                    {/* Index count cell */}
                    <td className="px-4 py-2 border-r border-border text-center text-xs text-muted-foreground bg-muted/10 select-none font-mono">
                      {rIdx + 1}
                    </td>

                    {/* Columns mapping */}
                    {columns.map((col, cIdx) => {
                      const field = col.toLowerCase() as keyof UnsavedChanges[string];
                      const isSelected = activeCell?.row === rIdx && activeCell?.col === cIdx;
                      const cellUnsavedValue = unsaved[expense.id]?.[field];
                      const isCellEdited = cellUnsavedValue !== undefined;
                      const isCellInvalid = errors[expense.id]?.[field] !== undefined;
                      const rawVal = (expense as any)[field];
                      
                      let displayValue = isCellEdited ? cellUnsavedValue : rawVal;

                      let cellContent = String(displayValue || "");
                      if (col === "Amount") {
                        const currencyField = unsaved[expense.id]?.currency || expense.currency;
                        cellContent = formatDisplayCurrency(Number(displayValue) || 0, currencyField);
                      } else if (col === "Date") {
                        cellContent = new Date(String(displayValue)).toLocaleDateString("en-US");
                      } else if (col === "Risk Score") {
                        displayValue = expense.riskAssessment?.riskScore || 0;
                        cellContent = `${displayValue}%`;
                      }

                      const isHighRiskCell = col === "Risk Score" && (expense.riskAssessment?.riskScore || 0) > 75;
                      const isMediumRiskCell = col === "Risk Score" && (expense.riskAssessment?.riskScore || 0) > 30 && (expense.riskAssessment?.riskScore || 0) <= 75;

                      return (
                        <td 
                          key={cIdx}
                          onClick={() => { setActiveCell({ row: rIdx, col: cIdx }); setEditing(false); }}
                          onDoubleClick={() => startEditing()}
                          className={`px-4 py-2 border-r border-border relative text-xs select-none transition-all cursor-pointer ${
                            isSelected 
                              ? "ring-2 ring-primary bg-primary/[0.04] ring-offset-0 z-10" 
                              : ""
                          } ${
                            isCellInvalid 
                              ? "bg-red-500/[0.08] ring-2 ring-red-500 text-red-500 z-10 font-semibold" 
                              : ""
                          } ${
                            isHighRiskCell ? "bg-red-500/10 text-red-500 font-bold border-l-2 border-l-red-500" : ""
                          } ${
                            isMediumRiskCell ? "text-amber-500 font-semibold" : ""
                          } ${
                            col === "Amount" || col === "Date" || col === "Risk Score" ? "font-mono" : ""
                          }`}
                        >
                          {/* Unsaved cell indicator (Green triangle top-right) */}
                          {isCellEdited && !isCellInvalid && (
                            <span 
                              className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-bl-full shadow-[0_0_4px_rgba(16,185,129,0.8)]" 
                              title="Unsaved change" 
                            />
                          )}

                          {/* Validation Error Corner indicator (Red triangle top-left) */}
                          {isCellInvalid && (
                            <span 
                              className="absolute top-0 left-0 w-2.5 h-2.5 bg-red-500 rounded-br-full" 
                              title={errors[expense.id]?.[field]} 
                            />
                          )}

                          {/* Editable overlays */}
                          {editing && isSelected ? (
                            col === "Category" ? (
                              <select
                                autoFocus
                                value={String(displayValue)}
                                onChange={(e) => { setEditValue(e.target.value); }}
                                onBlur={saveCellEdit}
                                className="absolute inset-0 w-full h-full px-4 py-1.5 bg-card border border-primary text-foreground outline-none text-xs font-sans"
                              >
                                {CATEGORIES.map((cat) => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            ) : col === "Currency" ? (
                              <select
                                autoFocus
                                value={String(displayValue)}
                                onChange={(e) => { setEditValue(e.target.value); }}
                                onBlur={saveCellEdit}
                                className="absolute inset-0 w-full h-full px-4 py-1.5 bg-card border border-primary text-foreground outline-none text-xs font-mono"
                              >
                                {CURRENCIES.map((cur) => (
                                  <option key={cur} value={cur}>{cur}</option>
                                ))}
                              </select>
                            ) : col === "Date" ? (
                              <input 
                                type="date"
                                autoFocus
                                value={String(displayValue).split("T")[0]}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={saveCellEdit}
                                className="absolute inset-0 w-full h-full px-4 py-1.5 bg-card border border-primary text-foreground outline-none text-xs font-mono"
                              />
                            ) : (
                              <input 
                                type={col === "Amount" ? "number" : "text"}
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={saveCellEdit}
                                className="absolute inset-0 w-full h-full px-4 py-1.5 bg-card border border-primary text-foreground outline-none text-xs font-sans"
                              />
                            )
                          ) : (
                            <span className={isDraft ? "text-foreground" : "text-muted-foreground font-medium"}>
                              {cellContent}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Status Badge */}
                    <td className="px-4 py-2 border-r border-border text-center">
                      <Badge 
                        variant={
                          expense.status === "Approved" ? "default" :
                          expense.status === "Pending" ? "secondary" :
                          expense.status === "Rejected" ? "destructive" : "outline"
                        }
                        className={`text-[10px] px-2 py-0.5 rounded ${
                          expense.status === "Approved" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10" :
                          expense.status === "Pending" ? "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/10" :
                          expense.status === "Rejected" ? "bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/10" :
                          "bg-muted text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {expense.status}
                      </Badge>
                    </td>

                    {/* Actions column */}
                    <td className="px-4 py-2 text-right">
                      <div className="flex gap-2 justify-end">
                        {isDraft && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDraft(expense.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Delete draft expense"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 3} className="text-center py-16 text-muted-foreground text-xs font-sans">
                    <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50 animate-pulse" />
                    No expenses found. Paste rows from Excel to populate drafts instantly.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Status bottom bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span>Expenses:</span>
              <span className="text-foreground font-bold font-mono">{stats.totalCount}</span>
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1.5">
              <span>Drafts:</span>
              <span className="text-foreground font-bold font-mono">{stats.draftCount}</span>
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1.5">
              <span className="text-red-500">High Risk Claims:</span>
              <span className="text-red-500 font-bold font-mono">{stats.highRiskCount}</span>
            </span>
            {stats.totalErrors > 0 && (
              <>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1.5 text-red-500 font-semibold animate-pulse">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Validation Errors:</span>
                  <span className="font-bold font-mono">{stats.totalErrors}</span>
                </span>
              </>
            )}
          </div>

          {activeCell && (
            <div className="flex items-center gap-2">
              <span>Selected Value:</span>
              <span className="text-primary font-bold font-mono">
                {columns[activeCell.col] === "Amount" && typeof stats.selectedAmount === "number"
                  ? formatDisplayCurrency(stats.selectedAmount)
                  : String(stats.selectedAmount || "EMPTY")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Floating Save HUD Panel */}
      {Object.keys(unsaved).length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-6 px-6 py-4 bg-popover/90 border border-primary/30 shadow-[0_0_30px_rgba(0,0,0,0.15)] rounded-full animate-in slide-in-from-bottom duration-300 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <p className="text-xs font-semibold text-popover-foreground">
              You have <span className="text-primary font-bold font-mono">{Object.keys(unsaved).length}</span> unsaved changes
              {stats.totalErrors > 0 && (
                <span className="text-red-500 font-bold ml-1">
                  ({stats.totalErrors} errors require correction)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => { setUnsaved({}); setErrors({}); }} 
              className="text-muted-foreground hover:text-foreground text-xs rounded-full hover:bg-secondary px-3 h-8"
              disabled={isSubmitting}
            >
              Reset
            </Button>
            <Button 
              size="sm" 
              disabled={isSubmitting || stats.totalErrors > 0}
              className={`gap-1.5 rounded-full text-xs font-bold px-4 h-8 shadow-sm transition-all ${
                stats.totalErrors > 0 
                  ? "bg-red-500/10 text-red-500 border border-red-500/25 cursor-not-allowed hover:bg-red-500/10" 
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`} 
              onClick={handleBulkUpdate}
            >
              <Save className="h-3.5 w-3.5" />
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
