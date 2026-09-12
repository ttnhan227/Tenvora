import React from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { 
  ShieldCheck, 
  Lock, 
  Server, 
  FileCheck, 
  Layers, 
  CheckCircle2,
  FileUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SecurityWhitepaper() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pb-20 pt-8 sm:pt-12">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
          {/* Header */}
          <div className="py-8 sm:py-12 border-b border-slate-200 dark:border-border/80 space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary font-mono text-xs font-bold">
              <ShieldCheck className="h-4 w-4" />
              SECURITY, PRIVACY &amp; PRODUCT BOUNDARIES
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              How Tenvora Protects Your Workspace Records
            </h1>
            <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              A plain-language view of what stays in your browser, how signed-in records are separated, and what this reference build does not claim to protect or process.
            </p>
          </div>

          {/* High-Tech Security Architecture Interactive Diagram (Replaces broken 404 image) */}
          <div className="my-10 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-brand-ink text-white p-6 sm:p-10 relative">
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
              <div>
                <span className="text-[11px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
                  What happens to your records
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                  From Local CSV Review to Confirmed Income
                </h2>
              </div>
              <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1.5 rounded-full text-emerald-300 text-xs font-mono font-bold">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Traceable Record Flow
              </div>
            </div>

            {/* Architecture Node Flow */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {/* Step 1 */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-xs">
                  01
                </div>
                <h3 className="font-bold text-white text-base">Local Statement Review</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  The browser parses a user-selected CSV and suggests invoice matches. The statement file is not uploaded by this workflow.
                </p>
                <div className="pt-2 text-[11px] font-mono text-emerald-300 flex items-center gap-1.5">
                  <FileUp size={13} /> User Reviewed
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="h-9 w-9 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-mono font-bold text-xs">
                  02
                </div>
                <h3 className="font-bold text-white text-base">Authenticated Confirmation</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  Only a match you approve is recorded as confirmed income. Signed-in requests keep that record scoped to the active workspace.
                </p>
                <div className="pt-2 text-[11px] font-mono text-teal-300 flex items-center gap-1.5">
                  <Lock size={13} /> Workspace Scoped
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="h-9 w-9 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-mono font-bold text-xs">
                  03
                </div>
                <h3 className="font-bold text-white text-base">Balanced Planning Allocation</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  The confirmed amount updates recorded income and, when enabled, creates an internal tax-reserve allocation using the configured percentage.
                </p>
                <div className="pt-2 text-[11px] font-mono text-amber-300 flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> ∑ Debits = ∑ Credits
                </div>
              </div>
            </div>
          </div>

          {/* Security Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 my-12">
            <Card className="border border-slate-200 dark:border-border/80 bg-white dark:bg-card shadow-xs">
              <CardHeader className="space-y-1">
                <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2">
                  <Lock className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Your workspace stays separate
                </CardTitle>
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary">Technical control: tenant-scoped queries and PostgreSQL RLS</p>
              </CardHeader>
              <CardContent className="text-sm text-slate-700 dark:text-slate-300 space-y-3 leading-relaxed font-medium">
                <p>
                  Tenvora's migrations define PostgreSQL Row-Level Security policies using the <code className="font-mono text-primary font-bold">app.current_tenant_id</code> session setting. Application queries also scope records to the authenticated tenant.
                </p>
                <p>
                  The reference Compose deployment connects as the PostgreSQL superuser, which bypasses RLS. Production deployments must use a restricted application role and verify the policies independently; application tenant predicates are the effective boundary in the supplied stack.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-border/80 bg-white dark:bg-card shadow-xs">
              <CardHeader className="space-y-1">
                <div className="h-11 w-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 mb-2">
                  <Server className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Updates are protected from conflicts
                </CardTitle>
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-600">Technical control: database transactions and row locks</p>
              </CardHeader>
              <CardContent className="text-sm text-slate-700 dark:text-slate-300 space-y-3 leading-relaxed font-medium">
                <p>
                  Recorded balance adjustments update the affected workspace records inside a database transaction and use concurrency checks to avoid silently overwriting newer values.
                </p>
                <p>
                  Idempotency records protect supported transfer operations from accidental duplicate submission. These controls still require production load and failure testing.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-border/80 bg-white dark:bg-card shadow-xs">
              <CardHeader className="space-y-1">
                <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2">
                  <Layers className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Sensitive actions require authorization
                </CardTitle>
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary">Technical control: roles and signed access tokens</p>
              </CardHeader>
              <CardContent className="text-sm text-slate-700 dark:text-slate-300 space-y-3 leading-relaxed font-medium">
                <p>
                  Account operations require JWT authentication and role authorization. Application queries filter data by the authenticated workspace.
                </p>
                <p>
                  External bank connections, card processing, and payouts are not implemented. The supplied product manages records and internal planning categories only.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-border/80 bg-white dark:bg-card shadow-xs">
              <CardHeader className="space-y-1">
                <div className="h-11 w-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-2">
                  <FileCheck className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Important changes leave a trail
                </CardTitle>
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Technical control: append-only audit records</p>
              </CardHeader>
              <CardContent className="text-sm text-slate-700 dark:text-slate-300 space-y-3 leading-relaxed font-medium">
                <p>
                  Relevant entity changes are captured by the application's audit interceptor with actor and timestamp context. Ledger lines are designed as append-only financial records.
                </p>
                <p>
                  These controls improve traceability but do not constitute a certification. Retention, access review, incident response, and independent audit work remain production responsibilities.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Compliance Certifications */}
          <div className="p-8 rounded-2xl border border-slate-200 dark:border-border bg-white dark:bg-card space-y-6 shadow-xs">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Important limitations of this build
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-border/60 bg-slate-50 dark:bg-muted/20">
                <p className="text-base font-extrabold text-slate-900 dark:text-white">No certification claim</p>
                <p className="text-xs text-slate-600 dark:text-muted-foreground mt-1 font-medium">Independent audit required</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 dark:border-border/60 bg-slate-50 dark:bg-muted/20">
                <p className="text-base font-extrabold text-slate-900 dark:text-white">No card processing</p>
                <p className="text-xs text-slate-600 dark:text-muted-foreground mt-1 font-medium">PCI scope not assessed</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 dark:border-border/60 bg-slate-50 dark:bg-muted/20">
                <p className="text-base font-extrabold text-slate-900 dark:text-white">Reference deployment</p>
                <p className="text-xs text-slate-600 dark:text-muted-foreground mt-1 font-medium">Harden before production</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 dark:border-border/60 bg-slate-50 dark:bg-muted/20">
                <p className="text-base font-extrabold text-slate-900 dark:text-white">Privacy review needed</p>
                <p className="text-xs text-slate-600 dark:text-muted-foreground mt-1 font-medium">Policy and residency vary</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
