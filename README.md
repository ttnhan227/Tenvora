# VeriSpend

VeriSpend is an AI-assisted expense management and spend-control platform for companies.

Employees submit expenses and receipts, managers review risky claims, and company owners manage policies, budgets, users, analytics, and compliance evidence.

- [Live application](https://aiaudit-expensetracker-web.onrender.com)
- [API documentation](https://aiaudit-expensetracker.onrender.com/swagger)

> The hosted backend uses a free service and may take about one minute to wake up.

## What it does

- Extracts expense information from uploaded receipts
- Detects duplicates, unusual spending, policy violations, and missing details
- Supports draft, submission, approval, rejection, and auto-approval workflows
- Gives Owners, Managers, and Members different permissions and workspaces
- Tracks category budgets, forecasts, review performance, and spending trends
- Maintains audit history and SOX, SOC 2, and GDPR-oriented reports
- Exports approved expenses for QuickBooks and Xero
- Includes a role-aware AI copilot grounded in authorized company data
- Keeps every company's users, expenses, policies, and analytics isolated

## Quick demo

Open the live application and select **Explore populated demo**.

VeriSpend creates a temporary private organization containing realistic expenses, risk cases, budgets, policies, and audit history. The guided mission shows the main workflow.

## Product preview

### Finance control dashboard

![VeriSpend finance control dashboard](docs/screenshots/dashboard.png)

### Expense records and risk analysis

![Expense records with status and AI risk analysis](docs/screenshots/expense-records.png)

### Workspace-aware AI copilot

![Veri AI Copilot summarizing authorized company data](docs/screenshots/ai-copilot.png)

### Policy impact simulation

![Policy Lab previewing approval outcomes](docs/screenshots/policy-lab.png)

## Technology

- React, TypeScript, Vite, Tailwind CSS, TanStack Query
- ASP.NET Core, .NET 10, Entity Framework Core
- PostgreSQL with tenant isolation
- OpenAI-compatible AI providers
- Docker, xUnit, Vitest, ESLint, and GitHub Actions

## Run locally

Requirements: .NET 10, Node.js 20+, npm, and PostgreSQL.

### 1. Configure the backend

From the repository root, copy the development settings template.

PowerShell:

```powershell
Copy-Item server/appsettings.Development.example.json server/appsettings.Development.json
```

Command Prompt:

```bat
copy server\appsettings.Development.example.json server\appsettings.Development.json
```

Edit `server/appsettings.Development.json` with your PostgreSQL password, JWT secret, and optional AI provider key. This file is ignored by Git.

### 2. Start the application

Backend:

```powershell
dotnet run --project server
```

Frontend, in another terminal:

```powershell
cd client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Run with Docker

Copy the Docker environment template:

```powershell
Copy-Item .env.example .env
```

Open `.env` and add the AI provider key, endpoint, and model names. `compose.yaml` reads these values automatically; do not place real credentials directly in `compose.yaml`.

Then run:

```powershell
docker compose up -d --build
```

Docker starts the frontend, backend, and PostgreSQL database. Do not commit `.env`.

## AI providers

VeriSpend supports providers with an OpenAI-compatible chat-completions API, including Mistral, OpenAI, OpenRouter, Groq, Together AI, and compatible self-hosted gateways.

Configure these values in `appsettings.Development.json`, `.env`, or your hosting provider:

```text
AI provider name
API key
Chat-completions endpoint
Text model
Vision-capable receipt model
```

Without an AI key, VeriSpend uses deterministic fallback guidance.

## Tests

```powershell
dotnet test VeriSpend.sln

cd client
npm test
npm run build
```

## Project structure

```text
client/        React web application
server/        ASP.NET Core API
server.Tests/  Backend tests
compose.yaml   Local container stack
```
