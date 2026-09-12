import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { workspaceNav } from "@/components/WorkspaceNav";
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (value: boolean) => void; onAction?: (name: string) => void }) {
 const [query, setQuery] = useState(""); const navigate = useNavigate();
 useEffect(() => { const handle = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); onOpenChange(!open); } }; window.addEventListener("keydown", handle); return () => window.removeEventListener("keydown", handle); }, [open, onOpenChange]);
 const items = workspaceNav.filter(i => i.label.toLowerCase().includes(query.toLowerCase()));
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogTitle>Quick Search</DialogTitle><DialogDescription>Jump to invoices, clients, income, taxes, assistant, or settings.</DialogDescription><Input aria-label="Find a page" value={query} onChange={e => setQuery(e.target.value)} placeholder="Invoices, clients, income, tax estimate..." />{items.map(i => <button key={i.href} className="flex items-center gap-3 rounded p-2 text-left hover:bg-muted font-medium text-sm text-foreground" onClick={() => { navigate(i.href); onOpenChange(false); setQuery(""); }}><i.icon size={18} className="text-primary" />{i.label}</button>)}{!items.length && <p className="text-xs text-muted-foreground py-2">No matching pages.</p>}</DialogContent></Dialog>;
}
