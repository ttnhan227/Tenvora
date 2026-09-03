import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRightLeft,
  RefreshCw,
  Eye,
  RotateCcw,
  Download,
  Filter,
  Search,
  Plus,
  ArrowUpDown,
  CheckCircle2,
  Calendar,
  X,
} from "lucide-react";
import {
  MoneyDisplay,
  StatusBadge,
  MonospaceId,
  DataTable,
  Column,
  FilterBar,
} from "@/components/design-system";
import { paymentService, Transaction } from "@/services/paymentService";
import { accountService, Account } from "@/services/accountService";

export default function TransactionsList() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  async function loadData() {
    setLoading(true);
    const filter = statusFilter === "ALL" ? undefined : statusFilter;
    const [txRes, accRes] = await Promise.all([
      paymentService.getTransactions(filter, 200),
      accountService.getAccounts(),
    ]);

    if (txRes.success && txRes.data) setTransactions(txRes.data);
    if (accRes.success && accRes.data) setAccounts(accRes.data);
    setLoading(false);
  }

  // Filtered dataset
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const q = searchQuery.toLowerCase();
      const matchQuery =
        tx.referenceNumber.toLowerCase().includes(q) ||
        tx.transactionType.toLowerCase().includes(q) ||
        (tx.description && tx.description.toLowerCase().includes(q)) ||
        tx.currency.toLowerCase().includes(q);

      const matchType = typeFilter === "ALL" || tx.transactionType === typeFilter;
      return matchQuery && matchType;
    });
  }, [transactions, searchQuery, typeFilter]);

  const handleExportCSV = () => {
    const dataToExport = selectedIds.length > 0
      ? filtered.filter((t) => selectedIds.includes(t.id))
      : filtered;

    const headers = ["Reference", "Type", "Status", "Amount", "Currency", "JournalEntries", "CreatedAt", "Description"];
    const rows = dataToExport.map((t) => [
      t.referenceNumber,
      t.transactionType,
      t.status,
      t.amount.toString(),
      t.currency,
      t.ledgerEntriesCount.toString(),
      t.createdAt,
      `"${(t.description || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tenvora-transactions-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusOptions = [
    { value: "ALL", label: "All Statuses", count: transactions.length },
    { value: "Posted", label: "Posted", count: transactions.filter((t) => t.status === "Posted").length },
    { value: "Settled", label: "Settled", count: transactions.filter((t) => t.status === "Settled").length },
    { value: "Pending", label: "Pending", count: transactions.filter((t) => t.status === "Pending").length },
    { value: "Reversed", label: "Reversed", count: transactions.filter((t) => t.status === "Reversed").length },
    { value: "Failed", label: "Failed", count: transactions.filter((t) => t.status === "Failed").length },
  ];

  const columns: Column<Transaction>[] = [
    {
      key: "referenceNumber",
      header: "Reference",
      sortable: true,
      render: (tx) => (
        <MonospaceId id={tx.referenceNumber} to={`/transactions/${tx.id}`} label="Transaction Reference" />
      ),
    },
    {
      key: "transactionType",
      header: "Type",
      sortable: true,
      render: (tx) => <span className="font-mono text-muted-foreground">{tx.transactionType}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortable: true,
      render: (tx) => (
        <MoneyDisplay amount={tx.amount} currency={tx.currency} size="xs" />
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      sortable: true,
      render: (tx) => <StatusBadge status={tx.status} size="sm" />,
    },
    {
      key: "ledgerEntriesCount",
      header: "Journal Lines",
      align: "center",
      sortable: true,
      render: (tx) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          <span className="px-1.5 py-0.2 rounded bg-muted font-bold text-foreground">{tx.ledgerEntriesCount}</span> lines
        </span>
      ),
    },
    {
      key: "description",
      header: "Memo / Description",
      render: (tx) => (
        <span className="text-muted-foreground truncate max-w-[200px] block" title={tx.description}>
          {tx.description || "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Timestamp (UTC)",
      align: "right",
      sortable: true,
      render: (tx) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (tx) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Link to={`/transactions/${tx.id}`}>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground">
              <Eye className="h-3 w-3 mr-1" />
              Detail
            </Button>
          </Link>
        </div>
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
              Transactions Journal
            </h1>
            <p className="text-xs text-muted-foreground">
              Immutable double-entry transaction records, audit references, and state transitions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground bg-card"
            >
              <Download className="h-3 w-3 mr-1.5" />
              Export CSV {selectedIds.length > 0 && `(${selectedIds.length})`}
            </Button>

            <Link to="/transfers">
              <Button size="sm" className="h-7 px-3 bg-[#635BFF] hover:bg-[#533AFD] text-white text-xs font-semibold rounded-md shadow-xs">
                <Plus className="h-3 w-3 mr-1" />
                New Transfer
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter Bar */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Filter by reference, type, currency, description..."
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          statusOptions={statusOptions}
          resultCount={filtered.length}
          totalCount={transactions.length}
        />

        {/* Dense Transactions Data Table */}
        <DataTable
          data={filtered}
          columns={columns}
          keyExtractor={(t) => t.id}
          loading={loading}
          pageSize={20}
          onRowClick={(tx) => navigate(`/transactions/${tx.id}`)}
          selectedIds={selectedIds}
          onToggleSelect={(id) => {
            setSelectedIds((prev) =>
              prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
            );
          }}
          onSelectAll={(all) => {
            setSelectedIds(all ? filtered.map((t) => t.id) : []);
          }}
          emptyTitle="No transactions match your query"
          emptyDescription="Try clearing filters or search terms to inspect other transaction records."
          emptyAction={
            <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setStatusFilter("ALL"); }} className="h-7 text-xs">
              Clear All Filters
            </Button>
          }
        />
      </div>
    </DashboardLayout>
  );
}
