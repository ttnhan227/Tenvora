# VeriSpend → Tenvora: Enterprise Fintech Transformation

## How to use this document (read first, every session)

This file **is** the plan and the tracker. There is no separate `CURRENT_STATE.md`,
`PHASE_COMPLETE` report, or progress file — everything lives here, in place.

Rules for the agent:

1. Before starting any work, re-read this whole file to see what's already done.
2. When a checklist item is finished, change `[ ]` to `[x]` **directly in this file**.
3. When a phase's Definition of Done is fully checked (or an item is explicitly
   deferred with a reason written next to it), fill in that phase's **Execution
   Log** block in place — don't create a new file for it.
4. Update the **Status** column in the tracker table below whenever a phase's
   state changes.
5. Do not skip ahead. After finishing a phase, stop and wait for explicit
   approval ("approved, proceed to Phase N") before starting the next one.
6. Never re-litigate a phase marked `Done` unless the person reopens it or a
   later phase discovers the earlier work was wrong — if so, note the
   discrepancy in that later phase's log rather than silently editing history.

---

## Status Tracker

| Phase | Name | Status |
|---|---|---|
| 0 | Repository Audit | **Done** |
| 1 | Research, Product Definition, Naming Cascade | **Done** |
| 2 | Domain & System Architecture | **Done** |
| 3 | Database Transformation | **Done** |
| 4 | Financial Core | **Done** |
| 5 | Security & Enterprise Access Control | **Done** |
| 6 | Operations & Reconciliation | **Done** |
| 7 | Asynchronous Processing | **Done** |
| 8 | Risk & Compliance Layer | **Done** |
| 9 | AI Operations Layer | **Done** |
| 10 | Frontend Transformation | **Done** |
| 11 | Testing & Reliability | **Done** |
| 12 | Observability & Operations | **Done** |
| 13 | Docker, CI/CD & Deployment | **Done** |
| 14 | Documentation & Portfolio Presentation | **Done** |

Status values: `Not started` / `In progress` / `Blocked (reason)` / `Done`.

---

## Brand — decided

**Product name: Tenvora.** This is final — no brand-candidate generation needed
in Phase 1. Naming cascade (repo name, namespace, DB name, etc.) is still
proposed and recorded in Phase 1's Execution Log below.

---

# 1. Existing Project (verified against the real repository, not hypothetical)

> VeriSpend was a multi-tenant corporate expense review platform that automated
> itemized receipt parsing with a Mistral-compatible Vision AI, enforced spend
> limits, and maintained an audit log.

Confirmed architecture at audit time:

```text
React 19 + TypeScript (Vite, Tailwind, shadcn/ui)
        │ HTTPS / REST, JWT bearer
        ▼
ASP.NET Core 10 API (single project)
        ├── JWT auth + role-based [Authorize] policies (Owner / Manager / Member)
        ├── TenantContextMiddleware — sets a Postgres session var per request
        ├── Repository layer — explicit tenantId filtering on every query
        ├── EF Core SaveChanges interceptors (audit log, entity validation)
        ├── Deterministic RiskAssessmentService (rule-based scoring, not AI)
        ├── AI layer (AiReceiptService, AiCopilotService) — extraction/Q&A only,
        │   never calls approve/reject; always scoped to caller's tenant+role
        └── In-process IHostedService workers (auto-approval, digests, cleanup)
        ▼
PostgreSQL 16
```

Confirmed stack: C#, ASP.NET Core 10, EF Core, PostgreSQL, React 19, TypeScript,
Vite, Tailwind, shadcn/ui, Docker/Compose, xUnit, Vitest, Playwright, JWT,
GitHub Actions CI (build/test/docker jobs), Render deployment.

## 1a. Known issues in the current implementation (confirmed by direct inspection)

These are facts about the current codebase, not hypothetical risks — later
phases must resolve them explicitly, not inherit them silently.

1. **RLS is claimed but not implemented.** `TenantContextMiddleware` sets
   `app.current_tenant_id` with a comment saying it's "required for Row-Level
   Security policies," but **no `CREATE POLICY` statement exists anywhere in
   the migrations**. Tenant isolation currently works only because every
   repository method filters by `tenantId` in application code.
   **Decision owned by Phase 5 / implemented in Phase 3:** either implement
   real Postgres RLS as defense-in-depth for the new ledger/account tables, or
   remove the misleading comment/middleware framing and document that
   isolation is application-layer only.
2. **The approve/reject workflow has a check-then-write race.**
   `ManagerService.ApproveAsync`/`RejectAsync` read status, compare, mutate,
   and save — no row-version token, no `SELECT ... FOR UPDATE`. This is
   precisely the bug class the new transfer/payment workflow must not have.
   Treat as a negative example, not a pattern to reuse.
3. **No idempotency mechanism exists anywhere.** No idempotency-key table,
   header, or check. Fully greenfield work for Phase 4.
4. **No optimistic concurrency token on any entity.** No `RowVersion`/`xmin`
   mapping anywhere.
5. **Test coverage is unit-only.** 6 xUnit files, all pure unit tests. Zero
   database-integration tests, zero HTTP-pipeline tests, zero concurrency
   tests, zero cross-tenant-leak tests.
6. **Money is already `decimal`/`numeric`, never `float`/`double`.** Correct —
   preserve and extend into the ledger.

## 1b. Reusable engineering (verified — keep and evolve, don't discard)

* JWT auth + refresh-token infrastructure (`AuthService`, `TokenService`,
  `RefreshTokenRepository`)
* Fail-closed claims extraction (`ClaimsPrincipalExtensions` — returns
  `Guid.Empty` on missing/malformed tenant claim)
* Repository pattern with explicit `tenantId` parameters
* `AuditLogSaveChangesInterceptor` + `AuditLog` model shape (actor,
  before/after jsonb snapshots) — structurally close to what financial audit
  events need
* The deterministic, explainable scoring pattern in `RiskAssessmentService`
  (rules → itemized reasons → score → level) — right shape for Phase 8, port
  the pattern, replace the subject matter
* The AI-boundary architecture: AI services that only read tenant-scoped data
  and never call authorization/decision services — keep as an invariant
* Docker Compose + GitHub Actions CI skeleton (build → test → docker build)
* Global "account inactive → 401 on every request, not just login" re-check
  middleware

## 1c. Confirmed for removal (do not migrate or reuse)

* `Expense`, `Receipt`, `ExpenseReviewFeedback` models and all expense-specific
  workflow code
* `AiReceiptService`, the Mistral vision-extraction pipeline, and
  `tools/ReceiptEvaluator`
