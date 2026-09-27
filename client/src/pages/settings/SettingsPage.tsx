import { useState, useEffect } from "react";
import {
  Store,
  Globe,
  Shield,
  Check,
  Save,
  Loader2,
  Lock,
  Phone,
  User,
  ShoppingBag,
  Coffee,
  Briefcase,
  BookOpenCheck,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { COMMON_CURRENCIES, BusinessType } from "@/data/businessProfiles";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, updateSettings, setPassword } = useAuth();
  const { t, language, setLanguage, isVietnamese } = useLanguage();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<"store" | "display" | "account">("store");

  // Store profile form state
  const [companyName, setCompanyName] = useState(user?.companyName || "");
  const [businessType, setBusinessType] = useState<BusinessType>(
    (user?.businessType as BusinessType) || "retail"
  );
  const [currency, setCurrency] = useState(user?.preferredCurrency || "VND");
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [isSavingStore, setIsSavingStore] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Keep state synced if user profile loads asynchronously
  useEffect(() => {
    if (user) {
      if (!companyName) setCompanyName(user.companyName || "");
      if (user.businessType) setBusinessType(user.businessType as BusinessType);
      if (user.preferredCurrency) setCurrency(user.preferredCurrency);
      if (user.fullName && !fullName) setFullName(user.fullName);
      if (user.phoneNumber && !phoneNumber) setPhoneNumber(user.phoneNumber);
    }
  }, [user]);

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      toast.error(isVietnamese ? "Vui lòng nhập tên cửa hàng / tiệm." : "Please enter your store name.");
      return;
    }

    setIsSavingStore(true);
    try {
      const res = await updateSettings(
        companyName.trim(),
        currency.trim().toUpperCase(),
        businessType,
        fullName.trim() || undefined,
        phoneNumber.trim() || undefined
      );

      if (res.success) {
        toast.success(t("settings.savedSuccess", "Đã lưu cài đặt thành công!"));
      } else {
        toast.error(res.message || t("settings.savedFailed", "Lưu cài đặt thất bại."));
      }
    } catch {
      toast.error(t("settings.savedFailed", "Lưu cài đặt thất bại."));
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 12) {
      setPasswordError(
        isVietnamese
          ? "Mật khẩu mới phải có tối thiểu 12 ký tự."
          : "New password must be at least 12 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        isVietnamese
          ? "Mật khẩu xác nhận không khớp."
          : "Passwords do not match."
      );
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await setPassword(
        user?.hasPassword ? currentPassword : undefined,
        newPassword
      );

      if (res.success) {
        toast.success(t("settings.passwordUpdatedSuccess", "Đổi mật khẩu thành công!"));
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordError(res.message || (isVietnamese ? "Không thể cập nhật mật khẩu" : "Failed to update password"));
      }
    } catch {
      setPasswordError(isVietnamese ? "Đã xảy ra lỗi khi cập nhật mật khẩu." : "An unexpected error occurred while updating password.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Title */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                {t("settings.pageTitle", "Cài đặt")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("settings.pageSubtitle", "Quản lý thông tin cửa hàng, giao diện và tài khoản của bạn.")}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 border-b pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("store")}
            className={`friendly-focus flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
              activeTab === "store"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Store size={18} />
            <span>{t("settings.tabStore", "Cửa hàng")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("display")}
            className={`friendly-focus flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
              activeTab === "display"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Globe size={18} />
            <span>{t("settings.tabDisplay", "Ngôn ngữ & Hiển thị")}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("account")}
            className={`friendly-focus flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
              activeTab === "account"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Shield size={18} />
            <span>{t("settings.tabAccount", "Tài khoản & Mật khẩu")}</span>
          </button>

        </div>

        {/* TAB 1: Store & Business Profile */}
        {activeTab === "store" && (
          <form onSubmit={handleSaveStore} className="space-y-6 animate-fade-in">
            <Card className="rounded-2xl border">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  {t("settings.storeTitle", "Thông tin cửa hàng & Kinh doanh")}
                </CardTitle>
                <CardDescription>
                  {t("settings.storeSubtitle", "Tên tiệm và loại hình buôn bán giúp Tenvora tối ưu sổ sách phù hợp nhất.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="store-name" className="text-sm font-bold">
                    {t("settings.storeName", "Tên cửa hàng / Tên tiệm")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="store-name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={t("settings.storeNamePlaceholder", "Ví dụ: Tiệm Tạp Hoá Cô Ba, Quán Cơm...")}
                    className="min-h-[48px] text-base rounded-xl"
                    required
                  />
                </div>

                {/* Business Type Cards */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold">
                    {t("settings.businessType", "Loại hình kinh doanh")}
                  </Label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Retail */}
                    <div
                      onClick={() => setBusinessType("retail")}
                      className={`cursor-pointer rounded-2xl border-2 p-4 transition-all ${
                        businessType === "retail"
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/40 bg-card"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600">
                          <ShoppingBag size={22} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm flex items-center justify-between">
                            {t("profile.retail", "Tạp hoá & Cửa hàng bán lẻ")}
                            {businessType === "retail" && <Check size={18} className="text-primary" />}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                            {t("profile.retailDesc", "Bán hàng hoá, bánh kẹo, đồ uống, quần áo, quản lý tồn kho và sổ nợ khách.")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Food & Drink */}
                    <div
                      onClick={() => setBusinessType("food")}
                      className={`cursor-pointer rounded-2xl border-2 p-4 transition-all ${
                        businessType === "food"
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/40 bg-card"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600">
                          <Coffee size={22} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm flex items-center justify-between">
                            {t("profile.food", "Quán ăn / Café / Trà sữa")}
                            {businessType === "food" && <Check size={18} className="text-primary" />}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                            {t("profile.foodDesc", "Bán món ăn, thức uống, ghi nhanh thu chi trong ca và mua nguyên vật liệu.")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Services */}
                    <div
                      onClick={() => setBusinessType("services")}
                      className={`cursor-pointer rounded-2xl border-2 p-4 transition-all ${
                        businessType === "services"
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/40 bg-card"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600">
                          <Briefcase size={22} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm flex items-center justify-between">
                            {t("profile.services", "Dịch vụ & Khách hàng")}
                            {businessType === "services" && <Check size={18} className="text-primary" />}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                            {t("profile.servicesDesc", "Sửa chữa, làm đẹp, tư vấn, dịch vụ tính tiền theo lượt hoặc theo công việc.")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Simple Cashbook */}
                    <div
                      onClick={() => setBusinessType("simple")}
                      className={`cursor-pointer rounded-2xl border-2 p-4 transition-all ${
                        businessType === "simple"
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/40 bg-card"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-600">
                          <BookOpenCheck size={22} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm flex items-center justify-between">
                            {t("profile.simple", "Sổ tay thu chi cá nhân")}
                            {businessType === "simple" && <Check size={18} className="text-primary" />}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                            {t("profile.simpleDesc", "Ghi chép tiền vào, tiền ra hàng ngày đơn giản nhất như một cuốn sổ giấy.")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Currency */}
                  <div className="space-y-2">
                    <Label htmlFor="currency-select" className="text-sm font-bold">
                      {t("settings.currency", "Đơn vị tiền tệ chính")}
                    </Label>
                    <select
                      id="currency-select"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full min-h-[48px] rounded-xl border border-input bg-background px-3 py-2 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {COMMON_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol}) - {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="store-phone" className="text-sm font-bold">
                      {t("settings.phone", "Số điện thoại cửa hàng / Liên hệ")}
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="store-phone"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder={t("settings.phonePlaceholder", "090xxxxxxx")}
                        className="pl-10 min-h-[48px] text-base rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Owner Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="owner-name" className="text-sm font-bold">
                    {t("settings.ownerName", "Họ và tên chủ tiệm")}
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="owner-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t("settings.ownerNamePlaceholder", "Nguyễn Văn An, Cô Ba...")}
                      className="pl-10 min-h-[48px] text-base rounded-xl"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isSavingStore}
                    className="min-h-[50px] px-6 text-base font-bold rounded-xl gap-2 shadow-sm"
                  >
                    {isSavingStore ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>{t("common.saving", "Đang lưu...")}</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        <span>{t("settings.saveStoreBtn", "Lưu thông tin cửa hàng")}</span>
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        )}

        {/* TAB 2: Language & Display */}
        {activeTab === "display" && (
          <div className="space-y-6 animate-fade-in">
            {/* Language Selection Card */}
            <Card className="rounded-2xl border">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  {t("settings.languageSection", "Ngôn ngữ hiển thị")}
                </CardTitle>
                <CardDescription>
                  {t("settings.displaySubtitle", "Chọn tiếng Việt thân thiện hoặc tiếng Anh tuỳ ý thích.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Vietnamese */}
                  <div
                    onClick={() => setLanguage("vi")}
                    className={`cursor-pointer rounded-2xl border-2 p-4 transition-all ${
                      isVietnamese
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40 bg-card"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">🇻🇳</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-base">{t("settings.langVi", "🇻🇳 Tiếng Việt")}</p>
                          {isVietnamese && <Check className="h-5 w-5 text-primary" />}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          {t("settings.langViDesc", "Toàn bộ giao diện bằng tiếng Việt bình dị, rõ ràng, không dùng thuật ngữ khó hiểu.")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* English */}
                  <div
                    onClick={() => setLanguage("en")}
                    className={`cursor-pointer rounded-2xl border-2 p-4 transition-all ${
                      !isVietnamese
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40 bg-card"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">🇬🇧</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-base">{t("settings.langEn", "🇬🇧 English")}</p>
                          {!isVietnamese && <Check className="h-5 w-5 text-primary" />}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          {t("settings.langEnDesc", "Full English interface for business records and reports.")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Theme Card */}
            <Card className="rounded-2xl border">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Sun className="h-5 w-5 text-primary" />
                  {t("settings.themeSection", "Màu sắc giao diện")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`friendly-focus flex min-h-[50px] items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all ${
                      theme === "light"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-secondary/40"
                    }`}
                  >
                    <Sun className="h-5 w-5 text-amber-500" />
                    <span className="font-bold text-sm">{t("settings.themeLight", "Giao diện Sáng (Ban ngày)")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`friendly-focus flex min-h-[50px] items-center gap-3 rounded-2xl border-2 p-3 text-left transition-all ${
                      theme === "dark"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-secondary/40"
                    }`}
                  >
                    <Moon className="h-5 w-5 text-indigo-400" />
                    <span className="font-bold text-sm">{t("settings.themeDark", "Giao diện Tối (Ban đêm dịu mắt)")}</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 3: Account & Security */}
        {activeTab === "account" && (
          <div className="space-y-6 animate-fade-in">
            {/* Account Info Card */}
            <Card className="rounded-2xl border">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  {t("settings.accountTitle", "Tài khoản & Bảo mật cá nhân")}
                </CardTitle>
                <CardDescription>
                  {t("settings.accountSubtitle", "Quản lý họ tên chủ tiệm, email và thiết lập mật khẩu đăng nhập.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border bg-muted/30 p-4 space-y-1">
                    <p className="text-xs text-muted-foreground">{t("settings.email", "Email đăng nhập")}</p>
                    <p className="font-mono text-sm font-bold truncate">{user?.email || "user@example.com"}</p>
                  </div>

                  <div className="rounded-xl border bg-muted/30 p-4 space-y-1">
                    <p className="text-xs text-muted-foreground">{isVietnamese ? "Trạng thái đăng nhập Google" : "Google sign-in status"}</p>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <p className="text-sm font-bold">
                        {user?.googleLinked ? t("settings.googleConnected", "Đã liên kết với Google") : (isVietnamese ? "Tài khoản email" : "Email account")}
                      </p>
                    </div>
                  </div>
                </div>

                {user?.googleLinked && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    💡 {t("settings.googleDesc", "Bạn có thể đăng nhập nhanh 1 chạm bằng Google mà không cần nhớ mật khẩu.")}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Change Password Card */}
            <Card className="rounded-2xl border">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  {t("settings.passwordSection", "Đổi / Thiết lập mật khẩu")}
                </CardTitle>
                <CardDescription>
                  {user?.hasPassword
                    ? (isVietnamese ? "Nhập mật khẩu hiện tại và mật khẩu mới an toàn." : "Enter your current password and a secure new password.")
                    : (isVietnamese ? "Tài khoản của bạn đăng ký qua Google. Bạn có thể đặt thêm mật khẩu để đăng nhập bằng cả hai cách." : "Your account uses Google. You can also set a password for direct email sign-in.")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSavePassword} className="space-y-4 max-w-lg">
                  {passwordError && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
                      {passwordError}
                    </div>
                  )}

                  {user?.hasPassword && (
                    <div className="space-y-2">
                      <Label htmlFor="current-pw" className="text-sm font-bold">
                        {t("settings.currentPassword", "Mật khẩu hiện tại")}
                      </Label>
                      <Input
                        id="current-pw"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="min-h-[48px] rounded-xl text-base"
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="new-pw" className="text-sm font-bold">
                      {t("settings.newPassword", "Mật khẩu mới (tối thiểu 12 ký tự)")}
                    </Label>
                    <Input
                      id="new-pw"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={isVietnamese ? "Ít nhất 12 ký tự, gồm chữ hoa, thường & số" : "At least 12 characters with upper, lower & number"}
                      className="min-h-[48px] rounded-xl text-base"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-pw" className="text-sm font-bold">
                      {t("settings.confirmPassword", "Nhập lại mật khẩu mới")}
                    </Label>
                    <Input
                      id="confirm-pw"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="min-h-[48px] rounded-xl text-base"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSavingPassword}
                    className="min-h-[48px] px-6 text-sm font-bold rounded-xl gap-2"
                  >
                    {isSavingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{t("common.saving", "Đang lưu...")}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        <span>{t("settings.savePasswordBtn", "Cập nhật mật khẩu")}</span>
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
