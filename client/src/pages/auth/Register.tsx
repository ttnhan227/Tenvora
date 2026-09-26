import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthAside } from "@/components/auth/AuthAside";
import { BrandLogo } from "@/components/BrandLogo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GoogleSignInButton, isGoogleAuthEnabled } from "@/components/auth/GoogleSignInButton";

type Field = "companyName" | "email" | "password" | "baseCurrency";
type Errors = Partial<Record<Field, string>>;
const serverFieldMap: Record<string, Field> = { companyname: "companyName", company: "companyName", email: "email", password: "password", basecurrency: "baseCurrency", currency: "baseCurrency" };
function inferField(message: string): Field | undefined { const value = message.toLowerCase(); if (value.includes("email")) return "email"; if (value.includes("company") || value.includes("business")) return "companyName"; if (value.includes("password")) return "password"; if (value.includes("currency")) return "baseCurrency"; }

export default function Register() {
  const navigate = useNavigate();
  const { register, googleLogin } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("VND");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Errors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const clear = (field: Field) => { setFieldErrors((current) => ({ ...current, [field]: undefined })); setError(""); };
  const focusFirst = (errors: Errors) => { const field = (["companyName", "email", "password", "baseCurrency"] as Field[]).find((key) => errors[key]); if (field) window.setTimeout(() => document.getElementById(field === "companyName" ? "company" : field === "baseCurrency" ? "currency" : field)?.focus(), 0); };

  const handleGoogleCredential = async (cred: string) => {
    setGoogleBusy(true);
    setError("");
    setFieldErrors({});
    try {
      const result = await googleLogin(cred);
      if (result.success) {
        navigate("/dashboard");
      } else {
        setError(result.message || result.errors?.[0] || "Google sign-in failed.");
      }
    } catch {
      setError("An error occurred during Google sign-up.");
    } finally {
      setGoogleBusy(false);
    }
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setFieldErrors({});
    const errors: Errors = {};
    if (!companyName.trim()) errors.companyName = "Enter your business name.";
    if (!email.trim()) errors.email = "Enter your email address."; else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "Enter a valid email address.";
    if (!password) errors.password = "Create a password."; else if (password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) errors.password = "Use 12 or more characters with uppercase, lowercase, and a number.";
    if (Object.keys(errors).length) { setFieldErrors(errors); setError("Please fix the highlighted fields."); focusFirst(errors); return; }
    setIsLoading(true);
    try {
      const result = await register(companyName.trim(), email.trim(), password, baseCurrency);
      if (result.success) { navigate("/dashboard"); return; }
      const serverErrors: Errors = {}; const remaining: string[] = [];
      for (const [serverField, messages] of Object.entries(result.fieldErrors || {})) { const field = serverFieldMap[serverField.replace(/[^a-z]/gi, "").toLowerCase()]; if (field && messages[0]) serverErrors[field] = messages[0]; else remaining.push(...messages); }
      for (const message of result.errors || []) { const field = inferField(message); if (field && !serverErrors[field]) serverErrors[field] = message; else remaining.push(message); }
      setFieldErrors(serverErrors); setError(remaining[0] || result.message || "We couldn't create the workspace. Please try again."); focusFirst(serverErrors);
    } catch { setError("We couldn't create the workspace. Check your connection and try again."); } finally { setIsLoading(false); }
  }

  const isBusy = isLoading || googleBusy;

  return <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-[1fr_1fr]">
    <AuthAside title="Turn the way you already work into one clear, organized record." />
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8"><div className="w-full max-w-lg">
      <Link to="/" className="friendly-focus mb-7 inline-flex items-center gap-2 rounded-lg text-sm font-bold text-muted-foreground hover:text-foreground"><ArrowLeft size={16} />Back home</Link>
      <BrandLogo to="/" size="lg" />
      <div className="paper-card mt-6 p-6 sm:p-8"><span className="notebook-label">One simple setup</span><h1 className="mt-4 text-3xl font-bold">Create your business notebook</h1><p className="mt-2 text-sm text-muted-foreground">Tell us the basics. You can start recording sales right away.</p>

        {error && <Alert variant="destructive" role="alert" className="mt-5"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

        {isGoogleAuthEnabled && (
          <div className="mt-6 space-y-4">
            <GoogleSignInButton
              disabled={isBusy}
              onCredential={handleGoogleCredential}
              onError={(msg) => setError(msg)}
              text="signup_with"
            />
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <span className="relative bg-card px-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Or fill in manual details
              </span>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
          <FieldBlock label="What is your business called?" htmlFor="company" error={fieldErrors.companyName}><Input id="company" autoFocus value={companyName} onChange={(e) => { setCompanyName(e.target.value); clear("companyName"); }} placeholder="e.g. Mai's Market" disabled={isBusy} aria-invalid={!!fieldErrors.companyName} /></FieldBlock>
          <FieldBlock label="Your email address" htmlFor="email" error={fieldErrors.email}><Input id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); clear("email"); }} placeholder="you@yourbusiness.com" disabled={isBusy} aria-invalid={!!fieldErrors.email} /></FieldBlock>
          <FieldBlock label="Create a password" htmlFor="password" error={fieldErrors.password} help="12 or more characters with uppercase, lowercase, and a number."><Input id="password" type="password" value={password} onChange={(e) => { setPassword(e.target.value); clear("password"); }} placeholder="Keep your records safe" disabled={isBusy} minLength={12} aria-invalid={!!fieldErrors.password} /></FieldBlock>
          <div className="space-y-2"><Label htmlFor="currency">What currency do you use?</Label><Select value={baseCurrency} onValueChange={(value) => { setBaseCurrency(value); clear("baseCurrency"); }} disabled={isBusy}><SelectTrigger id="currency"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="VND">VND (₫) — Vietnamese Đồng</SelectItem><SelectItem value="USD">USD ($) — US Dollar</SelectItem><SelectItem value="EUR">EUR (€) — Euro</SelectItem><SelectItem value="GBP">GBP (£) — British Pound</SelectItem><SelectItem value="SGD">SGD (S$) — Singapore Dollar</SelectItem></SelectContent></Select></div>
          <div className="rounded-2xl border bg-accent/45 p-4 text-sm"><p className="flex items-center gap-2 font-bold text-primary"><Check size={17} />Ready for everyday business</p><p className="mt-1 text-muted-foreground">Customers, products, sales, payments, purchases, suppliers, and expenses are all included.</p></div>
          <Button type="submit" disabled={isBusy} size="lg" className="w-full">{isLoading && <Loader2 className="animate-spin" />}{isLoading ? "Preparing your notebook…" : "Create my workspace"}</Button>
        </form>
        <p className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">Already have an account? <Link to="/login" className="font-bold text-primary hover:underline">Sign in</Link></p>
      </div>
    </div></main>
  </div>;
}

function FieldBlock({ label, htmlFor, error, help, children }: { label: string; htmlFor: string; error?: string; help?: string; children: React.ReactNode }) { return <div className="space-y-2"><Label htmlFor={htmlFor}>{label}</Label>{children}{error ? <p role="alert" className="text-xs font-bold text-destructive">{error}</p> : help ? <p className="text-xs text-muted-foreground">{help}</p> : null}</div>; }
