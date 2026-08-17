import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { aiService, AiUploadResponse } from "@/services/aiService";
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
import { AlertCircle, Loader2, Upload, ArrowLeft, Check } from "lucide-react";

const CATEGORIES = [
  "Travel",
  "Meals",
  "Accommodation",
  "Office Supplies",
  "Software",
  "Other",
];

const CATEGORY_NORMALIZATION: Record<string, string> = {
  travel: "Travel",
  transport: "Travel",
  transportation: "Travel",
  taxi: "Travel",
  uber: "Travel",
  grab: "Travel",
  flight: "Travel",
  lodging: "Accommodation",
  hotel: "Accommodation",
  accommodation: "Accommodation",
  meal: "Meals",
  meals: "Meals",
  food: "Meals",
  beverage: "Meals",
  restaurant: "Meals",
  software: "Software",
  saas: "Software",
  office: "Office Supplies",
  supplies: "Office Supplies",
  stationery: "Office Supplies",
  other: "Other",
  general: "Other",
};

const rasterizeSvg = async (source: File): Promise<File> => {
  const svgUrl = URL.createObjectURL(source);
  try {
    const image = new Image();
    image.src = svgUrl;
    await image.decode();
    const maxDimension = 2048;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth || 1200, image.naturalHeight || 1600));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round((image.naturalWidth || 1200) * scale));
    canvas.height = Math.max(1, Math.round((image.naturalHeight || 1600) * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this SVG receipt.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(value => value ? resolve(value) : reject(new Error("SVG conversion failed.")), "image/png", 0.95)
    );
    return new File([blob], source.name.replace(/\.svg$/i, ".png"), { type: "image/png" });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
};

