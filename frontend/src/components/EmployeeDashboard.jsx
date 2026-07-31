import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Folder,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  User,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  FileText,
} from "lucide-react";

export default function EmployeeDashboard({ token, currentUser, onEditProfile }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignedProjects = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/projects`, {
          headers: {
            Authorization: `Bearer ${token || localStorage.getItem("token")}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
        }
      } catch (err) {
        console.error("Error fetching assigned projects:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedProjects();
  }, [token]);

  // Calculations
  const ongoingProjects = projects.filter((p) => p.status === "Ongoing");
  const completedProjects = projects.filter((p) => p.status === "Completed");

  const getMilestoneProgress = (project) => {
    if (!project.milestones || project.milestones.length === 0) return 0;
    const paid = project.milestones.filter((m) => m.status === "Paid").length;
    return Math.round((paid / project.milestones.length) * 100);
  };

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

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Projects */}
        <div className="p-5 bg-white border border-slate-100 rounded-2xl custom-shadow flex items-center justify-between transition-all hover:translate-y-[-2px] duration-300">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Assigned Projects</p>
            <h4 className="text-2xl font-black text-slate-900 leading-tight">{projects.length}</h4>
            <span className="text-[9px] font-bold text-slate-400 mt-1 block">Total client engagements</span>
          </div>
          <div className="p-3 rounded-2xl shrink-0 bg-indigo-50 text-[#5D5FEF]">
            <Folder className="h-5 w-5" strokeWidth={2.5} />
          </div>
        </div>

        {/* Active Projects */}
        <div className="p-5 bg-white border border-slate-100 rounded-2xl custom-shadow flex items-center justify-between transition-all hover:translate-y-[-2px] duration-300">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Active Projects</p>
            <h4 className="text-2xl font-black text-slate-900 leading-tight">{ongoingProjects.length}</h4>
            <span className="text-[9px] font-bold text-blue-500 mt-1 block">Current delivery focus</span>
          </div>
          <div className="p-3 rounded-2xl shrink-0 bg-blue-50 text-blue-500">
            <Clock className="h-5 w-5" strokeWidth={2.5} />
          </div>
        </div>

        {/* Completed Projects */}
        <div className="p-5 bg-white border border-slate-100 rounded-2xl custom-shadow flex items-center justify-between transition-all hover:translate-y-[-2px] duration-300">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Completed</p>
            <h4 className="text-2xl font-black text-slate-900 leading-tight">{completedProjects.length}</h4>
            <span className="text-[9px] font-bold text-emerald-500 mt-1 block">Successfully closed</span>
          </div>
          <div className="p-3 rounded-2xl shrink-0 bg-emerald-50 text-emerald-500">
            <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* Main Grid: Projects List */}
      <div className="bg-white rounded-3xl border border-slate-100 custom-shadow p-6 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">My Projects Directory</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            View milestones, clients, and timelines of projects assigned to you.
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400 font-semibold">Loading assigned projects...</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-slate-100 rounded-2xl flex flex-col items-center gap-2 text-slate-400">
            <Folder className="h-8 w-8 text-slate-300 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">No Projects Assigned</span>
            <p className="text-[10px] text-slate-400 max-w-xs leading-normal">
              You are not assigned to any projects at the moment. Contact your administrator if this is an error.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((proj) => {
              const progress = getMilestoneProgress(proj);
              return (
                <div
                  key={proj._id}
                  className="bg-white border border-slate-150 rounded-2xl p-5 flex flex-col justify-between shadow-sm select-none"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded">
                        {proj.projectId}
                      </span>
                      <span
                        className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                          proj.status === "Completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-blue-50 text-blue-700 border-blue-100"
                        }`}
                      >
                        {proj.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-slate-900 truncate">
                        {proj.projectName}
                      </h4>
                      <p className="text-[10px] text-slate-450 font-bold mt-1">
                        Client: <span className="text-slate-700">{proj.client?.companyName || "N/A"}</span>
                      </p>
                    </div>

                    {/* Milestones Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                        <span>Milestones progress</span>
                        <span className="text-indigo-600">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 mt-4 pt-3.5 text-[10px] text-slate-450 font-semibold">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Due {new Date(proj.expectedEndDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
