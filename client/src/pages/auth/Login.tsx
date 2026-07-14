import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, AlertCircle, Loader2, Sparkles } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const { login, createDemo } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoLogin = async () => {
    setError("");
    setIsLoading(true);
    try {
      const success = await createDemo();
      if (success) navigate("/dashboard");
      else setError("The demo workspace is unavailable. Please try again shortly.");
    } catch {
      setError("The demo workspace is still starting. Please try again in a moment.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!email || !password) {
      setError("Please fill in all fields");
      setIsLoading(false);
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
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md space-y-6">
        
        {/* Logo ribbon */}
        <div className="flex justify-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-foreground">VeriSpend</span>
          </Link>
        </div>

        <Card className="rounded-3xl border border-border bg-card/65 shadow-2xl backdrop-blur-md overflow-hidden">
          <CardHeader className="space-y-1.5 border-b border-border bg-muted/20 px-6 py-5 text-center">
            <CardTitle className="text-xl font-extrabold text-foreground">Welcome Back</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Sign in to your secure VeriSpend workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">Recruiter demo workspace</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Open a populated company with team roles, risk cases, approval work, forecasts, and compliance evidence.</p>
                  <Button type="button" variant="outline" disabled={isLoading} onClick={handleDemoLogin} className="mt-3 h-9 w-full rounded-xl border-primary/25 bg-background text-xs font-bold text-primary hover:bg-primary/10">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Explore populated demo
                  </Button>
                </div>
              </div>
            </div>
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
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? "Verifying Credentials..." : "Sign In to Portal"}
              </Button>
            </form>

            <div className="mt-5 text-center text-xs text-muted-foreground border-t border-border/40 pt-4">
              New workspaces include realistic starter data.{" "}
              <Link to="/register" className="text-primary hover:underline font-bold">
                Register Tenant Organization
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
