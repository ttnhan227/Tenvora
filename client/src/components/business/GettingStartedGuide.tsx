import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  Settings2,
  X,
  CheckCircle2,
  Package,
  ReceiptText,
  Users,
  WalletCards,
  PackageOpen,
  Receipt,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProfileOrDefault, BusinessType } from "@/data/businessProfiles";
import { useLanguage } from "@/contexts/LanguageContext";

const viProfileCopy: Record<BusinessType, { shortLabel: string; badge: string; description: string; steps: Array<[string, string, string]> }> = {
  retail: { shortLabel: "Bán lẻ", badge: "Hàng hoá & kho", description: "Phù hợp với cửa hàng tạp hoá, thời trang, điện tử và các điểm bán hàng hoá.", steps: [["Thêm hàng hoá đầu tiên", "Lưu tên, giá và đơn vị để ghi đơn nhanh hơn.", "Thêm hàng hoá"], ["Ghi đơn bán đầu tiên", "Chọn hàng, khách mua và tình trạng thanh toán.", "Ghi đơn bán"], ["Thêm nhà cung cấp", "Theo dõi hàng nhập và số tiền còn nợ nhà cung cấp.", "Thêm nhà cung cấp"]] },
  services: { shortLabel: "Dịch vụ", badge: "Khách hàng & hoá đơn", description: "Phù hợp với tư vấn, sửa chữa, làm đẹp, làm tự do và các doanh nghiệp dịch vụ.", steps: [["Thêm khách hàng đầu tiên", "Lưu thông tin liên hệ và lịch sử thanh toán.", "Thêm khách hàng"], ["Ghi đơn dịch vụ", "Tính tiền dịch vụ với thanh toán đủ hoặc một phần.", "Ghi đơn bán"], ["Ghi chi phí công việc", "Theo dõi vật tư, đi lại và các chi phí liên quan.", "Thêm khoản chi"]] },
  food: { shortLabel: "Ăn uống", badge: "Bán hàng & chi phí hằng ngày", description: "Phù hợp với quán ăn, cà phê, tiệm bánh và các điểm bán đồ ăn thức uống.", steps: [["Ghi đơn bán đầu tiên", "Ghi món, số tiền và phương thức thanh toán.", "Ghi đơn bán"], ["Ghi nguyên liệu và chi phí", "Theo dõi thực phẩm, đá, gas, ly và điện nước.", "Thêm khoản chi"], ["Xem tiền đã thu trong ngày", "Theo dõi doanh thu và thanh toán tự động.", "Xem sổ bán hàng"]] },
  simple: { shortLabel: "Sổ thu chi", badge: "Đơn giản & rõ ràng", description: "Sổ thu chi gọn nhẹ cho người chỉ cần theo dõi tiền vào và tiền ra.", steps: [["Ghi tiền vào", "Ghi khoản tiền doanh nghiệp nhận được hôm nay.", "Ghi khoản thu"], ["Ghi tiền ra", "Ghi tiền thuê, hoá đơn và các chi phí hằng ngày.", "Ghi khoản chi"], ["Kiểm tra sổ", "Xem tổng tiền bán, đã thu và đã chi.", "Xem sổ ghi chép"]] },
};

interface GettingStartedGuideProps {
  companyName: string;
  currency: string;
  businessType?: string | null;
  hasActivity: boolean;
}

export function GettingStartedGuide({
  companyName,
  currency,
  businessType,
  hasActivity,
}: GettingStartedGuideProps) {
  const { isVietnamese } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  const profile = getProfileOrDefault(businessType as BusinessType);
  const localized = viProfileCopy[profile.type];
  const shortLabel = isVietnamese ? localized.shortLabel : profile.shortLabel;
  const badge = isVietnamese ? localized.badge : profile.badge;
  const description = isVietnamese ? localized.description : profile.description;

  if (dismissed) {
    return (
      <div className="flex items-center justify-between rounded-xl border bg-secondary/25 px-4 py-2.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>
            {isVietnamese ? "Đã thiết lập cho" : "Configured for"} <strong className="text-foreground">{shortLabel}</strong> · {isVietnamese ? "Tiền tệ" : "Currency"}:{" "}
            <strong className="text-foreground">{currency}</strong>
          </span>
        </span>
        <div className="flex items-center gap-2">
          <Link to="/settings" className="font-semibold text-primary hover:underline">
            {isVietnamese ? "Tuỳ chỉnh" : "Customize"}
          </Link>
          <span className="text-border">·</span>
          <button
            type="button"
            onClick={() => setDismissed(false)}
            className="font-semibold text-muted-foreground hover:text-foreground"
          >
            {isVietnamese ? "Hiện hướng dẫn" : "Show guide"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label={isVietnamese ? "Hướng dẫn bắt đầu" : "Getting started guide"}
      className="paper-card relative overflow-hidden border-primary/25 bg-linear-to-br from-card via-card to-accent/25 p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{badge}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              {isVietnamese ? "Dùng đơn vị" : "Operating in"} <strong className="text-foreground">{currency}</strong>
            </span>
          </div>

          <h2 className="mt-2 text-xl font-bold sm:text-2xl">
            {hasActivity ? (isVietnamese ? `Chào mừng bạn trở lại ${companyName}` : `Welcome back to ${companyName}`) : (isVietnamese ? `Bắt đầu thiết lập ${companyName}` : `Let’s get ${companyName} up and running`)}
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {description} {isVietnamese ? "Dưới đây là các bước đầu tiên nên làm." : "Here are the recommended first steps to keep your notebook organized."}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
          >
            <Link to="/settings">
              <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{isVietnamese ? "Mở cài đặt" : "Open settings"}</span>
            </Link>
          </Button>
          <button
            type="button"
            aria-label={isVietnamese ? "Ẩn hướng dẫn" : "Dismiss guide"}
            title={isVietnamese ? "Ẩn hướng dẫn" : "Dismiss guide"}
            onClick={() => setDismissed(true)}
            className="friendly-focus inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {profile.starterSteps.map((step, index) => {
          const StepIcon = getStepIcon(index, profile.type);
          const viStep = localized.steps[index];
          const title = isVietnamese ? viStep[0] : step.title;
          const stepDescription = isVietnamese ? viStep[1] : step.description;
          const actionLabel = isVietnamese ? viStep[2] : step.actionLabel;
          return (
            <div
              key={step.title}
              className="flex flex-col justify-between rounded-xl border bg-card/85 p-4 shadow-sm transition-colors hover:border-primary/40"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
                    <StepIcon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">{isVietnamese ? "Bước" : "Step"} {index + 1}</span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-foreground">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{stepDescription}</p>
              </div>

              <div className="mt-4 pt-2">
                <Button asChild size="sm" variant="secondary" className="w-full justify-between text-xs font-bold">
                  <Link to={step.actionHref}>
                    <span>{actionLabel}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function getStepIcon(index: number, type: string) {
  if (type === "services") {
    if (index === 0) return Users;
    if (index === 1) return ReceiptText;
    return WalletCards;
  }
  if (type === "food") {
    if (index === 0) return ReceiptText;
    if (index === 1) return Receipt;
    return CheckCircle2;
  }
  if (type === "simple") {
    if (index === 0) return ReceiptText;
    if (index === 1) return WalletCards;
    return CheckCircle2;
  }
  // retail
  if (index === 0) return Package;
  if (index === 1) return ReceiptText;
  return Store;
}
