import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#platform", label: "Platform" },
  { href: "#pricing", label: "Pricing" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, isLoading, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm font-sans text-xs">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 max-w-7xl">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="h-6 w-6 object-contain" />
          <span className="text-sm font-bold tracking-tight text-foreground">VeriSpend</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Action buttons */}
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle className="h-8 w-8" iconClassName="h-3.5 w-3.5" />
          {!isLoading && isAuthenticated ? (
            <>
              <Link to="/dashboard">
                <Button size="xs" variant="outline" className="font-semibold">
                  Dashboard
                </Button>
              </Link>
              <Button size="xs" variant="ghost" onClick={logout} className="text-muted-foreground hover:text-foreground">
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button size="xs" variant="ghost" className="font-semibold">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button size="xs" variant="signal" className="font-bold">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden space-y-3">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground py-1"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <ThemeToggle className="h-8 w-8" />
            {!isLoading && isAuthenticated ? (
              <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                <Button size="xs" variant="default">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  <Button size="xs" variant="ghost">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)}>
                  <Button size="xs" variant="signal">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
