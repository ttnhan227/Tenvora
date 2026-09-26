import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogOut, Plus, MoreHorizontal } from "lucide-react";
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
  const visibleNav = workspaceNav.filter((item) => !item.admin || user?.role === "TenantAdmin");
  const mobileHrefs = ["/dashboard", "/sales", "/customers", "/purchases"];
  const mobileItems = visibleNav.filter((item) => mobileHrefs.includes(item.href));

  return (
    <div className="min-h-screen bg-background text-foreground">
      {open && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-[hsl(var(--brand-ink)/.45)] backdrop-blur-[2px] md:hidden" onClick={() => setOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[17rem] flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-20 items-center justify-between px-5">
          <BrandLogo to="" size="md" />
          <button type="button" aria-label="Close navigation" className="friendly-focus inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary md:hidden" onClick={() => setOpen(false)}><X size={20} /></button>
        </div>

        <div className="mx-4 mb-4 rounded-2xl border bg-[hsl(var(--warning)/.1)] p-4">
          <p className="truncate text-sm font-bold">{user?.companyName || "Your business"}</p>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-[hsl(var(--success))]" />Your business notebook</p>
        </div>

        <nav aria-label="Workspace navigation" className="custom-scrollbar flex-1 overflow-y-auto px-3 pb-6">
          {visibleNav.map((item, index) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const showSection = index === 0 || visibleNav[index - 1].section !== item.section;
            return <div key={item.href}>
              {showSection && <p className="mb-1 mt-5 px-3 text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground first:mt-1">{item.section}</p>}
              <Link to={item.href} onClick={() => setOpen(false)} aria-current={isActive ? "page" : undefined} className={`friendly-focus my-0.5 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-bold" : "text-sidebar-foreground/75 hover:bg-secondary hover:text-sidebar-foreground"}`}>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${isActive ? "bg-card/70 text-primary" : "text-muted-foreground"}`}><item.icon size={18} /></span>
                <span className="flex-1">{item.label}</span>
              </Link>
            </div>;
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary">{user?.email?.slice(0, 1).toUpperCase() || "T"}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{user?.email}</p>
              <p className="text-xs text-muted-foreground">{user?.googleLinked ? "Google account" : "Business account"}</p>
            </div>
            <button type="button" onClick={logout} aria-label="Sign out" className="friendly-focus inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><LogOut size={17} /></button>
          </div>
        </div>
      </aside>

      <div className="md:pl-[17rem]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/92 px-4 backdrop-blur-xl sm:px-6 md:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" aria-label="Open navigation" className="md:hidden" onClick={() => setOpen(true)}><Menu size={20} /></Button>
            <div><p className="text-xs text-muted-foreground">Your records</p><p className="text-sm font-bold">{current}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="hidden sm:inline-flex"><Link to="/sales?create=1"><Plus />New sale</Link></Button>
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-[76rem] px-4 pb-28 pt-6 sm:px-6 md:px-8 md:pb-12 md:pt-8">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>

      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card/96 px-1 pb-[max(.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_30px_hsl(var(--foreground)/.07)] backdrop-blur-xl md:hidden">
        {mobileItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return <Link key={item.href} to={item.href} aria-current={active ? "page" : undefined} className={`friendly-focus flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold ${active ? "text-primary" : "text-muted-foreground"}`}><item.icon size={20} /><span>{item.label}</span></Link>;
        })}
        <button type="button" onClick={() => setOpen(true)} className="friendly-focus flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold text-muted-foreground"><MoreHorizontal size={20} /><span>More</span></button>
      </nav>
    </div>
  );
}
