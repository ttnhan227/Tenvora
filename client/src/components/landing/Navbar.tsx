import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useOptionalAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandLogo } from "@/components/BrandLogo";
import { Menu, X, ArrowRight } from "lucide-react";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const auth = useOptionalAuth();
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const isLoading = auth?.isLoading ?? false;
  const logout = auth?.logout ?? (() => {});
  const location = useLocation();
  const pathname = location.pathname;

  const navLinks = [
    { label: "Features", href: "/#features", isHash: true },
    { label: "Security & Trust", href: "/security", isHash: false },
    { label: "Pricing", href: "/pricing", isHash: false },
    { label: "Guide & Docs", href: "/docs", isHash: false },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-card/95 backdrop-blur-xl border-b border-border shadow-xs">
      <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl gap-4">
        {/* Brand Logo */}
        <BrandLogo to="/" size="md" />

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2">
          {navLinks.map((item) => {
            const isActive = !item.isHash && pathname === item.href;
            if (item.isHash) {
              return (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-sm font-semibold text-muted-foreground hover:text-foreground px-3.5 py-2 rounded-xl hover:bg-secondary transition-colors"
                >
                  {item.label}
                </a>
              );
            }
            return (
              <Link
                key={item.label}
                to={item.href}
                className={`text-sm px-3.5 py-2 rounded-xl transition-colors ${
                  isActive
                    ? "font-bold text-primary bg-primary/10 border border-primary/20 dark:bg-primary/15 dark:text-primary dark:border-primary/30"
                    : "font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Actions (Desktop) */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-secondary" />
          {!isLoading && isAuthenticated ? (
            <>
              <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm h-9 px-4 shadow-xs gap-1.5 rounded-xl">
                <Link to="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={logout}
                className="text-muted-foreground hover:text-destructive font-bold text-sm h-9 px-3.5 rounded-xl hover:bg-secondary"
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Link
              to="/login"
              className="text-sm font-bold text-foreground hover:text-primary px-3.5 py-2 rounded-xl hover:bg-secondary transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile Toggle Button */}
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle className="h-9 w-9 text-muted-foreground" />
          <button
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-secondary transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileOpen && (
        <div className="border-t border-border bg-card px-5 py-5 lg:hidden space-y-4 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((item) => {
              const isActive = !item.isHash && pathname === item.href;
              if (item.isHash) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-base font-bold text-foreground hover:text-primary py-2.5 px-3 rounded-xl hover:bg-secondary transition-colors"
                  >
                    {item.label}
                  </a>
                );
              }
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`text-base py-2.5 px-3 rounded-xl transition-colors ${
                    isActive
                      ? "font-bold text-primary bg-primary/10 border border-primary/20 dark:bg-primary/15 dark:text-primary dark:border-primary/30"
                      : "font-bold text-foreground hover:text-primary hover:bg-secondary"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center gap-3">
            {!isLoading && isAuthenticated ? (
              <>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="w-full">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 rounded-xl">
                    Go to Dashboard
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => {
                    logout();
                    setMobileOpen(false);
                  }}
                  className="w-full border-border text-foreground font-bold h-11 rounded-xl"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)} className="w-full">
                <Button
                  variant="outline"
                  className="w-full border-border text-foreground font-bold h-11 rounded-xl hover:bg-secondary"
                >
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
