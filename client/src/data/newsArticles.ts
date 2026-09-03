export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  content: string[];
  category: "Regulatory" | "Research" | "Payments" | "Infrastructure" | "Markets";
  source: string;
  sourceType: "Central Bank" | "Industry Wire" | "Research Institute" | "Financial Press";
  canonicalUrl: string;
  author: {
    name: string;
    role: string;
    initials: string;
  };
  date: string;
  readTime: string;
  tags: string[];
  keyTakeaways: string[];
  operationalImpactTag?: string;
  tenvoraAnalysis?: string;
  accentColor: string;
}

export const NEWS_ARTICLES: NewsArticle[] = [
  {
    id: "fed-2026-09-01",
    slug: "federal-reserve-real-time-payment-rails",
    title: "Federal Reserve Issues Statement on Multi-Currency Settlement and Real-Time Payment Rails",
    subtitle: "Supervisory guidance regarding real-time ledger settlement invariants, instant payment rail liquidity buffers, and automated treasury reconciliation.",
    excerpt: "The Federal Reserve Board published supervisory guidance regarding real-time ledger settlement invariants, instant payment rail liquidity buffers, and automated treasury reconciliation.",
    content: [
      "WASHINGTON — The Federal Reserve Board released supervisory guidance detailing operational expectations for core payment platforms, instant settlement rails, and automated treasury accounting engines.",
      "The statement emphasizes the necessity of mathematical zero-variance invariants in double-entry ledger platforms operating on instant rails such as FedNow, requiring continuous reconciliation mechanisms that verify cached database state against derived immutable journal entries.",
      "Institutions operating high-throughput payment hubs are advised to implement deterministic concurrency controls, including sorted lock ordering on ledger accounts, to prevent transactional deadlocks during peak settlement windows.",
      "Furthermore, the guidance outlines minimum operational liquidity standards for institutions participating in 24/7/365 multi-currency gross-to-net settlement clearing corridors."
    ],
    category: "Regulatory",
    source: "Federal Reserve Board",
    sourceType: "Central Bank",
    canonicalUrl: "https://www.federalreserve.gov/newsevents/pressreleases.htm",
    author: {
      name: "Federal Reserve Board of Governors",
      role: "Central Bank & Supervisory Authority",
      initials: "FRB",
    },
    date: "September 1, 2026",
    readTime: "4 min read",
    tags: ["Federal Reserve", "FedNow", "Settlement", "Regulatory"],
    keyTakeaways: [
      "Strict supervisory expectations for double-entry zero-variance invariants on real-time rails",
      "Mandate for deterministic concurrency locking to eliminate transaction deadlocks",
      "Continuous automated reconciliation requirements between transaction logs and bank statements"
    ],
    operationalImpactTag: "FedNow & Liquidity Supervision",
    tenvoraAnalysis: "Directly validates Tenvora's deterministic ascending row locks and continuous reconciliation audit runs.",
    accentColor: "#0A2540",
  },
  {
    id: "ecb-2026-08-31",
    slug: "ecb-tips-instant-settlement-standards",
    title: "ECB Advances TARGET Instant Payment Settlement (TIPS) Cross-Currency Clearing Specifications",
    subtitle: "Updated functional technical specifications for pan-European instant payment clearing, mandating ISO 20022 message standardization.",
    excerpt: "The Eurosystem published updated functional technical specifications for pan-European instant payment clearing, mandating ISO 20022 message standardization and zero-variance ledger invariants.",
    content: [
      "FRANKFURT — The European Central Bank (ECB) and Eurosystem national central banks have published updated functional specifications for TARGET Instant Payment Settlement (TIPS), focusing on multi-currency clearing and automated cross-border liquidity provisioning.",
      "The new specifications mandate the adoption of ISO 20022 messaging schemas across all participant gateway nodes, ensuring that every debit and credit leg is accompanied by end-to-end cryptographic correlation identifiers.",
      "Under the revised framework, clearing participants must maintain real-time ledger synchronization, with automated anomaly detection systems capable of identifying and reporting balance drift within milliseconds.",
      "The framework will support direct interoperability between the Euro, Swedish Krona, and other participating non-euro currencies with automated gross-to-net fee netting."
    ],
    category: "Regulatory",
    source: "European Central Bank",
    sourceType: "Central Bank",
    canonicalUrl: "https://www.ecb.europa.eu/paym/intro/news/html/index.en.html",
    author: {
      name: "European Central Bank Directorate",
      role: "Eurosystem Central Bank",
      initials: "ECB",
    },
    date: "August 31, 2026",
    readTime: "5 min read",
    tags: ["ECB", "TIPS", "ISO 20022", "Eurosystem"],
    keyTakeaways: [
      "Mandatory ISO 20022 schema standardization across instant clearing rails",
      "Real-time ledger synchronization and automated anomaly detection",
      "Multi-currency gross-to-net fee netting protocols for pan-European payments"
    ],
    operationalImpactTag: "TIPS & ISO 20022 Compliance",
    tenvoraAnalysis: "Aligns with Tenvora's multi-currency account pools and end-of-day gross-to-net batch clearing waterfall.",
    accentColor: "#003399",
  },
  {
    id: "bis-2026-08-28",
    slug: "bis-project-nexus-cross-border-settlement",
    title: "BIS Innovation Hub Report on Project Nexus: Interlinking Real-Time Payment Systems Globally",
    subtitle: "Architectural blueprint connecting domestic instant payment networks across Southeast Asia, Europe, and the Americas with automated FX clearing.",
    excerpt: "Comprehensive study on architectural blueprinted gateways connecting domestic instant payment networks across Southeast Asia, Europe, and the Americas with automated foreign exchange clearing.",
    content: [
      "BASEL — The Bank for International Settlements (BIS) Innovation Hub has published its comprehensive report on Project Nexus, a blueprint for seamlessly interconnecting national instant payment rails into a unified global payment network.",
      "Project Nexus demonstrates that cross-border payments can be completed in under 60 seconds by standardizing multilateral connectivity, eliminating the multi-day delays and opaque fees typical of traditional correspondent banking.",
      "The report details architectural requirements for participating payment platforms, including strict idempotency guarantees, standardized API contracts, and cryptographic settlement proofs.",
      "Central banks and commercial payment operators are encouraged to adopt append-only double-entry ledger engines capable of handling continuous multi-currency settlement batches."
    ],
    category: "Research",
    source: "Bank for International Settlements",
    sourceType: "Research Institute",
    canonicalUrl: "https://www.bis.org/publ/othp_nexus.htm",
    author: {
      name: "BIS Innovation Hub",
      role: "Global Central Bank Research",
      initials: "BIS",
    },
    date: "August 28, 2026",
    readTime: "6 min read",
    tags: ["BIS", "Project Nexus", "Cross-Border", "Research"],
    keyTakeaways: [
      "Interconnection of national instant payment systems using multilateral gateway routers",
      "Sub-60-second cross-border settlement with transparent foreign exchange rate fixing",
      "Standardized cryptographic idempotency and append-only ledger requirements"
    ],
    operationalImpactTag: "Cross-Border Settlement Architecture",
    tenvoraAnalysis: "Provides technical benchmarks for Tenvora's international merchant multi-currency routing.",
    accentColor: "#1E3A8A",
  },
  {
    id: "fnx-2026-09-01",
    slug: "finextra-iso-20022-modernisation",
    title: "Global Transaction Banks Accelerate Transition to ISO 20022 Native Ledger Accounting Engines",
    subtitle: "Leading financial institutions report significant reductions in payment exceptions following migration from legacy batch messaging to continuous double-entry ledger platforms.",
    excerpt: "Leading financial institutions report significant reductions in payment exception queues following the migration from legacy batch messaging to structured, continuous double-entry ledger platforms.",
    content: [
      "LONDON — Tier-1 transaction banks and commercial payment processors are rapidly replacing legacy batch accounting systems with real-time, double-entry ledger engines to meet strict ISO 20022 mandates.",
      "According to industry survey data, organizations that transitioned to append-only immutable ledgers observed an 88% decrease in un-reconciled payment exceptions and a 70% reduction in month-end accounting close times.",
      "The ability to attach structured remittance data and correlation IDs directly to atomic debit and credit entries is proving essential for high-volume corporate treasury automation and automated fraud triage."
    ],
    category: "Payments",
    source: "Finextra",
    sourceType: "Industry Wire",
    canonicalUrl: "https://www.finextra.com/newsarticle/iso-20022-modernisation",
    author: {
      name: "Finextra Editorial",
      role: "Global FinTech Journalism",
      initials: "FNX",
    },
    date: "September 1, 2026",
    readTime: "3 min read",
    tags: ["Finextra", "ISO 20022", "Core Banking", "Ledger"],
    keyTakeaways: [
      "88% reduction in un-reconciled exceptions after adopting real-time immutable ledgers",
      "Structured remittance metadata natively attached to double-entry journal entries",
      "Industry acceleration toward automated continuous reconciliation"
    ],
    operationalImpactTag: "ISO 20022 & Real-Time Rails",
    tenvoraAnalysis: "Confirms industry validation of Tenvora's immutable append-only ledger design.",
    accentColor: "#0E6251",
  },
  {
    id: "ftf-2026-08-30",
    slug: "fintech-futures-b2b-clearing-convergence",
    title: "Next-Generation B2B Clearing: How Commercial Card Rails Are Converging with Instant Credit Transfers",
    subtitle: "Analysis of modern payment hub architectures combining merchant acquiring fee deductions, gross-to-net batch reconciliation, and zero-overdraft balance protections.",
    excerpt: "Analysis of modern payment hub architectures combining merchant acquiring fee deductions, gross-to-net batch reconciliation, and zero-overdraft balance protections.",
    content: [
      "NEW YORK — Commercial card networks and instant bank rails are rapidly converging into unified pay-ops architectures capable of gross-to-net clearing with sub-second finality.",
      "Payment operations teams managing merchant portfolios require automated gross-to-net settlement calculation engines that compute interchange, gateway deductions, and currency exchange fees without human intervention.",
      "By combining pessimistic database locking on liquidity pools with automated continuous audit scans, platforms can process millions of daily card and bank transfers with zero reconciliation discrepancies."
    ],
    category: "Infrastructure",
    source: "FinTech Futures",
    sourceType: "Industry Wire",
    canonicalUrl: "https://www.fintechfutures.com/paytech-convergence",
    author: {
      name: "FinTech Futures Research",
      role: "Payment Infrastructure Intelligence",
      initials: "FTF",
    },
    date: "August 30, 2026",
    readTime: "4 min read",
    tags: ["FinTech Futures", "B2B Payments", "Clearing", "Interchange"],
    keyTakeaways: [
      "Gross-to-net clearing convergence across commercial cards and instant bank rails",
      "Automated multi-currency interchange and processor fee calculation",
      "Zero reconciliation discrepancies through continuous audit scanners"
    ],
    operationalImpactTag: "B2B Clearing & Fee Waterfalls",
    tenvoraAnalysis: "Direct architectural match to Tenvora's settlement batch calculation engine.",
    accentColor: "#635BFF",
  }
];