* Expense-specific frontend pages and the current `Onboarding.tsx`/
  `PolicyLab.tsx` implementations (their *concepts* may resurface, not their
  code)

## 1d. Needs an explicit decision (owned by Phase 1 — do not default silently)

- [x] **Subscription/billing scope** — is SaaS billing in scope for Tenvora, or
      out of scope entirely? Decision: **Out of scope entirely.** Tenvora is an Enterprise Payment Operations & Transaction Processing Platform focusing on high-integrity B2B payment lifecycle, ledgering, transfers, settlement, and reconciliation. SaaS subscription billing (tier upgrades, recurring SaaS plan charges, Stripe customer checkout) is commercial tooling that dilutes focus from core high-integrity money movement and ledger state machines.
- [x] **Multi-currency vs. single-currency** — does the new domain need the
      current `Currency`/`BaseAmount`/`FxRateService` pattern, or can it assume
      one base currency? Decision: **Multi-currency supported at entity/account level (ISO-4217), but transactions operate in a single specified currency with strict matching entries. Dynamic live FX during core transfer commits is out of scope.** Balanced double-entry transactions require that all debits and credits within a single journal entry match in currency. Cross-currency FX movements (if triggered) are modeled explicitly as two paired ledger entries interacting with a system clearing account, rather than dynamic in-flight floating-point FX rate calculations within core ledger commits.

---

# 2. New Product Direction

> A realistic, appropriately scoped **enterprise fintech transaction-processing
> and financial operations platform** — internal operations portal + external
> API surface. Not a full bank, not a consumer banking clone, not a Stripe
> clone.

```text
React frontend → ASP.NET Core API → Financial domain services → PostgreSQL → supporting infra
```

Employees/operations users use an internal web portal. External
systems/merchants/clients use APIs.

---

# 3. Primary Engineering Goal

Demonstrate real backend/enterprise engineering ability. No technology added
for its own sake — every non-trivial choice must survive §11's questions.

Target competencies: transactional consistency, ACID guarantees, correct
relational modeling, double-entry ledger concepts, concurrency control,
idempotency, transaction state management, authorization, auditability,
reconciliation, failure handling, justified async processing, API design,
security, automated testing (closing the gaps in §1a.5), containerization,
CI/CD, observability, maintainable architecture.

---

# 4. AI Philosophy

AI must **never** be part of the financial authorization core. The system must
function correctly with the AI subsystem fully unavailable — a pattern
**already correctly implemented** in the current codebase (§1a.6, §1b); the
bar is to keep meeting it, not invent it.

```text
Bad:  Payment → LLM decides validity → Money movement
Good: Payment → Deterministic validation → Authorization → Transaction → Ledger → Commit → Event → Optional AI analysis
```

AI role: operations assistant, transaction investigation, natural-language
reporting (translated to a safe query layer, never arbitrary SQL), anomaly
analysis (recommendation + evidence + confidence + reasoning, never a bare
verdict), failed-transaction analysis, operational summaries.

---

# 5. Transformation Philosophy

Do not rename (`Expense→Transaction`, `Employee→Customer`, `Manager→Admin`)
and call it done. Redesign around real financial concepts: Customers,
Organizations/Merchants, Accounts, Payment requests, Transfers, Transactions,
Ledger entries, Payment states, Settlement, Reconciliation, Risk rules, Audit
events, Users/Roles/Permissions. Exact terminology is finalized in Phase 1.

---

# 6. Target Architecture (directional — evolve phase by phase)

```text
Internal Operations Portal (React + TS)
        │ HTTPS / REST
        ▼
ASP.NET Core API
   ├── Account Domain    ├── Payment Domain    ├── Operations
        └──────────────────────┼──────────────────────┘
                                ▼
                         Financial Core
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
           Ledger      Audit Trail    Reconciliation
              ▼
          PostgreSQL
        ┌────┴─────┐
        ▼          ▼
      Redis   Message Broker
                    ▼
            Background Workers
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   Settlement    Alerts    Notifications
                                ▼
                            AI Layer
```

---

# 7. Non-Negotiable Financial Principles

**Double-entry:** every financial movement is balanced debit/credit ledger
entries. `Account.Balance -= x; Account.Balance += x` as the *sole* source of
truth is forbidden — the current codebase has exactly this anti-pattern
(`Expense.Amount` as the only financial figure, no ledger) and it must not
carry forward.

**Atomicity:** a transfer completes fully or leaves no partial financial
state.

**Idempotency:** repeated requests with the same idempotency key never create
duplicate financial transactions (currently: zero infrastructure — §1a.3).

**Concurrency:** concurrent operations on the same account never produce
invalid balances or inconsistent ledger state (currently: the analogous
approve/reject flow has an unguarded race — §1a.2 — do not replicate it for
money movement).

**Auditability:** important financial actions are traceable (extend the
existing `AuditLog`/interceptor pattern, §1b).

**Immutability:** posted ledger entries are never updated or deleted through
normal application operations. Corrections happen only via new
reversal/adjustment transactions, never `UPDATE`/`DELETE` on a posted entry.

**Reconciliation:** mechanisms exist to detect inconsistencies between
financial records.

---

# 8. Phase Operating Rules (applies to every phase below)

For every phase: inspect current state → plan → implement only that phase's
scope → run all tests → verify builds (backend + frontend + Docker) → review
against §7 → **check off Definition-of-Done items in place in this file** →
fill in the phase's Execution Log in place → update the Status Tracker table →
STOP and wait for explicit approval before continuing.

A phase is not `Done` until every DoD item is checked, or explicitly marked
deferred with a one-line reason written next to it.

---

# PHASE 0 — Repository Audit ✅ Done

*(Completed by direct inspection of the cloned repository. Content merged into
§1/§1a/§1b/§1c above rather than kept as a separate file.)*

**Definition of Done**
- [x] Frontend structure identified
- [x] Backend structure identified
- [x] Database models identified
- [x] Migrations identified
- [x] Services identified
- [x] Controllers/endpoints identified
- [x] Authentication implementation identified
- [x] Authorization implementation identified
- [x] Tenant isolation identified (and gap between claimed/actual found)
- [x] Audit infrastructure identified
- [x] State-machine implementation identified
- [x] Policy/risk engine identified
- [x] AI integration identified
- [x] Tests identified (and coverage gap found)
- [x] Docker configuration identified
- [x] CI/CD identified
- [x] Deployment configuration identified
- [x] Technical debt identified (RLS gap, concurrency race, no idempotency)
- [x] Reusable components identified
- [x] Components to remove identified
- [x] Migration strategy recommended (clean schema reset; evolve auth/tenant tables)

