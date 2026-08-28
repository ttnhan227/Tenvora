import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, ArrowRight } from "lucide-react";

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
      else setError("The demo workspace is currently unavailable. Please retry in a moment.");
    } catch {
      setError("The demo workspace is initializing. Please try again shortly.");
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
      setError("Please fill in all credentials");
      setIsLoading(false);
      setLoadingAction(null);
      return;
    }

    try {
      const success = await login(email, password);
      if (success) {
        navigate("/dashboard");
      } else {
        setError("Invalid email address or password");
      }
    } catch {
      setError("An error occurred during authentication");
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-sans text-xs">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
            <span className="text-base font-bold tracking-tight text-foreground">VeriSpend</span>
          </Link>
          <p className="text-xs text-muted-foreground">Corporate expense management & automated audit</p>
        </div>

        <Card>
          <CardHeader className="border-b border-border/60 pb-3 text-center">
            <CardTitle>Sign in to your organization</CardTitle>
            <CardDescription>Enter your corporate credentials</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="font-mono text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                size="sm"
                variant="default"
                className="w-full font-bold h-9 mt-1"
              >
                {loadingAction === "login" && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                {loadingAction === "login" ? "Authenticating…" : "Sign In"}
              </Button>
            </form>

            {isLoading && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-muted/20 p-2.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground shrink-0" />
                <span>
                  {loadingAction === "demo"
                    ? "Provisioning sandbox workspace…"
                    : "Connecting to company ledger…"}
                </span>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-border/60 text-center space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Need a new organization account?{" "}
                <Link to="/register" className="font-semibold text-foreground hover:underline">
                  Create Workspace
                </Link>
              </p>

              {/* Quick Demo Access Pills */}
              <div className="pt-2">
                <div className="text-[10px] text-muted-foreground mb-1.5 font-medium">Quick Demo Credentials:</div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  <button
                    type="button"
                    onClick={() => { setEmail("marcus.river@northwindanalytics.com"); setPassword("123"); }}
                    className="text-[10px] px-2 py-0.5 rounded border border-border bg-muted/30 hover:bg-muted font-mono text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Marcus (Tenant 1)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail("olivia.chen@northwindanalytics.com"); setPassword("123"); }}
                    className="text-[10px] px-2 py-0.5 rounded border border-border bg-muted/30 hover:bg-muted font-mono text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Olivia (Manager)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail("daniel.kim@blueharborlogistics.com"); setPassword("123"); }}
                    className="text-[10px] px-2 py-0.5 rounded border border-border bg-muted/30 hover:bg-muted font-mono text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Daniel (Tenant 2)
                  </button>
                </div>
              </div>

              {DEMO_ENABLED && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleDemoLogin}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground underline block w-full text-center pt-1"
                >
                  {loadingAction === "demo" ? "Launching demo…" : "Explore Sandbox Demo"}
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
