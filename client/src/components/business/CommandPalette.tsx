import { useState, useEffect, useCallback, useTransition } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import {
  Search,
  Sparkles,
  Plus,
  Receipt,
  CreditCard,
  ArrowRight,
  Clock,
  User,
  Package,
  ShoppingCart,
  Truck,
  Loader2,
  X,
  FileCheck2,
  BarChart3,
  Settings,
  HelpCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { searchService, OmniSearchResult } from "@/services/searchService";
import { businessMoney } from "@/services/businessService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenAi: (prompt?: string) => void;
  onScanInvoice?: (type: "purchase" | "expense") => void;
  onPaySupplier?: () => void;
}

interface RecentPaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  type: "action" | "navigation" | "customer" | "product" | "sale" | "purchase";
  href?: string;
  actionKey?: string;
}

const RECENT_STORAGE_KEY = "tenvora_recent_palette";

export function CommandPalette({
  open,
  onOpenChange,
  onOpenAi,
  onScanInvoice,
  onPaySupplier,
}: CommandPaletteProps) {
  const { t, isVietnamese } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<OmniSearchResult | null>(null);
  const [recentItems, setRecentItems] = useState<RecentPaletteItem[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const currency = user?.preferredCurrency ?? "VND";

  const addRecent = useCallback((item: RecentPaletteItem) => {
    setRecentItems((prev) => {
      const filtered = prev.filter((i) => i.id !== item.id);
      const next = [item, ...filtered].slice(0, 8);
      try {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const clearRecent = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentItems([]);
    try {
      localStorage.removeItem(RECENT_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Debounced server search
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const res = await searchService.search(trimmed, 6);
      if (res.success && res.data) {
        setSearchResults(res.data);
      } else {
        setSearchResults(null);
      }
      setIsSearching(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Reset query on open change
  useEffect(() => {
    if (!open) {
      setQuery("");
      setSearchResults(null);
      setIsSearching(false);
    }
  }, [open]);

  const runAction = (action: () => void, recent?: RecentPaletteItem) => {
    if (recent) addRecent(recent);
    onOpenChange(false);
    startTransition(() => {
      action();
    });
  };

  const hasSearchResults =
    searchResults &&
    (searchResults.customers.length > 0 ||
      searchResults.products.length > 0 ||
      searchResults.sales.length > 0 ||
      searchResults.purchases.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-2xl overflow-hidden p-0 border-border bg-card/98 backdrop-blur-xl shadow-2xl rounded-2xl"
      >
        <DialogTitle className="sr-only">
          {t("command.title", undefined, "Global Command Bar")}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t("command.description", undefined, "Search records or execute quick actions across your store.")}
        </DialogDescription>

        <Command
          shouldFilter={false}
          filter={() => 1}
          className="flex flex-col w-full text-foreground"
        >
          {/* Search Header */}
          <div className="flex items-center border-b border-border px-4 py-3">
            <Search className="mr-3 h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder={t("command.placeholder", undefined, "Search products, customers, sales, POs, or type a command...")}
              className="flex h-7 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            {isSearching && <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />}
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[420px] overflow-y-auto p-2 custom-scrollbar">
            {/* Empty state when query provided and nothing found */}
            {query.trim().length >= 2 && !isSearching && !hasSearchResults && (
              <div className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("command.no_results", undefined, "No records found matching")} &ldquo;{query}&rdquo;
                </p>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() =>
                      runAction(() => {
                        onOpenAi(query);
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{t("command.ask_copilot", undefined, "Ask AI Copilot about this")}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Omni Search Results */}
            {hasSearchResults && (
              <>
                {/* Customers */}
                {searchResults.customers.length > 0 && (
                  <Command.Group
                    heading={t("command.group.customers", undefined, "Customers")}
                    className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    {searchResults.customers.map((c) => (
                      <Command.Item
                        key={c.id}
                        value={`customer ${c.name} ${c.phone ?? ""}`}
                        onSelect={() =>
                          runAction(
                            () => navigate(`/customers?search=${encodeURIComponent(c.name)}`),
                            {
                              id: `customer-${c.id}`,
                              title: c.name,
                              subtitle: c.phone ?? undefined,
                              type: "customer",
                              href: `/customers?search=${encodeURIComponent(c.name)}`,
                            }
                          )
                        }
                        className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer select-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                            <User className="h-4 w-4" />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold truncate">{c.name}</p>
                            {c.phone && <p className="text-xs text-muted-foreground truncate">{c.phone}</p>}
                          </div>
                        </div>
                        {c.totalDebt > 0 ? (
                          <span className="shrink-0 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                            {t("command.owes", undefined, "Owes")}: {businessMoney(c.totalDebt, currency)}
                          </span>
                        ) : (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {t("command.no_debt", undefined, "Clean balance")}
                          </span>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Products */}
                {searchResults.products.length > 0 && (
                  <Command.Group
                    heading={t("command.group.products", undefined, "Products & Inventory")}
                    className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    {searchResults.products.map((p) => (
                      <Command.Item
                        key={p.id}
                        value={`product ${p.name} ${p.sku ?? ""}`}
                        onSelect={() =>
                          runAction(
                            () => navigate(`/products?search=${encodeURIComponent(p.name)}`),
                            {
                              id: `product-${p.id}`,
                              title: p.name,
                              subtitle: p.sku ?? undefined,
                              type: "product",
                              href: `/products?search=${encodeURIComponent(p.name)}`,
                            }
                          )
                        }
                        className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer select-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <Package className="h-4 w-4" />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {p.sku ? `SKU: ${p.sku} • ` : ""}
                              {businessMoney(p.sellingPrice, currency)} / {p.unit}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          {p.trackInventory ? (
                            p.stockQuantity <= 0 ? (
                              <span className="inline-flex items-center text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                                {t("command.out_of_stock", undefined, "Out of stock")}
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-xs font-mono font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {t("command.stock", undefined, "Stock")}: {p.stockQuantity} {p.unit}
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {t("command.no_tracking", undefined, "Service")}
                            </span>
                          )}
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Sales */}
                {searchResults.sales.length > 0 && (
                  <Command.Group
                    heading={t("command.group.sales", undefined, "Sales Orders")}
                    className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    {searchResults.sales.map((s) => (
                      <Command.Item
                        key={s.id}
                        value={`sale ${s.invoiceNumber} ${s.customerName ?? ""}`}
                        onSelect={() =>
                          runAction(
                            () => navigate(`/sales?search=${encodeURIComponent(s.invoiceNumber)}`),
                            {
                              id: `sale-${s.id}`,
                              title: s.invoiceNumber,
                              subtitle: s.customerName ?? undefined,
                              type: "sale",
                              href: `/sales?search=${encodeURIComponent(s.invoiceNumber)}`,
                            }
                          )
                        }
                        className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer select-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <ShoppingCart className="h-4 w-4" />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold truncate">{s.invoiceNumber}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {s.customerName || t("common.walkin_customer", undefined, "Walk-in Customer")}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-mono text-xs font-bold text-foreground">
                            {businessMoney(s.totalAmount, currency)}
                          </p>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                              s.paidAmount >= s.totalAmount
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-amber-500/10 text-amber-600"
                            }`}
                          >
                            {s.paidAmount >= s.totalAmount
                              ? t("common.paid", undefined, "Paid")
                              : t("common.unpaid", undefined, "Partial")}
                          </span>
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Purchases */}
                {searchResults.purchases.length > 0 && (
                  <Command.Group
                    heading={t("command.group.purchases", undefined, "Purchases & Restocks")}
                    className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    {searchResults.purchases.map((p) => (
                      <Command.Item
                        key={p.id}
                        value={`purchase ${p.purchaseNumber} ${p.supplierName ?? ""}`}
                        onSelect={() =>
                          runAction(
                            () => navigate(`/purchases?search=${encodeURIComponent(p.purchaseNumber)}`),
                            {
                              id: `purchase-${p.id}`,
                              title: p.purchaseNumber,
                              subtitle: p.supplierName ?? undefined,
                              type: "purchase",
                              href: `/purchases?search=${encodeURIComponent(p.purchaseNumber)}`,
                            }
                          )
                        }
                        className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer select-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                            <Truck className="h-4 w-4" />
                          </div>
                          <div className="truncate">
                            <p className="font-semibold truncate">{p.purchaseNumber}</p>
                            <p className="text-xs text-muted-foreground truncate">{p.supplierName || "—"}</p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-mono text-xs font-bold text-foreground">
                            {businessMoney(p.totalAmount, currency)}
                          </p>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                              p.paidAmount >= p.totalAmount
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-amber-500/10 text-amber-600"
                            }`}
                          >
                            {p.paidAmount >= p.totalAmount
                              ? t("common.paid", undefined, "Paid")
                              : t("common.unpaid", undefined, "Unpaid")}
                          </span>
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </>
            )}

            {/* Default state: Recent Items, Quick Actions, and Navigation */}
            {query.trim().length < 2 && (
              <>
                {/* Recent Items */}
                {recentItems.length > 0 && (
                  <Command.Group
                    heading={
                      <div className="flex items-center justify-between">
                        <span>{t("command.group.recent", undefined, "Recent")}</span>
                        <button
                          type="button"
                          onClick={clearRecent}
                          className="text-[10px] lowercase text-muted-foreground hover:text-foreground underline"
                        >
                          {t("command.clear_recent", undefined, "clear")}
                        </button>
                      </div>
                    }
                    className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    {recentItems.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={`recent ${item.title} ${item.subtitle ?? ""}`}
                        onSelect={() => {
                          if (item.href) runAction(() => navigate(item.href!));
                        }}
                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm cursor-pointer select-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="font-semibold truncate">{item.title}</span>
                          {item.subtitle && (
                            <span className="text-xs text-muted-foreground truncate">{item.subtitle}</span>
                          )}
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Quick Actions */}
                <Command.Group
                  heading={t("command.group.actions", undefined, "Quick Actions")}
                  className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  <Command.Item
                    value="new sale ban hang hoa don"
                    onSelect={() =>
                      runAction(() => navigate("/sales?create=1"), {
                        id: "action-new-sale",
                        title: t("command.action.new_sale", undefined, "New Sale"),
                        type: "action",
                        href: "/sales?create=1",
                      })
                    }
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer select-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                        <Plus className="h-4 w-4" />
                      </div>
                      <span className="font-semibold">
                        {t("command.action.new_sale", undefined, "New Sale / Invoice")}
                      </span>
                    </div>
                    <kbd className="hidden sm:inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                      /sales
                    </kbd>
                  </Command.Item>

                  <Command.Item
                    value="scan invoice nhap hang bill hoa don chup anh"
                    onSelect={() =>
                      runAction(() => {
                        if (onScanInvoice) onScanInvoice("purchase");
                      })
                    }
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer select-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                        <Receipt className="h-4 w-4" />
                      </div>
                      <span className="font-semibold">
                        {t("command.action.scan_invoice", undefined, "Scan Supplier Invoice")}
                      </span>
                    </div>
                    <span className="text-xs text-primary font-medium">AI Draft</span>
                  </Command.Item>

                  <Command.Item
                    value="scan receipt expense chi phi bien lai"
                    onSelect={() =>
                      runAction(() => {
                        if (onScanInvoice) onScanInvoice("expense");
                      })
                    }
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer select-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                        <Receipt className="h-4 w-4" />
                      </div>
                      <span className="font-semibold">
                        {t("command.action.scan_receipt", undefined, "Scan Expense Receipt")}
                      </span>
                    </div>
                    <span className="text-xs text-primary font-medium">AI Draft</span>
                  </Command.Item>

                  <Command.Item
                    value="record expense chi tieu hoa don dien nuoc"
                    onSelect={() =>
                      runAction(() => navigate("/expenses?create=1"), {
                        id: "action-add-expense",
                        title: t("command.action.add_expense", undefined, "Add Expense"),
                        type: "action",
                        href: "/expenses?create=1",
                      })
                    }
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer select-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                        <Plus className="h-4 w-4" />
                      </div>
                      <span className="font-semibold">
                        {t("command.action.add_expense", undefined, "Add Operating Expense")}
                      </span>
                    </div>
                    <kbd className="hidden sm:inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                      /expenses
                    </kbd>
                  </Command.Item>

                  <Command.Item
                    value="pay supplier thanh toan tra no nha cung cap"
                    onSelect={() =>
                      runAction(() => {
                        if (onPaySupplier) onPaySupplier();
                        else navigate("/suppliers");
                      })
                    }
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer select-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <span className="font-semibold">
                        {t("command.action.pay_supplier", undefined, "Pay Supplier Bill")}
                      </span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Command.Item>

                  <Command.Item
                    value="ask ai copilot tro ly chat"
                    onSelect={() =>
                      runAction(() => {
                        onOpenAi();
                      })
                    }
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer select-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                      </div>
                      <span className="font-semibold">
                        {t("command.action.ask_copilot", undefined, "Ask AI Copilot")}
                      </span>
                    </div>
                    <kbd className="hidden sm:inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                      Ctrl J
                    </kbd>
                  </Command.Item>
                </Command.Group>

                {/* Navigation Links */}
                <Command.Group
                  heading={t("command.group.navigation", undefined, "Navigation")}
                  className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  <Command.Item
                    value="go to home trang chu tong quan dashboard"
                    onSelect={() => runAction(() => navigate("/dashboard"))}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm cursor-pointer select-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <span className="font-medium">{t("nav.home", undefined, "Dashboard / Home")}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Command.Item>

                  <Command.Item
                    value="go to review queue hang cho kiem duyet drafts"
                    onSelect={() => runAction(() => navigate("/review"))}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm cursor-pointer select-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="h-3.5 w-3.5 text-amber-500" />
                      <span className="font-medium">{t("nav.review", undefined, "Review Queue")}</span>
                    </div>
                    <span className="text-xs text-amber-600 font-semibold">Drafts</span>
                  </Command.Item>

                  <Command.Item
                    value="go to sales ban hang don hang"
                    onSelect={() => runAction(() => navigate("/sales"))}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm cursor-pointer select-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <span className="font-medium">{t("nav.sales", undefined, "Sales & Orders")}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Command.Item>

                  <Command.Item
                    value="go to purchases nhap hang nha cung cap"
                    onSelect={() => runAction(() => navigate("/purchases"))}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm cursor-pointer select-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <span className="font-medium">{t("nav.purchases", undefined, "Purchases & Restock")}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Command.Item>

                  <Command.Item
                    value="go to expenses so chi tieu chi phi"
                    onSelect={() => runAction(() => navigate("/expenses"))}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm cursor-pointer select-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <span className="font-medium">{t("nav.expenses", undefined, "Operating Expenses")}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Command.Item>

                  <Command.Item
                    value="go to products kho san pham hang hoa ton kho"
                    onSelect={() => runAction(() => navigate("/products"))}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm cursor-pointer select-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <span className="font-medium">{t("nav.products", undefined, "Products & Inventory")}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Command.Item>

                  <Command.Item
                    value="go to customers khach hang so no"
                    onSelect={() => runAction(() => navigate("/customers"))}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm cursor-pointer select-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <span className="font-medium">{t("nav.customers", undefined, "Customers & Balances")}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Command.Item>

                  <Command.Item
                    value="go to suppliers nha cung cap"
                    onSelect={() => runAction(() => navigate("/suppliers"))}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm cursor-pointer select-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <span className="font-medium">{t("nav.suppliers", undefined, "Suppliers & Payables")}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Command.Item>

                  <Command.Item
                    value="go to reports bao cao tai chinh doanh thu"
                    onSelect={() => runAction(() => navigate("/reports"))}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm cursor-pointer select-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{t("nav.reports", undefined, "Financial Reports")}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Command.Item>

                  <Command.Item
                    value="go to settings cai dat thiet lap"
                    onSelect={() => runAction(() => navigate("/settings"))}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm cursor-pointer select-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{t("nav.settings", undefined, "Store Settings")}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Command.Item>
                </Command.Group>
              </>
            )}
          </Command.List>

          {/* Footer with keyboard shortcuts hints */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground bg-muted/40">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border bg-background px-1 font-mono text-[10px]">↑</kbd>
                <kbd className="rounded border bg-background px-1 font-mono text-[10px]">↓</kbd>
                <span>{t("command.navigate", undefined, "Navigate")}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border bg-background px-1 font-mono text-[10px]">↵</kbd>
                <span>{t("command.select", undefined, "Select")}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-primary">
                <kbd className="rounded border bg-background px-1 font-mono text-[10px]">Ctrl J</kbd>
                <span>Copilot</span>
              </span>
            </div>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
