import { Link } from "react-router-dom";
import { ShieldCheck, ExternalLink, ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export default function Footer() {
  return (
    <footer className="border-t border-border/80 bg-card/60 text-muted-foreground text-xs font-sans">
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand Col */}
          <div className="col-span-2 space-y-4">
            <BrandLogo to="/" size="md" />
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
              Enterprise Payment Operations &amp; Double-Entry Ledger Platform. Built for financial institutions and platforms demanding mathematical invariants and continuous automated reconciliation.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <Link to="/status" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-[11px] text-foreground font-medium underline">
                  All Systems Operational (99.99% Uptime)
                </span>
              </Link>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider font-mono">Platform Rails</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/#platform" className="hover:text-foreground transition-colors">Double-Entry Core</Link></li>
              <li><Link to="/#platform" className="hover:text-foreground transition-colors">Batch Settlements</Link></li>
              <li><Link to="/#platform" className="hover:text-foreground transition-colors">Reconciliation Scanner</Link></li>
              <li><Link to="/#simulator" className="hover:text-foreground transition-colors">Live Ledger Simulator</Link></li>
              <li><Link to="/security" className="hover:text-foreground transition-colors">Row-Level Security</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider font-mono">Developers &amp; Docs</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/docs" className="hover:text-foreground transition-colors">Developer Documentation</Link></li>
              <li><a href="http://localhost:8080/swagger" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors inline-flex items-center gap-1">OpenAPI Swagger <ExternalLink className="h-3 w-3" /></a></li>
              <li><Link to="/news" className="hover:text-foreground transition-colors">FinTech Newsroom</Link></li>
              <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing &amp; SLAs</Link></li>
              <li><Link to="/status" className="hover:text-foreground transition-colors">Live System Status</Link></li>
            </ul>
          </div>

          {/* Company & Legal */}
          <div className="space-y-3">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider font-mono">Organization</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/about" className="hover:text-foreground transition-colors">About Company</Link></li>
              <li><Link to="/contact" className="hover:text-foreground transition-colors">Schedule Architecture Demo</Link></li>
              <li><Link to="/login" className="hover:text-foreground transition-colors">Operations Console</Link></li>
              <li><Link to="/register" className="hover:text-foreground transition-colors">Register Tenant</Link></li>
              <li><Link to="/security" className="hover:text-foreground transition-colors">Security Whitepaper</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <p>© {new Date().getFullYear()} Tenvora Technologies Inc. All rights reserved.</p>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              PostgreSQL RLS Protected
            </span>
            <span>•</span>
            <span>Numeric(18,4) Decimal Precision</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
