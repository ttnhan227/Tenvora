import { test, expect, type Page } from "@playwright/test";

const date = "2026-09-08T10:00:00Z";

const accounts = [
  { id: "source", accountNumber: "MAIN-USD", accountType: "Asset", currency: "USD", cachedBalance: 7500, status: "Active", createdAt: date },
  { id: "destination", accountNumber: "TAX-VAULT", accountType: "Asset", currency: "USD", cachedBalance: 2500, status: "Active", createdAt: date },
  { id: "intl-eur", accountNumber: "INTL-EUR", accountType: "Asset", currency: "EUR", cachedBalance: 1800, status: "Active", createdAt: date }
];

const transaction = {
  id: "transaction",
  tenantId: "tenant-1",
  referenceNumber: "TX-INVOICE-001",
  transactionType: "Transfer",
  status: "Posted",
  amount: 2000,
  currency: "USD",
  description: "Acme Corp payment split",
  createdAt: date,
  postedAt: date,
  ledgerEntriesCount: 2,
  ledgerEntries: [
    { id: "credit", accountId: "source", accountNumber: "MAIN-USD", creditAmount: 2000, debitAmount: 0, currency: "USD", postedAt: date },
    { id: "debit", accountId: "destination", accountNumber: "TAX-VAULT", debitAmount: 500, creditAmount: 0, currency: "USD", postedAt: date }
  ]
};

const invoices = [
  {
    id: "inv-1",
    invoiceNumber: "INV-001",
    clientId: "cli-1",
    clientName: "Acme Corp",
    clientEmail: "billing@acme.test",
    issueDate: date,
    dueDate: date,
    currency: "USD",
    subtotal: 2000,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 2000,
    amountPaid: 0,
    status: "Sent",
    paymentTerms: "Net 14",
    notes: "Thank you for your business!",
    destinationAccountId: "source",
    createdAt: date,
    items: [
      { id: "item-1", description: "Brand Design Sprint", quantity: 1, unitPrice: 2000, amount: 2000 }
    ]
  }
];

const clients = [
  {
    id: "cli-1",
    name: "Acme Corp",
    contactEmail: "billing@acme.test",
    company: "Acme International",
    currency: "USD",
    defaultPaymentTermsDays: 14,
    hourlyRate: 150,
    status: "Active",
    notes: "Net-14 terms",
    totalInvoiced: 12000,
    totalPaid: 10000,
    outstandingBalance: 2000,
    openInvoicesCount: 1,
    createdAt: date
  }
];

