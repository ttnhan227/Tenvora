import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";

const DEMO_ENABLED = (import.meta.env.VITE_DEMO_ENABLED ?? "true").toLowerCase() !== "false";

const Login = () => {
  const navigate = useNavigate();
  const { login, createDemo } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"login" | "demo" | null>(null);

  const handleDemoLogin = async () => {
    setError("");
    setIsLoading(true);
    setLoadingAction("demo");
    try {
      const success = await createDemo();
      if (success) navigate("/dashboard");
      else setError("The demo workspace is unavailable. Please try again shortly.");
    } catch {
      setError("The demo workspace is still starting. Please try again in a moment.");
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    setLoadingAction("login");

    if (!email || !password) {
      setError("Please fill in all fields");
      setIsLoading(false);
      setLoadingAction(null);
      return;
    }

    try {
      const success = await login(email, password);
      if (success) {
        navigate("/dashboard");
      } else {
        setError("Invalid email or password");
      }
    } catch (err) {
      setError("An error occurred during login");
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md space-y-6">
        
        {/* Logo ribbon */}
        <div className="flex justify-center">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="h-11 w-11 object-contain" />
            <span className="text-xl font-extrabold tracking-tight text-foreground">VeriSpend</span>
          </Link>
        </div>

        <Card className="rounded-lg border border-border bg-card overflow-hidden">
          <CardHeader className="space-y-1.5 border-b border-border bg-muted/20 px-6 py-5 text-center">
            <CardTitle className="text-xl font-extrabold text-foreground">Welcome Back</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Sign in to your secure VeriSpend workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 h-10"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md h-10 text-xs gap-2 mt-2"
              >
                {loadingAction === "login" && <Loader2 className="h-4 w-4 animate-spin" />}
                {loadingAction === "login" ? "Logging you in…" : "Sign In to Portal"}
              </Button>
            </form>

            {isLoading && (
              <div role="status" aria-live="polite" className="mt-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-left">
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
                <div>
                  <p className="text-xs font-bold text-foreground">{loadingAction === "demo" ? "Preparing the demo workspace" : "Connecting to your workspace"}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">The free demo server may take up to 30 seconds to wake. Please keep this page open.</p>
                </div>
              </div>
            )}

            <div className="mt-5 text-center text-xs text-muted-foreground border-t border-border/40 pt-4">
              New workspaces include realistic starter data.{" "}
              <Link to="/register" className="text-primary hover:underline font-bold">
                Register Tenant Organization
              </Link>
            </div>
            {DEMO_ENABLED && (
              <button type="button" disabled={isLoading} onClick={handleDemoLogin} className="mt-3 flex w-full items-center justify-center gap-1.5 border-0 bg-transparent py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary hover:underline disabled:cursor-wait disabled:opacity-60">
                {loadingAction === "demo" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {loadingAction === "demo" ? "Opening demo workspace…" : "Just exploring? Open the demo workspace"}
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
