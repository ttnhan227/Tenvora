# Tenvora

Tenvora is a simple business-management system for small and local businesses. It lets an owner record what happened while deterministic server-side logic maintains totals, balances, and history.

The first validation customer is a local supply business, but the product model is intentionally generic.

## Core workflows

- Customers, products, sales, customer payments, and outstanding balances
- Suppliers, purchases, supplier payments, and outstanding balances
- Simple categorized business expenses
- A practical dashboard showing today's activity and money movement
- Searchable customer, supplier, sale, purchase, payment, and expense history
- Tenant-scoped team access and audit history

Customer and supplier payments are append-only records. Financial totals are calculated on the server with decimal values, idempotency protection, atomic writes, and overpayment checks.

## Architecture & Data Integrity

- **Tenant Scoping:** Global query filters on EF Core `DbContext` automatically scope all entity queries to the active tenant ID extracted from verified JWT claims, preventing cross-tenant data exposure.
- **Concurrency & Invariants:** Financial transactions use database row locks (`SELECT FOR UPDATE`) and atomic transaction scopes to prevent race conditions, double-spending, and overpayment.
- **Deterministic Audit Logging:** Entity state transitions generate immutable before/after audit snapshots for compliance and change tracking.
- **Automated Verification:** 97 xUnit unit and integration tests verify ledger balance invariants, tenant boundaries, and payment idempotency.

## Technology

- React, TypeScript, Vite, TanStack Query, and Playwright
- Flutter mobile client for Android and iOS
- ASP.NET Core and Entity Framework Core
- PostgreSQL with tenant scoping
- JWT authentication and role-based authorization

## Run locally

Configure the required values in `.env`, then start the stack:

```sh
docker compose up --build
```

The mobile SDK stays containerized. Generate runners, analyze, and test without installing Flutter on the host:

```sh
docker compose --profile tools run --rm mobile-tools
```

Or run the applications separately:

```sh
dotnet run --project server/Tenvora.Api.csproj
cd client
npm install
npm run dev
```

The API applies pending EF Core migrations at startup.

## Verification

```sh
dotnet test Tenvora.sln
cd client
npm test
npm run lint
npm run build
npm run test:e2e
docker compose --profile tools run --rm mobile-tools
```

## Product rule

The database and deterministic application services are the source of truth. Tenvora is a business-management tool, not a bank or a complete accounting system.
