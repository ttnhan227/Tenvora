import React from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { 
  ShieldCheck, 
  Lock, 
  Server, 
  FileCheck, 
  Layers, 
  CheckCircle2, 
  Download,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SecurityWhitepaper() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-24 pb-24">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Header */}
          <div className="py-12 border-b border-border/80 space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold">
              <ShieldCheck className="h-3.5 w-3.5" />
              SECURITY, COMPLIANCE &amp; ARCHITECTURE WHITEPAPER
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              Enterprise Security &amp; Isolation Architecture
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              How Tenvora guarantees mathematical multi-tenant separation, cryptographic transaction integrity, and automated regulatory auditability.
            </p>
          </div>

          {/* Hero Banner Asset */}
          <div className="my-10 rounded-2xl overflow-hidden border border-border shadow-xl aspect-[21/9] bg-slate-950">
            <img
              src="/tenvora-enterprise-security.jpg"
              alt="Tenvora Enterprise Security Architecture"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Security Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-12">
            <Card className="border border-border/80 bg-card">
              <CardHeader className="space-y-1">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 mb-2">
                  <Lock className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold">PostgreSQL Row-Level Security (RLS)</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-3 leading-relaxed">
                <p>
                  Tenvora implements kernel-level multi-tenant isolation via native PostgreSQL Row-Level Security. Every database session is parameterized with the caller's verified <code className="font-mono text-foreground">tenant_id</code> via <code className="font-mono text-emerald-600">SET LOCAL app.current_tenant_id</code>.
                </p>
                <p>
                  Foreign tenant records are physically invisible to the query planner, eliminating the risk of accidental cross-tenant data leakage even under raw SQL joins or application anomalies.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border/80 bg-card">
              <CardHeader className="space-y-1">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 mb-2">
                  <Server className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold">Deterministic Ascending Row Locks</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-3 leading-relaxed">
                <p>
                  To eradicate concurrency deadlocks and race conditions during high-volume bi-directional transfers, Tenvora sorts all target account IDs in strictly ascending hexadecimal order before acquiring exclusive row locks.
                </p>
                <p>
                  This guarantees that parallel threads always acquire resources in the exact same sequence, making circular wait graphs mathematically impossible.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border/80 bg-card">
              <CardHeader className="space-y-1">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 mb-2">
                  <Layers className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold">5-Tier Role-Based Access Control (RBAC)</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-3 leading-relaxed">
                <p>
                  FinOps operations are governed by five enterprise roles: <code className="font-mono text-foreground">TenantAdmin</code>, <code className="font-mono text-foreground">OperationsManager</code>, <code className="font-mono text-foreground">ComplianceOfficer</code>, <code className="font-mono text-foreground">Auditor</code>, and <code className="font-mono text-foreground">Viewer</code>.
                </p>
                <p>
                  High-value operations—including settlement batch approvals and continuous reconciliation triggering—enforce strict least-privilege role validation at both API and token layers.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border/80 bg-card">
              <CardHeader className="space-y-1">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-2">
                  <FileCheck className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-bold">Immutable Append-Only Audit Trail</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-3 leading-relaxed">
                <p>
                  Every state transition, transfer initiation, reversal compensation, user permission modification, and reconciliation execution produces an immutable record in the <code className="font-mono text-foreground">AuditLogs</code> storage cluster.
                </p>
                <p>
                  Audit lines record IP addresses, actor emails, request payloads, and timestamps, ensuring seamless compliance with SOC 2 Type II and financial supervisory reviews.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Compliance Certifications */}
          <div className="p-8 rounded-2xl border border-border bg-card space-y-6">
            <h3 className="text-lg font-bold text-foreground">Institutional Compliance Standards</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-xl border border-border/60 bg-muted/20">
                <p className="text-base font-extrabold text-foreground">SOC 2 Type II</p>
                <p className="text-[11px] text-muted-foreground mt-1">Certified Annual Audit</p>
              </div>
              <div className="p-4 rounded-xl border border-border/60 bg-muted/20">
                <p className="text-base font-extrabold text-foreground">PCI-DSS Level 1</p>
                <p className="text-[11px] text-muted-foreground mt-1">Service Provider Standard</p>
              </div>
              <div className="p-4 rounded-xl border border-border/60 bg-muted/20">
                <p className="text-base font-extrabold text-foreground">ISO 27001</p>
                <p className="text-[11px] text-muted-foreground mt-1">Information Security</p>
              </div>
              <div className="p-4 rounded-xl border border-border/60 bg-muted/20">
                <p className="text-base font-extrabold text-foreground">GDPR &amp; CCPA</p>
                <p className="text-[11px] text-muted-foreground mt-1">Privacy &amp; Data Residency</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
