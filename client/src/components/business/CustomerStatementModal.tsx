import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, Calendar, FileText, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { businessMoney, businessService } from "@/services/businessService";
import { LoadingState } from "@/components/business/BusinessUI";

interface CustomerStatementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  companyName?: string;
}

export function CustomerStatementModal({
  open,
  onOpenChange,
  customerId,
  customerName,
  companyName = "Tenvora Store",
}: CustomerStatementModalProps) {
  const { isVietnamese } = useLanguage();

  const { data: statement, isLoading } = useQuery({
    queryKey: ["customer-statement", customerId],
    queryFn: () => businessService.getCustomerStatement(customerId),
    enabled: open && !!customerId,
  });

  const handlePrint = () => {
    window.print();
  };

  const currency = statement?.customer.currency ?? "VND";
  const money = (val: number) => businessMoney(val, currency);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="no-print flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span>{isVietnamese ? "Sổ chi tiết công nợ khách hàng" : "Customer Account Statement"}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isVietnamese ? "Chi tiết giao dịch và công nợ của khách hàng." : "Customer transaction and outstanding balance details."}
          </DialogDescription>
          <Button size="sm" onClick={handlePrint} className="gap-1.5 font-bold">
            <Printer className="h-4 w-4" />
            <span>{isVietnamese ? "In sao kê / Lưu PDF" : "Print / Save PDF"}</span>
          </Button>
        </DialogHeader>

        {isLoading ? (
          <LoadingState label={isVietnamese ? "Đang chuẩn bị sao kê..." : "Compiling account statement..."} />
        ) : !statement ? (
          <p className="text-center py-8 text-muted-foreground">
            {isVietnamese ? "Không có dữ liệu sao kê." : "No statement data found."}
          </p>
        ) : (
          <div className="space-y-6 pt-2 font-sans" id="printable-statement">
            <style>
              {`
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  #printable-statement, #printable-statement * {
                    visibility: visible !important;
                  }
                  #printable-statement {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    padding: 16px !important;
                    background: white !important;
                    color: black !important;
                    font-size: 12px !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                  table {
                    border-collapse: collapse !important;
                    width: 100% !important;
                  }
                  th, td {
                    border: 1px solid #ddd !important;
                    padding: 6px 8px !important;
                  }
                }
              `}
            </style>

            {/* Header */}
            <div className="border-b pb-4 flex justify-between items-start flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-bold font-serif">{companyName}</h2>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">
                  {isVietnamese ? "SỔ THEO DÕI CÔNG NỢ KHÁCH HÀNG" : "CUSTOMER STATEMENT OF ACCOUNT"}
                </p>
                <div className="mt-3 text-sm space-y-0.5">
                  <div>
                    <span className="text-muted-foreground">{isVietnamese ? "Khách hàng" : "Customer"}: </span>
                    <strong className="text-foreground">{statement.customer.name}</strong>
                  </div>
                  {statement.customer.phone && (
                    <div className="text-xs text-muted-foreground">
                      <span>{isVietnamese ? "Điện thoại" : "Phone"}: </span>
                      <span>{statement.customer.phone}</span>
                    </div>
                  )}
                  {statement.customer.address && (
                    <div className="text-xs text-muted-foreground">
                      <span>{isVietnamese ? "Địa chỉ" : "Address"}: </span>
                      <span>{statement.customer.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right text-xs text-muted-foreground space-y-1">
                <div>
                  {isVietnamese ? "Ngày in" : "Date Printed"}:{" "}
                  <strong className="text-foreground">{new Date().toLocaleDateString(isVietnamese ? "vi-VN" : "en-US")}</strong>
                </div>
                <div>
                  {isVietnamese ? "Đơn vị tiền tệ" : "Currency"}: <strong className="text-foreground">{currency}</strong>
                </div>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border p-3 bg-muted/20">
                <div className="text-xs text-muted-foreground font-medium">
                  {isVietnamese ? "Tổng mua (Phát sinh tăng)" : "Total Debits (Sales)"}
                </div>
                <div className="text-lg font-bold font-serif text-foreground mt-1 tabular-nums">
                  {money(statement.totalDebits)}
                </div>
              </div>

              <div className="rounded-xl border p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40">
                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  {isVietnamese ? "Tổng thanh toán (Đã trả)" : "Total Credits (Paid)"}
                </div>
                <div className="text-lg font-bold font-serif text-emerald-800 dark:text-emerald-300 mt-1 tabular-nums">
                  {money(statement.totalCredits)}
                </div>
              </div>

              <div className="rounded-xl border p-3 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40">
                <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  {isVietnamese ? "Số dư nợ hiện tại" : "Closing Balance Due"}
                </div>
                <div className="text-lg font-bold font-serif text-amber-800 dark:text-amber-300 mt-1 tabular-nums">
                  {money(statement.closingBalance)}
                </div>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground">
                      {isVietnamese ? "Ngày" : "Date"}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground">
                      {isVietnamese ? "Loại giao dịch" : "Type"}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground">
                      {isVietnamese ? "Chứng từ" : "Ref"}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground">
                      {isVietnamese ? "Nội dung diễn giải" : "Description"}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground text-right">
                      {isVietnamese ? "Phát sinh Nợ (+)" : "Debit (+)"}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground text-right">
                      {isVietnamese ? "Đã trả (-)" : "Credit (-)"}
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground text-right">
                      {isVietnamese ? "Số dư nợ" : "Balance"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {statement.entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-muted-foreground">
                        {isVietnamese ? "Chưa có phát sinh giao dịch nào." : "No transactions recorded yet."}
                      </td>
                    </tr>
                  ) : (
                    statement.entries.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="py-2 px-3 whitespace-nowrap text-muted-foreground">
                          {new Date(entry.date).toLocaleDateString(isVietnamese ? "vi-VN" : "en-US")}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {entry.type === "Sale" ? (
                            <span className="inline-flex items-center gap-1 text-foreground font-medium">
                              <ArrowDownRight className="h-3 w-3 text-muted-foreground" />
                              {isVietnamese ? "Đơn bán hàng" : "Sale"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                              <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                              {isVietnamese ? "Thanh toán" : "Payment"}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground">
                          {entry.reference}
                        </td>
                        <td className="py-2 px-3 max-w-[200px] truncate" title={entry.description}>
                          {entry.description}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-medium text-foreground">
                          {entry.debit > 0 ? money(entry.debit) : "—"}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
                          {entry.credit > 0 ? money(entry.credit) : "—"}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums font-bold text-foreground">
                          {money(entry.runningBalance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/40 font-bold border-t text-foreground">
                    <td colSpan={4} className="py-2.5 px-3 text-right">
                      {isVietnamese ? "TỔNG CỘNG" : "TOTAL"}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {money(statement.totalDebits)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                      {money(statement.totalCredits)}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-amber-700 dark:text-amber-400">
                      {money(statement.closingBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Signature Block */}
            <div className="pt-8 flex justify-between text-center text-xs text-muted-foreground">
              <div className="w-40">
                <p className="font-semibold text-foreground mb-12">
                  {isVietnamese ? "Người lập biểu" : "Prepared By"}
                </p>
                <p className="border-t pt-1 border-dashed">{isVietnamese ? "(Ký, họ tên)" : "(Signature)"}</p>
              </div>
              <div className="w-40">
                <p className="font-semibold text-foreground mb-12">
                  {isVietnamese ? "Xác nhận của khách hàng" : "Customer Acknowledgment"}
                </p>
                <p className="border-t pt-1 border-dashed">{isVietnamese ? "(Ký, họ tên)" : "(Signature)"}</p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
