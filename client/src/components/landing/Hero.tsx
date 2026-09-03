import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Cpu,
  Play,
  Activity,
  Layers,
  Landmark,
  ShieldAlert,
  ArrowRightLeft,
  RefreshCw,
  Clock,
  ArrowUpRight,
  Database,
  Hash,
  Check,
  Building2,
} from "lucide-react";
import { MoneyDisplay } from "@/components/design-system/MoneyDisplay";
import { StatusBadge } from "@/components/design-system/StatusBadge";
import { MonospaceId } from "@/components/design-system/MonospaceId";

export default function Hero() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "ledger" | "settlement" | "risk">("dashboard");

  return (
    <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden border-b border-border/60">
      {/* Stripe Iconic Mesh Gradient Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none opacity-30 dark:opacity-15">
        <div className="absolute -top-32 -left-32 w-[650px] h-[650px] bg-gradient-to-tr from-[#635BFF] via-[#00D4FF] to-[#FF70A6] blur-[130px] rounded-full" />
        <div className="absolute top-10 -right-32 w-[650px] h-[650px] bg-gradient-to-bl from-[#635BFF] via-[#FFAA00] to-[#7F56D9] blur-[150px] rounded-full" />
      </div>

      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          {/* Stripe-Style Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#C7D2FE] bg-[#EEF2FF] text-[#3730A3] dark:bg-[#312E81]/30 dark:text-[#A5B4FC] dark:border-[#6366F1]/40 font-mono text-[11px] font-semibold shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#635BFF] inline-block animate-pulse" />
            <span>ENTERPRISE PAYMENT OPERATIONS &amp; LEDGER PLATFORM</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.08]">
            Deterministic financial rails for high-volume payment operations
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-[#4F5B76] dark:text-[#94A3B8] max-w-2xl mx-auto leading-relaxed">
            Move money with mathematical certainty. Built with immutable double-entry ledger invariants, PostgreSQL Row-Level Security, and automated multi-currency settlement clearing.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link to="/register">
              <Button size="lg" className="bg-[#635BFF] hover:bg-[#533AFD] text-white font-bold h-11 px-6 rounded-md gap-2 text-xs uppercase tracking-wider font-mono shadow-[0_2px_5px_rgba(99,91,255,0.3)]">
                Launch Operations Console
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="font-semibold h-11 px-6 rounded-md border-border bg-card hover:bg-[#F0F3F7] dark:hover:bg-[#1E293B] text-foreground gap-2 text-xs font-mono shadow-xs">
                <Play className="h-3.5 w-3.5 text-[#635BFF]" />
                Live Demo Access
              </Button>
            </Link>
          </div>

          {/* Trust Guarantees */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-[#4F5B76] dark:text-[#94A3B8] font-medium font-mono">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#00D924]" />
              Strict Double-Entry Invariant
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-[#635BFF]" />
              PostgreSQL Row-Level Security
            </span>
            <span className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-[#635BFF]" />
              Deterministic Concurrency Locks
            </span>
          </div>
        </div>

        {/* ACTUAL INTERACTIVE LIVE OPERATIONS CONSOLE PREVIEW (NO FAKE IMAGES) */}
        <div className="mt-14 relative mx-auto max-w-6xl">
          {/* Interactive Mode Switcher */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                activeTab === "dashboard"
                  ? "bg-[#635BFF] text-white shadow-xs"
                  : "bg-card border border-border text-[#4F5B76] hover:text-[#0A2540] dark:text-[#94A3B8] dark:hover:text-white"
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              Live Operations Console
            </button>
            <button
              onClick={() => setActiveTab("ledger")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                activeTab === "ledger"
                  ? "bg-[#635BFF] text-white shadow-xs"
                  : "bg-card border border-border text-[#4F5B76] hover:text-[#0A2540] dark:text-[#94A3B8] dark:hover:text-white"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Double-Entry Invariant Engine
            </button>
            <button
              onClick={() => setActiveTab("settlement")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                activeTab === "settlement"
                  ? "bg-[#635BFF] text-white shadow-xs"
                  : "bg-card border border-border text-[#4F5B76] hover:text-[#0A2540] dark:text-[#94A3B8] dark:hover:text-white"
              }`}
            >
              <Landmark className="h-3.5 w-3.5" />
              Net Clearing &amp; Batch Settlements
            </button>
            <button
              onClick={() => setActiveTab("risk")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                activeTab === "risk"
                  ? "bg-[#635BFF] text-white shadow-xs"
                  : "bg-card border border-border text-[#4F5B76] hover:text-[#0A2540] dark:text-[#94A3B8] dark:hover:text-white"
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Risk Review &amp; Radar Rules
            </button>
          </div>

          {/* Master Live Console Frame */}
          <div className="relative rounded-lg border border-border bg-card p-2 shadow-[0_8px_30px_rgba(60,66,87,0.12),0_1px_3px_rgba(60,66,87,0.08)] overflow-hidden">
            {/* macOS Chrome Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border bg-[#FAFBFC] dark:bg-[#0E1A2E] rounded-t-md mb-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#E3E8EE] dark:bg-[#223C63]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#E3E8EE] dark:bg-[#223C63]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#E3E8EE] dark:bg-[#223C63]" />
                </div>
                <span className="font-mono text-[11px] text-muted-foreground font-semibold ml-2">
                  app.tenvora.internal / {activeTab}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#EBFBF3] border border-[#A3E6CD] text-[#0E6251] dark:bg-[#064E3B]/30 dark:text-[#6EE7B7] text-[10px] font-mono font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00D924] animate-pulse" />
                  LIVE RAILS CONNECTED
                </span>
              </div>
            </div>

            {/* LIVE RENDERED LOGGED-IN OPERATIONS CONSOLE */}
            <div className="p-3 sm:p-5 bg-background rounded-md space-y-4">
              {activeTab === "dashboard" && (
                <div className="space-y-4">
                  {/* Financial KPI Widgets */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3 rounded-md border border-border bg-card shadow-xs">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#4F5B76] dark:text-[#94A3B8] font-mono">
                        Available Liquidity
                      </div>
                      <div className="mt-1 text-lg font-bold font-mono text-foreground">
                        $4,285,450.00
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">8 treasury operating pools</div>
                    </div>
                    <div className="p-3 rounded-md border border-border bg-card shadow-xs">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#4F5B76] dark:text-[#94A3B8] font-mono">
                        24h Cleared Volume
                      </div>
                      <div className="mt-1 text-lg font-bold font-mono text-foreground">
                        $892,140.00
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">1,248 atomic transfers</div>
                    </div>
                    <div className="p-3 rounded-md border border-border bg-card shadow-xs">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#4F5B76] dark:text-[#94A3B8] font-mono">
                        Settlement Batches
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-lg font-bold font-mono text-foreground">3 Batches</span>
                        <StatusBadge status="Settled" size="sm" />
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Zero pending variances</div>
                    </div>
                    <div className="p-3 rounded-md border border-border bg-card shadow-xs">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#4F5B76] dark:text-[#94A3B8] font-mono">
                        Invariant Verification
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-lg font-bold font-mono text-[#0E6251] dark:text-[#6EE7B7]">100% Balanced</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">0.0000 balance drift</div>
                    </div>
                  </div>

                  {/* Real Transactions Journal Table */}
                  <div className="rounded-md border border-border bg-card overflow-hidden shadow-xs">
                    <div className="px-3.5 py-2 border-b border-border bg-[#FAFBFC] dark:bg-[#0E1A2E] flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-foreground">Live Transaction Stream</span>
                      <span className="text-[10px] font-mono text-muted-foreground">Deterministic Locking Active</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse font-mono">
                        <thead>
                          <tr className="border-b border-border text-[10px] text-muted-foreground uppercase bg-muted/20">
                            <th className="py-2 px-3">Reference</th>
                            <th className="py-2 px-3">Type</th>
                            <th className="py-2 px-3 text-right">Amount</th>
                            <th className="py-2 px-3 text-center">Status</th>
                            <th className="py-2 px-3 text-right">Journal Lines</th>
                            <th className="py-2 px-3 text-right">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          <tr>
                            <td className="py-2.5 px-3 font-bold text-foreground">TX-2026-9812</td>
                            <td className="py-2.5 px-3 text-muted-foreground">Transfer</td>
                            <td className="py-2.5 px-3 text-right font-bold">$12,500.00 USD</td>
                            <td className="py-2.5 px-3 text-center"><StatusBadge status="Posted" size="sm" /></td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">2 lines</td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">Just now</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-bold text-foreground">TX-2026-9811</td>
                            <td className="py-2.5 px-3 text-muted-foreground">Settlement</td>
                            <td className="py-2.5 px-3 text-right font-bold">€48,200.00 EUR</td>
                            <td className="py-2.5 px-3 text-center"><StatusBadge status="Settled" size="sm" /></td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">4 lines</td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">2m ago</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-bold text-foreground">TX-2026-9810</td>
                            <td className="py-2.5 px-3 text-muted-foreground">Payment</td>
                            <td className="py-2.5 px-3 text-right font-bold">$3,450.00 USD</td>
                            <td className="py-2.5 px-3 text-center"><StatusBadge status="Posted" size="sm" /></td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">2 lines</td>
                            <td className="py-2.5 px-3 text-right text-muted-foreground">5m ago</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "ledger" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-md bg-[#EEF2FF] border border-[#C7D2FE] dark:bg-[#312E81]/20 dark:border-[#6366F1]/30 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-[#3730A3] dark:text-[#A5B4FC]">
                      <Database className="h-4 w-4 text-[#635BFF]" />
                      <span className="font-semibold">Double-Entry Invariant: {"∑ Debits = ∑ Credits ($12,500.00)"}</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#635BFF] text-white font-bold">ZERO DRIFT</span>
                  </div>

                  <div className="rounded-md border border-border bg-card overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse font-mono">
                      <thead>
                        <tr className="border-b border-border text-[10px] text-muted-foreground uppercase bg-[#FAFBFC] dark:bg-[#0E1A2E]">
                          <th className="py-2 px-3">Entry ID</th>
                          <th className="py-2 px-3">Account</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3 text-right">Debit ($)</th>
                          <th className="py-2 px-3 text-right">Credit ($)</th>
                          <th className="py-2 px-3 text-right">Post Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        <tr>
                          <td className="py-2.5 px-3 text-muted-foreground">ENT-001A</td>
                          <td className="py-2.5 px-3 font-semibold text-foreground">ACC-TREASURY-01 (Asset)</td>
                          <td className="py-2.5 px-3"><span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">DEBIT</span></td>
                          <td className="py-2.5 px-3 text-right font-bold text-foreground">$12,500.00</td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground">$0.00</td>
                          <td className="py-2.5 px-3 text-right font-bold text-foreground">$1,425,000.00</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 text-muted-foreground">ENT-001B</td>
                          <td className="py-2.5 px-3 font-semibold text-foreground">ACC-CUSTOMER-48 (Liability)</td>
                          <td className="py-2.5 px-3"><span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 font-bold text-[10px]">CREDIT</span></td>
                          <td className="py-2.5 px-3 text-right text-muted-foreground">$0.00</td>
                          <td className="py-2.5 px-3 text-right font-bold text-foreground">$12,500.00</td>
                          <td className="py-2.5 px-3 text-right font-bold text-foreground">$12,500.00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-2.5 rounded bg-muted/30 border border-border/80 text-[11px] font-mono text-muted-foreground flex items-center justify-between">
                    <span>Locking Mechanism: SELECT FOR UPDATE ORDER BY id ASC</span>
                    <span className="text-[#0E6251] dark:text-[#6EE7B7] font-bold">Deadlock-Free</span>
                  </div>
                </div>
              )}

              {activeTab === "settlement" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-md border border-border bg-card">
                      <div className="text-[10px] uppercase font-mono text-muted-foreground">Gross Volume</div>
                      <div className="text-lg font-bold font-mono text-foreground mt-0.5">$248,500.00</div>
                    </div>
                    <div className="p-3 rounded-md border border-border bg-card">
                      <div className="text-[10px] uppercase font-mono text-muted-foreground">Processor Fees (0.74%)</div>
                      <div className="text-lg font-bold font-mono text-muted-foreground mt-0.5">-$1,842.50</div>
                    </div>
                    <div className="p-3 rounded-md border border-border bg-card bg-[#EBFBF3]/50 dark:bg-[#064E3B]/20">
                      <div className="text-[10px] uppercase font-mono text-[#0E6251] dark:text-[#6EE7B7] font-bold">Net Payout</div>
                      <div className="text-lg font-bold font-mono text-[#0E6251] dark:text-[#6EE7B7] mt-0.5">$246,657.50</div>
                    </div>
                  </div>

                  <div className="rounded-md border border-border bg-card overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse font-mono">
                      <thead>
                        <tr className="border-b border-border text-[10px] text-muted-foreground uppercase bg-[#FAFBFC] dark:bg-[#0E1A2E]">
                          <th className="py-2 px-3">Batch Reference</th>
                          <th className="py-2 px-3">Merchant</th>
                          <th className="py-2 px-3 text-center">Items</th>
                          <th className="py-2 px-3 text-right">Net Payout</th>
                          <th className="py-2 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        <tr>
                          <td className="py-2.5 px-3 font-bold text-foreground">SETTLE-2026-B01</td>
                          <td className="py-2.5 px-3 font-sans font-semibold">Acme Merchant US</td>
                          <td className="py-2.5 px-3 text-center">142 txns</td>
                          <td className="py-2.5 px-3 text-right font-bold text-foreground">$184,200.00</td>
                          <td className="py-2.5 px-3 text-center"><StatusBadge status="Settled" size="sm" /></td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-bold text-foreground">SETTLE-2026-B02</td>
                          <td className="py-2.5 px-3 font-sans font-semibold">Apex Global B2B</td>
                          <td className="py-2.5 px-3 text-center">68 txns</td>
                          <td className="py-2.5 px-3 text-right font-bold text-foreground">$62,457.50</td>
                          <td className="py-2.5 px-3 text-center"><StatusBadge status="Settled" size="sm" /></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "risk" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-md bg-card border border-border flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-foreground">Deterministic Evaluation: TX-2026-9812</div>
                      <div className="text-[10px] text-muted-foreground font-mono">Amount: $12,500.00 • Idempotency: SHA-256 Validated</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-[#0E6251] dark:text-[#6EE7B7]">Score: 12 / 100</div>
                      <StatusBadge status="Approved" size="sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded border border-border bg-card flex items-center justify-between">
                      <span className="text-muted-foreground">Velocity Limit (10/min)</span>
                      <span className="text-[#0E6251] font-bold flex items-center gap-1"><Check className="h-3 w-3" /> Passed</span>
                    </div>
                    <div className="p-2.5 rounded border border-border bg-card flex items-center justify-between">
                      <span className="text-muted-foreground">Single Transaction Ceiling</span>
                      <span className="text-[#0E6251] font-bold flex items-center gap-1"><Check className="h-3 w-3" /> Passed</span>
                    </div>
                    <div className="p-2.5 rounded border border-border bg-card flex items-center justify-between">
                      <span className="text-muted-foreground">Account Balance Depletion</span>
                      <span className="text-[#0E6251] font-bold flex items-center gap-1"><Check className="h-3 w-3" /> Passed</span>
                    </div>
                    <div className="p-2.5 rounded border border-border bg-card flex items-center justify-between">
                      <span className="text-muted-foreground">Tenant Isolation (RLS)</span>
                      <span className="text-[#0E6251] font-bold flex items-center gap-1"><Check className="h-3 w-3" /> Enforced</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
