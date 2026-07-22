import React from "react";
import { Edit, Trash2, Mail, Check, Download, AlertCircle } from "lucide-react";

export default function InvoiceTable({
  invoices = [],
  onEdit,
  onDelete,
  onMarkAsPaid,
  onResendEmail,
  onDownloadPdf,
  processingIds = {},
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl custom-shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-4 px-6">Invoice No</th>
              <th className="py-4 px-6">Client / Company</th>
              <th className="py-4 px-6 text-right">Base Amount</th>
              <th className="py-4 px-6 text-center">GST Rate</th>
              <th className="py-4 px-6 text-right">Grand Total</th>
              <th className="py-4 px-6">Due Date</th>
              <th className="py-4 px-6 text-center">Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-12 text-center text-slate-400 font-semibold">
                  No invoices found. Click Add Client or Create Invoice to register transactions.
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => {
                const client = invoice.client || {};
                const isPaid = invoice.paymentStatus === "Paid";
                const isProcessingPaid = processingIds[invoice._id]?.paid;
                const isProcessingResend = processingIds[invoice._id]?.resend;

                return (
                  <tr key={invoice._id} className="hover:bg-slate-50/30 transition-colors">
                    
                    {/* Invoice Number */}
                    <td className="py-4 px-6 font-bold text-slate-900">
                      {invoice.invoiceNumber}
                    </td>

                    {/* Client / Company details */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-950">
                          {client.clientName || "Deleted Client"}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold mt-0.5">
                          {client.companyName || "N/A"}
                        </span>
                      </div>
                    </td>

                    {/* Base Amount */}
                    <td className="py-4 px-6 text-right font-semibold text-slate-600">
                      ₹{invoice.amount.toFixed(2)}
                    </td>

                    {/* GST Rate */}
                    <td className="py-4 px-6 text-center text-slate-500 font-semibold">
                      {invoice.gstRate}%
                    </td>

                    {/* Grand Total */}
                    <td className="py-4 px-6 text-right font-black text-slate-900">
                      ₹{invoice.totalAmount.toFixed(2)}
                    </td>

                    {/* Due Date */}
                    <td className="py-4 px-6 text-xs font-semibold text-slate-500">
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </td>

                    {/* Payment Status Label */}
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold leading-none select-none ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {!isPaid && <AlertCircle className="h-3 w-3" />}
                        {invoice.paymentStatus}
                      </span>
                    </td>

                    {/* Actions Panel */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        
                        {/* Download PDF button (Paid only) */}
                        {isPaid && (
                          <button
                            onClick={() => onDownloadPdf(invoice)}
                            title="Download PDF Invoice"
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}

                        {/* Mark As Paid / Resend Action Button */}
                        {!isPaid ? (
                          <button
                            onClick={() => onMarkAsPaid(invoice)}
                            disabled={isProcessingPaid}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-750 font-bold px-3 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {isProcessingPaid ? (
                              <div className="w-3.5 h-3.5 border-2 border-indigo-750 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            <span>Mark Paid</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onResendEmail(invoice)}
                            disabled={isProcessingResend}
                            title="Resend Email Copy"
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {isProcessingResend ? (
                              <div className="w-3.5 h-3.5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Mail className="h-3.5 w-3.5" />
                            )}
                            <span>Resend Mail</span>
                          </button>
                        )}

                        {/* Edit Record */}
                        <button
                          onClick={() => onEdit(invoice)}
                          title="Edit Details"
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        {/* Delete Record */}
                        <button
                          onClick={() => onDelete(invoice)}
                          title="Delete Record"
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-all cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
