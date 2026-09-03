import { CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TIERS = [
  {
    name: "Developer Sandbox",
    badge: "FREE FOREVER",
    price: "$0",
    period: "sandbox testing",
    description: "Ideal for engineers testing double-entry ledger invariants and integration webhooks.",
    features: [
      "Up to 10,000 test transactions / month",
      "Full Double-Entry Ledger Core",
      "Automated Discrepancy Audits",
      "PostgreSQL RLS Multi-Tenancy",
      "Community & Discord Support",
    ],
    ctaText: "Start in Sandbox",
    popular: false,
  },
  {
    name: "Growth PayOps",
    badge: "MOST POPULAR",
    price: "$499",
    period: "per month",
    description: "For scaling B2B platforms and fintech startups requiring production payment operations.",
    features: [
      "Up to 250,000 live transfers / month",
      "Deterministic Row-Lock Concurrency",
      "Daily Multi-Currency Batch Settlements",
      "5-Tier Enterprise Financial RBAC",
      "Continuous Reconciliation Scanners",
      "Dedicated Slack & Email Support (99.9% SLA)",
    ],
    ctaText: "Launch Growth Workspace",
    popular: true,
  },
  {
    name: "Enterprise Custom",
    badge: "CUSTOM SCALE",
    price: "Custom",
    period: "volume-based pricing",
    description: "For banks, high-volume market operators, and global treasury infrastructure.",
    features: [
      "Unlimited transactions & custom ledgers",
      "Dedicated PostgreSQL isolated instances",
      "Custom bank rail adapters (Fedwire, SEPA, ACH)",
      "Automated SOC1/SOC2 Compliance Export",
      "24/7 Dedicated Treasury Engineering Team",
      "99.99% Uptime SLA Guarantee",
    ],
    ctaText: "Contact Enterprise Sales",
    popular: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 border-t border-border/60 bg-muted/20 relative">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold">
            TRANSPARENT PRICING
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Predictable Volume Tiers for Enterprise PayOps
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Start free in our sandbox. Scale seamlessly with clear transaction-volume based plans and enterprise SLAs.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {TIERS.map((tier, idx) => (
            <div
              key={idx}
              className={`relative bg-card border rounded-2xl p-7 shadow-lg flex flex-col justify-between transition-all duration-300 ${
                tier.popular
                  ? "border-emerald-500 shadow-2xl ring-2 ring-emerald-500/20 scale-[1.02]"
                  : "border-border hover:border-border/80"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-600 text-white font-mono font-bold text-[10px] shadow-md tracking-wider">
                  {tier.badge}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 min-h-[36px]">{tier.description}</p>
                </div>

                <div className="pt-2 border-t border-border/60">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-foreground">{tier.price}</span>
                    <span className="text-xs text-muted-foreground font-medium">/ {tier.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 pt-2 text-xs text-foreground/90 font-medium">
                  {tier.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8">
                <Link to={tier.name === "Enterprise Custom" ? "/contact" : "/register"}>
                  <Button
                    className={`w-full font-bold text-xs h-10 gap-1.5 shadow-md ${
                      tier.popular
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    }`}
                  >
                    <span>{tier.ctaText}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