async function fixture(page: Page, role = "SoloFreelancer") {
  await page.addInitScript((activeRole) => {
    localStorage.setItem("accessToken", "browser-test-token");
    localStorage.setItem("user", JSON.stringify({
      id: "operator",
      role: activeRole,
      email: "alex@riveradesign.co",
      companyName: "Alex Rivera Design"
    }));
    localStorage.setItem("theme", "light");
  }, role);

  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    let data: unknown = [];

    if (path.endsWith("/auth/me")) {
      data = { id: "operator", role, email: "alex@riveradesign.co", companyName: "Alex Rivera Design" };
    } else if (path.endsWith("/overview")) {
      data = {
        balances: [{ currency: "USD", balance: 7500, accounts: 2 }],
        volume: [{ currency: "USD", amount: 2000, count: 1 }],
        paymentsInProgress: 0,
        openBatches: 0,
        reconciliation: null
      };
    } else if (path.endsWith("/accounts/source")) {
      data = accounts[0];
    } else if (path.endsWith("/ledger/accounts/source/history")) {
      data = {
        accountId: "source",
        accountNumber: "MAIN-USD",
        currency: "USD",
        cachedBalance: 7500,
        derivedBalance: 7500,
        balanceMatches: true,
        accountType: "Asset",
        entries: [],
      };
    } else if (path.endsWith("/accounts")) {
      data = accounts;
    } else if (path.endsWith("/payments/transactions/transaction")) {
      data = transaction;
    } else if (path.endsWith("/payments/transactions")) {
      data = [transaction];
    } else if (path.includes("/audit")) {
      data = [
        { id: "aud-1", tenantId: "t-1", action: "TransactionPosted", entityType: "Transaction", entityId: "transaction", performedBy: "alex@riveradesign.co", timestamp: date }
      ];
    } else if (path.endsWith("/taxes/summary")) {
      data = {
        currency: "USD",
        availableSpendingBalance: 7500,
        taxVaultBalance: 2500,
        defaultTaxRatePercent: 25,
        autoTaxSetAsideEnabled: true,
        filingStatus: "Single",
        personalTaxIdLast4: "4819",
        ytdGrossIncome: 10000,
        ytdTaxSetAsideTotal: 2500,
        estimatedAnnualTaxLiability: 3500,
        estimatedCurrentQuarterLiability: 1500,
        nextQuarterEstimatedTax: 1500,
        currentQuarter: "Q3 2026",
        nextQuarterDeadline: "September 15, 2026",
        daysUntilQuarterDeadline: 7,
        quarterlySchedule: [
          { quarter: "Q1 2026", periodRange: "Jan 1 - Mar 31", dueDate: "2026-04-15T00:00:00Z", estimatedAmount: 1250, status: "Paid" },
          { quarter: "Q2 2026", periodRange: "Apr 1 - May 31", dueDate: "2026-06-15T00:00:00Z", estimatedAmount: 1250, status: "Paid" },
          { quarter: "Q3 2026", periodRange: "Jun 1 - Aug 31", dueDate: "2026-09-15T00:00:00Z", estimatedAmount: 1500, status: "Upcoming" },
          { quarter: "Q4 2026", periodRange: "Sep 1 - Dec 31", dueDate: "2027-01-15T00:00:00Z", estimatedAmount: 1500, status: "Upcoming" }
        ],
        recentTaxSetAsides: [
          { transactionId: "tx-1", referenceNumber: "TX-SETASIDE-01", amount: 500, currency: "USD", description: "Auto Tax Set-Aside (25%)", timestamp: date }
        ]
      };
    } else if (path.endsWith("/invoices/stats")) {
      data = {
        currency: "USD",
        totalInvoicedAmount: 12000,
        totalPaidAmount: 10000,
        totalOutstandingAmount: 2000,
        totalInvoicesCount: 4,
        openInvoicesCount: 1,
        paidInvoicesCount: 3,
        overdueInvoicesCount: 0
      };
    } else if (path.endsWith("/invoices")) {
      data = invoices;
    } else if (path.endsWith("/clients")) {
      data = clients;
    } else if (path.endsWith("/intelligence/feed")) {
      data = {
        totalCount: 0,
        lastUpdated: date,
        nextScheduledSync: date,
        activeSources: [],
        availableCategories: [],
        articles: [],
        registeredSources: [],
      };
    } else if (path.endsWith("/ai/status")) {
      data = {
        status: "Operational",
        provider: "Local Financial Engine",
        externalLlmConfigured: false,
      };
    } else if (path.endsWith("/ai/query")) {
      data = {
        response: "Based on $10,000 of confirmed income and your 25% planning rate, the workspace estimates a $2,500 tax reserve.",
        source: "local-financial-engine",
        provider: "Tenvora Engine",
        context: "tenant-database",
      };
    } else if (path.endsWith("/health/ready")) {
      await route.fulfill({ json: { status: "ready", database: "connected" } });
      return;
    }

    await route.fulfill({ json: { success: true, data } });
  });
}

