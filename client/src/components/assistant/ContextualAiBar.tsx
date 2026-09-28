import { ArrowUpRight, Sparkles } from "lucide-react";

type PageAssistant = {
  title: string;
  description: string;
  prompts: string[];
};

const english: Record<string, PageAssistant> = {
  dashboard: {
    title: "Your AI business brief",
    description: "Ask Tenvora to read today's live numbers, spot what needs attention, or prepare the next action.",
    prompts: ["Summarize today and flag anything needing attention", "What should I follow up on next?"],
  },
  sales: {
    title: "AI copilot for sales",
    description: "Describe a sale naturally, check unpaid orders, or ask about today's revenue.",
    prompts: ["Help me record a sale", "Show today's sales and unpaid balances"],
  },
  purchases: {
    title: "AI copilot for purchasing",
    description: "Prepare a stock purchase or understand what the business still owes suppliers.",
    prompts: ["Help me record a purchase", "Which supplier payments are outstanding?"],
  },
  expenses: {
    title: "AI copilot for expenses",
    description: "Record costs in plain language and ask Tenvora to explain where money is going.",
    prompts: ["Help me record an expense", "What was our largest expense this week?"],
  },
  customers: {
    title: "AI copilot for customers",
    description: "Create customers, check balances, and turn a customer's purchase into a reviewed sale.",
    prompts: ["Add a customer", "Who owes us money?"],
  },
  suppliers: {
    title: "AI copilot for suppliers",
    description: "Create suppliers, inspect payables, and prepare payments with a confirmation step.",
    prompts: ["Add a supplier", "How much do we owe suppliers?"],
  },
  products: {
    title: "AI copilot for inventory",
    description: "Create products, check live stock, and find items that need replenishment.",
    prompts: ["Add a product", "Which products are low on stock?"],
  },
};

const vietnamese: Record<string, PageAssistant> = {
  dashboard: {
    title: "Bản tin kinh doanh AI",
    description: "Nhờ Tenvora đọc số liệu trực tiếp hôm nay, tìm việc cần chú ý hoặc chuẩn bị thao tác tiếp theo.",
    prompts: ["Tóm tắt hôm nay và chỉ ra việc cần chú ý", "Tôi nên xử lý việc gì tiếp theo?"],
  },
  sales: {
    title: "AI đồng hành bán hàng",
    description: "Mô tả đơn bán tự nhiên, kiểm tra đơn chưa thanh toán hoặc hỏi doanh thu hôm nay.",
    prompts: ["Giúp tôi ghi một đơn bán", "Xem đơn bán hôm nay và số tiền chưa thu"],
  },
  purchases: {
    title: "AI đồng hành nhập hàng",
    description: "Chuẩn bị phiếu nhập hoặc xem doanh nghiệp còn nợ nhà cung cấp bao nhiêu.",
    prompts: ["Giúp tôi ghi một phiếu nhập", "Khoản nào còn nợ nhà cung cấp?"],
  },
  expenses: {
    title: "AI đồng hành chi phí",
    description: "Ghi chi phí bằng lời nói tự nhiên và nhờ Tenvora giải thích dòng tiền đang đi đâu.",
    prompts: ["Giúp tôi ghi một khoản chi", "Khoản chi lớn nhất tuần này là gì?"],
  },
  customers: {
    title: "AI đồng hành khách hàng",
    description: "Tạo khách, kiểm tra công nợ và chuyển lời mô tả mua hàng thành đơn bán để duyệt.",
    prompts: ["Thêm một khách hàng", "Ai đang nợ tiền cửa hàng?"],
  },
  suppliers: {
    title: "AI đồng hành nhà cung cấp",
    description: "Tạo nhà cung cấp, xem công nợ và chuẩn bị thanh toán có bước xác nhận.",
    prompts: ["Thêm một nhà cung cấp", "Cửa hàng đang nợ nhà cung cấp bao nhiêu?"],
  },
  products: {
    title: "AI đồng hành kho hàng",
    description: "Tạo sản phẩm, kiểm tra tồn kho trực tiếp và tìm mặt hàng cần nhập thêm.",
    prompts: ["Thêm một sản phẩm", "Mặt hàng nào sắp hết kho?"],
  },
};

function pageKey(pathname: string) {
  if (pathname === "/dashboard") return "dashboard";
  return pathname.split("/").filter(Boolean)[0] ?? "";
}

export function ContextualAiBar({
  pathname,
  isVietnamese,
  onPrompt,
}: {
  pathname: string;
  isVietnamese: boolean;
  onPrompt: (prompt: string) => void;
}) {
  const content = (isVietnamese ? vietnamese : english)[pageKey(pathname)];
  if (!content) return null;

  return (
    <section className="relative mb-6 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/[.10] via-card to-[hsl(var(--warning)/.10)] p-4 shadow-sm sm:p-5">
      <div aria-hidden className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-extrabold tracking-tight">{content.title}</p>
            <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">{content.description}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          {content.prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onPrompt(prompt)}
              className="friendly-focus group inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary/20 bg-background/80 px-3 text-xs font-semibold text-foreground shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-background hover:shadow-md"
            >
              {prompt}
              <ArrowUpRight className="h-3.5 w-3.5 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
