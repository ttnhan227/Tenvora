import { Link } from "react-router-dom";
import {
  FileText,
  Percent,
  FileUp,
  ShieldCheck,
  Sparkles,
  Lock,
  ArrowRight,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";

export default function Documentation() {
  const sections = [
    {
      icon: FileText,
      title: "Create invoices that explain your income",
      body: "Create line-item invoices in supported currencies, set payment terms, and track what is draft, sent, overdue, partially paid, or paid. Invoices become the source record behind each confirmed client deposit.",
    },
    {
      icon: Percent,
      title: "Plan a tax reserve",
      body: "Choose a planning percentage for confirmed invoice income. Tenvora records that amount in a tax-reserve category and subtracts it from the estimated safe-to-spend figure. This is a budgeting estimate—not tax advice or a separate bank account.",
    },
    {
      icon: FileUp,
      title: "Import and match a statement",
      body: "Import a CSV with Date, Description, and Amount columns. Tenvora reads the file locally in your browser, suggests invoice matches by reference, client, currency, and remaining amount, then waits for your confirmation before recording anything.",
    },
    {
      icon: Sparkles,
      title: "Ask questions about recorded cash flow",
      body: "The assistant can summarize invoices, recorded balances, reserve estimates, and client payment patterns. Its answers are grounded in your Tenvora records and should be checked against your real bank balance and professional tax advice.",
    },
    {
      icon: Lock,
      title: "Review the calculation trail",
      body: "Confirmed payments and internal allocations use balanced double-entry records. Reconciliation compares journal-derived totals with cached workspace balances, making inconsistencies visible instead of hiding them.",
    },
    {
      icon: ShieldCheck,
      title: "Understand the product boundaries",
      body: "Tenvora does not connect to your bank, hold or move money, file taxes, or provide tax advice. Your statement CSV stays in the browser, and only matches you confirm become workspace records.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col justify-between">
      {/* Unified Sticky Navbar */}
      <Navbar />

      <main className="mx-auto max-w-5xl space-y-12 px-4 sm:px-6 py-10 sm:py-14 flex-1">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-3.5 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>FREELANCER USER GUIDE &amp; HANDBOOK</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
            How Tenvora turns records into cash-flow clarity
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl font-normal leading-relaxed">
            A practical workflow for connecting invoices to deposits, planning a reserve, and estimating what remains available.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {sections.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs hover:border-primary/40 hover:shadow-md transition-all space-y-3"
            >
              <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Icon size={22} />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 font-normal">{body}</p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-8 sm:p-10 text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50">Ready to take control of your freelance income?</h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-md mx-auto font-normal leading-relaxed">
            Create a workspace, add a client and invoice, then import a statement CSV to confirm the income you actually received.
          </p>
          <Button asChild size="lg" className="rounded-xl shadow-md font-bold px-7 h-11 sm:h-12">
            <Link to="/register">
              Create Free Workspace <ArrowRight size={17} className="ml-2" />
            </Link>
          </Button>
        </div>
      </main>

      {/* Unified High-Contrast Footer */}
      <Footer />
    </div>
  );
}
