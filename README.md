# Tenvora — Enterprise Payment Operations & Immutable Ledger Platform

<p align="center">
  <strong>A resilient, multi-tenant B2B payment operations and transaction processing system with strict double-entry ledger balancing, deterministic row-locking concurrency, automated batch settlements, and continuous discrepancy reconciliation.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/.NET-10.0-512bd4.svg" alt=".NET 10">
  <img src="https://img.shields.io/badge/C%23-13-239120.svg" alt="C#">
  <img src="https://img.shields.io/badge/React-19-61dafb.svg" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178c6.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-16%20RLS-336791.svg" alt="PostgreSQL RLS">
  <img src="https://img.shields.io/badge/Docker-Compose-2496ed.svg" alt="Docker">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
</p>

---

## Executive Summary

Tenvora is an enterprise payment operations (PayOps) and transaction processing platform engineered for high-throughput, audit-grade B2B fund movements. Modern financial systems cannot tolerate race conditions, negative balances from out-of-order execution, or ledger drifts. Tenvora solves these challenges by enforcing relational database constraints, deterministic locking orders, and strict double-entry accounting at the database and service layers.

> [!NOTE]
> **Portfolio / Simulation Scope**: Tenvora is an architectural reference platform demonstrating production-grade distributed financial patterns, double-entry ledger design, and tenant isolation. It is not a licensed banking entity or regulated money transmitter.

---

## Architectural Pillars

```mermaid
graph TD
    Client[React 19 + TypeScript Operations Console] -->|JWT Auth + Rate Limited HTTPS| API[ASP.NET Core 10 Web API]
    API -->|Session Var: app.current_tenant_id| DB[(PostgreSQL 16 Engine)]
    
    subgraph Financial Core
        API --> LockMgr[Deterministic Concurrency Engine]
        LockMgr -->|SELECT ... FOR UPDATE (Account IDs ASC)| DB
        LockMgr --> Idemp[Idempotency Constraint Check]
        Idemp --> Ledger[Double-Entry Invariant Engine]
        Ledger -->|Atomic Post: Debits == Credits| DB
    end

    subgraph Operations & Audit
        API --> Recon[Reconciliation Scanner]
        Recon -->|Derives SUM(Debit)-SUM(Credit) vs Cached| DB
        API --> Settle[Batch Settlement Engine]
        Settle -->|Aggregates Daily Volumes & Net Clearing| DB
        API --> Copilot[Operations Copilot (Read-Only AI)]
    end
```

---

## Core Financial Engine & Ledger Invariants

### 1. Strict Double-Entry Balancing
Every transaction creates at least two immutable ledger entry lines (Source Account Debit/Credit and Destination Account Debit/Credit):
$$\sum \text{DebitAmount} = \sum \text{CreditAmount} = \text{TransactionAmount}$$
- All debit and credit fields are strictly non-negative `numeric(18,4)`.
- Reversals never mutate or delete historical lines; they append compensating inverted journal entries.

### 2. Deterministic Row-Level Concurrency
To prevent deadlocks when concurrent transfers touch overlapping account pairs in reverse order (e.g., Transfer A: Acc 1 $\to$ Acc 2, Transfer B: Acc 2 $\to$ Acc 1):
- Tenvora sorts the account IDs deterministically in ascending order before acquiring pessimistic exclusive database locks (`SELECT ... FOR UPDATE`).
- Transfers execute within an atomic serializable/read-committed transaction.

### 3. Strict Idempotency Guarantees
- Every client payment request requires an `Idempotency-Key` header.
- Enforced at the database layer via unique index `(TenantId, Key)` in `IdempotencyRecords`.
- Replaying the same key returns the exact cached outcome without re-executing ledger mutations.

---

## System Capabilities

| Capability | Technical Mechanism |
| :--- | :--- |
| **Multi-Tenant Isolation** | PostgreSQL Row-Level Security (RLS) policies scoped via `app.current_tenant_id` session setting. |
| **Automated Reconciliation** | Scheduled audit scanner comparing `SUM(LedgerEntries)` against `Accounts.CachedBalance`, persisting variances into `ReconciliationDiscrepancies`. |
| **Batch Settlement** | End-of-day transaction aggregation calculating gross clearing, processor fee deductions, and net payouts. |
| **Deterministic Risk Engine** | Non-AI rules engine evaluating transfer volume thresholds, account operational states, and balance depletion ratios. |
| **Role-Based Access Control** | 5-role enterprise hierarchy: `TenantAdmin`, `OperationsManager`, `ComplianceOfficer`, `Auditor`, `Viewer`. |
| **Observability** | Correlation ID tracking middleware (`X-Correlation-ID`) and distinct `/api/health/live` & `/api/health/ready` probes. |

