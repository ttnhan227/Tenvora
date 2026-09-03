import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

const FAQS = [
  {
    q: "How does Tenvora enforce the double-entry accounting invariant?",
    a: "Every transaction generates balanced LedgerEntry records where sum(debits) = sum(credits) = transaction amount. Balances are never modified directly in place; instead, balance updates and reversals are achieved solely by appending new balanced journal entries into the database.",
  },
  {
    q: "How does PostgreSQL Row-Level Security (RLS) protect multi-tenant data?",
    a: "Tenvora sets the session context parameter 'app.current_tenant_id' inside the database connection upon every API request. PostgreSQL native RLS policies ensure that SELECT, INSERT, UPDATE, and DELETE commands are mathematically restricted to that specific tenant at the database kernel level.",
  },
  {
    q: "How does Tenvora prevent race conditions and concurrent transfer deadlocks?",
    a: "When transferring money between multiple accounts, TransferService deterministically sorts the account IDs in ascending order before executing SELECT ... FOR UPDATE pessimistic row locks inside an atomic transaction. This guarantees that concurrent transfers lock resources in the exact same sequence, eliminating AB-BA lock inversion deadlocks.",
  },
  {
    q: "What currencies and settlement clearing schedules are supported?",
    a: "Tenvora natively supports USD, EUR, GBP, and SGD with 4 decimal digits of precision (numeric 18,4). The SettlementEngine supports daily, hourly, or on-demand batch aggregations with configurable processor interchange and network fee schedules.",
  },
  {
    q: "What role does AI play in Tenvora?",
    a: "Tenvora features a decoupled Operations Assistant that is strictly read-only. It assists operators by querying reconciliation discrepancies, explaining ledger postings, and summarizing settlement batches. It has zero code authority to approve payments, initiate transfers, or mutate accounts.",
  },
];

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section className="py-24 border-t border-border/60 bg-background relative">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center space-y-4 mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold">
            <HelpCircle className="h-3.5 w-3.5" />
            FREQUENTLY ASKED QUESTIONS
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Technical Architecture &amp; Guarantees
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Everything you need to know about Tenvora's ledger engine, concurrency controls, and security model.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm transition-all"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between p-5 text-left text-sm font-bold text-foreground hover:text-emerald-600 transition-colors gap-4"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-emerald-500" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-muted-foreground leading-relaxed border-t border-border/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