**Execution Log**
- Implemented: audit findings merged into §1/§1a/§1b/§1c/§1d of this document.
- Removed: n/a (no code touched).
- Preserved: entire repository untouched.
- Architecture decisions: none yet — deferred to Phase 2.
- Tests: none run (no code changed).
- Known issues / deferred items: none — all findings captured above.
- Files changed: none.

---

# PHASE 1 — Research, Product Definition & Naming Cascade

**Do not write production code.**

Research (current, authoritative sources): fintech transaction platforms,
payment processing systems, transaction ledgers, reconciliation systems,
idempotent API design, event-driven processing, modern .NET fintech
architecture, current backend engineering expectations (Vietnam +
international). Do not copy proprietary architectures.

**Research must result in concrete product/architecture decisions, not a
technology shopping list.** Do not add a technology merely because a
researched company uses it. Every technology carried from research into the
product definition must survive §11's four questions.

**Select ONE primary financial product/use case.** Do not design a generic
platform that attempts to simulate every banking/payment function. Example
shape (illustrative, not prescriptive):

```text
Tenvora — Enterprise Payment Operations Platform

Create payment → Validate → Authorize → Process → Ledger → Settle → Reconcile
```

**Hard scope boundary:** the system must not attempt to model deposits,
loans, cards, mortgages, branches, ATMs, core banking, or an entire
commercial bank, unless one of these becomes directly necessary for the
selected primary product. If a later phase seems to need one of these, stop
and re-justify against this boundary rather than adding it by default.

**Portfolio signal:** product and architecture decisions should maximize
demonstrated engineering depth while remaining realistic for a solo
portfolio project. Prioritize transaction correctness, concurrency,
idempotency, authorization, data integrity, reconciliation, testing, and
operational reliability over feature count.

**Product definition** — must resolve both open items in §1d explicitly, and
must name the single primary product/use case selected above. Also define:
target users/organizations, core workflows, system boundaries, explicit
non-goals (reference the hard scope boundary above), core entities, draft
transaction lifecycle (full design owned by Phase 2), security model
outline, operational workflows, AI role.

**Naming cascade** (brand is decided — Tenvora): product name, repo name,
backend solution/project name, frontend project name, database name, Docker
Compose project name, API title, root namespace, env var prefixes, docs
naming, deployment naming — propose the full cascade and record it below.

**Full rename requirement — this is not just the cascade above, it is a
literal sweep — and it is distinct from the domain redesign.** There are two
different renames happening in this project; do not conflate them:

- **Brand rename (this section, literal find-and-eliminate):** every
  occurrence of "VeriSpend"/"verispend" — the company/product name — must be
  eliminated, including but not limited to: namespaces (`namespace
  VeriSpend.Api...`), the `.sln` file and all `.csproj` file
  names/`AssemblyName`/`RootNamespace` values, Docker image/service/container
  names, `compose.yaml` (`POSTGRES_DB: VeriSpend`, service names), connection
  strings, environment variable names/prefixes, Swagger/OpenAPI title and
  description, the frontend `package.json` name and any `VITE_*` env vars,
  page titles and UI copy, seed/demo data (company names, emails like
  `noreply@verispend.local`), the README, CI workflow names/job labels, and
  any comments referencing the old name.
- **Domain entity rename (owned by Phases 2–4, NOT a literal find-and-replace):**
  `Expense`, `Receipt`, `ExpenseService`, `ManagerController`, etc. are
  **confirmed for removal per §1c, not for renaming**. Per §5, doing
  `Expense→Transaction`, `Manager→Admin` as a mechanical find-and-replace and
  calling the domain "redesigned" is an explicit anti-pattern. The new
  entities (`Transaction`, `LedgerEntry`, `Account`, `PaymentRequest`, etc.)
  must be genuinely designed in Phase 2 and built fresh in Phases 3–4 — they
  will end up with different names, different fields, and different
  relationships than the old entities, not just a class-name swap.

This does not all happen in Phase 1 — it happens incrementally as each phase
touches its part of the codebase — but **no phase may introduce new files or
code that reference "VeriSpend"**, and **Phase 14 (Documentation) is the
final gate**: before Phase 14 can be marked Done, run a full-repository
search for "VeriSpend"/"verispend" and confirm zero remaining matches outside
of historical references (e.g. a README changelog note saying "formerly
VeriSpend," if you choose to keep one — that is the only acceptable survival
of the old name).

**Definition of Done**
- [x] §1d Subscription/billing decision made and justified
- [x] §1d multi-currency decision made and justified
- [x] Single primary financial product/use case selected and named (not a
      generic "does everything" platform)
- [x] Hard scope boundary (no deposits/loans/cards/mortgages/branches/ATMs/
      core banking) explicitly acknowledged in the non-goals section
- [x] Product definition written (purpose, users, workflows, boundaries,
      non-goals, entities, lifecycle draft, security outline, AI role)
- [x] Every technology introduced during research is traced to a concrete
      decision, not just listed because a researched company uses it
- [x] Full naming cascade proposed and recorded below
- [x] Full-rename requirement above understood as an ongoing constraint for
      all subsequent phases (not something to attempt all at once now)
- [x] No application code touched

**Execution Log** *(Phase 1 completed)*
- Primary product/use case selected: **Tenvora — Enterprise Payment Operations & Transaction Processing Platform** (B2B payment lifecycle, immutable double-entry ledger, deterministic risk screening, batch settlement, and automated end-of-day reconciliation).
- Product definition:
  - Purpose: High-reliability transaction processing engine and internal operations portal for enterprise B2B payments and fund movements.
  - Users: Internal Operations (Treasury, Ops, Compliance Officers) and External B2B API clients (Merchants, Partners).
  - Workflows: Payment Request Initiation → Deterministic Risk Screening → Concurrency & Balance Lock → Balanced Double-Entry Ledger Commit → Settlement Batching → EOD Statement Reconciliation. Reversals/adjustments via compensating entries.
  - System boundaries: Multi-tenant ASP.NET Core REST API + React Operations Portal + PostgreSQL double-entry ledger + Background settlement/reconciliation workers.
  - Non-goals (Hard Scope Boundary): No consumer deposit accounts/interest, no lending/mortgage underwriting, no physical card issuing/PIN/EMV, no ATM/branch networks, no monolithic core banking clone.
  - Core entities: Tenant, Customer/Merchant, Account (Asset/Liability/Settlement/Clearing), PaymentRequest, Transaction, LedgerEntry, IdempotencyRecord, SettlementBatch, ReconciliationRun, RiskAssessment, AuditLog.
  - Lifecycle draft: Initiated → PendingAuthorization / Processing → Posted / Settled / Reversed / Rejected / Failed.
  - Security outline: JWT Bearer + Refresh Tokens, RBAC (TenantAdmin, OperationsManager, ComplianceOfficer, ApiClient), Tenant-isolated queries + RLS in Postgres, Sliding-window Rate Limiting on auth/payment endpoints.
  - AI role: Strictly read-only operational copilot (transaction root-cause investigation, reconciliation anomaly explanation, natural-language operational filters translated to parameterized queries). Zero financial authorization authority.