---

## Directory Structure

```text
Tenvora/
├── server/                      # ASP.NET Core 10 Web API
│   ├── Controllers/             # REST endpoints (Payments, Accounts, Ledger, Recon, Auth)
│   ├── Data/                    # AppDbContext, RLS interceptors, DatabaseSeeder
│   ├── Domain/Entities/         # Financial entities (Transaction, LedgerEntry, Account, Customer)
│   ├── Repositories/            # Data access with FOR UPDATE locking queries
│   ├── Services/                # TransferService, ReconciliationService, SettlementService, RiskService
│   └── Migrations/              # EF Core initial migration with PostgreSQL RLS scripts
├── server.Tests/                # xUnit test suite (16 comprehensive tests)
│   ├── FinancialCoreTests.cs    # Invariant checks, concurrency, idempotency, reversals
│   ├── AuthorizationAndSecurityTests.cs # Cross-tenant isolation, RBAC, rate limiting
│   ├── ReconciliationServiceTests.cs    # Automated discrepancy detection
│   └── RiskServiceTests.cs      # Deterministic risk rules
├── client/                      # React 19 + TypeScript frontend
│   ├── src/pages/dashboard/     # Operations Overview KPI Dashboard
│   ├── src/pages/accounts/      # Accounts & Customer Entities Directory
│   ├── src/pages/payments/      # Transfer initiation modal & Double-entry journal viewer
│   ├── src/pages/ledger/        # General Ledger & Account Audit history
│   ├── src/pages/reconciliation/# Automated Reconciliation Hub & Discrepancy details
│   ├── src/pages/settlements/   # Settlement Batches & Net Clearing
│   ├── src/pages/admin/         # User Management & Enterprise RBAC
│   └── src/services/            # Type-safe Axios API clients
├── .github/workflows/           # GitHub Actions CI (Server test + Client build/test + Docker)
└── compose.yaml                 # Docker Compose full-stack specification
```

---

## Getting Started

### Prerequisites
- [.NET 10 SDK](https://dotnet.microsoft.com/)
- [Node.js 20+](https://nodejs.org/)
- [PostgreSQL 16+](https://www.postgresql.org/) or [Docker Desktop](https://www.docker.com/)

### Quick Start with Docker Compose
```bash
# Clone the repository
git clone https://github.com/tnha/Tenvora.git
cd Tenvora

# Run the complete stack (PostgreSQL + API + Client)
docker compose up --build
```
- Frontend UI: `http://localhost:5173`
- Backend API & Swagger: `http://localhost:8080/swagger`

### Local Development Setup

#### 1. Backend (.NET 10)
```bash
cd server
dotnet restore
dotnet run
```

#### 2. Frontend (Vite + React)
```bash
cd client
npm install
npm run dev
```

#### 3. Run Tests
```bash
# Backend Test Suite
dotnet test

# Frontend Unit Tests
cd client
npm test
```

---

## Seed Credentials (Local Development)

| Email | Password | Role | Description |
| :--- | :--- | :--- | :--- |
| `admin@tenvora.internal` | `AdminPass123!` | `TenantAdmin` | Full administrative access |
| `ops.manager@tenvora.internal` | `AdminPass123!` | `OperationsManager` | Transfer initiation & settlement clearing |
| `compliance@tenvora.internal` | `AdminPass123!` | `ComplianceOfficer` | Risk & audit verification |

---

## Architectural Decision Records (ADRs)

- **ADR-001: Decimal Money Representation**: All currency amounts use `numeric(18,4)` / `decimal` in C# to prevent IEEE-754 floating-point inaccuracies.
- **ADR-002: Deterministic Locking Order**: All multi-account transfer locks acquire row locks in strict ascending `AccountId` order, mathematically eliminating AB-BA deadlocks.
- **ADR-003: Row-Level Security**: Multi-tenancy is enforced natively at the PostgreSQL level via `CREATE POLICY` and `app.current_tenant_id` session settings.
- **ADR-004: Decoupled AI Operations**: Operations Copilot is strictly read-only and has zero authorization to execute money movement or modify accounts.

---

## License

This project is open-source under the [MIT License](LICENSE).
