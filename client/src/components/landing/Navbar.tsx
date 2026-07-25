import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, isLoading, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl dark:border-border/10 dark:bg-hero/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="h-9 w-9 object-contain" />
          <span className="text-lg font-bold text-foreground dark:text-primary-foreground">VeriSpend</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="text-sm text-foreground/70 transition hover:text-foreground dark:text-primary-foreground/70 dark:hover:text-primary-foreground">
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle className="text-foreground/80 hover:bg-foreground/10 hover:text-foreground dark:text-primary-foreground/80 dark:hover:bg-primary-foreground/10 dark:hover:text-primary-foreground" iconClassName="h-4 w-4" />
          {!isLoading && isAuthenticated ? (
            <>
              <Button asChild variant="ghost" className="rounded-full text-foreground/70 hover:text-foreground hover:bg-foreground/10 dark:text-primary-foreground/70 dark:hover:text-primary-foreground dark:hover:bg-primary-foreground/10">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={logout}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="rounded-full text-foreground/70 hover:text-foreground hover:bg-foreground/10 dark:text-primary-foreground/70 dark:hover:text-primary-foreground dark:hover:bg-primary-foreground/10">
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild className="rounded-md bg-foreground text-background hover:bg-foreground/90">
                <Link to="/register">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Hamburger */}
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full text-foreground dark:text-primary-foreground md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border/60 bg-background/95 backdrop-blur-xl dark:border-primary-foreground/10 dark:bg-hero/95 md:hidden">
          <div className="container mx-auto flex flex-col gap-2 px-4 py-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-4 py-3 text-sm text-foreground/80 transition hover:bg-foreground/10 hover:text-foreground dark:text-primary-foreground/80 dark:hover:bg-primary-foreground/10 dark:hover:text-primary-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <ThemeToggle className="justify-start rounded-full text-foreground/80 hover:bg-foreground/10 hover:text-foreground dark:text-primary-foreground/80 dark:hover:bg-primary-foreground/10 dark:hover:text-primary-foreground" />
              {!isLoading && isAuthenticated ? (
                <>
                  <Button asChild variant="ghost" className="rounded-full justify-start text-foreground/70 hover:text-foreground hover:bg-foreground/10 dark:text-primary-foreground/70 dark:hover:text-primary-foreground dark:hover:bg-primary-foreground/10">
                    <Link to="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full justify-start"
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="ghost" className="rounded-full justify-start text-foreground/70 hover:text-foreground hover:bg-foreground/10 dark:text-primary-foreground/70 dark:hover:text-primary-foreground dark:hover:bg-primary-foreground/10">
                    <Link to="/login">Log in</Link>
                  </Button>
                  <Button asChild className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link to="/register">Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
