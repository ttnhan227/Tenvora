import { AiUiContext } from "@/services/aiService";

export interface ContextualPrompt {
  id: string;
  label: string;
  prompt: string;
}

export function contextFromPath(pathname: string, search = ""): AiUiContext {
  const match = pathname.match(/^\/(customers|products|sales|suppliers|purchases)\/([0-9a-f-]{36})/i);
  const singular: Record<string, AiUiContext["entity"]> = {
    customers: "customer",
    products: "product",
    sales: "sale",
    suppliers: "supplier",
    purchases: "purchase",
  };
  const filters = Object.fromEntries(new URLSearchParams(search).entries());
  return {
    route: pathname,
    ...(match ? { entity: singular[match[1].toLowerCase()], entityId: match[2] } : {}),
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
  };
}

export function getContextualPrompts(
  uiContext: AiUiContext,
  isVietnamese: boolean,
  t: (key: string, paramsOrFallback?: any, fallback?: string) => string
): ContextualPrompt[] {
  const route = uiContext.route ?? "";
  const entity = uiContext.entity;

  if (entity === "customer" && uiContext.entityId) {
    return [
      {
        id: "cust-remind-debt",
        label: t("copilot.prompt.remind_debt", undefined, isVietnamese ? "Nhắc nợ khách này" : "Remind debt"),
        prompt: isVietnamese ? "Nhắc nợ khách hàng này" : "Remind customer about their debt",
      },
      {
        id: "cust-new-sale",
        label: t("copilot.prompt.new_sale_cust", undefined, isVietnamese ? "Lên đơn cho khách này" : "Sale for customer"),
        prompt: isVietnamese ? "Lên đơn bán hàng cho khách này" : "Create a new sale for this customer",
      },
      {
        id: "cust-summary",
        label: t("copilot.prompt.cust_summary", undefined, isVietnamese ? "Giao dịch gần đây" : "Recent history"),
        prompt: isVietnamese ? "Tóm tắt giao dịch gần đây của khách này" : "Summarize recent activity for this customer",
      },
    ];
  }

  if (route.startsWith("/customers")) {
    return [
      {
        id: "custs-overdue",
        label: t("copilot.prompt.who_owes_30", undefined, isVietnamese ? "Ai nợ quá 30 ngày?" : "Who owes > 30 days?"),
        prompt: isVietnamese ? "Ai đang nợ quá 30 ngày?" : "Who owes me over 30 days?",
      },
      {
        id: "custs-top-debt",
        label: t("copilot.prompt.top_debt", undefined, isVietnamese ? "Top nợ nhiều nhất" : "Top debt"),
        prompt: isVietnamese ? "Top khách hàng nợ nhiều nhất" : "Who has the highest outstanding debt?",
      },
      {
        id: "custs-total-debt",
        label: t("copilot.prompt.total_debt", undefined, isVietnamese ? "Tổng công nợ khách" : "Total debt"),
        prompt: isVietnamese ? "Tổng nợ khách hàng chưa thu là bao nhiêu?" : "What is the total customer debt?",
      },
    ];
  }

  if (entity === "product" && uiContext.entityId) {
    return [
      {
        id: "prod-restock",
        label: t("copilot.prompt.restock_this", undefined, isVietnamese ? "Nhập thêm hàng" : "Restock item"),
        prompt: isVietnamese ? "Nhập thêm hàng cho sản phẩm này" : "Restock this product",
      },
      {
        id: "prod-history",
        label: t("copilot.prompt.prod_history", undefined, isVietnamese ? "Lịch sử bán" : "Sales history"),
        prompt: isVietnamese ? "Lịch sử bán của sản phẩm này thế nào?" : "How is this product selling?",
      },
    ];
  }

  if (route.startsWith("/products")) {
    return [
      {
        id: "prods-low-stock",
        label: t("copilot.prompt.restock_low", undefined, isVietnamese ? "Mặt hàng sắp hết kho" : "Restock low items"),
        prompt: isVietnamese ? "Mặt hàng nào sắp hết kho?" : "Which products are low on stock?",
      },
      {
        id: "prods-out-stock",
        label: t("copilot.prompt.out_stock", undefined, isVietnamese ? "Sản phẩm hết hàng" : "Out of stock"),
        prompt: isVietnamese ? "Sản phẩm nào đã hết hàng?" : "Show me out of stock items",
      },
      {
        id: "prods-fast-movers",
        label: t("copilot.prompt.fast_movers", undefined, isVietnamese ? "Bán chạy nhất" : "Fast movers"),
        prompt: isVietnamese ? "Sản phẩm nào bán chạy nhất tháng này?" : "Which products are selling fastest?",
      },
    ];
  }

  if (route.startsWith("/purchases") || route.startsWith("/suppliers")) {
    return [
      {
        id: "supp-overdue-bills",
        label: t("copilot.prompt.overdue_bills", undefined, isVietnamese ? "Hóa đơn nhập quá hạn" : "Overdue bills"),
        prompt: isVietnamese ? "Hóa đơn nhập hàng nào đã quá hạn?" : "Which supplier bills are overdue?",
      },
      {
        id: "supp-pay-oldest",
        label: t("copilot.prompt.pay_oldest_supp", undefined, isVietnamese ? "Trả bill cũ nhất" : "Pay oldest bill"),
        prompt: isVietnamese ? "Thanh toán công nợ nhà cung cấp cũ nhất" : "Pay the oldest unpaid supplier bill",
      },
      {
        id: "supp-total-debt",
        label: t("copilot.prompt.supp_debt", undefined, isVietnamese ? "Nợ nhà cung cấp" : "Supplier payables"),
        prompt: isVietnamese ? "Tổng công nợ tôi đang nợ nhà cung cấp là bao nhiêu?" : "How much do I owe suppliers?",
      },
    ];
  }

  if (route.startsWith("/expenses")) {
    return [
      {
        id: "exp-top",
        label: t("copilot.prompt.exp_summary", undefined, isVietnamese ? "Chi phí nhiều nhất" : "Top expenses"),
        prompt: isVietnamese ? "Hạng mục chi phí nhiều nhất tháng này?" : "What are the highest expenses this month?",
      },
      {
        id: "exp-quick",
        label: t("copilot.prompt.exp_quick", undefined, isVietnamese ? "Chi điện 350k" : "Electric bill"),
        prompt: isVietnamese ? "Chi 350k tiền điện hôm nay" : "Record 50 USD electricity expense today",
      },
    ];
  }

  if (route.startsWith("/sales")) {
    return [
      {
        id: "sales-today",
        label: t("copilot.prompt.sales_today", undefined, isVietnamese ? "Doanh thu hôm nay" : "Today sales"),
        prompt: isVietnamese ? "Hôm nay bán được bao nhiêu?" : "How much did we sell today?",
      },
      {
        id: "sales-unpaid",
        label: t("copilot.prompt.sales_unpaid", undefined, isVietnamese ? "Đơn chưa thu đủ" : "Unpaid sales"),
        prompt: isVietnamese ? "Có đơn hàng nào chưa thanh toán đủ không?" : "Are there any partially paid sales?",
      },
    ];
  }

  // Default / Dashboard
  return [
    {
      id: "def-sales-today",
      label: t("copilot.prompt.sales_today", undefined, isVietnamese ? "Doanh thu hôm nay" : "Today sales"),
      prompt: isVietnamese ? "Hôm nay bán được bao nhiêu?" : "How much did we sell today?",
    },
    {
      id: "def-restock-low",
      label: t("copilot.prompt.restock_low", undefined, isVietnamese ? "Mặt hàng sắp hết" : "Restock low items"),
      prompt: isVietnamese ? "Mặt hàng nào sắp hết kho?" : "Which products are low on stock?",
    },
    {
      id: "def-who-owes",
      label: t("copilot.prompt.who_owes_30", undefined, isVietnamese ? "Ai nợ quá 30 ngày?" : "Who owes > 30 days?"),
      prompt: isVietnamese ? "Ai đang nợ quá 30 ngày?" : "Who owes me over 30 days?",
    },
    {
      id: "def-overdue-bills",
      label: t("copilot.prompt.overdue_bills", undefined, isVietnamese ? "Hóa đơn nhập quá hạn" : "Overdue bills"),
      prompt: isVietnamese ? "Hóa đơn nhập hàng nào đã quá hạn?" : "Which supplier bills are overdue?",
    },
  ];
}
