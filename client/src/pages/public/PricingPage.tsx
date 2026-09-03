import React, { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Check, HelpCircle, ArrowRight, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

export default function PricingPage() {
  const [monthlyVolume, setMonthlyVolume] = useState<number>(500000);
  const [annualBilling, setAnnualBilling] = useState(true);

  // Approximate basis points fee calculation based on volume slider
  const basisPoints = monthlyVolume > 2000000 ? 0.0008 : monthlyVolume > 500000 ? 0.0012 : 0.0018;
  const estimatedPlatformCost = Math.round(monthlyVolume * basisPoints);

  const tiers = [
    {
      name: "Starter Rails",
      price: annualBilling ? "$299" : "$379",
      billingPeriod: "/ month",
      description: "Ideal for growth fintechs and emerging SaaS marketplaces starting PayOps automation.",
      features: [
        "Up to $250k / mo transaction volume",
        "Double-entry ledger with automated invariant checks",
        "Daily automated settlement batch generation",
        "Up to 5 team member seats (RBAC)",
        "Standard webhook & REST API access",
        "Community & standard email support (24h SLA)",
      ],
      ctaText: "Get Started Free",
      ctaLink: "/register",
      popular: false,
    },
    {
      name: "Growth PayOps",
      price: annualBilling ? "$899" : "$1,099",
      billingPeriod: "/ month",
      description: "For scaling platforms requiring continuous reconciliation, multi-currency ledgers, and fast clearing.",
      features: [
        "Up to $2.5M / mo transaction volume",
        "Continuous 24/7 ledger reconciliation scanner",
        "Multi-currency accounts (USD, EUR, GBP, SGD)",
        "Unlimited team member seats with custom RBAC",
        "Real-time webhook streaming & replay log",
        "Dedicated Slack channel & 4h response SLA",
        "Dual-control settlement approvals",
      ],
      ctaText: "Start 14-Day Free Trial",
      ctaLink: "/register",
      popular: true,
    },
    {
      name: "Enterprise Rail",
      price: "Custom",
      billingPeriod: "tailored volume",
      description: "For financial institutions and tier-1 enterprises processing high volume requiring 99.999% SLAs.",
      features: [
        "Unlimited transaction volume",
        "Custom banking partner clearing integrations (FedNow, SEPA)",
        "PostgreSQL dedicated RLS database clustering",
        "SOC 2 Type II and PCI-DSS audit compliance package",
        "Custom interchange & platform fee schedule engine",
        "24/7/365 dedicated Technical Account Manager",
        "99.999% uptime SLA with financial backing",
      ],
      ctaText: "Contact Enterprise Sales",
      ctaLink: "/contact",
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-24 pb-24">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header Banner */}
          <div className="text-center py-12 space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-border bg-muted/40 text-foreground font-mono text-[11px] font-semibold">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              TRANSPARENT ENTERPRISE PRICING
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              Predictable Pricing Built for Scaling Platforms
            </h1>
            <p className="text-base text-muted-foreground">
              No hidden fees. Every tier includes our mathematical double-entry ledger engine, cryptographic idempotency, and PostgreSQL RLS security.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-3 pt-4">
              <span className={`text-xs font-semibold ${!annualBilling ? "text-foreground" : "text-muted-foreground"}`}>
                Monthly Billing
              </span>
              <button
                onClick={() => setAnnualBilling(!annualBilling)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  annualBilling ? "bg-emerald-600" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    annualBilling ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className={`text-xs font-semibold ${annualBilling ? "text-foreground" : "text-muted-foreground"}`}>
                Annual Billing <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold font-mono">(Save 20%)</span>
              </span>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8">
            {tiers.map((tier) => (
              <Card
                key={tier.name}
                className={`relative flex flex-col justify-between border ${
                  tier.popular
                    ? "border-emerald-500 shadow-xl shadow-emerald-500/10 bg-card"
                    : "border-border/80 bg-card"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-600 text-white font-mono text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    Most Popular
                  </div>
                )}

                <CardHeader className="space-y-2 pb-4">
                  <CardTitle className="text-lg font-bold text-foreground">{tier.name}</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-foreground">{tier.price}</span>
                    <span className="text-xs text-muted-foreground">{tier.billingPeriod}</span>
                  </div>
                  <CardDescription className="text-xs">{tier.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 flex-1">
                  <div className="border-t border-border/60 pt-4 space-y-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">What's included:</p>
                    <ul className="space-y-2 text-xs">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-foreground">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>

                <CardFooter className="pt-4 border-t border-border/50">
                  <Link to={tier.ctaLink} className="w-full">
                    <Button
                      className={`w-full text-xs font-semibold ${
                        tier.popular
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-secondary hover:bg-secondary/80 text-foreground"
                      }`}
                    >
                      {tier.ctaText}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Interactive Volume Estimator */}
          <div className="mt-16 p-8 rounded-2xl border border-border bg-card space-y-6">
            <div className="max-w-xl space-y-1">
              <h3 className="text-lg font-bold text-foreground">Interactive Volume Cost Estimator</h3>
              <p className="text-xs text-muted-foreground">
                Estimate your monthly platform cost based on expected gross payment volume.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Monthly Processed Volume:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-base font-bold">
                  ${monthlyVolume.toLocaleString()} USD
                </span>
              </div>

              <Slider
                value={[monthlyVolume]}
                min={50000}
                max={5000000}
                step={50000}
                onValueChange={(val) => setMonthlyVolume(val[0])}
                className="py-2"
              />

              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                <span>$50k / mo</span>
                <span>$2.5M / mo</span>
                <span>$5M+ / mo</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-foreground">Estimated Monthly Rate: ~${estimatedPlatformCost} / mo</p>
                <p className="text-[11px] text-muted-foreground">Based on ~{(basisPoints * 100).toFixed(2)} bps effective interchange rate</p>
              </div>
              <Link to="/contact">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                  Get Enterprise Custom Quote
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
