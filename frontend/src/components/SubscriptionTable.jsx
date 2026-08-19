import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Edit2,
  Trash2,
  Mail,
  ChevronLeft,
  ChevronRight,
  Trash,
  Eye,
  RefreshCw,
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import { formatWithINRConversion, getSubscriptionCode } from "../utils/currencyUtils";

const PAGE_SIZE = 10;

// Compute accurate Next Due Date according to payment interval (billingCycle)
export function getSubscriptionNextDueDate(sub) {
  if (!sub || !sub.startDate) return new Date();

  const startDate = new Date(sub.startDate);
  const endDate = sub.endDate ? new Date(sub.endDate) : startDate;
  const cycle = (sub.billingCycle || (sub.durationUnit === "years" ? "yearly" : "monthly")).toLowerCase();

  // If one_time or full contract term is 1 year / 1 interval equal to duration
  if (
    cycle === "one_time" ||
    (cycle === "yearly" && sub.durationUnit === "years" && sub.durationValue === 1) ||
    (cycle === "monthly" && sub.durationUnit === "months" && sub.durationValue === 1)
  ) {
    return endDate;
  }

  const addInterval = (d, c) => {
    const next = new Date(d);
    if (c === "weekly") next.setDate(next.getDate() + 7);
    else if (c === "quarterly") next.setMonth(next.getMonth() + 3);
    else if (c === "yearly") next.setFullYear(next.getFullYear() + 1);
    else next.setMonth(next.getMonth() + 1); // default monthly
    return next;
  };

  const paidPayments = (sub.payments || []).filter((p) => p.status === "Paid");

  let nextDue;
  if (paidPayments.length > 0) {
    const lastP = paidPayments[paidPayments.length - 1];
    const lastDate = lastP.paymentDate ? new Date(lastP.paymentDate) : startDate;
    nextDue = addInterval(lastDate, cycle);
  } else {
    // If no paid payment recorded yet, next payment is due on the 1st interval end
    nextDue = addInterval(startDate, cycle);
  }

  if (nextDue > endDate) {
    nextDue = endDate;
  }

  return nextDue;
}

// Compute status object from subscription based on contract expiration (sub.endDate)
export function getSubscriptionStatus(sub) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(sub.endDate);
  const endMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  const diffMs = endMidnight.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: "Expired",
      color: "bg-rose-50 border-rose-200 text-rose-700 font-bold",
      type: "expired",
      diffDays,
    };
  }

  if (diffDays === 0) {
    return {
      label: "Expires Today",
      color: "bg-rose-100 border-rose-300 text-rose-800 font-black animate-pulse",
      type: "today",
      diffDays,
    };
  }

  if (diffDays === 1) {
    return {
      label: "Tomorrow",
      color: "bg-rose-100 border-rose-200 text-rose-700 font-extrabold animate-pulse",
      type: "tomorrow",
      diffDays,
    };
  }

  if (diffDays <= 3) {
    return {
      label: "3 Days Left",
      color: "bg-rose-50 border-rose-200 text-rose-600 font-extrabold",
      type: "3days",
      diffDays,
    };
  }

  if (diffDays <= 7) {
    return {
      label: "7 Days Left",
      color: "bg-amber-100 border-amber-300 text-amber-800 font-bold",
      type: "7days",
      diffDays,
    };
  }

  if (diffDays <= 15) {
    return {
      label: "15 Days Left",
      color: "bg-amber-50 border-amber-200 text-amber-700 font-bold",
      type: "15days",
      diffDays,
    };
  }

  if (diffDays <= 30) {
    return {
      label: "1 Month Left",
      color: "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold",
      type: "1month",
      diffDays,
    };
  }

  return {
    label: "Active",
    color: "bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold",
    type: "active",
    diffDays,
  };
}

