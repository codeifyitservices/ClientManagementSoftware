import React, { useState, useMemo, useEffect } from "react";
import {
  Edit2,
  Trash2,
  Mail,
  ChevronLeft,
  ChevronRight,
  Trash,
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";

const PAGE_SIZE = 10;

// Compute status object from subscription
function getSubscriptionStatus(sub) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(sub.endDate);
  endDate.setHours(0, 0, 0, 0);

  if (today >= endDate) {
    return { label: "Expired", color: "bg-rose-50 text-rose-700 border-rose-100", type: "expired" };
  }

  const fifteenDays = new Date(sub.endDate);
  fifteenDays.setDate(fifteenDays.getDate() - 15);
  fifteenDays.setHours(0, 0, 0, 0);
  if (today >= fifteenDays) {
    return { label: "Expiring < 15 Days", color: "bg-red-50 text-red-700 border-red-200 animate-pulse font-bold", type: "expiring15" };
  }

  const oneMonth = new Date(sub.endDate);
  oneMonth.setMonth(oneMonth.getMonth() - 1);
  oneMonth.setHours(0, 0, 0, 0);
  if (today >= oneMonth) {
    return { label: "Expiring < 1 Month", color: "bg-amber-50 text-amber-700 border-amber-200 font-semibold", type: "expiringMonth" };
  }

  return { label: "Active", color: "bg-emerald-50 text-emerald-700 border-emerald-100", type: "active" };
}

export default function SubscriptionTable({
  subscriptions = [],
  loading = false,
  sendingEmailIds = {},
  onEdit,
  onDelete,
  onSendEmail,
  onDeleteSelected,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleteIds, setBulkDeleteIds] = useState(null);

  // Reset to page 1 when list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [subscriptions.length]);

  const totalPages = Math.max(1, Math.ceil(subscriptions.length / PAGE_SIZE));

  // Clamp current page when total pages shrink
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return subscriptions.slice(start, start + PAGE_SIZE);
  }, [subscriptions, currentPage]);

  // ── Selection helpers ──────────────────────────────────────────────────────
  const pageIds = pageRows.map((s) => s._id);
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

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedCount = selectedIds.size;

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-400 font-semibold">Loading subscriptions...</span>
        </div>
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 font-semibold text-sm">
        No matching subscriptions found.
      </div>
    );
  }

  return (
    <div className="font-sans relative">
      {/* ── Table wrapper ── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          {/* ── Head ── */}
          <thead className="bg-gray-50">
            <tr>
              {/* Checkbox column */}
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  checked={allPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = somePageSelected && !allPageSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 accent-indigo-600 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Client</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Start Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Duration</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Expiry Date</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Amount</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Status</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Actions</th>
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody className="divide-y divide-gray-100 bg-white">
            {pageRows.map((sub) => {
              const id = sub._id;
              const isSelected = selectedIds.has(id);
              const status = getSubscriptionStatus(sub);

              return (
                <tr
                  key={id}
                  className={`transition-colors duration-150 ${
                    isSelected ? "bg-indigo-50" : "hover:bg-gray-50"
                  }`}
                >
                  {/* Checkbox */}
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${sub.client?.companyName}`}
                      checked={isSelected}
                      onChange={() => toggleRow(id)}
                      className="h-4 w-4 rounded border-gray-300 accent-indigo-600 cursor-pointer"
                    />
                  </td>

                  {/* Client */}
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800 whitespace-nowrap">
                      {sub.client?.companyName || "Unknown Client"}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {sub.client?.clientName} &bull; {sub.client?.email || "No Email"}
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-block px-2.5 py-1 rounded-lg font-bold text-[10px] ${
                      sub.type === "hosting" ? "bg-indigo-50 text-indigo-700" : "bg-purple-50 text-purple-700"
                    }`}>
                      {sub.type}
                    </span>
                  </td>

                  {/* Start Date */}
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {new Date(sub.startDate).toLocaleDateString("en-IN")}
                  </td>

                  {/* Duration */}
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap font-semibold">
                    {sub.durationValue} {sub.durationUnit}
                  </td>

                  {/* Expiry Date */}
                  <td className="px-4 py-3 text-gray-800 whitespace-nowrap font-bold">
                    {new Date(sub.endDate).toLocaleDateString("en-IN")}
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="font-black text-gray-900">
                      ₹{Number(sub.finalAmount || sub.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[9px] text-gray-400 font-bold mt-0.5 uppercase tracking-wider">
                      {sub.client?.isForeign ? "No GST" : (sub.inclusiveGst !== false ? "GST Inc" : "+18% GST")}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded-md border text-[9px] uppercase tracking-wider font-extrabold ${status.color}`}>
                      {status.label}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      {onSendEmail && (
                        <button
                          type="button"
                          onClick={() => onSendEmail(sub)}
                          disabled={sendingEmailIds[sub._id]}
                          title="Send Expiration Email Reminder"
                          className="p-1.5 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40"
                        >
                          <Mail size={15} />
                        </button>
                      )}
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(sub)}
                          title="Edit Subscription"
                          className="p-1.5 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Edit2 size={15} />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(sub)}
                          title="Delete Subscription"
                          className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="flex items-center justify-between mt-4 px-1">
        <p className="text-sm text-gray-500">
          {subscriptions.length === 0
            ? "No records"
            : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(
                currentPage * PAGE_SIZE,
                subscriptions.length
              )} of ${subscriptions.length} subscriptions`}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* ── Sticky Bottom Delete Bar ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-red-600/95 backdrop-blur-md shadow-2xl border-t border-red-500 transition-transform duration-300 ease-in-out ${
          selectedCount > 0 ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <span className="text-white font-medium text-sm">
          <span className="font-bold">{selectedCount}</span>{" "}
          {selectedCount === 1 ? "subscription" : "subscriptions"} selected
        </span>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-4 py-2 rounded-lg border border-red-300/40 text-red-100 text-sm font-medium hover:bg-red-500/50 transition-colors"
          >
            Clear selection
          </button>
          <button
            onClick={() => setBulkDeleteIds(Array.from(selectedIds))}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-white text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors shadow-md cursor-pointer"
          >
            <Trash size={15} />
            Delete Selected ({selectedCount})
          </button>
        </div>
      </div>

      {/* Bottom padding so content isn't hidden behind bar when open */}
      {selectedCount > 0 && <div className="h-20" />}

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!bulkDeleteIds}
        onClose={() => setBulkDeleteIds(null)}
        onConfirm={() => {
          if (bulkDeleteIds) {
            onDeleteSelected?.(bulkDeleteIds);
            setSelectedIds(new Set());
            setBulkDeleteIds(null);
          }
        }}
        title="Delete Selected Subscriptions"
        message={`Are you sure you want to delete ${bulkDeleteIds?.length || 0} selected subscription contract(s)? This action is permanent and cannot be undone.`}
        confirmText={`Delete ${bulkDeleteIds?.length || 0} Contracts`}
      />
    </div>
  );
}
