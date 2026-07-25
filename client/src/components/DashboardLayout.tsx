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
  const canUseSubmitterFeatures = user?.role === "Owner" || user?.role === "Member";
  const isManagerOnly = user?.role === "Manager";
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "VS";

  const navItems = [
    { href: "/dashboard", icon: BarChart3, label: "Dashboard" },
    { href: "/expenses", icon: FileText, label: "Expenses" },
    ...(canUseSubmitterFeatures
      ? [
          { href: "/expenses/create", icon: Plus, label: "New Expense" },
          { href: "/upload", icon: Upload, label: "Upload Receipt" },
        ]
      : []),
    ...(isManager
      ? [
          { href: "/manager/pending", icon: CheckCircle, label: "Pending Reviews" },
          { href: "/manager/insights", icon: Activity, label: "Audit Insights" },
          { href: "/analytics", icon: BarChart3, label: "Advanced Analytics" },
        ]
      : []),
    ...(isOwner
      ? [
          { href: "/admin/users", icon: Users, label: "User Management" },
          { href: "/compliance", icon: ShieldCheck, label: "Compliance Hub" },
          { href: "/policy-lab", icon: FlaskConical, label: "Policy Lab" },
        ]
      : []),
    ...(!isManagerOnly
      ? [
          { href: "/subscription", icon: CreditCard, label: "Subscription" },
        ]
      : []),
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Soft visual background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.04),_transparent_28%),radial-gradient(circle_at_bottom_right,_hsl(var(--primary)/0.01),_transparent_24%)] z-0" />
      
      {sidebarOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-foreground/10 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar Layout */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-background transition-transform md:relative md:translate-x-0 z-10 flex flex-col justify-between",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div>
          {/* Friendly Logo */}
          <div className="flex h-16 items-center justify-between border-b border-border px-5">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="" className="h-9 w-9 object-contain" />
              <div>
                <span className="block font-bold tracking-tight text-sm">VeriSpend</span>
                <span className="block text-[9px] tracking-[0.08em] text-muted-foreground">Verified spend control</span>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation links - Font Sans for elegant feel */}
          <nav className="space-y-1 px-3 py-5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-xs font-medium transition-colors border border-transparent",
                  isActive(item.href)
                    ? "bg-accent text-accent-foreground border-border font-semibold"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground hover:border-border/40"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Workspace Display Card */}
        <div className="mx-3 rounded-2xl border border-border bg-secondary/40 p-4 text-xs mb-4">
          <p className="text-[9px] uppercase tracking-[0.24em] text-muted-foreground font-bold">Workspace</p>
          <p className="mt-1 font-bold text-foreground truncate">{user?.companyName ?? "VeriSpend workspace"}</p>
          <p className="mt-1.5 text-[10px] text-muted-foreground uppercase">
            Role: <span className="text-primary font-bold">{user?.role ?? "Member"}</span>
          </p>
        </div>
      </aside>

      {/* Main content area */}
      <div className="relative z-10 flex-1 overflow-hidden flex flex-col min-h-screen">
        {/* Top bar header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md md:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1" />

          {/* User profile console block */}
          <div className="flex items-center gap-3">
            <ThemeToggle className="border border-border bg-background hover:bg-secondary rounded-md" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-auto rounded-md border border-border bg-background px-3 py-1.5 hover:bg-secondary">
                  <div className="mr-2 flex h-7 w-7 items-center justify-center rounded bg-accent text-xs font-bold text-accent-foreground border border-border">
                    {initials}
                  </div>
                  <div className="text-right leading-tight hidden sm:block">
                    <p className="text-xs font-bold text-foreground">{user?.email}</p>
                    <p className="text-[9px] uppercase text-muted-foreground tracking-wider mt-0.5">{user?.role}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover border border-border text-popover-foreground text-xs">
                <DropdownMenuLabel className="text-muted-foreground">
                  <div>
                    <p className="font-bold text-foreground">{user?.email}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase">{user?.companyName}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="focus:bg-secondary focus:text-foreground cursor-pointer">
                  <Link to="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <DemoMission email={user?.email} />

        {/* Page content wrapper */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8 animate-fade-in">{children}</div>
        </main>
      </div>
      <AiCopilot companyName={user?.companyName} />
    </div>
  );
};
