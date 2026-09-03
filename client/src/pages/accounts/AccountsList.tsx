import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Wallet,
  Users,
  Plus,
  ArrowUpRight,
  RefreshCw,
  Building2,
  ChevronRight,
  Lock,
} from "lucide-react";
import {
  MoneyDisplay,
  StatusBadge,
  MonospaceId,
  DataTable,
  Column,
  FilterBar,
} from "@/components/design-system";
import { accountService, Account, Customer } from "@/services/accountService";

export default function AccountsList() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  // New Account Dialog State
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState("Asset");
  const [currency, setCurrency] = useState("USD");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>();
  const [initialDeposit, setInitialDeposit] = useState("0");
  const [creatingAccount, setCreatingAccount] = useState(false);

  // New Customer Dialog State
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerRef, setCustomerRef] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [accRes, custRes] = await Promise.all([
      accountService.getAccounts(),
      accountService.getCustomers(),
    ]);

    if (accRes.success && accRes.data) setAccounts(accRes.data);
    if (custRes.success && custRes.data) setCustomers(custRes.data);
    setLoading(false);
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!accountNumber) return;
    setCreatingAccount(true);
    const result = await accountService.createAccount({
      accountNumber,
      accountType,
      currency,
      customerId: (selectedCustomerId && selectedCustomerId !== "none") ? selectedCustomerId : undefined,
      initialDeposit: parseFloat(initialDeposit) || 0,
    });
    setCreatingAccount(false);
    if (result.success) {
      setAccountDialogOpen(false);
      setAccountNumber("");
      setInitialDeposit("0");
      loadData();
    }
  }

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName) return;
    setCreatingCustomer(true);
    const result = await accountService.createCustomer({
      name: customerName,
      externalReference: customerRef || undefined,
      email: customerEmail || undefined,
    });
    setCreatingCustomer(false);
    if (result.success) {
      setCustomerDialogOpen(false);
      setCustomerName("");
      setCustomerRef("");
      setCustomerEmail("");
      loadData();
    }
  }

  // Aggregate Metrics
  const totalAssets = accounts
    .filter((a) => a.accountType === "Asset")
    .reduce((sum, a) => sum + a.cachedBalance, 0);

  const totalLiabilities = accounts
    .filter((a) => a.accountType === "Liability")
    .reduce((sum, a) => sum + a.cachedBalance, 0);

  const totalEquity = accounts
    .filter((a) => a.accountType === "Equity")
    .reduce((sum, a) => sum + a.cachedBalance, 0);

  // Filter Logic
  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      const matchesType = typeFilter === "ALL" || a.accountType === typeFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        a.accountNumber.toLowerCase().includes(q) ||
        a.accountType.toLowerCase().includes(q) ||
        a.currency.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [accounts, typeFilter, search]);

  const typeOptions = [
    { value: "ALL", label: "All Account Types", count: accounts.length },
    { value: "Asset", label: "Asset (Operating)", count: accounts.filter((a) => a.accountType === "Asset").length },
    { value: "Liability", label: "Liability (Customer)", count: accounts.filter((a) => a.accountType === "Liability").length },
    { value: "Equity", label: "Equity (Capital)", count: accounts.filter((a) => a.accountType === "Equity").length },
    { value: "Revenue", label: "Revenue", count: accounts.filter((a) => a.accountType === "Revenue").length },
  ];

  const columns: Column<Account>[] = [
    {
      key: "accountNumber",
      header: "Account Number",
      sortable: true,
      render: (acc) => (
        <MonospaceId id={acc.accountNumber} to={`/ledger?account=${acc.id}`} label="Account Number" />
      ),
    },
    {
      key: "accountType",
      header: "Type",
      sortable: true,
      render: (acc) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
          {acc.accountType}
        </span>
      ),
    },
    {
      key: "currency",
      header: "Currency",
      align: "center",
      sortable: true,
      render: (acc) => <span className="font-mono text-muted-foreground">{acc.currency}</span>,
    },
    {
      key: "cachedBalance",
      header: "Balance",
      align: "right",
      sortable: true,
      render: (acc) => <MoneyDisplay amount={acc.cachedBalance} currency={acc.currency} size="xs" />,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      sortable: true,
      render: (acc) => <StatusBadge status={acc.status} size="sm" showIcon={false} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (acc) => (
        <Link
          to={`/ledger?account=${acc.id}`}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline inline-flex items-center gap-1 font-mono"
        >
          <span>Ledger</span>
          <ArrowUpRight className="h-3 w-3" />
        </Link>
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
              Accounts &amp; Customer Entities
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage multi-currency ledger accounts, customer entity associations, and isolated liquidity pools.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Create Customer Dialog */}
            <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground bg-card">
                  <Users className="h-3 w-3 mr-1.5" />
                  New Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[420px] bg-card border border-border text-xs rounded-lg p-5">
                <form onSubmit={handleCreateCustomer} className="space-y-3.5">
                  <DialogHeader className="space-y-1">
                    <DialogTitle className="text-sm font-bold flex items-center gap-2">
                      <Users className="h-4 w-4 text-foreground" />
                      Register Customer Entity
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Creates an external enterprise merchant or counterparty entity in this tenant.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-1">
                    <Label htmlFor="custName" className="text-[11px] font-semibold text-muted-foreground">
                      Organization Name
                    </Label>
                    <Input
                      id="custName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Acme Global Payments LLC"
                      required
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="custRef" className="text-[11px] font-semibold text-muted-foreground">
                      External Reference
                    </Label>
                    <Input
                      id="custRef"
                      value={customerRef}
                      onChange={(e) => setCustomerRef(e.target.value)}
                      placeholder="EXT-ACME-001"
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="custEmail" className="text-[11px] font-semibold text-muted-foreground">
                      Operations Email
                    </Label>
                    <Input
                      id="custEmail"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="ops@acme.com"
                      className="h-8 text-xs"
                    />
                  </div>

                  <DialogFooter className="pt-2">
                    <Button
                      type="submit"
                      disabled={creatingCustomer}
                      className="h-8 px-4 bg-[#635BFF] hover:bg-[#533AFD] text-white text-xs font-semibold rounded-md shadow-xs"
                    >
                      {creatingCustomer ? "Registering..." : "Create Customer"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Create Account Dialog */}
            <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-7 px-3 bg-[#635BFF] hover:bg-[#533AFD] text-white text-xs font-semibold rounded-md shadow-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Open Account
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[440px] bg-card border border-border text-xs rounded-lg p-5">
                <form onSubmit={handleCreateAccount} className="space-y-3.5">
                  <DialogHeader className="space-y-1">
                    <DialogTitle className="text-sm font-bold flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-foreground" />
                      Open Double-Entry Account
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Creates a new asset, liability, equity, or fee ledger account with initial journal balance.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-1">
                    <Label htmlFor="accNum" className="text-[11px] font-semibold text-muted-foreground">
                      Account Identifier
                    </Label>
                    <Input
                      id="accNum"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="ACC-VENDOR-001"
                      required
                      className="h-8 text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="accType" className="text-[11px] font-semibold text-muted-foreground">
                        Account Type
                      </Label>
                      <Select value={accountType} onValueChange={setAccountType}>
                        <SelectTrigger className="h-8 text-xs font-mono">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asset" className="text-xs font-mono">Asset (Operating)</SelectItem>
                          <SelectItem value="Liability" className="text-xs font-mono">Liability (Customer)</SelectItem>
                          <SelectItem value="Equity" className="text-xs font-mono">Equity (Capital)</SelectItem>
                          <SelectItem value="Revenue" className="text-xs font-mono">Revenue</SelectItem>
                          <SelectItem value="Expense" className="text-xs font-mono">Expense</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="curr" className="text-[11px] font-semibold text-muted-foreground">
                        Currency (ISO-4217)
                      </Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger className="h-8 text-xs font-mono">
                          <SelectValue placeholder="Currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD" className="text-xs font-mono">USD</SelectItem>
                          <SelectItem value="EUR" className="text-xs font-mono">EUR</SelectItem>
                          <SelectItem value="GBP" className="text-xs font-mono">GBP</SelectItem>
                          <SelectItem value="SGD" className="text-xs font-mono">SGD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="cust" className="text-[11px] font-semibold text-muted-foreground">
                      Assign to Customer (Optional)
                    </Label>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger className="h-8 text-xs font-mono">
                        <SelectValue placeholder="Internal Organization" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs font-mono">-- Internal Organization --</SelectItem>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-xs font-mono">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="deposit" className="text-[11px] font-semibold text-muted-foreground">
                      Initial Capital Deposit ($)
                    </Label>
                    <Input
                      id="deposit"
                      type="number"
                      min="0"
                      step="0.01"
                      value={initialDeposit}
                      onChange={(e) => setInitialDeposit(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <DialogFooter className="pt-2">
                    <Button
                      type="submit"
                      disabled={creatingAccount}
                      className="h-8 px-4 bg-[#635BFF] hover:bg-[#533AFD] text-white text-xs font-semibold rounded-md shadow-xs"
                    >
                      {creatingAccount ? "Opening..." : "Commit Account"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Aggregate Balance Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded border border-border bg-card">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Operating Assets
            </div>
            <div className="mt-1 text-xl font-bold font-mono text-foreground tracking-tight">
              <MoneyDisplay amount={totalAssets} currency="USD" size="lg" />
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Cash and treasury reserves
            </div>
          </div>

          <div className="p-3.5 rounded border border-border bg-card">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Customer Liabilities
            </div>
            <div className="mt-1 text-xl font-bold font-mono text-foreground tracking-tight">
              <MoneyDisplay amount={totalLiabilities} currency="USD" size="lg" />
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Merchant and wallet balances
            </div>
          </div>

          <div className="p-3.5 rounded border border-border bg-card">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
              Capital Equity
            </div>
            <div className="mt-1 text-xl font-bold font-mono text-foreground tracking-tight">
              <MoneyDisplay amount={totalEquity} currency="USD" size="lg" />
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {customers.length} registered customer counterparties
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <FilterBar
          searchQuery={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search accounts by identifier, type, or currency..."
          statusFilter={typeFilter}
          onStatusChange={setTypeFilter}
          statusOptions={typeOptions}
          resultCount={filteredAccounts.length}
          totalCount={accounts.length}
        />

        {/* Accounts DataTable */}
        <DataTable
          data={filteredAccounts}
          columns={columns}
          keyExtractor={(a) => a.id}
          loading={loading}
          pageSize={15}
          emptyTitle="No accounts match criteria"
          emptyDescription="There are no accounts matching the specified filters."
        />
      </div>
    </DashboardLayout>
  );
}