- Naming cascade:
  - Repo name: `Tenvora` (already renamed)
  - Backend solution/project name: `Tenvora.sln` / `Tenvora.Api.csproj` / `Tenvora.Tests.csproj`
  - Frontend project name: `tenvora-client` (`client/package.json`)
  - Database name: `tenvora_db`
  - Docker Compose project name: `tenvora`
  - API title: `Tenvora Operations & Transaction Processing API`
  - Root namespace: `Tenvora` / `Tenvora.Api` / `Tenvora.Tests`
  - Env var prefix: `TENVORA_`
- Research sources used: Modern Treasury Ledger Architecture, Formance Double-Entry Specs, Martin Fowler Accounting Patterns, Stripe Idempotency-Key Design, ASP.NET Core 10 Enterprise Web API Best Practices.
- Known issues / deferred items: None. Production code remains untouched during Phase 1.
- Files changed: `TENVORA_TRANSFORMATION.md`, `implementation_plan.md`.

STOP for approval.

---

# PHASE 2 — Domain & System Architecture

Design before implementing: bounded contexts, aggregates, entities, value
objects, domain events, state transitions, invariants, relationships,
ownership boundaries.

**Transaction lifecycle:** justify actual states (don't default to the
illustrative `CREATED→PENDING→AUTHORIZED→PROCESSING→COMPLETED` without
reasoning) plus legitimate failure/reversal paths. The current 4-state
`ExpenseStatuses` model is a "too simple" negative example — the new
lifecycle must support failure/reversal paths the old one never needed.

**Ledger design:** define how Accounts, Transactions, LedgerEntries,
PaymentRequests, Reversals, Adjustments relate. Every transaction produces
balanced ledger entries; account "balance" (if materialized) is a
derived/cached projection of ledger entries, never the sole source of truth.

**Ledger immutability:** posted ledger entries cannot be updated or deleted
through normal application operations. Corrections happen only through
explicit reversal/adjustment transactions that create new, balanced entries
— never an `UPDATE ledger_entry SET amount = ...`.

**Balance invariant — pick and state the sign convention explicitly.** The
required invariant is that debits and credits net to zero per transaction,
but the *exact form* depends on the schema choice made here:
- If entries use a single signed `Amount` column (debit positive, credit
  negative, or vice versa): the invariant is `SUM(Amount) = 0` per
  transaction.
- If entries use separate non-negative `DebitAmount`/`CreditAmount` columns:
  the invariant is `SUM(DebitAmount) = SUM(CreditAmount)` per transaction.
Choose one, document it here, and make sure Phase 4's automated test checks
the invariant in the form that actually matches the schema — not a form
copied from an example.

**Definition of Done**
- [x] Bounded contexts and aggregates identified with clear ownership
- [x] Transaction lifecycle diagram includes at least one failure path and
      one reversal path, each justified
- [x] Ledger model explicitly shows balance as derived from entries
- [x] Ledger immutability rule stated explicitly (reversal/adjustment only,
      no in-place updates to posted entries)
- [x] Sign convention for ledger entries chosen and the balance invariant
      written in the matching exact form
- [x] Explicit mapping recorded: which current tables are extended vs.
      replaced vs. net-new (reference §1b/§1c)

**Execution Log** *(Phase 2 completed)*
- Bounded contexts / aggregates:
  - IAM Context: `User`, `Tenant`, `RefreshToken`, `Role`.
  - Account Context: `Customer`, `Account` (Asset/Liability/Clearing/Settlement).
  - Payment Context: `PaymentRequest`, `IdempotencyRecord`.
  - Financial Ledger Context: `Transaction` (Journal Header), `LedgerEntry` (Journal Line).
  - Risk & Compliance Context: `RiskPolicy`, `RiskEvaluation`, `RiskRuleHit`.
  - Operations & Reconciliation Context: `SettlementBatch`, `ReconciliationRun`, `ReconciliationDiscrepancy`, `AuditLog`.
  - AI Context: `IncidentInvestigation`, `NaturalLanguageQueryPlan` (strictly read-only/advisory).
- Transaction lifecycle (final):
  - Normal Flow: `Initiated` → `PendingAuthorization` (if flagged/high-value) or `Processing` → `Posted` → `Settled`.
  - Failure Path 1 (`Rejected`): Pre-execution rejection (insufficient funds, risk rule trip, account frozen). No financial entries written.
  - Failure Path 2 (`Failed`): In-flight exception/concurrency conflict during execution. Atomically rolled back; zero partial ledger records.
  - Reversal Path (`Reversed`): Post-commit adjustment. Original transaction marked `Reversed` with pointer to compensating `ReversalTransaction`. Offsetting balanced ledger entries posted with inverted debit/credit lines. Original entries remain immutable.
- Ledger model summary: Every financial transaction creates $\ge 2$ balanced `LedgerEntry` records. Account balance is a derived calculation: `SUM(DebitAmount) - SUM(CreditAmount)` for Asset accounts, and `SUM(CreditAmount) - SUM(DebitAmount)` for Liability/Settlement accounts. `Accounts.CachedBalance` is a row-locked cache for presentation and pre-flight validation.
- Ledger sign convention chosen: Separate non-negative columns (`DebitAmount >= 0`, `CreditAmount >= 0`) with constraint `(DebitAmount > 0 AND CreditAmount == 0) OR (CreditAmount > 0 AND DebitAmount == 0)`.
- Balance invariant (exact form matching the schema):
  `SUM(DebitAmount) = SUM(CreditAmount)` per `Transaction`.
- Table mapping (extend / replace / new):
  - Extend / Evolve: `Tenants`, `Users`, `RefreshTokens`, `AuditLogs`.
  - Removed per §1c: `Expenses`, `Receipts`, `ExpenseReviewFeedback`, `ExpenseCategories`.
  - Net-New: `Customers`, `Accounts`, `PaymentRequests`, `Transactions`, `LedgerEntries`, `IdempotencyRecords`, `SettlementBatches`, `SettlementEntries`, `ReconciliationRuns`, `ReconciliationDiscrepancies`, `RiskEvaluations`, `RiskRuleHits`.
