import { Link } from "react-router-dom";
import {
  ArrowRight,
  Percent,
  FileText,
  Sparkles,
  CheckCircle2,
  Users,
  Wallet,
  FileUp,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: FileUp,
    title: "Statement Import & Matching",
    body: "Import a CSV statement and review suggested matches between real deposits and unpaid invoices. The file stays in your browser.",
  },
  {
    icon: FileText,
    title: "Invoices That Explain Cash Flow",
    body: "Track what has been sent, paid, partially paid, or overdue—and connect confirmed income back to the right client and invoice.",
  },
  {
    icon: Users,
    title: "Client Payment Context",
    body: "Keep contacts, billing terms, rates, outstanding balances, and payment history together so follow-up decisions are easier.",
  },
  {
    icon: Wallet,
    title: "Estimated Safe to Spend",
    body: "See confirmed income after your configurable tax reserve, clearly separated from unpaid invoices and unverified bank activity.",
  },
  {
    icon: Percent,
    title: "Tax Reserve Planning",
    body: "Apply a configurable planning percentage to recorded income and monitor the gap between your estimate and reserved amount.",
  },
  {
    icon: Sparkles,
    title: "Actionable Financial Assistant",
    body: "Ask questions grounded in your recorded invoices and balances: what is outstanding, what changed, and what may be safe to spend.",
  },
];

const workflow = [
  { number: "01", title: "Add a client", body: "Save billing contact details, currency, rate, and payment terms." },
  { number: "02", title: "Create and send an invoice", body: "Record the work, amount, issue date, and due date. Sent does not mean paid." },
  { number: "03", title: "Review a statement CSV", body: "The browser suggests matches. You decide which deposit belongs to which invoice." },
  { number: "04", title: "Use the confirmed result", body: "Review recorded income, the planning reserve, and the estimated safe-to-spend balance." },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden w-full max-w-full flex flex-col justify-between">
      {/* Unified High-Contrast Sticky Navbar */}
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative isolate mx-auto max-w-6xl px-4 pb-14 pt-10 sm:px-6 sm:pb-16 sm:pt-14">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1 text-xs font-semibold text-primary mb-6">
              <Sparkles size={13} />
              <span>CASH-FLOW CLARITY FOR FREELANCERS</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.15] tracking-tight text-slate-900 dark:text-slate-50">
              Know what came in.<br />
              Know what is still due.<br />
              <span className="text-primary">Know what you can spend.</span>
            </h1>

            <p className="mx-auto mt-5 sm:mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-300 font-normal">
              Tenvora turns invoices and imported statement activity into a clear view of income, estimated tax reserves, and safe-to-spend cash.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <Button asChild size="lg" className="rounded-xl shadow-md px-6 sm:px-7 font-bold text-sm sm:text-base h-11 sm:h-12">
                <Link to="/register">
                  Start Free Workspace <ArrowRight size={17} className="ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base h-11 sm:h-12 px-5 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <a href="#workflow">See how it works</a>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" /> No bank credentials required
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" /> Private CSV statement matching
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" /> Traceable financial records
              </span>
            </div>
          </div>

          <div id="workflow" className="mt-10 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-300/20 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 sm:p-6">
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary font-mono">THE IMPLEMENTED WORKFLOW</p>
                <h2 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">From client to confirmed income in four steps</h2>
              </div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">One connected workflow inside your workspace.</p>
            </div>
            <ol className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {workflow.map((step) => (
                <li key={step.number} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="font-mono text-xs font-extrabold text-primary">{step.number}</p>
                  <h3 className="mt-3 font-bold text-slate-900 dark:text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{step.body}</p>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-xs text-slate-600 dark:text-slate-400">CSV files are reviewed locally in the browser. Tenvora does not connect to a bank or move funds.</p>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="border-t border-slate-200 bg-slate-50/50 py-16 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/40 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-primary font-mono">
                DESIGNED FOR INDEPENDENT WORKERS
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-slate-50">
                From invoice to a useful financial decision
              </h2>
              <p className="mt-4 text-slate-600 dark:text-slate-300 text-base leading-relaxed font-normal">
                Confirm income from a locally reviewed CSV, connect it to the work you billed, plan a tax reserve, and estimate what remains.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <article
                  key={f.title}
                  className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/80"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <f.icon size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{f.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300 font-normal">{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

      </main>

      {/* Unified High-Contrast Footer */}
      <Footer />
    </div>
  );
}
