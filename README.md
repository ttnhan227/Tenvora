# Tenvora — freelancer finance workspace

Tenvora is a freelancer cash-flow workspace. It connects invoices to confirmed
income, records a configurable tax-reserve estimate, and calculates an
estimated safe-to-spend balance from workspace records. Tenvora AI adds concise,
context-aware explanations using the signed-in user's current data. It has a
React/Vite frontend, an ASP.NET Core API, and PostgreSQL persistence.

> **Current scope:** Tenvora is not a bank, money transmitter, tax adviser,
> or production payment processor. Bank cash-outs, real ACH/card settlement,
> customer-support delivery, and outbound email are not integrated.

## Core workflow

1. Add a client and create an invoice.
2. Export a CSV statement from a bank or payment platform.
3. Import it in **Income**. The browser parses the file locally and suggests
   matches from amount, currency, invoice reference, and client name.
4. Confirm a recognized deposit. Tenvora records the payment and balanced
   ledger entries; the raw CSV is not uploaded or stored.
5. When enabled, the saved reserve percentage is recorded as an internal tax
   planning allocation. The remaining operating record powers the estimated
   safe-to-spend view.

## Implemented capabilities

- Registration, login, access-token refresh, logout, and protected routes.
- Tenant-scoped users with `TenantAdmin`, `OperationsManager`,
  `ComplianceOfficer`, and `ReadOnly` roles.
- Client records and invoice creation, sending state, partial/full payment
  recording, and invoice statistics.
- Internal multi-currency asset accounts, account-to-account transfers,
  idempotency keys, reversals, and transaction history.
- Double-entry journal records and cached-balance reconciliation.
- Private browser-side CSV statement parsing and reviewed invoice matching.
- Tax-reserve settings, internal planning allocations, and estimated schedules.
- Tenant-scoped Tenvora AI summaries across the main workspace and a dedicated
  assistant with a deterministic fallback when an external model is unavailable.
- Audit records, health/readiness endpoints, Swagger, rate limiting, and
  correlation IDs.

External bank movement, card/ACH processing, real tax filing, real email,
and automatic bank synchronization are not implemented.

## Tenvora AI behavior

Tenvora AI reads tenant-scoped clients, invoices, confirmed income, accounts,
and tax-reserve records from PostgreSQL. In-page summaries are generated once
per page and user during a browser session, then reused from `sessionStorage` on
reload or return navigation. The cache contains the generated summary, not bank
credentials or an uploaded statement. Closing the browser session clears it.

The server can use an optionally configured AI provider. If that provider is
missing or unavailable, Tenvora returns a deterministic workspace analysis.
Provider and model names are intentionally not exposed in the product UI.
Tenvora AI cannot move funds or modify financial records, and its tax and
safe-to-spend figures remain planning estimates.

## Architecture

```text
React 18 + TypeScript + Vite
              |
              | JSON/HTTP + JWT
              v
ASP.NET Core 10 API
              |
              | EF Core / Npgsql
              v
PostgreSQL 16+
```

Financial writes use PostgreSQL transactions, tenant-scoped advisory locks,
deterministic account row locking, idempotency records, and balanced journal
entries. Reversals append compensating records rather than editing the original
journal.

Application queries explicitly include tenant predicates. The migrations also
create PostgreSQL RLS policies, but the supplied Compose stack connects as the
PostgreSQL superuser, which bypasses RLS. Treat application predicates as the
effective boundary in this reference deployment. A production deployment must
use a restricted application role and verify RLS independently before claiming
database-enforced tenant isolation.

## Prerequisites

- .NET SDK 10
- Node.js 20 or newer
- PostgreSQL 16 or newer, or a running Docker engine with Compose

## Configuration

Create the local configuration file before starting either workflow:

```bash
cp .env.example .env
```

Replace every `your_...` placeholder. In particular, use a unique PostgreSQL
password, JWT secret of at least 32 bytes, tenant API key, and seed-user
passwords. `.env` is ignored by Git.

The example uses `localhost` for direct `dotnet run`. Compose constructs a
container-only connection string using the service hostname `postgres`.

## Docker Compose

With a running Docker engine:

```bash
docker compose config --quiet
docker compose up --build
```

- Frontend: <http://localhost:5173>
- API: <http://localhost:5000>
- Swagger (when `ENABLE_SWAGGER=true`): <http://localhost:5000/swagger>
- Liveness: <http://localhost:5000/api/health/live>
- Readiness: <http://localhost:5000/api/health/ready>

The Compose file refuses to start when required secrets are missing; it no
longer substitutes production-looking default passwords.

## Local development

Start PostgreSQL and ensure the `DATABASE_URL` in `.env` points to
`localhost`. Then run:

```bash
dotnet restore Tenvora.sln
dotnet run --project server/Tenvora.Api.csproj
```

In another shell:

```bash
cd client
npm ci
npm run dev
```

The development UI is served at <http://localhost:5173> and proxies relative
`/api` requests to <http://localhost:5000>. If `VITE_API_BASE_URL` or
`VITE_API_URL` is set, it overrides that proxy.

## Tests and build checks

```bash
dotnet test Tenvora.sln

cd client
npm ci
npm test
npm run lint
npm run build
npm run test:e2e
```

The Playwright suite verifies browser behavior with deterministic API fixtures.
It is not a substitute for running the UI against the real API and PostgreSQL.

## Seed users

Seed identities are controlled by `.env`:

| Variable | Default email | Role |
| --- | --- | --- |
| `SEED_ADMIN_EMAIL` | `admin@tenvora.internal` | `TenantAdmin` |
| `SEED_OPS_EMAIL` | `ops.manager@tenvora.internal` | `OperationsManager` |
| `SEED_COMPLIANCE_EMAIL` | `compliance@tenvora.internal` | `ComplianceOfficer` |

Passwords come only from the matching `SEED_*_PASSWORD` variables. Seeding is
idempotent; changing a seed password does not rotate an already-created user's
password.

## Deployment limitations

Before using Tenvora beyond a controlled demonstration, at minimum:

- replace the superuser database connection with a restricted application role
  and prove RLS enforcement with cross-tenant database tests;
- add database-level journal constraints/immutability controls, or document and
  accept that invariants are currently enforced in the application layer;
- integrate support delivery and outbound email before presenting those flows as live;
- upgrade React Router when a non-breaking remediation path is available, or
  complete and test the required v7 migration;
- configure TLS, secret management, backups, monitoring, and deployment-specific
  CORS origins;
- run the container build and restart/volume workflow in the target environment.

See [docs/PRODUCTION_READINESS_AUDIT.md](docs/PRODUCTION_READINESS_AUDIT.md) for
the latest evidence-based audit results.