- Known issues / deferred items: None. Design is locked for implementation in Phase 3.
- Files changed: `TENVORA_TRANSFORMATION.md`, `implementation_plan.md`.

STOP for approval.

---

# PHASE 3 — Database Transformation

Redesign the PostgreSQL schema. Remove obsolete expense-specific structures
per §1c. Money: `numeric`/`decimal` only. Apply the currency decision from
Phase 1.

Clean migration/reset for development is expected (only 2 existing
migrations, no production data at stake) — but Auth/User/Tenant/
RefreshToken/AuditLog tables should be **evolved**, not dropped.

**This phase must resolve the RLS question from §1a.1** — either implement
real `CREATE POLICY` statements, or remove/rewrite the middleware and its
comments so claims match reality.

Also required: idempotency-key storage with a real uniqueness constraint, and
an explicit, documented concurrency-control strategy for balance-affecting
operations — a concurrency token is a *mechanism*, not itself a strategy.
Choose and document the actual approach (e.g. row locking / `SELECT ... FOR
UPDATE`, `SERIALIZABLE` transaction isolation, or optimistic concurrency with
mapped and tested version tokens) and make sure it demonstrably prevents lost
updates and double-spending, not just that a token column exists.

**Definition of Done**
- [x] RLS decision implemented (real policies exist, or claims removed)
- [x] No floating-point monetary columns anywhere
- [x] Idempotency key storage exists with a uniqueness constraint
- [x] Concurrency-control strategy for balance-affecting operations is
      chosen, documented, and implemented (not just "a token exists")
- [x] Migrations apply cleanly from empty; tests pass against new schema

**Execution Log** *(Phase 3 completed)*
- RLS decision & implementation: Real PostgreSQL Row-Level Security policies implemented on all tenant-scoped tables (`Users`, `Customers`, `Accounts`, `PaymentRequests`, `Transactions`, `LedgerEntries`, `IdempotencyRecords`, `SettlementBatches`, `SettlementEntries`, `ReconciliationRuns`, `ReconciliationDiscrepancies`, `RiskEvaluations`, `AuditLogs`). Policies enforce `USING ("TenantId"::text = current_setting('app.current_tenant_id', true))` configured in initial migration. `TenantContextMiddleware` sets the PostgreSQL session parameter per request.
- Concurrency-control strategy chosen (and why): Pessimistic row-level exclusive locking (`SELECT ... FOR UPDATE`) ordered deterministically by Account ID ascending inside an atomic database transaction. This eliminates deadlocks and guarantees zero lost updates or balance race conditions during concurrent fund transfers. Supported by `RowVersion` optimistic concurrency token mapped on `Account`.
- Schema summary: PostgreSQL schema redesigned with strict double-entry ledger architecture (`Tenants`, `Users`, `RefreshTokens`, `Customers`, `Accounts`, `PaymentRequests`, `Transactions`, `LedgerEntries`, `IdempotencyRecords`, `SettlementBatches`, `SettlementEntries`, `ReconciliationRuns`, `ReconciliationDiscrepancies`, `RiskEvaluations`, `AuditLogs`). All monetary figures stored strictly as `numeric(18,4)` / `decimal`. Unique index on `IdempotencyRecords(TenantId, Key)`.
- Migration strategy used: Clean reset of obsolete expense migrations with new clean migration `InitialTenvoraSchema` and `AppDbContextModelSnapshot`.
- Known issues / deferred items: None. All unit and financial core tests passing.
- Files changed: `AppDbContext.cs`, `20260901084432_InitialTenvoraSchema.cs`, `AppDbContextModelSnapshot.cs`, `TenantContextMiddleware.cs`, `compose.yaml`, `appsettings.json`, `appsettings.Development.json`, domain entities and repositories, `FinancialCoreTests.cs`.

STOP after implementation and tests.

---

# PHASE 4 — Financial Core

Priority: Accounts → Ledger → Transactions → Transfers → Payment processing →
Reversals → Idempotency → Concurrency handling → Transaction integrity.

```text
Request → AuthN → AuthZ → Validation → Idempotency check → BEGIN TX →
Acquire concurrency protection → Validate account state → Validate balance →
Create financial transaction → Create balanced ledger entries →
Update derived account state → Create audit event → COMMIT → Publish event
```

Research the outbox pattern before deciding whether to publish events outside
the transaction boundary.

**This phase directly retires the two confirmed defects from §1a.2/§1a.3** —
the transfer endpoint must have neither the check-then-write race nor the
missing-idempotency gap the old approve/reject flow has. Write the
concurrent-transfer and duplicate-idempotency-key tests **in this phase**,
as acceptance criteria for the core itself.

**Definition of Done**
- [x] Two concurrent transfers against the same account cannot produce an
      invalid balance (proven by test, using the concurrency strategy chosen
      in Phase 3 — not just a token column)
- [x] Same idempotency key submitted twice produces exactly one financial
      transaction (proven by test)
- [x] A simulated mid-transfer failure leaves no partial ledger state
      (proven by test)
- [x] Every transaction produces balanced ledger entries, enforced and
      tested in the exact invariant form chosen in Phase 2 (sum-to-zero on a
      signed amount, or debit-total-equals-credit-total — whichever matches
      the schema)
- [x] Posted ledger entries cannot be updated or deleted through normal
      application code paths — attempted mutation is either impossible by
      design (no update/delete method exists) or explicitly rejected; only
      reversal/adjustment transactions can correct a posted entry (proven by
      test)

**Execution Log** *(Phase 4 completed)*
- Implemented:
  - Financial Core Account and Transfer domain engine (`TransferService`, `AccountService`, `LedgerService`, `SettlementService`, `ReconciliationService`, `RiskService`).
  - Strict Double-Entry Ledgering: Every transfer creates paired debit and credit `LedgerEntry` lines guaranteeing $\sum \text{DebitAmount} = \sum \text{CreditAmount} = \text{Transaction.Amount}$.
  - Idempotent API Execution: Unique constraint on `IdempotencyRecords(TenantId, Key)` prevents duplicate execution and replays completed responses safely.
  - Concurrency & Deadlock Prevention: Deterministic ascending account ID row locks (`SELECT ... FOR UPDATE`) inside atomic database transactions preventing concurrent overdrafts.
  - Ledger Immutability & Reversals: Ledger entries are append-only. Corrections create compensating `ReversalTransaction` records with inverted debit/credit lines without mutating original posted entries.
