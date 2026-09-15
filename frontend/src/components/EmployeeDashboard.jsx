import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  ArrowRight,
  User,
  Mail,
  Briefcase,
  CheckSquare,
  Bug,
  ShieldCheck,
} from "lucide-react";

export default function EmployeeDashboard({ currentUser, onEditProfile }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 font-sans select-none animate-fade-in pb-12 text-slate-800">
      {/* Welcome Premium Header */}
      <div className="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 md:p-8 custom-shadow border border-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(93,95,239,0.18),transparent_60%)] pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4.5">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-[#5D5FEF] to-[#8082ff] flex items-center justify-center font-black text-xl text-white shadow-lg shadow-indigo-500/20 shrink-0">
              {currentUser?.fullName?.charAt(0) || "E"}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                Employee Workspace
              </span>
              <h1 className="text-xl md:text-2xl font-black tracking-tight mt-0.5">
                Welcome back, {currentUser?.fullName || "Team Member"}!
              </h1>
              <p className="text-xs text-slate-400 font-semibold mt-1 flex items-center gap-1.5 flex-wrap">
                <Briefcase className="h-3.5 w-3.5 text-slate-500" />
                <span>{currentUser?.designation || "Associate Engineer"} ({currentUser?.department || "General"})</span>
                <span className="text-slate-600">&bull;</span>
                <Mail className="h-3.5 w-3.5 text-slate-500" />
                <span>{currentUser?.email || currentUser?.companyEmail}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onEditProfile}
            className="px-4.5 py-2.5 bg-[#5D5FEF] hover:bg-[#4d4fdf] active:bg-[#4345d2] text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 self-start md:self-auto cursor-pointer shadow-md shadow-indigo-500/10"
          >
            <User className="h-3.5 w-3.5" />
            <span>Update My Details</span>
          </button>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance */}
        <div
          onClick={() => navigate("/attendance")}
          className="p-5 bg-white border border-slate-100 rounded-2xl custom-shadow flex flex-col justify-between transition-all hover:translate-y-[-2px] duration-300 cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Time & Presence</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-[#5D5FEF] group-hover:bg-[#5D5FEF] group-hover:text-white transition-colors">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900">Attendance Portal</h4>
            <p className="text-xs text-slate-400 mt-1">Check in, request WFH, manage breaks & view your session.</p>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-[#5D5FEF] mt-4 group-hover:translate-x-1 transition-transform">
            <span>Open Attendance</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Tasks */}
        <div
          onClick={() => navigate("/tasks")}
          className="p-5 bg-white border border-slate-100 rounded-2xl custom-shadow flex flex-col justify-between transition-all hover:translate-y-[-2px] duration-300 cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Work Items</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900">Assigned Tasks</h4>
            <p className="text-xs text-slate-400 mt-1">Track tasks, update progress status & add comments.</p>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-blue-600 mt-4 group-hover:translate-x-1 transition-transform">
            <span>View Tasks</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Bug Tickets */}
        <div
          onClick={() => navigate("/tickets")}
          className="p-5 bg-white border border-slate-100 rounded-2xl custom-shadow flex flex-col justify-between transition-all hover:translate-y-[-2px] duration-300 cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Quality & Bugs</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Bug className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900">Bug Tickets</h4>
            <p className="text-xs text-slate-400 mt-1">Submit tickets, view resolution states & collaborate.</p>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-amber-600 mt-4 group-hover:translate-x-1 transition-transform">
            <span>Open Tickets</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* My Profile */}
        <div
          onClick={() => navigate("/my-profile")}
          className="p-5 bg-white border border-slate-100 rounded-2xl custom-shadow flex flex-col justify-between transition-all hover:translate-y-[-2px] duration-300 cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Account</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900">My Profile</h4>
            <p className="text-xs text-slate-400 mt-1">View personal identity information & employment records.</p>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 mt-4 group-hover:translate-x-1 transition-transform">
            <span>View Profile</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
