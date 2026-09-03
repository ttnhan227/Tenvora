import React, { useState } from "react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Mail, MessageSquare, Building2, Phone, CheckCircle2, Send, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function ContactPage() {
  const [fullName, setFullName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [monthlyVolume, setMonthlyVolume] = useState("500k-2.5m");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName || !workEmail) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      toast.success("Demo request received! An enterprise solutions architect will contact you within 2 hours.");
    }, 800);
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-24 pb-24">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="text-center py-10 space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-border bg-muted/40 text-foreground font-mono text-[11px] font-semibold">
              <Building2 className="h-3.5 w-3.5 text-emerald-500" />
              SCHEDULE ARCHITECTURE BRIEFING
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              Talk with an Enterprise Payment Rail Architect
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Discover how Tenvora's double-entry ledger, continuous reconciliation, and automated settlement can scale your platform.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pt-6">
            {/* Left Contact Details */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border border-border bg-card">
                <CardContent className="p-6 space-y-6 text-xs">
                  <div className="space-y-1.5">
                    <p className="font-bold text-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4 text-emerald-500" />
                      Sales &amp; Partnerships
                    </p>
                    <p className="text-muted-foreground">enterprise@tenvora.internal</p>
                  </div>

                  <div className="space-y-1.5">
                    <p className="font-bold text-foreground flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-emerald-500" />
                      Technical Support
                    </p>
                    <p className="text-muted-foreground">ops-support@tenvora.internal</p>
                  </div>

                  <div className="space-y-1.5">
                    <p className="font-bold text-foreground flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-emerald-500" />
                      Global Headquarters
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      Tenvora Technologies Inc.<br />
                      548 Market Street, Suite 89201<br />
                      San Francisco, CA 94104
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-600 dark:text-emerald-400 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Guaranteed Response Time
                    </p>
                    <p className="text-muted-foreground">Enterprise queries answered in &lt; 2 hours during business hours.</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Form Card */}
            <Card className="lg:col-span-2 border border-border bg-card">
              <CardHeader className="border-b border-border/60 pb-4">
                <CardTitle className="text-base font-bold">Request a Live Technical Demonstration</CardTitle>
                <CardDescription className="text-xs">
                  Fill out your operational parameters and we will prepare a customized sandbox environment.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {submitted ? (
                  <div className="py-12 text-center space-y-3">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                    <h3 className="text-xl font-bold text-foreground">Demo Request Confirmed!</h3>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      Thank you, {fullName}. Our solutions engineering team has received your inquiry for {companyName || "your platform"} and will be in touch shortly.
                    </p>
                    <div className="pt-4">
                      <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>
                        Submit Another Request
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          placeholder="Jane Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="workEmail">Work Email Address</Label>
                        <Input
                          id="workEmail"
                          type="email"
                          placeholder="jane@company.com"
                          value={workEmail}
                          onChange={(e) => setWorkEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="companyName">Organization / Company Name</Label>
                        <Input
                          id="companyName"
                          placeholder="Fintech Global Inc"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="monthlyVol">Expected Monthly Transaction Volume</Label>
                        <Select value={monthlyVolume} onValueChange={setMonthlyVolume}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select volume range" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="under-500k">&lt; $500k / month</SelectItem>
                            <SelectItem value="500k-2.5m">$500k - $2.5M / month</SelectItem>
                            <SelectItem value="2.5m-10m">$2.5M - $10M / month</SelectItem>
                            <SelectItem value="10m-plus">$10M+ / month (Enterprise)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="notes">Current Architecture &amp; Key Requirements (Optional)</Label>
                      <textarea
                        id="notes"
                        rows={4}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="Describe your current payment rails, ledger requirements, or settlement batch challenges..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2.5"
                    >
                      {loading ? "Scheduling Demo..." : "Book Architecture Demo"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
