import { Link } from "react-router-dom";
import { ArrowRight, Check, CircleOff, ShieldCheck } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const included = [
  "Client and invoice management",
  "Private browser-based CSV statement review",
  "Suggested deposit-to-invoice matching",
  "Configurable tax-reserve planning",
  "Estimated safe-to-spend balance",
  "Financial assistant grounded in workspace records",
  "Traceable double-entry financial records",
];

const boundaries = [
  "No connected bank account or balance feed",
  "No card, ACH, payout, or money movement",
  "No automatic tax filing or professional advice",
  "No paid roadmap tiers presented as available products",
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans overflow-x-hidden">
      <Navbar />

      <main className="flex-1 pb-20 pt-8 sm:pt-12">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="text-center py-8 sm:py-12 space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-bold font-mono text-primary">
              <ShieldCheck className="h-4 w-4" />
              ONE IMPLEMENTED WORKSPACE
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Use the complete workflow available today
            </h1>
            <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 font-medium">
              Tenvora currently has one free reference workspace. This page lists only features that are implemented in the running product.
            </p>
          </div>

          <Card className="overflow-hidden rounded-3xl border-primary/30 bg-white shadow-xl shadow-primary/10 dark:bg-card">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
              <div className="p-6 sm:p-9">
                <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6 dark:border-border">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-primary font-mono">Current workspace</p>
                    <h2 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">Freelancer cash-flow records</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-extrabold text-slate-900 dark:text-white">$0</p>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">reference build</p>
                  </div>
                </div>

                <ul className="mt-6 grid gap-3 text-sm font-medium text-slate-800 dark:text-slate-200 sm:grid-cols-2">
                  {included.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" className="h-11 rounded-xl font-bold">
                    <Link to="/register">Create free workspace <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-11 rounded-xl font-bold">
                    <Link to="/docs">Read the workflow guide</Link>
                  </Button>
                </div>
              </div>

              <div className="border-t border-slate-200 bg-slate-50 p-6 dark:border-border dark:bg-slate-950/40 sm:p-9 lg:border-l lg:border-t-0">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Clear product boundaries</h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                  The workspace records and explains information you provide. It is not a bank account and does not move real funds.
                </p>
                <ul className="mt-6 space-y-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {boundaries.map((boundary) => (
                    <li key={boundary} className="flex items-start gap-2.5">
                      <CircleOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <span>{boundary}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

        </div>
      </main>

      <Footer />
    </div>
  );
}
