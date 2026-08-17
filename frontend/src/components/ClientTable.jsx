import React, { useState, useMemo, useEffect } from "react";
import {
  ArrowUpDown,
  Eye,
  Edit2,
  Trash2,
  Globe,
  Building,
  ChevronLeft,
  ChevronRight,
  Trash,
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";

const PAGE_SIZE = 10;

export default function ClientTable({
  clients = [],
  onView,
  onEdit,
  onDelete,
  onDeleteSelected,
}) {
  const [sortField, setSortField] = useState("companyName");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleteIds, setBulkDeleteIds] = useState(null);

  // ── Sorting ──────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    return [...clients].sort((a, b) => {
      const valA = (a[sortField] ?? "").toString().toLowerCase();
      const valB = (b[sortField] ?? "").toString().toLowerCase();
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [clients, sortField, sortOrder]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));

  // Reset to page 1 when sort or client list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortField, sortOrder, clients.length]);

  // Clamp current page when total pages shrink
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sorted.slice(start, start + rowsPerPage);
  }, [sorted, currentPage, rowsPerPage]);

  // ── Selection helpers ─────────────────────────────────────────────────────
  const pageIds = pageRows.map((c) => c._id ?? c.id);
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

  // ── Sort toggle ───────────────────────────────────────────────────────────
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // ── Delete selected ───────────────────────────────────────────────────────
  const handleDeleteSelected = () => {
    if (onDeleteSelected) {
      onDeleteSelected([...selectedIds]);
    }
    setSelectedIds(new Set());
  };

  // ── Sortable header cell ──────────────────────────────────────────────────
  const SortableHeader = ({ field, label }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap group"
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown
          size={13}
          className={`transition-colors ${
            sortField === field
              ? "text-indigo-500"
              : "text-gray-400 group-hover:text-gray-600"
          }`}
        />
      </span>
    </th>
  );

  const selectedCount = selectedIds.size;

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
              <SortableHeader field="companyName" label="Company" />
              <SortableHeader field="clientName" label="Contact" />
              <SortableHeader field="email" label="Email" />
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                Phone
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody className="divide-y divide-gray-100 bg-white">
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-16 text-center text-gray-400 text-sm"
                >
                  No clients found.
                </td>
              </tr>
            ) : (
              pageRows.map((client) => {
                const id = client._id ?? client.id;
                const isSelected = selectedIds.has(id);
                return (
                  <tr
                    key={id}
                    className={`transition-colors duration-150 ${
                      isSelected
                        ? "bg-indigo-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${client.companyName}`}
                        checked={isSelected}
                        onChange={() => toggleRow(id)}
                        className="h-4 w-4 rounded border-gray-300 accent-indigo-600 cursor-pointer"
                      />
                    </td>

                    {/* Company */}
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        <Building size={14} className="text-indigo-500 flex-shrink-0" />
                        {client.companyName || "—"}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {client.clientName || "—"}
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {client.email ? (
                        <a
                          href={`mailto:${client.email}`}
                          className="hover:text-indigo-600 transition-colors"
                        >
                          {client.email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {client.phone || "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {onView && (
                          <button
                            onClick={() => onView(client)}
                            title="View"
                            className="p-1.5 rounded-md text-gray-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                        )}
                        {onEdit && (
                          <button
                            onClick={() => onEdit(client)}
                            title="Edit"
                            className="p-1.5 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <Edit2 size={15} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(client)}
                            title="Delete"
                            className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
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
            {sorted.length === 0
              ? "No records"
              : `Showing ${(currentPage - 1) * rowsPerPage + 1}–${Math.min(
                  currentPage * rowsPerPage,
                  sorted.length
                )} of ${sorted.length} clients`}
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

      {/* ── Sticky Delete Bar ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-red-600/95 backdrop-blur-md shadow-2xl border-t border-red-500 transition-transform duration-300 ease-in-out ${
          selectedCount > 0 ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <span className="text-white font-medium text-sm">
          <span className="font-bold">{selectedCount}</span>{" "}
          {selectedCount === 1 ? "client" : "clients"} selected
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
        title="Delete Selected Clients"
        message={`Are you sure you want to delete ${bulkDeleteIds?.length || 0} selected client profile(s)? This action will also cascade delete all associated invoices and cannot be undone.`}
        confirmText="Delete Clients & Invoices"
      />
    </div>
  );
}
