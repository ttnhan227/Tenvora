import React from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Building2, Globe2, ShieldCheck, Users, Cpu, ArrowRight, Shield, Layers, Database, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AboutPage() {
  const leadership = [
    {
      name: "Marcus Vance",
      role: "Chief Executive Officer & Co-Founder",
      initials: "MV",
      bio: "Former Head of Core Ledger Engineering at Stripe and Square. 15+ years architecting high-throughput financial infrastructure.",
      color: "from-indigo-600 to-violet-700",
    },
    {
      name: "Elena Rostova",
      role: "Chief Technology Officer & Co-Founder",
      initials: "ER",
      bio: "Distributed systems specialist. Led PostgreSQL high-availability and concurrency lock optimization across Tier-1 payment gateways.",
      color: "from-blue-600 to-cyan-700",
    },
    {
      name: "Dr. Julian Chen",
      role: "Chief Security & Compliance Officer",
      initials: "JC",
      bio: "PhD in Cryptographic Systems. Former advisor to FinCEN and lead auditor for global commercial banking consortiums.",
      color: "from-emerald-600 to-teal-700",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-24 pb-24">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="py-12 border-b border-border/80 space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#C7D2FE] bg-[#EEF2FF] text-[#3730A3] dark:bg-[#312E81]/30 dark:text-[#A5B4FC] font-mono text-[11px] font-bold">
              <Building2 className="h-3.5 w-3.5" />
              ABOUT TENVORA TECHNOLOGIES
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              Building the Mathematical Backbone of Global Payment Operations
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              We founded Tenvora on a fundamental engineering principle: core payment systems must be mathematically provable, completely auditable in real-time, and immune to concurrency drift.
            </p>
          </div>

          {/* Mission & Values */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 my-14">
            <div className="p-6 rounded-lg border border-border bg-card shadow-xs space-y-3">
              <div className="h-9 w-9 rounded-md bg-[#EEF2FF] dark:bg-[#312E81]/30 border border-[#C7D2FE] dark:border-[#6366F1]/40 text-[#635BFF] flex items-center justify-center font-mono font-bold text-sm">
                01
              </div>
              <h3 className="text-base font-bold text-foreground">Zero-Variance Invariants</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Financial systems should never conceal balance drift in synthetic clearing accounts. Every monetary mutation must produce equal, immutable debit and credit journal lines.
              </p>
            </div>

            <div className="p-6 rounded-lg border border-border bg-card shadow-xs space-y-3">
              <div className="h-9 w-9 rounded-md bg-[#EEF2FF] dark:bg-[#312E81]/30 border border-[#C7D2FE] dark:border-[#6366F1]/40 text-[#635BFF] flex items-center justify-center font-mono font-bold text-sm">
                02
              </div>
              <h3 className="text-base font-bold text-foreground">Kernel-Level Isolation</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Application-level tenant filters fail under load. We bake Row-Level Security directly into the database kernel, ensuring mathematical tenant separation across all operational tables.
              </p>
            </div>

            <div className="p-6 rounded-lg border border-border bg-card shadow-xs space-y-3">
              <div className="h-9 w-9 rounded-md bg-[#EEF2FF] dark:bg-[#312E81]/30 border border-[#C7D2FE] dark:border-[#6366F1]/40 text-[#635BFF] flex items-center justify-center font-mono font-bold text-sm">
                03
              </div>
              <h3 className="text-base font-bold text-foreground">Continuous Auditability</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Month-end closing belongs in the past. Our continuous reconciliation engine scans millions of historical ledger records in the background, surfacing any balance drift instantaneously.
              </p>
            </div>
          </div>

          {/* Leadership Team */}
          <div className="mt-16 space-y-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-foreground">Executive Leadership &amp; Engineering Founders</h2>
              <p className="text-xs text-muted-foreground">Decades of combined experience scaling institutional financial infrastructure.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {leadership.map((leader) => (
                <Card key={leader.name} className="border border-border bg-card shadow-xs overflow-hidden">
                  <div className="p-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-md bg-[#635BFF] text-white flex items-center justify-center font-bold font-mono text-sm shadow-xs">
                        {leader.initials}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{leader.name}</h3>
                        <p className="text-xs font-semibold text-[#635BFF] font-mono">{leader.role}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pt-1">{leader.bio}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
