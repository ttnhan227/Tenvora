import {
  Scale,
  Lock,
  RefreshCw,
  Landmark,
  ShieldCheck,
  Cpu,
  KeyRound,
  FileCode,
  CheckCircle2,
} from "lucide-react";

const FEATURES = [
  {
    icon: Scale,
    title: "Double-Entry Balance Invariant",
    description:
      "Every financial movement guarantees Σ(Debit) = Σ(Credit) = Amount. Zero balance row mutations — reversals append compensating journal entries.",
  },
  {
    icon: Lock,
    title: "PostgreSQL Native RLS",
    description:
      "Tenant isolation is enforced in the database kernel via PostgreSQL Row-Level Security policies, eliminating application-level leakage risks.",
  },
  {
    icon: Cpu,
    title: "Deadlock-Free Ascending Locks",
    description:
      "Pessimistic SELECT FOR UPDATE locks acquire account IDs in strict ascending order, mathematically eliminating AB-BA lock inversion deadlocks.",
  },
  {
    icon: KeyRound,
    title: "Strict Idempotency Protection",
    description:
      "Unique composite (TenantId, IdempotencyKey) constraints deduplicate rapid retries and network race conditions with sub-millisecond cached responses.",
  },
  {
    icon: RefreshCw,
    title: "Continuous Reconciliation",
    description:
      "Automated background audit scanners continuously compare cached account balances against historical journal lines to catch variances immediately.",
  },
  {
    icon: Landmark,
    title: "Automated Multi-Currency Clearing",
    description:
      "Batch clearing engines aggregate daily intra-day transactions into single net settlements per currency, with automatic processor fee calculation.",
  },
  {
    icon: ShieldCheck,
    title: "5-Tier Financial RBAC",
    description:
      "Granular role-based permissions: TenantAdmin, OperationsManager, ComplianceOfficer, Auditor, and Viewer with immutable audit event logging.",
  },
  {
    icon: FileCode,
    title: "Deterministic Rule-Based Risk",
    description:
      "Real-time evaluation engine flags high-value velocity, balance depletion ratios, and account state restrictions before money movement.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 border-t border-border/60 bg-background relative">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold">
            FINANCIAL ARCHITECTURE
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Engineered for Zero-Tolerance Financial Systems
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Every architectural decision in Tenvora is optimized for mathematical correctness, concurrency safety, and auditable compliance.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground group-hover:text-emerald-600 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feat.description}
                  </p>
                </div>
                <div className="pt-2 border-t border-border/50 flex items-center gap-1 text-[11px] font-mono text-emerald-600 font-semibold">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Enforced Core Rule</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
