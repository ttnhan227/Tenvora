import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileText,
  ImagePlus,
  Loader2,
  Plus,
  RotateCw,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
  ZoomIn,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  captureService,
  CaptureResult,
  CaptureLineItem,
} from "@/services/captureService";
import { aiAssistantService, AiActionInputOverrides } from "@/services/aiService";
import { useQueryClient } from "@tanstack/react-query";
import { showToastWithUndo } from "@/lib/undoAction";
import { telemetryService } from "@/services/telemetryService";

export interface CaptureSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialResult?: CaptureResult | null;
  documentTypeHint?: "purchase" | "expense" | "auto";
  onConfirmed?: (result: CaptureResult) => void;
}

export function CaptureSheet({
  open,
  onOpenChange,
  initialResult,
  documentTypeHint = "auto",
  onConfirmed,
}: CaptureSheetProps) {
  const { t, formatCurrency } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"input" | "analyzing" | "review">("input");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");
  const [docHint, setDocHint] = useState<"auto" | "purchase" | "expense">(documentTypeHint);
  const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zoomImage, setZoomImage] = useState(false);

  // Editable review form state
  const [vendor, setVendor] = useState("");
  const [originalVendor, setOriginalVendor] = useState("");
  const [rememberRule, setRememberRule] = useState(false);
  const [date, setDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("VND");
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<CaptureLineItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialResult) {
      loadResultIntoForm(initialResult);
      setStep("review");
    } else {
      resetForm();
    }
  }, [initialResult, open]);

  const resetForm = () => {
    setStep("input");
    setSelectedFile(null);
    setPreviewUrl(null);
    setRawText("");
    setCaptureResult(null);
    setIsSubmitting(false);
    setRememberRule(false);
    setVendor("");
    setOriginalVendor("");
    setLineItems([]);
    setTotalAmount(0);
    setPaidAmount(0);
    setTaxAmount(0);
  };

  const loadResultIntoForm = (res: CaptureResult) => {
    setCaptureResult(res);
    const d = res.draft;
    setVendor(d.vendor || "");
    setOriginalVendor(d.vendor || "");
    setDate(d.date ? d.date.split("T")[0] : new Date().toISOString().split("T")[0]);
    setDueDate(d.dueDate ? d.dueDate.split("T")[0] : "");
    setCurrency(d.currency || "VND");
    setTotalAmount(d.totalAmount || 0);
    setTaxAmount(d.taxAmount || 0);
    setPaidAmount(d.paidAmount || 0);
    setPaymentMethod(d.paymentMethod || "Cash");
    setNotes(d.notes || "");
    setLineItems(d.lineItems || []);
    if (d.invoiceImageUrl) {
      setPreviewUrl(d.invoiceImageUrl);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!selectedFile && !rawText.trim()) {
      toast({
        title: t("capture.no_input", undefined, "Please select an invoice or enter details"),
        variant: "destructive",
      });
      return;
    }

    setStep("analyzing");

    let res;
    if (selectedFile) {
      res = await captureService.uploadAndAnalyze(selectedFile, docHint, rawText);
    } else {
      res = await captureService.analyzeDocument({
        rawText,
        documentTypeHint: docHint,
      });
    }

    if (res.success && res.data) {
      loadResultIntoForm(res.data);
      setStep("review");
      toast({
        title: t("capture.analyzed_success", undefined, "Document extracted successfully!"),
        description: t("capture.review_prompt", undefined, "Please review the extracted values and confirm."),
      });
    } else {
      setStep("input");
      toast({
        title: t("capture.analyze_failed", undefined, "Extraction failed"),
        description: res.errors?.[0] || t("capture.error_fallback", undefined, "Check your document and try again."),
        variant: "destructive",
      });
    }
  };

  const handleLineItemChange = (index: number, field: keyof CaptureLineItem, value: any) => {
    const updated = [...lineItems];
    const item = { ...updated[index], [field]: value };

    if (field === "quantity" || field === "unitCost") {
      const q = field === "quantity" ? Number(value) : item.quantity;
      const c = field === "unitCost" ? Number(value) : item.unitCost;
      item.lineTotal = Math.round(q * c * 100) / 100;
    }

    updated[index] = item;
    setLineItems(updated);

    // Recompute total amount
    const newItemsSum = updated.reduce((sum, it) => sum + (it.lineTotal || 0), 0);
    setTotalAmount(newItemsSum + (taxAmount || 0));
  };

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        description: t("capture.new_item", undefined, "New Item"),
        unit: "item",
        quantity: 1,
        unitCost: 0,
        lineTotal: 0,
        confidence: 1.0,
        source: "manual",
        why: "User added item",
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    const updated = lineItems.filter((_, i) => i !== index);
    setLineItems(updated);
    const newItemsSum = updated.reduce((sum, it) => sum + (it.lineTotal || 0), 0);
    setTotalAmount(newItemsSum + (taxAmount || 0));
  };

  const handleConfirm = async () => {
    if (!captureResult) return;
    setIsSubmitting(true);

    const overrides: AiActionInputOverrides = {
      supplierName: vendor,
      amount: totalAmount,
      paidAmount: paidAmount,
      paymentMethod: paymentMethod,
      dueDate: dueDate || null,
      purchasedAt: date ? new Date(date).toISOString() : null,
      invoiceImageDataUrl: previewUrl || captureResult.draft.invoiceImageUrl || null,
      description: notes || null,
      purchaseItems: lineItems.map((it) => ({
        description: it.description,
        unit: it.unit || "item",
        quantity: it.quantity,
        unitCost: it.unitCost,
        productId: it.matchedProductId || null,
      })),
    };

    // 1. Confirm the staged AiAction draft (server two-phase commit!)
    const confirmRes = await aiAssistantService.confirmAction(
      captureResult.actionId,
      true,
      overrides
    );

    if (confirmRes.success) {
      // 2. Learning loop rule persistence if requested
      if (rememberRule && originalVendor && vendor && originalVendor.trim().toLowerCase() !== vendor.trim().toLowerCase()) {
        try {
          await captureService.createRule({
            ruleType: "vendor_alias",
            rawPattern: originalVendor.trim(),
            targetName: vendor.trim(),
            targetEntityId: captureResult.draft.supplierId || null,
          });
        } catch (e) {
          console.warn("Could not save alias rule", e);
        }
      }

      const fieldsCorrected =
        (originalVendor && vendor !== originalVendor ? 1 : 0) +
        (captureResult.draft.totalAmount !== totalAmount ? 1 : 0) +
        (captureResult.draft.date !== date ? 1 : 0);
      const acceptedWithoutEdits = fieldsCorrected === 0;

      void telemetryService.recordEvent({
        eventType: "DraftConfirmed",
        intent: captureResult.draft.intent || "purchase",
        durationMs: 3000,
        fieldsCorrectedCount: fieldsCorrected,
        acceptedWithoutEdits,
        isError: false,
      });

      showToastWithUndo({
        message: confirmRes.data?.message || t("capture.confirm_success", undefined, "Record confirmed & saved!"),
        actionId: captureResult.actionId,
        t,
        queryClient,
      });

      if (onConfirmed) {
        onConfirmed(captureResult);
      }
      onOpenChange(false);
    } else {
      void telemetryService.recordEvent({
        eventType: "DraftFailed",
        intent: captureResult.draft.intent || "purchase",
        durationMs: 0,
        fieldsCorrectedCount: 0,
        acceptedWithoutEdits: false,
        isError: true,
        errorMessage: confirmRes.errors?.[0] || "Confirmation failed",
      });
      toast({
        title: t("capture.confirm_failed", undefined, "Confirmation failed"),
        description: confirmRes.errors?.[0] || t("capture.confirm_error_desc", undefined, "Could not commit action."),
        variant: "destructive",
      });
    }

    setIsSubmitting(false);
  };

  const handleReject = async () => {
    if (!captureResult) {
      onOpenChange(false);
      return;
    }
    await captureService.rejectDraft(captureResult.actionId);
    toast({
      title: t("capture.draft_discarded", undefined, "Draft discarded"),
      description: t("capture.discard_desc", undefined, "The draft proposal was cancelled."),
    });
    onOpenChange(false);
  };

  const overallConfidence = captureResult?.draft.provenance?.overallConfidence || 0.9;
  const isHighConfidence = overallConfidence >= 0.85;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl border-border bg-background shadow-2xl">
        <DialogHeader className="p-6 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                {step === "review"
                  ? t("capture.review_title", undefined, "Review Extracted Record")
                  : t("capture.scan_title", undefined, "Scan Invoice / Receipt")}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {step === "review"
                  ? t("capture.review_subtitle", undefined, "AI drafted this record. Verify the fields before confirming.")
                  : t("capture.scan_subtitle", undefined, "Capture a photo, upload an invoice PDF, or paste text to create a draft.")}
              </DialogDescription>
            </div>
          </div>

          {step === "review" && (
            <div
              className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
                isHighConfidence
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isHighConfidence ? "bg-emerald-500" : "bg-amber-500"}`} />
              {t("capture.confidence", undefined, "Confidence")}: {Math.round(overallConfidence * 100)}%
            </div>
          )}
        </DialogHeader>

        {/* STEP 1: INPUT STAGE */}
        {step === "input" && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-muted/10 hover:bg-muted/30 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-14 h-14 rounded-2xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center text-primary transition-colors mb-3">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h4 className="font-semibold text-base mb-1">
                  {selectedFile ? selectedFile.name : t("capture.upload_prompt", undefined, "Upload invoice or receipt")}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {selectedFile
                    ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB • ${t("capture.click_to_change", undefined, "Click to change")}`
                    : t("capture.supported_formats", undefined, "JPEG, PNG, WebP or PDF (up to 15MB)")}
                </p>
              </div>

              {/* Camera Trigger */}
              <div
                onClick={() => cameraInputRef.current?.click()}
                className="border border-border hover:border-primary/50 transition-colors rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-muted/10 hover:bg-muted/30 group"
              >
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 group-hover:bg-violet-500/20 flex items-center justify-center text-violet-500 transition-colors mb-3">
                  <Camera className="w-7 h-7" />
                </div>
                <h4 className="font-semibold text-base mb-1">
                  {t("capture.take_photo", undefined, "Take Photo with Camera")}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {t("capture.camera_desc", undefined, "Use your mobile or webcam to snap a receipt instantly")}
                </p>
              </div>
            </div>

            {/* Natural language / Paste Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  {t("capture.or_paste_text", undefined, "Or type / paste invoice details or natural language")}
                </Label>
                <span className="text-xs text-muted-foreground">
                  {t("capture.nl_example", undefined, "e.g. 'bought 20 boxes Coffee from ABC Co 5M, paid half'")}
                </span>
              </div>
              <Textarea
                placeholder={t("capture.textarea_placeholder", undefined, "Paste tabular invoice text, OCR transcript, or natural language order...")}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={3}
                className="resize-none font-mono text-sm"
              />
            </div>

            {/* Document Hint & Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  {t("capture.target_type", undefined, "Draft Type")}:
                </span>
                <div className="flex items-center rounded-lg border border-border p-1 bg-muted/30">
                  {(["auto", "purchase", "expense"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setDocHint(type)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        docHint === type
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {type === "auto"
                        ? t("capture.auto_detect", undefined, "Auto-detect")
                        : type === "purchase"
                        ? t("nav.purchases", undefined, "Purchase (Restock)")
                        : t("nav.expenses", undefined, "Expense")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  {t("common.cancel", undefined, "Cancel")}
                </Button>
                <Button
                  onClick={handleAnalyze}
                  disabled={!selectedFile && !rawText.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t("capture.extract_button", undefined, "Extract with AI")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: ANALYZING STATE */}
        {step === "analyzing" && (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-primary">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
            </div>
            <div>
              <h4 className="text-lg font-bold">
                {t("capture.processing_title", undefined, "AI is Analyzing Document...")}
              </h4>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                {t("capture.processing_desc", undefined, "Extracting line items, vendor details, totals, and validating amounts.")}
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW STAGE (SIDE-BY-SIDE) */}
        {step === "review" && captureResult && (
          <div className="p-6 space-y-6">
            {/* Duplicate Detection Warning Banner */}
            {captureResult.duplicate?.isDuplicate && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold">
                    {t("capture.duplicate_warning_title", undefined, "Possible Duplicate Detected")}
                  </p>
                  <p className="text-xs mt-0.5">
                    {captureResult.duplicate.duplicateReason}
                  </p>
                </div>
              </div>
            )}

            {/* Validation Warnings */}
            {captureResult.draft.validationWarnings?.length > 0 && (
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{captureResult.draft.validationWarnings.join(". ")}</span>
              </div>
            )}

            {/* Side by side layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Source Document / Preview */}
              <div className="lg:col-span-5 bg-muted/20 border border-border rounded-xl p-4 flex flex-col h-full max-h-[580px]">
                <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    {t("capture.source_document", undefined, "Source Document")}
                  </span>
                  {previewUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setZoomImage(!zoomImage)}
                      className="h-7 px-2 text-xs"
                    >
                      <ZoomIn className="w-3.5 h-3.5 mr-1" />
                      {zoomImage ? t("capture.fit", undefined, "Fit") : t("capture.zoom", undefined, "Zoom")}
                    </Button>
                  )}
                </div>

                <div className="flex-1 overflow-auto rounded-lg bg-background flex items-center justify-center p-2 min-h-[280px]">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Scanned invoice"
                      className={`rounded object-contain transition-all duration-200 ${
                        zoomImage ? "max-w-none cursor-zoom-out" : "max-h-[500px] w-auto cursor-zoom-in"
                      }`}
                      onClick={() => setZoomImage(!zoomImage)}
                    />
                  ) : (
                    <div className="p-4 font-mono text-xs text-muted-foreground whitespace-pre-wrap max-h-[480px] overflow-auto w-full">
                      {rawText || t("capture.no_preview", undefined, "No document image available.")}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Editable Draft Form */}
              <div className="lg:col-span-7 space-y-4">
                {/* Vendor / Supplier */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">
                      {t("common.supplier", undefined, "Vendor / Supplier")} *
                    </Label>
                    {captureResult.draft.provenance.fields["vendor"] && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-primary" />
                        {captureResult.draft.provenance.fields["vendor"].why}
                      </span>
                    )}
                  </div>
                  <Input
                    value={vendor}
                    onChange={(e) => {
                      setVendor(e.target.value);
                      if (originalVendor && e.target.value !== originalVendor) {
                        setRememberRule(true);
                      }
                    }}
                    placeholder={t("capture.vendor_placeholder", undefined, "Supplier name")}
                    className={`font-semibold ${
                      (captureResult.draft.provenance.fields["vendor"]?.confidence || 1) < 0.8
                        ? "border-amber-500/50 bg-amber-500/5"
                        : ""
                    }`}
                  />
                  {originalVendor && vendor !== originalVendor && (
                    <label className="flex items-center gap-2 text-xs text-primary font-medium cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={rememberRule}
                        onChange={(e) => setRememberRule(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <span>
                        {t("capture.remember_alias", { 0: originalVendor, 1: vendor }, "Remember that '{0}' maps to '{1}'")}
                      </span>
                    </label>
                  )}
                </div>

                {/* Dates: Invoice Date & Due Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-foreground">
                      {t("capture.invoice_date", undefined, "Invoice Date")}
                    </Label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground">
                        {t("capture.due_date", undefined, "Payment Due Date")}
                      </Label>
                      {captureResult.draft.provenance.fields["dueDate"] && (
                        <span className="text-[10px] text-muted-foreground">
                          {captureResult.draft.provenance.fields["dueDate"].why}
                        </span>
                      )}
                    </div>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      {t("capture.line_items", undefined, "Line Items")} ({lineItems.length})
                    </Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddLineItem}
                      className="h-7 text-xs px-2"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      {t("capture.add_item", undefined, "Add item")}
                    </Button>
                  </div>

                  <div className="border border-border rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/40 border-b border-border font-semibold text-muted-foreground sticky top-0">
                        <tr>
                          <th className="p-2">{t("common.item", undefined, "Item")}</th>
                          <th className="p-2 w-16 text-right">{t("common.quantity", undefined, "Qty")}</th>
                          <th className="p-2 w-16">{t("common.unit", undefined, "Unit")}</th>
                          <th className="p-2 w-24 text-right">{t("common.price", undefined, "Price")}</th>
                          <th className="p-2 w-24 text-right">{t("common.total", undefined, "Total")}</th>
                          <th className="p-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {lineItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-muted/20">
                            <td className="p-2">
                              <Input
                                value={item.description}
                                onChange={(e) => handleLineItemChange(idx, "description", e.target.value)}
                                className="h-7 text-xs font-medium"
                              />
                              {item.why && (
                                <span className="text-[10px] text-muted-foreground block truncate max-w-[200px]">
                                  {item.why}
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-right">
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                value={item.quantity}
                                onChange={(e) => handleLineItemChange(idx, "quantity", e.target.value)}
                                className="h-7 text-xs text-right w-16 font-mono"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={item.unit}
                                onChange={(e) => handleLineItemChange(idx, "unit", e.target.value)}
                                className="h-7 text-xs w-16"
                              />
                            </td>
                            <td className="p-2 text-right">
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                value={item.unitCost}
                                onChange={(e) => handleLineItemChange(idx, "unitCost", e.target.value)}
                                className="h-7 text-xs text-right w-24 font-mono"
                              />
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-foreground">
                              {formatCurrency(item.lineTotal, currency)}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(idx)}
                                className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary: Tax, Paid Amount, Total */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-foreground">
                      {t("capture.tax_vat", undefined, "Tax / VAT")}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={taxAmount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setTaxAmount(val);
                        const itemsSum = lineItems.reduce((s, it) => s + (it.lineTotal || 0), 0);
                        setTotalAmount(itemsSum + val);
                      }}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-foreground">
                      {t("capture.paid_amount", undefined, "Amount Paid")}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(Number(e.target.value))}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-foreground">
                      {t("common.total", undefined, "Grand Total")} *
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(Number(e.target.value))}
                      className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {t("common.notes", undefined, "Notes")}
                  </Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("capture.notes_placeholder", undefined, "Optional invoice notes or reference")}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Bottom action bar */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={isSubmitting}
                className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
              >
                <X className="w-4 h-4 mr-1.5" />
                {t("capture.discard_draft", undefined, "Discard Draft")}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep("input")}
                  disabled={isSubmitting}
                >
                  <RotateCw className="w-4 h-4 mr-1.5" />
                  {t("capture.re_scan", undefined, "Re-scan")}
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={isSubmitting || totalAmount <= 0}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 shadow-md"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("common.confirming", undefined, "Confirming...")}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {t("capture.confirm_save", undefined, "Confirm & Save")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
