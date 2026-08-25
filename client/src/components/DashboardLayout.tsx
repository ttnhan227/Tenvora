import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  FileText,
  Plus,
  Upload,
  Settings,
  LogOut,
  Menu,
  X,
  CheckCircle,
  Activity,
  CreditCard,
  Users,
  ShieldCheck,
  FlaskConical,
  Building2,
  ChevronRight,
  Sparkles,
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
import { cn } from "@/lib/utils";
import { DemoMission } from "@/components/DemoMission";
import { AiCopilot } from "@/components/AiCopilot";

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isManager = user?.role === "Manager" || user?.role === "Owner";
  const isOwner = user?.role === "Owner";
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "VS";

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  const navGroups = [
    {
      group: "Core Spend",
      items: [
        { href: "/dashboard", icon: BarChart3, label: "Overview" },
        { href: "/expenses", icon: FileText, label: "Expenses" },
        { href: "/expenses/create", icon: Plus, label: "New Expense" },
        { href: "/upload", icon: Upload, label: "Upload Receipt" },
      ],
    },
    ...(isManager
      ? [
          {
            group: "Management & Reviews",
            items: [
              { href: "/manager/pending", icon: CheckCircle, label: "Approval Queue" },
              { href: "/manager/insights", icon: Activity, label: "Spend Insights" },
              { href: "/analytics", icon: BarChart3, label: "Advanced Analytics" },
            ],
          },
        ]
      : []),
    ...(isOwner
      ? [
          {
            group: "Governance & Security",
            items: [
              { href: "/admin/users", icon: Users, label: "Team Members" },
              { href: "/compliance", icon: ShieldCheck, label: "Compliance & SOX" },
              { href: "/policy-lab", icon: FlaskConical, label: "Policy Simulation" },
            ],
          },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Layout */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 border-r border-border bg-card transition-transform md:relative md:translate-x-0 flex flex-col justify-between select-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand header */}
          <div className="flex h-13 items-center justify-between border-b border-border px-4 py-3">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded bg-primary flex items-center justify-center text-primary-foreground font-black text-xs tracking-tight">
                V
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-bold text-xs tracking-tight text-foreground">VeriSpend</span>
                <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">Enterprise</span>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              className="md:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Organization Selector / Context */}
          <div className="p-3 border-b border-border/60 bg-muted/20">
            <div className="flex items-center justify-between px-2 py-1.5 rounded-md border border-border/70 bg-card text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-semibold text-foreground truncate text-xs">
                  {user?.companyName ?? "Company Workspace"}
                </span>
              </div>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-bold shrink-0">
                {user?.role ?? "Member"}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4 custom-scrollbar">
            {navGroups.map((group) => (
              <div key={group.group} className="space-y-1">
                <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  {group.group}
                </p>
                <div className="space-y-0.5 mt-1">
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "group flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                          active
                            ? "bg-primary text-primary-foreground font-semibold shadow-none"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <item.icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {active && (
                          <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent-signal))] shrink-0" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer Settings & Account */}
          <div className="p-2 border-t border-border space-y-1 bg-card">
            <Link
              to="/settings"
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                isActive("/settings")
                  ? "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Workspace Settings</span>
            </Link>
            {isOwner && (
              <Link
                to="/subscription"
                className={cn(
                  "flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  isActive("/subscription")
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Plan & Billing</span>
                </div>
                <span className="text-[9px] font-mono font-bold px-1 rounded bg-secondary text-foreground border border-border">
                  PRO
                </span>
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="relative flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar header */}
        <header className="sticky top-0 z-30 flex h-13 items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur-sm md:px-6 select-none">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              className="md:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <span>verispend</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
              <span className="text-foreground font-sans font-medium capitalize">
                {location.pathname.split("/")[1] || "dashboard"}
              </span>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2.5">
            <Link to="/expenses/create">
              <Button size="xs" variant="default" className="gap-1.5 text-[11px] font-bold">
                <Plus className="h-3 w-3" />
                <span className="hidden sm:inline">Add Expense</span>
              </Button>
            </Link>

            <ThemeToggle className="h-7 w-7 rounded-md border border-border bg-card hover:bg-secondary" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1 hover:bg-secondary transition-colors focus:outline-none">
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground font-mono">
                    {initials}
                  </div>
                  <span className="text-xs font-medium text-foreground max-w-[120px] truncate hidden md:inline">
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
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/settings">Organization Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/subscription">Billing & Invoices</Link>
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

        {/* Demo banner indicator */}
        <DemoMission email={user?.email} />

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
        </main>
      </div>

      {/* Assistant Copilot */}
      <AiCopilot />
    </div>
  );
};
