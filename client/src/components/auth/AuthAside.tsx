import { Check, NotebookPen, ReceiptText, Search, Users } from "lucide-react";

export function AuthAside({ title = "Everything your notebook remembers—only easier to find." }: { title?: string }) {
  return <aside className="relative hidden overflow-hidden border-r border-white/15 bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
    <div className="relative"><span className="inline-flex items-center gap-2 border-b border-white/30 pb-1 text-xs font-bold uppercase tracking-wider text-primary-foreground/85"><NotebookPen size={14} />Your digital business notebook</span><h2 className="display-type mt-6 max-w-md text-4xl font-bold leading-tight">{title}</h2><p className="mt-4 max-w-md text-primary-foreground/75">Made to feel familiar from the first sale, even if you have always managed your business on paper.</p></div>
    <div className="relative mt-10 divide-y divide-white/15 border-y border-white/15"><PreviewRow index="01" icon={ReceiptText} title="Record what happened" detail="Sales, payments, purchases, expenses" /><PreviewRow index="02" icon={Users} title="See who owes what" detail="Clear customer and supplier balances" /><PreviewRow index="03" icon={Search} title="Find it again" detail="Your records stay organized and searchable" /></div>
    <p className="relative mt-10 flex items-center gap-2 text-sm text-primary-foreground/80"><Check size={16} />Clear language. No accounting setup.</p>
  </aside>;
}

function PreviewRow({ index, icon: Icon, title, detail }: { index: string; icon: typeof ReceiptText; title: string; detail: string }) { return <div className="flex items-center gap-4 py-4"><span className="font-mono text-xs font-bold text-primary-foreground/55">{index}</span><span className="flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-white/10"><Icon size={17} /></span><div><p className="font-bold">{title}</p><p className="text-sm text-primary-foreground/72">{detail}</p></div></div>; }
