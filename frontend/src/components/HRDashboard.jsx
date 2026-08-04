import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserCheck,
  UserX,
  CheckSquare,
  Bug,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Timer,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const API_BASE = import.meta.env.VITE_BACKEND_URL;

export default function HRDashboard({ token, onNavigate }) {
  const navigate = useNavigate();

  const [empStats, setEmpStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const authHeaders = { Authorization: `Bearer ${token || localStorage.getItem("token")}` };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [empRes, taskRes, ticketRes, attRes] = await Promise.allSettled([
          fetch(`${API_BASE}/api/employees/dashboard`, { headers: authHeaders }),
          fetch(`${API_BASE}/api/tasks?limit=100`, { headers: authHeaders }),
          fetch(`${API_BASE}/api/tickets?limit=100`, { headers: authHeaders }),
          fetch(`${API_BASE}/api/attendance/list?limit=500`, { headers: authHeaders }),
        ]);

        if (empRes.status === "fulfilled" && empRes.value.ok) {
          setEmpStats(await empRes.value.json());
        }
        if (taskRes.status === "fulfilled" && taskRes.value.ok) {
          const d = await taskRes.value.json();
          setTasks(d.tasks || []);
        }
        if (ticketRes.status === "fulfilled" && ticketRes.value.ok) {
          const d = await ticketRes.value.json();
          setTickets(d.tickets || []);
        }
        if (attRes.status === "fulfilled" && attRes.value.ok) {
          const d = await attRes.value.json();
          // Handle both array and paginated object responses
          const records = Array.isArray(d)
            ? d
            : d.records || d.attendance || d.data || [];
          setAttendance(records);
        }
      } catch (err) {
        console.error("HR Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [token]);

  // ── Task calculations ──────────────────────────────────────────────────────
  const pendingTasks = tasks.filter((t) => t.status === "Pending");
  const inProgressTasks = tasks.filter((t) => t.status === "In Progress");
  const completedTasks = tasks.filter((t) => t.status === "Completed");
  const overdueTasks = tasks.filter(
    (t) => t.status !== "Completed" && new Date(t.dueDate) < new Date()
  );

  // ── Ticket calculations ────────────────────────────────────────────────────
  const openTickets = tickets.filter((t) => t.status === "Open");
  const assignedTickets = tickets.filter((t) => t.status === "Assigned");
  const resolvedTickets = tickets.filter((t) => t.status === "Resolved");
  const criticalTickets = tickets.filter((t) => t.severity === "Critical");

  // ── Charts ────────────────────────────────────────────────────────────────
  const taskPieData = [
    { name: "Pending", value: pendingTasks.length, color: "#F59E0B" },
    { name: "In Progress", value: inProgressTasks.length, color: "#6366F1" },
    { name: "Completed", value: completedTasks.length, color: "#10B981" },
  ].filter((d) => d.value > 0);

  const ticketPieData = [
    { name: "Open", value: openTickets.length, color: "#EF4444" },
    { name: "Assigned", value: assignedTickets.length, color: "#F59E0B" },
    { name: "Resolved", value: resolvedTickets.length, color: "#10B981" },
  ].filter((d) => d.value > 0);

  const deptData = (empStats?.departments || [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((d) => ({ name: d.department || "Other", count: d.count }));

  // Recent 5 tasks
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  // Recent 5 tickets
  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const statusBadge = (status, type = "task") => {
    const taskColors = {
      Pending: "bg-amber-50 text-amber-600",
      "In Progress": "bg-indigo-50 text-indigo-600",
      Completed: "bg-emerald-50 text-emerald-600",
    };
    const ticketColors = {
      Open: "bg-red-50 text-red-600",
      Assigned: "bg-amber-50 text-amber-600",
      "In Progress": "bg-indigo-50 text-indigo-600",
      Resolved: "bg-emerald-50 text-emerald-600",
      Closed: "bg-slate-100 text-slate-500",
      Reopened: "bg-rose-50 text-rose-600",
    };
    const colorMap = type === "task" ? taskColors : ticketColors;
    return (
      <span
        className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
          colorMap[status] || "bg-slate-100 text-slate-500"
        }`}
      >
        {status}
      </span>
    );
  };

  const severityBadge = (severity) => {
    const colors = {
      Critical: "bg-red-100 text-red-700",
      Major: "bg-orange-50 text-orange-600",
      Minor: "bg-slate-100 text-slate-500",
      Trivial: "bg-slate-50 text-slate-400",
    };
    return (
      <span
        className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
          colors[severity] || "bg-slate-100 text-slate-500"
        }`}
      >
        {severity}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-semibold">Loading HR Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans">

      {/* ── KPI Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Employees */}
        <div
          onClick={() => navigate("/employees")}
          className="p-5 bg-white border border-slate-100 rounded-2xl custom-shadow flex items-center justify-between transition-all hover:translate-y-[-2px] duration-300 cursor-pointer group"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Employees</p>
            <h4 className="text-2xl font-black text-slate-900 leading-tight">{empStats?.totalEmployees ?? "—"}</h4>
            <span className="text-[10px] font-bold mt-1 block text-emerald-500">
              {empStats?.activeEmployees ?? 0} active
            </span>
          </div>
          <div className="p-3 rounded-2xl shrink-0 bg-indigo-50 text-[#5D5FEF] group-hover:bg-indigo-100 transition-colors">
            <Users className="h-5 w-5" strokeWidth={2.5} />
          </div>
        </div>

        {/* Attendance */}
        <div
          onClick={() => navigate("/attendance")}
          className="p-5 bg-white border border-slate-100 rounded-2xl custom-shadow flex items-center justify-between transition-all hover:translate-y-[-2px] duration-300 cursor-pointer group"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Attendance Records</p>
            <h4 className="text-2xl font-black text-slate-900 leading-tight">{attendance.length}</h4>
            <span className="text-[10px] font-bold mt-1 block text-blue-500">All time logs</span>
          </div>
          <div className="p-3 rounded-2xl shrink-0 bg-blue-50 text-blue-500 group-hover:bg-blue-100 transition-colors">
            <Clock className="h-5 w-5" strokeWidth={2.5} />
          </div>
        </div>

        {/* Tasks */}
        <div
          onClick={() => navigate("/tasks")}
          className="p-5 bg-white border border-slate-100 rounded-2xl custom-shadow flex items-center justify-between transition-all hover:translate-y-[-2px] duration-300 cursor-pointer group"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Tasks</p>
            <h4 className="text-2xl font-black text-slate-900 leading-tight">{tasks.length}</h4>
            <span className="text-[10px] font-bold mt-1 block text-amber-500">
              {overdueTasks.length} overdue
            </span>
          </div>
          <div className="p-3 rounded-2xl shrink-0 bg-amber-50 text-amber-500 group-hover:bg-amber-100 transition-colors">
            <CheckSquare className="h-5 w-5" strokeWidth={2.5} />
          </div>
        </div>

        {/* Bug Tickets */}
        <div
          onClick={() => navigate("/tickets")}
          className="p-5 bg-white border border-slate-100 rounded-2xl custom-shadow flex items-center justify-between transition-all hover:translate-y-[-2px] duration-300 cursor-pointer group"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Bug Tickets</p>
            <h4 className="text-2xl font-black text-slate-900 leading-tight">{tickets.length}</h4>
            <span className="text-[10px] font-bold mt-1 block text-red-500">
              {criticalTickets.length} critical
            </span>
          </div>
          <div className="p-3 rounded-2xl shrink-0 bg-red-50 text-red-500 group-hover:bg-red-100 transition-colors">
            <Bug className="h-5 w-5" strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* ── Main Grid ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT — 8 cols */}
        <div className="lg:col-span-8 space-y-6">

          {/* Recent Tasks */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 leading-none">Recent Tasks</h3>
                <span className="text-[10px] font-semibold text-slate-400 mt-1 block">Latest assigned workspace tasks</span>
              </div>
              <button
                onClick={() => navigate("/tasks")}
                className="text-[10px] font-bold text-[#5D5FEF] hover:underline cursor-pointer"
              >
                All Tasks →
              </button>
            </div>

            {recentTasks.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs font-semibold">No tasks yet.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentTasks.map((task) => (
                  <div
                    key={task._id}
                    onClick={() => navigate(`/tasks/${task._id}`)}
                    className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/40 -mx-2 px-2 rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                        <CheckSquare className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{task.title}</h4>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5 truncate">
                          {task.assignedEmployee?.fullName || "Unassigned"} · Due{" "}
                          {new Date(task.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        task.priority === "High" ? "bg-red-50 text-red-600" :
                        task.priority === "Medium" ? "bg-amber-50 text-amber-600" :
                        "bg-slate-100 text-slate-500"
                      }`}>
                        {task.priority}
                      </span>
                      {statusBadge(task.status, "task")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Bug Tickets */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 leading-none">Recent Bug Tickets</h3>
                <span className="text-[10px] font-semibold text-slate-400 mt-1 block">Latest reported defects and issues</span>
              </div>
              <button
                onClick={() => navigate("/tickets")}
                className="text-[10px] font-bold text-[#5D5FEF] hover:underline cursor-pointer"
              >
                All Tickets →
              </button>
            </div>

            {recentTickets.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs font-semibold">No bug tickets yet.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentTickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    onClick={() => navigate(`/tickets/${ticket._id}`)}
                    className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/40 -mx-2 px-2 rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                        <Bug className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{ticket.title}</h4>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5 truncate">
                          {ticket.project?.projectName || "Unknown Project"} · Raised by {ticket.raisedBy?.name || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {severityBadge(ticket.severity)}
                      {statusBadge(ticket.status, "ticket")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — 4 cols */}
        <div className="lg:col-span-4 space-y-6">

          {/* Task Status Donut */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow">
            <h3 className="text-sm font-extrabold text-slate-900 mb-4">Task Status</h3>
            <div className="flex items-center gap-4 justify-center">
              <div className="relative h-24 w-24 shrink-0">
                {tasks.length === 0 ? (
                  <div className="w-full h-full rounded-full border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                    No Data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={40}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {taskPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "#0B0C24", borderRadius: "12px", border: "none", color: "#fff", fontSize: "9px", fontWeight: "bold" }}
                        itemStyle={{ color: "#fff" }}
                        formatter={(v) => [v, "Tasks"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center leading-none pointer-events-none">
                  <span className="text-xs font-black text-slate-900">{tasks.length}</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Total</span>
                </div>
              </div>
              <div className="space-y-2 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 block shrink-0" />
                  <span className="font-semibold text-slate-500 w-20">Pending</span>
                  <span className="font-bold text-slate-900">{pendingTasks.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 block shrink-0" />
                  <span className="font-semibold text-slate-500 w-20">In Progress</span>
                  <span className="font-bold text-slate-900">{inProgressTasks.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 block shrink-0" />
                  <span className="font-semibold text-slate-500 w-20">Completed</span>
                  <span className="font-bold text-slate-900">{completedTasks.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Status Donut */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow">
            <h3 className="text-sm font-extrabold text-slate-900 mb-4">Ticket Status</h3>
            <div className="flex items-center gap-4 justify-center">
              <div className="relative h-24 w-24 shrink-0">
                {tickets.length === 0 ? (
                  <div className="w-full h-full rounded-full border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                    No Data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ticketPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={40}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {ticketPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "#0B0C24", borderRadius: "12px", border: "none", color: "#fff", fontSize: "9px", fontWeight: "bold" }}
                        itemStyle={{ color: "#fff" }}
                        formatter={(v) => [v, "Tickets"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center leading-none pointer-events-none">
                  <span className="text-xs font-black text-slate-900">{tickets.length}</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Total</span>
                </div>
              </div>
              <div className="space-y-2 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 block shrink-0" />
                  <span className="font-semibold text-slate-500 w-16">Open</span>
                  <span className="font-bold text-slate-900">{openTickets.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 block shrink-0" />
                  <span className="font-semibold text-slate-500 w-16">Assigned</span>
                  <span className="font-bold text-slate-900">{assignedTickets.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 block shrink-0" />
                  <span className="font-semibold text-slate-500 w-16">Resolved</span>
                  <span className="font-bold text-slate-900">{resolvedTickets.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Employees by Department */}
          {deptData.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-slate-900">By Department</h3>
                <button
                  onClick={() => navigate("/employees")}
                  className="text-[10px] font-bold text-[#5D5FEF] hover:underline cursor-pointer"
                >
                  View All →
                </button>
              </div>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={12}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={8} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={8} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "#0B0C24", borderRadius: "12px", border: "none", color: "#fff", fontSize: "9px", fontWeight: "bold" }}
                      itemStyle={{ color: "#fff" }}
                      formatter={(v) => [v, "Employees"]}
                    />
                    <Bar dataKey="count" fill="#5D5FEF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Recent Joinees */}
          {empStats?.recentJoinees?.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-extrabold text-slate-900">Recent Joinees</h3>
                <button
                  onClick={() => navigate("/employees")}
                  className="text-[10px] font-bold text-[#5D5FEF] hover:underline cursor-pointer"
                >
                  Directory →
                </button>
              </div>
              <div className="space-y-2.5">
                {empStats.recentJoinees.map((emp) => (
                  <div key={emp._id} className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[10px] shrink-0 select-none">
                      {emp.fullName?.charAt(0) || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-slate-900 truncate">{emp.fullName}</p>
                      <p className="text-[9px] text-slate-400 font-semibold truncate">{emp.designation || emp.department || "—"}</p>
                    </div>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                      emp.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                    }`}>
                      {emp.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