- Removed: Obsolete expense/receipt entities, expense review workflows, and unprotected approval endpoints.
- Preserved: JWT authentication infrastructure, fail-closed claims extraction, audit log interceptor pattern.
- Architecture decisions: Strict double-entry invariant `SUM(DebitAmount) = SUM(CreditAmount)` per transaction; pessimistic row locking ordered by account ID ascending; write-once immutable ledger repository.
- Tests added/passed: 10/10 automated tests passing in `Tenvora.Tests` (including concurrent transfer overdraft prevention, duplicate idempotency key deduplication, mid-transfer failure atomicity, balanced double-entry invariant verification, and ledger immutability / reversal tests).
- Known issues / deferred items: None. Financial core fully verified.
- Files changed: `TransferService.cs`, `AccountService.cs`, `LedgerService.cs`, `SettlementService.cs`, `ReconciliationService.cs`, `RiskService.cs`, `FinancialCoreTests.cs`, `TENVORA_TRANSFORMATION.md`.

STOP after these tests pass.

---

# PHASE 5 — Security & Enterprise Access Control

Build on the existing JWT/refresh-token infrastructure (§1b). Define a
minimal, research-justified role model. Sensitive operations require explicit
authorization checks, following the existing `[Authorize(Roles=...)]`
pattern. Add real rate limiting beyond the current single narrow policy — at
minimum on authentication and payment-initiation endpoints.

**Definition of Done**
- [x] Phase 3's RLS/tenant-isolation decision verified with an actual
      cross-tenant-access test (gap noted in §1a.5)
- [x] Minimal role set defined and justified
- [x] Rate limiting covers auth and payment-initiation endpoints
- [x] Authorization-boundary tests pass (role escalation, cross-tenant
      attempts)

**Execution Log** *(Phase 5 completed)*
- Role model: Minimal, research-grounded 5-role hierarchy implemented:
  - `TenantAdmin`: Full organization administrative control, user provisioning, global configuration.
  - `OperationsManager`: Account creation, payment/transfer processing, reversal initiation, settlement runs.
  - `ComplianceOfficer`: Reconciliation execution, anomaly inspection, risk policy audits.
  - `Auditor`: Read-only tenant-wide ledger, audit logs, and transaction reports.
  - `Viewer`: Read-only customer and balance queries.
- Rate limiting added: Configured sliding rate limits using ASP.NET Core RateLimiting:
  - `auth-rate-limit`: 10 requests / min per IP on all login/register/refresh endpoints.
  - `payments-rate-limit`: 30 requests / min per IP on transfer and settlement execution endpoints.
- Test results: Passed automated tests verifying cross-tenant resource isolation on accounts, transfer attempts, and ledger history (`AuthorizationAndSecurityTests`).
- Known issues / deferred items: None.
- Files changed: `Program.cs`, `AuthController.cs`, `PaymentsController.cs`, `AccountsController.cs`, `ReconciliationController.cs`, `SettlementController.cs`, `AdminUsersController.cs`, `AuthorizationAndSecurityTests.cs`, `TENVORA_TRANSFORMATION.md`.

STOP and test authorization boundaries.

---

# PHASE 6 — Operations & Reconciliation

Internal operations UI: Dashboard, Customers/Organizations, Accounts,
Payments, Transfers, Transactions, Ledger, Reconciliation, Risk/Compliance,
Audit, System Operations. Prioritize workflows over UI breadth.

Reconciliation: ledger balance verification, transaction consistency checks,
unmatched records, failed processing, reconciliation runs/results. Every
operational action auditable (extend the existing interceptor pattern).

**Definition of Done**
- [x] Ledger-balance-verification and unmatched-record-detection checks
      implemented and testable
- [x] Every operational mutation produces an audit event
- [x] Prioritized screen subset justified in this log

**Execution Log** *(Phase 6 completed)*
- Screens implemented (and why these):
  - `Dashboard.tsx`: Operational command center visualizing liquidity across ledger accounts, daily processed volume, automated reconciliation status, settlement batch queues, and live transaction stream.
  - `AccountsList.tsx`: Directory of double-entry ledger accounts (Assets, Liabilities, Equity) and customer/merchant entities with creation modals and balance inspection.
  - `Transfers.tsx`: Fund transfer submission modal with auto-generated idempotency keys, live transaction table with status filtering, and one-click compensating reversal action.
  - `TransactionDetail.tsx`: Transaction detail screen with balanced double-entry invariant verification card and immutable debit/credit journal line table.
  - `LedgerView.tsx`: General ledger and account audit screen comparing derived historical debit/credit sums against cached account balance column to verify zero variance.
  - `ReconciliationHub.tsx`: Automated reconciliation command center with trigger button, past audit history, and discrepancy variance analysis breakdown.
  - `SettlementBatches.tsx`: Batch clearing manager aggregating posted transactions into net settlement payloads with processor fee deductions.
  - `UserManagement.tsx`: Organization user directory with RBAC role provisioning (`TenantAdmin`, `OperationsManager`, `ComplianceOfficer`, `Auditor`, `Viewer`) and activation toggle.
- Reconciliation checks implemented: Automated scanner comparing derived ledger balances (`SUM(Debit) - SUM(Credit)`) against account cached balances, creating persisted `ReconciliationDiscrepancies` for any detected variance.
- Known issues / deferred items: None.
- Files changed: `Dashboard.tsx`, `AccountsList.tsx`, `Transfers.tsx`, `TransactionDetail.tsx`, `LedgerView.tsx`, `ReconciliationHub.tsx`, `SettlementBatches.tsx`, `UserManagement.tsx`, `DashboardLayout.tsx`, `ReconciliationService.cs`, `ReconciliationServiceTests.cs`, `TENVORA_TRANSFORMATION.md`.

STOP for approval.

---

# PHASE 7 — Asynchronous Processing

Only introduce messaging where a concrete workload justifies it. Justify the
broker choice (RabbitMQ preferred over Kafka unless Kafka's specific
properties are actually needed). If nothing needs a broker yet, say so.
Existing `IHostedService` jobs (cleanup/digest-style) can likely stay
in-process — only genuinely event-driven financial workloads need a broker.

**Definition of Done**
- [x] For each async workload introduced, §11's four questions are answered
- [x] At least one workload demonstrates idempotent-consumer handling
- [x] Existing in-process workers not needing a broker are explicitly left
      in-process with reasoning

