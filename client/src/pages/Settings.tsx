import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { authService } from "@/services/authService";
import {
  settingsService,
  CompanySettings,
  AutoApprovalRuleSettings,
  NotificationSettings,
  CategoryBudgetProgress,
} from "@/services/settingsService";
import { managerService, AuditInsight } from "@/services/managerService";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  LogOut,
  ShieldCheck,
  Zap,
  Bell,
  ExternalLink,
} from "lucide-react";

const Settings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [policyForm, setPolicyForm] = useState({
    maxSpendLimit: "",
    policyNotes: "",
  });
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [policyError, setPolicyError] = useState("");
  const [policySuccess, setPolicySuccess] = useState("");
  const [policyInsights, setPolicyInsights] = useState<AuditInsight | null>(null);

  const [autoApprovalRules, setAutoApprovalRules] = useState<AutoApprovalRuleSettings | null>(null);
  const [isSavingAutoApproval, setIsSavingAutoApproval] = useState(false);
  const [autoApprovalError, setAutoApprovalError] = useState("");
  const [autoApprovalSuccess, setAutoApprovalSuccess] = useState("");

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [isSavingNotification, setIsSavingNotification] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [notificationSuccess, setNotificationSuccess] = useState("");

  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudgetProgress[]>([]);
  const [categoryBudgetText, setCategoryBudgetText] = useState("{\n  \"Travel\": 5000,\n  \"Meals\": 1500\n}");
  const [isSavingCategoryBudgets, setIsSavingCategoryBudgets] = useState(false);
  const [categoryBudgetError, setCategoryBudgetError] = useState("");
  const [categoryBudgetSuccess, setCategoryBudgetSuccess] = useState("");

  const isAdmin = user?.role === "Owner";

  useEffect(() => {
    if (!isAdmin) return;

    const fetchCompanySettings = async () => {
      const result = await settingsService.getCompanySettings();
      if (result.success && result.data) {
        setCompanySettings(result.data);
        setPolicyForm({
          maxSpendLimit: result.data.maxSpendLimit.toString(),
          policyNotes: result.data.policyNotes || "",
        });
      }
    };
    fetchCompanySettings();

    const fetchPolicyInsights = async () => {
      const result = await managerService.getAuditInsights();
      if (result.success && result.data) {
        setPolicyInsights(result.data);
      }
    };
    fetchPolicyInsights();

    const fetchAutoApprovalRules = async () => {
      const result = await settingsService.getAutoApprovalRules();
      if (result.success && result.data) {
        setAutoApprovalRules(result.data);
      }
    };
    fetchAutoApprovalRules();

    const fetchNotificationSettings = async () => {
      const result = await settingsService.getNotificationSettings();
      if (result.success && result.data) {
        setNotificationSettings(result.data);
      }
    };
    fetchNotificationSettings();

    const fetchCategoryBudgets = async () => {
      const result = await settingsService.getCategoryBudgets();
      if (result.success && result.data) {
        setCategoryBudgets(result.data);
        const budgets = result.data.reduce<Record<string, number>>((acc, item) => {
          acc[item.category] = item.monthlyLimit;
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
      setPolicySuccess("Policy configuration saved.");
      setCompanySettings((prev) =>
        prev
          ? { ...prev, maxSpendLimit: limit, policyNotes: policyForm.policyNotes || undefined }
          : prev
      );
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
      setAutoApprovalSuccess("Auto-approval guardrails saved.");
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
      setNotificationSuccess("Notification routing saved.");
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
      setCategoryBudgetError("Format must be an object like { \"Travel\": 5000, \"Meals\": 1500 }.");
      return;
    }

    const invalidEntry = Object.entries(parsed).find(
      ([category, limit]) => !category.trim() || typeof limit !== "number" || limit <= 0
    );
    if (invalidEntry) {
      setCategoryBudgetError("Every category requires a positive numeric monthly limit.");
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
      setError("New passwords do not match");
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
        setSuccess("Password updated successfully.");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        setError(result.error || "Failed to change password");
      }
    } catch {
      setError("An error occurred while changing password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to sign out?")) {
      logout();
      navigate("/login");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-4xl mx-auto font-sans text-xs">
        {/* Header */}
        <div className="border-b border-border/80 pb-3">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Workspace Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organization policies, spend controls, auto-approvals, and account credentials.
          </p>
        </div>

        {/* Profile Details Card */}
        <Card>
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>Your current authentication and workspace credentials</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 font-mono text-xs">
              <div>
                <p className="text-[10px] font-sans uppercase font-bold text-muted-foreground">Email</p>
                <p className="font-semibold text-foreground truncate mt-0.5">{user?.email}</p>
              </div>
              <div>
                <p className="text-[10px] font-sans uppercase font-bold text-muted-foreground">Role</p>
                <p className="font-semibold text-foreground uppercase mt-0.5">{user?.role}</p>
              </div>
              <div>
                <p className="text-[10px] font-sans uppercase font-bold text-muted-foreground">Company</p>
                <p className="font-semibold text-foreground truncate mt-0.5">{user?.companyName}</p>
              </div>
              <div>
                <p className="text-[10px] font-sans uppercase font-bold text-muted-foreground">Plan Tier</p>
                <p className="font-bold text-foreground uppercase mt-0.5">{user?.planType}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Policy Configuration – Owner only */}
        {isAdmin && (
          <Card id="policy-configuration">
            <CardHeader className="border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-foreground" />
                <CardTitle>Spend Policy & Limits</CardTitle>
              </div>
              <CardDescription>
                Define thresholds that trigger automated compliance reviews
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <form onSubmit={handleSavePolicy} className="space-y-3">
                {policyError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{policyError}</AlertDescription>
                  </Alert>
                )}
                {policySuccess && (
                  <Alert variant="success">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{policySuccess}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1">
                  <Label htmlFor="maxSpendLimit" className="text-xs font-semibold text-muted-foreground">
                    Per-Expense Spend Limit ($)
                  </Label>
                  <Input
                    id="maxSpendLimit"
                    type="number"
                    step="1"
                    min="1"
                    value={policyForm.maxSpendLimit}
                    onChange={(e) => setPolicyForm((prev) => ({ ...prev, maxSpendLimit: e.target.value }))}
                    disabled={isSavingPolicy}
                    className="font-mono text-xs max-w-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Expenses exceeding this value will be flagged for mandatory executive review.
                  </p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="policyNotes" className="text-xs font-semibold text-muted-foreground">
                    Policy Guidance Notes
                  </Label>
                  <Textarea
                    id="policyNotes"
                    placeholder="Enter compliance rules visible to reviewers and submitters..."
                    value={policyForm.policyNotes}
                    onChange={(e) => setPolicyForm((prev) => ({ ...prev, policyNotes: e.target.value }))}
                    disabled={isSavingPolicy}
                    rows={2}
                    className="text-xs resize-none"
                  />
                </div>

                <Button type="submit" disabled={isSavingPolicy} size="xs" variant="default" className="font-bold">
                  {isSavingPolicy && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Save Policy
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Category Budgets – Owner only */}
        {isAdmin && (
          <Card>
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle>Category Budgets</CardTitle>
              <CardDescription>Monthly expense limits by category</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <form onSubmit={handleSaveCategoryBudgets} className="space-y-3">
                {categoryBudgetError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{categoryBudgetError}</AlertDescription>
                  </Alert>
                )}
                {categoryBudgetSuccess && (
                  <Alert variant="success">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{categoryBudgetSuccess}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1">
                  <Label htmlFor="categoryBudgets" className="text-xs font-semibold text-muted-foreground">
                    Monthly Budget Limits (JSON)
                  </Label>
                  <Textarea
                    id="categoryBudgets"
                    value={categoryBudgetText}
                    onChange={(e) => setCategoryBudgetText(e.target.value)}
                    disabled={isSavingCategoryBudgets}
                    rows={4}
                    className="font-mono text-xs"
                  />
                </div>

                {categoryBudgets.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    {categoryBudgets.map((budget) => (
                      <div key={budget.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">{budget.category}</span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {budget.usagePercentage}% utilized
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full ${
                              budget.isAtLimit ? "bg-destructive" : budget.isNearLimit ? "bg-amber-500" : "bg-primary"
                            }`}
                            style={{ width: `${Math.min(budget.usagePercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button type="submit" disabled={isSavingCategoryBudgets} size="xs" variant="default" className="font-bold">
                  {isSavingCategoryBudgets && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Save Budgets
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Auto-Approval Rules – Owner only */}
        {isAdmin && autoApprovalRules && (
          <Card>
            <CardHeader className="border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-foreground" />
                <CardTitle>Auto-Approval Guardrails</CardTitle>
              </div>
              <CardDescription>Automate clearance of low-risk, compliant claims</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSaveAutoApproval} className="space-y-4">
                {autoApprovalError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{autoApprovalError}</AlertDescription>
                  </Alert>
                )}
                {autoApprovalSuccess && (
                  <Alert variant="success">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{autoApprovalSuccess}</AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-between p-3 rounded-md bg-muted/20 border border-border">
                  <div>
                    <p className="font-semibold text-foreground">Enable Auto-Approval Engine</p>
                    <p className="text-[11px] text-muted-foreground">Automatically clear eligible claims that pass all risk tests</p>
                  </div>
                  <Switch
                    checked={autoApprovalRules.enabled}
                    onCheckedChange={(checked) =>
                      setAutoApprovalRules({ ...autoApprovalRules, enabled: checked })
                    }
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="maxAmount" className="text-xs font-semibold text-muted-foreground">
                      Max Amount ($)
                    </Label>
                    <Input
                      id="maxAmount"
                      type="number"
                      value={autoApprovalRules.maxAmount}
                      onChange={(e) =>
                        setAutoApprovalRules({ ...autoApprovalRules, maxAmount: Number(e.target.value) })
                      }
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="maxRiskScore" className="text-xs font-semibold text-muted-foreground">
                      Max Risk Score (%)
                    </Label>
                    <Input
                      id="maxRiskScore"
                      type="number"
                      value={autoApprovalRules.maxRiskScore}
                      onChange={(e) =>
                        setAutoApprovalRules({ ...autoApprovalRules, maxRiskScore: Number(e.target.value) })
                      }
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="minAgeHours" className="text-xs font-semibold text-muted-foreground">
                      Holding Time (Hours)
                    </Label>
                    <Input
                      id="minAgeHours"
                      type="number"
                      value={autoApprovalRules.minAgeHours}
                      onChange={(e) =>
                        setAutoApprovalRules({ ...autoApprovalRules, minAgeHours: Number(e.target.value) })
                      }
                      className="font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-md bg-muted/20 border border-border">
                  <div>
                    <p className="font-semibold text-foreground">Exclude Weekend Claims</p>
                    <p className="text-[11px] text-muted-foreground">Do not auto-approve expenses dated on Saturdays or Sundays</p>
                  </div>
                  <Switch
                    checked={autoApprovalRules.excludeWeekends}
                    onCheckedChange={(checked) =>
                      setAutoApprovalRules({ ...autoApprovalRules, excludeWeekends: checked })
                    }
                  />
                </div>

                <Button type="submit" disabled={isSavingAutoApproval} size="xs" variant="default" className="font-bold">
                  {isSavingAutoApproval && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Save Auto-Approval Settings
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Notification Settings – Owner only */}
        {isAdmin && notificationSettings && (
          <Card>
            <CardHeader className="border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-foreground" />
                <CardTitle>Notification & Alert Channels</CardTitle>
              </div>
              <CardDescription>Configure email digests and Slack webhook alerts</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSaveNotification} className="space-y-4">
                {notificationError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{notificationError}</AlertDescription>
                  </Alert>
                )}
                {notificationSuccess && (
                  <Alert variant="success">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{notificationSuccess}</AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-between p-3 rounded-md bg-muted/20 border border-border">
                  <div>
                    <p className="font-semibold text-foreground">Email Notifications</p>
                    <p className="text-[11px] text-muted-foreground">Send automated claim alerts and review digests</p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotificationsEnabled}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        emailNotificationsEnabled: checked,
                      })
                    }
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="managerEmail" className="text-xs font-semibold text-muted-foreground">
                      Manager Notification Email
                    </Label>
                    <Input
                      id="managerEmail"
                      type="email"
                      placeholder="manager@company.com"
                      value={notificationSettings.managerEmail || ""}
                      onChange={(e) =>
                        setNotificationSettings({ ...notificationSettings, managerEmail: e.target.value })
                      }
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="noReplyEmail" className="text-xs font-semibold text-muted-foreground">
                      No-Reply Sender Address
                    </Label>
                    <Input
                      id="noReplyEmail"
                      type="email"
                      placeholder="noreply@company.com"
                      value={notificationSettings.noReplyEmail || ""}
                      onChange={(e) =>
                        setNotificationSettings({ ...notificationSettings, noReplyEmail: e.target.value })
                      }
                      className="font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-md bg-muted/20 border border-border">
                  <div>
                    <p className="font-semibold text-foreground">Slack Integration</p>
                    <p className="text-[11px] text-muted-foreground">Post policy triggers and approval requests to Slack</p>
                  </div>
                  <Switch
                    checked={notificationSettings.slackNotificationsEnabled}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        slackNotificationsEnabled: checked,
                      })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="slackWebhookUrl" className="text-xs font-semibold text-muted-foreground">
                    Incoming Webhook URL
                  </Label>
                  <Input
                    id="slackWebhookUrl"
                    type="url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={notificationSettings.slackWebhookUrl || ""}
                    onChange={(e) =>
                      setNotificationSettings({ ...notificationSettings, slackWebhookUrl: e.target.value })
                    }
                    className="font-mono text-xs"
                  />
                </div>

                <Button type="submit" disabled={isSavingNotification} size="xs" variant="default" className="font-bold">
                  {isSavingNotification && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Save Notifications
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Change Password Card */}
        <Card>
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle>Account Password</CardTitle>
            <CardDescription>Update your personal account credentials</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmitPassword} className="space-y-3">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert variant="success">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="currentPassword" className="text-xs font-semibold text-muted-foreground">
                    Current Password
                  </Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="newPassword" className="text-xs font-semibold text-muted-foreground">
                    New Password
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold text-muted-foreground">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <Button type="submit" disabled={isLoading} size="xs" variant="default" className="font-bold">
                {isLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Session Sign-out */}
        <div className="flex items-center justify-between p-3.5 rounded-md border border-border bg-card">
          <div>
            <p className="font-semibold text-foreground">Sign Out</p>
            <p className="text-[11px] text-muted-foreground">End your active session on this device</p>
          </div>
          <Button variant="outline" size="xs" onClick={handleLogout} className="gap-1.5 text-destructive hover:bg-destructive/10">
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
