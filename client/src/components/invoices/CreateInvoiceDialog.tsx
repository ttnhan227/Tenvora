import React, { useState, useEffect } from "react";
import { FileText, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  invoiceService,
  type CreateInvoiceRequest,
  type CreateInvoiceItemRequest,
} from "@/services/invoiceService";
import type { ClientSummary } from "@/services/clientService";
import type { ProjectSummary } from "@/services/projectService";
import { money } from "@/lib/money";

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientSummary[];
  projects: ProjectSummary[];
  defaultCurrency?: string;
  onInvoiceCreated: () => Promise<void>;
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  clients,
  projects,
  defaultCurrency = "USD",
  onInvoiceCreated,
}: CreateInvoiceDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [paymentTerms, setPaymentTerms] = useState("Net 14");
  const [notes, setNotes] = useState("Thank you for your business! Payment due within terms.");
  const [lineItems, setLineItems] = useState<CreateInvoiceItemRequest[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);

  useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      const firstClient = clients[0];
      setSelectedClientId(firstClient.id);
      setCurrency(firstClient.currency || defaultCurrency);
      setPaymentTerms(
        firstClient.defaultPaymentTermsDays > 0
          ? `Net ${firstClient.defaultPaymentTermsDays}`
          : "Due on Receipt"
      );
    }
  }, [clients, selectedClientId, defaultCurrency]);

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleLineItemChange = (index: number, field: keyof CreateInvoiceItemRequest, val: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: val };
    setLineItems(updated);
  };

  const handleClientSelection = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedProjectId("");
    const client = clients.find((item) => item.id === clientId);
    if (!client) return;

    setCurrency(client.currency || defaultCurrency);
    setPaymentTerms(
      client.defaultPaymentTermsDays > 0
        ? `Net ${client.defaultPaymentTermsDays}`
        : "Due on Receipt"
    );
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  };

  const handleCreateInvoice = async (sendImmediately: boolean = false) => {
    setCreateError("");
    if (!selectedClientId) {
      setCreateError("Select the client you are billing.");
      return;
    }

    const validItems = lineItems.filter((item) => item.description.trim().length > 0);
    if (validItems.length === 0) {
      setCreateError("Add at least one billable item with a description, quantity, and unit price.");
      return;
    }

    if (validItems.some((item) => item.quantity <= 0 || item.unitPrice <= 0)) {
      setCreateError("Every billable item needs a quantity and unit price greater than zero.");
      return;
    }

    try {
      setSubmitting(true);
      const req: CreateInvoiceRequest = {
        clientId: selectedClientId,
        projectId: selectedProjectId || undefined,
        currency,
        paymentTerms,
        notes,
        items: validItems,
      };

      const created = await invoiceService.createInvoice(req);
      let markedAsSent = false;
      if (sendImmediately) {
        try {
          await invoiceService.sendInvoice(created.id);
          markedAsSent = true;
        } catch (sendError) {
          console.error("Invoice was saved but could not be marked as sent", sendError);
        }
      }
      onOpenChange(false);
      setCreateError("");
      setLineItems([{ description: "", quantity: 1, unitPrice: 0 }]);
      setSelectedProjectId("");
      await onInvoiceCreated();
      if (sendImmediately && !markedAsSent) {
        toast.warning(
          "Invoice draft saved, but it could not be marked as sent. Open the draft and try again."
        );
      } else {
        toast.success(
          sendImmediately
            ? "Invoice saved and marked as sent. Tenvora did not email the client."
            : "Invoice draft saved."
        );
      }
    } catch (err: any) {
      const message =
        err.response?.data?.errors?.join(" ") ||
        err.response?.data?.message ||
        "The invoice could not be saved. Review the form and try again.";
      setCreateError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) setCreateError("");
      }}
    >
      <DialogContent className="max-w-2xl bg-card border border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Create New Client Invoice
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Enter the client and billable work. When you later confirm a payment, Tenvora can allocate your selected percentage to a tax-planning category.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Client Selector & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="invoice-client" className="text-xs font-semibold">
                Select Client
              </Label>
              <Select value={selectedClientId} onValueChange={handleClientSelection}>
                <SelectTrigger id="invoice-client" className="text-xs bg-background">
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name} ({c.contactEmail})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invoice-currency" className="text-xs font-semibold">
                Billing Currency
              </Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="invoice-currency" className="text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="USD" className="text-xs">USD ($)</SelectItem>
                  <SelectItem value="EUR" className="text-xs">EUR (€)</SelectItem>
                  <SelectItem value="GBP" className="text-xs">GBP (£)</SelectItem>
                  <SelectItem value="SGD" className="text-xs">SGD (S$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invoice-project" className="text-xs font-semibold">Project (optional)</Label>
            <Select
              value={selectedProjectId || "none"}
              onValueChange={(value) => setSelectedProjectId(value === "none" ? "" : value)}
            >
              <SelectTrigger id="invoice-project" className="text-xs bg-background">
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent className="bg-card">
                <SelectItem value="none" className="text-xs">No project</SelectItem>
                {projects
                  .filter((project) => project.clientId === selectedClientId && project.status !== "Archived")
                  .map((project) => (
                    <SelectItem key={project.id} value={project.id} className="text-xs">
                      {project.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Terms & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="invoice-terms" className="text-xs font-semibold">Payment Terms</Label>
              <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                <SelectTrigger id="invoice-terms" className="text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="Due on Receipt" className="text-xs">Due on Receipt</SelectItem>
                  <SelectItem value="Net 7" className="text-xs">Net 7 (7 Days)</SelectItem>
                  <SelectItem value="Net 14" className="text-xs">Net 14 (14 Days)</SelectItem>
                  <SelectItem value="Net 30" className="text-xs">Net 30 (30 Days)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invoice-notes" className="text-xs font-semibold">Invoice Memo / Notes</Label>
              <Input
                id="invoice-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes visible on invoice..."
                className="text-xs bg-background"
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            The issue date is today. The due date is calculated from the selected payment terms.
          </p>

          {createError && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive"
            >
              {createError}
            </div>
          )}

          {/* Line Items Table */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                Billable Line Items
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLineItem}
                className="h-7 text-xs gap-1 border-dashed"
              >
                <Plus className="h-3.5 w-3.5" /> Add Item
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Enter what you delivered, how many units or hours, and the price for each unit. Tenvora calculates each line total.
            </p>

            <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_5rem_6rem_6rem_2rem] gap-2 px-1 text-[11px] font-semibold text-muted-foreground">
              <span>Description</span>
              <span>Quantity</span>
              <span>Unit price</span>
              <span className="text-right">Line total</span>
              <span />
            </div>

            <div className="space-y-3 sm:space-y-2">
              {lineItems.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_5rem_6rem_6rem_2rem] items-end gap-2 p-3 sm:p-0 rounded-lg sm:rounded-none bg-muted/20 sm:bg-transparent border sm:border-0 border-border/60"
                >
                  <div className="col-span-2 sm:col-span-1 space-y-1">
                    <Label htmlFor={`invoice-item-description-${idx}`} className="text-[11px] font-semibold sm:sr-only">Description</Label>
                    <Input
                      id={`invoice-item-description-${idx}`}
                      placeholder="e.g. Website design"
                      value={item.description}
                      onChange={(e) => {
                        setCreateError("");
                        handleLineItemChange(idx, "description", e.target.value);
                      }}
                      className="w-full text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`invoice-item-quantity-${idx}`} className="text-[11px] font-semibold sm:sr-only">Quantity</Label>
                    <Input
                      id={`invoice-item-quantity-${idx}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="1"
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                      className="w-full text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`invoice-item-price-${idx}`} className="text-[11px] font-semibold sm:sr-only">Unit price ({currency})</Label>
                    <Input
                      id={`invoice-item-price-${idx}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={item.unitPrice}
                      onChange={(e) => handleLineItemChange(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                      className="w-full text-xs bg-background"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-between sm:block pb-2 sm:pb-0">
                    <span className="text-[11px] font-semibold text-muted-foreground sm:sr-only">Line total</span>
                    <span className="block text-right text-xs font-mono font-bold">
                      {money(item.quantity * item.unitPrice, currency)}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-end sm:block">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveLineItem(idx)}
                      disabled={lineItems.length === 1}
                      aria-label={`Remove line item ${idx + 1}`}
                      title={lineItems.length === 1 ? "An invoice needs at least one line item" : "Remove line item"}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal summary */}
            <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between font-mono text-xs mt-3">
              <span className="text-muted-foreground font-sans">Total Invoice Amount:</span>
              <span className="text-base font-bold text-foreground">
                {money(calculateSubtotal(), currency)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={submitting}
            onClick={() => handleCreateInvoice(false)}
            className="text-xs"
          >
            Save as Draft
          </Button>
          <Button
            size="sm"
            disabled={submitting}
            onClick={() => handleCreateInvoice(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Save &amp; Mark as Sent
          </Button>
        </DialogFooter>
        <p className="text-center text-[11px] text-muted-foreground">
          “Mark as sent” updates tracking in Tenvora. It does not email your client.
        </p>
      </DialogContent>
    </Dialog>
  );
}
