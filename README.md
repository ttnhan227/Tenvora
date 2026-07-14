# VeriSpend

VeriSpend is a full-stack, multi-tenant platform for AI-assisted expense review, approval, compliance, and audit operations.

## Overview

The application gives Owners, Managers, and Members role-specific workflows across a shared expense lifecycle. Its technically interesting areas include AI-assisted receipt extraction, explainable risk scoring, tenant isolation, approval automation, audit history, compliance reporting, analytics, and notification integrations.

- [Live application](https://aiaudit-expensetracker-web.onrender.com)
- [Swagger API](https://aiaudit-expensetracker.onrender.com/swagger)

The links retain their existing Render service addresses until those external services are renamed. The hosted demo uses a free backend service, so its first response can take approximately one minute after a period without traffic.

## Key features

- JWT authentication, refresh-token rotation, and backend-enforced role authorization
- Tenant-scoped users, expenses, subscriptions, settings, analytics, and audit records
- Manual expense entry and AI-assisted receipt extraction with Mistral AI
- Draft, submission, approval, rejection, and auto-approval workflows
- Explainable risk scoring for limits, duplicates, missing details, unusual amounts, restricted categories, and submission frequency
- Manager review queues, audit insights, budget prediction, and accounting exports
- Category budgets, policy settings, auto-categorization, and currency conversion
- Email, Slack, scheduled digest, and in-app notification workflows
- GDPR export/deletion, SOX audit history, and SOC 2-oriented compliance reporting
- Public health endpoint used to check backend availability from the landing page

## Tech stack

- Backend: .NET 10, ASP.NET Core, Entity Framework Core, JWT Bearer authentication
- Web: React 18, TypeScript, Vite, Axios, TanStack Query, Tailwind CSS, shadcn/ui
- Data: PostgreSQL and Entity Framework Core migrations
- AI and integrations: Mistral AI, SendGrid/SMTP, Slack, and exchange-rate providers
- Testing/CI: xUnit, Vitest, Testing Library, ESLint, Docker, and GitHub Actions

## Architecture

```text
React client --> ASP.NET Core REST API --> PostgreSQL
                       |
                       +--> Mistral AI / exchange rates
                       +--> Email / Slack notifications
```

HTTP controllers delegate business rules to services, which use repositories and Entity Framework Core for persistence. DTOs define public API contracts, JWT claims establish user and tenant identity, and authorization policies protect role-specific endpoints. Middleware propagates the authenticated tenant context to PostgreSQL for row-level isolation.

## Main roles

| Role | Primary capabilities |
| --- | --- |
| Owner | Manage users, policies, subscriptions, compliance, analytics, and company settings |
| Manager | Review expenses, approve or reject submissions, inspect risk and audit history, and export reports |
| Member | Create expenses, upload receipts, submit claims, and track personal expense status |

## Important workflows

```text
Receipt upload -> AI extraction -> user confirmation -> expense draft
Expense draft -> risk assessment -> submission -> manager review -> approval/rejection
Policy rules -> eligible pending expense -> automatic approval -> audit record/notification
Authenticated request -> JWT claims -> tenant context -> tenant-scoped database query
```

## Project structure

```text
client/                 React pages, components, contexts, and API services
server/                 ASP.NET Core API, services, repositories, and integrations
server.Tests/           Backend unit tests
compose.yaml            Local frontend, backend, and PostgreSQL orchestration
.github/workflows/      Build, test, and Docker validation automation
```

## Local setup

For the containerized stack, Docker Desktop is the only prerequisite. For manual development, install the .NET 10 SDK, Node.js 20 or newer, npm, and PostgreSQL 15 or newer. A Mistral API key is optional unless receipt extraction is needed.

### Docker Compose

From the repository root, start PostgreSQL, the API, and the Vite development server with:

```powershell
docker compose up -d --build
```

Open [http://localhost:5173](http://localhost:5173). The API is exposed at [http://localhost:8080](http://localhost:8080), its health endpoint is [http://localhost:8080/api/health](http://localhost:8080/api/health), and PostgreSQL is exposed at `localhost:5432`.

The first startup builds the backend image, installs frontend packages, applies Entity Framework Core migrations, and creates demo data. PostgreSQL data is kept in a named Docker volume between runs.

Useful lifecycle commands:

```powershell
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
docker compose down
docker compose down -v  # Also deletes the local database volume
```

The credentials in `compose.yaml` are for local development only and must not be reused in a public environment.

### Manual setup

Create a PostgreSQL database named `VeriSpend`, then set the required configuration in the terminal that will run the API:

```powershell
$env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5432;Database=VeriSpend;Username=postgres;Password=your_password"
$env:JwtSettings__Secret = "use-a-long-random-development-secret"
$env:MistralSettings__ApiKey = "your_optional_mistral_key"
```

Start the backend from the repository root:

```powershell
dotnet run --project server
```

The manual backend runs at `http://localhost:5291`. It applies pending migrations and creates demo data during startup.

Start the client in another terminal:

```powershell
cd client
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). When `VITE_API_BASE_URL` is not set, the development client uses `http://localhost:5291/api`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string used by the API |
| `JwtSettings__Secret` | Secret used to sign and validate access tokens |
| `MistralSettings__ApiKey` | Optional Mistral credential for receipt extraction |
| `CLIENT_ORIGINS` | Comma-separated frontend origins allowed by API CORS |
| `PORT` | HTTP port used by the backend container |
| `APP_BASE_URL` | Public frontend URL used in email and Slack links |
| `VITE_API_BASE_URL` | Browser-visible API base URL used when building or running the Vite client |
| `EmailSettings__SendGridApiKey` | Optional SendGrid credential for email delivery |
| `EmailSettings__SmtpHost` | Optional SMTP server used when SMTP delivery is configured |

Never commit populated secrets. Set `VITE_API_BASE_URL` to the API URL, including `/api`, when the frontend should connect to an API other than the default manual-development address.

## Testing

Run the backend build and tests from the repository root:

```powershell
dotnet build VeriSpend.sln
dotnet test VeriSpend.sln
```

Run the frontend checks from `client/`:

```powershell
npm ci
npm run lint
npm test
npm run build
```

GitHub Actions validates the server build and tests, frontend lint/tests/build, and backend Docker image on pushes and pull requests.

## Current limitations

- Uploaded receipts are stored on the API service's ephemeral local filesystem.
- Background jobs use an in-process queue instead of a durable message broker.
- The hosted demo can introduce a cold-start delay after periods without traffic.
- Approval updates do not yet use optimistic concurrency tokens.
- The frontend would benefit from route-level code splitting to reduce its initial bundle size.
