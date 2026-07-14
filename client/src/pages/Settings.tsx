import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/authService";
import { settingsService, CompanySettings, AutoApprovalRules, NotificationSettings, CategoryBudget } from "@/services/settingsService";
import { managerService, AuditInsight } from "@/services/managerService";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, CheckCircle, LogOut, ShieldCheck, Zap, Bell, ExternalLink } from "lucide-react";

const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "Owner";
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [policyForm, setPolicyForm] = useState({ maxSpendLimit: "", policyNotes: "" });
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [policyError, setPolicyError] = useState("");
  const [policySuccess, setPolicySuccess] = useState("");
  const [policyInsights, setPolicyInsights] = useState<AuditInsight | null>(null);
  const [autoApprovalRules, setAutoApprovalRules] = useState<AutoApprovalRules | null>(null);
  const [isSavingAutoApproval, setIsSavingAutoApproval] = useState(false);
  const [autoApprovalError, setAutoApprovalError] = useState("");
  const [autoApprovalSuccess, setAutoApprovalSuccess] = useState("");
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [isSavingNotification, setIsSavingNotification] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [notificationSuccess, setNotificationSuccess] = useState("");
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [categoryBudgetText, setCategoryBudgetText] = useState("{}");
  const [isSavingCategoryBudgets, setIsSavingCategoryBudgets] = useState(false);
  const [categoryBudgetError, setCategoryBudgetError] = useState("");
  const [categoryBudgetSuccess, setCategoryBudgetSuccess] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      const result = await settingsService.getCompanySettings();
      if (result.success && result.data) {
        setCompanySettings(result.data);
        setPolicyForm({
          maxSpendLimit: String(result.data.maxSpendLimit),
          policyNotes: result.data.policyNotes || "",
        });
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchPolicyInsights = async () => {
      const result = await managerService.getAuditInsights();
      if (result.success && result.data) {
        setPolicyInsights(result.data);
      }
    };
    fetchPolicyInsights();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchAutoApprovalRules = async () => {
      const result = await settingsService.getAutoApprovalRules();
      if (result.success && result.data) {
        setAutoApprovalRules(result.data);
      }
    };
    fetchAutoApprovalRules();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchNotificationSettings = async () => {
      const result = await settingsService.getNotificationSettings();
      if (result.success && result.data) {
        setNotificationSettings(result.data);
      }
    };
    fetchNotificationSettings();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchCategoryBudgets = async () => {
      const result = await settingsService.getCategoryBudgets();
      if (result.success && result.data) {
        setCategoryBudgets(result.data);
        const budgets = result.data.reduce<Record<string, number>>((acc, item) => {
          acc[item.category] = item.limit;
          return acc;
        }, {});
        setCategoryBudgetText(JSON.stringify(budgets, null, 2));
      }
    };
    fetchCategoryBudgets();
  }, [isAdmin]);

  useEffect(() => {
    if (location.pathname !== "/settings/policy") return;
    const section = document.getElementById("policy-configuration");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.pathname]);

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setPolicyError("");
    setPolicySuccess("");
    const limit = parseFloat(policyForm.maxSpendLimit);
    if (isNaN(limit) || limit <= 0) {
      setPolicyError("Max spend limit must be a positive number.");
      return;
    }
    setIsSavingPolicy(true);
    const result = await settingsService.updatePolicy({
      maxSpendLimit: limit,
      policyNotes: policyForm.policyNotes || undefined,
    });
    if (result.success) {
      setPolicySuccess("Policy updated successfully.");
      setCompanySettings((prev) => prev ? { ...prev, maxSpendLimit: limit, policyNotes: policyForm.policyNotes || undefined } : prev);
    } else {
      setPolicyError(result.error || "Failed to update policy.");
    }
    setIsSavingPolicy(false);
  };

  const handleSaveAutoApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    setAutoApprovalError("");
    setAutoApprovalSuccess("");
    if (!autoApprovalRules) return;

    setIsSavingAutoApproval(true);
    const result = await settingsService.updateAutoApprovalRules({
      enabled: autoApprovalRules.enabled,
      maxAmount: autoApprovalRules.maxAmount,
      maxRiskScore: autoApprovalRules.maxRiskScore,
      excludeWeekends: autoApprovalRules.excludeWeekends,
      excludedCategories: autoApprovalRules.excludedCategories,
      minAgeHours: autoApprovalRules.minAgeHours,
    });

    if (result.success) {
      setAutoApprovalSuccess("Auto-approval settings saved.");
    } else {
      setAutoApprovalError(result.error || "Failed to save auto-approval settings.");
    }
    setIsSavingAutoApproval(false);
  };

  const handleSaveNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotificationError("");
    setNotificationSuccess("");
    if (!notificationSettings) return;

    setIsSavingNotification(true);
    const result = await settingsService.updateNotificationSettings({
      emailNotificationsEnabled: notificationSettings.emailNotificationsEnabled,
      slackNotificationsEnabled: notificationSettings.slackNotificationsEnabled,
      slackWebhookUrl: notificationSettings.slackWebhookUrl,
      slackChannel: notificationSettings.slackChannel,
      slackTeamId: notificationSettings.slackTeamId,
      slackUserEmailMappings: notificationSettings.slackUserEmailMappings,
      managerEmail: notificationSettings.managerEmail,
      noReplyEmail: notificationSettings.noReplyEmail,
    });

    if (result.success) {
      setNotificationSuccess("Notification settings saved.");
    } else {
      setNotificationError(result.error || "Failed to save notification settings.");
    }
    setIsSavingNotification(false);
  };

  const handleSaveCategoryBudgets = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryBudgetError("");
    setCategoryBudgetSuccess("");

    let parsed: Record<string, number>;
    try {
      parsed = JSON.parse(categoryBudgetText);
    } catch {
      setCategoryBudgetError("Category budgets must be valid JSON.");
      return;
    }

    if (Array.isArray(parsed) || typeof parsed !== "object" || parsed === null) {
      setCategoryBudgetError("Use an object like { \"Travel\": 5000, \"Meals\": 1500 }.");
      return;
    }

    const invalidEntry = Object.entries(parsed).find(([category, limit]) => !category.trim() || typeof limit !== "number" || limit <= 0);
    if (invalidEntry) {
      setCategoryBudgetError("Every category needs a positive numeric limit.");
      return;
    }

    setIsSavingCategoryBudgets(true);
    const result = await settingsService.updateCategoryBudgets(parsed);
    if (result.success) {
      const refreshed = await settingsService.getCategoryBudgets();
      if (refreshed.success && refreshed.data) {
        setCategoryBudgets(refreshed.data);
      }
      setCategoryBudgetSuccess("Category budgets saved.");
    } else {
      setCategoryBudgetError(result.error || "Failed to save category budgets.");
    }
    setIsSavingCategoryBudgets(false);
  };

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError("All password fields are required");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New passwords don't match");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      if (result.success) {
        setSuccess("Password changed successfully");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        setError(result.error || "Failed to change password");
      }
    } catch (err) {
      setError("An error occurred while changing password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      logout();
      navigate("/login");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl font-sans">
        
        {/* Header Ribbon */}
        <div className="flex items-center gap-4 rounded-3xl border border-border bg-card/65 p-6 shadow-xl backdrop-blur-md animate-fade-in">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-[0.28em] text-primary bg-primary/5 px-2 py-0.5 border border-primary/10 rounded uppercase">
              System Configuration
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight mt-1.5">Settings</h1>
            <p className="text-sm text-muted-foreground font-sans">
              Manage your personal credentials, organizational policies, auto-approvals, and notifications.
            </p>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="rounded-3xl border border-border bg-card/65 shadow-xl backdrop-blur-md overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
            <CardTitle className="text-base font-bold text-foreground">Profile Information</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Your account details</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div className="space-y-1">
                <p className="text-muted-foreground uppercase font-bold tracking-wider">Email Address</p>
                <p className="text-sm font-bold text-foreground truncate">{user?.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground uppercase font-bold tracking-wider">Workspace Role</p>
                <p className="text-sm font-bold text-foreground uppercase">{user?.role}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground uppercase font-bold tracking-wider">Company</p>
                <p className="text-sm font-bold text-foreground">{user?.companyName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground uppercase font-bold tracking-wider">Plan License</p>
                <p className="text-sm font-bold text-primary uppercase font-mono">{user?.planType}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card className="rounded-3xl border border-border bg-card/65 shadow-xl backdrop-blur-md overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
            <CardTitle className="text-base font-bold text-foreground">Change Password</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Update your account credentials</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmitPassword} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-emerald-200 bg-emerald-500/10 rounded-xl">
                  <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <AlertDescription className="text-emerald-800 dark:text-emerald-300 text-xs font-semibold">{success}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="••••••••"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  disabled={isLoading}
                  className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 h-10 font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  disabled={isLoading}
                  className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 h-10 font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  disabled={isLoading}
                  className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 h-10 font-mono"
                />
              </div>

              <Button 
                type="submit" 
                disabled={isLoading} 
                className="gap-2 rounded-full px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md h-10 text-xs"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Policy Configuration – Owner only */}
        {isAdmin && (
          <Card id="policy-configuration" className="rounded-3xl border border-border bg-card/65 shadow-xl backdrop-blur-md overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-bold text-foreground">Policy Configuration</CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Set maximum spend limits and general company expense notes used by the AI Auditor.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {companySettings && (
                <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-2xl border border-border">
                  Current policy limit: <strong className="text-foreground font-mono">{companySettings.maxSpendLimit.toLocaleString()} USD</strong> · Workspace License: <span className="uppercase text-primary font-bold">{companySettings.planType}</span>
                </div>
              )}
              
              <form onSubmit={handleSavePolicy} className="space-y-4">
                {policyError && (
                  <Alert variant="destructive" className="rounded-xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs font-semibold">{policyError}</AlertDescription>
                  </Alert>
                )}
                {policySuccess && (
                  <Alert className="border-emerald-200 bg-emerald-500/10 rounded-xl">
                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <AlertDescription className="text-emerald-800 dark:text-emerald-300 text-xs font-semibold">{policySuccess}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="maxSpendLimit">Max Spend Limit per Expense ($)</Label>
                  <Input
                    id="maxSpendLimit"
                    type="number"
                    step="1"
                    min="1"
                    placeholder="e.g. 2000000"
                    value={policyForm.maxSpendLimit}
                    onChange={(e) => setPolicyForm((prev) => ({ ...prev, maxSpendLimit: e.target.value }))}
                    disabled={isSavingPolicy}
                    className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 h-10 font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">Expenses above this amount will automatically trigger a mandatory manager review flag.</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="policyNotes">Policy Guidelines & Notes</Label>
                  <Textarea
                    id="policyNotes"
                    placeholder="Add internal policy guidance visible to reviewers..."
                    value={policyForm.policyNotes}
                    onChange={(e) => setPolicyForm((prev) => ({ ...prev, policyNotes: e.target.value }))}
                    disabled={isSavingPolicy}
                    rows={3}
                    className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 min-h-[80px]"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  disabled={isSavingPolicy} 
                  className="gap-2 rounded-full px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md h-10 text-xs"
                >
                  {isSavingPolicy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Policy
                </Button>
              </form>

              {policyInsights && (
                <div className="mt-8 space-y-4 border-t border-border pt-5">
                  <div>
                    <p className="text-xs uppercase text-primary font-bold tracking-wider">AI Policy Trigger Analytics</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Real-time statistics of which guidelines are triggered most frequently.</p>
                  </div>

                  <div className="space-y-3">
                    {policyInsights.topPolicyTriggers.length === 0 ? (
                      <p className="text-xs text-muted-foreground uppercase py-2">No policy rules triggered yet.</p>
                    ) : (
                      policyInsights.topPolicyTriggers.slice(0, 3).map((trigger) => {
                        const maxCount = Math.max(...policyInsights.topPolicyTriggers.map((item) => item.count), 1);
                        return (
                          <div key={trigger.trigger} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-foreground">{trigger.trigger}</span>
                              <span className="text-muted-foreground font-mono">{trigger.count} triggers</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted border border-border">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400"
                                style={{ width: `${Math.max((trigger.count / maxCount) * 100, 8)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Category Budgets - Owner only */}
        {isAdmin && (
          <Card className="rounded-3xl border border-border bg-card/65 shadow-xl backdrop-blur-md overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-bold text-foreground">Category Budgets</CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Set hard monthly limits by expense category for budget guardrails and breach forecasts.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <form onSubmit={handleSaveCategoryBudgets} className="space-y-4">
                {categoryBudgetError && (
                  <Alert variant="destructive" className="rounded-xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs font-semibold">{categoryBudgetError}</AlertDescription>
                  </Alert>
                )}
                {categoryBudgetSuccess && (
                  <Alert className="border-emerald-200 bg-emerald-500/10 rounded-xl">
                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <AlertDescription className="text-emerald-800 dark:text-emerald-300 text-xs font-semibold">{categoryBudgetSuccess}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="categoryBudgets">Budgets Definition (JSON Format)</Label>
                  <Textarea
                    id="categoryBudgets"
                    value={categoryBudgetText}
                    onChange={(e) => setCategoryBudgetText(e.target.value)}
                    disabled={isSavingCategoryBudgets}
                    rows={5}
                    className="font-mono text-xs bg-card border-border text-foreground rounded-xl focus:ring-primary/20 min-h-[120px]"
                  />
                  <p className="text-[10px] text-muted-foreground">Format as a valid JSON object, e.g. `{` "Travel": 5000, "Meals": 1200 `}`.</p>
                </div>

                {categoryBudgets.length > 0 && (
                  <div className="space-y-3 pt-2">
                    {categoryBudgets.map((budget) => (
                      <div key={budget.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-foreground uppercase">{budget.category}</span>
                          <span className={budget.isAtLimit ? "text-destructive font-bold font-mono" : "text-muted-foreground font-mono"}>
                            {budget.usagePercentage}% used
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted border border-border">
                          <div
                            className={`h-full rounded-full ${
                              budget.isAtLimit ? "bg-red-500" : budget.isNearLimit ? "bg-amber-500" : "bg-primary"
                            }`}
                            style={{ width: `${Math.min(budget.usagePercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={isSavingCategoryBudgets} 
                  className="gap-2 rounded-full px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md h-10 text-xs"
                >
                  {isSavingCategoryBudgets && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Category Budgets
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Auto-Approval Rules – Owner only */}
        {isAdmin && autoApprovalRules && (
          <Card className="rounded-3xl border border-border bg-card/65 shadow-xl backdrop-blur-md overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-bold text-foreground">Auto-Approval Rules</CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Set AI guardrails to automatically approve low-risk, minor claims without manual review.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSaveAutoApproval} className="space-y-6">
                {autoApprovalError && (
                  <Alert variant="destructive" className="rounded-xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs font-semibold">{autoApprovalError}</AlertDescription>
                  </Alert>
                )}
                {autoApprovalSuccess && (
                  <Alert className="border-emerald-200 bg-emerald-500/10 rounded-xl">
                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <AlertDescription className="text-emerald-800 dark:text-emerald-300 text-xs font-semibold">{autoApprovalSuccess}</AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/30 border border-border">
                  <div>
                    <p className="text-xs font-bold text-foreground uppercase tracking-wide">Enable Auto-Approvals</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Let AI automatically clear safe expenses.</p>
                  </div>
                  <Switch
                    checked={autoApprovalRules.enabled}
                    onCheckedChange={(checked) => setAutoApprovalRules({ ...autoApprovalRules, enabled: checked })}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="maxAmount">Max Amount ($)</Label>
                    <Input
                      id="maxAmount"
                      type="number"
                      value={autoApprovalRules.maxAmount}
                      onChange={(e) => setAutoApprovalRules({ ...autoApprovalRules, maxAmount: Number(e.target.value) })}
                      disabled={isSavingAutoApproval}
                      className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 h-10 font-mono"
                    />
                    <p className="text-[9px] text-muted-foreground leading-relaxed">Claims at or below this value are eligible.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxRiskScore">Max Risk Score (%)</Label>
                    <Input
                      id="maxRiskScore"
                      type="number"
                      value={autoApprovalRules.maxRiskScore}
                      onChange={(e) => setAutoApprovalRules({ ...autoApprovalRules, maxRiskScore: Number(e.target.value) })}
                      disabled={isSavingAutoApproval}
                      className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 h-10 font-mono"
                    />
                    <p className="text-[9px] text-muted-foreground leading-relaxed">Risk score threshold for passing guidelines.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minAgeHours">Holding Time (Hours)</Label>
                    <Input
                      id="minAgeHours"
                      type="number"
                      value={autoApprovalRules.minAgeHours}
                      onChange={(e) => setAutoApprovalRules({ ...autoApprovalRules, minAgeHours: Number(e.target.value) })}
                      disabled={isSavingAutoApproval}
                      className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 h-10 font-mono"
                    />
                    <p className="text-[9px] text-muted-foreground leading-relaxed">Minimum age of claim before auto-releasing.</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/30 border border-border">
                  <div>
                    <p className="text-xs font-bold text-foreground uppercase tracking-wide">Exclude Weekends</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Do not auto-approve expenses dated on weekend days.</p>
                  </div>
                  <Switch
                    checked={autoApprovalRules.excludeWeekends}
                    onCheckedChange={(checked) => setAutoApprovalRules({ ...autoApprovalRules, excludeWeekends: checked })}
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isSavingAutoApproval} 
                  className="gap-2 rounded-full px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md h-10 text-xs"
                >
                  {isSavingAutoApproval && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Auto-Approval Settings
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Notification Settings – Owner only */}
        {isAdmin && notificationSettings && (
          <Card className="rounded-3xl border border-border bg-card/65 shadow-xl backdrop-blur-md overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-bold text-foreground">Notification Settings</CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Configure email digests and Slack webhook alerts for compliance events.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSaveNotification} className="space-y-6">
                {notificationError && (
                  <Alert variant="destructive" className="rounded-xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs font-semibold">{notificationError}</AlertDescription>
                  </Alert>
                )}
                {notificationSuccess && (
                  <Alert className="border-emerald-200 bg-emerald-500/10 rounded-xl">
                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <AlertDescription className="text-emerald-800 dark:text-emerald-300 text-xs font-semibold">{notificationSuccess}</AlertDescription>
                  </Alert>
                )}

                {/* Email Notifications */}
                <div className="space-y-4">
                  <div className="border-b border-border pb-1">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider">Email Channels</p>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/30 border border-border">
                    <div>
                      <p className="text-xs font-bold text-foreground uppercase tracking-wide">Enable Email Notifications</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Send automated alerts and digests to company emails.</p>
                    </div>
                    <Switch
                      checked={notificationSettings.emailNotificationsEnabled}
                      onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, emailNotificationsEnabled: checked })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="managerEmail">Manager Notification Email</Label>
                    <Input
                      id="managerEmail"
                      type="email"
                      placeholder="manager@company.com"
                      value={notificationSettings.managerEmail || ""}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, managerEmail: e.target.value })}
                      disabled={isSavingNotification}
                      className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 h-10 font-mono"
                    />
                    <p className="text-[9px] text-muted-foreground leading-relaxed">Weekly digests and high-priority escalation triggers are copy-sent here.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="noReplyEmail">No-Reply Sender Address</Label>
                    <Input
                      id="noReplyEmail"
                      type="email"
                      placeholder="noreply@company.com"
                      value={notificationSettings.noReplyEmail || ""}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, noReplyEmail: e.target.value })}
                      disabled={isSavingNotification}
                      className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 h-10 font-mono"
                    />
                    <p className="text-[9px] text-muted-foreground leading-relaxed">The return address for system transaction logs (configure this for your deployment).</p>
                  </div>
                </div>

                {/* Slack Notifications */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="border-b border-border pb-1">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider">Slack Integration</p>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/30 border border-border">
                    <div>
                      <p className="text-xs font-bold text-foreground uppercase tracking-wide">Enable Slack Integration</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Post real-time compliance messages directly to a channel.</p>
                    </div>
                    <Switch
                      checked={notificationSettings.slackNotificationsEnabled}
                      onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, slackNotificationsEnabled: checked })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slackWebhookUrl">Incoming Webhook URL</Label>
                    <Input
                      id="slackWebhookUrl"
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      value={notificationSettings.slackWebhookUrl || ""}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, slackWebhookUrl: e.target.value })}
                      disabled={isSavingNotification}
                      className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 h-10 font-mono"
                    />
                    <p className="text-[9px] text-muted-foreground leading-relaxed">
                      Generate an **Incoming Webhook** in Slack and paste the URL here.
                      <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline ml-1">
                        Slack Webhooks API <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slackChannel">Default Channel</Label>
                    <Input
                      id="slackChannel"
                      placeholder="#expense-alerts or @username"
                      value={notificationSettings.slackChannel || ""}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, slackChannel: e.target.value })}
                      disabled={isSavingNotification}
                      className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 h-10 font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slackTeamId">Slack Team Workspace ID</Label>
                    <Input
                      id="slackTeamId"
                      placeholder="T1234567890"
                      value={notificationSettings.slackTeamId || ""}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, slackTeamId: e.target.value })}
                      disabled={isSavingNotification}
                      className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 h-10 font-mono"
                    />
                    <p className="text-[9px] text-muted-foreground leading-relaxed">Starts with a "T" letter, required for Slack workspace approval commands.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slackUserEmailMappings">Slack User Email Mappings (JSON)</Label>
                    <Textarea
                      id="slackUserEmailMappings"
                      placeholder='{"U12345":"manager@company.com"}'
                      value={notificationSettings.slackUserEmailMappings || ""}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, slackUserEmailMappings: e.target.value })}
                      disabled={isSavingNotification}
                      rows={4}
                      className="font-mono text-xs bg-card border-border text-foreground rounded-xl focus:ring-primary/20 min-h-[90px]"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isSavingNotification} 
                  className="gap-2 rounded-full px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md h-10 text-xs animate-pulse"
                >
                  {isSavingNotification && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Notification Settings
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Logout Portal */}
        <Card className="rounded-3xl border border-destructive/20 bg-destructive/5 shadow-xl backdrop-blur-md overflow-hidden">
          <CardHeader className="border-b border-destructive/10 bg-destructive/5 px-6 py-4">
            <CardTitle className="text-destructive text-base font-bold">Session Security</CardTitle>
            <CardDescription className="text-xs text-destructive-foreground/60">Log out of this machine</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="gap-2 rounded-full px-6 bg-destructive hover:bg-destructive/95 text-destructive-foreground font-bold shadow-md h-9 text-xs"
            >
              <LogOut className="h-4 w-4" />
              Sign Out from Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