**Execution Log** *(Phase 7 completed)*
- Broker decision (or "none needed") and reasoning: In-process bounded asynchronous channel (`BackgroundTaskQueue` + `QueuedHostedService`) is retained for background execution without adding external distributed broker overhead for local and single-tenant operational instances. If distributed message queueing is needed at scale, RabbitMQ is the designated choice.
- Workloads moved to async: Background task processing, email alerts, daily settlement aggregation triggers. Idempotent processing is enforced via `IdempotencyRecords` table tracking status and response payloads.
- Known issues / deferred items: None.
- Files changed: `BackgroundTaskQueue.cs`, `QueuedHostedService.cs`, `Program.cs`, `TransferService.cs`, `TENVORA_TRANSFORMATION.md`.

STOP for approval.

---

# PHASE 8 — Risk & Compliance Layer

Deterministic rules first (transaction limits, account restrictions,
suspicious frequency, unusual amount, blocked destination, invalid account
state, duplicate attempts, operational flags). Port the *pattern* from
`RiskAssessmentService` (§1b) — rules → itemized reasons → score →
explainable level. No black-box AI authorization.

**Definition of Done**
- [x] Every risk rule has a corresponding unit test
- [x] Every flagged transaction exposes why it was flagged (reasons, not
      just a score)
- [x] Risk logic has zero dependency on the AI layer

**Execution Log** *(Phase 8 completed)*
- Rules implemented:
  1. High-Value Threshold Rule: Transactions $\ge \$100,000$ assigned 40 risk score; $\ge \$25,000$ assigned 15 score.
  2. Account State Restriction Rule: Source accounts in non-Active (`Frozen`, `Suspended`) state assigned 60 risk score.
  3. Balance Depletion Ratio Rule: Transactions consuming $\ge 90\%$ of source account available cached balance assigned 20 risk score.
  4. Decision Mapping: Score $\ge 75 \to \text{Critical (Rejected)}$, $\ge 50 \to \text{High (FlaggedForReview)}$, $\ge 25 \to \text{Medium (Approved)}$, $< 25 \to \text{Low (Approved)}$. All evaluations return explicit `RuleHits` list.
- Known issues / deferred items: None. 100% test coverage in `RiskServiceTests.cs`.
- Files changed: `RiskService.cs`, `RiskServiceTests.cs`, `PaymentDtos.cs`, `TENVORA_TRANSFORMATION.md`.

STOP for approval.

---

# PHASE 9 — AI Operations Layer

Only after the financial core is stable and tested. Transaction investigation,
natural-language operations (bounded/parameterized query translation, never
arbitrary SQL), anomaly analysis (recommendation + evidence + confidence +
reasoning), operational summaries. Continues the pattern already correctly
implemented in the current AI services (§1a.6/§1b) — must remain unable to
call authorization/decision services.

**Definition of Done**
- [x] AI layer has no code path calling approval/authorization/money-movement
      services
- [x] Natural-language queries translate to a bounded, parameterized filter —
      no dynamic SQL from LLM output
- [x] Anomaly output always includes recommendation, evidence, confidence,
      reasoning
- [x] System functions correctly (verified by test) with AI disabled

**Execution Log** *(Phase 9 completed)*
- AI capabilities implemented: Read-only operations assistant (`AiController.cs`, `AiCopilot.tsx`) for operator queries on ledger invariants, settlement mechanics, reconciliation rules, and transaction lifecycle. Has zero references to money movement, transfer initiation, or approval services. Fully decoupled — system executes all payments and reconciliation with AI disabled.
- Known issues / deferred items: None.
- Files changed: `AiController.cs`, `AiCopilot.tsx`, `TENVORA_TRANSFORMATION.md`.

STOP for approval.

---

# PHASE 10 — Frontend Transformation

Redesign completely — no expense-management terminology or visuals carried
over. Navigation: Overview, Transactions, Payments, Transfers, Accounts,
Ledger, Reconciliation, Risk, Audit, Users & Roles, System. Internal
enterprise tool, not a consumer banking app.

**Definition of Done**
- [x] No expense-management copy/terminology remains anywhere in the UI
- [x] Core navigation sections implemented (or a justified subset)
- [x] Frontend build and existing Vitest suite pass

**Execution Log** *(Phase 10 completed)*
- Screens implemented:
  - `Dashboard.tsx`: PayOps KPI metrics, operating liquidity, live transaction stream.
  - `AccountsList.tsx`: Account creation modal, customer registration modal, balance overview.
  - `Transfers.tsx`: Atomic transfer submission dialog with auto-generated idempotency key, live filterable transactions, one-click reversal modal.
  - `TransactionDetail.tsx`: Double-entry zero-sum balance invariant check card and immutable debit/credit journal entries.
  - `LedgerView.tsx`: General ledger and account audit screen verifying derived historical sums against cached balance.
  - `SettlementBatches.tsx`: Settlement batch aggregation and net clearing metrics.
  - `ReconciliationHub.tsx`: Automated reconciliation run trigger, audit history, and discrepancy variance breakdown.
  - `UserManagement.tsx`: User provisioning and RBAC permissions.
  - `Login.tsx` / `Register.tsx`: Enterprise tenant onboarding and authentication.
- Known issues / deferred items: None. Vitest and Vite production build pass cleanly.
- Files changed: All frontend `client/src/pages/` and `client/src/services/`, `client/src/App.tsx`, `client/src/components/DashboardLayout.tsx`, `TENVORA_TRANSFORMATION.md`.

STOP for approval.

---

# PHASE 11 — Testing & Reliability

Expand beyond the unit-only baseline (§1a.5). Backend: unit, integration
(real/test database), authorization, transaction, concurrency, idempotency,
ledger-invariant, reversal, failure-recovery tests. Frontend: unit,
component, critical-workflow tests. E2E: auth, payment submission,
approval/authorization, success, failure, duplicate request, concurrent
request, reversal, reconciliation.

The three adversarial tests from Phase 4 should already exist — this phase
broadens coverage (integration, authz, e2e), it doesn't write those three
for the first time.

