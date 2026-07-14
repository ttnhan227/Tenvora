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
import { AlertCircle, Loader2, Upload, ArrowLeft, Check, Sparkles } from "lucide-react";

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
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("SVG conversion failed.")), "image/png", 0.95));
    return new File([blob], source.name.replace(/\.svg$/i, ".png"), { type: "image/png" });
  } finally { URL.revokeObjectURL(svgUrl); }
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
      <div className="space-y-6 font-sans">
        {/* Header Ribbon */}
        <div className="flex items-center gap-4 rounded-3xl border border-border bg-card/65 p-6 shadow-xl backdrop-blur-md">
          {step !== "upload" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setStep("upload");
                setFile(null);
                setUploadData(null);
                setReceiptPreviewUrl("");
                setError("");
              }}
              className="rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex-1">
            <span className="text-[10px] font-mono tracking-[0.28em] text-primary bg-primary/5 px-2 py-0.5 border border-primary/10 rounded uppercase">
              Receipt OCR
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight mt-1.5">Upload Receipt</h1>
            <p className="text-sm text-muted-foreground font-sans">
              {step === "upload" && "Upload a receipt image for automated AI field extraction."}
              {step === "review" && "Review and edit AI extracted data before draft creation."}
              {step === "confirm" && "Success! Your expense draft has been created."}
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
          <Card className="rounded-3xl border border-border bg-card/65 shadow-xl backdrop-blur-md max-w-2xl">
            <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
              <CardTitle className="text-base font-bold text-foreground">Upload Image File</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Upload a clear photo of your receipt (JPG, PNG, PDF supported up to 10MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleUpload} className="space-y-6">
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-secondary/20 p-8 text-center transition-all duration-300 hover:bg-secondary/40 cursor-pointer relative">
                  <Upload className="h-12 w-12 text-primary mb-4" />
                  <label htmlFor="file-input" className="cursor-pointer block">
                    <p className="text-sm font-bold text-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {file ? file.name : "PNG, JPG, PDF up to 10MB"}
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
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-xs font-semibold text-foreground truncate">{file.name}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isUploading || !file}
                  className="w-full gap-2 rounded-full px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md h-10"
                >
                  {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isUploading ? "Uploading & Scanning..." : "Scan Receipt with AI"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Review & Edit Step */}
        {step === "review" && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Image Preview */}
            {receiptPreviewUrl && (
              <Card className="rounded-3xl border border-border bg-card/65 shadow-xl backdrop-blur-md lg:col-span-1 overflow-hidden">
                <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
                  <CardTitle className="text-base font-bold text-foreground">Scanned Document</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <img
                    src={receiptPreviewUrl}
                    alt="Receipt preview"
                    className="w-full rounded-2xl border border-border"
                  />
                </CardContent>
              </Card>
            )}

            {/* Edit Form */}
            <Card className={`rounded-3xl border border-border bg-card/65 shadow-xl backdrop-blur-md overflow-hidden ${
              receiptPreviewUrl ? "lg:col-span-2" : "lg:col-span-3"
            }`}>
              <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
                <CardTitle className="text-base font-bold text-foreground">Confirm Extracted Data</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  AI has extracted the following fields. Please review before saving as a draft.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleConfirm} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-xs font-semibold text-muted-foreground uppercase">Extracted Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 h-10 font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="currency" className="text-xs font-semibold text-muted-foreground uppercase">Currency *</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => handleSelectChange("currency", value)}
                      >
                        <SelectTrigger disabled={isSubmitting} className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 h-10 font-mono">
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

                  <div className="space-y-2">
                    <Label htmlFor="merchant" className="text-xs font-semibold text-muted-foreground uppercase">Merchant / Vendor *</Label>
                    <Input
                      id="merchant"
                      placeholder="e.g., Starbucks, Uber, Hotel ABC"
                      name="merchant"
                      value={formData.merchant}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 h-10"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-xs font-semibold text-muted-foreground uppercase">Category *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => handleSelectChange("category", value)}
                      >
                        <SelectTrigger disabled={isSubmitting} className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 h-10">
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

                    <div className="space-y-2">
                      <Label htmlFor="date" className="text-xs font-semibold text-muted-foreground uppercase">Transaction Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 h-10 font-mono"
                      />
                    </div>
                  </div>

                  {formData.category === "Other" && (
                    <div className="space-y-2">
                      <Label htmlFor="customCategory" className="text-xs font-semibold text-muted-foreground uppercase">Specify Category *</Label>
                      <Input
                        id="customCategory"
                        placeholder="e.g., Fuel, Marketing, Client Entertainment"
                        name="customCategory"
                        value={formData.customCategory}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 h-10"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground uppercase">Description / Justification</Label>
                      <span className="flex items-center gap-1 text-[10px] font-mono text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                        <Sparkles className="h-3 w-3" />
                        AI Suggested
                      </span>
                    </div>
                    <Textarea
                      id="description"
                      placeholder="AI suggested description (editable)"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className="bg-card border-border text-foreground text-xs rounded-xl focus:ring-primary/20 min-h-[100px]"
                      rows={3}
                    />
                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="gap-2 rounded-full px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md h-10"
                    >
                      {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      Create Expense Draft
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
                      className="rounded-full px-6 border-border hover:bg-muted text-foreground font-medium h-10"
                    >
                      Start Over
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Success Step */}
        {step === "confirm" && (
          <Card className="rounded-3xl border border-border bg-card/65 shadow-xl backdrop-blur-md max-w-2xl mx-auto overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 mb-4 animate-bounce">
                <Check className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-extrabold text-foreground mb-2">Receipt Scanned & Created!</h2>
              <p className="text-muted-foreground text-center text-xs mb-6 max-w-sm">
                Your receipt was uploaded and parsed successfully. Your draft has been generated, opening details view...
              </p>
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default UploadReceipt;
