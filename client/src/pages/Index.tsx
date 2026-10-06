import { PLAY_STORE_URL } from "@/lib/mobileDownloads";
import { GooglePlayButton } from "@/components/mobile/GooglePlayButton";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  PackageOpen,
  ReceiptText,
  Search,
  Users,
  WalletCards,
  Smartphone,
  Download,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Bot,
  Zap,
  Building2,
  ChevronDown,
  Star,
  Layers,
  ArrowUpRight,
  FileSpreadsheet,
  Clock,
  Laptop,
  CheckCircle2,
  XCircle,
  DollarSign,
  Coffee,
  ShoppingBag,
  Truck,
  Wrench,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Index() {
  const { isVietnamese } = useLanguage();
  const [activeTab, setActiveTab] = useState<"overview" | "debt" | "ai">("overview");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const capabilities = [
    {
      icon: ReceiptText,
      title: isVietnamese ? "Ghi nhận bán hàng" : "Record a sale",
      badge: isVietnamese ? "Tốc độ tại quầy" : "Counter Speed",
      body: isVietnamese
        ? "Chọn khách hàng và sản phẩm. Tenvora tự động tính tổng tiền, theo dõi thuế và ghi nhớ phần nợ chưa thu trong một thao tác duy nhất."
        : "Choose the customer and product. Tenvora calculates line totals, tracks taxes, and remembers what is still unpaid in one seamless action.",
      metric: isVietnamese ? "< 5 giây cho mỗi giao dịch" : "< 5 seconds per transaction",
    },
    {
      icon: Users,
      title: isVietnamese ? "Biết rõ ai đang nợ" : "Know who owes you",
      badge: isVietnamese ? "Sổ nợ thời gian thực" : "Real-time Debt Ledger",
      body: isVietnamese
        ? "Mở hồ sơ khách hàng để xem chi tiết từng đơn hàng, tiền đã trả và số dư nợ còn lại. Gửi sổ nợ qua Zalo/WhatsApp hoặc in phiếu PDF."
        : "Open any customer account to see every sale, partial payment, and outstanding debt balance. Send 1-click statements on WhatsApp or print PDF receipts.",
      metric: isVietnamese ? "Không thất thoát công nợ" : "Zero lost receivables",
    },
    {
      icon: PackageOpen,
      title: isVietnamese ? "Theo dõi hàng hoá nhập" : "Track what you buy",
      badge: isVietnamese ? "Tồn kho & Giá vốn" : "Inventory & Costing",
      body: isVietnamese
        ? "Ghi nhận phiếu mua hàng nhà cung cấp và giá vốn từng đơn vị. Số lượng tồn kho tự động trừ dần sau mỗi lần bán."
        : "Log supplier purchases and track unit costs. Stock counts decrement automatically with every sale so you never run blind on inventory.",
      metric: isVietnamese ? "Theo dõi tồn kho nhiều đơn vị tính" : "Live multi-unit stock levels",
    },
    {
      icon: WalletCards,
      title: isVietnamese ? "Ghi nhớ từng khoản chi phí" : "Remember every expense",
      badge: isVietnamese ? "Chụp ảnh hoá đơn" : "Camera Receipt Capture",
      body: isVietnamese
        ? "Chụp ảnh tiền điện nước, phí giao hàng, tiền thuê mặt bằng từ điện thoại. Lưu trữ chứng từ đầy đủ mà không sợ thất lạc hoá đơn giấy."
        : "Snap photos of utility bills, delivery fees, rent, and overhead from your phone camera. Keep every tax deduction documented without paper clutter.",
      metric: isVietnamese ? "Sổ chi tiêu sẵn sàng đối soát" : "Audit-ready daily ledger",
    },
  ];

  const faqs = [
    {
      q: isVietnamese ? "Tenvora có hoạt động đồng thời trên cả điện thoại và máy tính không?" : "Does Tenvora work seamlessly on both phone and laptop?",
      a: isVietnamese
        ? "Có. Mọi giao dịch bán hàng, thu nợ hay nhập hàng bạn ghi lại trên điện thoại sẽ được đồng bộ tức thì lên máy tính qua điện toán đám mây Supabase PostgreSQL, giúp bạn quản lý từ bất kỳ đâu."
        : "Yes. Every sale, payment, and expense recorded on your phone syncs in real time with your desktop web workspace over secure cloud architecture, letting you run your business from anywhere.",
    },
    {
      q: isVietnamese ? "Sổ nợ khách hàng hoạt động như thế nào khi khách chỉ trả một phần?" : "How does partial payment and customer debt tracking work?",
      a: isVietnamese
        ? "Khi tạo đơn bán hàng, bạn chỉ cần nhập số tiền khách đưa trước (hoặc để 0). Tenvora tự động tính phần nợ còn lại, ghi vào sổ nợ của khách và cập nhật tiền mặt thực thu mà bạn không cần phải tính tay."
        : "When creating a sale, simply enter the amount collected (or zero if on credit). Tenvora automatically calculates the unpaid balance, logs it to that customer's debt book, and reflects actual cash flow with zero manual math.",
    },
    {
      q: isVietnamese ? "Tôi có cần kiến thức kế toán phức tạp để sử dụng không?" : "Do I need accounting or bookkeeping training to use Tenvora?",
      a: isVietnamese
        ? "Hoàn toàn không. Tenvora được thiết kế riêng cho người buôn bán, chủ quán và nhà kinh doanh thực tế. Không dùng từ ngữ nợ có phức tạp (debit/credit), chỉ có buôn bán, thu tiền, nợ và lãi thực tế."
        : "Not at all. Tenvora was intentionally built for independent shop owners and merchants. We eliminated confusing double-entry accounting jargon (debits/credits) in favor of clear sales, cash in, debt, and true net profit.",
    },
    {
      q: isVietnamese ? "Dữ liệu kinh doanh của tôi có được bảo mật an toàn không?" : "Is my financial and store data secure?",
      a: isVietnamese
        ? "Dữ liệu của bạn được bảo vệ bởi hệ thống PostgreSQL Row-Level Security (RLS) đa tầng và mã hóa đường truyền TLS. Chỉ có bạn và nhân viên được bạn phân quyền mới có thể xem sổ sách của cửa hàng."
        : "Your data is protected by multi-tenant PostgreSQL Row-Level Security (RLS), encrypted over TLS, and backed by enterprise cloud infrastructure. Only you and your authorized staff can access your business records.",
    },
    {
      q: isVietnamese ? "Tôi có thể xuất dữ liệu ra file Excel hoặc in sổ nợ gửi khách không?" : "Can I export my records to Excel or send PDF account statements?",
      a: isVietnamese
        ? "Có. Bạn có thể xuất danh sách bán hàng, khách hàng, hàng hoá sang file Excel/CSV chỉ với 1 cú nhấp chuột, hoặc tạo phiếu xác nhận công nợ PDF chuyên nghiệp để gửi cho khách hàng."
        : "Yes. You can export sales, customers, and product catalogs to Excel/CSV with a single click, or generate branded PDF statement receipts to send to customers via WhatsApp, Zalo, or email.",
    },
  ];

  return (
    <div id="top" className="flex min-h-screen flex-col bg-background text-foreground transition-colors selection:bg-primary/20">
      <Navbar />

      <main className="flex-1">
        {/* =========================================================================
            1. HERO SECTION: High-impact SaaS Headline & Value Proposition
        ========================================================================= */}
        <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-32">
          {/* Subtle Ambient Backdrops */}
          <div className="pointer-events-none absolute -right-24 -top-32 h-152 w-152 rounded-full bg-accent/45 blur-3xl opacity-75" />
          <div className="pointer-events-none absolute -left-32 top-1/2 h-128 w-lg rounded-full bg-primary/5 blur-3xl opacity-60" />

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              {/* Product Status Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary shadow-xs">
                <Sparkles className="h-3.5 w-3.5" />
                <span>
                  {isVietnamese ? "Sổ tay tài chính thông minh cho doanh nghiệp độc lập" : "The Intelligent Financial Ledger for Independent Commerce"}
                </span>
              </div>

              {/* Main Headline (Preserves test expectation) */}
              <h1 className="mt-6 text-4xl leading-[1.18] sm:leading-[1.12] sm:text-6xl lg:text-7xl font-bold">
                {isVietnamese ? (
                  <>
                    Tạm biệt sổ tay ghi chép.{" "}
                    <span className="text-primary block sm:inline">Giữ trọn sự rõ ràng.</span>
                  </>
                ) : (
                  <>
                    Leave the notebooks behind.{" "}
                    <span className="text-primary block sm:inline">Keep the clarity.</span>
                  </>
                )}
              </h1>

              {/* Subtitle */}
              <p className="mt-6 text-lg sm:text-xl leading-relaxed text-muted-foreground font-normal max-w-2xl mx-auto">
                {isVietnamese
                  ? "Ghi chép bán hàng, theo dõi nợ khách, quản lý tồn kho và kiểm soát chi phí trong một không gian làm việc hiện đại—được tạo ra cho người làm kinh doanh thực thụ, không phải kế toán."
                  : "Record sales, track customer debt, manage inventory, and log expenses in a clean, modern workspace made for real shop owners—not accountants."}
              </p>

              {/* Primary Call to Action Buttons */}
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="w-full sm:w-auto font-bold shadow-md hover:shadow-lg transition-all px-7">
                  <Link to="/register">
                    <span>{isVietnamese ? "Bắt đầu sổ tay kinh doanh" : "Start your business notebook"}</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto font-semibold">
                  <a href="#preview">
                    <BarChart3 className="mr-2 h-4 w-4 text-primary" />
                    <span>{isVietnamese ? "Khám phá giao diện trực tiếp" : "Explore Live Preview"}</span>
                  </a>
                </Button>

                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto font-semibold border-border/80 hover:border-primary/50 text-foreground">
                  <Link to="/mobile">
                    <Smartphone className="mr-2 h-4 w-4 text-primary" />
                    <span>{isVietnamese ? "Tải ứng dụng Android" : "Get Android App"}</span>
                  </Link>
                </Button>
              </div>

              {/* Micro Guarantees */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <Check className="h-4 w-4 text-[hsl(var(--success))]" />
                  <span>{isVietnamese ? "Không thuật ngữ kế toán" : "No accounting jargon"}</span>
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Check className="h-4 w-4 text-[hsl(var(--success))]" />
                  <span>{isVietnamese ? "Dùng trên điện thoại & máy tính" : "Works on phone or laptop"}</span>
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Check className="h-4 w-4 text-[hsl(var(--success))]" />
                  <span>{isVietnamese ? "Cài đặt 60 giây · Hoàn toàn miễn phí" : "60-second setup · 100% Free to use"}</span>
                </span>
              </div>
            </div>

            {/* =========================================================================
                2. INTERACTIVE LIVE PRODUCT PREVIEW SHOWCASE
            ========================================================================= */}
            <div id="preview" className="mt-14 sm:mt-18 pt-4">
              <div className="relative mx-auto max-w-5xl rounded-[1.75rem] border border-border/80 bg-card/90 p-3 sm:p-5 shadow-2xl backdrop-blur-sm">
                {/* Browser/Window Header */}
                <div className="flex items-center justify-between border-b border-border/60 pb-3 px-2 sm:px-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-red-400/80" />
                      <div className="h-3 w-3 rounded-full bg-amber-400/80" />
                      <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
                    </div>
                    <span className="ml-2 hidden sm:inline-block text-xs font-semibold text-muted-foreground">
                      workspace.tenvora.com/records · {isVietnamese ? "Cửa Hàng Thực Phẩm Minh An" : "Minh An Specialty Wholesale"}
                    </span>
                  </div>

                  {/* Interactive Tab Switcher */}
                  <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-muted/40 p-1 text-xs font-semibold">
                    <button
                      onClick={() => setActiveTab("overview")}
                      className={`rounded-lg px-2.5 py-1 transition-all ${
                        activeTab === "overview"
                          ? "bg-card text-foreground shadow-xs font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {isVietnamese ? "Tổng quan trực tiếp" : "Live Overview"}
                    </button>
                    <button
                      onClick={() => setActiveTab("debt")}
                      className={`rounded-lg px-2.5 py-1 transition-all ${
                        activeTab === "debt"
                          ? "bg-card text-foreground shadow-xs font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {isVietnamese ? "Sổ nợ khách" : "Customer Debt"}
                    </button>
                    <button
                      onClick={() => setActiveTab("ai")}
                      className={`rounded-lg px-2.5 py-1 transition-all flex items-center gap-1 ${
                        activeTab === "ai"
                          ? "bg-card text-primary shadow-xs font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Bot className="h-3.5 w-3.5 text-primary" />
                      <span>{isVietnamese ? "Trợ lý AI" : "AI Copilot"}</span>
                    </button>
                  </div>
                </div>

                {/* Tab 1: Executive KPI Overview */}
                {activeTab === "overview" && (
                  <div className="mt-4 space-y-4 animate-fade-in p-1 sm:p-3">
                    {/* Metric Cards Row */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-2xs">
                        <p className="micro-label text-primary">{isVietnamese ? "Doanh số hôm nay" : "Today's Sales"}</p>
                        <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums">₫18,450,000</p>
                        <div className="mt-2 flex items-center gap-1 text-xs text-[hsl(var(--success))] font-semibold">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span>{isVietnamese ? "+14.2% so với tuần trước" : "+14.2% vs last week"}</span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-2xs">
                        <p className="micro-label text-primary">{isVietnamese ? "Tiền mặt thực thu" : "Cash Realized"}</p>
                        <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums">₫14,250,000</p>
                        <p className="mt-2 text-xs text-muted-foreground">{isVietnamese ? "77.2% đã thu tiền mặt / chuyển khoản" : "77.2% collected in cash / transfer"}</p>
                      </div>

                      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-2xs">
                        <p className="micro-label text-amber-700 dark:text-amber-400">{isVietnamese ? "Nợ khách hàng" : "Customer Debt"}</p>
                        <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
                          ₫4,200,000
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">{isVietnamese ? "3 khách hàng đến hạn thu nợ" : "3 accounts due for collection"}</p>
                      </div>

                      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-2xs">
                        <p className="micro-label text-primary">{isVietnamese ? "Tỷ suất lợi nhuận ròng" : "Net Profit Margin"}</p>
                        <p className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums">38.4%</p>
                        <p className="mt-2 text-xs text-muted-foreground">{isVietnamese ? "Ước tính sau giá vốn & chi phí" : "Estimated after COGS & expenses"}</p>
                      </div>
                    </div>

                    {/* Live Stream Table */}
                    <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
                      <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-2.5">
                        <span className="text-xs font-bold text-foreground">{isVietnamese ? "Nhật ký bán hàng gần nhất" : "Recent Ledger Stream"}</span>
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {isVietnamese ? "Đồng bộ tức thì" : "Live Synced"}
                        </span>
                      </div>

                      <div className="divide-y divide-border/50 text-xs sm:text-sm">
                        <div className="flex items-center justify-between p-3.5 hover:bg-muted/15 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold">
                              SA
                            </span>
                            <div>
                              <p className="font-bold">Nam Bakery & Coffee</p>
                              <p className="text-xs text-muted-foreground">25 kg Arabica Premium Beans · #SL-1094</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold tabular-nums">₫5,500,000</p>
                            <span className="inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                              {isVietnamese ? "Còn nợ ₫2,000,000" : "Owes ₫2,000,000"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3.5 hover:bg-muted/15 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold">
                              SA
                            </span>
                            <div>
                              <p className="font-bold">Chị Hoa (Corner Espresso)</p>
                              <p className="text-xs text-muted-foreground">10 kg Espresso Blend · #SL-1093</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold tabular-nums">₫2,200,000</p>
                            <span className="inline-block rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                              {isVietnamese ? "Đã thu đủ" : "Paid in Full"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3.5 hover:bg-muted/15 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                              PO
                            </span>
                            <div>
                              <p className="font-bold">{isVietnamese ? "Hợp tác xã Cà phê Tây Nguyên" : "Highland Bean Cooperative"}</p>
                              <p className="text-xs text-muted-foreground">{isVietnamese ? "Nhập kho 100 kg hạt cà phê · #PO-402" : "Restock 100 kg Green Coffee · #PO-402"}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold tabular-nums text-muted-foreground">-₫8,400,000</p>
                            <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                              {isVietnamese ? "Nhập hàng từ NCC" : "Supplier Restock"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Customer Debt & Receivables */}
                {activeTab === "debt" && (
                  <div className="mt-4 space-y-4 animate-fade-in p-1 sm:p-3">
                    <div className="rounded-xl border border-border/70 bg-card p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
                        <div>
                          <h4 className="text-base font-bold">{isVietnamese ? "Sổ theo dõi nợ khách hàng đang hoạt động" : "Active Customer Debt Ledger"}</h4>
                          <p className="text-xs text-muted-foreground">
                            {isVietnamese ? "Sắp xếp theo số dư lớn nhất · Cập nhật tức thì" : "Sorted by highest balance · Real-time aging ledger"}
                          </p>
                        </div>
                        <span className="self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                          {isVietnamese ? "Tổng nợ chưa thu: ₫4,200,000" : "Total Uncollected: ₫4,200,000"}
                        </span>
                      </div>

                      <div className="divide-y divide-border/50 text-xs sm:text-sm mt-2">
                        <div className="flex items-center justify-between py-3">
                          <div>
                            <p className="font-bold">Nam Bakery & Coffee</p>
                            <p className="text-xs text-muted-foreground">{isVietnamese ? "Mua gần nhất: Hôm nay · SĐT: 0903 124 882" : "Last purchase: Today · Phone: 0903 124 882"}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="font-bold text-amber-700 dark:text-amber-400 tabular-nums text-right">
                              ₫2,000,000
                            </p>
                            <Button size="sm" variant="outline" className="text-xs font-semibold h-8 hidden sm:inline-flex">
                              {isVietnamese ? "Phiếu nợ PDF" : "Statement PDF"}
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between py-3">
                          <div>
                            <p className="font-bold">Tiệm Trà Sữa Phúc Long Minh</p>
                            <p className="text-xs text-muted-foreground">{isVietnamese ? "Mua gần nhất: 2 ngày trước · SĐT: 0988 231 991" : "Last purchase: 2 days ago · Phone: 0988 231 991"}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="font-bold text-amber-700 dark:text-amber-400 tabular-nums text-right">
                              ₫1,500,000
                            </p>
                            <Button size="sm" variant="outline" className="text-xs font-semibold h-8 hidden sm:inline-flex">
                              {isVietnamese ? "Phiếu nợ PDF" : "Statement PDF"}
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between py-3">
                          <div>
                            <p className="font-bold">Nhà Hàng Hương Biển</p>
                            <p className="text-xs text-muted-foreground">{isVietnamese ? "Mua gần nhất: 5 ngày trước · SĐT: 0912 774 220" : "Last purchase: 5 days ago · Phone: 0912 774 220"}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="font-bold text-amber-700 dark:text-amber-400 tabular-nums text-right">
                              ₫700,000
                            </p>
                            <Button size="sm" variant="outline" className="text-xs font-semibold h-8 hidden sm:inline-flex">
                              {isVietnamese ? "Phiếu nợ PDF" : "Statement PDF"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: AI Copilot Workflow */}
                {activeTab === "ai" && (
                  <div className="mt-4 space-y-3 animate-fade-in p-1 sm:p-3">
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">
                          <Bot className="h-5 w-5" />
                        </div>
                        <div className="space-y-1.5 text-xs sm:text-sm">
                          <p className="font-bold text-foreground">Tenvora Copilot</p>
                          <p className="text-muted-foreground leading-relaxed">
                            {isVietnamese ? (
                              <>
                                "Bạn có thể trò chuyện với tôi bằng tiếng Việt hoặc tiếng Anh tự nhiên. Ví dụ: <span className="font-semibold text-foreground">'Bán anh Nam 15kg gạo 300k, khách trả 200k'</span> hoặc hỏi <span className="font-semibold text-foreground">'Lợi nhuận tuần này là bao nhiêu?'</span>"
                              </>
                            ) : (
                              <>
                                "You can talk to me in plain Vietnamese or English. Say: <span className="font-semibold text-foreground">'Sold Nam 15kg rice 300k, paid 200k'</span> or ask <span className="font-semibold text-foreground">'What was my net profit this week?'</span>"
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Mock Interactive Chat Balloon */}
                      <div className="mt-4 rounded-xl border border-border/80 bg-card p-3 space-y-2.5">
                        <div className="flex justify-end">
                          <div className="rounded-2xl rounded-tr-xs bg-primary px-3.5 py-2 text-xs text-primary-foreground font-medium">
                            {isVietnamese
                              ? "Tiệm Nam Bakery hiện còn nợ bao nhiêu, và lần thanh toán gần nhất là khi nào?"
                              : "How much does Nam Bakery still owe us, and when was their last payment?"}
                          </div>
                        </div>
                        <div className="flex justify-start">
                          <div className="rounded-2xl rounded-tl-xs bg-muted/60 px-3.5 py-2.5 text-xs text-foreground space-y-1.5 max-w-md">
                            <p className="font-semibold">
                              {isVietnamese ? (
                                <>Tiệm bánh Nam Bakery hiện còn nợ <strong>₫2,000,000</strong> cho 1 đơn hàng chưa thanh toán.</>
                              ) : (
                                <>Nam Bakery currently owes <strong>₫2,000,000</strong> across 1 unpaid order.</>
                              )}
                            </p>
                            <p className="text-muted-foreground text-[11px]">
                              {isVietnamese
                                ? "Lần thanh toán gần nhất là ₫3,500,000 vào đơn hàng #SL-1094 sáng nay. Bạn có muốn tôi chuẩn bị phiếu nhắc nợ để gửi không?"
                                : "Their last payment was ₫3,500,000 on Order #SL-1094 earlier today. Would you like me to prepare a payment reminder receipt?"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            3. SOCIAL PROOF & METRICS STRIP
        ========================================================================= */}
        <section className="border-y border-border/60 bg-card/40 py-10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4 text-center">
              <div>
                <p className="text-3xl sm:text-4xl font-extrabold text-foreground tabular-nums">₫24.8B+</p>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-medium">
                  {isVietnamese ? "Doanh số được quản lý" : "Commerce volume recorded"}
                </p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-extrabold text-foreground tabular-nums">1,200+</p>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-medium">
                  {isVietnamese ? "Cửa hàng & Nhà phân phối" : "Active stores & warehouses"}
                </p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-extrabold text-foreground tabular-nums">&lt; 30s</p>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-medium">
                  {isVietnamese ? "Thời gian đối soát mỗi ngày" : "Daily balance reconciliation"}
                </p>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-extrabold text-foreground tabular-nums">99.98%</p>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-medium">
                  {isVietnamese ? "Thời gian sẵn sàng đám mây" : "Cloud infrastructure uptime"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            4. CORE CAPABILITIES (Preserves exact test requirements)
        ========================================================================= */}
        <section id="features" className="py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <span className="micro-label text-primary font-bold">{isVietnamese ? "Công việc hàng ngày, được làm sáng tỏ" : "Everyday tasks, made clear"}</span>
              <h2 className="display-type mt-3 text-3xl font-bold sm:text-5xl">
                {isVietnamese ? "Sổ tay kinh doanh của bạn, không còn giấy tờ rườm rà." : "Your business record book, without the paperwork."}
              </h2>
              <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
                {isVietnamese
                  ? "Mọi thứ bạn cần để vận hành trơn tru mỗi ngày. Thiết kế để rõ ràng ngay lập tức và nhập liệu cực nhanh trên mọi thiết bị."
                  : "Everything you need to run daily operations smoothly. Designed for immediate clarity and lightning-fast entries on any device."}
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {capabilities.map((item, index) => (
                <article
                  key={item.title}
                  className="paper-card group relative flex flex-col justify-between overflow-hidden p-6 transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <span className="absolute right-4 top-3 text-5xl font-black text-border/40 select-none">
                    0{index + 1}
                  </span>

                  <div>
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-accent/60 text-primary">
                      <item.icon className="h-6 w-6" />
                    </span>

                    <span className="mt-4 inline-block rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {item.badge}
                    </span>

                    <h3 className="mt-2 text-xl font-bold">{item.title}</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                  </div>

                  <div className="mt-6 border-t border-border/50 pt-3 text-xs font-semibold text-primary">
                    ✓ {item.metric}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================================
            5. HOW IT WORKS (Visual Step-by-Step Workflow)
        ========================================================================= */}
        <section id="workflow" className="border-y border-border/60 bg-card/45 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto">
              <span className="micro-label text-primary font-bold">{isVietnamese ? "Quy trình 3 bước đơn giản" : "Simple 3-step workflow"}</span>
              <h2 className="display-type mt-3 text-3xl font-bold sm:text-4xl lg:text-5xl">
                {isVietnamese ? "Ghi một lần. Tìm thấy ngay khi cần." : "Record it once. Find it when you need it."}
              </h2>
              <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
                {isVietnamese
                  ? "Không còn phải lật ba cuốn sổ tay, cộng tiền bằng tay hay băn khoăn khách đã thanh toán hay chưa."
                  : "No more checking three notebooks, adding totals by hand, or wondering whether someone has paid."}
              </p>
            </div>

            <div className="mt-14 grid gap-8 md:grid-cols-3">
              <div className="paper-card p-6 space-y-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                  1
                </div>
                <h3 className="text-lg font-bold">{isVietnamese ? "1. Ghi đơn tốc độ tại quầy" : "1. Log at Counter Speed"}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {isVietnamese
                    ? "Nhập đơn hàng trong 5 giây. Chọn khách hàng, mặt hàng, số lượng và tiền khách đưa. Hỗ trợ phím tắt trên laptop hoặc 1 chạm trên điện thoại."
                    : "Enter an order in 5 seconds. Select customer, item, quantity, and cash received. Works by keyboard shortcut on laptop or 1-tap touch on mobile."}
                </p>
              </div>

              <div className="paper-card p-6 space-y-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                  2
                </div>
                <h3 className="text-lg font-bold">{isVietnamese ? "2. Tự động đối soát nhiều sổ" : "2. Instant Multi-Book Reconciliation"}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {isVietnamese
                    ? "Nếu khách nợ một phần, Tenvora tự động tách khoản thanh toán, cập nhật sổ nợ khách và trừ kho theo thời gian thực."
                    : "If the customer owes a partial balance, Tenvora automatically splits the payment, updates their debt book, and decrements inventory in real time."}
                </p>
              </div>

              <div className="paper-card p-6 space-y-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
                  3
                </div>
                <h3 className="text-lg font-bold">{isVietnamese ? "3. Bắt đầu ngày mới rõ ràng" : "3. Wake Up to Pure Clarity"}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {isVietnamese
                    ? "Xem lợi nhuận ròng chính xác, tổng nợ chưa thu và hàng cần nhập mỗi tối mà không tốn 2 tiếng cân đối sổ sách thủ công."
                    : "View your exact net profit, total uncollected customer balances, and stock reorder needs every evening without spending 2 hours balancing books."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            6. INDUSTRY SOLUTIONS
        ========================================================================= */}
        <section id="solutions" className="py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <span className="micro-label text-primary font-bold">{isVietnamese ? "Dành riêng cho ngành nghề của bạn" : "Tailored to your trade"}</span>
              <h2 className="display-type mt-3 text-3xl font-bold sm:text-4xl">
                {isVietnamese ? "Thiết kế cho các trụ cột của nền kinh tế." : "Built for the backbone of the economy."}
              </h2>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="paper-card p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold">{isVietnamese ? "Cửa hàng bán lẻ & Tạp hoá" : "Retail & Grocery Stores"}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isVietnamese
                    ? "Quản lý hàng trăm mặt hàng, thanh toán nhanh tại quầy, sổ nợ khách quen và đối soát tiền mặt cuối ngày."
                    : "Manage hundreds of products, fast counter checkout, customer debt book, and daily cash drawer reconciliation."}
                </p>
              </div>

              <div className="paper-card p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <Coffee className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold">{isVietnamese ? "Quán ăn & Café / F&B" : "Cafés & Restaurants"}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isVietnamese
                    ? "Theo dõi doanh thu đồ uống theo ngày, tiền thu theo ca, mua nguyên vật liệu và chi phí hoạt động hàng ngày."
                    : "Track daily beverage sales, shift cash collections, supplier ingredients buying, and daily utility expenses."}
                </p>
              </div>

              <div className="paper-card p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Truck className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold">{isVietnamese ? "Nhà phân phối & Bán sỉ" : "Wholesale & Distributors"}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isVietnamese
                    ? "Giá bán sỉ theo số lượng, bao bì nhiều đơn vị (thùng, bao, kg), thu tiền tài xế giao hàng và in sao kê công nợ."
                    : "Bulk item pricing, multi-unit packaging (bags, boxes, kg), delivery driver collections, and customer balance statements."}
                </p>
              </div>

              <div className="paper-card p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300">
                  <Wrench className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold">{isVietnamese ? "Xưởng dịch vụ & Sửa chữa" : "Workshops & Services"}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isVietnamese
                    ? "Hoá đơn tiền công và phụ tùng, đặt cọc theo đợt, và chụp ảnh hoá đơn lưu trữ phục vụ bảo hành, sửa chữa."
                    : "Labor and spare parts invoices, client milestone deposits, and photo receipt capture for warranty and repairs."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            7. MOBILE APP SPOTLIGHT
        ========================================================================= */}
        <section id="mobile" className="border-t border-border/60 bg-card/40 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-[2.5rem] border border-border/80 bg-card p-8 sm:p-12 lg:p-16 shadow-lg">
              <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-5">
                  <span className="notebook-label">
                    <Smartphone className="mr-2 h-4 w-4" />
                    {isVietnamese ? "Ứng dụng Android đi kèm" : "Android Companion App"}
                  </span>
                  <h2 className="display-type text-3xl font-bold sm:text-4xl lg:text-5xl">
                    {isVietnamese ? "Mang sổ sách kinh doanh đi muôn nơi." : "Take your business records everywhere."}
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed sm:text-lg">
                    {isVietnamese
                      ? "Ghi đơn bán hàng tại quầy trong vài giây, chụp ảnh biên lai bằng camera điện thoại và kiểm tra số dư nợ khách hàng khi đang đi giao hàng."
                      : "Record counter sales in seconds, snap photo receipts with your phone camera, and check customer debt balances while making deliveries."}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <GooglePlayButton />
                    <Button asChild variant="outline" size="lg" className="font-bold">
                      <Link to="/mobile">
                        <span>{isVietnamese ? "Khám phá ứng dụng Mobile" : "Explore Mobile App"}</span>
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground pt-2">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Check className="h-4 w-4 text-[hsl(var(--success))]" />
                      {isVietnamese ? "File cài APK có sẵn tải ngay" : "Direct APK available now"}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <Check className="h-4 w-4 text-[hsl(var(--success))]" />
                      {PLAY_STORE_URL ? (isVietnamese ? "Có trên Google Play" : "Available on Google Play") : (isVietnamese ? "Cài đặt trực tiếp trên Android" : "Install directly on Android")}
                    </span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="paper-card w-full max-w-sm p-6 text-center space-y-4 shadow-xl border border-border/80">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Smartphone className="h-7 w-7" />
                    </div>
                    <h3 className="text-lg font-bold">{isVietnamese ? "Tenvora Phiên bản Android" : "Tenvora Android Edition"}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {isVietnamese
                        ? "Nhanh chóng, gọn nhẹ và đồng bộ thời gian thực với không gian làm việc trên máy tính."
                        : "Fast, lightweight, and synced with your web workspace in real time."}
                    </p>
                    <div className="pt-2">
                      <Button asChild className="w-full font-bold">
                        <Link to="/mobile">{isVietnamese ? "Trải nghiệm trên di động" : "Explore Mobile Experience"}</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            8. COMPARISON MATRIX: Traditional vs Tenvora
        ========================================================================= */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center max-w-3xl mx-auto">
              <span className="micro-label text-primary font-bold">{isVietnamese ? "So sánh thực tế" : "Honest comparison"}</span>
              <h2 className="display-type mt-3 text-3xl font-bold sm:text-4xl">
                {isVietnamese
                  ? "Vì sao các chủ kinh doanh chuyển từ sổ giấy và Excel sang Tenvora."
                  : "Why merchants are replacing paper and spreadsheets."}
              </h2>
            </div>

            <div className="mt-12 overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border/80 bg-muted/40 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="p-4 sm:p-5">{isVietnamese ? "Tính năng / Nhu cầu" : "Capability"}</th>
                    <th className="p-4 sm:p-5">{isVietnamese ? "Sổ tay giấy" : "Paper Notebook"}</th>
                    <th className="p-4 sm:p-5">{isVietnamese ? "Bảng tính Excel" : "Excel Spreadsheet"}</th>
                    <th className="p-4 sm:p-5 bg-primary/5 text-primary">Tenvora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <tr>
                    <td className="p-4 sm:p-5 font-semibold">{isVietnamese ? "Đồng bộ đám mây tức thì" : "Real-time Cloud Sync"}</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">{isVietnamese ? "❌ Không (chỉ lưu trên giấy)" : "❌ Never (Paper only)"}</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">{isVietnamese ? "⚠️ Dễ xung đột và mất file" : "⚠️ Clunky file conflicts"}</td>
                    <td className="p-4 sm:p-5 font-bold text-primary bg-primary/5">{isVietnamese ? "✅ Tức thì trên cả điện thoại & PC" : "✅ Instant on phone & PC"}</td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-5 font-semibold">{isVietnamese ? "Tự động quản lý sổ nợ" : "Automatic Debt Tracking"}</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">{isVietnamese ? "❌ Lật từng trang sổ tìm kiếm" : "❌ Manual page flipping"}</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">{isVietnamese ? "⚠️ Dễ nhầm hoặc lỗi công thức" : "⚠️ Broken formulas"}</td>
                    <td className="p-4 sm:p-5 font-bold text-primary bg-primary/5">{isVietnamese ? "✅ 1 cú nhấp xem công nợ khách" : "✅ 1-click customer statement"}</td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-5 font-semibold">{isVietnamese ? "Chụp ảnh hoá đơn & biên lai" : "Camera Receipt Snapping"}</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">{isVietnamese ? "❌ Đống giấy biên lai dễ thất lạc" : "❌ Piles of loose receipts"}</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">{isVietnamese ? "❌ Không hỗ trợ" : "❌ Not supported"}</td>
                    <td className="p-4 sm:p-5 font-bold text-primary bg-primary/5">{isVietnamese ? "✅ Lưu trực tiếp cùng giao dịch" : "✅ Stored directly on transactions"}</td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-5 font-semibold">{isVietnamese ? "Trợ lý kinh doanh AI Copilot" : "AI Business Assistant"}</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">{isVietnamese ? "❌ Không có" : "❌ None"}</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">{isVietnamese ? "❌ Không có" : "❌ None"}</td>
                    <td className="p-4 sm:p-5 font-bold text-primary bg-primary/5">{isVietnamese ? "✅ Hỏi đáp bằng tiếng Việt tự nhiên" : "✅ Natural-language queries"}</td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-5 font-semibold">{isVietnamese ? "Thời gian làm quen sử dụng" : "Learning Curve"}</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">{isVietnamese ? "Đơn giản nhưng dễ nhầm lẫn" : "Simple but messy"}</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">{isVietnamese ? "Phức tạp, khó dùng trên điện thoại" : "Steep on mobile"}</td>
                    <td className="p-4 sm:p-5 font-bold text-primary bg-primary/5">{isVietnamese ? "✅ Dưới 2 phút là dùng thành thạo" : "✅ Under 2 minutes"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* =========================================================================
            9. INTERACTIVE FAQ ACCORDION
        ========================================================================= */}
        <section id="faq" className="py-20 sm:py-28">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto">
              <span className="micro-label text-primary font-bold">{isVietnamese ? "Giải đáp thắc mắc" : "Got questions?"}</span>
              <h2 className="display-type mt-3 text-3xl font-bold sm:text-4xl">
                {isVietnamese ? "Những câu hỏi thường gặp." : "Frequently asked questions."}
              </h2>
            </div>

            <div className="mt-12 space-y-3">
              {faqs.map((faq, idx) => (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-border/70 bg-card overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="flex w-full items-center justify-between p-5 text-left font-bold text-sm sm:text-base hover:bg-muted/15 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                        openFaq === idx ? "rotate-180 text-primary" : ""
                      }`}
                    />
                  </button>
                  {openFaq === idx && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3 animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================================
            11. HIGH-CONVERTING FINAL CTA BANNER
        ========================================================================= */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-primary px-6 py-14 text-primary-foreground sm:px-14 sm:py-18 shadow-2xl">
            <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border-36 border-white/10 blur-xs" />
            <div className="pointer-events-none absolute -left-12 -bottom-20 h-64 w-64 rounded-full bg-white/5 blur-2xl" />

            <div className="relative max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-widest text-primary-foreground/75">
                {isVietnamese ? "Sẵn sàng bất cứ khi nào bạn muốn" : "Ready when you are"}
              </p>
              <h2 className="display-type mt-3 text-3xl font-bold sm:text-5xl leading-tight">
                {isVietnamese
                  ? "Bắt đầu từ một đơn hàng. Tenvora sẽ sắp xếp mọi thứ ngăn nắp."
                  : "Start with one sale. Tenvora will keep the rest organized."}
              </h2>
              <p className="mt-4 text-base sm:text-lg text-primary-foreground/80 leading-relaxed">
                {isVietnamese
                  ? "Cùng hơn 1.200 chủ kinh doanh độc lập thay thế sổ sách lộn xộn bằng sự rõ ràng, an tâm về tài chính."
                  : "Join over 1,200 independent merchants and shopkeepers who replaced chaotic notebooks with calm, automated financial clarity."}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="border-card bg-card text-foreground hover:bg-card/90 font-bold px-8 shadow-lg">
                  <Link to="/register">
                    <span>{isVietnamese ? "Tạo không gian làm việc" : "Create your workspace"}</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:border-primary-foreground/50 font-bold shadow-sm backdrop-blur-xs">
                  <Link to="/mobile">
                    <Smartphone className="mr-2 h-4 w-4" />
                    <span>{isVietnamese ? "Tải ứng dụng Android" : "Get Android App"}</span>
                  </Link>
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-primary-foreground/90">
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary-foreground" />
                  <span>{isVietnamese ? "Hoàn toàn miễn phí" : "100% Free to use"}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary-foreground" />
                  <span>{isVietnamese ? "Không cần thẻ tín dụng" : "No credit card required"}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary-foreground" />
                  <span>{isVietnamese ? "Xuất dữ liệu bất kỳ lúc nào" : "Export records anytime"}</span>
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
