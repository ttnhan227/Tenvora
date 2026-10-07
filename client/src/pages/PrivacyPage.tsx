import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { BrandLogo } from "@/components/BrandLogo";
import { SUPPORT_EMAIL } from "@/lib/supportContact";

export default function PrivacyPage() {
  const { isVietnamese } = useLanguage();
  const supportEmail = SUPPORT_EMAIL;
  return <main className="mx-auto max-w-3xl space-y-6 px-5 py-10">
    <BrandLogo size="lg" />
    <h1 className="text-3xl font-bold">{isVietnamese ? "Quyền riêng tư Tenvora" : "Tenvora privacy policy"}</h1>
    <p className="text-sm text-muted-foreground">{isVietnamese ? "Cập nhật: 6 tháng 10, 2026" : "Updated: October 6, 2026"}</p>
    <section className="space-y-3"><h2 className="text-xl font-bold">{isVietnamese ? "Dữ liệu và mục đích" : "Data and purpose"}</h2>
      <p>{isVietnamese ? "Tenvora lưu email tài khoản, hồ sơ, thông tin doanh nghiệp, khách hàng, nhà cung cấp, sản phẩm, giao dịch, ảnh bạn chọn, lịch sử thao tác và hội thoại AI để cung cấp dịch vụ quản lý kinh doanh. Dữ liệu được lưu trên máy chủ và cơ sở dữ liệu do nhà cung cấp dịch vụ lưu trữ vận hành. Thành viên được cấp quyền có thể xem dữ liệu doanh nghiệp theo vai trò." : "Tenvora stores your account email, profile, workspace information, customers, suppliers, products, transactions, selected photos, activity history, and AI conversations to provide business management features. Data is stored on our hosted server and database, operated by hosting providers. Authorized workspace members can access business data according to their role."}</p>
      <p>{isVietnamese ? "Mật khẩu được băm. Thông tin đăng nhập được lưu trong bộ nhớ bảo mật trên Android và bộ nhớ trình duyệt trên web. Nhật ký máy chủ có thể chứa địa chỉ IP, thời điểm và thông tin lỗi để bảo mật và vận hành dịch vụ." : "Passwords are hashed. Sign-in credentials are stored in secure storage on Android and browser storage on the web. Server logs may include IP addresses, timestamps, and error information for service security and operation."}</p>
    </section>
    <section className="space-y-3"><h2 className="text-xl font-bold">{isVietnamese ? "Ảnh, Google và AI" : "Photos, Google and AI"}</h2>
      <p>{isVietnamese ? "Máy ảnh và thư viện ảnh chỉ được dùng khi bạn chọn ảnh hóa đơn hoặc sản phẩm; chỉ ảnh được chọn mới tải lên. Đăng nhập Google gửi mã định danh Google tới máy chủ Tenvora. Khi dùng AI, câu hỏi và ngữ cảnh kinh doanh liên quan được gửi tới Google Gemini (và Mistral AI nếu Gemini không khả dụng) để trả lời hoặc đề xuất thao tác. Bạn xem lại thao tác trước khi thực hiện. Không nhập thông tin nhạy cảm không cần thiết." : "Camera and photo access are used when you choose a receipt or product image; only the selected image is uploaded. Google sign-in sends a Google identity token to the Tenvora server. When you use AI, your question and relevant business context are sent to Google Gemini for answers or action proposals. You review proposed actions before execution. Avoid including unnecessary sensitive information."}</p>
      <p><a className="underline" href="https://policies.google.com/privacy">{isVietnamese ? "Chính sách quyền riêng tư Google" : "Google privacy policy"}</a></p>
      <p>{isVietnamese ? "Dịch vụ được lưu trữ trên Render. Dự án Gemini API của Tenvora đã bật thanh toán. Theo điều khoản dịch vụ trả phí của Google, câu hỏi và câu trả lời không được dùng để cải thiện sản phẩm; Google có thể lưu chúng trong thời gian giới hạn để phát hiện lạm dụng và đáp ứng yêu cầu pháp lý. Tenvora hỏi sự đồng ý trước khi gửi yêu cầu AI; bạn có thể bỏ qua AI và tiếp tục dùng sổ sách." : "The service is hosted on Render. Tenvora's Gemini API project has billing enabled. Under Google's paid-service terms, prompts and responses are not used to improve its products; Google may retain them for a limited period for abuse detection and legal obligations. Tenvora asks for agreement before AI requests; you can decline AI and continue using the business records."}</p>
      <a className="inline-block underline" href="https://ai.google.dev/gemini-api/terms">{isVietnamese ? "Điều khoản Gemini API" : "Gemini API terms"}</a>
    </section>
    <section className="space-y-3" id="deletion"><h2 className="text-xl font-bold">{isVietnamese ? "Lưu giữ và xóa" : "Retention and deletion"}</h2>
      <p>{isVietnamese ? "Bạn có thể xóa tài khoản trong Cài đặt hoặc trên trang xóa tài khoản. Hồ sơ, thông tin đăng nhập và hội thoại AI của bạn bị xóa. Nếu bạn là thành viên duy nhất, doanh nghiệp cùng sổ sách và ảnh cũng bị xóa. Dữ liệu kinh doanh dùng chung được giữ cho thành viên khác, bỏ định danh người thao tác của bạn. Quản trị viên cuối cùng phải thêm quản trị viên khác trước khi xóa tài khoản để tránh bỏ rơi nhóm. Xóa dữ liệu đang hoạt động không xóa tức thì bản sao lưu do nhà cung cấp giữ; bản sao hết hạn theo quy trình lưu giữ của nhà cung cấp." : "Delete your account in Settings or on the account-deletion page. Your profile, credentials, and AI conversations are deleted. If you are the only member, your workspace, business records, and photos are also deleted. Shared business records remain for other members with your actor identity removed. A team's last administrator must add another administrator first to preserve access for the team. Deletion from active storage does not instantly erase existing provider backups; those copies expire through the provider's retention process."}</p>
      <Link className="inline-block font-semibold underline" to="/delete-account">{isVietnamese ? "Xóa tài khoản" : "Delete your account"}</Link>
    </section>
    <section className="space-y-3"><h2 className="text-xl font-bold">{isVietnamese ? "Liên hệ" : "Contact"}</h2>
      {supportEmail ? <a className="underline" href={`mailto:${supportEmail}`}>{supportEmail}</a> : <p>{isVietnamese ? "Liên hệ nhà phát triển qua trang hỗ trợ Tenvora; không đăng dữ liệu cá nhân hoặc sổ sách trong vấn đề công khai." : "Contact the developer through Tenvora's support page. Do not post personal information or business records in public issues."} <a className="underline" href="https://github.com/ttnhan227/Tenvora/issues">Tenvora support</a></p>}
    </section>
    <Link className="inline-block underline" to="/">{isVietnamese ? "Trang chủ" : "Home"}</Link>
  </main>;
}
