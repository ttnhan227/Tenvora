import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { AuthAside } from "@/components/auth/AuthAside";
import { GoogleSignInButton, isGoogleAuthEnabled } from "@/components/auth/GoogleSignInButton";

export default function Login() {
  const navigate = useNavigate();
  const { login, googleLogin } = useAuth();
  const { isVietnamese } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const handleGoogleCredential = async (cred: string) => {
    setGoogleBusy(true);
    setError("");
    setFieldErrors({});
    try {
      const result = await googleLogin(cred);
      if (result.success) {
        navigate("/dashboard");
      } else {
        setError(result.message || result.errors?.[0] || (isVietnamese ? "Đăng nhập Google thất bại." : "Google sign-in failed."));
      }
    } catch {
      setError(isVietnamese ? "Đã xảy ra lỗi khi đăng nhập bằng Google." : "An error occurred during Google sign-in.");
    } finally {
      setGoogleBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const validationErrors: { email?: string; password?: string } = {};
    if (!email.trim()) validationErrors.email = isVietnamese ? "Vui lòng nhập địa chỉ email." : "Enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) validationErrors.email = isVietnamese ? "Email không đúng định dạng." : "Enter a valid email address.";
    if (!password) validationErrors.password = isVietnamese ? "Vui lòng nhập mật khẩu." : "Enter your password.";
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError(isVietnamese ? "Vui lòng sửa các trường được đánh dấu." : "Please correct the highlighted fields.");
      window.setTimeout(() => document.getElementById(validationErrors.email ? "email" : "password")?.focus(), 0);
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate("/dashboard");
      } else {
        setError(isVietnamese ? "Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại." : "The email address or password did not match. Check both fields and try again.");
      }
    } catch {
      setError(isVietnamese ? "Đã xảy ra lỗi trong quá trình xác thực." : "An error occurred during authentication");
    } finally {
      setIsLoading(false);
    }
  };

  const isBusy = isLoading || googleBusy;

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-[1fr_1fr]">
      <AuthAside title={isVietnamese ? "Tiếp tục công việc kinh doanh của bạn một cách rõ ràng, chính xác." : "Pick up exactly where your business left off."} />
      <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between">
            <Link to="/" className="friendly-focus inline-flex items-center gap-2 rounded-lg text-sm font-bold text-muted-foreground hover:text-foreground">
              <ArrowLeft size={16} />
              {isVietnamese ? "Trang chủ" : "Back home"}
            </Link>
            <LanguageToggle />
          </div>
          <BrandLogo to="/" size="lg" />
          <div className="paper-card mt-7 p-6 sm:p-8">
            <h1 className="text-3xl font-bold">{isVietnamese ? "Chào mừng trở lại" : "Welcome back"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isVietnamese ? "Mở sổ tay kinh doanh và tiếp tục theo dõi cửa hàng của bạn." : "Open your business notebook and continue where you left off."}
            </p>

            {error && (
              <Alert variant="destructive" role="alert" className="mt-5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isGoogleAuthEnabled && (
              <div className="mt-6 space-y-4">
                <GoogleSignInButton
                  disabled={isBusy}
                  onCredential={handleGoogleCredential}
                  onError={(msg) => setError(msg)}
                  text="continue_with"
                />
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <span className="relative bg-card px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    {isVietnamese ? "Hoặc đăng nhập bằng email" : "Or continue with email"}
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">{isVietnamese ? "Địa chỉ Email" : "Email address"}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@yourbusiness.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors((current) => ({ ...current, email: undefined }));
                    setError("");
                  }}
                  disabled={isBusy}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
                  className={fieldErrors.email ? "border-destructive" : ""}
                />
                {fieldErrors.email && <p id="login-email-error" role="alert" className="text-[11px] font-medium text-destructive">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">{isVietnamese ? "Mật khẩu" : "Password"}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((current) => ({ ...current, password: undefined }));
                    setError("");
                  }}
                  disabled={isBusy}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
                  className={fieldErrors.password ? "border-destructive" : ""}
                />
                {fieldErrors.password && <p id="login-password-error" role="alert" className="text-[11px] font-medium text-destructive">{fieldErrors.password}</p>}
              </div>

              <Button
                type="submit"
                disabled={isBusy}
                size="lg"
                className="w-full"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isLoading
                  ? (isVietnamese ? "Đang mở sổ sách…" : "Opening your records…")
                  : (isVietnamese ? "Mở sổ tay kinh doanh" : "Open my business notebook")}
              </Button>
            </form>
            <p className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">
              {isVietnamese ? "Chưa có tài khoản Tenvora? " : "New to Tenvora? "}
              <Link to="/register" className="font-bold text-primary hover:underline">
                {isVietnamese ? "Tạo sổ tay kinh doanh" : "Start your business notebook"}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
