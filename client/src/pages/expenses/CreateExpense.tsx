import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { expenseService, ExpenseCreateRequest } from "@/services/expenseService";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, ArrowLeft, ShieldAlert, CheckCircle, Save, Send } from "lucide-react";

const CATEGORIES = [
  "Travel",
  "Meals",
  "Accommodation",
  "Office Supplies",
  "Software",
  "Alcohol",
  "Other",
];

const CreateExpense = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    amount: "",
    currency: "USD",
    merchant: "",
    category: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = (): boolean => {
    setError("");

    if (!formData.amount) {
      setError("Amount is required");
      return false;
    }

    if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      setError("Amount must be a positive number");
      return false;
    }

    if (!formData.merchant.trim()) {
      setError("Merchant or vendor name is required");
      return false;
    }

    if (!formData.category) {
      setError("Please select a spend category");
      return false;
    }

    if (!formData.date) {
      setError("Transaction date is required");
      return false;
    }

    return true;
  };

  const previewSignals = (() => {
    const amount = parseFloat(formData.amount || "0");
    const signals: string[] = [];

    if (amount >= 2_000_000 && formData.currency === "VND") {
      signals.push("Amount exceeds 2,000,000 VND — requires manager sign-off.");
    } else if (amount >= 100 && formData.currency === "USD") {
      signals.push("Amount exceeds $100.00 USD — will require manager approval.");
    }

    if (formData.category.toLowerCase().includes("alcohol")) {
      signals.push("Restricted category (Alcohol) triggers compliance review flag.");
    }

    if (!formData.description.trim()) {
      signals.push("Business memo is recommended to prevent approval delays.");
    }

    return signals;
  })();

  const handleSubmit = async (e: React.FormEvent, saveDraft: boolean = false) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const request: ExpenseCreateRequest = {
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        merchant: formData.merchant,
        category: formData.category,
        date: formData.date,
        description: formData.description || undefined,
      };

      const result = await expenseService.create(request);

      if (result.success && result.data) {
        if (!saveDraft) {
          const submitResult = await expenseService.submit(result.data.id);
          if (!submitResult.success) {
            setError(`Expense created as draft, but auto-submit encountered an error: ${submitResult.error || "Please submit from expense details."}`);
            setIsLoading(false);
            return;
          }
        }
        navigate(`/expenses/${result.data.id}`);
      } else {
        setError(result.error || "Failed to create expense transaction");
      }
    } catch (err) {
      setError("An unexpected error occurred while creating the expense.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-4xl mx-auto font-sans">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-3 border-b border-border/80 pb-3">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => navigate("/expenses")}
            title="Back to Expenses"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">New Expense</h1>
            <p className="text-xs text-muted-foreground">
              Create a manual spend entry to save as draft or route to approval.
            </p>
          </div>
        </div>

        {/* Policy Guidance Strip */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-card p-3.5 space-y-1">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Spend Policy Rules
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Claims over $100 / 2M VND require manager signature</li>
              <li>• Category limits apply based on department budgets</li>
            </ul>
          </div>

          <div className="rounded-md border border-border bg-card p-3.5 space-y-1">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-foreground" />
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Live Pre-flight Check
              </p>
            </div>
            {previewSignals.length === 0 ? (
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                All details clear standard internal controls.
              </p>
            ) : (
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {previewSignals.map((s, i) => (
                  <li key={i} className="text-amber-800 dark:text-amber-300">• {s}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Transaction Form Card */}
        <Card>
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle>Expense Information</CardTitle>
            <CardDescription>All fields marked with an asterisk (*) are required</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Amount & Currency */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2 space-y-1">
                  <Label htmlFor="amount" className="text-xs font-semibold text-muted-foreground">
                    Amount *
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="font-mono text-sm font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="currency" className="text-xs font-semibold text-muted-foreground">
                    Currency *
                  </Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(val) => handleSelectChange("currency", val)}
                  >
                    <SelectTrigger className="font-mono text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="font-mono text-xs">
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="VND">VND (₫)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Merchant & Category */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="merchant" className="text-xs font-semibold text-muted-foreground">
                    Merchant / Vendor *
                  </Label>
                  <Input
                    id="merchant"
                    type="text"
                    placeholder="e.g. AWS, Delta Airlines, Uber, Figma"
                    name="merchant"
                    value={formData.merchant}
                    onChange={handleChange}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="category" className="text-xs font-semibold text-muted-foreground">
                    Category *
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(val) => handleSelectChange("category", val)}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1">
                <Label htmlFor="date" className="text-xs font-semibold text-muted-foreground">
                  Transaction Date *
                </Label>
                <Input
                  id="date"
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="font-mono text-xs"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground">
                  Business Memo & Purpose (Optional)
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Provide context on project, client meeting, or business justification..."
                  value={formData.description}
                  onChange={handleChange}
                  disabled={isLoading}
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={isLoading}
                  className="w-full sm:w-auto font-medium"
                >
                  <Save className="h-3 w-3 mr-1" />
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  variant="signal"
                  size="xs"
                  onClick={(e) => handleSubmit(e, false)}
                  disabled={isLoading}
                  className="w-full sm:w-auto font-bold"
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Send className="h-3 w-3 mr-1" />
                  )}
                  {isLoading ? "Submitting..." : "Submit for Approval"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CreateExpense;
