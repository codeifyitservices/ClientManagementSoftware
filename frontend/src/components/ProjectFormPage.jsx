import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  Folder,
  Plus,
  Trash2,
  Calendar,
  Layers,
  IndianRupee,
  Activity,
  CheckCircle,
  FileCheck2,
  Clock,
  Briefcase
} from "lucide-react";

export default function ProjectFormPage({
  token,
  clients = [],
}) {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEdit = !!id;

  const [projectName, setProjectName] = useState("");
  const [clientId, setClientId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [status, setStatus] = useState("Ongoing");
  const [milestones, setMilestones] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [services, setServices] = useState([]);

  // Fetch services list
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/services`, {
          headers: {
            Authorization: `Bearer ${token || localStorage.getItem("token")}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setServices(data);
        }
      } catch (err) {
        console.error("Error fetching services:", err);
      }
    };
    fetchServices();
  }, [token]);

  // Fetch project if editing and not passed via state
  useEffect(() => {
    const loadProject = async () => {
      const stateProject = location.state?.project;
      if (stateProject && stateProject._id === id) {
        populateForm(stateProject);
        setLoading(false);
        return;
      }

      if (isEdit) {
        try {
          const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/projects/${id}`, {
            headers: {
              Authorization: `Bearer ${token || localStorage.getItem("token")}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            populateForm(data);
          } else {
            setError("Failed to fetch project details.");
          }
        } catch (err) {
          setError("Error fetching project.");
        } finally {
          setLoading(false);
        }
      } else {
        // Clear fields for new project
        setProjectName("");
        setClientId("");
        setStartDate("");
        setExpectedEndDate("");
        setStatus("Ongoing");
        setMilestones([
          { name: "Advance Payment", service: "", amount: 0, dueDate: "", status: "Pending" },
        ]);
        setLoading(false);
      }
    };

    loadProject();
  }, [id, isEdit]);

  const populateForm = (projectData) => {
    setProjectName(projectData.projectName || "");
    setClientId(projectData.client?._id || projectData.client || "");
    setStartDate(
      projectData.startDate
        ? new Date(projectData.startDate).toISOString().split("T")[0]
        : ""
    );
    setExpectedEndDate(
      projectData.expectedEndDate
        ? new Date(projectData.expectedEndDate).toISOString().split("T")[0]
        : ""
    );
    setStatus(projectData.status || "Ongoing");
    setMilestones(
      projectData.milestones
        ? projectData.milestones.map((m) => ({
            ...m,
            dueDate: m.dueDate
              ? new Date(m.dueDate).toISOString().split("T")[0]
              : "",
          }))
        : []
    );
  };

  const handleAddMilestone = () => {
    setMilestones((prev) => [
      ...prev,
      { name: "", service: "", amount: 0, dueDate: "", status: "Pending" },
    ]);
  };

  const handleRemoveMilestone = (index) => {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMilestoneChange = (index, field, value) => {
    setMilestones((prev) =>
      prev.map((milestone, i) => {
        if (i !== index) return milestone;
        const updated = { ...milestone };
        if (field === "amount") {
          updated[field] = Number(value) || 0;
        } else {
          updated[field] = value;
        }
        return updated;
      })
    );
  };

  const handleFormSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");

    if (!projectName.trim()) {
      setError("Project Name is required.");
      return;
    }
    if (!clientId) {
      setError("Please select a client.");
      return;
    }
    if (!startDate) {
      setError("Start Date is required.");
      return;
    }
    if (!expectedEndDate) {
      setError("Expected End Date is required.");
      return;
    }

    if (milestones.length === 0) {
      setError("Please add at least one milestone.");
      return;
    }

    const invalidMilestone = milestones.some(
      (m) => !m.name.trim() || !m.service.trim() || m.amount <= 0 || !m.dueDate
    );

    if (invalidMilestone) {
      setError("Please fill out all milestone fields (name, service, positive amount, and due date).");
      return;
    }

    const payload = {
      projectName,
      client: clientId,
      startDate,
      expectedEndDate,
      status,
      milestones,
    };

    setIsSaving(true);
    const url = isEdit
      ? `${import.meta.env.VITE_BACKEND_URL}/api/projects/${id}`
      : `${import.meta.env.VITE_BACKEND_URL}/api/projects`;

    try {
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        navigate("/projects");
      } else {
        const errData = await res.json();
        setError(errData.message || "Failed to save project.");
      }
    } catch (err) {
      setError("Network error saving project.");
    } finally {
      setIsSaving(false);
    }
  };

  // Realtime calculated values
  const calcTotalValue = milestones.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  const calcReceived = milestones.filter(m => m.status === "Paid").reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  const calcOutstanding = calcTotalValue - calcReceived;
  const calcProgressPercent = calcTotalValue > 0 ? Math.round((calcReceived / calcTotalValue) * 100) : 0;

  if (loading) {
    return (
      <div className="py-20 text-center flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-semibold">Loading project details...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12 select-none">
      {/* Premium Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-950 flex items-center gap-1.5">
            <button
              onClick={() => navigate("/projects")}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>{isEdit ? "Modify Project Coordinates" : "Launch New Project"}</span>
          </h2>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5 ml-7">
            Set client properties, timelines, and configure step-by-step payment milestones.
          </p>
        </div>

        {/* Action buttons in header */}
        <div className="flex items-center gap-2.5 ml-7 sm:ml-0">
          <button
            type="button"
            onClick={() => navigate("/projects")}
            className="px-4 py-2 rounded-xl text-slate-650 hover:bg-slate-50 border border-slate-200 text-xs font-bold transition-all cursor-pointer bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleFormSubmit}
            disabled={isSaving}
            className="bg-[#5D5FEF] hover:bg-[#4d4fdf] active:bg-[#4345d2] text-white font-bold px-4.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-500/10 disabled:opacity-50"
          >
            {isSaving && (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>{isEdit ? "Save Changes" : "Create Project"}</span>
          </button>
        </div>
      </div>

      {/* Two Column Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Project Details (col-span-5) */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* Main info card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 pb-2.5 border-b border-slate-50 flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-indigo-600" />
              <span>Project Information</span>
            </h3>

            <div className="space-y-4">
              {/* Project Name */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                  placeholder="e.g. CRM Software Development"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white"
                />
              </div>

              {/* Select Client */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Client / Company <span className="text-red-500">*</span>
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white cursor-pointer"
                >
                  <option value="">Choose Client</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.companyName} ({c.clientName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Selector (If edit) */}
              {isEdit && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Project Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white cursor-pointer"
                  >
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              )}

              {/* Date pickers in grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white"
                    />
                    <Calendar className="absolute right-3 top-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Expected End <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={expectedEndDate}
                      onChange={(e) => setExpectedEndDate(e.target.value)}
                      required
                      className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white"
                    />
                    <Calendar className="absolute right-3 top-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Realtime calculations summary card (Premium UI feature) */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 custom-shadow space-y-4 border border-slate-950 relative overflow-hidden">
            {/* Background grid design */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(93,95,239,0.15),transparent_60%)] pointer-events-none" />

            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 pb-2 border-b border-white/10 flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-[#5D5FEF]" />
              <span>Realtime Financial Estimate</span>
            </h3>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Project Value</p>
                <p className="text-sm font-black mt-1">₹{calcTotalValue.toLocaleString("en-IN")}</p>
              </div>
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/15">
                <p className="text-[9px] font-bold uppercase text-emerald-450 tracking-wider">Paid</p>
                <p className="text-sm font-black text-emerald-400 mt-1">₹{calcReceived.toLocaleString("en-IN")}</p>
              </div>
              <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/15">
                <p className="text-[9px] font-bold uppercase text-rose-400 tracking-wider">Outstanding</p>
                <p className="text-sm font-black text-rose-450 mt-1">₹{calcOutstanding.toLocaleString("en-IN")}</p>
              </div>
            </div>

            {/* Billing progress */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-450">
                <span>Billing Progress</span>
                <span className="text-[#8e90ff]">{calcProgressPercent}% Billed</span>
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${calcProgressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Payment Milestones (col-span-7) */}
        <div className="col-span-12 lg:col-span-7 bg-white border border-slate-100 rounded-2xl p-6 custom-shadow space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-50">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-indigo-600" />
                <span>Payment Milestones / Installments</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                Break the total value down into steps (e.g. Design Approval, Phase 1, Final Delivery).
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddMilestone}
              className="bg-[#5D5FEF]/10 hover:bg-[#5D5FEF]/15 text-[#5D5FEF] font-bold px-3 py-1.5 rounded-xl text-[10px] transition-all flex items-center gap-1 cursor-pointer border border-[#5D5FEF]/10"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Milestone</span>
            </button>
          </div>

          {milestones.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-2xl text-xs text-slate-450 font-bold uppercase tracking-wider">
              No milestones defined. Click "Add Milestone" to start.
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {milestones.map((m, idx) => (
                <div
                  key={idx}
                  className="p-5 bg-slate-50/50 border border-slate-200/60 rounded-2xl space-y-4 relative overflow-hidden transition-all hover:border-slate-300"
                >
                  {/* Decorative Number Badge & Status (taking reference from circles in the details image) */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-[10px] font-bold text-slate-800">
                        Milestone Installment
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                        m.status === "Paid"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : m.status === "Invoiced"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                      }`}>
                        {m.status}
                      </span>
                      <button
                        type="button"
                        disabled={m.status === "Paid" || m.status === "Invoiced"}
                        onClick={() => handleRemoveMilestone(idx)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-650 border border-slate-200 bg-white disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-400 transition-colors cursor-pointer"
                        title="Delete Milestone"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Input Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Milestone Name */}
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Milestone Title / Name
                      </label>
                      <input
                        type="text"
                        value={m.name}
                        disabled={m.status === "Paid" || m.status === "Invoiced"}
                        onChange={(e) => handleMilestoneChange(idx, "name", e.target.value)}
                        placeholder="e.g. UI/UX Design Approval"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100"
                      />
                    </div>

                    {/* Expected Due Date */}
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Expected Due Date
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={m.dueDate}
                          disabled={m.status === "Paid" || m.status === "Invoiced"}
                          onChange={(e) => handleMilestoneChange(idx, "dueDate", e.target.value)}
                          className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100"
                        />
                        <Calendar className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Service select dropdown & custom input */}
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Billing Service Description
                      </label>
                      <select
                        value={services.some((s) => s.name === m.service) ? m.service : (m.service ? "Custom" : "")}
                        disabled={m.status === "Paid" || m.status === "Invoiced"}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "Custom") {
                            handleMilestoneChange(idx, "service", "");
                          } else {
                            handleMilestoneChange(idx, "service", val);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-65"
                      >
                        <option value="">-- Choose Service --</option>
                        {services.map((s) => (
                          <option key={s._id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                        <option value="Custom">Custom Service...</option>
                      </select>

                      {(!m.service || !services.some((s) => s.name === m.service)) && (
                        <input
                          type="text"
                          value={m.service}
                          disabled={m.status === "Paid" || m.status === "Invoiced"}
                          onChange={(e) => handleMilestoneChange(idx, "service", e.target.value)}
                          placeholder="Type custom service name..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100 mt-2"
                        />
                      )}
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Billing Amount (₹)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={m.amount || ""}
                          disabled={m.status === "Paid" || m.status === "Invoiced"}
                          onChange={(e) => handleMilestoneChange(idx, "amount", e.target.value)}
                          placeholder="e.g. 50000"
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100"
                        />
                        <IndianRupee className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-500 bg-red-50 p-4.5 rounded-xl border border-red-100 font-semibold max-w-4xl mx-auto">
          {error}
        </div>
      )}
    </div>
  );
}
