import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandLogo } from "@/components/BrandLogo";
import { Menu, X, ArrowRight, ShieldCheck, BookOpen, Layers, Newspaper, Code2 } from "lucide-react";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, isLoading, logout } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-md font-sans text-xs">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 max-w-7xl">
        {/* Brand Logo */}
        <BrandLogo to="/" size="md" />

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-6 font-medium text-muted-foreground text-xs">
          {isHome ? (
            <>
              <a href="#platform" className="hover:text-foreground transition-colors">
                Platform Tour
              </a>
              <a href="#simulator" className="hover:text-foreground transition-colors">
                Ledger Simulator
              </a>
            </>
          ) : (
            <Link to="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
          )}

          <Link to="/docs" className="hover:text-foreground transition-colors flex items-center gap-1">
            <Code2 className="h-3.5 w-3.5 text-emerald-500" />
            Documentation
          </Link>
          <Link to="/security" className="hover:text-foreground transition-colors flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Security &amp; RLS
          </Link>
          <Link to="/news" className="hover:text-foreground transition-colors flex items-center gap-1">
            <Newspaper className="h-3.5 w-3.5 text-emerald-500" />
            Newsroom
          </Link>
          <Link to="/pricing" className="hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link to="/about" className="hover:text-foreground transition-colors">
            Company
          </Link>
        </div>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle className="h-8 w-8" />
          {!isLoading && isAuthenticated ? (
            <>
              <Link to="/dashboard">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 shadow-sm shadow-emerald-600/30 gap-1.5">
                  Operations Console
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={logout} className="text-muted-foreground hover:text-foreground text-xs h-9">
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button size="sm" variant="ghost" className="font-semibold text-xs h-9">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 shadow-md shadow-emerald-600/20">
                  Create Workspace
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileOpen && (
        <div className="border-t border-border bg-background/98 px-6 py-5 lg:hidden space-y-4 shadow-xl">
          <div className="flex flex-col space-y-3 text-sm font-medium text-muted-foreground">
            <Link to="/" onClick={() => setMobileOpen(false)} className="hover:text-foreground py-1">
              Home
            </Link>
            <Link to="/docs" onClick={() => setMobileOpen(false)} className="hover:text-foreground py-1">
              Developer Documentation
            </Link>
            <Link to="/security" onClick={() => setMobileOpen(false)} className="hover:text-foreground py-1">
              Security &amp; Compliance Whitepaper
            </Link>
            <Link to="/news" onClick={() => setMobileOpen(false)} className="hover:text-foreground py-1">
              Newsroom &amp; Technical Papers
            </Link>
            <Link to="/pricing" onClick={() => setMobileOpen(false)} className="hover:text-foreground py-1">
              Pricing Plans
            </Link>
            <Link to="/about" onClick={() => setMobileOpen(false)} className="hover:text-foreground py-1">
              About Tenvora
            </Link>
            <Link to="/contact" onClick={() => setMobileOpen(false)} className="hover:text-foreground py-1">
              Schedule Architecture Demo
            </Link>
          </div>
          <div className="pt-4 border-t border-border flex items-center justify-between">
            <ThemeToggle className="h-8 w-8" />
            <div className="flex items-center gap-2">
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <Button size="sm" variant="ghost">Sign In</Button>
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="bg-emerald-600 text-white font-bold">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
