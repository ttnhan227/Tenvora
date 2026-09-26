import { Link } from "react-router-dom";
import { ArrowRight, BookOpenCheck, Check, PackageOpen, ReceiptText, Search, Users, WalletCards } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";

const capabilities = [
  { icon: ReceiptText, title: "Record a sale", body: "Choose the customer and product. Tenvora calculates the total and remembers what is still unpaid." },
  { icon: Users, title: "Know who owes you", body: "Open a customer and see every sale, payment, and current balance in one clear history." },
  { icon: PackageOpen, title: "Track what you buy", body: "Keep supplier purchases and payments together, without a separate book or spreadsheet." },
  { icon: WalletCards, title: "Remember every expense", body: "Quickly note rent, transport, supplies, and other everyday business costs." },
];

export default function Index() {
  return <div className="flex min-h-screen flex-col bg-background text-foreground"><Navbar /><main className="flex-1">
    <section className="relative overflow-hidden"><div className="pointer-events-none absolute -right-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-accent/55 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_.95fr] lg:py-28">
        <div>
          <span className="notebook-label"><BookOpenCheck className="mr-2 h-4 w-4" />A simpler way to keep business records</span>
          <h1 className="mt-6 text-5xl leading-[1.03] sm:text-6xl lg:text-7xl">Leave the notebooks behind. <span className="text-primary">Keep the clarity.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">Record sales, payments, purchases, customers, and expenses in a friendly workspace made for real small businesses—not accountants.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button asChild size="lg"><Link to="/register">Start your business notebook<ArrowRight /></Link></Button><Button asChild size="lg" variant="outline"><Link to="/login">I already use Tenvora</Link></Button></div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"><span className="flex items-center gap-2"><Check className="h-4 w-4 text-[hsl(var(--success))]" />No accounting jargon</span><span className="flex items-center gap-2"><Check className="h-4 w-4 text-[hsl(var(--success))]" />Works on phone or laptop</span></div>
        </div>
        <NotebookPreview />
      </div>
    </section>

    <section className="border-y bg-card/55"><div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="micro-label text-primary">One organized place</p><h2 className="display-type mt-3 text-3xl font-bold sm:text-4xl">Record it once. Find it when you need it.</h2><p className="mt-4 text-muted-foreground">No more checking three notebooks, adding totals by hand, or wondering whether someone has paid.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">{["Too many separate notebooks", "Hard to remember unpaid sales", "Manual totals and calculations", "Old records are difficult to find"].map((problem, i) => <div key={problem} className="paper-card flex items-center gap-3 p-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--warning)/.16)] text-sm font-bold text-amber-800">{i + 1}</span><p className="text-sm font-semibold">{problem}</p></div>)}</div></div>
    </div></section>

    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24"><div className="max-w-2xl"><p className="micro-label text-primary">Everyday tasks, made clear</p><h2 className="display-type mt-3 text-3xl font-bold sm:text-4xl">Your business record book, without the paperwork.</h2></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{capabilities.map((item, index) => <article key={item.title} className="paper-card group relative overflow-hidden p-5"><span className="absolute right-4 top-3 text-5xl font-bold text-border/45">{index + 1}</span><span className="relative flex h-11 w-11 items-center justify-center rounded-2xl border bg-accent/70 text-primary"><item.icon className="h-5 w-5" /></span><h3 className="relative mt-5 text-lg font-bold">{item.title}</h3><p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p></article>)}</div></section>

    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28"><div className="relative overflow-hidden rounded-[2rem] bg-primary px-6 py-12 text-primary-foreground sm:px-12 sm:py-16"><div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full border-[32px] border-white/5" /><div className="relative max-w-2xl"><p className="text-sm font-bold text-primary-foreground/75">Ready when you are</p><h2 className="display-type mt-3 text-3xl font-bold sm:text-4xl">Start with one sale. Tenvora will keep the rest organized.</h2><p className="mt-4 text-primary-foreground/75">A familiar, calm place for the records your business depends on.</p><Button asChild size="lg" className="mt-7 border-card bg-card text-foreground hover:bg-card/90"><Link to="/register">Create your workspace<ArrowRight /></Link></Button></div></div></section>
  </main><Footer /></div>;
}

function NotebookPreview() {
  return <div className="relative mx-auto w-full max-w-[31rem] p-3 sm:p-7" aria-label="Illustration of an organized Tenvora business record">
    <div className="absolute left-0 top-20 h-36 w-36 rounded-full bg-[hsl(var(--warning)/.25)] blur-2xl" />
    <div className="paper-card relative rotate-[1.5deg] overflow-hidden p-5 sm:p-7"><div className="absolute inset-y-0 left-10 w-px bg-destructive/15" /><div className="paper-lines absolute inset-x-0 top-24 bottom-0 opacity-55" />
      <div className="relative flex items-center justify-between border-b pb-4"><div><p className="micro-label text-primary">Today's business</p><p className="mt-1 text-sm text-muted-foreground">Friday, 26 September</p></div><span className="rounded-full bg-[hsl(var(--success)/.1)] px-3 py-1 text-xs font-bold text-[hsl(var(--success))]">All saved</span></div>
      <div className="relative mt-5 rounded-2xl bg-accent/70 p-5"><p className="text-sm font-bold text-foreground/70">Sales today</p><p className="mt-2 text-3xl font-bold">₫4,250,000</p><p className="mt-1 text-xs text-muted-foreground">₫2,100,000 received</p></div>
      <div className="relative mt-4 space-y-3"><RecordRow name="Anh Nam" label="Sale · 15 kg" amount="₫2.7M" color="bg-[hsl(var(--warning))]" /><RecordRow name="Chị Hoa" label="Payment received" amount="₫500K" color="bg-[hsl(var(--success))]" /><RecordRow name="Market supplier" label="Purchase · rice bags" amount="₫1.2M" color="bg-primary" /></div>
    </div>
    <div className="paper-card absolute -bottom-2 -right-1 flex -rotate-3 items-center gap-3 px-4 py-3 sm:right-0"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--warning)/.18)]"><Search className="h-4 w-4 text-amber-800" /></span><div><p className="text-xs text-muted-foreground">Find any record</p><p className="text-sm font-bold">in a few seconds</p></div></div>
  </div>;
}

function RecordRow({ name, label, amount, color }: { name: string; label: string; amount: string; color: string }) {
  return <div className="flex items-center gap-3 rounded-xl bg-card/85 px-3 py-2.5"><span className={`h-2.5 w-2.5 rounded-full ${color}`} /><div className="min-w-0 flex-1"><p className="text-sm font-bold">{name}</p><p className="text-xs text-muted-foreground">{label}</p></div><p className="tabular-nums text-sm font-bold">{amount}</p></div>;
}
