import React, { useState } from "react";
import { Layers, RefreshCw, Landmark, ShieldCheck, CheckCircle2, ArrowRight, Database, Lock, Cpu, Server, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/design-system/StatusBadge";

const TABS = [
  {
    id: "ledger",
    name: "Double-Entry Ledger Core",
    icon: Layers,
    title: "Immutable Journal Postings & Treasury Control",
    description:
      "Every financial movement creates equal and opposite debit and credit entries. Never modify historical balance rows directly — all adjustments append compensating journal lines with full cryptographic traceability.",
    badges: ["Zero-Sum Guaranteed", "Decimal Numeric Precision", "Reversal Append-Only"],
    bulletPoints: [
      "Strict double-entry accounting equation: Assets = Liabilities + Equity",
      "Automatic ledger reconciliation audits comparing cached vs derived sums",
      "Zero IEEE-754 floating-point inaccuracies using numeric(18,4)",
    ],
  },
  {
    id: "settlements",
    name: "Automated Batch Settlements",
    icon: Landmark,
    title: "Commercial B2B Card & Payment Rails Clearing",
    description:
      "Aggregate hundreds of thousands of daily intra-day transactions into clean, single net clearing batches per currency. Automatically compute interchange and gateway fees with precise gross-to-net transparency.",
    badges: ["End-of-Day Aggregation", "Multi-Currency Rails", "Fee Deductions"],
    bulletPoints: [
      "Daily gross settlement aggregation across USD, EUR, GBP, and SGD",
      "Itemized processor fee deductions with audit trail confirmation",
      "Direct integration with commercial banking ACH, SEPA, and Fedwire rails",
    ],
  },
  {
    id: "reconciliation",
    name: "Continuous Reconciliation",
    icon: RefreshCw,
    title: "Automated Invoice & Ledger Reconciliation",
    description:
      "Run continuous background audits across all enterprise accounts and billing streams. Tenvora recalculates all historical journal postings in real-time, surfacing any ledger drift or unposted variances immediately.",
    badges: ["Automated Discrepancy Scanners", "Zero Ledger Drift", "Real-Time Audit Runs"],
    bulletPoints: [
      "Continuous verification between database ledger and external billing statements",
      "Itemized discrepancy queue with variance reason codes and auto-resolution",
      "Instant exportable SOC1/SOC2 audit reports for external compliance teams",
    ],
  },
  {
    id: "global",
    name: "Global Multi-Currency Rails",
    icon: ShieldCheck,
    title: "Cross-Border Settlement & Account Isolation",
    description:
      "Support global commercial operations across multi-region jurisdictions. PostgreSQL Row-Level Security policies evaluate tenant context at the database kernel level with deterministic ascending row locks.",
    badges: ["Multi-Region Currency", "PostgreSQL Native RLS", "5-Role RBAC"],
    bulletPoints: [
      "Multi-currency asset and liability wallets in USD, EUR, GBP, and SGD",
      "Pessimistic SELECT FOR UPDATE locking sorted by account ID order",
      "Enterprise RBAC: TenantAdmin, OperationsManager, ComplianceOfficer, Auditor, Viewer",
    ],
  },
];

export default function PlatformTour() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const current = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <section id="platform" className="py-24 border-t border-border/60 bg-muted/20 relative">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#C7D2FE] bg-[#EEF2FF] text-[#3730A3] dark:bg-[#312E81]/30 dark:text-[#A5B4FC] font-mono text-[11px] font-bold">
            ARCHITECTURE TOUR
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Enterprise Payment Infrastructure, Visualized
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Explore how Tenvora delivers mathematically verifiable, high-throughput payment rails for global platforms and financial institutions.
          </p>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md font-medium text-xs transition-all ${
                  isSelected
                    ? "bg-[#635BFF] text-white shadow-xs font-bold"
                    : "bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Tour Feature Content Card */}
        <div className="bg-card border border-border rounded-lg p-6 sm:p-8 lg:p-10 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Real Live Interactive Architecture Widget */}
            <div className="lg:col-span-7">
              <div className="rounded-lg bg-background border border-border p-5 space-y-4 shadow-xs">
                {activeTab === "ledger" && (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-border text-[11px]">
                      <span className="font-bold text-foreground flex items-center gap-2">
                        <Database className="h-4 w-4 text-[#635BFF]" />
                        Double-Entry Ledger Schema
                      </span>
                      <span className="text-[#0E6251] dark:text-[#6EE7B7] font-bold">{"∑ Debit = ∑ Credit"}</span>
                    </div>
                    <div className="bg-muted/30 p-3 rounded border border-border space-y-2">
                      <div className="text-[11px] text-muted-foreground">// Atomic Transaction Invariant Validation</div>
                      <div className="text-foreground">
                        <span className="text-[#635BFF] font-bold">BEGIN TRANSACTION;</span><br />
                        <span className="text-muted-foreground">-- Ascending Locks eliminate deadlock</span><br />
                        SELECT * FROM "Accounts" WHERE id IN (<span className="text-amber-600 dark:text-amber-400">acc_src</span>, <span className="text-amber-600 dark:text-amber-400">acc_dst</span>)<br />
                        ORDER BY id ASC FOR UPDATE;<br />
                        <span className="text-emerald-600 font-bold">INSERT INTO "LedgerEntries"</span> (AccountId, Debit, Credit, Balance)...<br />
                        <span className="text-[#635BFF] font-bold">COMMIT;</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                      <span>Numeric Fixed Precision: numeric(18,4)</span>
                      <span className="text-emerald-600 font-bold">0.0000 Balance Drift</span>
                    </div>
                  </div>
                )}

                {activeTab === "settlements" && (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-border text-[11px]">
                      <span className="font-bold text-foreground flex items-center gap-2">
                        <Landmark className="h-4 w-4 text-[#635BFF]" />
                        Gross-to-Net Clearing Engine
                      </span>
                      <StatusBadge status="Settled" size="sm" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded bg-muted/30 border border-border">
                        <div className="text-[10px] text-muted-foreground">Gross Vol</div>
                        <div className="font-bold text-foreground mt-0.5">$540,000.00</div>
                      </div>
                      <div className="p-2.5 rounded bg-muted/30 border border-border">
                        <div className="text-[10px] text-muted-foreground">Fees Deducted</div>
                        <div className="font-bold text-red-600 mt-0.5">-$4,050.00</div>
                      </div>
                      <div className="p-2.5 rounded bg-[#EBFBF3] dark:bg-[#064E3B]/20 border border-[#A3E6CD] dark:border-[#059669]/40">
                        <div className="text-[10px] text-[#0E6251] dark:text-[#6EE7B7] font-bold">Net Payout</div>
                        <div className="font-bold text-[#0E6251] dark:text-[#6EE7B7] mt-0.5">$535,950.00</div>
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground p-2 rounded bg-card border border-border">
                      Banking Cutoff: 17:00 EST • ISO-20022 Pacs.008 Clearing Batch Generated
                    </div>
                  </div>
                )}

                {activeTab === "reconciliation" && (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-border text-[11px]">
                      <span className="font-bold text-foreground flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-[#635BFF]" />
                        Automated Invariant Audit Run
                      </span>
                      <span className="text-[#0E6251] font-bold">Check Passed (100%)</span>
                    </div>
                    <div className="space-y-2">
                      <div className="p-2.5 rounded bg-card border border-border flex items-center justify-between">
                        <span>Ledger Entries Scanned</span>
                        <span className="font-bold text-foreground">124,850 Journal Rows</span>
                      </div>
                      <div className="p-2.5 rounded bg-card border border-border flex items-center justify-between">
                        <span>Accounts Audited</span>
                        <span className="font-bold text-foreground">42 Active Accounts</span>
                      </div>
                      <div className="p-2.5 rounded bg-[#EBFBF3] dark:bg-[#064E3B]/20 border border-[#A3E6CD] dark:border-[#059669]/40 flex items-center justify-between text-[#0E6251] dark:text-[#6EE7B7]">
                        <span className="font-bold">Detected Variances</span>
                        <span className="font-bold">0 Discrepancies</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "global" && (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-border text-[11px]">
                      <span className="font-bold text-foreground flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-[#635BFF]" />
                        PostgreSQL Row-Level Security (RLS)
                      </span>
                      <span className="text-[#635BFF] font-bold">Kernel Enforced</span>
                    </div>
                    <div className="bg-muted/30 p-3 rounded border border-border space-y-1.5">
                      <div className="text-[11px] text-muted-foreground">// Kernel-level tenant isolation</div>
                      <div className="text-foreground">
                        <span className="text-[#635BFF] font-bold">SET LOCAL</span> app.current_tenant = <span className="text-amber-600 dark:text-amber-400">'tenant-9812'</span>;<br />
                        <span className="text-muted-foreground">-- Queries automatically scoped to active workspace</span><br />
                        CREATE POLICY tenant_isolation_policy ON "Accounts"<br />
                        USING (TenantId = current_setting('app.current_tenant')::uuid);
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Explanatory Breakdown */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-3">
                <h3 className="text-xl sm:text-2xl font-bold text-foreground leading-snug">
                  {current.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {current.description}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground">
                  Architectural Guarantees:
                </p>
                <ul className="space-y-2.5">
                  {current.bulletPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90 leading-relaxed font-medium">
                      <CheckCircle2 className="h-4 w-4 text-[#00D924] shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4">
                <Link to="/register">
                  <Button className="bg-[#635BFF] hover:bg-[#533AFD] text-white font-semibold text-xs h-10 px-5 gap-2 rounded-md shadow-xs">
                    <span>Try {current.name} in Console</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
