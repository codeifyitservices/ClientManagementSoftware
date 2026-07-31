import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bug,
  Search,
  Plus,
  ArrowUpDown,
  Trash2,
  Calendar,
  AlertTriangle,
  Folder,
  User,
  ExternalLink,
} from "lucide-react";
import TicketModal from "./TicketModal";

export default function TicketListPage({ token, currentUser, showToast }) {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [totalTicketsCount, setTotalTicketsCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    assigned: 0,
    inProgress: 0,
    closed: 0,
    reopened: 0,
    criticalBugs: 0,
  });

  const [projects, setProjects] = useState([]);

  // Filter and pagination states
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isAdmin = currentUser?.role === "Admin";

  const fetchFiltersData = async () => {
    try {
      const projRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const projData = await projRes.json();
      if (projRes.ok) {
        setProjects(projData.projects || projData || []);
      }
    } catch (err) {
      console.error("Error loading filter lists:", err);
    }
  };

  const fetchTickets = async () => {
    try {
      const queryParams = new URLSearchParams({
        search,
        project: filterProject,
        severity: filterSeverity,
        priority: filterPriority,
        status: filterStatus,
        page,
        limit: 10,
        sort: sortBy,
        order: sortOrder,
      });

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tickets?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setTickets(data.tickets);
        setTotalTicketsCount(data.total);
        setTotalPages(data.pages);
      }
    } catch (error) {
      showToast("Error loading tickets list.", "error");
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tickets?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        const list = data.tickets || [];

        const calculated = list.reduce(
          (acc, t) => {
            acc.total += 1;
            const statusKey = t.status.toLowerCase().replace(" ", "");
            if (statusKey === "open") acc.open += 1;
            if (statusKey === "assigned") acc.assigned += 1;
            if (statusKey === "inprogress") acc.inProgress += 1;
            if (statusKey === "closed") acc.closed += 1;
            if (statusKey === "reopened") acc.reopened += 1;

            if (t.severity === "Critical") {
              acc.criticalBugs += 1;
            }
            return acc;
          },
          { total: 0, open: 0, assigned: 0, inProgress: 0, closed: 0, reopened: 0, criticalBugs: 0 }
        );
        setStats(calculated);
      }
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  };

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [search, filterProject, filterSeverity, filterPriority, filterStatus, sortBy, sortOrder, page]);

  const handleDelete = async (ticketId) => {
    if (!window.confirm("Are you sure you want to permanently delete this bug ticket?")) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tickets/${ticketId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast("Ticket deleted successfully.", "success");
        fetchTickets();
        fetchStats();
      } else {
        const data = await res.json();
        showToast(data.message || "Failed to delete ticket.", "error");
      }
    } catch (err) {
      showToast("Network error deleting ticket.", "error");
    }
  };

  const getSeverityColor = (sev) => {
    switch (sev) {
      case "Critical":
        return "bg-rose-100 text-rose-800 border-rose-200 font-extrabold";
      case "Major":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Closed":
        return "bg-slate-100 text-slate-500 border-slate-200";
      case "Resolved":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "In Progress":
        return "bg-indigo-50 text-indigo-750 border-indigo-150";
      case "Assigned":
        return "bg-blue-50 text-blue-700 border-blue-100";
      case "Reopened":
        return "bg-rose-50 text-rose-700 border-rose-100 font-bold";
      default:
        return "bg-slate-50 text-slate-600 border-slate-150"; // Open
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-lg font-black text-slate-800 tracking-wide uppercase flex items-center gap-2">
            <Bug className="h-5 w-5 text-[#5D5FEF]" />
            <span>Bug Ticket Directory</span>
          </h1>
          <p className="text-[10px] text-slate-450 font-bold mt-0.5">
            Log application defects, assign developers, and track resolutions
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4.5 py-2.5 bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border-0"
        >
          <Plus className="h-4 w-4" />
          <span>RAISE BUG TICKET</span>
        </button>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-7 gap-4">
        {[
          { label: "Total Bugs", value: stats.total, color: "text-slate-800" },
          { label: "Open", value: stats.open, color: "text-blue-650" },
          { label: "Assigned", value: stats.assigned, color: "text-indigo-600" },
          { label: "In Progress", value: stats.inProgress, color: "text-indigo-750" },
          { label: "Resolved", value: stats.resolved || 0, color: "text-emerald-700" },
          { label: "Closed", value: stats.closed, color: "text-slate-500" },
          { label: "Critical Bugs", value: stats.criticalBugs, color: "text-rose-700", warning: stats.criticalBugs > 0 },
        ].map((item, idx) => {
          // Compute dynamic resolved index
          if (item.label === "Resolved") {
            const list = tickets || [];
            item.value = tickets.filter(t => t.status === "Resolved").length;
          }
          return (
            <div
              key={idx}
              className={`bg-white border p-4 rounded-2xl shadow-sm ${
                item.warning ? "border-rose-100 bg-rose-50/10 animate-pulse" : "border-slate-100"
              }`}
            >
              <span className="text-[9px] font-black uppercase text-slate-450 tracking-wider">
                {item.label}
              </span>
              <div className={`text-lg font-black mt-1.5 ${item.color}`}>{item.value}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4.5 shadow-sm space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bug tickets..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-205 text-slate-900 text-xs focus:outline-none focus:border-[#5D5FEF]"
            />
          </div>

          {/* Project filter */}
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-205 text-slate-900 text-xs focus:outline-none cursor-pointer"
          >
            <option value="">All Projects</option>
            {projects.map((proj) => (
              <option key={proj._id} value={proj._id}>
                {proj.projectName}
              </option>
            ))}
          </select>

          {/* Severity filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-205 text-slate-900 text-xs focus:outline-none cursor-pointer"
          >
            <option value="">All Severities</option>
            <option value="Minor">Minor</option>
            <option value="Major">Major</option>
            <option value="Critical">Critical</option>
          </select>

          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-205 text-slate-900 text-xs focus:outline-none cursor-pointer"
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-205 text-slate-900 text-xs focus:outline-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
            <option value="Reopened">Reopened</option>
          </select>
        </div>
      </div>

      {/* Table view */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden select-none">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-4 text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Ticket ID
                </th>
                <th className="px-5 py-4 text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Title
                </th>
                <th className="px-5 py-4 text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Project
                </th>
                <th className="px-5 py-4 text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Raised By
                </th>
                <th className="px-5 py-4 text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Assigned To
                </th>
                <th className="px-5 py-4 text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Severity
                </th>
                <th className="px-5 py-4 text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Priority
                </th>
                <th className="px-5 py-4 text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-5 py-4 text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Created Date
                </th>
                <th className="px-5 py-4 text-[9px] font-black uppercase tracking-wider text-slate-500 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-xs text-slate-450 italic">
                    No bug tickets logged.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 text-[10px] font-black text-slate-500">
                      {t.ticketId}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => navigate(`/tickets/${t._id}`)}
                        className="text-xs font-black text-slate-800 hover:text-[#5D5FEF] text-left border-0 bg-transparent cursor-pointer"
                      >
                        {t.title}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-700">
                      {t.project?.projectName}
                    </td>
                    <td className="px-5 py-3.5 text-[10px] text-slate-500 font-semibold">
                      {t.raisedBy?.name}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-700">
                      {t.assignedTo?.fullName || "Unassigned"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getSeverityColor(
                          t.severity
                        )}`}
                      >
                        {t.severity}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <span className="text-slate-600 font-semibold">{t.priority}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(
                          t.status
                        )}`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-700">
                      {new Date(t.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/tickets/${t._id}`)}
                          className="p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 text-slate-450 hover:text-slate-650 cursor-pointer"
                          title="View details"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(t._id)}
                            className="p-1.5 rounded-lg border border-rose-50 hover:bg-rose-50 text-slate-405 hover:text-rose-600 cursor-pointer"
                            title="Delete ticket"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-450 font-bold">
              Showing page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-[10px] font-bold cursor-pointer disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-[10px] font-bold cursor-pointer disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ticket Modal */}
      <TicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projects={projects}
        token={token}
        showToast={showToast}
        onSaveSuccess={() => {
          fetchTickets();
          fetchStats();
        }}
      />
    </div>
  );
}
