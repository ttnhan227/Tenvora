import { Link } from "react-router-dom";
import { Smartphone, Download, ShieldCheck, Heart, ArrowUpRight } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Footer() {
  const { isVietnamese } = useLanguage();

  return (
    <footer className="border-t border-border/70 bg-card/40 text-foreground transition-colors">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand & Mission Column */}
          <div className="space-y-4">
            <BrandLogo to="/" size="md" />
            <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
              {isVietnamese
                ? "Hệ điều hành sổ tay tài chính hiện đại dành cho cửa hàng bán lẻ, quán ăn, xưởng dịch vụ và nhà phân phối độc lập."
                : "The modern financial operating ledger for retail shops, restaurants, workshops, and independent distributors."}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="flex h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
              <span className="text-xs font-semibold text-muted-foreground">
                {isVietnamese ? "Hệ thống hoạt động bình thường · Sẵn sàng 99.98%" : "All Systems Operational · 99.98% Uptime"}
              </span>
            </div>
            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-background/50 px-2.5 py-1 font-medium text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                PostgreSQL RLS Protected
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-background/50 px-2.5 py-1 font-medium text-muted-foreground">
                Android & Web Cloud Sync
              </span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              {isVietnamese ? "Sản phẩm" : "Product"}
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <a href="#features" className="hover:text-foreground transition-colors">
                  {isVietnamese ? "Sổ bán hàng & POS" : "Sales & POS Ledger"}
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-foreground transition-colors">
                  {isVietnamese ? "Theo dõi nợ khách hàng" : "Accounts Receivable & Debt"}
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-foreground transition-colors">
                  {isVietnamese ? "Quản lý kho & Nhập hàng" : "Inventory & Costing"}
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-foreground transition-colors">
                  {isVietnamese ? "Trợ lý kinh doanh AI" : "AI Business Copilot"}
                </a>
              </li>
              <li>
                <Link to="/mobile" className="inline-flex items-center gap-1 text-primary hover:underline font-semibold">
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>{isVietnamese ? "Ứng dụng Android (APK)" : "Android Native App"}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Solutions by Industry */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              {isVietnamese ? "Ngành nghề" : "Solutions"}
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <a href="#solutions" className="hover:text-foreground transition-colors">
                  {isVietnamese ? "Cửa hàng bán lẻ & Tạp hoá" : "Retail & Grocery"}
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-foreground transition-colors">
                  {isVietnamese ? "Quán ăn & Café / F&B" : "Cafés & Restaurants"}
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-foreground transition-colors">
                  {isVietnamese ? "Nhà phân phối & Bán sỉ" : "Wholesalers & Distributors"}
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-foreground transition-colors">
                  {isVietnamese ? "Dịch vụ & Sửa chữa" : "Services & Contractors"}
                </a>
              </li>
            </ul>
          </div>

          {/* Security & Access */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              {isVietnamese ? "Bảo mật & Tài nguyên" : "Trust & Access"}
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link to="/login" className="hover:text-foreground transition-colors">
                  {isVietnamese ? "Đăng nhập chủ tiệm" : "Sign In to Workspace"}
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-foreground transition-colors">
                  {isVietnamese ? "Tạo cửa hàng mới (Free)" : "Create Free Account"}
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/ttnhan227/Tenvora/releases/download/mobile-latest/tenvora-mobile.apk"
                  download="tenvora-mobile.apk"
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{isVietnamese ? "Tải file APK trực tiếp" : "Direct APK Binary"}</span>
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-foreground transition-colors">
                  {isVietnamese ? "Câu hỏi thường gặp" : "Frequently Asked Questions"}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Sub-footer */}
        <div className="mt-14 border-t border-border/60 pt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>© {new Date().getFullYear()} Tenvora Technologies Inc.</span>
            <span>· {isVietnamese ? "Ghi một lần. Rõ ràng mãi mãi." : "Record it once. Know it forever."}</span>
          </div>

          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1 text-muted-foreground/80">
              {isVietnamese ? "Đồng hành cùng" : "Made with"}{" "}
              <Heart className="h-3 w-3 text-red-500 fill-red-500" />{" "}
              {isVietnamese ? "các doanh nghiệp độc lập" : "for independent businesses"}
            </span>
            <a href="#top" className="hover:text-foreground transition-colors">
              {isVietnamese ? "Về đầu trang ↑" : "Back to top ↑"}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
