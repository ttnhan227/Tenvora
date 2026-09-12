import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Calculator, FileUp, Settings, Sparkles, UserPlus } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const helpPaths = [
  {
    icon: BookOpen,
    title: "Follow the product guide",
    body: "Use the step-by-step guide for clients, invoices, CSV matching, tax planning, and safe-to-spend estimates.",
    label: "Read the guide",
    href: "/docs",
  },
  {
    icon: FileUp,
    title: "Prepare a statement CSV",
    body: "Download the exact CSV structure accepted by the browser-based statement matching flow.",
    label: "Download example CSV",
    href: "/example-statement.csv",
    download: true,
  },
  {
    icon: Sparkles,
    title: "Ask the financial assistant",
    body: "Signed-in users can ask questions grounded in their actual Tenvora invoices, balances, and tax-planning records.",
    label: "Open the assistant",
    href: "/assistant",
  },
  {
    icon: Settings,
    title: "Check workspace settings",
    body: "Review the base currency, reserve percentage, automatic allocation setting, and appearance used by your workspace.",
    label: "Open settings",
    href: "/system",
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans overflow-x-hidden">
      <Navbar />

      <main className="flex-1 pb-20 pt-8 sm:pt-12">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="text-center py-8 sm:py-10 space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-bold font-mono text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              HELP THAT OPENS A REAL WORKFLOW
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Get help using Tenvora
            </h1>
            <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 font-medium">
              Choose a working path below. This page no longer presents a support form that cannot deliver your message.
            </p>
          </div>

          <div className="grid gap-5 pt-5 md:grid-cols-2">
            {helpPaths.map((item) => (
              <Card key={item.title} className="rounded-2xl border-slate-200 bg-white shadow-xs dark:border-border dark:bg-card">
                <CardContent className="flex h-full flex-col p-6">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{item.title}</h2>
                  <p className="mt-2 flex-1 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">{item.body}</p>
                  {item.download ? (
                    <a href={item.href} download className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
                      {item.label} <ArrowRight className="h-4 w-4" />
                    </a>
                  ) : (
                    <Link to={item.href} className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
                      {item.label} <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50/70 p-6 dark:border-amber-800 dark:bg-amber-950/20 sm:p-8">
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                  <Calculator className="h-5 w-5" />
                  <h2 className="font-bold">Know the current support boundary</h2>
                </div>
                <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-amber-900/80 dark:text-amber-200/80">
                  This reference build does not include an external support inbox. For product help, use the guide and in-workspace assistant. Tax estimates remain planning aids and should be checked against your bank records and professional advice.
                </p>
              </div>
              <Button asChild className="h-11 rounded-xl font-bold">
                <Link to="/register"><UserPlus className="mr-2 h-4 w-4" /> Create a workspace</Link>
              </Button>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
