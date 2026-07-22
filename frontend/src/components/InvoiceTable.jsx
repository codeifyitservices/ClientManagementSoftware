import React, { useState, useEffect, useMemo } from "react";
import {
  Edit,
  Trash2,
  Mail,
  Check,
  Download,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

const ROWS_PER_PAGE = 10;

const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "Paid", value: "paid" },
  { label: "Pending", value: "pending" },
];

export default function InvoiceTable({
  invoices = [],
  onEdit,
  onDelete,
  onMarkAsPaid,
  onResendEmail,
  onDownloadPdf,
  onDeleteSelected,
  processingIds = {},
}) {
  // ── Filter ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("all");

  // ── Pagination ───────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);

  // ── Multi-select ─────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Reset to page 1 and clear selection whenever the filter changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [activeTab]);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    if (activeTab === "all") return invoices;
    return invoices.filter(
      (inv) => inv.paymentStatus?.toLowerCase() === activeTab
    );
  }, [invoices, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / ROWS_PER_PAGE));

  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredInvoices.slice(start, start + ROWS_PER_PAGE);
  }, [filteredInvoices, currentPage]);

  // ── Checkbox helpers ─────────────────────────────────────────────────────────
  const pageIds = paginatedInvoices.map((inv) => inv._id ?? inv.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ── Pagination helpers ───────────────────────────────────────────────────────
  const goToPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goToNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  // ── Status badge ─────────────────────────────────────────────────────────────
  const statusBadge = (status) => {
    const s = status?.toLowerCase();
    if (s === "paid")
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
          <Check size={11} />
          Paid
        </span>
      );
    if (s === "pending")
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
          <AlertCircle size={11} />
          Pending
        </span>
      );
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
        {status ?? "—"}
      </span>
    );
  };

  // Total columns: checkbox + 7 data cols + actions = 9
  const TOTAL_COLS = 9;

  return (
    <div className="font-sans flex flex-col gap-4 pb-24">
      {/* ── Filter Tabs ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 cursor-pointer ${
              activeTab === tab.value
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {/* Select-all checkbox */}
              <th className="w-10 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = somePageSelected && !allPageSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 accent-indigo-600 cursor-pointer"
                  aria-label="Select all on this page"
                />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide text-xs whitespace-nowrap">
                Invoice No
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide text-xs whitespace-nowrap">
                Client / Company
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wide text-xs whitespace-nowrap">
                Base Amount
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wide text-xs whitespace-nowrap">
                GST Rate
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600 uppercase tracking-wide text-xs whitespace-nowrap">
                Grand Total
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide text-xs whitespace-nowrap">
                Status
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600 uppercase tracking-wide text-xs whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white">
            {paginatedInvoices.length === 0 ? (
              <tr>
                <td
                  colSpan={TOTAL_COLS}
                  className="px-4 py-12 text-center text-gray-400 text-sm"
                >
                  No invoices found.
                </td>
              </tr>
            ) : (
              paginatedInvoices.map((invoice) => {
                const id = invoice._id ?? invoice.id;
                const isSelected = selectedIds.has(id);
                const itemState = processingIds[id] || {};
                const isPaidLoading = !!itemState.paid;
                const isResendLoading = !!itemState.resend;
                const isAnyProcessing = isPaidLoading || isResendLoading;

                return (
                  <tr
                    key={id}
                    className={`transition-colors duration-100 ${
                      isSelected ? "bg-indigo-50" : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Row checkbox */}
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(id)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 accent-indigo-600 cursor-pointer"
                        aria-label={`Select invoice ${invoice.invoiceNumber}`}
                      />
                    </td>

                    {/* Invoice No */}
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                      {invoice.invoiceNumber ?? "—"}
                    </td>

                    {/* Client / Company */}
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      <div className="font-medium">{invoice.client?.clientName ?? "—"}</div>
                      {invoice.client?.companyName && (
                        <div className="text-xs text-gray-400">{invoice.client.companyName}</div>
                      )}
                    </td>

                    {/* Base Amount */}
                    <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                      {invoice.amount != null
                        ? `₹${Number(invoice.amount).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}`
                        : "—"}
                    </td>

                    {/* GST Rate */}
                    <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                      {invoice.gstRate != null ? `${invoice.gstRate}%` : "—"}
                    </td>

                    {/* Grand Total */}
                    <td className="px-4 py-3 text-right font-semibold text-gray-800 whitespace-nowrap">
                      {invoice.totalAmount != null
                        ? `₹${Number(invoice.totalAmount).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}`
                        : "—"}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {statusBadge(invoice.paymentStatus)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* Edit */}
                        <button
                          onClick={() => onEdit?.(invoice)}
                          disabled={isAnyProcessing}
                          title="Edit"
                          className="p-1.5 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          <Edit size={15} />
                        </button>

                        {/* Mark as Paid */}
                        {invoice.paymentStatus?.toLowerCase() !== "paid" && (
                          <button
                            onClick={() => onMarkAsPaid?.(invoice)}
                            disabled={isAnyProcessing}
                            title="Mark as Paid"
                            className="p-1.5 rounded-md text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            {isPaidLoading ? (
                              <Loader2 size={15} className="animate-spin text-emerald-600" />
                            ) : (
                              <Check size={15} />
                            )}
                          </button>
                        )}

                        {/* Send Email */}
                        <button
                          onClick={() => onResendEmail?.(invoice)}
                          disabled={isAnyProcessing}
                          title="Send Email to Client"
                          className="p-1.5 rounded-md text-gray-500 hover:text-sky-600 hover:bg-sky-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          {isResendLoading ? (
                            <Loader2 size={15} className="animate-spin text-sky-600" />
                          ) : (
                            <Mail size={15} />
                          )}
                        </button>

                        {/* Download PDF */}
                        <button
                          onClick={() => onDownloadPdf?.(invoice)}
                          disabled={isAnyProcessing}
                          title="Download PDF"
                          className="p-1.5 rounded-md text-gray-500 hover:text-violet-600 hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          <Download size={15} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => onDelete?.(invoice)}
                          disabled={isAnyProcessing}
                          title="Delete"
                          className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          <Trash2 size={15} />
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

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-gray-500">
          {filteredInvoices.length === 0
            ? "No records"
            : `Showing ${(currentPage - 1) * ROWS_PER_PAGE + 1}–${Math.min(
                currentPage * ROWS_PER_PAGE,
                filteredInvoices.length
              )} of ${filteredInvoices.length} invoices`}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={goToPrev}
            disabled={currentPage === 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={15} />
            Previous
          </button>

          <span className="text-sm text-gray-500 select-none">
            Page{" "}
            <span className="font-semibold text-gray-700">{currentPage}</span>
            {" "}of{" "}
            <span className="font-semibold text-gray-700">{totalPages}</span>
          </span>

          <button
            onClick={goToNext}
            disabled={currentPage === totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* ── Sticky Delete Bar ─────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 bg-red-600 text-white shadow-2xl">
          <span className="text-sm font-medium">
            {selectedIds.size} invoice{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-4 py-1.5 rounded-lg border border-red-400 text-sm hover:bg-red-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onDeleteSelected?.(Array.from(selectedIds));
                setSelectedIds(new Set());
              }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors"
            >
              <Trash2 size={15} />
              Delete Selected ({selectedIds.size})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
