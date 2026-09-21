import React from "react";
import { CheckCircle, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/money";

export interface CelebrationData {
  invoiceNumber: string;
  clientName: string;
  amount: number;
  currency: string;
  autoTaxSetAside: boolean;
  taxRate: number;
}

interface InvoiceCelebrationModalProps {
  data: CelebrationData | null;
  taxRuleEnabled: boolean;
  onClose: () => void;
}

export function InvoiceCelebrationModal({
  data,
  taxRuleEnabled,
  onClose,
}: InvoiceCelebrationModalProps) {
  return (
    <Dialog open={!!data} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-card border-2 border-emerald-500/30 text-center p-6 space-y-4">
        {data && (
          <div className="space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl shadow-sm animate-bounce">
              🎉
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-foreground tracking-tight">
                Cha-ching! Payment Received!
              </h3>
              <p className="text-xs text-muted-foreground">
                Invoice <span className="font-mono font-bold text-foreground">{data.invoiceNumber}</span> from{" "}
                <span className="font-semibold text-foreground">{data.clientName}</span> is officially settled.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-2.5">
              <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {money(data.amount, data.currency)}
              </div>

              {data.autoTaxSetAside && taxRuleEnabled ? (
                <div className="space-y-2 pt-2 border-t border-border/80 text-xs text-left">
                  <div className="flex justify-between items-center p-2 rounded-xl bg-background border border-border/60">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      <div>
                        <p className="font-bold text-foreground">
                          Recorded operating balance ({100 - data.taxRate}%)
                        </p>
                        <p className="text-[10px] text-muted-foreground">Recorded operating balance</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{money(data.amount * ((100 - data.taxRate) / 100), data.currency)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div>
                        <p className="font-bold text-amber-700 dark:text-amber-400">
                          Tax reserve ({data.taxRate}%)
                        </p>
                        <p className="text-[10px] text-muted-foreground">Planning estimate—not money held</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                      +{money(data.amount * (data.taxRate / 100), data.currency)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  The full payment was added to your recorded operating balance.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                onClick={onClose}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold h-9"
              >
                Awesome, Back to Invoices
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
