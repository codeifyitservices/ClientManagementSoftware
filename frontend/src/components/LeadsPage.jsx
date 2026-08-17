import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Search, Calendar, Phone, Mail, Edit, Trash2,
  TrendingUp, Clock, Target, Award, ChevronLeft, ChevronRight
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";

export default function LeadsPage({
  token,
  showToast,
  authenticatedFetch
}) {
  const navigate = useNavigate();

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [leadsToDeleteBulk, setLeadsToDeleteBulk] = useState(null);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const url = `${import.meta.env.VITE_BACKEND_URL}/api/leads?status=${statusFilter}&search=${encodeURIComponent(searchQuery)}&sortField=${sortField}&sortDirection=${sortDirection}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem("token")}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (err) {
      if (showToast) showToast("Failed to fetch leads", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchLeads();
  }, [token, statusFilter, sortField, sortDirection]);

  // Handle Search Trigger
  useEffect(() => {
    setCurrentPage(1);
    const delayDebounceFn = setTimeout(() => {
      fetchLeads();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleDeleteConfirm = async () => {
    if (!leadToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/leads/${leadToDelete._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem("token")}`
        }
      });
      if (res.ok) {
        if (showToast) showToast("Lead deleted successfully.", "success");
        setLeadToDelete(null);
        fetchLeads();
      } else {
        if (showToast) showToast("Failed to delete lead.", "error");
      }
    } catch (err) {
      if (showToast) showToast("Error deleting lead.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectRow = (id) => {
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

  const handleSelectAll = (items) => {
    const pageIds = items.map((item) => item._id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!leadsToDeleteBulk || leadsToDeleteBulk.length === 0) return;
    setIsDeletingBulk(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/leads/bulk-delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || localStorage.getItem("token")}`
        },
        body: JSON.stringify({ ids: leadsToDeleteBulk })
      });
      if (res.ok) {
        if (showToast) showToast(`${leadsToDeleteBulk.length} lead(s) deleted successfully.`, "success");
        setSelectedIds(new Set());
        setLeadsToDeleteBulk(null);
        fetchLeads();
      } else {
        if (showToast) showToast("Failed to delete leads.", "error");
      }
    } catch (err) {
      if (showToast) showToast("Error during bulk delete.", "error");
    } finally {
      setIsDeletingBulk(false);
    }
  };

  // Pipeline Metrics Calculation (based on cached root states)
  const totalLeads = leads.length;
  const activeLeads = leads.filter(l => l.currentStage !== "Won" && l.currentStage !== "Lost");
  const activeLeadsCount = activeLeads.length;
  // Paginate leads
  const indexOfLastItem = currentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  const paginatedLeads = leads.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.max(1, Math.ceil(leads.length / rowsPerPage));

  const todayStr = new Date().toISOString().split("T")[0];
  const dueFollowUpsCount = leads.filter(l => {
    if (!l.currentNextFollowUpDate || l.currentStage === "Won" || l.currentStage === "Lost" || l.currentStatus === "Completed" || l.currentStatus === "Cancelled") return false;
    const due = new Date(l.currentNextFollowUpDate).toISOString().split("T")[0];
    return due <= todayStr;
  }).length;

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "New Lead": return "bg-blue-50 text-blue-700 border-blue-100";
      case "Contacted": return "bg-indigo-50 text-indigo-700 border-indigo-100";
      case "Qualified": return "bg-sky-50 text-sky-700 border-sky-100";
      case "Discovery Call": return "bg-purple-50 text-purple-700 border-purple-100";
      case "Demo Scheduled": return "bg-violet-50 text-violet-705 border-violet-100";
      case "Proposal Sent": return "bg-amber-50 text-amber-700 border-amber-100";
      case "Negotiation": return "bg-orange-50 text-orange-700 border-orange-100";
      case "Contract Sent": return "bg-yellow-50 text-yellow-750 border-yellow-150";
      case "Won": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "Lost": return "bg-red-50 text-red-700 border-red-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  return (
    <div className="space-y-6 font-sans select-none animate-fade-in pb-12">
      {/* Metrics Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Pipeline Count */}
        <div className="p-5 bg-white border border-slate-100 rounded-2xl custom-shadow flex items-center justify-between transition-all hover:translate-y-[-2px] duration-300">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Active Leads</p>
            <h4 className="text-2xl font-black text-slate-900 leading-tight">{activeLeadsCount}</h4>
            <span className="text-[10px] font-bold text-slate-400 mt-1 block">{totalLeads} Total Leads</span>
          </div>
          <div className="p-3 rounded-2xl shrink-0 bg-blue-50 text-blue-600">
            <Target className="h-5 w-5" strokeWidth={2.5} />
          </div>
        </div>

        {/* Pipeline Value */}
        <div className="p-5 bg-white border border-slate-100 rounded-2xl custom-shadow flex items-center justify-between transition-all hover:translate-y-[-2px] duration-300">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Pipeline Value</p>
            <h4 className="text-2xl font-black text-slate-900 leading-tight">₹{pipelineValue.toLocaleString("en-IN")}</h4>
            <span className="text-[10px] font-bold text-slate-400 mt-1 block">Prospective business</span>
          </div>
          <div className="p-3 rounded-2xl shrink-0 bg-indigo-50 text-indigo-600">
            <TrendingUp className="h-5 w-5" strokeWidth={2.5} />
          </div>
        </div>

        {/* Follow Ups Due Today */}
        <div className="p-5 bg-white border border-slate-100 rounded-2xl custom-shadow flex items-center justify-between transition-all hover:translate-y-[-2px] duration-300">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Due Follow-Ups</p>
            <h4 className={`text-2xl font-black leading-tight ${dueFollowUpsCount > 0 ? "text-amber-600" : "text-slate-900"}`}>
              {dueFollowUpsCount}
            </h4>
            <span className="text-[10px] font-bold text-slate-400 mt-1 block">Pending today or overdue</span>
          </div>
          <div className={`p-3 rounded-2xl shrink-0 ${dueFollowUpsCount > 0 ? "bg-amber-50 text-amber-600 animate-pulse" : "bg-slate-50 text-slate-400"}`}>
            <Calendar className="h-5 w-5" strokeWidth={2.5} />
          </div>
        </div>

        {/* Won Value */}
        <div className="p-5 bg-white border border-slate-100 rounded-2xl custom-shadow flex items-center justify-between transition-all hover:translate-y-[-2px] duration-300">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Won Contracts</p>
            <h4 className="text-2xl font-black text-slate-950 leading-tight">₹{wonValue.toLocaleString("en-IN")}</h4>
            <span className="text-[10px] font-bold text-emerald-500 mt-1 block">Successfully closed deals</span>
          </div>
          <div className="p-3 rounded-2xl shrink-0 bg-emerald-50 text-emerald-600">
            <Award className="h-5 w-5" strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* Main Table / Grid Wrapper */}
      <div className="bg-white border border-slate-100 rounded-2xl custom-shadow overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contact, company, email..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            >
              <option value="all">All Stages</option>
              <option value="New Lead">New Lead</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="Discovery Call">Discovery Call</option>
              <option value="Demo Scheduled">Demo Scheduled</option>
              <option value="Proposal Sent">Proposal Sent</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Contract Sent">Contract Sent</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
            </select>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={() => setLeadsToDeleteBulk(Array.from(selectedIds))}
                className="bg-red-50 hover:bg-red-100 text-red-650 font-bold px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-red-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Selected ({selectedIds.size})</span>
              </button>
            )}

            {/* Add Lead Button */}
            <button
              onClick={() => navigate("/leads/create")}
              className="bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-500/10"
            >
              <Plus className="h-4 w-4" />
              <span>Add Lead</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {loading && leads.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400 font-semibold">Fetching leads...</span>
            </div>
          ) : leads.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm font-semibold">
              No leads found. Create a prospective lead to start logging follow-ups.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 select-none">
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={paginatedLeads.length > 0 && paginatedLeads.every((l) => selectedIds.has(l._id))}
                      onChange={() => handleSelectAll(paginatedLeads)}
                      className="h-4 w-4 rounded text-[#5D5FEF] focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-4 text-xs font-extrabold text-slate-450 uppercase tracking-wider">Lead Contact</th>
                  <th className="p-4 text-xs font-extrabold text-slate-450 uppercase tracking-wider">Source</th>
                  <th className="p-4 text-xs font-extrabold text-slate-450 uppercase tracking-wider">Current Stage</th>
                  <th className="p-4 text-xs font-extrabold text-slate-450 uppercase tracking-wider">Deal Value</th>
                  <th className="p-4 text-xs font-extrabold text-slate-450 uppercase tracking-wider text-center">Journey Updates</th>
                  <th className="p-4 text-xs font-extrabold text-slate-450 uppercase tracking-wider">Next Follow-Up</th>
                  <th className="p-4 text-xs font-extrabold text-slate-450 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                {paginatedLeads.map((lead) => {
                  const isChecked = selectedIds.has(lead._id);
                  const journeyCount = lead.leadJourney?.length || 0;
                  const nextDate = lead.currentNextFollowUpDate ? new Date(lead.currentNextFollowUpDate) : null;
                  const isOverdue = nextDate && nextDate.toISOString().split("T")[0] <= todayStr && lead.currentStage !== "Won" && lead.currentStage !== "Lost";

                  return (
                    <tr
                      key={lead._id}
                      onClick={() => navigate(`/leads/${lead._id}`)}
                      className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${isChecked ? "bg-indigo-50/15" : ""}`}
                    >
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectRow(lead._id)}
                          className="h-4 w-4 rounded text-[#5D5FEF] focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-4 max-w-xs">
                        <div className="truncate">
                          <p className="text-sm font-black text-slate-900 leading-tight">{lead.leadName}</p>
                          <span className="text-[10px] text-slate-450 mt-1 block">
                            {lead.companyName ? `${lead.companyName} • ` : ""}{lead.phone || lead.email || "No contact info"}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-650">{lead.source}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(lead.currentStage)}`}>
                          {lead.currentStage}
                        </span>
                      </td>
                      <td className="p-4 text-slate-900 font-extrabold">
                        ₹{(lead.value || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${journeyCount > 0 ? "bg-indigo-50 text-indigo-700 animate-none" : "bg-slate-100 text-slate-400"}`}>
                          {journeyCount} stage(s)
                        </span>
                      </td>
                      <td className="p-4">
                        {nextDate ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${isOverdue ? "bg-red-500 animate-pulse" : "bg-slate-400"}`} />
                            <span className={isOverdue ? "text-red-650 font-extrabold" : "text-slate-650"}>
                              {nextDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => navigate(`/leads/${lead._id}/edit`)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-slate-250 bg-white cursor-pointer"
                            title="Edit Lead"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setLeadToDelete(lead)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-655 transition-colors border border-slate-250 bg-white cursor-pointer"
                            title="Delete Lead"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination ── */}
        {leads.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-100 bg-white">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                <span>Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded-md border border-slate-200 bg-white text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-xs"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <p className="text-xs text-slate-500 font-semibold">
                Showing {indexOfFirstItem + 1}–{Math.min(indexOfLastItem, leads.length)} of {leads.length} leads
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} />
                Previous
              </button>

              <span className="text-xs text-slate-500 select-none font-semibold">
                Page <span className="font-bold text-slate-800">{currentPage}</span> of{" "}
                <span className="font-bold text-slate-800">{totalPages}</span>
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Lead Dialog */}
      <ConfirmDialog
        isOpen={!!leadToDelete}
        onClose={() => setLeadToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Lead Profile"
        message={`Are you sure you want to delete the prospective lead profile for ${leadToDelete?.leadName}? This action is permanent and will delete all associated journey stage updates.`}
        confirmText="Delete Profile"
        isDeleting={isDeleting}
      />

      {/* Bulk Delete Dialog */}
      <ConfirmDialog
        isOpen={!!leadsToDeleteBulk}
        onClose={() => setLeadsToDeleteBulk(null)}
        onConfirm={handleBulkDelete}
        title="Bulk Delete Leads"
        message={`Are you sure you want to permanently delete the ${leadsToDeleteBulk?.length} selected prospective lead profiles? This action cannot be undone.`}
        confirmText="Delete All Selected"
        isDeleting={isDeletingBulk}
      />
    </div>
  );
}
