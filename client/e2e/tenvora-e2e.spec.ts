import { expect, test, type Page } from "@playwright/test";

const now = "2026-09-25T10:00:00Z";

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
    localStorage.setItem("accessToken", "browser-test-token");
    localStorage.setItem("user", JSON.stringify({
      id: "operator", tenantId: "tenant-1", role: "OperationsManager",
      email: "owner@example.test", companyName: "Example Local Business", preferredCurrency: "VND",
    }));
    localStorage.setItem("theme", "light");
  });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();

    if (path.endsWith("/auth/me")) {
      await route.fulfill({ json: { success: true, data: { id: "operator", tenantId: "tenant-1", role: "OperationsManager", email: "owner@example.test", companyName: "Example Local Business", preferredCurrency: "VND" } } });
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
      await route.fulfill({ json: { success: true, data: sales } });
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
    await dialog.getByLabel("Payment received now").fill("1000000");
    await expect(dialog.getByText(/2,700,000/).first()).toBeVisible();
    await dialog.getByRole("button", { name: "Record sale" }).click();

    await expect(page.getByText("SALE-20260925-0001", { exact: true })).toBeVisible();
    await expect(page.getByText("Partially paid")).toBeVisible();
    await expect(page.getByText(/1,700,000/).first()).toBeVisible();

    await page.getByRole("button", { name: "Receive payment" }).click();
    const paymentDialog = page.getByRole("dialog");
    await expect(paymentDialog.getByLabel("Amount *")).toHaveValue("1700000");
    await paymentDialog.getByRole("button", { name: "Record payment" }).click();
    await expect(page.getByText("Paid", { exact: true })).toBeVisible();
    await expect(page.getByText("Payment history", { exact: true })).toBeVisible();
  });

  test("core business screens remain usable on a phone", async ({ page }) => {
    await businessFixture(page);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const [route, heading] of [["/dashboard", "Example Local Business"], ["/customers", "Customers"], ["/products", "Products & services"], ["/sales", "Sales"], ["/suppliers", "Suppliers"], ["/purchases", "Purchases"], ["/expenses", "Expenses"]]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), `${route} should not overflow`).toBeFalsy();
    }
  });
});
