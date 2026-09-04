import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!email || !password) {
      setError("Please fill in all credentials");
      setIsLoading(false);
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
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-sans text-xs">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <BrandLogo to="/" size="lg" className="justify-center" />
          <p className="text-xs text-muted-foreground">Enterprise Payment Operations & Transaction Platform</p>
        </div>

        <Card className="border border-border/80 bg-card">
          <CardHeader className="border-b border-border/60 pb-3 text-center">
            <CardTitle className="text-base font-bold">Sign in to Operations</CardTitle>
            <CardDescription className="text-xs">Enter your organization credentials</CardDescription>
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
                  placeholder="admin@tenvora.internal"
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
                className="w-full font-bold h-9 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isLoading && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                {isLoading ? "Authenticating…" : "Sign In to Workspace"}
              </Button>
            </form>

            <div className="mt-4 pt-3 border-t border-border/60 text-center space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Need a new enterprise tenant?{" "}
                <Link to="/register" className="font-semibold text-emerald-600 hover:underline">
                  Register Organization
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
