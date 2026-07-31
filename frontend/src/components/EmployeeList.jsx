import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Grid,
  List,
  Upload,
  Download,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Users,
  UserCheck,
  UserX,
  FileSpreadsheet,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import ConfirmDialog from "./ConfirmDialog";

const DEPARTMENTS = ["Engineering", "Product", "Design", "Marketing", "Sales", "HR", "Finance", "Operations"];
const DESIGNATIONS = [
  "Software Engineer",
  "Senior Software Engineer",
  "Tech Lead",
  "Product Manager",
  "UI/UX Designer",
  "Marketing Analyst",
  "HR Manager",
  "Financial Analyst",
  "Intern",
  "Director",
];

const COLORS = ["#5D5FEF", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#3B82F6", "#6B7280"];

export default function EmployeeList({
  token,
  currentUser,
  onViewEmployee,
  onAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
  showToast,
}) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    inactiveEmployees: 0,
    departments: [],
    recentJoinees: [],
  });

  // Controls & Filters State
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("name_asc");
  const [viewMode, setViewMode] = useState("table"); // 'table' or 'grid'

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  // Selection state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkActionConfirm, setBulkActionConfirm] = useState(null); // { action: 'Delete'|'Activate'|'Deactivate', ids: [...] }
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  // CSV Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        search,
        department,
        designation,
        status,
        sort,
        page,
        limit,
      });

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/employees?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok) {
        setEmployees(data.employees);
        setTotalPages(data.pages);
        setTotalItems(data.total);
      } else {
        showToast(data.message || "Failed to retrieve employee roster.", "error");
      }
    } catch (err) {
      showToast("Network error loading employee database.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/employees/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setStats(data);
      }
    } catch (err) {
      console.error("Error loading employee dashboard statistics:", err);
    }
  };

  // Reload employee list on filter/page/sort change
  useEffect(() => {
    fetchEmployees();
  }, [search, department, designation, status, sort, page]);

  // Load stats once
  useEffect(() => {
    fetchStats();
  }, []);

  const handleExportCSV = () => {
    showToast("Exporting employee database...", "info");
    window.open(`${import.meta.env.VITE_BACKEND_URL}/api/employees/export?token=${token}`, "_blank");
  };

  const handleImportCSVSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) return;

    setImporting(true);
    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/employees/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        showToast(data.message || "CSV imported successfully!", "success");
        setShowImportModal(false);
        setImportFile(null);
        fetchEmployees();
        fetchStats();
      } else {
        showToast(data.message || "Failed to import CSV.", "error");
      }
    } catch (err) {
      showToast("Network error importing CSV database.", "error");
    } finally {
      setImporting(false);
    }
  };

  // Selection Helpers
  const allPageSelected =
    employees.length > 0 && employees.every((emp) => selectedIds.has(emp._id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        employees.forEach((emp) => next.delete(emp._id));
      } else {
        employees.forEach((emp) => next.add(emp._id));
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

  // Bulk actions executor
  const executeBulkAction = async () => {
    if (!bulkActionConfirm) return;
    const { action, ids } = bulkActionConfirm;

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/employees/bulk`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, ids }),
      });

      const data = await response.json();
      if (response.ok) {
        showToast(data.message || `Bulk ${action} action executed successfully.`, "success");
        setSelectedIds(new Set());
        fetchEmployees();
        fetchStats();
      } else {
        showToast(data.message || "Failed to execute bulk action.", "error");
      }
    } catch (err) {
      showToast("Network error executing bulk updates.", "error");
    } finally {
      setBulkActionConfirm(null);
    }
  };

  const deleteSingleEmployee = async () => {
    if (!employeeToDelete) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/employees/${employeeToDelete._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        showToast(`Successfully deleted profile of ${employeeToDelete.fullName}.`, "success");
        fetchEmployees();
        fetchStats();
      } else {
        showToast(data.message || "Failed to delete employee.", "error");
      }
    } catch (err) {
      showToast("Network error deleting employee.", "error");
    } finally {
      setEmployeeToDelete(null);
    }
  };

  // Prepare chart data
  const pieData = useMemo(() => {
    return stats.departments.map((dept, idx) => ({
      name: dept.department,
      value: dept.count,
      color: COLORS[idx % COLORS.length],
    }));
  }, [stats.departments]);

  const isAdmin = currentUser?.role === "Admin";
  const canCreate = isAdmin || currentUser?.permissions?.includes("Create Employees");
  const canEdit = isAdmin || currentUser?.permissions?.includes("Edit Employees");
  const canDelete = isAdmin || currentUser?.permissions?.includes("Delete Employees");

  return (
    <div className="space-y-6 text-slate-800 select-none">
      {/* ─── Dashboard Stats & Chart Widgets ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-stretch">
        {/* Metric cards */}
        <div className="md:col-span-3 grid grid-cols-3 gap-6">
          <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4 relative overflow-hidden">
            <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-[#5D5FEF] flex items-center justify-center font-bold shadow-inner">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Employees</span>
              <h2 className="text-xl font-black text-slate-900 mt-1">{stats.totalEmployees}</h2>
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4 relative overflow-hidden">
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-inner">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Active</span>
              <h2 className="text-xl font-black text-slate-900 mt-1">{stats.activeEmployees}</h2>
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex items-center gap-4 relative overflow-hidden">
            <div className="h-10 w-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shadow-inner">
              <UserX className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Inactive</span>
              <h2 className="text-xl font-black text-slate-900 mt-1">{stats.inactiveEmployees}</h2>
            </div>
          </div>

          {/* Recent Joinees List inside stats */}
          <div className="col-span-3 bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
            <h3 className="text-[10px] font-black tracking-widest text-[#5D5FEF] uppercase mb-3">Recent Joinees</h3>
            {stats.recentJoinees.length === 0 ? (
              <p className="text-[11px] text-slate-400 font-semibold py-2">No new team members registered recently.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {stats.recentJoinees.slice(0, 4).map((joinee) => (
                  <div key={joinee.employeeId} className="flex items-center gap-3 p-2 bg-slate-50/50 rounded-2xl border border-slate-100">
                    <div className="h-8 w-8 rounded-xl bg-indigo-50 text-[#5D5FEF] flex items-center justify-center font-bold text-xs">
                      {joinee.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate leading-none">{joinee.fullName}</p>
                      <span className="text-[9px] text-slate-400 block mt-1 font-semibold truncate">
                        {joinee.designation} &bull; {joinee.department}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recharts Pie Chart widget */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between items-center text-center">
          <h3 className="text-[10px] font-black tracking-widest text-slate-400 uppercase self-start mb-2">Departments</h3>
          {pieData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[10px] text-slate-400 font-semibold">
              No department data
            </div>
          ) : (
            <>
              <div className="h-28 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={44} paddingAngle={2} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: "10px", borderRadius: "12px", border: "1px solid #f1f5f9" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Department Legend */}
              <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 mt-2 max-h-16 overflow-y-auto w-full">
                {pieData.slice(0, 4).map((d) => (
                  <span key={d.name} className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.name} ({d.value})
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── Control Bar: Filter, Sort, View, Export ─── */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left search */}
          <div className="relative w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email, employee ID..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 bg-slate-50/20 text-slate-900 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-[11px] font-bold text-slate-550 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Import CSV</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-[11px] font-bold text-slate-550 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export CSV</span>
                </button>
              </>
            )}

            {/* View Mode Toggle */}
            <div className="border border-slate-200 p-0.5 rounded-xl flex gap-0.5 bg-slate-50/40">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "table" ? "bg-white text-[#5D5FEF] shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-650"
                }`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "grid" ? "bg-white text-[#5D5FEF] shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-650"
                }`}
              >
                <Grid className="h-3.5 w-3.5" />
              </button>
            </div>

            {canCreate && (
              <button
                onClick={onAddEmployee}
                className="bg-[#5D5FEF] hover:bg-[#4d4fdf] active:bg-[#4345d2] text-white font-bold px-3.5 py-1.5 rounded-xl text-[11px] transition-all flex items-center gap-1 shadow-sm shadow-indigo-500/10 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Employee</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters & Sorting */}
        <div className="flex gap-4 flex-wrap pt-3 border-t border-slate-50 items-center">
          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-slate-800 text-xs bg-slate-50/20 focus:outline-none cursor-pointer"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={designation}
            onChange={(e) => {
              setDesignation(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-slate-800 text-xs bg-slate-50/20 focus:outline-none cursor-pointer"
          >
            <option value="">All Designations</option>
            {DESIGNATIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-slate-800 text-xs bg-slate-50/20 focus:outline-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-slate-800 text-xs bg-slate-50/20 focus:outline-none cursor-pointer ml-auto"
          >
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
            <option value="joining_desc">Joining Date (Newest)</option>
            <option value="joining_asc">Joining Date (Oldest)</option>
          </select>
        </div>
      </div>

      {/* ─── Bulk Action Bar ─── */}
      {selectedIds.size > 0 && isAdmin && (
        <div className="bg-[#5D5FEF]/10 border border-[#5D5FEF]/20 p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold text-[#5D5FEF] animate-fade-in">
          <span>{selectedIds.size} employees selected</span>
          <div className="flex gap-2">
            <button
              onClick={() => setBulkActionConfirm({ action: "Activate", ids: [...selectedIds] })}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 cursor-pointer transition-colors"
            >
              Activate
            </button>
            <button
              onClick={() => setBulkActionConfirm({ action: "Deactivate", ids: [...selectedIds] })}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl border border-amber-250 cursor-pointer transition-colors"
            >
              Deactivate
            </button>
            <button
              onClick={() => setBulkActionConfirm({ action: "Delete", ids: [...selectedIds] })}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-250 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── Employees Grid / Table Content ─── */}
      {loading && employees.length === 0 ? (
        <div className="w-full h-64 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-400 font-bold">Querying employees registry...</span>
          </div>
        </div>
      ) : employees.length === 0 ? (
        <div className="w-full h-64 bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col items-center justify-center text-center p-8">
          <Briefcase className="h-10 w-10 text-slate-300 mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No Employees Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">No profiles found matching selected filters or registered under this account.</p>
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-semibold text-slate-700">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  {isAdmin && (
                    <th className="py-4 px-5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-[#5D5FEF] border-slate-350 rounded focus:ring-0 focus:ring-offset-0 accent-[#5D5FEF]"
                      />
                    </th>
                  )}
                  <th className="py-4 px-5">Emp ID</th>
                  <th className="py-4 px-5">Employee Name</th>
                  <th className="py-4 px-5">Email & Phone</th>
                  <th className="py-4 px-5">Department</th>
                  <th className="py-4 px-5">Designation</th>
                  <th className="py-4 px-5">Manager</th>
                  <th className="py-4 px-5">Joining Date</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50/30 transition-colors">
                    {isAdmin && (
                      <td className="py-3.5 px-5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(emp._id)}
                          onChange={() => toggleRow(emp._id)}
                          className="h-4 w-4 text-[#5D5FEF] border-slate-350 rounded focus:ring-0 focus:ring-offset-0 accent-[#5D5FEF]"
                        />
                      </td>
                    )}
                    <td className="py-3.5 px-5 font-bold text-slate-500">{emp.employeeId}</td>
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-slate-900">{emp.fullName}</div>
                      <span className="text-[10px] font-medium text-slate-400 block mt-0.5">{emp.employmentType}</span>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-bold text-slate-800">{emp.companyEmail}</div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{emp.phoneNumber || "No Phone"}</div>
                    </td>
                    <td className="py-3.5 px-5 text-slate-600">{emp.department || "-"}</td>
                    <td className="py-3.5 px-5 text-slate-600">{emp.designation || "-"}</td>
                    <td className="py-3.5 px-5 text-slate-600">
                      {emp.reportingManager ? (
                        <div>
                          <div className="font-bold text-slate-800">{emp.reportingManager.fullName}</div>
                          <span className="text-[9px] text-slate-400 block font-semibold">{emp.reportingManager.employeeId}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-slate-600">
                      {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString("en-IN") : "-"}
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          emp.status === "Active"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : "bg-red-50 text-red-650 border border-red-150"
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewEmployee(emp._id)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg cursor-pointer transition-colors"
                          title="View Profile"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => onEditEmployee(emp)}
                            className="p-1.5 hover:bg-indigo-50 text-[#5D5FEF] rounded-lg cursor-pointer transition-colors"
                            title="Edit Profile"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setEmployeeToDelete(emp)}
                            className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg cursor-pointer transition-colors"
                            title="Delete Profile"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card grid view */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((emp) => (
            <div key={emp._id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-[#5D5FEF] flex items-center justify-center font-black shadow-inner">
                    {emp.fullName.charAt(0)}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-450 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                      {emp.employeeId}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider mt-1.5 ${
                        emp.status === "Active"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : "bg-red-50 text-red-650 border border-red-150"
                      }`}
                    >
                      {emp.status}
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <h4 className="text-xs font-bold text-slate-900 leading-tight">{emp.fullName}</h4>
                  <span className="text-[10px] text-[#5D5FEF] font-semibold block mt-0.5">{emp.designation} &bull; {emp.department}</span>
                </div>

                <div className="mt-4 space-y-1">
                  <p className="text-[10px] text-slate-500 font-semibold truncate">
                    <span className="text-slate-400 font-medium">Email: </span> {emp.companyEmail}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    <span className="text-slate-400 font-medium">Phone: </span> {emp.phoneNumber || "N/A"}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    <span className="text-slate-400 font-medium">Joined: </span> {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString("en-IN") : "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-4">
                <span className="text-[9px] text-slate-400 font-bold uppercase">{emp.employmentType}</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onViewEmployee(emp._id)}
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-650 rounded-xl border border-slate-200/50 cursor-pointer transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => onEditEmployee(emp)}
                      className="p-1.5 bg-indigo-50/50 hover:bg-indigo-55/15 text-[#5D5FEF] rounded-xl border border-indigo-100 cursor-pointer transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setEmployeeToDelete(emp)}
                      className="p-1.5 hover:bg-red-50 text-red-500 rounded-xl border border-transparent hover:border-red-100 cursor-pointer transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Pagination ─── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 bg-white/40 p-4 border border-slate-100/50 rounded-3xl">
          <span className="text-xs font-bold text-slate-450">
            Showing Page {page} of {totalPages} ({totalItems} total employees)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer transition-all ${
                  page === p ? "bg-[#5D5FEF] text-white" : "border border-slate-200 text-slate-555 hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk action confirmation dialog */}
      {bulkActionConfirm && (
        <ConfirmDialog
          isOpen={!!bulkActionConfirm}
          onClose={() => setBulkActionConfirm(null)}
          onConfirm={executeBulkAction}
          title={`Bulk ${bulkActionConfirm.action}`}
          message={`Are you sure you want to perform the bulk action '${bulkActionConfirm.action}' on ${bulkActionConfirm.ids.length} employees? This action cannot be undone.`}
          confirmText="Yes, Proceed"
        />
      )}

      {/* Single employee delete confirmation dialog */}
      {employeeToDelete && (
        <ConfirmDialog
          isOpen={!!employeeToDelete}
          onClose={() => setEmployeeToDelete(null)}
          onConfirm={deleteSingleEmployee}
          title="Delete Employee Profile"
          message={`Are you sure you want to delete the employee profile for ${employeeToDelete.fullName}? This will also delete ALL associated documents and details. This action is permanent.`}
          confirmText="Delete Profile"
        />
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-2xl max-w-sm w-full animate-fade-in text-slate-800">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900">Import Employee CSV</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleImportCSVSubmit} className="space-y-4 pt-4">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Upload CSV File
                </label>
                <label className="border border-dashed border-slate-200 hover:border-slate-350 rounded-2xl p-6 flex flex-col items-center justify-center hover:bg-slate-50/20 cursor-pointer text-slate-400 hover:text-slate-650 transition-all">
                  <FileSpreadsheet className="h-8 w-8 mb-2 text-[#5D5FEF]" />
                  <span className="text-xs font-bold text-slate-700">
                    {importFile ? importFile.name : "Select CSV Database"}
                  </span>
                  <span className="text-[9px] mt-0.5">CSV text file format up to 10MB</span>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => setImportFile(e.target.files[0])}
                  />
                </label>
              </div>

              {/* Instructions alert */}
              <div className="bg-indigo-50/50 border border-indigo-100 text-indigo-850 p-2.5 rounded-xl text-[9px] font-semibold leading-relaxed">
                <span className="font-bold block">CSV Format Guide:</span>
                Required columns: Full Name, Company Email, Joining Date (YYYY-MM-DD). Optional columns: Phone Number, Department, Designation, Employment Type, Personal Email, DOB, Gender, Blood Group, Emergency Contact, Address, Aadhaar Number, PAN Number, Passport Number.
              </div>

              <div className="flex justify-end gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-550 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing || !importFile}
                  className="px-3.5 py-1.5 bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white rounded-xl text-[10px] font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {importing ? "Importing..." : "Import Database"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
