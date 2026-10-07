import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import apiClient from "@/services/apiClient";
import { getApiErrorMessage } from "@/lib/apiErrors";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { SUPPORT_EMAIL } from "@/lib/supportContact";

export default function DeleteAccountPage() {
  const { user, logout } = useAuth();
  const { isVietnamese } = useLanguage();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<string>();
  const supportEmail = SUPPORT_EMAIL;
  const remove = async () => {
    if (!user || email.trim().toLowerCase() !== user.email.toLowerCase() || busy) return;
    setBusy(true); setError(undefined);
    try {
      const response = await apiClient.post("/account/delete", { confirmationEmail: email.trim() });
      if (response.data.success !== true) throw new Error(response.data.message || "Deletion failed");
      setDeleted(true); logout();
    } catch (failure) {
      setError(getApiErrorMessage(failure, isVietnamese ? "Không thể xóa tài khoản. Thử lại." : "Could not delete your account. Try again.", isVietnamese));
    } finally { setBusy(false); }
  };
  return <main className="mx-auto max-w-xl space-y-6 px-5 py-10">
    <BrandLogo size="lg" />
    <h1 className="text-3xl font-bold">{isVietnamese ? "Xóa tài khoản Tenvora" : "Delete your Tenvora account"}</h1>
    {deleted ? <p role="status">{isVietnamese ? "Tài khoản đã được xóa." : "Your account has been deleted."}</p> : <>
      <p>{isVietnamese ? "Hồ sơ, thông tin đăng nhập và hội thoại AI bị xóa vĩnh viễn. Nếu bạn là thành viên duy nhất, doanh nghiệp cùng toàn bộ sổ sách và ảnh cũng bị xóa. Sổ sách dùng chung được giữ cho thành viên khác và bỏ định danh người thao tác của bạn. Hãy xuất dữ liệu cần giữ trước khi tiếp tục. Không thể hoàn tác." : "Permanently delete your profile, credentials, and AI conversations. If you are the only member, this also deletes your workspace and all business records and photos. Shared business records remain for other members with your actor identity removed. Export anything you need first. This cannot be undone."}</p>
      <p>{isVietnamese ? "Nếu bạn là quản trị viên cuối cùng của nhóm, hãy thêm quản trị viên khác trong mục Nhóm trước." : "If you are the last administrator of a team, add another administrator in Team first."}</p>
      {user ? <form className="space-y-4" onSubmit={e => { e.preventDefault(); void remove(); }}>
        <label htmlFor="confirm-email" className="block font-semibold">{isVietnamese ? "Nhập email để xác nhận" : "Enter your email to confirm"}</label>
        <input id="confirm-email" className="w-full rounded-md border bg-background p-3" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
        <p className="text-sm text-muted-foreground">{user.email}</p>
        {error && <p role="alert" className="text-destructive">{error}</p>}
        <Button variant="destructive" disabled={busy || email.trim().toLowerCase() !== user.email.toLowerCase()}>{busy ? (isVietnamese ? "Đang xóa…" : "Deleting…") : (isVietnamese ? "Xóa vĩnh viễn" : "Delete permanently")}</Button>
      </form> : <p><Link className="font-semibold underline" to="/login">{isVietnamese ? "Đăng nhập trên web" : "Sign in on the website"}</Link>{isVietnamese ? ", rồi quay lại trang này. Không cần cài lại ứng dụng." : ", then return to this page. You do not need to reinstall the app."}</p>}
      {supportEmail && <p>{isVietnamese ? "Không thể đăng nhập? Yêu cầu xóa tài khoản qua " : "Cannot sign in? Request account deletion at "}<a className="underline" href={`mailto:${supportEmail}?subject=Tenvora%20account%20deletion`}>{supportEmail}</a>.</p>}
    </>}
    <Link className="inline-block underline" to="/privacy">{isVietnamese ? "Quyền riêng tư và lưu giữ dữ liệu" : "Privacy and data retention"}</Link>
  </main>;
}
