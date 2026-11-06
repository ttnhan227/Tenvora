import { useState, useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Menu, X, LogOut, Plus, MoreHorizontal, Shield, Sparkles, Settings, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { AccountSecurityDialog } from "@/components/AccountSecurityDialog";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { AiChatDrawer } from "@/components/assistant/AiChatDrawer";
import { ContextualAiBar } from "@/components/assistant/ContextualAiBar";
import { getProfileOrDefault } from "@/data/businessProfiles";
import { getWorkspaceRouteItem, workspaceNav } from "./WorkspaceNav";
import { captureService } from "@/services/captureService";
import { CommandPalette } from "@/components/business/CommandPalette";
import { CaptureSheet } from "@/components/business/CaptureSheet";
import { SupplierPaymentModal } from "@/components/business/SupplierPaymentModal";
import { ActionableNotifications } from "@/components/business/ActionableNotifications";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { t, isVietnamese } = useLanguage();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiDraftPrompt, setAiDraftPrompt] = useState<string | undefined>();
  const [commandOpen, setCommandOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureIntent, setCaptureIntent] = useState<"purchase" | "expense">("purchase");
  const [supplierPaymentOpen, setSupplierPaymentOpen] = useState(false);
  const needsOnboarding = user?.role === "TenantAdmin" && user.onboardingCompleted === false;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setAiOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (needsOnboarding) {
      setSetupOpen(true);
    }
  }, [needsOnboarding]);

  const currentItem = getWorkspaceRouteItem(pathname);
  const currentTitle = currentItem ? t(currentItem.key, currentItem.label) : t("nav.home", "Trang chủ");

  const queueQuery = useQuery({
    queryKey: ["review-queue"],
    queryFn: async () => {
      const res = await captureService.getReviewQueue();
      return res.success && res.data ? res.data : [];
    },
    staleTime: 15_000,
    enabled: Boolean(user && user.role !== "Viewer"),
  });
  const pendingCount = queueQuery.data?.length ?? 0;

  const visibleNav = workspaceNav.filter((item) =>
    (!item.admin || user?.role === "TenantAdmin") && (!item.roles || item.roles.includes(user?.role ?? ""))
  );
  const mobileHrefs = ["/dashboard", "/sales", "/customers", "/settings"];
  const mobileItems = visibleNav.filter((item) => mobileHrefs.includes(item.href));

  const openAi = (prompt?: string) => {
    setAiDraftPrompt(prompt);
    setAiOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {open && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-[hsl(var(--brand-ink)/.45)] backdrop-blur-[2px] md:hidden" onClick={() => setOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-68 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-20 items-center justify-between px-5">
          <BrandLogo to="" size="md" />
          <button type="button" aria-label="Close navigation" className="friendly-focus inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary md:hidden" onClick={() => setOpen(false)}><X size={20} /></button>
        </div>

        <div className="mx-4 mb-4 rounded-2xl border bg-[hsl(var(--warning)/.1)] p-4">
          <div className="flex items-center justify-between">
            <p className="truncate text-sm font-bold">{user?.companyName || t("header.yourBusiness", "Cửa hàng của bạn")}</p>
            <Link
              to="/settings"
              title={t("settings.pageTitle", "Cài đặt toàn bộ ứng dụng")}
              className="friendly-focus rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Settings size={15} className="text-primary" />
            </Link>
          </div>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
            <span className="truncate">
              {user?.businessType ? `${getProfileOrDefault(user.businessType).shortLabel} ${t("header.notebook", "sổ tay")}` : t("header.notebook", "Sổ tay kinh doanh")}
            </span>
          </p>
        </div>

        <nav aria-label="Workspace navigation" className="custom-scrollbar flex-1 overflow-y-auto px-3 pb-6">
          {visibleNav.map((item, index) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const showSection = index === 0 || visibleNav[index - 1].section !== item.section;
            return <div key={item.href}>
              {showSection && <p className="mb-1 mt-5 px-3 text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground first:mt-1">{t(item.sectionKey, item.section)}</p>}
              <Link to={item.href} onClick={() => setOpen(false)} aria-current={isActive ? "page" : undefined} className={`friendly-focus my-0.5 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-bold" : "text-sidebar-foreground/75 hover:bg-secondary hover:text-sidebar-foreground"}`}>
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${isActive ? "bg-card/70 text-primary" : "text-muted-foreground"}`}><item.icon size={18} /></span>
                <span className="flex-1">{t(item.key, item.label)}</span>
                {item.href === "/review" && pendingCount > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    {pendingCount}
                  </span>
                )}
              </Link>
            </div>;
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Link
              to="/settings"
              title={t("settings.pageTitle", "Cài đặt toàn bộ ứng dụng")}
              className="friendly-focus flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1.5 text-left transition-colors hover:bg-secondary"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary">
                {user?.fullName?.slice(0, 1).toUpperCase() || user?.email?.slice(0, 1).toUpperCase() || "T"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{user?.fullName || user?.email}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield size={12} className="text-primary shrink-0" />
                  <span className="truncate">{user?.googleLinked ? t("header.googleAccount", "Tài khoản Google") : t("header.businessAccount", "Tài khoản cửa hàng")}</span>
                </p>
              </div>
            </Link>
            <button
              type="button"
              onClick={logout}
              aria-label={t("header.signOut", "Đăng xuất")}
              title={t("header.signOut", "Đăng xuất")}
              className="friendly-focus inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <div className="md:pl-68">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/92 px-3 backdrop-blur-xl sm:px-6 md:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Open navigation" className="md:hidden" onClick={() => setOpen(true)}><Menu size={20} /></Button>
            <div className="min-w-0"><p className="truncate text-xs text-muted-foreground">{t("header.yourRecords", "Sổ ghi chép của bạn")}</p><p className="truncate text-sm font-bold">{currentTitle}</p></div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            {pendingCount > 0 && (
              <Link
                to="/review"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{pendingCount} {t("queue.pending_badge", undefined, "drafts")}</span>
              </Link>
            )}
            {/* Command Palette Trigger Button */}
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              aria-label={t("nav.search", undefined, "Search or jump to")}
              className="friendly-focus inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-muted/40 p-0 text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground xl:h-9 xl:w-auto xl:justify-start xl:px-2.5 xl:py-1.5"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">{t("nav.search_quick", undefined, "Search or jump to...")}</span>
              <kbd className="hidden xl:inline-flex h-4 items-center rounded border bg-background px-1 font-mono text-[10px]">
                Ctrl K
              </kbd>
            </button>

            <Button asChild size="sm" className="hidden xl:inline-flex">
              <Link to="/sales?create=1"><Plus />{t("header.newSale", "+ Bán hàng")}</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openAi()}
              aria-label={t("header.aiAssistant", "Trợ lý AI")}
              className="inline-flex h-11 min-w-11 items-center gap-1.5 border-primary/30 text-primary hover:bg-primary/10 font-bold"
            >
              <Sparkles size={14} className="text-primary" />
              <span className="hidden xl:inline">{t("header.aiAssistant", "Trợ lý AI")}</span>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden xl:inline-flex items-center gap-1.5"
            >
              <Link to="/settings" title={t("settings.pageTitle", "Cài đặt toàn bộ ứng dụng")}>
                <Settings size={14} className="text-primary" />
                <span>{t("header.settings", "Cài đặt")}</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSecurityOpen(true)}
              className="hidden 2xl:inline-flex items-center gap-1.5"
            >
              <Shield size={14} className="text-primary" />
              <span>{t("header.security", "Bảo mật")}</span>
            </Button>
            <ActionableNotifications
              onPaySupplier={() => setSupplierPaymentOpen(true)}
            />
            <div className="hidden min-[340px]:flex items-center gap-0.5">
              <LanguageToggle compactBelowDesktop />
              <ThemeToggle className="hidden min-[390px]:inline-flex" />
            </div>
          </div>
        </header>

        <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-304 px-4 pb-28 pt-6 sm:px-6 md:px-8 md:pb-12 md:pt-8">
          <ContextualAiBar pathname={pathname} isVietnamese={isVietnamese} onPrompt={openAi} />
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>

      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card/96 px-1 pb-[max(.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_30px_hsl(var(--foreground)/.07)] backdrop-blur-xl md:hidden">
        {mobileItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return <Link key={item.href} to={item.href} aria-current={active ? "page" : undefined} className={`friendly-focus flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold ${active ? "text-primary" : "text-muted-foreground"}`}><item.icon size={20} /><span>{t(item.key, item.label)}</span></Link>;
        })}
        <button type="button" onClick={() => setOpen(true)} className="friendly-focus flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold text-muted-foreground"><MoreHorizontal size={20} /><span>{t("nav.more", "Thêm")}</span></button>
      </nav>

      <AccountSecurityDialog open={securityOpen} onOpenChange={setSecurityOpen} />
      <OnboardingWizard open={setupOpen} onOpenChange={setSetupOpen} />
      <AiChatDrawer
        open={aiOpen}
        onOpenChange={setAiOpen}
        currency={user?.preferredCurrency ?? "VND"}
        canMutate={["TenantAdmin", "OperationsManager"].includes(user?.role ?? "")}
        draftPrompt={aiDraftPrompt}
      />
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onOpenAi={(prompt) => openAi(prompt)}
        onScanInvoice={(type) => {
          setCaptureIntent(type);
          setCaptureOpen(true);
        }}
        onPaySupplier={() => setSupplierPaymentOpen(true)}
      />
      <CaptureSheet
        open={captureOpen}
        onOpenChange={setCaptureOpen}
        documentTypeHint={captureIntent}
      />
      <SupplierPaymentModal
        open={supplierPaymentOpen}
        onOpenChange={setSupplierPaymentOpen}
        currency={user?.preferredCurrency ?? "VND"}
      />

      {/* Floating Agent Trigger Pill */}
      <button
        type="button"
        onClick={() => openAi()}
        aria-label={t("header.aiAssistant", "Tenvora Agent")}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full border border-primary/30 bg-primary/90 px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-lg backdrop-blur-md transition-all hover:bg-primary hover:shadow-primary/25 hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
      >
        <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
        <span>Tenvora Agent</span>
        <span className="hidden rounded bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] sm:inline">
          Ctrl J
        </span>
      </button>
    </div>
  );
}
