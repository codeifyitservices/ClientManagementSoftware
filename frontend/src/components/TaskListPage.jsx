import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ListTodo,
  Grid,
  List,
  Search,
  Plus,
  ArrowUpDown,
  Trash2,
  Edit2,
  Calendar,
  AlertTriangle,
  Folder,
  User,
  ExternalLink,
} from "lucide-react";
import TaskModal from "./TaskModal";

export default function TaskListPage({ token, currentUser, showToast }) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [totalTasksCount, setTotalTasksCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    onHold: 0,
    completed: 0,
    overdue: 0,
  });

  const [viewMode, setViewMode] = useState("kanban"); // 'kanban' | 'table'
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Filter and pagination states
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState("dueDate");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const isAdmin = currentUser?.role === "Admin";

  const fetchFiltersData = async () => {
    try {
      // Fetch projects
      const projRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const projData = await projRes.json();
      if (projRes.ok) {
        setProjects(projData.projects || projData || []);
      }

      // Fetch employees
      const empRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/employees?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const empData = await empRes.json();
      if (empRes.ok) {
        setEmployees(empData.employees || empData || []);
      }
    } catch (err) {
      console.error("Error loading filter lists:", err);
    }
  };

  const fetchTasks = async () => {
    try {
      const queryParams = new URLSearchParams({
        search,
        project: filterProject,
        assignedEmployee: filterEmployee,
        priority: filterPriority,
        status: filterStatus,
        page,
        limit: 10,
        sort: sortBy,
        order: sortOrder,
      });

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setTasks(data.tasks);
        setTotalTasksCount(data.total);
        setTotalPages(data.pages);
      }
    } catch (error) {
      showToast("Error loading tasks list.", "error");
    }
  };

  const fetchStats = async () => {
    try {
      // We can aggregate stats from all tasks fetched
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        const list = data.tasks || [];
        const now = new Date().getTime();

        const calculated = list.reduce(
          (acc, t) => {
            acc.total += 1;
            const statusKey = t.status.toLowerCase().replace(" ", "");
            if (statusKey === "pending") acc.pending += 1;
            if (statusKey === "inprogress") acc.inProgress += 1;
            if (statusKey === "onhold") acc.onHold += 1;
            if (statusKey === "completed") acc.completed += 1;

            const dueTime = new Date(t.dueDate).getTime();
            if (dueTime < now && t.status !== "Completed") {
              acc.overdue += 1;
            }
            return acc;
          },
          { total: 0, pending: 0, inProgress: 0, onHold: 0, completed: 0, overdue: 0 }
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
    fetchTasks();
    fetchStats();
  }, [search, filterProject, filterEmployee, filterPriority, filterStatus, sortBy, sortOrder, page]);

  const handleDelete = async (taskId) => {
    if (!window.confirm("Are you sure you want to permanently delete this task?")) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast("Task deleted successfully.", "success");
        fetchTasks();
        fetchStats();
      } else {
        const data = await res.json();
        showToast(data.message || "Failed to delete task.", "error");
      }
    } catch (err) {
      showToast("Network error deleting task.", "error");
    }
  };

  // Kanban Drag and Drop
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const taskObj = tasks.find((t) => t._id === taskId);

    if (!taskObj) return;

    const isAssigned = taskObj.assignedEmployee?._id === currentUser?._id || taskObj.assignedEmployee === currentUser?._id;
    if (!isAdmin && !isAssigned) {
      showToast("You can only update status for tasks assigned to you.", "error");
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: targetStatus }),
      });
      if (res.ok) {
        showToast(`Task status updated to "${targetStatus}".`, "success");
        fetchTasks();
        fetchStats();
      } else {
        const data = await res.json();
        showToast(data.message || "Failed to update task status.", "error");
      }
    } catch (err) {
      showToast("Network error updating status.", "error");
    }
  };

  const getPriorityColor = (prio) => {
    switch (prio) {
      case "Critical":
        return "bg-rose-50 text-rose-700 border-rose-100";
      case "High":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "Medium":
        return "bg-blue-50 text-blue-700 border-blue-100";
      default:
        return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "In Progress":
        return "bg-indigo-50 text-indigo-700 border-indigo-100";
      case "On Hold":
        return "bg-amber-50 text-amber-750 border-amber-150";
      default:
        return "bg-slate-50 text-slate-500 border-slate-100";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header section */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-lg font-black text-slate-800 tracking-wide uppercase flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-[#5D5FEF]" />
            <span>Task Management</span>
          </h1>
          <p className="text-[10px] text-slate-450 font-bold mt-0.5">
            Organize workspace tasks, set deadlines, and track milestones
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View switcher */}
          <div className="flex items-center gap-1 bg-slate-150 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-bold transition-all cursor-pointer ${
                viewMode === "kanban" ? "bg-white text-slate-800 shadow-xs" : "text-slate-450 hover:text-slate-700"
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg flex items-center gap-1.5 text-[10px] font-bold transition-all cursor-pointer ${
                viewMode === "table" ? "bg-white text-slate-800 shadow-xs" : "text-slate-450 hover:text-slate-700"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={() => {
                setSelectedTask(null);
                setIsModalOpen(true);
              }}
              className="px-4.5 py-2.5 bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border-0"
            >
              <Plus className="h-4 w-4" />
              <span>CREATE TASK</span>
            </button>
          )}
        </div>
      </div>

      {/* Dashboard widgets */}
      <div className="grid grid-cols-6 gap-4">
        {[
          { label: "Total Tasks", value: stats.total, color: "text-slate-800" },
          { label: "Pending", value: stats.pending, color: "text-slate-500" },
          { label: "In Progress", value: stats.inProgress, color: "text-indigo-650" },
          { label: "On Hold", value: stats.onHold, color: "text-amber-700" },
          { label: "Completed", value: stats.completed, color: "text-emerald-700" },
          { label: "Overdue", value: stats.overdue, color: "text-rose-700", warning: stats.overdue > 0 },
        ].map((item, idx) => (
          <div
            key={idx}
            className={`bg-white border p-4.5 rounded-3xl shadow-sm ${
              item.warning ? "border-rose-100 bg-rose-50/10" : "border-slate-100"
            }`}
          >
            <span className="text-[9px] font-black uppercase text-slate-450 tracking-wider">
              {item.label}
            </span>
            <div className={`text-xl font-black mt-2 ${item.color}`}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Filters Area */}
      <div className="bg-white border border-slate-100 rounded-3xl p-4.5 shadow-sm space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
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

          {/* Employee Filter (Admin only) */}
          {isAdmin ? (
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-205 text-slate-900 text-xs focus:outline-none cursor-pointer"
            >
              <option value="">All Assignees</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.fullName}
                </option>
              ))}
            </select>
          ) : (
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-150 text-slate-450 rounded-xl text-xs font-semibold select-none flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span>Only Assigned Tasks</span>
            </div>
          )}

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
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Kanban Layout View */}
      {viewMode === "kanban" ? (
        <div className="grid grid-cols-4 gap-4 items-start select-none">
          {["Pending", "In Progress", "On Hold", "Completed"].map((colStatus) => {
            const columnTasks = tasks.filter((t) => t.status === colStatus);

            return (
              <div
                key={colStatus}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, colStatus)}
                className="bg-slate-50 border border-slate-100 rounded-3xl p-4 min-h-[450px] flex flex-col space-y-3"
              >
                {/* Column header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    {colStatus}
                  </h4>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column task cards */}
                <div className="flex-1 overflow-y-auto space-y-3">
                  {columnTasks.length === 0 ? (
                    <div className="h-28 border border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-[10px] text-slate-400 italic">
                      Drag tasks here
                    </div>
                  ) : (
                    columnTasks.map((t) => {
                      const isOverdue = new Date(t.dueDate).getTime() < new Date().getTime() && t.status !== "Completed";

                      return (
                        <div
                          key={t._id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, t._id)}
                          className="bg-white border border-slate-150 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-grab active:cursor-grabbing space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded">
                              {t.taskId}
                            </span>
                            <span
                              className={`text-[8px] font-black uppercase border px-2 py-0.5 rounded ${getPriorityColor(
                                t.priority
                              )}`}
                            >
                              {t.priority}
                            </span>
                          </div>

                          <div>
                            <h5 className="text-xs font-black text-slate-900 truncate">
                              {t.title}
                            </h5>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Folder className="h-3 w-3 text-slate-400" />
                              <span className="text-[9px] text-slate-450 font-bold truncate">
                                {t.project?.projectName || "No Project"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-2">
                            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-450">
                              <Calendar className={`h-3 w-3 ${isOverdue ? "text-rose-500 animate-pulse" : "text-slate-400"}`} />
                              <span className={isOverdue ? "text-rose-600 font-extrabold" : ""}>
                                Due {new Date(t.dueDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}
                              </span>
                            </div>

                            <button
                              onClick={() => navigate(`/tasks/${t._id}`)}
                              className="text-[#5D5FEF] hover:text-[#4d4fdf] text-[9px] font-black uppercase flex items-center gap-0.5 border-0 bg-transparent cursor-pointer"
                            >
                              <span>View</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table Layout View */
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-4 text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Task ID
                  </th>
                  <th className="px-5 py-4 text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Title
                  </th>
                  <th className="px-5 py-4 text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Project
                  </th>
                  <th className="px-5 py-4 text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Assigned Employee
                  </th>
                  <th className="px-5 py-4 text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Assigned By
                  </th>
                  <th className="px-5 py-4 text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Priority
                  </th>
                  <th className="px-5 py-4 text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Due Date
                  </th>
                  <th className="px-5 py-4 text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-4 text-[9px] font-black uppercase tracking-wider text-slate-500 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-xs text-slate-450 italic">
                      No tasks found matching current filters.
                    </td>
                  </tr>
                ) : (
                  tasks.map((t) => (
                    <tr key={t._id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 text-[10px] font-black text-slate-500">
                        {t.taskId}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => navigate(`/tasks/${t._id}`)}
                          className="text-xs font-black text-slate-800 hover:text-[#5D5FEF] text-left border-0 bg-transparent cursor-pointer"
                        >
                          {t.title}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-700">
                        {t.project?.projectName}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-700">
                        {t.assignedEmployee?.fullName || "Unassigned"}
                      </td>
                      <td className="px-5 py-3.5 text-[10px] text-slate-500 font-semibold">
                        {t.assignedBy?.name} ({t.assignedBy?.role})
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getPriorityColor(
                            t.priority
                          )}`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-700">
                        {new Date(t.dueDate).toLocaleDateString("en-IN")}
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
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigate(`/tasks/${t._id}`)}
                            className="p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 text-slate-450 hover:text-slate-650 cursor-pointer"
                            title="View details"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedTask(t);
                                  setIsModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 text-slate-450 hover:text-slate-650 cursor-pointer"
                                title="Edit task"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(t._id)}
                                className="p-1.5 rounded-lg border border-rose-50 hover:bg-rose-50 text-slate-405 hover:text-rose-600 cursor-pointer"
                                title="Delete task"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
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
      )}

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        projects={projects}
        employees={employees}
        token={token}
        showToast={showToast}
        onSaveSuccess={() => {
          fetchTasks();
          fetchStats();
        }}
      />
    </div>
  );
}
