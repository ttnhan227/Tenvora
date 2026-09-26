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

## Technology

- React, TypeScript, Vite, TanStack Query, and Playwright
- ASP.NET Core and Entity Framework Core
- PostgreSQL with row-level tenant policies
- JWT authentication and role-based authorization

## Run locally

Configure the required values in `.env`, then start the stack:

```sh
docker compose up --build
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
```

## Product rule

The database and deterministic application services are the source of truth. Tenvora is a business-management tool, not a bank or a complete accounting system.
