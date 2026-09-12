import React from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Building2 } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pb-20 pt-8 sm:pt-12">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          {/* Header */}
          <div className="py-8 sm:py-12 border-b border-slate-200 dark:border-border/80 space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40 font-mono text-xs font-bold">
              <Building2 className="h-4 w-4" />
              ABOUT TENVORA
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Cash-flow clarity for independent professionals
            </h1>
            <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              Tenvora brings invoices, confirmed deposits, a configurable tax-reserve estimate, and an estimated safe-to-spend balance into one focused workspace. It helps freelancers make decisions from records they can inspect.
            </p>
          </div>

          {/* Mission & Values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 my-12 sm:my-14">
            <div className="p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-xs space-y-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono font-bold text-sm">
                01
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Explain every deposit</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                Import a bank statement as a private CSV, review suggested invoice matches, and confirm only the income that belongs in your workspace.
              </p>
            </div>

            <div className="p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-xs space-y-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono font-bold text-sm">
                02
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Traceable calculations</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                Confirmed payments and planning allocations create balanced ledger entries, so the figures shown in the product can be traced back to recorded activity.
              </p>
            </div>

            <div className="p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card shadow-xs space-y-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono font-bold text-sm">
                03
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Honest product boundaries</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                Tenvora is currently a financial record and planning workspace. It does not hold money, issue cards, connect bank credentials, or send external payments.
              </p>
            </div>
          </div>

          <div className="mt-14 sm:mt-16 rounded-3xl border border-primary/20 bg-primary/5 p-7 sm:p-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Built around one practical loop
            </h2>
            <p className="mt-3 max-w-3xl text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
              Create an invoice, confirm the deposit from a statement, reserve a planning percentage for tax, then use the remaining recorded balance to guide the next decision. Tenvora is designed to make that loop clear before adding broader financial integrations.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
