import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, AlertCircle, Loader2 } from "lucide-react";

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
      setError("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match");
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
        navigate("/dashboard");
      } else {
        setError("Registration failed. Please try again.");
      }
    } catch (err) {
      setError("An error occurred during registration");
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
            <CardTitle className="text-xl font-extrabold text-foreground">Create Organization</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Register your tenant account and automate spend governance
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
                <Label htmlFor="company" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Company Name</Label>
                <Input
                  id="company"
                  type="text"
                  placeholder="Acme Treasury Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={isLoading}
                  className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Admin Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Master Password</Label>
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

              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Confirm Password</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                {isLoading ? "Provisioning Directory..." : "Create Tenant Account"}
              </Button>
            </form>

            <div className="mt-5 text-center text-xs text-muted-foreground border-t border-border/40 pt-4">
              Already registered your workspace?{" "}
              <Link to="/login" className="text-primary hover:underline font-bold">
                Sign In to Portal
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
