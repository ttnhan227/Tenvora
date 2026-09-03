import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!companyName || !email || !password) {
      setError("Please fill in all required fields");
      setIsLoading(false);
      return;
    }

    try {
      const success = await register(companyName, email, password, baseCurrency);
      if (success) {
        navigate("/dashboard");
      } else {
        setError("Registration failed. Please verify credentials or company name uniqueness.");
      }
    } catch {
      setError("An error occurred during organization registration.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-sans text-xs">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <BrandLogo to="/" size="lg" className="justify-center" />
          <p className="text-xs text-muted-foreground">Provision an Enterprise Payment Operations Tenant</p>
        </div>

        <Card className="border border-border/80 bg-card">
          <CardHeader className="border-b border-border/60 pb-3 text-center">
            <CardTitle className="text-base font-bold">Register Organization</CardTitle>
            <CardDescription className="text-xs">Create your tenant workspace and primary operating account</CardDescription>
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
                  Organization / Company Name
                </Label>
                <Input
                  id="company"
                  placeholder="Apex Global Settlements LLC"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={isLoading}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">
                  Administrator Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@apexsettlements.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
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
                  required
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="currency" className="text-xs font-semibold text-muted-foreground">
                  Base Operating Currency
                </Label>
                <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="USD" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                size="sm"
                className="w-full font-bold h-9 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isLoading && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
                {isLoading ? "Provisioning Tenant…" : "Create Enterprise Workspace"}
              </Button>
            </form>

            <div className="mt-4 pt-3 border-t border-border/60 text-center space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Already have an organization?{" "}
                <Link to="/login" className="font-semibold text-emerald-600 hover:underline">
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
