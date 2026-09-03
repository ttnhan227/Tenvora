import React, { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { 
  Code2, 
  Terminal, 
  BookOpen, 
  ShieldCheck, 
  Layers, 
  Copy, 
  Check, 
  ArrowRight,
  ExternalLink,
  Cpu,
  Key
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Documentation() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copyCode(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  const curlExample = `curl -X POST https://api.tenvora.io/api/payments/transfers \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Idempotency-Key: idem_pay_90a8f12c3" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sourceAccountId": "88888888-8888-8888-8888-888888888888",
    "destinationAccountId": "99999999-9999-9999-9999-999999999999",
    "amount": 25000.00,
    "currency": "USD",
    "purpose": "Wholesale Inventory Clearing"
  }'`;

  const tsExample = `import { Tenvora } from "@tenvora/sdk";

const client = new Tenvora({
  apiKey: process.env.TENVORA_API_KEY,
  environment: "production"
});

// Execute atomic transfer with automatic idempotency handling
const transfer = await client.payments.executeTransfer({
  idempotencyKey: "idem_pay_90a8f12c3",
  sourceAccountId: "88888888-8888-8888-8888-888888888888",
  destinationAccountId: "99999999-9999-9999-9999-999999999999",
  amount: 25000.00,
  currency: "USD",
  purpose: "Wholesale Inventory Clearing"
});

console.log(\`Posted Tx: \${transfer.referenceNumber}\`);`;

  const csharpExample = `using Tenvora.Api.Client;

var client = new TenvoraClient("YOUR_API_KEY");

var response = await client.Payments.ExecuteTransferAsync(
    idempotencyKey: "idem_pay_90a8f12c3",
    new CreateTransferRequest(
        SourceAccountId: Guid.Parse("88888888-8888-8888-8888-888888888888"),
        DestinationAccountId: Guid.Parse("99999999-9999-9999-9999-999999999999"),
        Amount: 25000.00m,
        Currency: "USD",
        Purpose: "Wholesale Inventory Clearing"
    )
);`;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-24 pb-24">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header */}
          <div className="py-10 border-b border-border/80 space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold">
              <Code2 className="h-3.5 w-3.5" />
              DEVELOPER DOCUMENTATION &amp; API SPECIFICATION
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              Build with the Tenvora PayOps Engine
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Integrate atomic double-entry payment transfers, continuous ledger reconciliation, and automated settlement batches into your core financial stack.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 pt-10">
            {/* Sidebar Navigation */}
            <aside className="lg:col-span-1 space-y-6">
              <div className="sticky top-24 space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Getting Started</h4>
                  <ul className="space-y-1 text-xs">
                    <li><a href="#quickstart" className="text-emerald-600 dark:text-emerald-400 font-semibold block py-1">Quickstart &amp; Auth</a></li>
                    <li><a href="#invariants" className="text-muted-foreground hover:text-foreground block py-1">Ledger Invariants</a></li>
                    <li><a href="#idempotency" className="text-muted-foreground hover:text-foreground block py-1">Idempotency Model</a></li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Core API Reference</h4>
                  <ul className="space-y-1 text-xs">
                    <li><a href="#transfers-api" className="text-muted-foreground hover:text-foreground block py-1">Transfers API (`/api/payments/transfers`)</a></li>
                    <li><a href="#ledger-api" className="text-muted-foreground hover:text-foreground block py-1">Ledger API (`/api/ledger`)</a></li>
                    <li><a href="#recon-api" className="text-muted-foreground hover:text-foreground block py-1">Reconciliation (`/api/reconciliation`)</a></li>
                    <li><a href="#settlement-api" className="text-muted-foreground hover:text-foreground block py-1">Settlements (`/api/settlements`)</a></li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Key className="h-4 w-4 text-emerald-500" />
                    Interactive Swagger UI
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Explore live schema models, test API keys, and generate code directly from OpenAPI 3.0.
                  </p>
                  <a
                    href="http://localhost:8080/swagger"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline pt-1"
                  >
                    Open Swagger Console <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </aside>

            {/* Main Documentation Body */}
            <div className="lg:col-span-3 space-y-12 text-sm leading-relaxed">
              {/* Quickstart Section */}
              <section id="quickstart" className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground border-b border-border/60 pb-2">
                  1. Quickstart &amp; Authentication
                </h2>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  All requests to the Tenvora API require a JSON Web Token (JWT) or an organization API Key passed via the <code className="text-emerald-600 font-mono">Authorization: Bearer YOUR_API_KEY</code> header. Requests are scoped dynamically to the authenticated tenant via PostgreSQL Row-Level Security.
                </p>

                <Tabs defaultValue="curl" className="w-full">
                  <div className="flex items-center justify-between pb-2">
                    <TabsList className="h-8">
                      <TabsTrigger value="curl" className="text-xs">cURL</TabsTrigger>
                      <TabsTrigger value="ts" className="text-xs">TypeScript / Node</TabsTrigger>
                      <TabsTrigger value="csharp" className="text-xs">C# .NET</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="curl" className="relative mt-0">
                    <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto border border-border">
                      {curlExample}
                    </pre>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-3 right-3 text-slate-400 hover:text-white h-7 w-7"
                      onClick={() => copyCode("curl", curlExample)}
                    >
                      {copiedKey === "curl" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </TabsContent>

                  <TabsContent value="ts" className="relative mt-0">
                    <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto border border-border">
                      {tsExample}
                    </pre>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-3 right-3 text-slate-400 hover:text-white h-7 w-7"
                      onClick={() => copyCode("ts", tsExample)}
                    >
                      {copiedKey === "ts" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </TabsContent>

                  <TabsContent value="csharp" className="relative mt-0">
                    <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto border border-border">
                      {csharpExample}
                    </pre>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-3 right-3 text-slate-400 hover:text-white h-7 w-7"
                      onClick={() => copyCode("csharp", csharpExample)}
                    >
                      {copiedKey === "csharp" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </TabsContent>
                </Tabs>
              </section>

              {/* Idempotency Section */}
              <section id="idempotency" className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground border-b border-border/60 pb-2">
                  2. Strict Cryptographic Idempotency
                </h2>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  To prevent duplicate debits under transient network disconnects or client retries, every payment operation enforces an <code className="text-emerald-600 font-mono">Idempotency-Key</code> header.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <Card className="border border-border/80 bg-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-bold">First Request (Key A)</CardTitle>
                      <CardDescription className="text-[11px]">Initial payload execution</CardDescription>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                      Acquires ascending row locks, computes cryptographic payload hash, posts immutable debit/credit entries, and stores the serialised 200 OK response.
                    </CardContent>
                  </Card>

                  <Card className="border border-border/80 bg-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-bold">Subsequent Retry (Key A)</CardTitle>
                      <CardDescription className="text-[11px]">Instant cached replay</CardDescription>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                      Bypasses transaction execution and immediately returns the stored 200 OK payload without mutating account balances a second time.
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Endpoints Table */}
              <section id="transfers-api" className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground border-b border-border/60 pb-2">
                  3. Key REST API Endpoints
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-border rounded-xl">
                    <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px]">
                      <tr className="border-b border-border">
                        <th className="p-3">Method</th>
                        <th className="p-3">Endpoint</th>
                        <th className="p-3">Role Required</th>
                        <th className="p-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 font-mono">
                      <tr>
                        <td className="p-3 font-bold text-emerald-600">POST</td>
                        <td className="p-3 text-foreground">/api/payments/transfers</td>
                        <td className="p-3 text-muted-foreground">OperationsManager+</td>
                        <td className="p-3 font-sans text-muted-foreground">Executes atomic balanced transfer</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-amber-600">POST</td>
                        <td className="p-3 text-foreground">/api/payments/transactions/:id/reverse</td>
                        <td className="p-3 text-muted-foreground">OperationsManager+</td>
                        <td className="p-3 font-sans text-muted-foreground">Creates compensating journal line</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-blue-600">GET</td>
                        <td className="p-3 text-foreground">/api/ledger/accounts/:id/history</td>
                        <td className="p-3 text-muted-foreground">Viewer+</td>
                        <td className="p-3 font-sans text-muted-foreground">Returns derived vs cached balance audit</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-emerald-600">POST</td>
                        <td className="p-3 text-foreground">/api/reconciliation/run</td>
                        <td className="p-3 text-muted-foreground">ComplianceOfficer+</td>
                        <td className="p-3 font-sans text-muted-foreground">Triggers continuous invariant scanner</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-bold text-purple-600">POST</td>
                        <td className="p-3 text-foreground">/api/settlements/batches</td>
                        <td className="p-3 text-muted-foreground">OperationsManager+</td>
                        <td className="p-3 font-sans text-muted-foreground">Generates net clearing batch manifest</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Visual Architecture Blueprint */}
              <section className="space-y-4 pt-4">
                <h2 className="text-2xl font-bold text-foreground border-b border-border/60 pb-2">
                  4. Architectural Blueprint &amp; Invariant Engine
                </h2>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  The visual topology below illustrates the physical lifecycle of an atomic transaction through the PostgreSQL RLS storage engine.
                </p>
                <div className="rounded-2xl overflow-hidden border border-border shadow-xl bg-slate-950">
                  <img
                    src="/tenvora-ledger-diagram.jpg"
                    alt="Tenvora Double-Entry Architecture Blueprint"
                    className="w-full h-auto object-contain"
                  />
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
