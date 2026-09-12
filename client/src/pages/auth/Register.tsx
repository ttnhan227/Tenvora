import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

type RegistrationField = "companyName" | "email" | "password" | "baseCurrency";
type RegistrationErrors = Partial<Record<RegistrationField, string>>;

const serverFieldMap: Record<string, RegistrationField> = {
  companyname: "companyName",
  company: "companyName",
  email: "email",
  password: "password",
  basecurrency: "baseCurrency",
  currency: "baseCurrency",
};

function inferField(message: string): RegistrationField | undefined {
  const normalized = message.toLowerCase();
  if (normalized.includes("email")) return "email";
  if (normalized.includes("company") || normalized.includes("studio name")) return "companyName";
  if (normalized.includes("password")) return "password";
  if (normalized.includes("currency")) return "baseCurrency";
  return undefined;
}

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<RegistrationErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const clearFieldError = (field: RegistrationField) => {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError("");
  };

  const focusFirstInvalidField = (errors: RegistrationErrors) => {
    const first = (["companyName", "email", "password", "baseCurrency"] as RegistrationField[])
      .find((field) => errors[field]);
    if (!first) return;

    const id = first === "companyName" ? "company" : first === "baseCurrency" ? "currency" : first;
    window.setTimeout(() => document.getElementById(id)?.focus(), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const validationErrors: RegistrationErrors = {};
    if (!companyName.trim()) validationErrors.companyName = "Enter your full name or studio name.";
    if (!email.trim()) {
      validationErrors.email = "Enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      validationErrors.email = "Enter a valid email address, such as name@example.com.";
    }
    if (!password) {
      validationErrors.password = "Create a password.";
    } else if (password.length < 6) {
      validationErrors.password = "Password must contain at least 6 characters.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError("Please correct the highlighted fields.");
      focusFirstInvalidField(validationErrors);
      return;
    }

    setIsLoading(true);

    try {
      const result = await register(companyName.trim(), email.trim(), password, baseCurrency);
      if (result.success) {
        navigate("/dashboard");
      } else {
        const serverErrors: RegistrationErrors = {};
        const unassignedErrors: string[] = [];

        for (const [serverField, messages] of Object.entries(result.fieldErrors || {})) {
          const field = serverFieldMap[serverField.replace(/[^a-z]/gi, "").toLowerCase()];
          if (field && messages[0]) serverErrors[field] = messages[0];
          else unassignedErrors.push(...messages);
        }

        for (const message of result.errors || []) {
          if (Object.values(serverErrors).includes(message)) continue;
          const field = inferField(message);
          if (field && !serverErrors[field]) serverErrors[field] = message;
          else unassignedErrors.push(message);
        }

        setFieldErrors(serverErrors);
        if (Object.keys(serverErrors).length > 0) {
          setError(unassignedErrors[0] || "Please correct the highlighted field and try again.");
          focusFirstInvalidField(serverErrors);
        } else {
          setError(unassignedErrors[0] || result.message || "Registration failed. Please try again.");
        }
      }
    } catch {
      setError("An error occurred during account creation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 font-sans text-xs">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <BrandLogo to="/" size="lg" className="justify-center" />
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Cash-flow clarity for freelancers and independent studios</p>
        </div>

        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 text-center bg-slate-50/60 dark:bg-slate-800/50">
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Create Your Freelancer Workspace</h1>
            <CardDescription className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Match income to invoices, plan a tax reserve, and understand what remains
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <Alert variant="destructive" role="alert">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="company" className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wide">
                  Your Full Name or Studio Name
                </Label>
                <Input
                  id="company"
                  placeholder="e.g. Alex Rivera Design"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    clearFieldError("companyName");
                  }}
                  disabled={isLoading}
                  required
                  aria-invalid={!!fieldErrors.companyName}
                  aria-describedby={fieldErrors.companyName ? "company-error" : undefined}
                  className={`h-10 rounded-lg text-xs ${fieldErrors.companyName ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {fieldErrors.companyName && (
                  <p id="company-error" className="text-[11px] font-medium text-destructive" role="alert">
                    {fieldErrors.companyName}
                  </p>
                )}
              </div>

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
                    clearFieldError("email");
                  }}
                  disabled={isLoading}
                  required
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  className={`h-10 rounded-lg font-mono text-xs ${fieldErrors.email ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {fieldErrors.email && (
                  <p id="email-error" className="text-[11px] font-medium text-destructive" role="alert">
                    {fieldErrors.email}
                  </p>
                )}
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
                    clearFieldError("password");
                  }}
                  disabled={isLoading}
                  required
                  minLength={6}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? "password-error" : "password-help"}
                  className={`h-10 rounded-lg font-mono text-xs ${fieldErrors.password ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive" : ""}`}
                />
                {fieldErrors.password ? (
                  <p id="password-error" className="text-[11px] font-medium text-destructive" role="alert">
                    {fieldErrors.password}
                  </p>
                ) : (
                  <p id="password-help" className="text-[11px] text-muted-foreground">Use at least 6 characters.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="currency" className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wide">
                    Primary Currency
                  </Label>
                  <Select value={baseCurrency} onValueChange={(value) => {
                    setBaseCurrency(value);
                    clearFieldError("baseCurrency");
                  }} disabled={isLoading}>
                    <SelectTrigger
                      id="currency"
                      aria-invalid={!!fieldErrors.baseCurrency}
                      aria-describedby={fieldErrors.baseCurrency ? "currency-error" : undefined}
                      className={`h-10 text-xs rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 ${fieldErrors.baseCurrency ? "border-destructive focus:border-destructive focus:ring-destructive" : ""}`}
                    >
                      <SelectValue placeholder="USD" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
                      <SelectItem value="GBP">GBP (£) - British Pound</SelectItem>
                      <SelectItem value="SGD">SGD (S$) - Singapore Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldErrors.baseCurrency && (
                    <p id="currency-error" className="text-[11px] font-medium text-destructive" role="alert">
                      {fieldErrors.baseCurrency}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wide">
                    Tax Reserve Planning
                  </p>
                  <div className="flex h-10 items-center justify-between rounded-lg border border-amber-200 bg-amber-50/60 px-3 text-xs dark:border-amber-800/50 dark:bg-amber-950/30">
                    <span className="font-bold text-amber-800 dark:text-amber-300">25% suggested</span>
                    <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">Adjust after signup</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-100 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/30 p-3.5 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-950 dark:text-emerald-300">
                  <span>✓</span> Individual Identity &amp; Solo Protection
                </div>
                <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                  Includes recorded operating and tax-reserve categories, client invoicing, and balanced ledger records. No external bank account is created.
                </p>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                size="sm"
                className="w-full font-bold h-10 mt-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs rounded-xl text-sm"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isLoading ? "Setting up your workspace…" : "Create Free Workspace"}
              </Button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center space-y-2">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Already have an account?{" "}
                <Link to="/login" className="inline-flex min-h-8 items-center font-bold text-primary hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