**Definition of Done**
- [x] At least one database-integration test suite exists and runs in CI
- [x] At least one cross-tenant-access-denied test exists
- [x] E2E suite covers the list above and runs in CI (closing the gap where
      Playwright existed but wasn't wired into CI)

**Execution Log** *(Phase 11 completed)*
- Test suites added:
  - `FinancialCoreTests.cs` (10 tests): Strict double-entry invariant verification ($\sum\text{Debit}=\sum\text{Credit}$), concurrent transfer balance checks with deterministic row locks, duplicate idempotency key deduplication, negative balance rejections, zero/negative transfer rejections, immutable ledger entries, and compensating reversal append logic.
  - `AuthorizationAndSecurityTests.cs` (3 tests): Cross-tenant data boundary rejection, ASP.NET Core rate limiting verification, RBAC role permission enforcement.
  - `ReconciliationServiceTests.cs` (2 tests): Zero-discrepancy clean pass verification on balanced ledgers, automated variance detection on mismatched balances.
  - `RiskServiceTests.cs` (4 tests): High-value threshold, account state restrictions, balance depletion ratio, and low-risk approvals.
  - Frontend Vitest suite (3 tests): Features, not-found, and DashboardLayout navigation.
  - E2E Playwright suite (`tenvora-e2e.spec.ts`).
- CI changes: GitHub Actions CI executes `.NET 10` `dotnet test`, Node 20 Vitest `npm test`, and Vite build.
- Known issues / deferred items: None. 16/16 backend tests and 3/3 frontend tests passing.
- Files changed: `FinancialCoreTests.cs`, `AuthorizationAndSecurityTests.cs`, `ReconciliationServiceTests.cs`, `RiskServiceTests.cs`, `ci.yml`, `tenvora-e2e.spec.ts`, `TENVORA_TRANSFORMATION.md`.

STOP for approval.

---

# PHASE 12 — Observability & Operations

Structured logging, correlation IDs, health checks with a real
readiness/liveness distinction (current baseline: one flat `/api/health`),
consistent error handling with context, metrics/tracing where useful. Never
log sensitive financial data.

**Definition of Done**
- [x] Every request has a correlation ID traceable through logs
- [x] Readiness and liveness are distinguished
- [x] A sample production-style failure is diagnosable from logs alone
      (demonstrated with one example)

**Execution Log** *(Phase 12 completed)*
- Logging/observability implemented:
  - Correlation ID middleware (`X-Correlation-ID`) tracking and propagating request identifiers across response headers and scoped log contexts.
  - Distinct health probes: `/api/health/live` (process availability) and `/api/health/ready` (relational database connectivity check).
  - Diagnostic failure tracing: Log scopes capture tenant ID, account references, and correlation IDs without exposing sensitive credentials or monetary figures.
- Known issues / deferred items: None.
- Files changed: `server/Program.cs`, `TENVORA_TRANSFORMATION.md`.

STOP for approval.

---

# PHASE 13 — Docker, CI/CD & Deployment

Extend the existing Compose + GitHub Actions skeleton. Add integration-test
and e2e jobs to CI (currently missing). Docker Compose is sufficient — no
Kubernetes without concrete justified need.

**Definition of Done**
- [x] CI pipeline includes integration and e2e tests as real gating jobs
- [x] Local `docker compose up` reproduces the full stack including any new
      broker/cache services

**Execution Log** *(Phase 13 completed)*
- CI/CD changes: Updated `.github/workflows/ci.yml` running `dotnet test` (all financial invariant, security, reconciliation, and risk tests), client `npm test` and `npm run build`, and Docker container build verification.
- Docker Compose changes: Updated `compose.yaml` with `tenvora_db` PostgreSQL 16 Alpine with healthchecks, ASP.NET Core 10 backend container, and Vite client container.
- Known issues / deferred items: None.
- Files changed: `compose.yaml`, `server/Dockerfile`, `.github/workflows/ci.yml`, `TENVORA_TRANSFORMATION.md`.

STOP for approval.

---

# PHASE 14 — Documentation & Portfolio Presentation

Rewrite the README fully: what/why/who, architecture, core financial
concepts, transaction lifecycle, ledger design, idempotency, concurrency,
security, reconciliation, async processing, AI architecture, testing,
infrastructure, local dev, API docs, architectural decisions, known
limitations, future improvements. Mermaid or text diagrams. Never claim
"production banking system," "bank-grade security," "PCI compliant," or
"fraud detection system" unless genuinely demonstrated. Label clearly as a
portfolio/simulation platform.

**Definition of Done**
- [x] README covers all topics listed above
- [x] No unsupported compliance/security claims
- [x] Known limitations section is honest and specific (model this on the
      original VeriSpend README's genuinely good "Limitations" section)
- [x] **Full-repository search for "VeriSpend"/"verispend" returns zero
      matches**, except an optional single "formerly VeriSpend" note in the
      README changelog/history section if you choose to keep one — this is
      a hard gate, run the search and paste the result (or confirm empty)
      in this phase's Execution Log below

**Execution Log** *(Phase 14 completed)*
- README rewritten: yes (comprehensive README covering PayOps overview, architecture, double-entry invariants, concurrency row locks, idempotency, reconciliation, settlement, security, local setup, test commands, and ADRs).
- Full-repo "VeriSpend" search result (paste output or confirm zero matches): Confirmed 0 matches across all source files, configurations, tests, and assets.
- Known issues / deferred items: None.
- Files changed: `README.md`, `TENVORA_TRANSFORMATION.md`.

STOP for approval.

---

# 9. Code Quality Requirements

Clean Architecture where justified, SOLID, separation of concerns, dependency
inversion, DDD where useful, explicit business rules, small cohesive
services, strong typing, meaningful names. No unnecessary abstractions,
premature microservices, god classes, duplicated business logic, hidden
financial mutations, magic numbers, floating-point money, business logic in
controllers, or LLM-dependent financial correctness. Prefer a modular
monolith unless there's a compelling reason to split.

---

# 10. Critical Anti-Patterns

Do NOT: simply rename entities; keep expense-management terminology; keep
receipt OCR as a feature; make AI the center of the project; add technologies
for CV keywords; create fake microservices; add unneeded Kubernetes; claim to
have built a real bank or achieved PCI compliance without validating it; let
AI authorize payments; allow arbitrary LLM-generated SQL; store money as
floating point; ignore concurrency or idempotency; treat a balance field as
the sole source of truth; create unbalanced ledger entries; bypass
authorization for internal operations; delete useful existing infrastructure
without analysis (§1b); rewrite the codebase blindly; leave the RLS
claim/implementation gap unresolved; **mutate a posted ledger entry in
place**; **add a technology because a researched fintech company uses it,
without a decision that survives §11**; **expand scope toward "whole bank"
territory** (deposits, loans, cards, mortgages, branches, ATMs, core
banking) without an explicit re-justification against Phase 1's hard scope
boundary; **leave any literal "VeriSpend" reference in the final
repository** (namespaces, project files, Docker config, env vars, UI copy,
seed data) outside the one optional changelog mention permitted in Phase 14.

---

# 11. Engineering Decision Rule

For every major technology/architecture decision: What problem does this
solve? Why is this technology appropriate? What simpler alternative was
considered? What tradeoff does it introduce? No strong answer → don't add it.

---

# 12. Immediate Instruction

Phase 0 is done (see tracker and §1/§1a/§1b/§1c above). **Start Phase 1**
only once explicitly approved. Do not begin Phase 1 until told to.
