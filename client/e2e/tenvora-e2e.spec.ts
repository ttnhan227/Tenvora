import { expect, test, type Page } from "@playwright/test";

const now = new Date().toISOString();

function customer(overrides: Record<string, unknown> = {}) {
  return {
    id: "customer-1", name: "Anh Nam", phone: "0900000000", status: "Active", currency: "VND",
    totalSales: 0, totalPaid: 0, outstandingBalance: 0, salesCount: 0, createdAt: now, ...overrides,
  };
}

function product(overrides: Record<string, unknown> = {}) {
  return {
    id: "product-1", name: "Standard product", unit: "kg", defaultPrice: 180_000, currency: "VND",
    isActive: true, createdAt: now, ...overrides,
  };
}

async function businessFixture(page: Page) {
  let customers = [customer()];
  let products = [product()];
  let sales: any[] = [];
  const suppliers: any[] = [];
  const purchases: any[] = [];
  const expenses: any[] = [];

  await page.addInitScript(() => {
    // API calls are mocked, but the real auth guard still checks token expiry.
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
    localStorage.setItem("accessToken", `test.${payload}.test-signature`);
    localStorage.setItem("user", JSON.stringify({
      id: "operator", tenantId: "tenant-1", role: "OperationsManager",
      email: "owner@example.test", companyName: "Example Local Business", preferredCurrency: "VND", onboardingCompleted: true, isActive: true,
    }));
    localStorage.setItem("theme", "light");
    localStorage.setItem("tenvora_lang", "en");
  });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();

    if (path.endsWith("/auth/me")) {
      await route.fulfill({ json: { success: true, data: { id: "operator", tenantId: "tenant-1", role: "OperationsManager", email: "owner@example.test", companyName: "Example Local Business", preferredCurrency: "VND", onboardingCompleted: true, isActive: true } } });
      return;
    }
    if (path.endsWith("/business-dashboard")) {
      await route.fulfill({ json: { success: true, data: { currency: "VND", todaySales: 0, todayPayments: 0, todayPurchases: 0, todaySupplierPayments: 0, todayExpenses: 0, outstandingCustomers: 0, outstandingSuppliers: 0, unpaidCustomers: [], unpaidSuppliers: [], recentActivity: [] } } });
      return;
    }
    if (path.endsWith("/suppliers") && method === "GET") { await route.fulfill({ json: { success: true, data: suppliers } }); return; }
    if (path.endsWith("/purchases") && method === "GET") { await route.fulfill({ json: { success: true, data: purchases } }); return; }
    if (path.endsWith("/business-expenses") && method === "GET") { await route.fulfill({ json: { success: true, data: expenses } }); return; }
    if (path.endsWith("/customers") && method === "GET") {
      await route.fulfill({ json: { success: true, data: customers } });
      return;
    }
    if (path.endsWith("/customers") && method === "POST") {
      const input = request.postDataJSON();
      const created = customer({ id: `customer-${customers.length + 1}`, ...input });
      customers = [...customers, created];
      await route.fulfill({ json: { success: true, data: created } });
      return;
    }
    const customerMatch = path.match(/\/customers\/([^/]+)\/history$/);
    if (customerMatch) {
      const selected = customers.find((entry) => entry.id === customerMatch[1])!;
      const customerSales = sales.filter((sale) => sale.customerId === selected.id);
      await route.fulfill({ json: { success: true, data: { customer: selected, sales: customerSales, payments: customerSales.flatMap((sale) => sale.payments) } } });
      return;
    }
    if (path.endsWith("/products") && method === "GET") {
      await route.fulfill({ json: { success: true, data: products } });
      return;
    }
    if (path.endsWith("/products") && method === "POST") {
      const input = request.postDataJSON();
      const created = product({ id: `product-${products.length + 1}`, ...input });
      products = [...products, created];
      await route.fulfill({ json: { success: true, data: created } });
      return;
    }
    if (path.endsWith("/sales") && method === "GET") {
      const paged = new URL(request.url()).searchParams.has("page");
      await route.fulfill({ json: { success: true, data: paged ? { items: sales, totalCount: sales.length, page: 1, pageSize: 20 } : sales } });
      return;
    }
    if (path.endsWith("/sales") && method === "POST") {
      const input = request.postDataJSON();
      const selectedCustomer = customers.find((entry) => entry.id === input.customerId)!;
      const items = input.items.map((entry: any, index: number) => {
        const selectedProduct = products.find((candidate) => candidate.id === entry.productId)!;
        const unitPrice = entry.unitPrice ?? selectedProduct.defaultPrice;
        return { id: `line-${index + 1}`, productId: selectedProduct.id, productName: selectedProduct.name, unit: selectedProduct.unit, quantity: entry.quantity, unitPrice, lineTotal: entry.quantity * unitPrice };
      });
      const totalAmount = items.reduce((sum: number, entry: any) => sum + entry.lineTotal, 0);
      const paidAmount = input.paymentAmount ?? 0;
      const payments = paidAmount > 0 ? [{ id: "payment-initial", saleId: "sale-1", saleNumber: "SALE-20260925-0001", customerId: selectedCustomer.id, amount: paidAmount, currency: "VND", method: input.paymentMethod, paidAt: now }] : [];
      const created = { id: "sale-1", saleNumber: "SALE-20260925-0001", customerId: selectedCustomer.id, customerName: selectedCustomer.name, currency: "VND", totalAmount, paidAmount, outstandingBalance: totalAmount - paidAmount, paymentStatus: paidAmount === totalAmount ? "Paid" : paidAmount > 0 ? "Partially paid" : "Unpaid", status: "Posted", soldAt: now, createdAt: now, items, payments };
      sales = [created, ...sales];
      customers = customers.map((entry) => entry.id === selectedCustomer.id ? { ...entry, totalSales: totalAmount, totalPaid: paidAmount, outstandingBalance: totalAmount - paidAmount, salesCount: 1 } : entry);
      await route.fulfill({ json: { success: true, data: created } });
      return;
    }
    const paymentMatch = path.match(/\/sales\/([^/]+)\/payments$/);
    if (paymentMatch && method === "POST") {
      const input = request.postDataJSON();
      const selected = sales.find((entry) => entry.id === paymentMatch[1]);
      const payment = { id: `payment-${selected.payments.length + 1}`, saleId: selected.id, saleNumber: selected.saleNumber, customerId: selected.customerId, amount: input.amount, currency: selected.currency, method: input.method, paidAt: now };
      selected.payments = [payment, ...selected.payments];
      selected.paidAmount += input.amount;
      selected.outstandingBalance -= input.amount;
      selected.paymentStatus = selected.outstandingBalance === 0 ? "Paid" : "Partially paid";
      customers = customers.map((entry) => entry.id === selected.customerId ? { ...entry, totalPaid: selected.paidAmount, outstandingBalance: selected.outstandingBalance } : entry);
      await route.fulfill({ json: { success: true, data: selected } });
      return;
    }
    await route.fulfill({ json: { success: true, data: [] } });
  });
}

