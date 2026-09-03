import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Layers,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Building2,
} from "lucide-react";
import {
  MoneyDisplay,
  StatusBadge,
  MonospaceId,
  DataTable,
  Column,
} from "@/components/design-system";
import { settlementService, SettlementBatch } from "@/services/settlementService";
import { accountService, Customer } from "@/services/accountService";

export default function SettlementBatches() {
  const [batches, setBatches] = useState<SettlementBatch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [batchRes, custRes] = await Promise.all([
      settlementService.getBatches(),
      accountService.getCustomers(),
    ]);

    if (batchRes.success && batchRes.data) setBatches(batchRes.data);
    if (custRes.success && custRes.data) setCustomers(custRes.data);
    setLoading(false);
  }

  async function handleGenerateBatch(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomerId) return;
    setGenerating(true);
    const res = await settlementService.generateBatch(selectedCustomerId);
    setGenerating(false);
    if (res.success) {
      setGenerateOpen(false);
      loadData();
    }
  }

  const totalGross = batches.reduce((sum, b) => sum + b.grossAmount, 0);
  const totalFees = batches.reduce((sum, b) => sum + b.feesDeducted, 0);
  const totalNet = batches.reduce((sum, b) => sum + b.netSettlementAmount, 0);

  const [clearingId, setClearingId] = useState<string | null>(null);

  async function handleClearBatch(id: string) {
    setClearingId(id);
    const res = await settlementService.clearBatch(id);
    setClearingId(null);
    if (res.success) {
      loadData();
    }
  }

  const columns: Column<SettlementBatch>[] = [
    {
      key: "batchReference",
      header: "Batch Reference",
      sortable: true,
      render: (b) => <MonospaceId id={b.batchReference} label="Batch Reference" />,
    },
    {
      key: "customerId",
      header: "Counterparty Customer",
      render: (b) => {
        const cust = customers.find((c) => c.id === b.customerId);
        return (
          <span className="font-semibold text-foreground">
            {cust?.name || (b.customerId ? `${b.customerId.substring(0, 8)}...` : "Global Clearing")}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Clearing Status",
      align: "center",
      sortable: true,
      render: (b) => <StatusBadge status={b.status} size="sm" />,
    },
    {
      key: "totalTransactions",
      header: "Transaction Count",
      align: "center",
      sortable: true,
      render: (b) => (
        <span className="font-mono text-xs font-bold text-foreground">
          {b.totalTransactions} items
        </span>
      ),
    },
    {
      key: "grossAmount",
      header: "Gross Volume ($)",
      align: "right",
      sortable: true,
      render: (b) => <MoneyDisplay amount={b.grossAmount} currency={b.currency} size="xs" />,
    },
    {
      key: "feesDeducted",
      header: "Processor Fees ($)",
      align: "right",
      sortable: true,
      render: (b) => (
        <span className="font-mono text-xs text-muted-foreground">
          -${b.feesDeducted.toFixed(2)}
        </span>
      ),
    },
    {
      key: "netSettlementAmount",
      header: "Net Payout ($)",
      align: "right",
      sortable: true,
      render: (b) => (
        <span className="font-bold text-foreground">
          <MoneyDisplay amount={b.netSettlementAmount} currency={b.currency} size="xs" />
        </span>
      ),
    },
    {
      key: "settlementDate",
      header: "Cutoff / Settlement",
      align: "right",
      sortable: true,
      render: (b) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {new Date(b.settlementDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (b) =>
        b.status === "Pending" || b.status === "Open" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleClearBatch(b.id)}
            disabled={clearingId === b.id}
            className="h-6 px-2 text-[10px] font-mono border-border bg-card hover:bg-muted font-semibold text-emerald-600 dark:text-emerald-400"
          >
            {clearingId === b.id ? "Clearing..." : "Clear Batch"}
          </Button>
        ) : (
          <span className="text-[10px] font-mono text-muted-foreground">Settled</span>
        ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
              Settlement Batches &amp; Net Clearing
            </h1>
            <p className="text-xs text-muted-foreground">
              Aggregate posted transactions into net clearing batches with fee deductions and banking cutoffs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground bg-card"
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-7 px-3 bg-[#635BFF] hover:bg-[#533AFD] text-white text-xs font-semibold rounded-md shadow-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Generate Clearing Batch
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[420px] bg-card border border-border text-xs rounded-lg p-5">
                <form onSubmit={handleGenerateBatch} className="space-y-3.5">
                  <DialogHeader className="space-y-1">
                    <DialogTitle className="text-sm font-bold flex items-center gap-2">
                      <Layers className="h-4 w-4 text-foreground" />
                      Generate Settlement Batch
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Collects all unbatched posted transactions for this counterparty and aggregates net payout.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Target Merchant Counterparty
                    </label>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger className="h-8 text-xs font-mono">
                        <SelectValue placeholder="Select counterparty" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-xs font-mono">
                            {c.name} ({c.externalReference || "No Ref"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <DialogFooter className="pt-2">
                    <Button
                      type="submit"
                      disabled={generating || !selectedCustomerId}
                      className="h-8 px-4 bg-[#635BFF] hover:bg-[#533AFD] text-white text-xs font-semibold rounded-md shadow-xs"
                    >
                      {generating ? "Aggregating..." : "Execute Settlement Run"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Aggregate Totals Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded border border-border bg-card">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Cumulative Gross Volume
            </div>
            <div className="mt-1 text-xl font-bold font-mono text-foreground tracking-tight">
              <MoneyDisplay amount={totalGross} currency="USD" size="lg" />
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Total transaction volume cleared
            </div>
          </div>

          <div className="p-3.5 rounded border border-border bg-card">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Processor Fees Retained
            </div>
            <div className="mt-1 text-xl font-bold font-mono text-foreground tracking-tight">
              <MoneyDisplay amount={totalFees} currency="USD" size="lg" />
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Interchange and platform fee deductions
            </div>
          </div>

          <div className="p-3.5 rounded border border-border bg-card">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Net Disbursed Payouts
            </div>
            <div className="mt-1 text-xl font-bold font-mono text-foreground tracking-tight">
              <MoneyDisplay amount={totalNet} currency="USD" size="lg" />
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {batches.length} total clearing batches
            </div>
          </div>
        </div>

        {/* DataTable */}
        <DataTable
          data={batches}
          columns={columns}
          keyExtractor={(b) => b.id}
          loading={loading}
          pageSize={15}
          emptyTitle="No settlement batches found"
          emptyDescription="There are no pending or closed settlement batches for this tenant."
        />
      </div>
    </DashboardLayout>
  );
}
