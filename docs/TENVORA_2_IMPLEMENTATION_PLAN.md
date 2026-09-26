# Tenvora implementation status

## Product

Tenvora is a generic business-management system for small and local businesses. The first customer validated the workflow, but no business-specific concepts are encoded in the domain.

## Active domain

```text
Tenant
├── Users
├── Customers → Sales → Sale items → Customer payments
├── Products and services
├── Suppliers → Purchases → Purchase items → Supplier payments
└── Business expenses
```

All business-owned records are tenant-scoped. Composite foreign keys prevent cross-tenant relationships, API queries include tenant predicates, and PostgreSQL row-level policies provide defense in depth.

## Implemented workflows

- Customer creation, editing, search, balance, and history
- Product/service creation, editing, and search
- Multi-item sales with server-calculated totals
- Initial and later append-only customer payments
- Supplier creation, editing, search, balance, and history
- Multi-item purchases with server-calculated totals
- Initial and later append-only supplier payments
- Simple categorized expenses
- Daily dashboard with sales, payments, purchases, expenses, balances, and recent activity
- Tenant administration and audit history

## Financial rules

- Money uses `decimal` / PostgreSQL `numeric(18,4)`.
- The server calculates line totals, transaction totals, and balances.
- Idempotency keys protect financial mutations from duplicate submission.
- Payments cannot exceed the remaining balance.
- Related writes run atomically and are serialized per tenant on PostgreSQL.
- The database and deterministic application services are the source of truth.

## Migration strategy

The repository contains one clean baseline migration for the current business platform. Earlier product schemas are not retained.

## Next milestone

Improve global search, date filtering, sorting, customer history, supplier history, and expense history before adding any AI interaction layer.
