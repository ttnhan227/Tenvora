import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const validationErrors: { email?: string; password?: string } = {};
    if (!email.trim()) validationErrors.email = "Enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) validationErrors.email = "Enter a valid email address.";
    if (!password) validationErrors.password = "Enter your password.";
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError("Please correct the highlighted fields.");
      window.setTimeout(() => document.getElementById(validationErrors.email ? "email" : "password")?.focus(), 0);
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate("/dashboard");
      } else {
        setError("The email address or password did not match. Check both fields and try again.");
      }
    } catch {
      setError("An error occurred during authentication");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 font-sans text-xs">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <BrandLogo to="/" size="lg" className="justify-center" />
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Cash-flow clarity for freelancers and independent studios</p>
        </div>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl rounded-2xl">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 text-center">
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Welcome Back</h1>
            <CardDescription className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Sign in to your workspace to manage invoices, tax set-asides, and internal balances
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" role="alert">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wide">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="alex@riveradesign.co"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors((current) => ({ ...current, email: undefined }));
                    setError("");
                  }}
                  disabled={isLoading}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
                  className={`font-mono text-xs ${fieldErrors.email ? "border-destructive" : ""}`}
                />
                {fieldErrors.email && <p id="login-email-error" role="alert" className="text-[11px] font-medium text-destructive">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wide">
                  Password
                </Label>
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
                  disabled={isLoading}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
                  className={`font-mono text-xs ${fieldErrors.password ? "border-destructive" : ""}`}
                />
                {fieldErrors.password && <p id="login-password-error" role="alert" className="text-[11px] font-medium text-destructive">{fieldErrors.password}</p>}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                size="sm"
                className="w-full font-bold h-10 mt-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs text-sm"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isLoading ? "Signing in…" : "Sign In to Your Account"}
              </Button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                New to Tenvora?{" "}
                <Link to="/register" className="inline-flex min-h-8 items-center font-bold text-primary hover:underline">
                  Create a Freelancer Workspace
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
