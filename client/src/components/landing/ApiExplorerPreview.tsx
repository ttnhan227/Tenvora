import { useState } from "react";
import { Code2, Copy, Check, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

const CODE_EXAMPLES = {
  curl: `curl -X POST https://api.tenvora.io/api/payments/transfers \\
  -H "Authorization: Bearer \${TENVORA_API_KEY}" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: idem-tx-948201a" \\
  -d '{
    "sourceAccountId": "77777777-7777-7777-7777-777777777777",
    "destinationAccountId": "88888888-8888-8888-8888-888888888888",
    "amount": 25000.00,
    "currency": "USD",
    "purpose": "Wholesale Supplier Batch Payout"
  }'`,

  csharp: `using Tenvora.Api.Client;

var client = new TenvoraClient("tenvora-live-api-key-xxx");

var transfer = await client.Payments.CreateTransferAsync(new TransferRequest
{
    SourceAccountId = Guid.Parse("77777777-7777-7777-7777-777777777777"),
    DestinationAccountId = Guid.Parse("88888888-8888-8888-8888-888888888888"),
    Amount = 25_000.00m,
    Currency = "USD",
    Purpose = "Wholesale Supplier Batch Payout",
    IdempotencyKey = "idem-tx-948201a"
});

Console.WriteLine($"Status: {transfer.Status} | Invariant: {transfer.IsBalanced}");`,

  typescript: `import { Tenvora } from "@tenvora/sdk";

const tenvora = new Tenvora({ apiKey: process.env.TENVORA_API_KEY });

const transfer = await tenvora.payments.transfer({
  sourceAccountId: "77777777-7777-7777-7777-777777777777",
  destinationAccountId: "88888888-8888-8888-8888-888888888888",
  amount: 25000.00,
  currency: "USD",
  purpose: "Wholesale Supplier Batch Payout",
  idempotencyKey: "idem-tx-948201a",
});

console.log("Journal Lines:", transfer.journalEntries);`,
};

export default function ApiExplorerPreview() {
  const [activeLang, setActiveLang] = useState<"curl" | "csharp" | "typescript">("curl");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(CODE_EXAMPLES[activeLang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="api" className="py-24 border-t border-border/60 bg-background relative">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold">
            <Code2 className="h-3.5 w-3.5" />
            DEVELOPER API &amp; WEBHOOKS
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Simple, Idempotent REST &amp; GraphQL APIs
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Integrate double-entry payments into your core applications in minutes with deterministic idempotency keys and typed SDKs.
          </p>
        </div>

        {/* Code Snippet Box */}
        <div className="max-w-4xl mx-auto rounded-2xl border border-border bg-slate-950 overflow-hidden shadow-2xl">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <div className="flex items-center gap-1">
                {(["curl", "csharp", "typescript"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveLang(lang)}
                    className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-colors ${
                      activeLang === lang
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {lang === "csharp" ? "C# (.NET 10)" : lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="h-8 px-2.5 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800 gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied!" : "Copy Code"}</span>
            </Button>
          </div>

          {/* Code Body */}
          <div className="p-5 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed bg-slate-950">
            <pre>
              <code>{CODE_EXAMPLES[activeLang]}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
