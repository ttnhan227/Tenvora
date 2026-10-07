import { APK_DOWNLOAD_URL, MOBILE_INSTALL_URL, PLAY_STORE_URL } from "@/lib/mobileDownloads";
import { Link } from "react-router-dom";
import {
  Download,
  Smartphone,
  Camera,
  ShieldCheck,
  Zap,
  Users,
  RefreshCw,
  Globe2,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { QrCodeCard } from "@/components/mobile/QrCodeCard";
import { GooglePlayButton } from "@/components/mobile/GooglePlayButton";
import { PhoneMockup } from "@/components/mobile/PhoneMockup";
import { useLanguage } from "@/contexts/LanguageContext";

export default function MobileLandingPage() {
  const { isVietnamese } = useLanguage();
  const downloadApkUrl = APK_DOWNLOAD_URL;

  const mobileFeatures = [
    {
      icon: Camera,
      title: isVietnamese ? "Chụp ảnh hoá đơn tức thì" : "Instant Camera Receipts",
      description: isVietnamese
        ? "Chụp ảnh hoá đơn nhà cung cấp, biên lai giấy khi đi chợ và chi phí hoạt động hàng ngày. Ảnh tự động đính kèm vào sổ sách kinh doanh."
        : "Photograph supplier invoices, market paper receipts, and daily business expenses. Photos attach automatically to your permanent business records.",
    },
    {
      icon: Zap,
      title: isVietnamese ? "Ghi đơn bán nhanh 5 giây" : "Fast 5-Second Sales Entry",
      description: isVietnamese
        ? "Chọn sản phẩm, ghi nhận tiền khách trả và theo dõi phần nợ còn lại trong vài giây. Thiết kế cho quầy bán hàng bận rộn."
        : "Tap products, record customer payments, and track partial debt in seconds. Built for high-tempo shop counters where every second matters.",
    },
    {
      icon: Users,
      title: isVietnamese ? "Theo dõi nợ khách hàng" : "Debt & Customer Watchlist",
      description: isVietnamese
        ? "Xem ai nợ bao nhiêu ở bất cứ đâu. Tra cứu đầy đủ lịch sử mua hàng, số điện thoại và số dư nợ ngay khi nói chuyện với khách."
        : "See who owes what anywhere you go. Pull up complete purchase history, phone numbers, and balances while speaking directly with customers.",
    },
    {
      icon: RefreshCw,
      title: isVietnamese ? "Đồng bộ đám mây tức thì" : "Instant Cloud & Web Sync",
      description: isVietnamese
        ? "Mọi giao dịch ghi nhận trên điện thoại tự động xuất hiện trên trang web, báo cáo tài chính và số lượng tồn kho theo thời gian thực."
        : "Transactions recorded on your phone automatically appear on your web dashboard, financial reports, and inventory counts in real time.",
    },
    {
      icon: Globe2,
      title: isVietnamese ? "Song ngữ Anh & Việt" : "Bilingual English & Vietnamese",
      description: isVietnamese
        ? "Hỗ trợ chuẩn tiền tệ Việt Nam (₫ VND), định dạng số điện thoại và ngôn ngữ thân thiện, thực tế cho tiểu thương."
        : "Native support for Vietnamese currency (₫ VND), phone formats, and practical small-business copy tailored to everyday commercial operations.",
    },
    {
      icon: ShieldCheck,
      title: isVietnamese ? "Bảo mật tài khoản và doanh nghiệp" : "Secure account and workspace access",
      description: isVietnamese
        ? "Thông tin đăng nhập được lưu bảo mật trên thiết bị. Sổ sách đồng bộ qua máy chủ và thành viên được cấp quyền có thể truy cập."
        : "Sign-in credentials are stored securely on your device. Business records sync through the hosted service and are available to authorized workspace members.",
    },
  ];

  const installSteps = PLAY_STORE_URL ? [
    { step: "1", title: isVietnamese ? "Mở Google Play" : "Open Google Play", desc: isVietnamese ? "Nhấn nút Google Play hoặc quét mã QR để mở trang Tenvora." : "Tap the Google Play button or scan the QR code to open Tenvora's listing." },
    { step: "2", title: isVietnamese ? "Cài đặt Tenvora" : "Install Tenvora", desc: isVietnamese ? "Nhấn Cài đặt trong Google Play, rồi mở ứng dụng." : "Tap Install in Google Play, then open the app." },
    { step: "3", title: isVietnamese ? "Đăng nhập" : "Sign in", desc: isVietnamese ? "Dùng email hoặc tài khoản Google để truy cập sổ sách của bạn." : "Use your email or Google account to access your business records." },
  ] : [
    {
      step: "1",
      title: isVietnamese ? "Tải file APK Android" : "Download the Android APK",
      desc: isVietnamese
        ? "Nhấn nút tải về để lưu file 'tenvora-mobile.apk' vào điện thoại Android của bạn."
        : "Tap the download button to save 'tenvora-mobile.apk' onto your Android device.",
    },
    {
      step: "2",
      title: isVietnamese ? "Mở file vừa tải về" : "Open the Downloaded File",
      desc: isVietnamese
        ? "Sau khi tải xong, nhấn vào thông báo tải hoàn tất hoặc tìm file trong thư mục 'Tệp' / 'Download' của máy."
        : "Once the download completes, tap the file in your notification bar or find it inside your phone's 'Files' or 'Downloads' folder.",
    },
    {
      step: "3",
      title: isVietnamese ? "Cho phép cài đặt ứng dụng" : "Allow 'Install Unknown Apps'",
      desc: isVietnamese
        ? "Nếu Android hiển thị thông báo bảo mật, nhấn 'Cài đặt' và bật 'Cho phép từ nguồn này' cho trình duyệt hoặc trình quản lý tệp."
        : "If Android displays a security notice, tap 'Settings' and toggle 'Allow from this source' for your browser or file manager.",
    },
    {
      step: "4",
      title: isVietnamese ? "Cài đặt & Đăng nhập" : "Tap Install & Sign In",
      desc: isVietnamese
        ? "Xác nhận cài đặt, mở ứng dụng Tenvora và đăng nhập bằng email hoặc tài khoản Google để truy cập sổ tay kinh doanh của bạn."
        : "Confirm installation, open Tenvora, and log in with your email or Google account to access your business notebook.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b bg-linear-to-b from-card/30 to-background pb-16 pt-12 sm:pb-24 sm:pt-20">
          <div className="pointer-events-none absolute -right-32 -top-40 h-144 w-xl rounded-full bg-accent/40 blur-3xl" />
          <div className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Left Content */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary shadow-xs">
                <Smartphone className="h-3.5 w-3.5" />
                <span>{isVietnamese ? "Ứng dụng Android Native chính thức" : "Native Android App Available"}</span>
              </div>

              <h1 className="text-4xl leading-[1.08] sm:text-5xl lg:text-6xl font-bold tracking-tight">
                {isVietnamese ? (
                  <>
                    Sổ tay kinh doanh của bạn,{" "}
                    <span className="text-primary">nay nằm gọn trong túi áo.</span>
                  </>
                ) : (
                  <>
                    Your business notebook,{" "}
                    <span className="text-primary">now in your pocket.</span>
                  </>
                )}
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {isVietnamese
                  ? "Ghi nhận bán hàng, đính kèm ảnh hoá đơn, tra cứu sổ nợ tại chỗ và cập nhật sổ sách liên tục mà không cần ngồi trước máy tính."
                  : "Record sales, attach camera receipts, lookup customer debts on the spot, and keep your ledger updated without being chained to a computer."}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <GooglePlayButton downloadUrl={downloadApkUrl} />
              </div>

              {/* App Meta Info */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                  {isVietnamese ? "Tương thích Android 8.0+" : "Android 8.0+ Compatible"}
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                  {isVietnamese ? "Tải APK Android trực tiếp" : "Direct Android APK download"}
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                  {PLAY_STORE_URL ? (isVietnamese ? "Có trên Google Play" : "Available on Google Play") : (isVietnamese ? "APK chính thức có sẵn" : "Official APK available")}
                </span>
              </div>
            </div>

            {/* Right Phone Mockup */}
            <div className="flex justify-center lg:justify-end">
              <PhoneMockup />
            </div>
          </div>
        </section>

        {/* Key Features Grid */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="micro-label text-primary">{isVietnamese ? "Dành cho kinh doanh thực tế" : "Built for Physical Businesses"}</p>
            <h2 className="display-type mt-2 text-3xl font-bold sm:text-4xl">
              {isVietnamese ? "Mọi tính năng cửa hàng cần khi di chuyển." : "Everything your shop needs on the road."}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              {isVietnamese
                ? "Thiết kế riêng cho bán lẻ nhanh, quầy giao dịch, các chuyến giao hàng và sạp chợ."
                : "Designed specifically for fast retail, trade counters, delivery runs, and market stalls."}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {mobileFeatures.map((f) => (
              <div
                key={f.title}
                className="paper-card group relative p-6 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border bg-accent/70 text-primary shadow-xs">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Step-by-Step Installation Guide */}
        <section className="border-t bg-card/30 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl mx-auto text-center mb-12">
              <p className="micro-label text-primary">{isVietnamese ? "Cài đặt nhanh" : "Quick Setup"}</p>
              <h2 className="display-type mt-2 text-3xl font-bold sm:text-4xl">
                {PLAY_STORE_URL ? (isVietnamese ? "Cài đặt từ Google Play" : "Install from Google Play") : (isVietnamese ? "Cách cài đặt file APK trên Android" : "How to install the APK on Android")}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                {isVietnamese
                  ? "Làm theo các bước đơn giản này để cài đặt ứng dụng trên điện thoại Samsung, Xiaomi, Oppo hoặc Pixel."
                  : "Follow these simple steps to install the app on your Samsung, Xiaomi, Oppo, or Pixel device."}
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {installSteps.map((item) => (
                <div
                  key={item.step}
                  className="paper-card relative flex flex-col justify-between p-6"
                >
                  <div>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground shadow-xs">
                      {item.step}
                    </span>
                    <h4 className="mt-4 font-bold text-base text-foreground">{item.title}</h4>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Android Security Tip */}
            <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-900 dark:text-amber-200">
              <div className="flex items-start gap-3">
                <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <h5 className="font-bold">
                    {isVietnamese ? "Tại sao Android hiển thị thông báo quyền?" : "Why does Android ask for permission?"}
                  </h5>
                  <p className="mt-1 text-xs leading-relaxed opacity-90">
                    {isVietnamese
                      ? "Android hiển thị lời nhắc bảo vệ tiêu chuẩn bất cứ khi nào bạn cài đặt ứng dụng trực tiếp từ file APK bên ngoài kho ứng dụng Google Play. File APK Tenvora này được đóng gói chính thức từ hệ thống mã nguồn dự án, có chữ ký phát hành được kiểm tra. Chỉ cài từ liên kết chính thức này."
                      : "Android displays a standard protection prompt whenever you install an app outside the Google Play Store (known as side-loading). This Tenvora APK is officially built from our open source repository and has a verified distribution signature. Install only from this official download link."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Call to Action */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-primary px-6 py-12 text-primary-foreground sm:px-12 sm:py-16 shadow-xl">
            <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full border-36 border-white/5" />
            <div className="relative max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-wider text-primary-foreground/75">
                {isVietnamese ? "Sẵn sàng quản lý sổ sách di động?" : "Ready to take your records mobile?"}
              </p>
              <h2 className="display-type mt-2 text-3xl font-bold sm:text-4xl">
                {isVietnamese ? "Tải Tenvora cho Android ngay hôm nay." : "Download Tenvora for Android today."}
              </h2>
              <p className="mt-4 text-primary-foreground/80 text-sm sm:text-base leading-relaxed">
                {isVietnamese
                  ? "Bắt đầu ghi nhận bán hàng từ bất kỳ đâu. Tải xuống hoàn toàn miễn phí, thiết lập dễ dàng và kết nối mượt mà với tài khoản web của bạn."
                  : "Start recording sales from anywhere. Free to download, easy to set up, and seamlessly connected to your web workspace."}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  asChild
                  size="lg"
                  className="border-card bg-card text-foreground hover:bg-card/90 font-bold"
                >
                  <a href={MOBILE_INSTALL_URL} download={PLAY_STORE_URL ? undefined : "tenvora-mobile.apk"}>
                    <Download className="mr-2 h-4 w-4" />
                    {PLAY_STORE_URL ? (isVietnamese ? "Tải trên Google Play" : "Get it on Google Play") : (isVietnamese ? "Tải file APK ngay" : "Download APK Now")}
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-white/20 bg-white/10 text-primary-foreground hover:bg-white/20"
                >
                  <Link to="/register">
                    {isVietnamese ? "Tạo tài khoản miễn phí" : "Create Free Account"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <section className="mx-auto max-w-sm px-5 py-10"><QrCodeCard /></section>
      <Footer />
    </div>
  );
}
