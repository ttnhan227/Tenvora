import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Search,
  BarChart3,
  ArrowRightLeft,
  Wallet,
  BookOpen,
  Layers,
  CheckCircle2,
  Users,
  ShieldAlert,
  FileText,
  Server,
  ArrowUpRight,
  Newspaper,
  Activity,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction?: (actionName: string) => void;
}

export function CommandPalette({ open, onOpenChange, onAction }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const navigationItems = [
    { label: "Operations Overview", path: "/dashboard", icon: BarChart3, category: "Operations" },
    { label: "Transfers & Fund Movement", path: "/transfers", icon: ArrowRightLeft, category: "Operations" },
    { label: "Transactions Journal", path: "/transactions", icon: Activity, category: "Operations" },
    { label: "Accounts & Customer Entities", path: "/accounts", icon: Wallet, category: "Operations" },
    { label: "General Ledger Journal", path: "/ledger", icon: BookOpen, category: "Financial" },
    { label: "Automated Reconciliation Hub", path: "/reconciliation", icon: CheckCircle2, category: "Financial" },
    { label: "Settlement Batches & Net Clearing", path: "/settlements", icon: Layers, category: "Financial" },
    { label: "Risk Review & Rule Engine", path: "/risk", icon: ShieldAlert, category: "Control" },
    { label: "Audit Event Log", path: "/audit", icon: FileText, category: "Control" },
    { label: "Financial Intelligence & Regulatory Feeds", path: "/intelligence", icon: Newspaper, category: "Intelligence" },
    { label: "Team & Role-Based Access Control (RBAC)", path: "/admin/users", icon: Users, category: "Administration" },
    { label: "System Health & Infrastructure Telemetry", path: "/system", icon: Server, category: "Administration" },
  ];

  const filtered = navigationItems.filter(
    (item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path: string) => {
    onOpenChange(false);
    setQuery("");
    navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-card border border-border shadow-2xl rounded-lg text-xs">
        <div className="flex items-center px-3.5 border-b border-border/80 bg-muted/20">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0 mr-2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions, accounts, ledger, or jump to page..."
            className="h-10 border-0 bg-transparent text-xs focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
            autoFocus
          />
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-[9px] font-mono text-muted-foreground border border-border">
            ESC
          </kbd>
        </div>

        <div className="max-h-[300px] overflow-y-auto p-1.5 space-y-0.5 text-xs">
          {filtered.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(item.path)}
              className="w-full flex items-center justify-between p-2 rounded hover:bg-muted/60 text-left transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <item.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                <span className="font-medium text-foreground truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground">
                <span className="hidden sm:inline uppercase">{item.category}</span>
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-xs font-mono">
              No matching pages found for "{query}"
            </div>
          )}
        </div>

        <div className="px-3.5 py-2 border-t border-border/60 bg-muted/20 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
          <div className="flex items-center gap-3">
            <span><kbd className="bg-card px-1 py-0.2 rounded border">↑</kbd> <kbd className="bg-card px-1 py-0.2 rounded border">↓</kbd> navigate</span>
            <span><kbd className="bg-card px-1 py-0.2 rounded border">↵</kbd> select</span>
          </div>
          <span>Tenvora Command Palette</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
