import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowRight, CircleDollarSign, PackageOpen, Plus, Receipt, ReceiptText, ShoppingBasket, Users, WalletCards } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, LoadingState, MoneyCard, PageHeader } from "@/components/business/BusinessUI";
import { Button } from "@/components/ui/button";
import { businessMoney, businessService } from "@/services/businessService";
import { useAuth } from "@/contexts/AuthContext";

export default function BusinessHome() {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ["business-dashboard"], queryFn: businessService.getDashboard });
  const data = query.data;
  const currency = data?.currency ?? user?.preferredCurrency ?? "USD";
  const firstName = user?.email?.split("@")[0]?.split(/[._-]/)[0];

  return <DashboardLayout><div className="space-y-7">
    <PageHeader eyebrow="Today at a glance" title={`Good ${greeting()}, ${capitalize(firstName) || "there"}`} description={`Here’s what is happening at ${user?.companyName || "your business"} today.`} actions={<><Button asChild variant="outline"><Link to="/expenses?create=1"><Receipt />Add expense</Link></Button><Button asChild><Link to="/sales?create=1"><Plus />New sale</Link></Button></>} />

    {query.isLoading ? <LoadingState label="Opening today's business…" /> : query.isError ? <section role="alert" className="paper-card border-destructive/25 p-6"><h2 className="font-bold">We couldn’t open today’s records.</h2><p className="mt-1 text-sm text-muted-foreground">Your data is safe. Check the connection and try again.</p><Button className="mt-4" variant="outline" onClick={() => query.refetch()}>Try again</Button></section> : data && <>
      <section aria-label="Today's totals" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MoneyCard featured label="Sales today" value={businessMoney(data.todaySales, currency)} detail={`${businessMoney(data.todayPayments, currency)} received from customers`} icon={ReceiptText} tone="good" />
        <MoneyCard label="Money received" value={businessMoney(data.todayPayments, currency)} detail="Payments collected today" icon={ArrowDownToLine} tone="good" />
        <MoneyCard label="Customer balances" value={businessMoney(data.outstandingCustomers, currency)} detail="Still to collect from unpaid sales" icon={Users} tone={data.outstandingCustomers > 0 ? "attention" : "plain"} />
        <MoneyCard label="Spent today" value={businessMoney(data.todaySupplierPayments + data.todayExpenses, currency)} detail="Supplier payments and expenses" icon={WalletCards} tone="out" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <div className="paper-card overflow-hidden"><div className="flex items-center justify-between border-b px-5 py-4 sm:px-6"><div><h2 className="text-lg font-bold">Recent activity</h2><p className="text-sm text-muted-foreground">Your latest business records</p></div></div>
          {data.recentActivity.length === 0 ? <div className="p-5"><EmptyState compact icon={ShoppingBasket} title="No activity yet today" description="Record a sale, purchase, or expense and it will appear here." action={<Button asChild><Link to="/sales?create=1">Record first sale</Link></Button>} /></div> : <div className="divide-y">{data.recentActivity.map((activity) => <div key={`${activity.type}-${activity.id}`} className="flex items-center gap-4 px-5 py-4 sm:px-6"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">{activityIcon(activity.type)}</span><div className="min-w-0 flex-1"><p className="truncate font-bold">{activity.title}</p><p className="truncate text-sm text-muted-foreground">{friendlyType(activity.type)} · {activity.detail}</p></div><div className="text-right"><p className="tabular-nums font-bold">{businessMoney(activity.amount, currency)}</p><p className="text-xs text-muted-foreground">{friendlyDate(activity.occurredAt)}</p></div></div>)}</div>}
        </div>

        <div className="space-y-4"><div className="paper-card p-5 sm:p-6"><h2 className="text-lg font-bold">Quick actions</h2><p className="mt-1 text-sm text-muted-foreground">What happened in the business?</p><div className="mt-4 grid gap-2"><QuickLink to="/sales?create=1" icon={ReceiptText} label="Record a new sale" /><QuickLink to="/customers" icon={Users} label="Find a customer" /><QuickLink to="/purchases" icon={PackageOpen} label="Record a purchase" /><QuickLink to="/expenses?create=1" icon={Receipt} label="Add an expense" /></div></div>
          <div className="paper-card bg-[hsl(var(--warning)/.1)] p-5 sm:p-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-card text-amber-800"><CircleDollarSign size={19} /></span><div><p className="text-sm font-bold">You owe suppliers</p><p className="tabular-nums text-xl font-bold">{businessMoney(data.outstandingSuppliers, currency)}</p></div></div><Button asChild variant="ghost" className="mt-3 w-full justify-between"><Link to="/suppliers">See supplier balances<ArrowRight /></Link></Button></div>
        </div>
      </section>

      {data.unpaidCustomers.length > 0 && <section><div className="mb-3 flex items-end justify-between"><div><h2 className="text-lg font-bold">Customers to follow up</h2><p className="text-sm text-muted-foreground">People with an unpaid balance</p></div><Button asChild variant="ghost" size="sm"><Link to="/customers">View all</Link></Button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.unpaidCustomers.slice(0, 6).map((customer) => <Link key={customer.id} to={`/customers/${customer.id}`} className="paper-card friendly-focus flex items-center justify-between gap-3 p-4 transition-colors hover:border-primary/35 hover:bg-accent/20"><div className="min-w-0"><p className="truncate font-bold">{customer.name}</p><p className="text-xs text-muted-foreground">{customer.salesCount} sale{customer.salesCount === 1 ? "" : "s"}</p></div><p className="tabular-nums font-bold text-amber-800 dark:text-amber-300">{businessMoney(customer.outstandingBalance, customer.currency)}</p></Link>)}</div></section>}
    </>}
  </div></DashboardLayout>;
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: typeof ReceiptText; label: string }) { return <Link to={to} className="friendly-focus flex min-h-12 items-center gap-3 rounded-xl border bg-card px-3.5 text-sm font-bold transition-colors hover:border-primary/35 hover:bg-accent/35"><Icon className="h-4 w-4 text-primary" /><span className="flex-1">{label}</span><ArrowRight className="h-4 w-4 text-muted-foreground" /></Link>; }
function greeting() { const hour = new Date().getHours(); return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"; }
function capitalize(value?: string) { return value ? value.charAt(0).toUpperCase() + value.slice(1) : ""; }
function friendlyDate(value: string) { const date = new Date(value); return date.toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
function friendlyType(type: string) { return type.replace(/([a-z])([A-Z])/g, "$1 $2"); }
function activityIcon(type: string) { const normalized = type.toLowerCase(); if (normalized.includes("sale")) return <ReceiptText size={18} />; if (normalized.includes("purchase")) return <PackageOpen size={18} />; if (normalized.includes("expense")) return <Receipt size={18} />; return <WalletCards size={18} />; }
