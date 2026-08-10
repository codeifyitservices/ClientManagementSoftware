import React, { useState, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  Plus,
  Search,
  Calendar,
  IndianRupee,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  ExternalLink,
  Trash2,
  Edit,
  Eye,
  MoreVertical,
  ChevronRight,
  FileText,
  Trash
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "./ConfirmDialog";

export default function ProjectsPage({
  token,
  clients = [],
  invoices = [],
  onFetchInvoices,
}) {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [showActionDropdown, setShowActionDropdown] = useState(null);

  // Multiselect, Sorting, and Pagination states
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleteIds, setBulkDeleteIds] = useState(null);
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch projects from API
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const url = `${import.meta.env.VITE_BACKEND_URL}/api/projects`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem("token")}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        // Automatically select the first project if none is selected
        if (data.length > 0 && !selectedProject) {
          setSelectedProject(data[0]);
        } else if (selectedProject) {
          // Update the selected project with fresh data
          const updated = data.find((p) => p._id === selectedProject._id);
          if (updated) setSelectedProject(updated);
        }
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [token]);



  // Handle delete project
  const handleDeleteProject = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this project? This action is permanent.")) return;
    try {
      const url = `${import.meta.env.VITE_BACKEND_URL}/api/projects/${id}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem("token")}`,
        },
      });

      if (res.ok) {
        if (selectedProject && selectedProject._id === id) {
          setSelectedProject(null);
        }
        await fetchProjects();
      } else {
        alert("Failed to delete project.");
      }
    } catch (err) {
      console.error("Error deleting project:", err);
    }
  };

  // Handle Quick Invoice Generation from milestone
  const handleGenerateInvoice = (project, milestone) => {
    const isForeign = project.client?.isForeign === true;
    const isPersonal = milestone.isPersonal === true;
    const gstRate = (isForeign || isPersonal) ? 0 : 18;

    const isInclusive = milestone.isInclusive === true;
    let rate = milestone.amount;
    if (isInclusive && gstRate > 0) {
      rate = Math.round(milestone.amount / (1 + gstRate / 100));
    }

    // Generate draft state for InvoiceFormPage
    const draftInvoice = {
      client: project.client?._id || project.client,
      dueDate: milestone.dueDate ? new Date(milestone.dueDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      items: [
        {
          description: `${project.projectName} - Milestone: ${milestone.name} (${milestone.service})`,
          sacCode: "998314",
          qty: 1,
          rate: rate,
          amount: rate,
          gstRate: gstRate,
          isInclusive: isInclusive && gstRate > 0,
          originalAmount: milestone.amount,
        },
      ],
      projectId: project._id,
      milestoneId: milestone._id,
    };

    navigate("/invoices/create", { state: { draftInvoice } });
  };

  // Handle record payment directly for the invoice associated with milestone
  const handleRecordPayment = async (invoiceId) => {
    if (!invoiceId) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/invoices/${invoiceId}/mark-paid`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token || localStorage.getItem("token")}`,
          },
        }
      );
      if (res.ok) {
        await fetchProjects();
        if (onFetchInvoices) onFetchInvoices();
      } else {
        alert("Failed to update payment status.");
      }
    } catch (err) {
      console.error("Error recording payment:", err);
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

  const handleSelectAll = (pageItems) => {
    const pageIds = pageItems.map((item) => item._id);
    const allSelectedOnPage = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!bulkDeleteIds || bulkDeleteIds.length === 0) return;
    try {
      const url = `${import.meta.env.VITE_BACKEND_URL}/api/projects/bulk-delete`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ ids: bulkDeleteIds }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        setBulkDeleteIds(null);
        await fetchProjects();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to delete projects.");
      }
    } catch (err) {
      console.error("Error bulk deleting projects:", err);
    }
  };

  const requestSort = (field) => {
    let direction = "asc";
    if (sortField === field && sortDirection === "asc") {
      direction = "desc";
    }
    setSortField(field);
    setSortDirection(direction);
    setCurrentPage(1);
  };

  const getSortedProjects = (items) => {
    if (!sortField) return items;
    return [...items].sort((a, b) => {
      let valA = "";
      let valB = "";

      if (sortField === "status") {
        valA = a.status || "";
        valB = b.status || "";
      } else if (sortField === "client") {
        valA = a.client?.companyName || a.client?.clientName || "";
        valB = b.client?.companyName || b.client?.clientName || "";
      } else if (sortField === "startDate") {
        valA = a.startDate || "";
        valB = b.startDate || "";
      } else if (sortField === "projectId") {
        valA = a.projectId || "";
        valB = b.projectId || "";
      } else if (sortField === "projectName") {
        valA = a.projectName || "";
        valB = b.projectName || "";
      } else if (sortField === "value") {
        valA = getProjectFinancials(a).value;
        valB = getProjectFinancials(b).value;
      }

      if (typeof valA === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
    });
  };

  // Calculate statistics
  const totalProjectsCount = projects.length;
  const ongoingProjectsCount = projects.filter((p) => p.status === "Ongoing").length;
  const completedProjectsCount = projects.filter((p) => p.status === "Completed").length;

  let totalProjectsValue = 0;
  let totalOutstanding = 0;

  projects.forEach((proj) => {
    const val = proj.finalAmount !== undefined ? proj.finalAmount : (proj.milestones?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0);
    totalProjectsValue += val;
    proj.milestones?.forEach((m) => {
      if (m.status !== "Paid") {
        totalOutstanding += m.amount || 0;
      }
    });
  });

  // Calculate values for individual project helper
  const getProjectFinancials = (proj) => {
    if (!proj) return { value: 0, received: 0, pending: 0, invoicesCount: 0, percent: 0 };
    const value = proj.finalAmount !== undefined ? proj.finalAmount : (proj.milestones?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0);
    let received = 0;
    let pending = 0;
    let invoicesCount = 0;

    proj.milestones?.forEach((m) => {
      if (m.status === "Paid") {
        received += m.amount || 0;
      } else {
        pending += m.amount || 0;
      }
      if (m.invoice) invoicesCount++;
    });

    const percent = value > 0 ? Math.round((received / value) * 100) : 0;
    return { value, received, pending, invoicesCount, percent };
  };

  const currentFinancials = getProjectFinancials(selectedProject);

  // Filter projects by search
  const filteredProjects = projects.filter((p) => {
    const term = searchQuery.toLowerCase();
    const clientName = p.client?.clientName?.toLowerCase() || "";
    const companyName = p.client?.companyName?.toLowerCase() || "";
    return (
      p.projectId?.toLowerCase().includes(term) ||
      p.projectName?.toLowerCase().includes(term) ||
      clientName.includes(term) ||
      companyName.includes(term)
    );
  });

  // Sort projects
  const sortedProjects = getSortedProjects(filteredProjects);

  // Paginate projects
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedProjects.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedProjects.length / itemsPerPage);
  const selectedCount = selectedIds.size;

  const getStatusBadgeClass = (status) => {
    if (status === "Completed") return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    if (status === "Ongoing") return "bg-blue-50 text-blue-700 border border-blue-100";
    return "bg-slate-55 text-slate-700 border border-slate-100";
  };

  const getMilestoneStatusClass = (status) => {
    if (status === "Paid") return "bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100";
    if (status === "Invoiced") return "bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100";
    return "bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-100";
  };

  // Find invoices associated with selected project
  const projectInvoices = selectedProject
    ? invoices.filter((inv) =>
        selectedProject.milestones?.some((m) => m.invoice?._id === inv._id || m.invoice === inv._id)
      )
    : [];

  return (
    <>
      <div className="space-y-6 font-sans select-none animate-fade-in pb-12">
      {/* 1. Header Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Projects */}
        <div className="p-5 bg-white border border-slate-100 rounded-2xl custom-shadow flex items-center justify-between transition-all hover:translate-y-[-2px] duration-300">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Projects</p>
            <h4 className="text-2xl font-black text-slate-900 leading-tight">{totalProjectsCount}</h4>
            <span className="text-[10px] font-bold text-slate-400 mt-1 block">In all categories</span>
          </div>
          <div className="p-3 rounded-2xl shrink-0 bg-indigo-50 text-[#5D5FEF]">
            <Folder className="h-5 w-5" strokeWidth={2.5} />
          </div>
        </div>

        {/* Ongoing Projects */}
        <div className="p-5 bg-white border border-slate-100 rounded-2xl custom-shadow flex items-center justify-between transition-all hover:translate-y-[-2px] duration-300">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Ongoing Projects</p>
            <h4 className="text-2xl font-black text-slate-900 leading-tight">{ongoingProjectsCount}</h4>
            <span className="text-[10px] font-bold text-blue-500 mt-1 block">Active engagement</span>
          </div>
          <div className="p-3 rounded-2xl shrink-0 bg-blue-50 text-blue-500">
            <Clock className="h-5 w-5" strokeWidth={2.5} />
          </div>
        </div>

        {/* Completed Projects */}
        <div className="p-5 bg-white border border-slate-100 rounded-2xl custom-shadow flex items-center justify-between transition-all hover:translate-y-[-2px] duration-300">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Completed Projects</p>
            <h4 className="text-2xl font-black text-slate-900 leading-tight">{completedProjectsCount}</h4>
            <span className="text-[10px] font-bold text-emerald-500 mt-1 block">Successfully delivered</span>
          </div>
          <div className="p-3 rounded-2xl shrink-0 bg-emerald-50 text-emerald-500">
            <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
          </div>
        </div>

        {/* Total Project Value */}
        <div className="p-5 bg-white border border-slate-100 rounded-2xl custom-shadow flex items-center justify-between transition-all hover:translate-y-[-2px] duration-300">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Project Value</p>
            <h4 className="text-2xl font-black text-slate-900 leading-tight">
              ₹{totalProjectsValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </h4>
            <span className="text-[10px] font-bold text-slate-400 mt-1 block">All project milestones</span>
          </div>
          <div className="p-3 rounded-2xl shrink-0 bg-violet-50 text-violet-600">
            <IndianRupee className="h-5 w-5" strokeWidth={2.5} />
          </div>
        </div>

        {/* Outstanding Amount */}
        <div className="p-5 bg-white border border-slate-100 rounded-2xl custom-shadow flex items-center justify-between transition-all hover:translate-y-[-2px] duration-300">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Outstanding Amount</p>
            <h4 className="text-2xl font-black text-slate-900 leading-tight text-rose-600">
              ₹{totalOutstanding.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </h4>
            <span className="text-[10px] font-bold text-rose-500 mt-1 block">Remaining to be collected</span>
          </div>
          <div className="p-3 rounded-2xl shrink-0 bg-rose-50 text-rose-500">
            <TrendingUp className="h-5 w-5" strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* 2. Layout Wrapper */}
      <div className="bg-white rounded-2xl border border-slate-100 custom-shadow p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Projects Directory</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Track status, milestones, values, and outstanding payments.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/projects/create")}
                className="bg-[#5D5FEF] hover:bg-[#4d4fdf] active:bg-[#4345d2] text-white font-bold px-3.5 py-2.5 rounded-xl text-xs transition-all flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Project</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search project ID, client, or name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/10 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-colors"
            />
          </div>

          {loading ? (
            <div className="py-20 text-center flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400 font-semibold">Loading projects...</span>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-slate-100 rounded-2xl flex flex-col items-center gap-2 text-slate-400">
              <FolderOpen className="h-8 w-8 text-slate-300" />
              <span className="text-xs font-bold uppercase tracking-wider">No Projects Found</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="pb-3 pl-3 w-8">
                      <input
                        type="checkbox"
                        checked={currentItems.length > 0 && currentItems.every((item) => selectedIds.has(item._id))}
                        onChange={() => handleSelectAll(currentItems)}
                        className="h-3.5 w-3.5 rounded border-slate-350 text-[#5D5FEF] focus:ring-[#5D5FEF] cursor-pointer"
                      />
                    </th>
                    <th className="pb-3 cursor-pointer select-none" onClick={() => requestSort("projectId")}>
                      Project ID {sortField === "projectId" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                    </th>
                    <th className="pb-3 cursor-pointer select-none" onClick={() => requestSort("projectName")}>
                      Project Name {sortField === "projectName" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                    </th>
                    <th className="pb-3 cursor-pointer select-none" onClick={() => requestSort("client")}>
                      Client {sortField === "client" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                    </th>
                    <th className="pb-3 cursor-pointer select-none" onClick={() => requestSort("startDate")}>
                      Start Date {sortField === "startDate" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                    </th>
                    <th className="pb-3 text-right cursor-pointer select-none" onClick={() => requestSort("value")}>
                      Value {sortField === "value" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                    </th>
                    <th className="pb-3 text-right">Received</th>
                    <th className="pb-3 text-right">Pending</th>
                    <th className="pb-3 text-center cursor-pointer select-none" onClick={() => requestSort("status")}>
                      Status {sortField === "status" ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                    </th>
                    <th className="pb-3 text-center pr-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {currentItems.map((proj) => {
                    const financials = getProjectFinancials(proj);
                    return (
                      <tr
                        key={proj._id}
                        onClick={() => navigate(`/projects/${proj._id}`)}
                        className="hover:bg-slate-50/50 cursor-pointer transition-colors text-xs font-semibold text-slate-700"
                      >
                        <td className="py-3.5 pl-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(proj._id)}
                            onChange={() => handleSelectRow(proj._id)}
                            className="h-3.5 w-3.5 rounded border-slate-350 text-[#5D5FEF] focus:ring-[#5D5FEF] cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 font-bold text-[#5D5FEF]">{proj.projectId}</td>
                        <td className="py-3.5 max-w-[150px] truncate" title={proj.projectName}>
                          {proj.projectName}
                        </td>
                        <td className="py-3.5 max-w-[150px] truncate" title={proj.client?.companyName}>
                          {proj.client?.companyName || "N/A"}
                        </td>
                        <td className="py-3.5 text-slate-500">
                          {proj.startDate ? new Date(proj.startDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A"}
                        </td>
                        <td className="py-3.5 text-right text-slate-900">
                          ₹{financials.value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3.5 text-right text-emerald-600">
                          ₹{financials.received.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3.5 text-right text-rose-500">
                          ₹{financials.pending.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getStatusBadgeClass(proj.status)}`}>
                            {proj.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-center pr-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => navigate(`/projects/${proj._id}`)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#5D5FEF] cursor-pointer transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" strokeWidth={2.2} />
                            </button>
                            <button
                              onClick={() => navigate(`/projects/${proj._id}/edit`, { state: { project: proj } })}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors"
                              title="Edit Project"
                            >
                              <Edit className="h-4 w-4" strokeWidth={2.2} />
                            </button>
                            <button
                              onClick={(e) => handleDeleteProject(proj._id, e)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 cursor-pointer transition-colors"
                              title="Delete Project"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={2.2} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 mt-4 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-slate-400">
                    Showing <span className="text-slate-700">{indexOfFirstItem + 1}</span> to{" "}
                    <span className="text-slate-700">
                      {Math.min(indexOfLastItem, sortedProjects.length)}
                    </span>{" "}
                    of <span className="text-slate-700">{sortedProjects.length}</span> projects
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer"
                    >
                      Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-colors cursor-pointer ${
                          currentPage === page
                            ? "bg-[#5D5FEF] text-white"
                            : "border border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom padding so content isn't hidden behind bar when open */}
        {selectedCount > 0 && <div className="h-20" />}
      </div>

      {/* ── Bulk Actions Floating Footer ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-red-600/95 backdrop-blur-md shadow-2xl border-t border-red-500 transition-transform duration-300 ease-in-out ${
          selectedCount > 0 ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <span className="text-white font-medium text-sm">
          <span className="font-bold">{selectedCount}</span>{" "}
          {selectedCount === 1 ? "project" : "projects"} selected
        </span>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-4 py-2 rounded-lg border border-red-300/40 text-red-100 text-sm font-medium hover:bg-red-500/50 transition-colors cursor-pointer"
          >
            Clear selection
          </button>
          <button
            onClick={() => setBulkDeleteIds(Array.from(selectedIds))}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-white text-red-650 text-sm font-semibold hover:bg-red-55 transition-colors shadow-md cursor-pointer"
          >
            <Trash size={15} />
            Delete Selected ({selectedCount})
          </button>
        </div>
      </div>

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!bulkDeleteIds}
        onClose={() => setBulkDeleteIds(null)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Projects"
        message={`Are you sure you want to delete ${bulkDeleteIds?.length || 0} selected project(s)? This action is permanent and cannot be undone.`}
        confirmText="Delete Projects"
      />
    </>
  );
}
