import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { BrandLogo } from "@/components/BrandLogo";
import { SUPPORT_EMAIL } from "@/lib/supportContact";

export default function TermsPage() {
  const { isVietnamese } = useLanguage();
  const supportEmail = SUPPORT_EMAIL;
  return <main className="mx-auto max-w-3xl space-y-6 px-5 py-10">
    <BrandLogo size="lg" />
    <h1 className="text-3xl font-bold">{isVietnamese ? "Điều khoản dịch vụ Tenvora" : "Tenvora terms of service"}</h1>
    <p className="text-sm text-muted-foreground">{isVietnamese ? "Cập nhật: 6 tháng 10, 2026" : "Updated: October 6, 2026"}</p>
    <section className="space-y-3"><h2 className="text-xl font-bold">{isVietnamese ? "Chấp nhận điều khoản" : "Acceptance of terms"}</h2>
      <p>{isVietnamese ? "Bằng việc truy cập hoặc sử dụng Tenvora, bạn đồng ý tuân thủ các điều khoản dịch vụ này. Nếu bạn không đồng ý, vui lòng không sử dụng dịch vụ." : "By accessing or using Tenvora, you agree to be bound by these terms of service. If you do not agree, please do not use the service."}</p>
    </section>
    <section className="space-y-3"><h2 className="text-xl font-bold">{isVietnamese ? "Tài khoản và bảo mật" : "Accounts and security"}</h2>
      <p>{isVietnamese ? "Bạn có trách nhiệm bảo mật thông tin tài khoản và mật khẩu của mình. Mọi hoạt động diễn ra dưới tài khoản của bạn là trách nhiệm của bạn." : "You are responsible for safeguarding your account credentials and password. Any activity under your account is your responsibility."}</p>
    </section>
    <section className="space-y-3"><h2 className="text-xl font-bold">{isVietnamese ? "Dữ liệu và quyền riêng tư" : "Data and privacy"}</h2>
      <p>{isVietnamese ? "Việc thu thập và sử dụng dữ liệu của bạn được quản lý bởi Chính sách quyền riêng tư của chúng tôi." : "The collection and use of your data is governed by our Privacy Policy."}</p>
      <Link className="underline font-semibold" to="/privacy">{isVietnamese ? "Xem chính sách quyền riêng tư" : "View privacy policy"}</Link>
    </section>
    <section className="space-y-3"><h2 className="text-xl font-bold">{isVietnamese ? "Liên hệ" : "Contact"}</h2>
      {supportEmail ? <a className="underline" href={`mailto:${supportEmail}`}>{supportEmail}</a> : <p>{isVietnamese ? "Liên hệ nhà phát triển qua trang hỗ trợ." : "Contact the developer through support."}</p>}
    </section>
    <Link className="inline-block underline" to="/">{isVietnamese ? "Trang chủ" : "Home"}</Link>
  </main>;
}
