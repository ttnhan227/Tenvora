# AiAudit Expense Tracker

AiAudit is a multi-tenant expense management app for submitting, reviewing, and auditing company expenses. Receipts can be processed with Mistral AI, while a rule-based risk engine flags claims that need closer review.

- [Live app](https://aiaudit-expensetracker-web.onrender.com)
- [Swagger API](https://aiaudit-expensetracker.onrender.com/swagger)

The API is hosted on Render's free tier, so the first request may take 30–60 seconds.

## Features

- Receipt upload and structured data extraction with Mistral AI
- Draft, submission, approval, and rejection workflow
- Owner, Manager, and Member roles
- Tenant-scoped users, expenses, settings, and reports
- Risk scoring based on spend limits, duplicate claims, missing descriptions, unusual amounts, restricted categories, and submission frequency
- Audit records with before-and-after values
- Manager review queue and analytics
- Auto-approval rules and category budgets
- Email and Slack notifications
- Currency conversion and base-currency reporting
- User invitations and refresh-token rotation
- GDPR export/deletion and compliance reports

## How it works

An employee creates an expense manually or uploads a receipt. AI-extracted fields are shown for confirmation before the expense is saved.

When an expense is created or submitted, the risk service checks it against company limits and recent tenant activity. It returns a score, a risk level, and the reasons behind the result. These rules are kept separate from the AI integration so approval decisions do not depend on an LLM response.

Managers can then approve or reject submitted expenses. Changes to an expense are recorded in the audit log, including the previous and updated values.

## Project structure

```text
client/          React and TypeScript frontend
server/          ASP.NET Core API
server.Tests/    Backend unit tests
.github/         CI and deployment workflows
```

The backend follows a controller → service → repository structure:

```text
HTTP request
    ↓
Controller
    ↓
Business service
    ↓
Repository / EF Core
    ↓
PostgreSQL
```

External integrations such as Mistral, Slack, email, and exchange-rate providers are accessed through interfaces and typed HTTP clients.

## Tenant isolation

Authenticated tokens contain a tenant ID. The API validates this claim and makes it available for the request. Repository queries for tenant-owned data also require a tenant ID, so an expense lookup uses both the expense ID and tenant ID.

The middleware sets a PostgreSQL session value for the current tenant. Database row-level security policies are not enabled yet; adding and testing those policies is listed in the roadmap below.

## Risk assessment

The current risk engine checks for:

- Amounts above or close to the tenant limit
- Restricted expense categories
- Missing business descriptions
- Weekend expenses
- Amounts well above the tenant average
- Matching merchant and amount within 14 days
- Repeated claims in the same category
- Five or more submissions within 24 hours

The result is capped at 100 and classified as Low, Medium, or High. Each result includes readable reasons so a reviewer can understand why an expense was flagged.

## Tech stack

### Backend

- .NET 10 and ASP.NET Core
- Entity Framework Core
- PostgreSQL
- JWT authentication
- xUnit

### Frontend

- React 18 and TypeScript
- TanStack Query
- React Hook Form and Zod
- Tailwind CSS and shadcn/ui
- Vitest and Testing Library

### Deployment

- Docker
- GitHub Actions
- Render

## Run locally

You will need:

- .NET 10 SDK
- PostgreSQL 15 or newer
- Node.js 20 or newer
- A Mistral API key if you want to use receipt extraction

For local development, update `server/appsettings.json` with your PostgreSQL, JWT, and Mistral credentials. This file is tracked by Git, so review it before every commit and never commit real credentials.

Example development configuration:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=AiAuditExpenseTracker;Username=postgres;Password=your_password"
  },
  "JwtSettings": {
    "Secret": "use-a-long-random-secret"
  },
  "MistralSettings": {
    "ApiKey": "your_mistral_key"
  }
}
```

Start the API:

```powershell
dotnet ef database update --project server
dotnet run --project server
```

Start the frontend in another terminal:

```powershell
cd client
npm ci
npm run dev
```

The frontend uses `http://localhost:5291/api` by default. To use another API URL, add this to `client/.env.local`:

```text
VITE_API_BASE_URL=https://localhost:7218/api
```

## Tests

Run the backend tests:

```powershell
dotnet test AiAudit.ExpenseTracker.sln
```

Run the frontend tests and build:

```powershell
cd client
npm test
npm run build
```

GitHub Actions runs the server build and tests, frontend lint/tests/build, and Docker build for pushes and pull requests.

## Current limitations

- Uploaded receipts are stored on the API server's local filesystem.
- Background tasks use an in-process queue rather than a durable message broker.
- PostgreSQL row-level security policies have not been added.
- Approval updates do not yet use optimistic concurrency tokens.
- The frontend needs route-level code splitting and further type/lint cleanup.

## Next steps

- Add integration tests against PostgreSQL for cross-tenant access
- Add and test database row-level security policies
- Move receipt files to object storage
- Use a durable queue for notifications and scheduled work
- Add optimistic concurrency to expense reviews
- Add OpenTelemetry tracing and application metrics

## License

MIT
