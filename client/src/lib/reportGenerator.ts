import { BusinessActivity, BusinessCustomer, BusinessExpense, Purchase, Sale, Supplier, businessMoney } from "@/services/businessService";

export interface BusinessReportData {
  companyName: string;
  ownerName?: string;
  businessType?: string;
  phone?: string;
  currency: string;
  period: "month" | "last_month" | "quarter" | "year" | "all" | "custom";
  periodLabel: string;
  dateRangeLabel?: string;
  generatedAt?: string;
  isVietnamese: boolean;

  // Executive figures
  totalSales: number;
  salesCount: number;
  totalCollected: number;
  totalPurchases: number;
  purchasesCount: number;
  totalSupplierPaid: number;
  totalExpenses: number;
  expensesCount: number;
  netProfit: number;
  outstandingCustomers: number;
  outstandingSuppliers: number;

  // Granular details
  sales?: Sale[];
  expenses?: BusinessExpense[];
  purchases?: Purchase[];
  unpaidCustomers?: BusinessCustomer[];
  unpaidSuppliers?: Supplier[];
  recentActivity?: BusinessActivity[];
}

export function generateBusinessReportHtml(data: BusinessReportData): string {
  const {
    companyName,
    ownerName,
    businessType,
    phone,
    currency,
    periodLabel,
    dateRangeLabel,
    isVietnamese,
    totalSales,
    salesCount,
    totalCollected,
    totalPurchases,
    purchasesCount,
    totalExpenses,
    expensesCount,
    netProfit,
    outstandingCustomers,
    outstandingSuppliers,
    sales = [],
    expenses = [],
    purchases = [],
    unpaidCustomers = [],
    unpaidSuppliers = [],
  } = data;

  const genDate = new Date();
  const formattedGenDate = genDate.toLocaleDateString(isVietnamese ? "vi-VN" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const money = (val: number) => businessMoney(val, currency);

  // Group expenses by category
  const expenseByCategory: Record<string, number> = {};
  for (const exp of expenses) {
    const cat = exp.category || (isVietnamese ? "Chi phí khác" : "Other expenses");
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + exp.amount;
  }
  const expenseCategoryEntries = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);

  const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : "0.0";
  const profitColor = netProfit >= 0 ? "#15803d" : "#b91c1c";
  const profitBg = netProfit >= 0 ? "#ecfdf5" : "#fef2f2";

  return `<!DOCTYPE html>
<html lang="${isVietnamese ? "vi" : "en"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isVietnamese ? "Báo cáo kinh doanh" : "Business Statement"} - ${escapeHtml(companyName)} (${escapeHtml(periodLabel)})</title>
  <style>
    :root {
      --bg: #fbf9f4;
      --paper: #ffffff;
      --card-bg: #fdfcf9;
      --border: #e3ded4;
      --border-light: #ece7de;
      --ink: #1f382b;
      --ink-muted: #57655d;
      --teal: #2f6a55;
      --teal-dark: #224e3e;
      --teal-light: #eaf3ef;
      --amber: #b45309;
      --amber-light: #fef3c7;
      --green: #15803d;
      --green-light: #ecfdf5;
      --red: #b91c1c;
      --red-light: #fef2f2;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg);
      color: var(--ink);
      font-family: "Aptos", "Segoe UI", -apple-system, BlinkMacSystemFont, "Roboto", sans-serif;
      font-size: 14px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      padding: 24px;
    }

    .report-container {
      max-width: 960px;
      margin: 0 auto;
      background: var(--paper);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(31, 56, 43, 0.05);
      overflow: hidden;
    }

    /* Screen Toolbar */
    .screen-toolbar {
      background: var(--teal);
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid var(--teal-dark);
    }
    .screen-toolbar .brand-tag {
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .screen-toolbar .actions {
      display: flex;
      gap: 8px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      border: none;
      transition: all 0.15s ease;
    }
    .btn-light {
      background: #ffffff;
      color: var(--teal-dark);
    }
    .btn-light:hover {
      background: #f3f7f5;
    }

    /* Document Header */
    .report-header {
      padding: 32px 36px 24px 36px;
      border-bottom: 2px solid var(--border-light);
      background: linear-gradient(to bottom, #ffffff, var(--card-bg));
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      margin-bottom: 20px;
    }
    .company-title {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 26px;
      font-weight: 700;
      color: var(--teal-dark);
      letter-spacing: -0.02em;
      margin-bottom: 4px;
    }
    .company-badge {
      display: inline-block;
      background: var(--teal-light);
      color: var(--teal);
      font-size: 12px;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 20px;
      border: 1px solid rgba(47, 106, 85, 0.2);
    }
    .report-meta {
      text-align: right;
      font-size: 13px;
      color: var(--ink-muted);
    }
    .report-meta strong {
      color: var(--ink);
    }

    .report-headline {
      margin-top: 14px;
      padding-top: 16px;
      border-top: 1px dashed var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .report-name {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 20px;
      font-weight: 700;
      color: var(--ink);
    }
    .period-badge {
      background: var(--amber-light);
      color: var(--amber);
      font-weight: 700;
      font-size: 13px;
      padding: 4px 12px;
      border-radius: 8px;
      border: 1px solid rgba(180, 83, 9, 0.25);
    }

    /* Main Body */
    .report-body {
      padding: 28px 36px 36px 36px;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 28px;
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px 18px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .kpi-card.highlight {
      background: ${profitBg};
      border-color: rgba(21, 128, 61, 0.25);
    }
    .kpi-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--ink-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }
    .kpi-value {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 22px;
      font-weight: 700;
      color: var(--ink);
      font-variant-numeric: tabular-nums;
      margin-bottom: 4px;
    }
    .kpi-value.profit {
      color: ${profitColor};
    }
    .kpi-detail {
      font-size: 12px;
      color: var(--ink-muted);
    }

    .secondary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
      margin-bottom: 28px;
    }
    .debt-card {
      background: var(--card-bg);
      border: 1px dashed var(--border);
      border-radius: 12px;
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Section Styling */
    .section-title {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 17px;
      font-weight: 700;
      color: var(--teal-dark);
      margin: 28px 0 12px 0;
      padding-bottom: 6px;
      border-bottom: 1.5px solid var(--border-light);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-title span.count-tag {
      font-family: "Aptos", sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: var(--ink-muted);
      background: var(--border-light);
      padding: 2px 8px;
      border-radius: 12px;
    }

    /* Tables */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-bottom: 20px;
    }
    table.data-table th {
      background: var(--card-bg);
      color: var(--ink-muted);
      font-weight: 700;
      text-align: left;
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    table.data-table td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border-light);
      vertical-align: middle;
    }
    table.data-table tr:last-child td {
      border-bottom: 1px solid var(--border);
    }
    table.data-table tr:hover {
      background: rgba(245, 243, 238, 0.6);
    }
    .text-right {
      text-align: right !important;
    }
    .text-center {
      text-align: center !important;
    }
    .tabular {
      font-variant-numeric: tabular-nums;
      font-feature-settings: "tnum" 1;
    }
    .font-semibold {
      font-weight: 600;
    }
    .font-bold {
      font-weight: 700;
    }

    /* Pill Badges */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
    }
    .status-paid {
      background: var(--green-light);
      color: var(--green);
    }
    .status-partial {
      background: var(--amber-light);
      color: var(--amber);
    }
    .status-unpaid {
      background: var(--red-light);
      color: var(--red);
    }

    /* Expense Category Breakdown */
    .expense-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 10px;
      margin-bottom: 20px;
    }
    .expense-cat-card {
      background: var(--card-bg);
      border: 1px solid var(--border-light);
      border-radius: 8px;
      padding: 10px 14px;
    }
    .expense-cat-name {
      font-size: 12px;
      color: var(--ink-muted);
      margin-bottom: 4px;
    }
    .expense-cat-amount {
      font-weight: 700;
      font-size: 15px;
      color: var(--ink);
    }

    /* Signatures */
    .signature-section {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .signature-box {
      text-align: center;
      width: 240px;
    }
    .signature-title {
      font-weight: 700;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .signature-hint {
      font-size: 11px;
      color: var(--ink-muted);
      font-style: italic;
      margin-bottom: 60px;
    }
    .signature-name {
      font-weight: 700;
      font-size: 14px;
      border-top: 1px dotted var(--border);
      padding-top: 6px;
    }

    /* Footer */
    .report-footer {
      padding: 16px 36px;
      background: var(--card-bg);
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: var(--ink-muted);
    }

    /* Print Styles */
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
        font-size: 12px !important;
      }
      .screen-toolbar {
        display: none !important;
      }
      .report-container {
        border: none !important;
        box-shadow: none !important;
        max-width: 100% !important;
        border-radius: 0 !important;
      }
      .report-header {
        padding: 16px 20px 12px 20px !important;
      }
      .report-body {
        padding: 16px 20px !important;
      }
      .kpi-grid {
        gap: 8px !important;
        margin-bottom: 18px !important;
      }
      .kpi-card {
        padding: 10px 12px !important;
      }
      .kpi-value {
        font-size: 18px !important;
      }
      table.data-table th, table.data-table td {
        padding: 6px 8px !important;
        font-size: 11px !important;
      }
      tr {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .section-title {
        margin: 18px 0 8px 0 !important;
      }
      @page {
        size: A4;
        margin: 10mm 10mm 10mm 10mm;
      }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Screen-only toolbar -->
    <div class="screen-toolbar no-print">
      <div class="brand-tag">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
          <path d="M6 6h10"></path>
          <path d="M6 10h10"></path>
        </svg>
        TENVORA STORE MANAGER &bull; ${isVietnamese ? "BÁO CÁO TÀI CHÍNH" : "FINANCIAL STATEMENT"}
      </div>
      <div class="actions">
        <button class="btn btn-light" onclick="window.print()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          ${isVietnamese ? "In / Lưu thành PDF" : "Print / Save as PDF"}
        </button>
      </div>
    </div>

    <!-- Document Header -->
    <header class="report-header">
      <div class="header-top">
        <div>
          <h1 class="company-title">${escapeHtml(companyName)}</h1>
          <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
            <span class="company-badge">${escapeHtml(businessType || (isVietnamese ? "Cửa hàng bán lẻ" : "Retail Store"))}</span>
            ${ownerName ? `<span style="font-size: 13px; color: var(--ink-muted);">&bull; ${isVietnamese ? "Chủ cơ sở" : "Owner"}: <strong>${escapeHtml(ownerName)}</strong></span>` : ""}
            ${phone ? `<span style="font-size: 13px; color: var(--ink-muted);">&bull; SĐT: ${escapeHtml(phone)}</span>` : ""}
          </div>
        </div>
        <div class="report-meta">
          <div>${isVietnamese ? "Thời gian tạo" : "Generated"}: <strong>${formattedGenDate}</strong></div>
          <div>${isVietnamese ? "Đơn vị tiền tệ" : "Currency"}: <strong>${currency}</strong></div>
          ${dateRangeLabel ? `<div>${isVietnamese ? "Khoảng thời gian" : "Period range"}: <strong>${escapeHtml(dateRangeLabel)}</strong></div>` : ""}
        </div>
      </div>

      <div class="report-headline">
        <div class="report-name">${isVietnamese ? "BÁO CÁO HOẠT ĐỘNG & TỔNG KẾT KINH DOANH" : "BUSINESS & FINANCIAL STATEMENT"}</div>
        <div class="period-badge">${escapeHtml(periodLabel)}</div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="report-body">
      <!-- KPI Executive Grid -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">${isVietnamese ? "Tổng doanh thu" : "Gross Revenue"}</div>
          <div class="kpi-value">${money(totalSales)}</div>
          <div class="kpi-detail">${salesCount} ${isVietnamese ? "đơn hàng ghi nhận" : "sales completed"}</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">${isVietnamese ? "Tiền mặt thực thu" : "Cash Collected"}</div>
          <div class="kpi-value">${money(totalCollected)}</div>
          <div class="kpi-detail">${isVietnamese ? "Thanh toán đã nhận" : "Customer payments received"}</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">${isVietnamese ? "Tổng chi tiêu & nhập hàng" : "Outflow & Spend"}</div>
          <div class="kpi-value">${money(totalExpenses + totalPurchases)}</div>
          <div class="kpi-detail">${money(totalExpenses)} ${isVietnamese ? "chi phí" : "exp."} + ${money(totalPurchases)} ${isVietnamese ? "nhập" : "purch."}</div>
        </div>

        <div class="kpi-card highlight">
          <div class="kpi-label">${isVietnamese ? "Lợi nhuận kinh doanh" : "Net Operating Profit"}</div>
          <div class="kpi-value profit">${money(netProfit)}</div>
          <div class="kpi-detail">${isVietnamese ? "Tỷ suất LN" : "Margin"}: ~${profitMargin}%</div>
        </div>
      </section>

      <!-- Receivables & Payables Summary -->
      <section class="secondary-grid">
        <div class="debt-card">
          <div>
            <div style="font-size: 12px; font-weight: 700; color: var(--amber); text-transform: uppercase;">
              ${isVietnamese ? "Khoản phải thu (Khách còn nợ)" : "Accounts Receivable"}
            </div>
            <div style="font-size: 12px; color: var(--ink-muted); margin-top: 2px;">
              ${unpaidCustomers.length} ${isVietnamese ? "khách hàng chưa thanh toán đủ" : "customers with balances"}
            </div>
          </div>
          <div style="font-family: Georgia, serif; font-size: 20px; font-weight: 700; color: var(--amber);" class="tabular">
            ${money(outstandingCustomers)}
          </div>
        </div>

        <div class="debt-card">
          <div>
            <div style="font-size: 12px; font-weight: 700; color: var(--ink); text-transform: uppercase;">
              ${isVietnamese ? "Khoản phải trả (Nợ nhà cung cấp)" : "Accounts Payable"}
            </div>
            <div style="font-size: 12px; color: var(--ink-muted); margin-top: 2px;">
              ${unpaidSuppliers.length} ${isVietnamese ? "nhà cung cấp cần thanh toán" : "suppliers with balances"}
            </div>
          </div>
          <div style="font-family: Georgia, serif; font-size: 20px; font-weight: 700; color: var(--ink);" class="tabular">
            ${money(outstandingSuppliers)}
          </div>
        </div>
      </section>

      <!-- Section: Expense Breakdown by Category -->
      ${expenseCategoryEntries.length > 0 ? `
      <section>
        <h2 class="section-title">
          ${isVietnamese ? "1. Phân bổ chi phí hoạt động" : "1. Operating Expenses Breakdown"}
          <span class="count-tag">${expenseCategoryEntries.length} ${isVietnamese ? "danh mục" : "categories"}</span>
        </h2>
        <div class="expense-grid">
          ${expenseCategoryEntries.map(([cat, amt]) => `
            <div class="expense-cat-card">
              <div class="expense-cat-name">${escapeHtml(cat)}</div>
              <div class="expense-cat-amount tabular">${money(amt)}</div>
            </div>
          `).join("")}
        </div>
        ${expenses.length > 0 ? `
          <table class="data-table" style="margin-top: 12px;">
            <thead>
              <tr>
                <th style="width: 14%;">${isVietnamese ? "Ngày" : "Date"}</th>
                <th style="width: 20%;">${isVietnamese ? "Danh mục" : "Category"}</th>
                <th>${isVietnamese ? "Diễn giải" : "Description"}</th>
                <th class="text-right" style="width: 18%;">${isVietnamese ? "Số tiền" : "Amount"}</th>
              </tr>
            </thead>
            <tbody>
              ${expenses.map(e => `
                <tr>
                  <td>${e.expenseDate.slice(0, 10)}</td>
                  <td class="font-semibold">${escapeHtml(e.category)}</td>
                  <td>${escapeHtml(e.description || "-")}</td>
                  <td class="text-right tabular font-bold" style="color: var(--red);">${money(e.amount)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : ""}
      </section>
      ` : ""}

      <!-- Section: Sales Invoices -->
      <section>
        <h2 class="section-title">
          ${isVietnamese ? "2. Danh sách đơn bán hàng trong kỳ" : "2. Sales Ledger"}
          <span class="count-tag">${sales.length} ${isVietnamese ? "đơn bán" : "sales"}</span>
        </h2>
        ${sales.length === 0 ? `
          <p style="color: var(--ink-muted); font-style: italic; margin-bottom: 20px;">
            ${isVietnamese ? "Không có đơn bán nào phát sinh trong kỳ này." : "No sales recorded during this period."}
          </p>
        ` : `
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 14%;">${isVietnamese ? "Mã đơn" : "Invoice #"}</th>
                <th style="width: 14%;">${isVietnamese ? "Ngày bán" : "Date"}</th>
                <th>${isVietnamese ? "Khách hàng" : "Customer"}</th>
                <th class="text-right" style="width: 16%;">${isVietnamese ? "Tổng tiền" : "Total"}</th>
                <th class="text-right" style="width: 16%;">${isVietnamese ? "Đã thu" : "Collected"}</th>
                <th class="text-right" style="width: 16%;">${isVietnamese ? "Còn nợ" : "Balance"}</th>
                <th class="text-center" style="width: 12%;">${isVietnamese ? "Trạng thái" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              ${sales.map(s => {
                const statusClass = s.paymentStatus === "Paid" ? "status-paid" : s.paymentStatus === "Partially paid" ? "status-partial" : "status-unpaid";
                const statusText = isVietnamese
                  ? s.paymentStatus === "Paid" ? "Đã thu" : s.paymentStatus === "Partially paid" ? "Thu một phần" : "Chưa thu"
                  : s.paymentStatus;
                const d = new Date(s.soldAt).toLocaleDateString(isVietnamese ? "vi-VN" : "en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
                return `
                <tr>
                  <td class="font-bold">${escapeHtml(s.saleNumber)}</td>
                  <td>${d}</td>
                  <td>${escapeHtml(s.customerName || "-")}</td>
                  <td class="text-right tabular font-semibold">${money(s.totalAmount)}</td>
                  <td class="text-right tabular">${money(s.paidAmount)}</td>
                  <td class="text-right tabular font-bold" style="${s.outstandingBalance > 0 ? "color: var(--amber);" : ""}">${money(s.outstandingBalance)}</td>
                  <td class="text-center"><span class="status-badge ${statusClass}">${statusText}</span></td>
                </tr>
                `;
              }).join("")}
            </tbody>
            <tfoot>
              <tr style="background: var(--card-bg); font-weight: 700;">
                <td colspan="3">${isVietnamese ? "TỔNG CỘNG" : "TOTAL"}</td>
                <td class="text-right tabular font-bold">${money(totalSales)}</td>
                <td class="text-right tabular font-bold">${money(totalCollected)}</td>
                <td class="text-right tabular font-bold" style="color: var(--amber);">${money(outstandingCustomers)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        `}
      </section>

      <!-- Section: Purchases -->
      ${purchases.length > 0 ? `
      <section>
        <h2 class="section-title">
          ${isVietnamese ? "3. Sổ nhập hàng từ nhà cung cấp" : "3. Inventory Purchases"}
          <span class="count-tag">${purchases.length} ${isVietnamese ? "phiếu nhập" : "bills"}</span>
        </h2>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 14%;">${isVietnamese ? "Mã phiếu" : "Purchase #"}</th>
              <th style="width: 14%;">${isVietnamese ? "Ngày nhập" : "Date"}</th>
              <th>${isVietnamese ? "Nhà cung cấp" : "Supplier"}</th>
              <th class="text-right" style="width: 16%;">${isVietnamese ? "Tổng tiền" : "Total"}</th>
              <th class="text-right" style="width: 16%;">${isVietnamese ? "Đã trả" : "Paid"}</th>
              <th class="text-right" style="width: 16%;">${isVietnamese ? "Còn nợ" : "Balance"}</th>
            </tr>
          </thead>
          <tbody>
            ${purchases.map(p => {
              const d = new Date(p.purchasedAt).toLocaleDateString(isVietnamese ? "vi-VN" : "en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
              return `
              <tr>
                <td class="font-bold">${escapeHtml(p.purchaseNumber)}</td>
                <td>${d}</td>
                <td>${escapeHtml(p.supplierName || "-")}</td>
                <td class="text-right tabular font-semibold">${money(p.totalAmount)}</td>
                <td class="text-right tabular">${money(p.paidAmount)}</td>
                <td class="text-right tabular font-bold" style="${p.outstandingBalance > 0 ? "color: var(--amber);" : ""}">${money(p.outstandingBalance)}</td>
              </tr>
              `;
            }).join("")}
          </tbody>
          <tfoot>
            <tr style="background: var(--card-bg); font-weight: 700;">
              <td colspan="3">${isVietnamese ? "TỔNG NHẬP HÀNG" : "TOTAL PURCHASES"}</td>
              <td class="text-right tabular font-bold">${money(totalPurchases)}</td>
              <td class="text-right tabular font-bold">${money(purchases.reduce((acc, p) => acc + p.paidAmount, 0))}</td>
              <td class="text-right tabular font-bold" style="color: var(--amber);">${money(outstandingSuppliers)}</td>
            </tr>
          </tfoot>
        </table>
      </section>
      ` : ""}

      <!-- Section: Unpaid Customers Follow-up -->
      ${unpaidCustomers.length > 0 ? `
      <section>
        <h2 class="section-title">
          ${isVietnamese ? "4. Khách hàng còn công nợ cần thu" : "4. Outstanding Customer Balances"}
          <span class="count-tag">${unpaidCustomers.length} ${isVietnamese ? "khách nợ" : "customers"}</span>
        </h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>${isVietnamese ? "Tên khách hàng" : "Customer Name"}</th>
              <th style="width: 25%;">${isVietnamese ? "Số điện thoại" : "Phone"}</th>
              <th class="text-center" style="width: 15%;">${isVietnamese ? "Số đơn" : "Sales Count"}</th>
              <th class="text-right" style="width: 25%;">${isVietnamese ? "Số tiền còn nợ" : "Outstanding Balance"}</th>
            </tr>
          </thead>
          <tbody>
            ${unpaidCustomers.map(c => `
              <tr>
                <td class="font-bold">${escapeHtml(c.name)}</td>
                <td>${escapeHtml(c.phone || "-")}</td>
                <td class="text-center">${c.salesCount}</td>
                <td class="text-right tabular font-bold" style="color: var(--amber);">${money(c.outstandingBalance)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </section>
      ` : ""}

      <!-- Accounting Signatures -->
      <section class="signature-section">
        <div class="signature-box">
          <div class="signature-title">${isVietnamese ? "Người lập biểu" : "Prepared By"}</div>
          <div class="signature-hint">(${isVietnamese ? "Ký và ghi rõ họ tên" : "Signature & Full Name"})</div>
          <div class="signature-name">${escapeHtml(ownerName || "Tenvora Admin")}</div>
        </div>

        <div class="signature-box">
          <div class="signature-title">${isVietnamese ? "Chủ cơ sở kinh doanh" : "Authorized Store Owner"}</div>
          <div class="signature-hint">(${isVietnamese ? "Ký và ghi rõ họ tên" : "Signature & Full Name"})</div>
          <div class="signature-name">${escapeHtml(companyName)}</div>
        </div>
      </section>
    </main>

    <!-- Document Footer -->
    <footer class="report-footer">
      <div>${isVietnamese ? "Tenvora - Hệ thống quản lý kinh doanh thông minh" : "Tenvora Store Management System"}</div>
      <div>${isVietnamese ? "Báo cáo nội bộ &bull; Bảo mật" : "Internal Business Report &bull; Confidential"}</div>
    </footer>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function downloadHtmlReport(data: BusinessReportData, filename?: string): void {
  const html = generateBusinessReportHtml(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const cleanName = data.companyName.toLowerCase().replace(/[^a-z0-9]/gi, "_").slice(0, 25);
  const periodSlug = data.periodLabel.toLowerCase().replace(/[^a-z0-9]/gi, "_");
  const defaultFilename = `Tenvora_Report_${cleanName}_${periodSlug}.html`;

  link.setAttribute("href", url);
  link.setAttribute("download", filename || defaultFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printReport(data: BusinessReportData): void {
  const html = generateBusinessReportHtml(data);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    // Fallback using invisible iframe
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
      }, 500);
    }
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

export function exportReportCsv(data: BusinessReportData, filename?: string): void {
  const { isVietnamese, currency, sales = [], expenses = [], purchases = [] } = data;
  const money = (val: number) => businessMoney(val, currency);

  const lines: string[] = [
    `"${isVietnamese ? "BÁO CÁO KINH DOANH TENVORA" : "TENVORA BUSINESS STATEMENT"}"`,
    `"${isVietnamese ? "Cửa hàng" : "Store"}","${data.companyName.replace(/"/g, '""')}"`,
    `"${isVietnamese ? "Kỳ báo cáo" : "Period"}","${data.periodLabel.replace(/"/g, '""')}"`,
    `"${isVietnamese ? "Ngày tạo" : "Generated"}","${new Date().toLocaleDateString()}"`,
    `"${isVietnamese ? "Đơn vị tiền tệ" : "Currency"}","${currency}"`,
    "",
    `"=== ${isVietnamese ? "TỔNG QUAN TÀI CHÍNH" : "FINANCIAL SUMMARY"} ==="`,
    `"${isVietnamese ? "Chỉ số" : "Metric"}","${isVietnamese ? "Giá trị" : "Value"}"`,
    `"${isVietnamese ? "Tổng doanh thu bán hàng" : "Gross Revenue"}","${data.totalSales}"`,
    `"${isVietnamese ? "Tiền mặt thực thu" : "Cash Collected"}","${data.totalCollected}"`,
    `"${isVietnamese ? "Tổng chi phí vận hành" : "Operating Expenses"}","${data.totalExpenses}"`,
    `"${isVietnamese ? "Tổng tiền nhập hàng" : "Inventory Purchases"}","${data.totalPurchases}"`,
    `"${isVietnamese ? "Lợi nhuận kinh doanh" : "Net Profit"}","${data.netProfit}"`,
    `"${isVietnamese ? "Khách còn nợ" : "Accounts Receivable"}","${data.outstandingCustomers}"`,
    `"${isVietnamese ? "Nợ nhà cung cấp" : "Accounts Payable"}","${data.outstandingSuppliers}"`,
    "",
    `"=== ${isVietnamese ? "CHI TIẾT ĐƠN BÁN HÀNG" : "SALES LEDGER"} ==="`,
    `"${isVietnamese ? "Mã đơn" : "Invoice #"}","${isVietnamese ? "Ngày" : "Date"}","${isVietnamese ? "Khách hàng" : "Customer"}","${isVietnamese ? "Tổng tiền" : "Total"}","${isVietnamese ? "Đã thu" : "Paid"}","${isVietnamese ? "Còn nợ" : "Balance"}","${isVietnamese ? "Trạng thái" : "Status"}"`,
    ...sales.map(s => `"${s.saleNumber}","${s.soldAt.slice(0, 10)}","${(s.customerName || "").replace(/"/g, '""')}","${s.totalAmount}","${s.paidAmount}","${s.outstandingBalance}","${s.paymentStatus}"`),
    "",
    `"=== ${isVietnamese ? "CHI PHÍ HOẠT ĐỘNG" : "OPERATING EXPENSES"} ==="`,
    `"${isVietnamese ? "Ngày" : "Date"}","${isVietnamese ? "Danh mục" : "Category"}","${isVietnamese ? "Diễn giải" : "Description"}","${isVietnamese ? "Số tiền" : "Amount"}"`,
    ...expenses.map(e => `"${e.expenseDate.slice(0, 10)}","${(e.category || "").replace(/"/g, '""')}","${(e.description || "").replace(/"/g, '""')}","${e.amount}"`),
    "",
    `"=== ${isVietnamese ? "NHẬP HÀNG NHÀ CUNG CẤP" : "INVENTORY PURCHASES"} ==="`,
    `"${isVietnamese ? "Mã phiếu" : "Bill #"}","${isVietnamese ? "Ngày" : "Date"}","${isVietnamese ? "Nhà cung cấp" : "Supplier"}","${isVietnamese ? "Tổng tiền" : "Total"}","${isVietnamese ? "Đã trả" : "Paid"}","${isVietnamese ? "Còn nợ" : "Balance"}"`,
    ...purchases.map(p => `"${p.purchaseNumber}","${p.purchasedAt.slice(0, 10)}","${(p.supplierName || "").replace(/"/g, '""')}","${p.totalAmount}","${p.paidAmount}","${p.outstandingBalance}"`),
  ];

  // Prepend UTF-8 BOM
  const csvContent = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const cleanName = data.companyName.toLowerCase().replace(/[^a-z0-9]/gi, "_").slice(0, 25);
  const periodSlug = data.periodLabel.toLowerCase().replace(/[^a-z0-9]/gi, "_");
  const defaultFilename = `Tenvora_Report_${cleanName}_${periodSlug}.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", filename || defaultFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