const UploadReceipt = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"upload" | "review" | "confirm">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadData, setUploadData] = useState<AiUploadResponse | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    amount: "",
    currency: "USD",
    merchant: "",
    category: "",
    customCategory: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
  });

  const normalizeCategory = (rawCategory?: string) => {
    if (!rawCategory) return "Other";
    const normalized = CATEGORY_NORMALIZATION[rawCategory.trim().toLowerCase()];
    if (normalized) return normalized;
    return CATEGORIES.includes(rawCategory) ? rawCategory : "Other";
  };

  const normalizeDateForInput = (rawDate?: string) => {
    const today = new Date().toISOString().split("T")[0];
    if (!rawDate) return today;

    const trimmed = rawDate.trim();
    const isoMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}/);
    if (isoMatch) return isoMatch[0];

    const normalized = trimmed.replace(/\./g, "/").replace(/-/g, "/");
    const parts = normalized.split("/").map((segment) => segment.trim());
    if (parts.length === 3) {
      const [a, b, c] = parts;
      const yearCandidate = Number(c.length === 4 ? c : a.length === 4 ? a : NaN);

      if (!Number.isNaN(yearCandidate)) {
        if (a.length === 4) {
          const year = Number(a);
          const month = Number(b);
          const day = Number(c);
          if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          }
        }

        if (c.length === 4) {
          const year = Number(c);
          const first = Number(a);
          const second = Number(b);

          const dayFirstValid = first >= 1 && first <= 31 && second >= 1 && second <= 12;
          const monthFirstValid = first >= 1 && first <= 12 && second >= 1 && second <= 31;

          if (dayFirstValid && !monthFirstValid) {
            return `${String(year).padStart(4, "0")}-${String(second).padStart(2, "0")}-${String(first).padStart(2, "0")}`;
          }

          if (monthFirstValid) {
            return `${String(year).padStart(4, "0")}-${String(first).padStart(2, "0")}-${String(second).padStart(2, "0")}`;
          }
        }
      }
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return today;

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const deriveCustomCategory = (rawCategory?: string) => {
    if (!rawCategory) return "";
    const trimmed = rawCategory.trim();
    if (!trimmed) return "";

    const normalizedKey = trimmed.toLowerCase();
    const mapped = CATEGORY_NORMALIZATION[normalizedKey];
    if (mapped && mapped !== "Other") return "";
    if (normalizedKey === "other" || normalizedKey === "general") return "";
    if (CATEGORIES.includes(trimmed)) return "";
    return trimmed;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 10 * 1024 * 1024) {
        setError("File too large. Please upload a file under 10MB.");
        return;
      }
      if (selected.type === "image/svg+xml" || selected.name.toLowerCase().endsWith(".svg")) {
        void rasterizeSvg(selected).then(setFile).catch((conversionError: Error) => setError(conversionError.message));
      } else {
        setFile(selected);
      }
      setError("");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const result = await aiService.uploadReceipt(file);
      if (result.success && result.data) {
        setUploadData(result.data);
        const normalizedCategory = normalizeCategory(result.data.category);
        const normalizedDate = normalizeDateForInput(result.data.date);
        const customCategory = deriveCustomCategory(result.data.category);
        const suggestedDescription = result.data.message?.trim()
          ? result.data.message.trim()
          : `Expense at ${result.data.merchant || "merchant"}`;

        setFormData({
          amount: result.data.amount?.toString() || "",
          currency: result.data.currency || "USD",
          merchant: result.data.merchant || "",
          category: normalizedCategory,
          customCategory,
          date: normalizedDate,
          description: suggestedDescription,
        });
        setReceiptPreviewUrl(URL.createObjectURL(file));
        setStep("review");
      } else {
        setError(result.error || "Failed to upload receipt");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred while uploading the receipt");
    } finally {
      setIsUploading(false);
    }
  };

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

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.amount) {
      setError("Amount is required");
      return;
    }

    if (!formData.merchant.trim()) {
      setError("Merchant is required");
      return;
    }

    if (!formData.category) {
      setError("Category is required");
      return;
    }

    if (formData.category === "Other" && !formData.customCategory.trim()) {
      setError("Please specify a category when selecting Other");
      return;
    }

    const finalCategory = formData.category === "Other"
      ? formData.customCategory.trim()
      : formData.category;

    setIsSubmitting(true);

    try {
      const confirmResult = await aiService.confirmReceipt({
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        merchant: formData.merchant,
        date: formData.date,
        category: finalCategory,
        description: formData.description || undefined,
        fileUrl: uploadData?.fileUrl || "",
        ocrRawData: uploadData?.ocrRawData,
      });

      if (confirmResult.success && confirmResult.data) {
        setStep("confirm");
        setTimeout(() => {
          navigate(`/expenses/${confirmResult.data!.id}`);
        }, 2000);
      } else {
        setError(confirmResult.error || "Failed to confirm receipt");
        setIsSubmitting(false);
      }
    } catch (err) {
      setError("An error occurred while processing the receipt");
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl font-sans">
        {/* Header */}
        <div className="flex items-center gap-4">
          {step !== "upload" && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setStep("upload");
                setFile(null);
                setUploadData(null);
                setReceiptPreviewUrl("");
                setError("");
              }}
              className="rounded-lg h-9 w-9 border-border text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Upload Receipt</h1>
            <p className="text-xs text-muted-foreground">
              {step === "upload" && "Upload a receipt image or PDF for automated field extraction."}
              {step === "review" && "Review and verify extracted fields before saving to your draft list."}
              {step === "confirm" && "Draft created successfully. Redirecting..."}
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
          </Alert>
        )}

        {/* Upload Step */}
        {step === "upload" && (
          <Card className="rounded-xl border border-border bg-card max-w-2xl">
            <CardHeader className="border-b border-border px-6 py-4">
              <CardTitle className="text-sm font-bold">Select Receipt Document</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Supported formats: PNG, JPG, JPEG, PDF, SVG (max 10MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleUpload} className="space-y-6">
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 p-8 text-center transition-colors hover:bg-muted/40 cursor-pointer relative">
                  <Upload className="h-10 w-10 text-primary mb-3" />
                  <label htmlFor="file-input" className="cursor-pointer block">
                    <p className="text-sm font-semibold text-foreground">
                      Click to choose file or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {file ? file.name : "Receipt image or document"}
                    </p>
                  </label>
                  <Input
                    id="file-input"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    className="hidden"
                  />
                </div>

                {file && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center gap-3">
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs font-medium text-foreground truncate">{file.name}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isUploading || !file}
                  className="w-full gap-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-10 text-xs shadow-sm"
                >
                  {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isUploading ? "Extracting Receipt Fields..." : "Extract Fields with AI"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Review & Edit Step */}
        {step === "review" && (
          <div className="space-y-4">
            {uploadData?.requiresReview && (
              <Alert className="rounded-xl border-amber-500/40 bg-amber-500/10">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-xs">
                  <strong>Manual review recommended:</strong> One or more fields could not be extracted with high confidence. Please verify all fields below.
                  {uploadData.warnings?.length > 0 && (
                    <ul className="mt-2 list-disc pl-5">
                      {uploadData.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Image Preview */}
              {receiptPreviewUrl && (
                <Card className="rounded-xl border border-border bg-card lg:col-span-1 overflow-hidden">
                  <CardHeader className="border-b border-border px-5 py-3.5">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Scanned Document</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <img
                      src={receiptPreviewUrl}
                      alt="Receipt preview"
                      className="w-full rounded-lg border border-border object-contain max-h-96"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Edit Form */}
              <Card className={`rounded-xl border border-border bg-card overflow-hidden ${
                receiptPreviewUrl ? "lg:col-span-2" : "lg:col-span-3"
              }`}>
                <CardHeader className="border-b border-border px-6 py-4">
                  <CardTitle className="text-sm font-bold">Verify Extracted Fields</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Review the values detected from your document. You can adjust any field before saving.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleConfirm} className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="amount" className="text-xs font-semibold text-muted-foreground uppercase">Amount *</Label>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="0.00"
                          step="0.01"
                          name="amount"
                          value={formData.amount}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          className="bg-card border-border text-foreground text-xs rounded-lg focus:ring-primary/20 h-10 font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="currency" className="text-xs font-semibold text-muted-foreground uppercase">Currency *</Label>
                        <Select
                          value={formData.currency}
                          onValueChange={(value) => handleSelectChange("currency", value)}
                        >
                          <SelectTrigger disabled={isSubmitting} className="bg-card border-border text-foreground text-xs rounded-lg focus:ring-primary/20 h-10 font-mono">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border border-border text-xs text-popover-foreground font-mono">
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="VND">VND</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="merchant" className="text-xs font-semibold text-muted-foreground uppercase">Merchant / Vendor *</Label>
                      <Input
                        id="merchant"
                        placeholder="e.g., Starbucks, Uber, Hotel ABC"
                        name="merchant"
                        value={formData.merchant}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className="bg-card border-border text-foreground text-xs rounded-lg focus:ring-primary/20 h-10"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="category" className="text-xs font-semibold text-muted-foreground uppercase">Category *</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => handleSelectChange("category", value)}
                        >
                          <SelectTrigger disabled={isSubmitting} className="bg-card border-border text-foreground text-xs rounded-lg focus:ring-primary/20 h-10">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border border-border text-xs text-popover-foreground">
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="date" className="text-xs font-semibold text-muted-foreground uppercase">Transaction Date *</Label>
                        <Input
                          id="date"
                          type="date"
                          name="date"
                          value={formData.date}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          className="bg-card border-border text-foreground text-xs rounded-lg focus:ring-primary/20 h-10 font-mono"
                        />
                      </div>
                    </div>

                    {formData.category === "Other" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="customCategory" className="text-xs font-semibold text-muted-foreground uppercase">Specify Category *</Label>
                        <Input
                          id="customCategory"
                          placeholder="e.g., Fuel, Marketing, Client Entertainment"
                          name="customCategory"
                          value={formData.customCategory}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          className="bg-card border-border text-foreground text-xs rounded-lg focus:ring-primary/20 h-10"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground uppercase">Description / Justification</Label>
                      </div>
                      <Textarea
                        id="description"
                        placeholder="Add business justification"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className="bg-card border-border text-foreground text-xs rounded-lg focus:ring-primary/20 min-h-[90px]"
                        rows={3}
                      />
                    </div>

                    {/* Actions buttons */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="gap-2 rounded-lg px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-10 text-xs shadow-sm"
                      >
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        Save as Draft Expense
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => {
                          setStep("upload");
                          setFile(null);
                          setUploadData(null);
                          setReceiptPreviewUrl("");
                        }}
                        className="rounded-lg px-5 border-border hover:bg-muted text-foreground font-medium h-10 text-xs"
                      >
                        Upload Different Receipt
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Success Step */}
        {step === "confirm" && (
          <Card className="rounded-xl border border-border bg-card max-w-xl mx-auto overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 mb-3">
                <Check className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-1">Receipt Draft Created</h2>
              <p className="text-muted-foreground text-xs mb-4 max-w-xs">
                Your receipt data was saved to your expense drafts. Opening details...
              </p>
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default UploadReceipt;
