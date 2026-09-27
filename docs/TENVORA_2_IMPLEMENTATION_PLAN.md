# Tenvora 2.0 AI-native workspace

## Product rule

Tenvora AI is a native interface to the application layer. It interprets an
intent and returns a bounded decision, while deterministic application services
remain responsible for authorization, validation, idempotency, transactions,
and database writes.

```text
Normal UI ───────┐
                 ├─> Business services -> validation/idempotency -> database
AI action tools ─┘
       ^
intent -> contextual retrieval -> server-owned proposal -> confirmation
```

The model has no SQL, code execution, filesystem, or unrestricted API tool.
Database values—not conversation memory—are the source of truth.

## Implemented capability map

### Grounded reads

- Live dashboard, customer balances, unpaid-customer lists, current-customer
  questions, sales totals for today/week/month, purchase/payable totals,
  expense totals and largest expenses, recent transaction history, and customer
  search.
- Structured page context carries route, selected entity ID, and filters.
- Follow-ups can resolve the last confirmed AI-created record (for example,
  “cancel the sale I just created”) from persisted action results rather than
  trusting model memory.
- Retrieval is intent-specific; the whole tenant database is never copied into
  a model prompt.
- Missing entities produce an explicit not-found or clarification response.

### Typed mutations

- Create customers, products, suppliers, expenses, sales, and purchases.
- Record customer and supplier payments.
- Update or archive customers, products, and suppliers.
- Void unpaid sales and purchases; financial records with payments are rejected
  by the domain service rather than silently rewritten.
- Change workspace currency through the existing settings service, restricted
  to workspace administrators.
- Financial actions can combine creation and an initial payment in the same
  application-service transaction (for example, create a purchase and mark it
  paid).

Every mutation is represented by a narrow `AiInterpretedAction` contract and
then resolved to tenant-owned entity IDs before a proposal can be persisted.
The LLM output never becomes a database command.

### Decision and confirmation lifecycle

```text
POST /api/ai/assistant/actions/propose
  { text, uiContext }
        |
        +-- NeedsClarification (no action ID and no write)
        |
        `-- PendingConfirmation (15-minute server-owned action ID)

POST /api/ai/assistant/actions/{id}/confirm
  { confirmed: true | false }
        |
        +-- Cancelled (no business write)
        `-- Revalidate -> application service -> Executed / Failed
```

The UI supports confirmation cards, Confirm/Cancel buttons, and conversational
`yes`/`no` replies. Ambiguous entity matches are presented as selectable choices.
Successful execution invalidates workspace queries, so visible pages refresh
without a manual reload.

Repeated confirmation of an executed action returns its stored result and does
not duplicate a financial record. Proposal ownership is bound to both tenant and
initiating user, and proposals expire after 15 minutes.

## Risk and authorization policy

| Action class | Behavior |
| --- | --- |
| Read-only retrieval | Runs immediately against live application data |
| Reversible object create/update/archive | Structured preview and confirmation |
| Financial action | Financial-risk preview, confirmation, live revalidation |
| Void/destructive action | Destructive-risk preview and confirmation |
| Workspace setting | Administrator-only preview and confirmation |

The assistant endpoints and execution layer both enforce workspace roles.
`ReadOnly` users can ask grounded questions but cannot obtain or execute mutation
tools. Administrator-only actions are checked at proposal time and again at
confirmation time. The client role treatment is explanatory UX, not the security
boundary.

## Audit model

`AiAction` stores the initiating tenant/user, original request, intent, risk,
structured payload, status, expiry, confirmation time, execution time, affected
entity, idempotency key, and stored result. Normal entity audit entries add:

- `Origin = AI`
- initiating `UserId`
- `AiActionId`
- whether confirmation was required and given
- normal before/after serialized values from the shared audit interceptor

This keeps AI-created records inside the ordinary business and audit model; there
is no parallel AI ledger.

## Reliability boundaries

- Confidence never bypasses deterministic entity resolution or validation.
- Unknown and duplicate entity names stop for clarification.
- Amount, quantity, payment, active-state, tenant ownership, and currency rules
  are checked by existing business services.
- Financial writes retain existing transaction scopes and PostgreSQL advisory
  locking.
- Existing business idempotency keys are derived from the server-owned action ID.
- Confirmation transmits only the action ID; editable amounts are not resubmitted
  by the browser as execution authority.
- Failed, cancelled, expired, executing, and executed states are explicit.
- Partial financial failures do not get reported as success.

## Extension rule

New abilities must be added as explicit intent contracts and application tools,
not by broadening model access. A capability is ready only when its ambiguity,
role, confirmation, idempotency, audit, failure, and UI-refresh cases are covered
by automated tests.
