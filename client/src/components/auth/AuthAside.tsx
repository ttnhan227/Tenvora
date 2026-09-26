import { Check, NotebookPen, ReceiptText, Search, Users } from "lucide-react";

export function AuthAside({ title = "Everything your notebook remembers—only easier to find." }: { title?: string }) {
  return <aside className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
    <div className="pointer-events-none absolute -right-20 -top-16 h-72 w-72 rounded-full border-[42px] border-white/5" />
    <div className="relative"><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold"><NotebookPen size={15} />Your digital business notebook</span><h2 className="display-type mt-6 max-w-md text-4xl font-bold leading-tight">{title}</h2><p className="mt-4 max-w-md text-primary-foreground/72">Made to feel familiar from the first sale, even if you have always managed your business on paper.</p></div>
    <div className="relative mt-12 space-y-3"><PreviewRow icon={ReceiptText} title="Record what happened" detail="Sales, payments, purchases, expenses" /><PreviewRow icon={Users} title="See who owes what" detail="Clear customer and supplier balances" /><PreviewRow icon={Search} title="Find it again" detail="Your records stay organized and searchable" /></div>
    <p className="relative mt-10 flex items-center gap-2 text-sm text-primary-foreground/75"><Check size={16} />Clear language. No accounting setup.</p>
  </aside>;
}

function PreviewRow({ icon: Icon, title, detail }: { icon: typeof ReceiptText; title: string; detail: string }) { return <div className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/12"><Icon size={19} /></span><div><p className="font-bold">{title}</p><p className="text-sm text-primary-foreground/68">{detail}</p></div></div>; }