test.describe("Tenvora Freelancer Cash-Flow Workspace", () => {
  test("Landing page renders on desktop and mobile with zero horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Know what came in/i })).toBeVisible();
    await expect(page.getByText(/Statement Import & Matching/i).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /From client to confirmed income/i })).toBeVisible();
    await expect(page.locator('a[href="/payments?import=1"]')).toHaveCount(0);
    await expect(page.getByText(/Create Your Workspace/i)).toHaveCount(0);
    await expect(page.locator('img[src^="/product/"]')).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Know what came in/i })).toBeVisible();
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBeFalsy();
  });

  test("Authentication pages (Login & Register) render cleanly across viewports", async ({ page }) => {
    // Login
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Welcome Back/i })).toBeVisible();
    await expect(page.getByLabel(/Email Address/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign In/i })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBeFalsy();

    // Register
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /Create Your Freelancer Workspace/i })).toBeVisible();
    await expect(page.getByLabel(/Your Full Name or Studio Name/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Create Free Workspace/i })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/register");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBeFalsy();
  });

  test("login and registration submit through the existing authentication contracts", async ({ page }) => {
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/auth/login") || path.endsWith("/auth/register")) {
        await route.fulfill({
          json: {
            success: true,
            data: {
              accessToken: "browser-test-token",
              refreshToken: "browser-test-refresh-token",
              userId: "operator",
              tenantId: "tenant-1",
              email: "alex@riveradesign.co",
              role: "SoloFreelancer",
              companyName: "Alex Rivera Design",
            },
          },
        });
        return;
      }

      await route.fulfill({ json: { success: true, data: [] } });
    });

    await page.goto("/login");
    await page.getByLabel(/Email Address/i).fill("alex@riveradesign.co");
    await page.getByLabel(/^Password$/i).fill("correct-horse-battery-staple");
    await page.getByRole("button", { name: /Sign In/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.evaluate(() => localStorage.clear());
    await page.goto("/register");
    await page.getByLabel(/Your Full Name or Studio Name/i).fill("Alex Rivera Design");
    await page.getByLabel(/Email Address/i).fill("alex@riveradesign.co");
    await page.getByLabel(/^Password$/i).fill("correct-horse-battery-staple");
    await page.getByRole("button", { name: /Create Free Workspace/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("registration shows client and API validation beside the relevant fields", async ({ page }) => {
    let registrationAttempts = 0;

    await page.route("**/api/auth/register", async route => {
      registrationAttempts += 1;

      if (registrationAttempts === 1) {
        await route.fulfill({
          status: 400,
          json: {
            success: false,
            message: "Email already registered.",
            errors: ["Email already registered."],
          },
        });
        return;
      }

      await route.fulfill({
        status: 400,
        json: {
          title: "One or more validation errors occurred.",
          status: 400,
          errors: {
            CompanyName: ["Studio name must be unique."],
          },
        },
      });
    });

    await page.goto("/register");
    const company = page.getByLabel(/Your Full Name or Studio Name/i);
    const email = page.getByLabel(/Email Address/i);
    const password = page.getByLabel(/^Password$/i);

    await page.getByRole("button", { name: /Create Free Workspace/i }).click();
    await expect(page.getByText("Enter your full name or studio name.")).toBeVisible();
    await expect(page.getByText("Enter your email address.")).toBeVisible();
    await expect(page.getByText("Create a password.")).toBeVisible();
    await expect(company).toBeFocused();
    expect(registrationAttempts).toBe(0);

    await company.fill("Alex Rivera Design");
    await email.fill("alex@riveradesign.co");
    await password.fill("short");
    await page.getByRole("button", { name: /Create Free Workspace/i }).click();
    await expect(page.getByText("Password must contain at least 6 characters.")).toBeVisible();
    await expect(password).toHaveAttribute("aria-invalid", "true");
    expect(registrationAttempts).toBe(0);

    await password.fill("correct-horse-battery-staple");
    await page.getByRole("button", { name: /Create Free Workspace/i }).click();
    await expect(page.getByText("Email already registered.")).toBeVisible();
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(email).toBeFocused();

    await email.fill("new@riveradesign.co");
    await expect(page.getByText("Email already registered.")).not.toBeVisible();
    await page.getByRole("button", { name: /Create Free Workspace/i }).click();
    await expect(page.getByText("Studio name must be unique.")).toBeVisible();
    await expect(company).toHaveAttribute("aria-invalid", "true");
    await expect(company).toBeFocused();
  });

  test("Documentation page renders guides without layout clipping", async ({ page }) => {
    await page.goto("/docs");
    await expect(page.getByRole("heading", { name: /How Tenvora turns records/i })).toBeVisible();
    await expect(page.getByText(/Import and match a statement/i).first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/docs");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBeFalsy();
  });

  test("Pricing page lists only the implemented workspace across viewports", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /complete workflow available today/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Freelancer cash-flow records/i })).toBeVisible();
    await expect(page.getByText(/lists only features that are implemented/i)).toBeVisible();
    await expect(page.locator('img[src^="/product/"]')).toHaveCount(0);
    await expect(page.getByText(/Planning Toolkit/i)).not.toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/pricing");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBeFalsy();
  });

  test("About page renders product purpose and boundaries without layout clipping", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/about");
    await expect(page.getByRole("heading", { name: /Cash-flow clarity/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Honest product boundaries/i })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/about");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBeFalsy();
  });

  test("Help page links only to working product paths", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/contact");
    await expect(page.getByRole("heading", { name: /Get help using Tenvora/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Read the guide/i })).toHaveAttribute("href", "/docs");
    await expect(page.getByRole("link", { name: /Download example CSV/i })).toHaveAttribute("download", "");
    await expect(page.getByRole("link", { name: /Open the assistant/i })).toHaveAttribute("href", "/assistant");
    await expect(page.getByRole("button", { name: /Preview Support Request/i })).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/contact");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBeFalsy();
  });

  test("Status page reports only the live readiness checks", async ({ page }) => {
    await fixture(page);
    await page.goto("/status");
    await expect(page.getByRole("heading", { name: /Workspace services are reachable/i })).toBeVisible();
    await expect(page.getByText(/current API readiness endpoint/i)).toBeVisible();
    await expect(page.getByText(/historical uptime or SLA claim/i)).toBeVisible();
    await expect(page.getByText("online", { exact: true })).toHaveCount(2);
    await expect(page.getByText(/99\.99/)).toHaveCount(0);
  });

  test("Legacy news URLs lead to the real product guide", async ({ page }) => {
    await page.goto("/news/federal-reserve-real-time-payment-rails");
    await expect(page).toHaveURL(/\/docs$/);
    await expect(page.getByRole("heading", { name: /How Tenvora turns records/i })).toBeVisible();
  });

  test("Security notes render architecture and RLS boundaries", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/security");
    await expect(page.getByRole("heading", { name: /Protects Your Workspace Records/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("heading", { name: /workspace stays separate/i })).toBeVisible({ timeout: 15000 });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/security");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBeFalsy();
  });

  test("Public Navbar mobile menu toggles and renders high-contrast links", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const menuBtn = page.getByRole("button", { name: /Toggle navigation menu/i });
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "Pricing", exact: true })).toBeVisible();
    await expect(header.getByRole("link", { name: "Security & Trust", exact: true })).toBeVisible();
    await expect(header.getByRole("link", { name: "Guide & Docs", exact: true })).toBeVisible();
    await expect(header.getByRole("link", { name: "About", exact: true })).toHaveCount(0);
    await expect(header.getByRole("link", { name: "Contact", exact: true })).toHaveCount(0);
    await menuBtn.click();
  });

  test("Dashboard renders hero metrics, navigation drawer, and cards", async ({ page }) => {
    let dashboardSummaryRequests = 0;
    page.on("request", (request) => {
      if (!new URL(request.url()).pathname.endsWith("/ai/query")) return;
      const body = request.postDataJSON() as { prompt?: string } | null;
      if (body?.prompt?.includes("concise overview")) dashboardSummaryRequests += 1;
    });
    await fixture(page);
    await page.goto("/dashboard");
    await expect(page.getByText(/Estimated safe to spend/i).first()).toBeVisible();
    await expect(page.getByText(/Estimated tax reserve/i).first()).toBeVisible();
    await expect(page.getByText(/Open Client Invoices/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Import statement|Import income/i })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /AI workspace summary/i })).toBeVisible();
    await expect(page.getByText(/Workspace database context · cached for this session/i)).toBeVisible();
    await expect(page.getByText(/Based on \$10,000 of confirmed income/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Ask this in Assistant/i })).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");
    await expect(page.getByText(/Estimated safe to spend/i).first()).toBeVisible();
    await expect(page.getByText(/Based on \$10,000 of confirmed income/i)).toBeVisible();
    expect(dashboardSummaryRequests).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBeFalsy();

    // Test mobile drawer
    await page.getByRole("button", { name: "Open navigation" }).click();
    for (const tab of ["Home", "Invoices", "Clients", "Income", "Taxes", "Assistant", "Settings"]) {
      await expect(page.getByRole("link", { name: tab, exact: true })).toBeVisible();
    }
    await page.getByRole("button", { name: "Close navigation" }).click();
  });

  test("Invoices page displays list and opens Create & Record Payment modals", async ({ page }) => {
    await fixture(page);
    await page.goto("/invoices");
    await expect(page.getByRole("heading", { name: /Invoices & Billing/i })).toBeVisible();
    await expect(page.getByText("INV-001")).toBeVisible();
    await expect(page.getByRole("heading", { name: /AI invoice summary/i })).toBeVisible();

    // Dashboard and other contextual links can open the requested action directly.
    await page.goto("/invoices?create=1");
    const createHeading = page.getByRole("heading", { name: /Create New Client Invoice/i });
    await expect(createHeading).toBeVisible();
    await expect(page.getByLabel("Select Client")).toBeVisible();
    await expect(page.getByLabel("Billing Currency")).toBeVisible();
    await expect(page.getByLabel("Payment Terms")).toBeVisible();
    await expect(page.getByLabel("Description")).toHaveValue("");
    await expect(page.getByLabel("Quantity")).toHaveValue("1");
    await expect(page.getByLabel(/Unit price/i)).toHaveValue("0");
    await expect(page.getByText(/issue date is today/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Save & Mark as Sent/i })).toBeVisible();
    await page.getByLabel("Description").fill("Website design");
    await page.getByLabel(/Unit price/i).fill("1000");
    const invoiceTotal = page.getByText("Total Invoice Amount:").locator("..");
    await expect(invoiceTotal.getByText("$1,000.00", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(createHeading).not.toBeVisible();

    await page.goto("/invoices?pay=inv-1");
    const payHeading = page.getByRole("heading", { name: /Record Client Payment/i });
    await expect(payHeading).toBeVisible();
    await expect(page.getByLabel(/Apply saved tax-reserve rule/i)).toBeChecked();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(payHeading).not.toBeVisible();

    // Mobile layout
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/invoices");
    await expect(page.getByRole("heading", { name: /Invoices & Billing/i })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBeFalsy();
    await page.getByRole("button", { name: "Create Invoice" }).click();
    await expect(page.getByLabel("Description")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBeFalsy();
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("Clients CRM displays client cards and Add Client modal", async ({ page }) => {
    await fixture(page);
    await page.goto("/clients");
    await expect(page.getByRole("heading", { name: /Client Directory & CRM/i })).toBeVisible();
    await expect(page.getByText("Acme Corp").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /AI client summary/i })).toBeVisible();

    // Open Add Client modal
    await page.getByRole("button", { name: "Add New Client" }).click();
    const addHeading = page.getByRole("heading", { name: /Add New Client/i });
    await expect(addHeading).toBeVisible();
    await expect(page.getByLabel(/Client \/ Contact Name/i)).toBeVisible();
    await expect(page.getByLabel(/Contact Email/i)).toBeVisible();
    await expect(page.getByLabel(/Payment Terms/i)).toBeVisible();
    await expect(page.getByLabel(/Hourly Rate/i)).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(addHeading).not.toBeVisible();

    // Mobile check
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/clients");
    await expect(page.getByRole("heading", { name: /Client Directory & CRM/i })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBeFalsy();
    await page.getByRole("button", { name: "Add New Client" }).click();
    await expect(page.getByLabel(/Client \/ Contact Name/i)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBeFalsy();
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("Income workspace imports a statement and records a match", async ({ page }) => {
    await fixture(page);
    await page.goto("/payments");
    await expect(page.getByRole("heading", { name: /Income & cash flow/i })).toBeVisible();
    await expect(page.getByText(/Confirmed payments/i).first()).toBeVisible();
    await expect(page.getByText(/Available to match/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Import statement/i })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: /AI income summary/i })).toBeVisible();

    let recordedPayment: unknown;
    page.on("request", request => {
      if (new URL(request.url()).pathname.endsWith("/invoices/inv-1/pay")) {
        recordedPayment = request.postDataJSON();
      }
    });

    await page.getByRole("button", { name: /Import statement/i }).click();
    const importHeading = page.getByRole("heading", { name: /Import income statement/i });
    await expect(importHeading).toBeVisible();
      await page.locator('input[type="file"]').setInputFiles({
        name: "statement.csv",
        mimeType: "text/csv",
        buffer: Buffer.from([
          "Date,Description,Amount,Currency",
          "2026-09-10,Acme Corp payment for INV-001,2000,USD",
          '2026-09-09,"Marketplace payout, September",275.50,USD',
          "2026-09-08,Software subscription,-49,USD",
        ].join("\n")),
      });
      await expect(page.getByText(/2 income rows ready for review · 1 non-income or invalid row skipped/i)).toBeVisible();
      await expect(page.getByText(/1 rule-based suggestion/i)).toBeVisible();
      await expect(page.getByText("Rule-based suggestion: INV-001 · Acme Corp")).toBeVisible();
      await expect(page.getByText(/No automatic suggestion · choose manually only if you recognize the deposit/i)).toBeVisible();
      await expect(page.getByLabel("Invoice match for Acme Corp payment for INV-001")).toHaveValue("inv-1");
      await expect(page.getByLabel("Invoice match for Marketplace payout, September")).toHaveValue("");
      await page.getByRole("button", { name: /Record match/i }).first().click();
    await expect(page.getByText(/Payment recorded/i)).toBeVisible();
    expect(recordedPayment).toEqual({ amount: 2000, autoTaxSetAside: true });
    await page.getByRole("button", { name: "Done" }).click();

    // Mobile check
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/payments");
    await expect(page.getByRole("heading", { name: /Income & cash flow/i })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBeFalsy();
  });

  test("Taxes Hub displays quarterly tax schedule and manual transfer modal", async ({ page }) => {
    await fixture(page);
    await page.goto("/taxes");
    await expect(page.getByRole("heading", { name: "Tax Reserve Planning", exact: true })).toBeVisible();
    await expect(page.getByText(/Estimated quarterly schedule/i)).toBeVisible();
    await expect(page.getByRole("switch", { name: /Automatic tax reserve allocation/i })).toBeVisible();
    await expect(page.getByRole("slider", { name: /Tax reserve set-aside rate/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /AI tax summary/i })).toBeVisible();

    await page.getByRole("button", { name: "Adjust Allocation" }).click();
    const modal = page.getByRole("dialog");
    await expect(modal.getByRole("heading", { name: /Tax Reserve Allocation/i })).toBeVisible();
    await expect(modal.getByLabel("Allocation Direction")).toBeVisible();
    await expect(modal.getByLabel("Amount (USD)")).toBeVisible();
    await modal.getByRole("button", { name: "Cancel" }).click();
    await expect(modal).not.toBeVisible();

    // Mobile check
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/taxes");
    await expect(page.getByRole("heading", { name: "Tax Reserve Planning", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBeFalsy();
  });

  test("Freelancer Assistant chat interface sends queries and renders answers", async ({ page }) => {
    await fixture(page);
    await page.goto("/assistant");
    await expect(page.getByRole("heading", { name: /Financial Assistant/i })).toBeVisible();
    await expect(page.getByText(/Tenvora Copilot/i)).toBeVisible();

    // Send a question
    const input = page.getByLabel(/Ask Tenvora about your finances/i);
    await input.fill("How much should I set aside?");
    await page.getByRole("button", { name: /Send/i }).click();
    await expect(page.getByText(/Based on \$10,000 of confirmed income/i)).toBeVisible();
    await expect(page.getByText("AI suggestion", { exact: true })).toBeVisible();
    await expect(page.getByText("Tenvora AI", { exact: true }).last()).toBeVisible();

    // Mobile check
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/assistant");
    await expect(page.getByRole("heading", { name: /Financial Assistant/i })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBeFalsy();
  });

  test("Transaction Detail page displays ledger entries and back navigation", async ({ page }) => {
    await fixture(page);
    await page.goto("/transactions/transaction");
    await expect(page.getByText(/TX-INVOICE-001/i).first()).toBeVisible();
    await expect(page.getByText(/MAIN-USD/i).first()).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/transactions/transaction");
    await expect(page.getByText(/TX-INVOICE-001/i).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBeFalsy();
  });

  test("Settings Hub keeps workspace preferences separate from income and tax actions", async ({ page }) => {
    await fixture(page);
    await page.goto("/system");
    await expect(page.getByRole("heading", { name: /Settings & Preferences/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Appearance", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Data & privacy/i })).toBeVisible();
    await expect(page.getByRole("switch", { name: /Automatic tax reserve allocation/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Import statement/i })).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/system");
    await expect(page.getByRole("heading", { name: /Settings & Preferences/i })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBeFalsy();
  });

  test("404 Not Found page renders with clear guidance and home navigation", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");
    await expect(page.getByRole("heading", { name: /Page Not Found/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Go to Dashboard/i })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/this-page-does-not-exist");
    await expect(page.getByRole("heading", { name: /Page Not Found/i })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBeFalsy();
  });

  test("preserves every public and operational route without runtime or responsive failures", async ({ page }) => {
    test.setTimeout(120_000);
    const runtimeErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on("pageerror", error => runtimeErrors.push(`${new URL(page.url()).pathname}: ${error.message}`));
    page.on("requestfailed", request => failedRequests.push(`${request.method()} ${request.url()}`));
    await fixture(page, "OperationsManager");

    const routes = [
      "/",
      "/login",
      "/register",
      "/docs",
      "/pricing",
      "/about",
      "/contact",
      "/security",
      "/status",
      "/dashboard",
      "/invoices",
      "/clients",
      "/payments",
      "/taxes",
      "/assistant",
      "/transactions/transaction",
      "/accounts",
      "/accounts/source",
      "/transfers",
      "/transactions",
      "/ledger",
      "/settlements",
      "/reconciliation",
      "/risk",
      "/audit",
      "/admin/users",
      "/system",
      "/intelligence",
    ];

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1280, height: 800 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      for (const route of routes) {
        await page.goto(route);
        await expect(page.locator("body")).not.toBeEmpty();
        await expect.poll(() => new URL(page.url()).pathname).toBe(route);
        const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        expect(hasOverflow, `${route} should not overflow at ${viewport.width}px`).toBeFalsy();
      }
    }

    expect(runtimeErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });

  test("financial pages expose retryable API failures without showing fabricated balances", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("accessToken", "browser-test-token");
      localStorage.setItem("user", JSON.stringify({
        id: "operator",
        role: "SoloFreelancer",
        email: "alex@riveradesign.co",
        companyName: "Alex Rivera Design",
      }));
      localStorage.setItem("theme", "light");
    });

    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/auth/me")) {
        await route.fulfill({ json: { success: true, data: { id: "operator", role: "SoloFreelancer", email: "alex@riveradesign.co", companyName: "Alex Rivera Design" } } });
        return;
      }
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ success: false, errors: ["Temporarily unavailable"] }),
      });
    });

    for (const route of ["/invoices", "/clients", "/payments", "/taxes"]) {
      await page.goto(route);
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    }

    await expect(page.getByText("Apr 15, 2026", { exact: true })).toHaveCount(0);
  });
});
