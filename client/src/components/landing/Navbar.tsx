import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Smartphone, Menu, X, Sparkles, Globe } from "lucide-react";
import { useOptionalAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Navbar() {
  const auth = useOptionalAuth();
  const location = useLocation();
  const { language, setLanguage, isVietnamese, canChangeLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isHome = location.pathname === "/";

  const navLinks = [
    { label: isVietnamese ? "Tính năng" : "Features", href: isHome ? "#features" : "/#features" },
    { label: isVietnamese ? "Cách hoạt động" : "How It Works", href: isHome ? "#workflow" : "/#workflow" },
    { label: isVietnamese ? "Giải pháp" : "Solutions", href: isHome ? "#solutions" : "/#solutions" },
    { label: isVietnamese ? "Ứng dụng Di động" : "Mobile App", href: "/mobile", badge: "APK" },
    { label: "FAQ", href: isHome ? "#faq" : "/#faq" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <BrandLogo to="/" size="md" />
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="group inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{item.label}</span>
              {item.badge && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                  {item.badge}
                </span>
              )}
            </a>
          ))}
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher */}
          {canChangeLanguage && <button
            onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border/80 bg-card/60 px-2.5 text-xs font-semibold text-foreground hover:bg-accent/60 transition-colors"
            title={isVietnamese ? "Chuyển sang Tiếng Anh (English)" : "Chuyển sang Tiếng Việt (Vietnamese)"}
            aria-label={isVietnamese ? "Switch to English" : "Chuyển sang Tiếng Việt"}
          >
            <Globe className="h-3.5 w-3.5 text-primary" />
            <span className="font-bold">{isVietnamese ? "VI" : "EN"}</span>
          </button>}

          <ThemeToggle />

          {auth?.isAuthenticated ? (
            <Button asChild size="sm" className="hidden sm:inline-flex font-semibold shadow-xs">
              <Link to="/dashboard">
                <span>{isVietnamese ? "Vào sổ tay" : "Workspace"}</span>
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex text-xs font-semibold">
                <Link to="/login">{isVietnamese ? "Đăng nhập" : "Sign in"}</Link>
              </Button>
              <Button asChild size="sm" className="font-semibold shadow-xs">
                <Link to="/register">
                  <span>{isVietnamese ? "Dùng miễn phí" : "Start Free"}</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 hidden sm:inline-block" />
                </Link>
              </Button>
            </div>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-card/60 text-foreground hover:bg-accent/60 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border/80 bg-background/95 px-5 py-4 backdrop-blur-xl animate-fade-in shadow-lg">
          <nav className="flex flex-col gap-3 text-sm font-medium">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between py-2 text-foreground/80 hover:text-foreground transition-colors border-b border-border/40"
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                    {item.badge}
                  </span>
                )}
              </a>
            ))}

            {/* Mobile Drawer Language Row */}
            {canChangeLanguage && <div className="flex items-center justify-between py-2 border-b border-border/40">
              <span className="text-muted-foreground">{isVietnamese ? "Ngôn ngữ hiển thị" : "Display language"}</span>
              <button
                onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-3 py-1.5 text-xs font-bold text-foreground"
              >
                <Globe className="h-3.5 w-3.5 text-primary" />
                <span>{isVietnamese ? "Tiếng Việt (VI)" : "English (EN)"}</span>
              </button>
            </div>}

            <div className="pt-2 flex flex-col gap-2">
              {!auth?.isAuthenticated && (
                <Button asChild variant="outline" className="w-full justify-center">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    {isVietnamese ? "Đăng nhập" : "Sign in"}
                  </Link>
                </Button>
              )}
              <Button asChild className="w-full justify-center font-bold">
                <Link to={auth?.isAuthenticated ? "/dashboard" : "/register"} onClick={() => setMobileMenuOpen(false)}>
                  {auth?.isAuthenticated
                    ? (isVietnamese ? "Vào sổ tay làm việc" : "Open Workspace")
                    : (isVietnamese ? "Bắt đầu miễn phí" : "Start Free Notebook")}
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
