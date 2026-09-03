import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  ArrowRightLeft,
  BookOpen,
  Building2,
  CheckCircle2,
  Layers,
  LogOut,
  Menu,
  ShieldAlert,
  FileText,
  Users,
  Wallet,
  X,
  ChevronRight,
  Search,
  HelpCircle,
  Newspaper,
  Activity,
  Server,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandLogo } from "@/components/BrandLogo";
import { CommandPalette } from "@/components/design-system/CommandPalette";
import { cn } from "@/lib/utils";

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "TN";

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  const navSections = [
    {
      label: "PAYMENTS & RAILS",
      items: [
        { href: "/dashboard", icon: BarChart3, label: "Overview" },
        { href: "/transfers", icon: ArrowRightLeft, label: "Transfers" },
        { href: "/transactions", icon: Activity, label: "Transactions" },
        { href: "/accounts", icon: Wallet, label: "Accounts" },
      ],
    },
    {
      label: "BALANCES & TREASURY",
      items: [
        { href: "/ledger", icon: BookOpen, label: "Ledger" },
        { href: "/reconciliation", icon: CheckCircle2, label: "Reconciliation" },
        { href: "/settlements", icon: Layers, label: "Settlements" },
      ],
    },
    {
      label: "COMPLIANCE & CONTROL",
      items: [
        { href: "/risk", icon: ShieldAlert, label: "Risk Review" },
        { href: "/audit", icon: FileText, label: "Audit Log" },
      ],
    },
    {
      label: "DEVELOPERS & SYSTEM",
      items: [
        { href: "/intelligence", icon: Newspaper, label: "Industry Intelligence" },
        { href: "/admin/users", icon: Users, label: "Users & Roles" },
        { href: "/system", icon: Server, label: "System" },
      ],
    },
  ];

  // Derive breadcrumbs
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const currentSection = pathSegments[0] || "dashboard";

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans antialiased">
      {/* Global ⌘K Command Palette */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-xs md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Stripe-Style Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 border-r border-border bg-[#F8FAFC] dark:bg-[#070F1E] transition-transform duration-200 md:relative md:translate-x-0 flex flex-col justify-between select-none shadow-[1px_0_0_rgba(60,66,87,0.06)]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand header */}
          <div className="flex h-13 items-center justify-between border-b border-border px-4 py-2.5 bg-card">
            <BrandLogo to="/dashboard" size="sm" />
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground hover:text-foreground h-7 w-7"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Stripe Account Context Selector */}
          <div className="p-2.5 border-b border-border/80 bg-card">
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md border border-border bg-[#FAFBFC] dark:bg-[#0E1A2E] text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-5 w-5 rounded bg-[#635BFF] text-white flex items-center justify-center shrink-0 font-mono text-[10px] font-bold shadow-xs">
                  {user?.companyName?.slice(0, 1) || "T"}
                </div>
                <span className="font-semibold text-foreground truncate text-xs">
                  {user?.companyName ?? "Tenvora Operations"}
                </span>
              </div>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-bold shrink-0 border border-border">
                {user?.role ?? "Admin"}
              </span>
            </div>
          </div>

          {/* Quick Search Shortcut */}
          <div className="px-2.5 pt-2.5">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md border border-border bg-card hover:bg-[#F0F3F7] dark:hover:bg-[#1E293B] text-xs text-muted-foreground transition-colors cursor-pointer shadow-[0_1px_2px_rgba(60,66,87,0.04)]"
            >
              <div className="flex items-center gap-2">
                <Search className="h-3 w-3" />
                <span className="text-[11px]">Search Tenvora...</span>
              </div>
              <kbd className="px-1 py-0.2 rounded bg-muted text-[9px] font-mono border border-border text-muted-foreground">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 custom-scrollbar">
            {navSections.map((section) => (
              <div key={section.label} className="space-y-0.5">
                <p className="px-2 text-[9px] font-bold uppercase tracking-wider text-[#4F5B76] dark:text-[#94A3B8] font-mono">
                  {section.label}
                </p>
                <div className="space-y-0.5 mt-1">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "group flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                          active
                            ? "bg-[#635BFF] text-white font-semibold shadow-[0_1px_3px_rgba(99,91,255,0.3)]"
                            : "text-[#4F5B76] dark:text-[#94A3B8] hover:bg-[#F0F3F7] dark:hover:bg-[#162B45] hover:text-[#0A2540] dark:hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <item.icon
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 transition-colors",
                              active ? "text-white" : "text-[#697386] dark:text-[#94A3B8] group-hover:text-foreground"
                            )}
                          />
                          <span className="truncate text-xs">{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Stripe Invariant Status Bar */}
          <div className="p-2.5 border-t border-border bg-card">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00D924]" />
                <span className="font-semibold text-foreground">Double-Entry Core</span>
              </div>
              <Link to="/system" className="hover:underline text-[#635BFF] font-semibold">
                99.99% SLA
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Viewport Container */}
      <div className="relative flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Stripe Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-13 items-center justify-between border-b border-border bg-card px-4 md:px-6 select-none shadow-[0_1px_2px_rgba(60,66,87,0.04)]">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground hover:text-foreground h-7 w-7"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <span className="font-bold text-foreground">Tenvora</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
              <span className="text-foreground capitalize font-sans font-semibold">
                {currentSection}
              </span>
              {pathSegments[1] && (
                <>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {pathSegments[1]}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* Stripe Test / Live Mode Switcher */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EBFBF3] border border-[#A3E6CD] text-[#0E6251] dark:bg-[#064E3B]/30 dark:text-[#6EE7B7] dark:border-[#059669]/40 font-mono text-[10px] font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00D924]" />
              <span>LIVE OPERATIONS</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden lg:flex items-center gap-2 h-7 px-2 text-xs text-muted-foreground hover:text-foreground bg-background border-border"
            >
              <Search className="h-3 w-3" />
              <span className="text-[11px]">Search...</span>
              <kbd className="px-1 py-0.2 rounded bg-muted text-[9px] font-mono border border-border">⌘K</kbd>
            </Button>

            <Link to="/transfers">
              <Button size="sm" className="bg-[#635BFF] hover:bg-[#533AFD] text-white gap-1.5 text-xs font-semibold h-7 px-3 rounded-md shadow-xs">
                <ArrowRightLeft className="h-3 w-3" />
                <span className="hidden sm:inline">New Transfer</span>
              </Button>
            </Link>

            <div className="h-4 w-[1px] bg-border mx-0.5 hidden sm:block" />

            <ThemeToggle className="h-7 w-7 rounded border border-border bg-card hover:bg-muted" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded border border-border bg-card px-2 py-1 hover:bg-muted transition-colors focus:outline-none cursor-pointer">
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-[#635BFF] text-white text-[10px] font-bold font-mono">
                    {initials}
                  </div>
                  <span className="text-xs font-semibold text-foreground max-w-[120px] truncate hidden md:inline">
                    {user?.email}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border border-border text-xs rounded-md shadow-lg">
                <DropdownMenuLabel className="p-3 pb-2 text-muted-foreground">
                  <div>
                    <p className="font-semibold text-foreground truncate">{user?.email}</p>
                    <p className="text-[10px] text-muted-foreground font-mono uppercase mt-0.5">
                      {user?.companyName} • {user?.role}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/system" className="cursor-pointer">
                    <Server className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    System Telemetry
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/docs" className="cursor-pointer">
                    <HelpCircle className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    Developer API Docs
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-7 custom-scrollbar">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
};