export default function SubscriptionTable({
  subscriptions = [],
  loading = false,
  sendingEmailIds = {},
  onEdit,
  onDelete,
  onSendEmail,
  onRenew,
  onDeleteSelected,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleteIds, setBulkDeleteIds] = useState(null);

  // Reset to page 1 when list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [subscriptions.length]);

  const totalPages = Math.max(1, Math.ceil(subscriptions.length / rowsPerPage));

  // Clamp current page when total pages shrink
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return subscriptions.slice(start, start + rowsPerPage);
  }, [subscriptions, currentPage, rowsPerPage]);

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
      {/* ── Table wrapper with smooth horizontal scroll ── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm custom-scrollbar">
        <table className="w-full min-w-[900px] divide-y divide-gray-200 text-xs">
          {/* ── Head ── */}
          <thead className="bg-gray-50/80">
            <tr>
              {/* Checkbox column */}
              <th className="w-8 px-2.5 py-2.5 text-center">
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  checked={allPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = somePageSelected && !allPageSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="h-3.5 w-3.5 rounded border-gray-300 accent-indigo-600 cursor-pointer"
                />
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Client / Sub ID</th>
              <th className="px-2.5 py-2.5 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Type</th>
              <th className="px-2.5 py-2.5 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Payment Method</th>
              <th className="px-2.5 py-2.5 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Start Date</th>
              <th className="px-2.5 py-2.5 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Duration</th>
              <th className="px-2.5 py-2.5 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Next Due Date</th>
              <th className="px-3 py-2.5 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Amount</th>
              <th className="px-2.5 py-2.5 text-center text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Status</th>
              <th className="px-2.5 py-2.5 text-center text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Actions</th>
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody className="divide-y divide-gray-100 bg-white">
            {pageRows.map((sub) => {
              const id = sub._id;
              const isSelected = selectedIds.has(id);
              const status = getSubscriptionStatus(sub);
              const subCode = getSubscriptionCode(sub);

              return (
                <tr
                  key={id}
                  className={`transition-colors duration-150 ${
                    isSelected ? "bg-indigo-50/70" : "hover:bg-gray-50/80"
                  }`}
                >
                  {/* Checkbox */}
                  <td className="px-2.5 py-2.5 text-center">
                    <input
                      type="checkbox"
                      aria-label={`Select ${sub.client?.companyName}`}
                      checked={isSelected}
                      onChange={() => toggleRow(id)}
                      className="h-3.5 w-3.5 rounded border-gray-300 accent-indigo-600 cursor-pointer"
                    />
                  </td>

                  {/* Client & Sub ID */}
                  <td className="px-3 py-2.5">
                    <Link
                      to={`/subscriptions/${sub._id}`}
                      className="font-bold text-slate-800 hover:text-indigo-600 transition-colors hover:underline text-xs block leading-tight"
                    >
                      {sub.client?.companyName || "Unknown Client"}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-600 border border-slate-200/60">
                        {subCode}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        &bull; {sub.client?.clientName}
                      </span>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-2.5 py-2.5 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] capitalize ${
                      sub.type === "hosting"
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                        : sub.type === "maintenance"
                        ? "bg-purple-50 text-purple-700 border border-purple-100"
                        : sub.type === "digital_marketing"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : "bg-amber-50 text-amber-700 border border-amber-100"
                    }`}>
                      {sub.type === "custom"
                        ? sub.customType || "Custom"
                        : sub.type.replace(/_/g, " ")}
                    </span>
                  </td>

                  {/* Payment Method */}
                  <td className="px-2.5 py-2.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px] border border-slate-200/50">
                      {sub.paymentMethod === "credit_debit_card"
                        ? "Card"
                        : sub.paymentMethod === "upi"
                        ? "UPI"
                        : "Bank Transfer"}
                    </span>
                  </td>

                  {/* Start Date */}
                  <td className="px-2.5 py-2.5 text-slate-600 whitespace-nowrap font-medium text-[11px]">
                    {new Date(sub.startDate).toLocaleDateString("en-IN")}
                  </td>

                  {/* Duration */}
                  <td className="px-2.5 py-2.5 text-slate-700 whitespace-nowrap font-semibold text-[11px]">
                    {sub.durationValue} {sub.durationUnit}
                  </td>

                  {/* Next Due Date */}
                  <td className={`px-2.5 py-2.5 whitespace-nowrap font-bold text-[11px] ${
                    ["expired", "overdue", "today", "tomorrow", "3days"].includes(status.type)
                      ? "text-rose-600"
                      : "text-slate-800"
                  }`}>
                    <div>
                      {getSubscriptionNextDueDate(sub).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    <div className="text-[9px] font-normal text-slate-400">
                      Contract Ends: {new Date(sub.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <div className="font-extrabold text-slate-900 text-xs">
                      {formatWithINRConversion(sub.finalAmount || sub.amount, sub.currency || "INR (₹)")}
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
                      {sub.client?.isForeign ? "No GST" : sub.isPersonalAccount ? "Personal" : (sub.inclusiveGst !== false ? "GST Inc" : "+18% GST")}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-2.5 py-2.5 text-center whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded-md border text-[9px] uppercase tracking-wider font-extrabold ${status.color}`}>
                      {status.label}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-2.5 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        to={`/subscriptions/${sub._id}`}
                        title="View Subscription Details"
                        className="p-1.5 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <Eye size={15} />
                      </Link>
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
                      {onRenew && (
                        <button
                          type="button"
                          onClick={() => onRenew(sub)}
                          title="Renew Subscription"
                          className="p-1.5 rounded-md text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        >
                          <RefreshCw size={15} />
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded-md border border-gray-200 bg-white text-gray-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-xs"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <p className="text-xs sm:text-sm text-gray-500">
            {subscriptions.length === 0
              ? "No records"
              : `Showing ${(currentPage - 1) * rowsPerPage + 1}–${Math.min(
                  currentPage * rowsPerPage,
                  subscriptions.length
                )} of ${subscriptions.length} subscriptions`}
          </p>
        </div>

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
