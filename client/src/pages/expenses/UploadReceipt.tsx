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
import { AlertCircle, Loader2, Upload, ArrowLeft, Check, FileText, Sparkles, RefreshCw } from "lucide-react";

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
    if (!context) throw new Error("Browser could not render this SVG receipt.");
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
        setError("File size exceeds 10MB limit.");
        return;
      }
      if (selected.type === "image/svg+xml" || selected.name.toLowerCase().endsWith(".svg")) {
        void rasterizeSvg(selected).then(setFile).catch((err: Error) => setError(err.message));
      } else {
        setFile(selected);
      }
      setError("");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a receipt document");
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
          : `Expense at ${result.data.merchant || "vendor"}`;

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
        setError(result.error || "Failed to process receipt image");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error uploading receipt");
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
      setError("Merchant name is required");
      return;
    }

    if (!formData.category) {
      setError("Category is required");
      return;
    }

    if (formData.category === "Other" && !formData.customCategory.trim()) {
      setError("Please specify custom category name");
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
        }, 1500);
      } else {
        setError(confirmResult.error || "Failed to save draft expense");
        setIsSubmitting(false);
      }
    } catch {
      setError("An unexpected error occurred while confirming the receipt.");
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-5xl mx-auto font-sans">
        {/* Header Breadcrumb */}
        <div className="flex items-center gap-3 border-b border-border/80 pb-3">
          {step !== "upload" && (
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => {
                setStep("upload");
                setFile(null);
                setUploadData(null);
                setReceiptPreviewUrl("");
                setError("");
              }}
              title="Reset Upload"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          )}
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Receipt Ingestion</h1>
            <p className="text-xs text-muted-foreground">
              {step === "upload" && "Automated OCR extraction pipeline for expense documentation."}
              {step === "review" && "Verify and adjust extracted document fields before ledger entry."}
              {step === "confirm" && "Draft record initialized. Routing to claim view..."}
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Upload Drag & Drop */}
        {step === "upload" && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="border-b border-border/60 pb-3">
              <CardTitle>Select Receipt Document</CardTitle>
              <CardDescription>
                PNG, JPG, PDF, or SVG receipts up to 10MB
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/10 p-8 text-center hover:bg-muted/20 transition-colors cursor-pointer relative">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <label htmlFor="receipt-file" className="cursor-pointer block">
                    <p className="text-xs font-bold text-foreground">
                      Click to choose file or drag and drop
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {file ? file.name : "High-resolution invoice or receipt"}
                    </p>
                  </label>
                  <Input
                    id="receipt-file"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    className="hidden"
                  />
                </div>

                {file && (
                  <div className="flex items-center justify-between rounded-md border border-border bg-card p-2.5 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-foreground truncate">{file.name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isUploading || !file}
                  variant="signal"
                  className="w-full h-9 font-bold text-xs"
                >
                  {isUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {isUploading ? "Extracting Structured Data..." : "Process Receipt with AI"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Split-Screen Review & Verification */}
        {step === "review" && (
          <div className="space-y-4">
            {uploadData?.requiresReview && (
              <Alert variant="warning">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Verification Recommended:</strong> Some fields were parsed with lower confidence. Please confirm the extracted details below.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-5 lg:grid-cols-2 items-start">
              {/* Left Column: Receipt Document View */}
              {receiptPreviewUrl && (
                <Card className="overflow-hidden">
                  <CardHeader className="border-b border-border/60 pb-2.5 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs">Original Receipt Document</CardTitle>
                      <span className="font-mono text-[10px] text-muted-foreground uppercase">
                        Source Preview
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 bg-muted/10 flex items-center justify-center">
                    <img
                      src={receiptPreviewUrl}
                      alt="Scanned receipt preview"
                      className="rounded border border-border object-contain max-h-[500px] w-full"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Right Column: Parsed Field Form */}
              <Card>
                <CardHeader className="border-b border-border/60 pb-3">
                  <CardTitle>Extracted Transaction Data</CardTitle>
                  <CardDescription>Adjust any fields detected during OCR</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <form onSubmit={handleConfirm} className="space-y-3.5">
                    {/* Amount & Currency */}
                    <div className="grid gap-3 grid-cols-3">
                      <div className="col-span-2 space-y-1">
                        <Label htmlFor="amount" className="text-xs font-semibold text-muted-foreground">
                          Amount *
                        </Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          name="amount"
                          value={formData.amount}
                          onChange={handleChange}
                          disabled={isSubmitting}
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

                    {/* Merchant */}
                    <div className="space-y-1">
                      <Label htmlFor="merchant" className="text-xs font-semibold text-muted-foreground">
                        Merchant / Vendor *
                      </Label>
                      <Input
                        id="merchant"
                        name="merchant"
                        value={formData.merchant}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className="text-xs"
                      />
                    </div>

                    {/* Category & Date */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="category" className="text-xs font-semibold text-muted-foreground">
                          Category *
                        </Label>
                        <Select
                          value={formData.category}
                          onValueChange={(val) => handleSelectChange("category", val)}
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue />
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

                      <div className="space-y-1">
                        <Label htmlFor="date" className="text-xs font-semibold text-muted-foreground">
                          Date *
                        </Label>
                        <Input
                          id="date"
                          type="date"
                          name="date"
                          value={formData.date}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>

                    {formData.category === "Other" && (
                      <div className="space-y-1">
                        <Label htmlFor="customCategory" className="text-xs font-semibold text-muted-foreground">
                          Specify Category Name *
                        </Label>
                        <Input
                          id="customCategory"
                          name="customCategory"
                          placeholder="e.g. Subscriptions, Hardware"
                          value={formData.customCategory}
                          onChange={handleChange}
                          disabled={isSubmitting}
                          className="text-xs"
                        />
                      </div>
                    )}

                    {/* Memo */}
                    <div className="space-y-1">
                      <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground">
                        Business Memo
                      </Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        rows={2}
                        className="text-xs resize-none"
                      />
                    </div>

                    {/* Confirmation CTA */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setStep("upload");
                          setFile(null);
                          setUploadData(null);
                          setReceiptPreviewUrl("");
                        }}
                        disabled={isSubmitting}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" /> Re-upload
                      </Button>
                      <Button
                        type="submit"
                        variant="signal"
                        size="xs"
                        disabled={isSubmitting}
                        className="font-bold"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Check className="h-3.5 w-3.5 mr-1" />
                        )}
                        {isSubmitting ? "Creating Draft..." : "Confirm & Save Draft"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 3: Success Confirmation */}
        {step === "confirm" && (
          <Card className="max-w-md mx-auto py-10 text-center">
            <CardContent className="space-y-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Check className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-foreground">Draft Created from Receipt</h2>
              <p className="text-xs text-muted-foreground">
                Document verified and attached to expense claim. Redirecting to transaction view...
              </p>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default UploadReceipt;
