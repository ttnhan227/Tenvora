import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getWorkspaceRouteLabel, workspaceNav } from "./WorkspaceNav";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const current = getWorkspaceRouteLabel(pathname);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {open && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 ease-in-out md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-18 items-center justify-between px-6 border-b border-border/50">
          <BrandLogo to="" size="sm" />
          <button
            type="button"
            aria-label="Close navigation"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* User Account Context Card */}
        <div className="mx-4 my-4 rounded-xl border border-border/80 bg-secondary/40 p-3.5">
          <p className="truncate text-sm font-bold text-foreground">
            {user?.companyName || "Freelancer Account"}
          </p>
          <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Cash-flow workspace
          </div>
        </div>

        {/* Primary Navigation Items */}
        <nav aria-label="Workspace navigation" className="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
          {workspaceNav.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-bold border border-primary/20 dark:bg-primary/15 dark:text-primary dark:border-primary/30"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground font-medium"
                }`}
              >
                <item.icon
                  size={16}
                  className={isActive ? "text-primary" : "text-muted-foreground"}
                />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span aria-hidden="true" className="rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-primary">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Session Footer */}
        <div className="border-t border-border p-4 bg-secondary/20">
          <p className="truncate text-xs font-bold text-foreground">{user?.email}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground font-medium">Independent workspace</p>
          <button
            type="button"
            onClick={logout}
            className="mt-2 flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-medium"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="md:pl-64">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-5 md:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              className="md:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu size={18} />
            </Button>
            <span className="text-sm font-bold tracking-tight text-foreground">{current}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/docs"
              className="hidden min-h-9 items-center rounded-lg px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
            >
              Guide &amp; docs
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto max-w-6xl p-5 md:p-8 flex flex-col justify-between min-h-[calc(100vh-4rem)]">
          <div>{children}</div>
          <footer className="mt-16 pt-6 border-t border-border text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3 font-medium">
            <div>© {new Date().getFullYear()} Tenvora · Freelancer cash-flow workspace</div>
            <div className="flex items-center gap-3">
              <span>Planning records only — Tenvora does not hold funds</span>
              <span>•</span>
              <Link to="/contact" className="inline-flex min-h-8 items-center rounded px-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-semibold">Support</Link>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
