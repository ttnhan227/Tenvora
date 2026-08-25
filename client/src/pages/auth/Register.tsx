import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!companyName || !email || !password || !confirmPassword) {
      setError("Please fill in all required fields");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    try {
      const success = await register(companyName, email, password);
      if (success) {
        navigate("/onboarding");
      } else {
        setError("Registration failed. Please verify credentials.");
      }
    } catch {
      setError("An error occurred during account creation");
    } finally {
      setIsLoading(false);
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
          <p className="text-xs text-muted-foreground">Provision a new corporate finance workspace</p>
        </div>

        <Card>
          <CardHeader className="border-b border-border/60 pb-3 text-center">
            <CardTitle>Create Organization</CardTitle>
            <CardDescription>Setup your company spend controls</CardDescription>
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
                <Label htmlFor="company" className="text-xs font-semibold text-muted-foreground">
                  Company Name
                </Label>
                <Input
                  id="company"
                  type="text"
                  placeholder="Acme Treasury Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={isLoading}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">
                  Admin Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@company.com"
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

              <div className="space-y-1">
                <Label htmlFor="confirm" className="text-xs font-semibold text-muted-foreground">
                  Confirm Password
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                {isLoading && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                {isLoading ? "Provisioning Organization…" : "Create Workspace"}
              </Button>
            </form>

            <div className="mt-4 pt-3 border-t border-border/60 text-center">
              <p className="text-[11px] text-muted-foreground">
                Already registered?{" "}
                <Link to="/login" className="font-semibold text-foreground hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
