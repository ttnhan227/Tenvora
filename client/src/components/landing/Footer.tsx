import { Link } from "react-router-dom";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const learnLinks = [
  ["About", "/about"],
  ["Help", "/contact"],
  ["Live status", "/status"],
] as const;

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card text-xs text-muted-foreground dark:bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-[1.5fr_1fr]">
          <div>
            <BrandLogo to="/" size="md" />
            <p className="mt-3 max-w-sm text-sm font-medium leading-relaxed">
              A cash-flow workspace for freelancers to match deposits, plan a tax reserve, and understand what may be safe to spend.
            </p>
          </div>

          <nav aria-label="Information links">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono">Learn</h2>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm font-semibold sm:grid-cols-1">
              {learnLinks.map(([label, href]) => (
                <li key={href}><Link to={href} className="hover:text-primary">{label}</Link></li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-9 flex flex-col gap-3 border-t border-border pt-6 text-xs font-medium md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Tenvora reference project. Not a bank or money transmitter.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Local CSV review</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Traceable records</span>
            <span>No funds held or moved</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