test.describe("Tenvora 2.0 golden workflow", () => {
  test("keeps the Agent page and assistant drawer on the same live conversation", async ({ page }) => {
    await businessFixture(page);
    const conversationId = "11111111-1111-1111-1111-111111111111";
    const messages: any[] = [
      { id: "seed-assistant", role: "assistant", content: "Shared conversation ready.", createdAt: now },
    ];
    let sequence = 0;

    await page.route("**/api/ai/assistant/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (path.endsWith("/conversations") && request.method() === "GET") {
        await route.fulfill({ json: { success: true, data: [{ id: conversationId, title: "Shared operations", createdAt: now, updatedAt: now, messageCount: messages.length, lastMessage: messages.at(-1)?.content }] } });
        return;
      }
      if (path.endsWith(`/conversations/${conversationId}`) && request.method() === "GET") {
        await route.fulfill({ json: { success: true, data: { id: conversationId, title: "Shared operations", createdAt: now, updatedAt: now, messages } } });
        return;
      }
      if (path.endsWith("/agent-chat") && request.method() === "POST") {
        const input = request.postDataJSON();
        sequence++;
        messages.push({ id: `user-${sequence}`, role: "user", content: input.message, createdAt: now });
        const reply = `Synced reply ${sequence}`;
        messages.push({ id: `assistant-${sequence}`, role: "assistant", content: reply, createdAt: now });
        await route.fulfill({ json: { success: true, data: { conversationId, messageId: `assistant-${sequence}`, reply, toolCalls: [], provider: "test", model: "test", isFallback: false } } });
        return;
      }
      await route.fulfill({ json: { success: true, data: [] } });
    });

    await page.goto(`/agent?id=${conversationId}`);
    await expect(page.getByText("Shared conversation ready.", { exact: true })).toBeVisible();
    const pageComposer = page.getByPlaceholder(/Ask or tell Tenvora Agent/i);
    await pageComposer.fill("Message from full page");
    await pageComposer.press("Enter");
    await expect(page.getByRole("heading", { name: "Before using AI" })).toBeVisible();
    await page.getByRole("button", { name: "Not now" }).click();
    await expect(pageComposer).toHaveValue("Message from full page");
    await pageComposer.press("Enter");
    await page.getByRole("button", { name: "Agree and continue" }).click();
    await expect(page.getByText("Synced reply 1", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "AI Assistant" }).last().click();
    const drawer = page.getByRole("complementary", { name: "Tenvora Agent Drawer" });
    await expect(drawer.getByText("Message from full page", { exact: true })).toBeVisible();
    const drawerComposer = drawer.getByPlaceholder(/Message Tenvora Agent/i);
    await drawerComposer.fill("Message from drawer");
    await drawerComposer.press("Enter");
    await expect(drawer.getByText("Synced reply 2", { exact: true })).toBeVisible();
    await drawer.getByRole("button", { name: "Close" }).click();

    await expect(page.getByText("Message from drawer", { exact: true })).toBeVisible();
    await expect(page.getByText("Synced reply 2", { exact: true })).toBeVisible();
  });

  test("previews and imports a customer CSV without manual entry", async ({ page }) => {
    await businessFixture(page);
    await page.goto("/imports?type=customers");
    await expect(page.getByRole("heading", { name: "Data Import Center", exact: true })).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({
      name: "customers.csv",
      mimeType: "text/csv",
      buffer: Buffer.from('Name,Phone,Email,Address\n"Lan, Nguyen",0901234000,lan@example.com,"Hoi An, Quang Nam"\nMinh Tran,0905678000,minh@example.com,Hue'),
    });

    await expect(page.getByText("2", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Lan, Nguyen", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Import 2 ready rows" }).click();
    await expect(page.getByText("Import finished", { exact: true })).toBeVisible();
    await expect(page.getByText("2 imported · 0 skipped · 0 failed", { exact: true })).toBeVisible();
  });

  test("records a sale, preserves its first payment, and settles the remaining balance", async ({ page }) => {
    await businessFixture(page);
    await page.goto("/sales");
    await expect(page.getByRole("heading", { name: "Sales", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "New sale" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("combobox").nth(0).click();
    await page.getByRole("option", { name: "Anh Nam" }).click();
    await dialog.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: /Standard product/ }).click();
    await dialog.getByLabel("Quantity").fill("15");
    await dialog.getByLabel("Unit price").fill("180000");
    await dialog.getByRole("button", { name: "Partly paid" }).click();
    await dialog.getByLabel("How much did they pay?").fill("1000000");
    await expect(dialog.getByText(/2,700,000/).first()).toBeVisible();
    await dialog.getByRole("button", { name: "Save sale" }).click();

    await expect(page.getByText("SALE-20260925-0001", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Partially paid").first()).toBeVisible();
    await expect(page.getByText(/1,700,000/).first()).toBeVisible();

    const receiptDialog = page.getByRole("dialog", { name: "Sales Receipt Slip" });
    await receiptDialog.getByRole("button", { name: "Close" }).click();
    await page.getByRole("button", { name: "Receive payment" }).click();
    const paymentDialog = page.getByRole("dialog");
    await expect(paymentDialog.getByLabel("Amount *")).toHaveValue("1700000");
    await paymentDialog.getByRole("button", { name: "Record payment" }).click();
    await expect(page.getByText("Paid", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Payment history", { exact: true })).toBeVisible();
  });

  test("theme colors and form layout remain usable in light and dark mode", async ({ page }) => {
    await businessFixture(page);
    await page.goto("/customers");
    await expect(page.getByRole("heading", { name: "Customers", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Add customer", exact: true }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const lightColor = await dialog.evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(lightColor).not.toBe("rgba(0, 0, 0, 0)");
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await expect.poll(() => dialog.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(lightColor);
    const bounds = await dialog.boundingBox();
    expect(bounds?.width).toBeGreaterThan(300);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  });

  test("core business screens remain usable on a phone", async ({ page }) => {
    await businessFixture(page);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const [route, heading] of [["/dashboard", /Good (morning|afternoon|evening), Owner/], ["/customers", "Customers"], ["/products", "Products & Inventory"], ["/sales", "Sales"], ["/suppliers", "Suppliers"], ["/purchases", "Purchases"], ["/expenses", "Expenses"]] as const) {
      await page.goto(route);
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      const overflow = await page.evaluate(() => {
        if (document.documentElement.scrollWidth <= window.innerWidth + 1) return [];
        return Array.from(document.querySelectorAll<HTMLElement>("body *"))
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.right > window.innerWidth + 1 && rect.width > 0;
          })
          .slice(0, 5)
          .map((element) => ({ tag: element.tagName, className: element.className, text: element.textContent?.trim().slice(0, 60) }));
      });
      expect(overflow, `${route} should not overflow`).toEqual([]);
    }
  });

  test("language switch updates business page content and dialogs immediately", async ({ page }) => {
    await businessFixture(page);
    await page.goto("/customers");
    await expect(page.getByRole("heading", { name: "Customers", exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("Search by name, phone, or email")).toBeVisible();

    await page.getByRole("button", { name: "Chuyển sang Tiếng Việt" }).click();
    await expect(page.getByRole("heading", { name: "Khách hàng & Sổ nợ", exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("Tìm theo tên, điện thoại hoặc email")).toBeVisible();

    await page.getByRole("button", { name: "Thêm khách hàng" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Thêm khách hàng" })).toBeVisible();
    await expect(dialog.getByLabel("Tên khách hàng *")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Huỷ bỏ" })).toBeVisible();
  });

  test("a completed customer action stays closed after refreshing chat", async ({ page }) => {
    await businessFixture(page);
    let executed = false;
    let conversationCreated = false;
    let confirmationBody: Record<string, unknown> | undefined;
    let releaseInitialList!: () => void;
    const initialList = new Promise<void>((resolve) => { releaseInitialList = resolve; });

    await page.route("**/api/ai/assistant/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;

      if (path.endsWith("/conversations") && request.method() === "GET") {
        const data = conversationCreated ? [{ id: "conversation-1", title: "add a customer", createdAt: now, updatedAt: now, messageCount: 2 }] : [];
        if (!conversationCreated) await initialList;
        await route.fulfill({ json: { success: true, data } });
        return;
      }
      if (path.endsWith("/agent-chat") && request.method() === "POST") {
        conversationCreated = true;
        await route.fulfill({ json: {
          success: true,
          data: {
            conversationId: "conversation-1",
            messageId: "assistant-1",
            reply: "I've prepared this action: **Create a customer?**",
            proposal: {
              actionId: "action-customer",
              intent: "create_customer",
              status: "PendingConfirmation",
              riskLevel: "Low",
              requiresConfirmation: true,
              summary: "Create a customer?",
              details: { name: null, phone: null, email: null, address: null },
            },
            toolCalls: [],
            provider: "test",
            model: "test",
            isFallback: true,
          },
        } });
        return;
      }
      if (path.endsWith("/actions/action-customer/confirm") && request.method() === "POST") {
        confirmationBody = request.postDataJSON();
        executed = true;
        await route.fulfill({ json: {
          success: true,
          data: {
            actionId: "action-customer",
            status: "Executed",
            message: "Customer created: Anh Minh.",
            recordType: "Customer",
            recordId: "customer-created",
          },
        } });
        return;
      }
      if (path.endsWith("/conversations/conversation-1") && request.method() === "GET") {
        await route.fulfill({ json: {
          success: true,
          data: {
            id: "conversation-1",
            title: "add a customer",
            createdAt: now,
            updatedAt: now,
            messages: [
              { id: "user-1", role: "user", content: "add a customer", createdAt: now },
              {
                id: "assistant-1",
                role: "assistant",
                content: "I've prepared this action: **Create a customer?**",
                createdAt: now,
                proposal: {
                  actionId: "action-customer",
                  intent: "create_customer",
                  status: executed ? "Executed" : "PendingConfirmation",
                  riskLevel: "Low",
                  requiresConfirmation: !executed,
                  summary: executed ? "Customer created: Anh Minh." : "Create a customer?",
                  details: executed
                    ? { name: "Anh Minh", phone: "0901234567", Result: "Customer created: Anh Minh." }
                    : { name: null },
                },
              },
            ],
          },
        } });
        return;
      }
      await route.fulfill({ json: { success: true, data: [] } });
    });

    await page.goto("/agent");
    const composer = page.getByPlaceholder(/Ask or tell Tenvora Agent/i);
    await composer.fill("add a customer");
    await composer.press("Enter");

    await expect(page.getByRole("heading", { name: "Before using AI" })).toBeVisible();
    await page.getByRole("button", { name: "Agree and continue" }).click();

    await expect(page.getByText("Create a customer?", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Customer Details", { exact: true })).toBeVisible();
    await page.getByPlaceholder(/Enter customer name/i).fill("Anh Minh");
    await page.getByPlaceholder("Phone...").fill("0901234567");
    releaseInitialList();
    await expect(page.getByPlaceholder(/Enter customer name/i)).toHaveValue("Anh Minh");
    await page.getByRole("button", { name: "Save & Create Customer" }).click();

    await expect(page.getByText("Customer created: Anh Minh.")).toBeVisible();
    expect(confirmationBody).toEqual({
      confirmed: true,
      input: {
        name: "Anh Minh",
        phone: "0901234567",
        email: null,
        address: null,
      },
    });

    await page.reload();
    await expect(page.getByText("Customer created: Anh Minh.")).toBeVisible();
    await expect(page.getByText("Anh Minh", { exact: true })).toBeVisible();
    await expect(page.getByText("0901234567", { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder(/Enter customer name/i)).toHaveCount(0);
  });
});
