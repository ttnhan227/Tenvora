import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, ShieldCheck, RefreshCcw, Terminal, Scale } from "lucide-react";

interface SimulatedJournalLine {
  id: string;
  account: string;
  type: "Debit" | "Credit";
  amount: number;
  currency: string;
  timestamp: string;
}

export default function LedgerInteractiveDemo() {
  const [sourceAcc, setSourceAcc] = useState("Acme Retail Corp (Liability)");
  const [destAcc, setDestAcc] = useState("Nexus Logistics (Liability)");
  const [amount, setAmount] = useState<number>(15000);
  const [currency, setCurrency] = useState("USD");
  const [isProcessing, setIsProcessing] = useState(false);

  const [history, setHistory] = useState<SimulatedJournalLine[]>([
    {
      id: "jl-001",
      account: "Nexus Logistics (Liability)",
      type: "Debit",
      amount: 25000,
      currency: "USD",
      timestamp: "10:42:01 UTC",
    },
    {
      id: "jl-002",
      account: "Acme Retail Corp (Liability)",
      type: "Credit",
      amount: 25000,
      currency: "USD",
      timestamp: "10:42:01 UTC",
    },
  ]);

  const totalDebits = history.filter((h) => h.type === "Debit").reduce((sum, h) => sum + h.amount, 0);
  const totalCredits = history.filter((h) => h.type === "Credit").reduce((sum, h) => sum + h.amount, 0);
  const variance = Math.abs(totalDebits - totalCredits);

  const handlePostTransfer = () => {
    if (amount <= 0) return;
    setIsProcessing(true);

    setTimeout(() => {
      const now = new Date().toLocaleTimeString("en-US", { timeZone: "UTC", hour12: false }) + " UTC";
      const newDebit: SimulatedJournalLine = {
        id: `jl-${Date.now().toString().slice(-4)}-1`,
        account: destAcc,
        type: "Debit",
        amount: amount,
        currency,
        timestamp: now,
      };
      const newCredit: SimulatedJournalLine = {
        id: `jl-${Date.now().toString().slice(-4)}-2`,
        account: sourceAcc,
        type: "Credit",
        amount: amount,
        currency,
        timestamp: now,
      };

      setHistory((prev) => [newDebit, newCredit, ...prev]);
      setIsProcessing(false);
    }, 450);
  };

  const handleReset = () => {
    setHistory([
      {
        id: "jl-001",
        account: "Nexus Logistics (Liability)",
        type: "Debit",
        amount: 25000,
        currency: "USD",
        timestamp: "10:42:01 UTC",
      },
      {
        id: "jl-002",
        account: "Acme Retail Corp (Liability)",
        type: "Credit",
        amount: 25000,
        currency: "USD",
        timestamp: "10:42:01 UTC",
      },
    ]);
  };

  return (
    <section id="simulator" className="py-24 border-t border-border/60 bg-background relative">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-border bg-muted/40 text-foreground font-mono text-[11px] font-semibold">
            <Terminal className="h-3.5 w-3.5 text-emerald-500" />
            INTERACTIVE LEDGER SIMULATOR
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Test the Double-Entry Balancing Invariant Live
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Execute simulated transfers between enterprise customer wallets. Observe how debit and credit entries balance instantaneously with zero variance.
          </p>
        </div>

        {/* Interactive Workspace Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-6xl mx-auto">
          {/* Transfer Execution Form */}
          <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <span className="font-bold text-sm text-foreground flex items-center gap-2">
                <Scale className="h-4 w-4 text-emerald-500" />
                Initiate Fund Movement
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                SANDBOX SIMULATION
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Source Account (Credit)</label>
                <select
                  value={sourceAcc}
                  onChange={(e) => setSourceAcc(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-lg p-2.5 text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Acme Retail Corp (Liability)">Acme Retail Corp — ACC-ACME-WALLET</option>
                  <option value="Global Treasury Pool (Asset)">Global Treasury Pool — ACC-TREASURY-001</option>
                  <option value="Nexus Logistics (Liability)">Nexus Logistics — ACC-NEXUS-WALLET</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Destination Account (Debit)</label>
                <select
                  value={destAcc}
                  onChange={(e) => setDestAcc(e.target.value)}
                  className="w-full bg-muted/40 border border-border rounded-lg p-2.5 text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Nexus Logistics (Liability)">Nexus Logistics — ACC-NEXUS-WALLET</option>
                  <option value="Acme Retail Corp (Liability)">Acme Retail Corp — ACC-ACME-WALLET</option>
                  <option value="Global Treasury Pool (Asset)">Global Treasury Pool — ACC-TREASURY-001</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Transfer Amount</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    min="1"
                    className="w-full bg-muted/40 border border-border rounded-lg p-2.5 text-foreground font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-muted/40 border border-border rounded-lg p-2.5 text-foreground font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="SGD">SGD (S$)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <Button
                  onClick={handlePostTransfer}
                  disabled={isProcessing || amount <= 0 || sourceAcc === destAcc}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 shadow-md shadow-emerald-600/20 text-xs gap-1.5"
                >
                  {isProcessing ? "Validating Invariant..." : "Post Balanced Transfer"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  size="sm"
                  className="h-10 px-3 border-border text-muted-foreground hover:text-foreground"
                  title="Reset demo history"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                </Button>
              </div>

              {sourceAcc === destAcc && (
                <div className="text-[11px] text-amber-500 font-medium">
                  * Source and destination accounts must be distinct.
                </div>
              )}
            </div>
          </div>

          {/* Real-Time Double-Entry Journal Viewer */}
          <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-3">
              <div>
                <span className="font-bold text-sm text-foreground">Live Journal Postings</span>
                <p className="text-[11px] text-muted-foreground">Immutable append-only debit &amp; credit ledger lines</p>
              </div>

              {/* Zero-Sum Invariant Card */}
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>VARIANCE: ${variance.toFixed(2)} USD</span>
              </div>
            </div>

            {/* Invariant equation bar */}
            <div className="grid grid-cols-3 gap-2 bg-muted/40 p-3 rounded-xl border border-border/60 text-center text-xs font-mono">
              <div>
                <span className="text-[10px] text-muted-foreground block">TOTAL DEBITS</span>
                <span className="font-bold text-foreground">${totalDebits.toLocaleString()}</span>
              </div>
              <div className="border-x border-border/60">
                <span className="text-[10px] text-muted-foreground block">TOTAL CREDITS</span>
                <span className="font-bold text-foreground">${totalCredits.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-500 block">NET BALANCE</span>
                <span className="font-bold text-emerald-500">$0.00 (Balanced)</span>
              </div>
            </div>

            {/* Journal Table */}
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-[11px] font-sans">
                <thead className="sticky top-0 bg-card border-b border-border text-muted-foreground uppercase text-[10px] font-mono">
                  <tr>
                    <th className="py-2 px-2">Timestamp</th>
                    <th className="py-2 px-2">Account</th>
                    <th className="py-2 px-2">Type</th>
                    <th className="py-2 px-2 text-right">Debit</th>
                    <th className="py-2 px-2 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {history.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-2 text-muted-foreground text-[10px]">{entry.timestamp}</td>
                      <td className="py-2.5 px-2 font-sans font-medium text-foreground truncate max-w-[180px]">
                        {entry.account}
                      </td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            entry.type === "Debit"
                              ? "bg-cyan-500/10 text-cyan-600 border border-cyan-500/20"
                              : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          }`}
                        >
                          {entry.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold text-foreground">
                        {entry.type === "Debit" ? `$${entry.amount.toLocaleString()}.00` : "—"}
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold text-foreground">
                        {entry.type === "Credit" ? `$${entry.amount.toLocaleString()}.00` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
