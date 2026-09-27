import { useState } from "react";
import {
  Briefcase,
  Coffee,
  ShoppingBag,
  BookOpenCheck,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
  Store,
  Coins,
  User,
  Phone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  BUSINESS_PROFILES,
  COMMON_CURRENCIES,
  BusinessType,
} from "@/data/businessProfiles";

interface OnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}

export function OnboardingWizard({ open, onOpenChange, onCompleted }: OnboardingWizardProps) {
  const { user, completeOnboarding } = useAuth();
  const { isVietnamese, t } = useLanguage();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<BusinessType>(
    (user?.businessType as BusinessType) || "retail"
  );
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [companyName, setCompanyName] = useState(user?.companyName || "");
  const [currency, setCurrency] = useState(user?.preferredCurrency || "USD");
  const [customCurrency, setCustomCurrency] = useState("");
  const [isCustomCurrency, setIsCustomCurrency] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProfile = BUSINESS_PROFILES[selectedType];
  const activeCurrency = isCustomCurrency ? customCurrency.toUpperCase() : currency;

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!companyName.trim()) {
        setError(isVietnamese ? "Vui lòng nhập tên doanh nghiệp hoặc cửa hàng." : "Please enter your business or shop name.");
        return;
      }
      if (isCustomCurrency && (!customCurrency.trim() || customCurrency.trim().length !== 3)) {
        setError(isVietnamese ? "Vui lòng nhập mã tiền tệ gồm 3 chữ cái (ví dụ: AUD)." : "Please enter a valid 3-letter currency code (e.g. AUD).");
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    setError(null);
    if (step > 1) {
      setStep((s) => (s - 1) as 1 | 2);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const finalCurrency = isCustomCurrency
        ? customCurrency.trim().toUpperCase()
        : currency;

      const trimmedFull = fullName.trim();
      const trimmedPhone = phoneNumber.trim();

      const result = (trimmedFull || trimmedPhone)
        ? await completeOnboarding(
            companyName.trim() || user?.companyName || "My Business",
            finalCurrency,
            selectedType,
            trimmedFull || undefined,
            trimmedPhone || undefined
          )
        : await completeOnboarding(
            companyName.trim() || user?.companyName || "My Business",
            finalCurrency,
            selectedType
          );

      if (result.success) {
        onOpenChange(false);
        onCompleted?.();
      } else {
        setError(result.message || (isVietnamese ? "Không thể lưu thiết lập." : "Failed to save workspace setup."));
      }
    } catch {
      setError(isVietnamese ? "Đã xảy ra lỗi. Vui lòng thử lại." : "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      const trimmedFull = fullName.trim();
      const trimmedPhone = phoneNumber.trim();

      if (trimmedFull || trimmedPhone) {
        await completeOnboarding(
          companyName.trim() || user?.companyName || "My Business",
          currency || "USD",
          selectedType || "retail",
          trimmedFull || undefined,
          trimmedPhone || undefined
        );
      } else {
        await completeOnboarding(
          companyName.trim() || user?.companyName || "My Business",
          currency || "USD",
          selectedType || "retail"
        );
      }
      onOpenChange(false);
      onCompleted?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-6 p-6 sm:p-8">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Sparkles className="h-4 w-4" />
            <span>{isVietnamese ? "Chào mừng đến Tenvora" : "Welcome to Tenvora"} · {isVietnamese ? "Bước" : "Step"} {step}/3</span>
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight sm:text-3xl">
            {step === 1 && (isVietnamese ? "Bạn dùng Tenvora cho công việc gì?" : "What do you use Tenvora for?")}
            {step === 2 && (isVietnamese ? "Thiết lập thông tin cơ bản" : "Let’s set up your business basics")}
            {step === 3 && (isVietnamese ? "Không gian làm việc đã sẵn sàng" : "Your workspace is ready!")}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {step === 1 &&
              (isVietnamese ? "Chọn loại hình phù hợp nhất. Tenvora sẽ điều chỉnh sổ theo nhu cầu của bạn." : "Choose the flow that best matches what you do. We’ll tailor your notebook so you only see what matters.")}
            {step === 2 &&
              (isVietnamese ? "Đặt tên cho doanh nghiệp và chọn đơn vị tiền tệ bạn sử dụng." : "Give your business notebook a name and choose the currency you buy and sell with.")}
            {step === 3 &&
              (isVietnamese ? "Đây là thiết lập Tenvora đã chuẩn bị từ câu trả lời của bạn." : "Here’s how Tenvora has tuned your workspace based on your answers.")}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive"
          >
            {error}
          </div>
        )}

        {/* STEP 1: What do you use it for? */}
        {step === 1 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <OptionCard
              title={t("profile.retail")}
              badge={isVietnamese ? "Hàng hoá & kho" : BUSINESS_PROFILES.retail.badge}
              description={t("profile.retailDesc")}
              icon={ShoppingBag}
              selected={selectedType === "retail"}
              onClick={() => {
                setSelectedType("retail");
                setCurrency("USD");
              }}
              isVietnamese={isVietnamese}
            />
            <OptionCard
              title={t("profile.services")}
              badge={isVietnamese ? "Khách hàng & dịch vụ" : BUSINESS_PROFILES.services.badge}
              description={t("profile.servicesDesc")}
              icon={Briefcase}
              selected={selectedType === "services"}
              onClick={() => {
                setSelectedType("services");
                setCurrency("USD");
              }}
              isVietnamese={isVietnamese}
            />
            <OptionCard
              title={t("profile.food")}
              badge={isVietnamese ? "Bán hàng & chi phí" : BUSINESS_PROFILES.food.badge}
              description={t("profile.foodDesc")}
              icon={Coffee}
              selected={selectedType === "food"}
              onClick={() => {
                setSelectedType("food");
                setCurrency("VND");
              }}
              isVietnamese={isVietnamese}
            />
            <OptionCard
              title={t("profile.simple")}
              badge={isVietnamese ? "Đơn giản & rõ ràng" : BUSINESS_PROFILES.simple.badge}
              description={t("profile.simpleDesc")}
              icon={BookOpenCheck}
              selected={selectedType === "simple"}
              onClick={() => {
                setSelectedType("simple");
                setCurrency("USD");
              }}
              isVietnamese={isVietnamese}
            />
          </div>
        )}

        {/* STEP 2: Business Basics (Name & Currency) */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full-name" className="text-sm font-bold flex items-center gap-1.5">
                  <User className="h-4 w-4 text-primary" />
                  <span>{isVietnamese ? "Họ và tên" : "Your full name"}</span>
                </Label>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={isVietnamese ? "Ví dụ: Trần Trọng Nhân, Minh Nguyễn..." : "e.g. Alex Nguyen, Jamie Lee..."}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone-number" className="text-sm font-bold flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>{isVietnamese ? "Số điện thoại" : "Phone number"}</span>
                </Label>
                <Input
                  id="phone-number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder={isVietnamese ? "Ví dụ: 0912 345 678" : "e.g. +1 555 0100"}
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business-name" className="text-sm font-bold">
                {isVietnamese ? "Tên doanh nghiệp hoặc cửa hàng" : "Business or Shop Name"}
              </Label>
              <Input
                id="business-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={isVietnamese ? "Ví dụ: Tiệm bánh Xanh, Tạp hoá An Nhiên..." : "e.g. Green Bakery, Tech Studio, Mini Mart..."}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                {isVietnamese ? "Tên này xuất hiện trên phiếu bán, lịch sử khách hàng và trang tổng quan." : "Appears on your sales receipts, customer histories, and dashboard."}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold">{isVietnamese ? "Đơn vị tiền tệ chính" : "Primary currency"}</Label>
                <button
                  type="button"
                  onClick={() => setIsCustomCurrency(!isCustomCurrency)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {isCustomCurrency ? (isVietnamese ? "Chọn tiền tệ phổ biến" : "Pick from common currencies") : (isVietnamese ? "Nhập tiền tệ khác" : "Enter other currency")}
                </button>
              </div>

              {!isCustomCurrency ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {COMMON_CURRENCIES.map((curr) => {
                    const isSelected = currency === curr.code;
                    return (
                      <button
                        key={curr.code}
                        type="button"
                        onClick={() => setCurrency(curr.code)}
                        className={`friendly-focus flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                          isSelected
                            ? "border-primary bg-accent/60 shadow-sm font-bold"
                            : "bg-card hover:bg-secondary/60 text-muted-foreground"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs text-muted-foreground">{curr.name}</p>
                          <p className="mt-0.5 font-bold text-foreground">
                            {curr.symbol} {curr.code}
                          </p>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={customCurrency}
                    onChange={(e) => setCustomCurrency(e.target.value.toUpperCase().slice(0, 3))}
                    placeholder="e.g. AUD, CHF, MYR"
                    maxLength={3}
                    className="h-11 uppercase"
                  />
                  <p className="text-xs text-muted-foreground">
                    {isVietnamese ? "Nhập mã ISO gồm 3 chữ cái của đơn vị tiền tệ." : "Enter the standard 3-letter ISO code for your currency."}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl border bg-secondary/35 p-3.5 text-xs text-muted-foreground">
              <span className="font-bold text-foreground">{isVietnamese ? "Xem trước: " : "Notebook preview: "}</span>
              {isVietnamese ? "Sổ của " : "Your records for "}<span className="font-semibold text-foreground">{companyName || (isVietnamese ? "doanh nghiệp của bạn" : "Your business")}</span>{isVietnamese ? " sẽ dùng " : " will track money in "}<span className="font-semibold text-foreground">{activeCurrency}</span>{isVietnamese ? ` cho loại hình ${t(`profile.${selectedType}`)}.` : ` tailored for ${activeProfile.title}.`}
            </div>
          </div>
        )}

        {/* STEP 3: Summary & Ready */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="rounded-2xl border bg-card p-5 sm:p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                    {isVietnamese ? t(`profile.${selectedType}`) : activeProfile.badge}
                  </span>
                  <h3 className="mt-2 text-xl font-bold">{companyName || (isVietnamese ? "Doanh nghiệp của bạn" : "Your Business")}</h3>
                  <p className="text-sm text-muted-foreground">{isVietnamese ? t(`profile.${selectedType}Desc`) : activeProfile.tagline}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-muted-foreground">{isVietnamese ? "Tiền tệ" : "Notebook currency"}</p>
                  <p className="text-lg font-bold text-primary">{activeCurrency}</p>
                </div>
              </div>

              <div className="mt-6 border-t pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {isVietnamese ? "Các bước bắt đầu" : "Your tailored getting started guide"}
                </p>
                <div className="mt-3 space-y-2.5">
                  {activeProfile.starterSteps.map((s, index) => (
                    <div key={s.title} className="flex items-start gap-3 text-sm">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-primary text-xs">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-bold text-foreground">{isVietnamese ? onboardingStepTitle(s.actionHref) : s.title}</p>
                        <p className="text-xs text-muted-foreground">{isVietnamese ? "Mở mục này để thêm bản ghi đầu tiên." : s.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-foreground">{isVietnamese ? "Trợ lý AI & ghi sổ nhanh" : "AI assistant & quick records"}</p>
                  <p className="text-muted-foreground">{isVietnamese ? "Gõ nội dung tự nhiên, sau đó kiểm tra và xác nhận trước khi lưu." : "Type naturally, then review and confirm before saving."}</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {isVietnamese ? "Bạn có thể thay đổi các thiết lập này bất cứ lúc nào trong phần Cài đặt." : "You can always adjust these settings anytime from your workspace menu."}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-4">
          {step > 1 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              disabled={isSubmitting}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t("common.back")}</span>
            </Button>
          ) : (
            <button
              type="button"
              onClick={handleSkip}
              disabled={isSubmitting}
              className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
              {isVietnamese ? "Bỏ qua thiết lập" : "Skip setup for now"}
            </button>
          )}

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <Button type="button" onClick={handleNext} className="gap-2">
                <span>{isVietnamese ? "Tiếp tục" : "Continue"}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleFinish}
                disabled={isSubmitting}
                className="gap-2 bg-primary font-bold text-primary-foreground shadow"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{isVietnamese ? "Đang mở không gian làm việc..." : "Opening workspace..."}</span>
                  </>
                ) : (
                  <>
                    <span>{isVietnamese ? "Mở không gian làm việc" : "Launch my workspace"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OptionCard({
  title,
  badge,
  description,
  icon: Icon,
  selected,
  onClick,
  isVietnamese,
}: {
  title: string;
  badge: string;
  description: string;
  icon: typeof Store;
  selected: boolean;
  onClick: () => void;
  isVietnamese: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`friendly-focus flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
        selected
          ? "border-primary bg-accent/40 shadow-sm ring-1 ring-primary"
          : "border-border bg-card hover:border-primary/40 hover:bg-secondary/40"
      }`}
    >
      <div>
        <div className="flex items-center justify-between">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              selected ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            {badge}
          </span>
        </div>
        <h4 className="mt-3 font-bold text-foreground">{title}</h4>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary">
        {selected ? (
          <>
            <Check className="h-4 w-4" />
            <span>{isVietnamese ? "Đã chọn" : "Selected"}</span>
          </>
        ) : (
          <span className="text-muted-foreground group-hover:text-foreground">{isVietnamese ? "Bấm để chọn" : "Click to select"}</span>
        )}
      </div>
    </button>
  );
}

function onboardingStepTitle(href: string) {
  if (href.startsWith("/products")) return "Thêm hàng hoá";
  if (href.startsWith("/customers")) return "Thêm khách hàng";
  if (href.startsWith("/suppliers")) return "Thêm nhà cung cấp";
  if (href.startsWith("/expenses")) return "Ghi khoản chi";
  if (href.startsWith("/sales")) return "Ghi đơn bán";
  return "Bắt đầu ghi sổ";
}
