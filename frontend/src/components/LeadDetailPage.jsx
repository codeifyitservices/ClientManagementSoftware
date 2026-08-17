import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Edit, Trash2, Mail, Phone, Calendar, User, TrendingUp,
  Clock, Plus, ShieldAlert, Award, FileText, Download, Activity, AlertCircle, Save, Paperclip, X
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from "../utils/currencyUtils";

export default function LeadDetailPage({
  token,
  showToast,
  authenticatedFetch
}) {
  const navigate = useNavigate();
  const { id } = useParams();

  const [lead, setLead] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals & confirmation dialogs
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [stageToEdit, setStageToEdit] = useState(null); // if editing the latest stage
  const [stageToDelete, setStageToDelete] = useState(null);
  const [isDeletingStage, setIsDeletingStage] = useState(false);
  const [showDeleteLeadConfirm, setShowDeleteLeadConfirm] = useState(false);
  const [isDeletingLead, setIsDeletingLead] = useState(false);
  const [isSavingStage, setIsSavingStage] = useState(false);
  const [stageCurrency, setStageCurrency] = useState("INR (₹)");

  // Stage Form States
  const [stageName, setStageName] = useState("New Lead");
  const [customStageName, setCustomStageName] = useState("");
  const [stageDate, setStageDate] = useState(new Date().toISOString().split("T")[0]);
  const [stageStatus, setStageStatus] = useState("Pending");
  const [stageTemperature, setStageTemperature] = useState("Cold");
  const [stageProbability, setStageProbability] = useState(10);
  const [stageNextFollowUp, setStageNextFollowUp] = useState("");
  const [stageNotes, setStageNotes] = useState("");
  const [stageDealValue, setStageDealValue] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);

  const fetchLeadDetails = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/leads/${id}`, {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem("token")}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLead(data);
      } else {
        setError("Lead profile not found.");
      }
    } catch (err) {
      setError("Error loading lead profile details.");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/employees?limit=1000`, {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem("token")}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchLeadDetails();
    fetchEmployees();
  }, [id, token]);

  const handleOpenAddStage = () => {
    setStageToEdit(null);
    setStageName("New Lead");
    setCustomStageName("");
    setStageDate(new Date().toISOString().split("T")[0]);
    setStageStatus("Pending");
    setStageTemperature("Cold");
    setStageProbability(10);
    setStageNextFollowUp("");
    setStageNotes("");
    setStageDealValue("");
    setSelectedFiles([]);
    setIsStageModalOpen(true);
  };

  const handleOpenEditStage = (stageObj) => {
    setStageToEdit(stageObj);
    const standardStages = ["New Lead", "Contacted", "Qualified", "Discovery Call", "Demo Scheduled", "Proposal Sent", "Negotiation", "Contract Sent", "Won", "Lost"];
    if (standardStages.includes(stageObj.stage)) {
      setStageName(stageObj.stage);
      setCustomStageName("");
    } else {
      setStageName("Custom");
      setCustomStageName(stageObj.stage);
    }
    setStageDate(stageObj.date ? new Date(stageObj.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
    setStageStatus(stageObj.status || "Pending");
    setStageTemperature(stageObj.temperature || "Cold");
    setStageProbability(stageObj.probability || 0);
    
    // Format Date & Time Local for input (YYYY-MM-DDTHH:MM)
    if (stageObj.nextFollowUp) {
      const d = new Date(stageObj.nextFollowUp);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const date = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      setStageNextFollowUp(`${year}-${month}-${date}T${hours}:${mins}`);
    } else {
      setStageNextFollowUp("");
    }

    setStageNotes(stageObj.notes || "");
    setStageDealValue(stageObj.dealValue !== undefined && stageObj.dealValue !== null ? String(stageObj.dealValue) : "");
    setSelectedFiles([]);
    setIsStageModalOpen(true);
  };

  const handleStageSubmit = async (e) => {
    e.preventDefault();
    if (!stageNotes.trim()) {
      if (showToast) showToast("Notes / Reason is required.", "error");
      return;
    }

    const finalStageName = stageName === "Custom" ? customStageName.trim() : stageName;
    if (!finalStageName) {
      if (showToast) showToast("Stage Name is required.", "error");
      return;
    }

    setIsSavingStage(true);

    const formData = new FormData();
    formData.append("stage", finalStageName);
    formData.append("date", stageDate);
    formData.append("status", stageStatus);
    formData.append("temperature", stageTemperature);
    formData.append("probability", stageProbability);
    if (stageNextFollowUp) {
      formData.append("nextFollowUp", new Date(stageNextFollowUp).toISOString());
    } else {
      formData.append("nextFollowUp", "");
    }
    formData.append("notes", stageNotes);
    if (stageDealValue !== "") {
      formData.append("dealValue", stageDealValue);
    }
    formData.append("assignedEmployee", lead.assignedTo?._id || "");

    // Append attachments
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const url = stageToEdit
        ? `${import.meta.env.VITE_BACKEND_URL}/api/leads/${id}/journey/${stageToEdit._id}`
        : `${import.meta.env.VITE_BACKEND_URL}/api/leads/${id}/journey`;
      const method = stageToEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem("token")}`
        },
        body: formData
      });

      if (res.ok) {
        const updated = await res.json();
        setLead(updated);
        setIsStageModalOpen(false);
        if (showToast) showToast(stageToEdit ? "Journey stage updated." : "New stage update added.", "success");
      } else {
        const errorData = await res.json();
        if (showToast) showToast(errorData.message || "Failed to save journey stage.", "error");
      }
    } catch (err) {
      if (showToast) showToast("Error saving journey stage.", "error");
    } finally {
      setIsSavingStage(false);
    }
  };

  const handleStageDelete = async () => {
    if (!stageToDelete) return;
    setIsDeletingStage(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/leads/${id}/journey/${stageToDelete._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem("token")}`
        }
      });
      if (res.ok) {
        const updated = await res.json();
        setLead(updated);
        setStageToDelete(null);
        if (showToast) showToast("Journey stage deleted successfully.", "success");
      } else {
        const errData = await res.json();
        if (showToast) showToast(errData.message || "Failed to delete stage.", "error");
      }
    } catch (err) {
      if (showToast) showToast("Error deleting stage.", "error");
    } finally {
      setIsDeletingStage(false);
    }
  };

  const handleDeleteLeadConfirm = async () => {
    setIsDeletingLead(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/leads/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem("token")}`
        }
      });
      if (res.ok) {
        if (showToast) showToast("Lead deleted successfully.", "success");
        navigate("/leads");
      } else {
        if (showToast) showToast("Failed to delete lead.", "error");
      }
    } catch (err) {
      if (showToast) showToast("Error deleting lead.", "error");
    } finally {
      setIsDeletingLead(false);
      setShowDeleteLeadConfirm(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Pending": return "bg-blue-50 text-blue-700 border-blue-150";
      case "In Progress": return "bg-indigo-50 text-indigo-705 border-indigo-150";
      case "Completed": return "bg-emerald-50 text-emerald-700 border-emerald-150";
      case "On Hold": return "bg-amber-50 text-amber-700 border-amber-150";
      case "Cancelled": return "bg-red-50 text-red-700 border-red-150";
      default: return "bg-slate-50 text-slate-700 border-slate-150";
    }
  };

  const getTempBadgeClass = (temp) => {
    switch (temp) {
      case "Cold": return "bg-slate-100 text-slate-600 border-slate-200";
      case "Warm": return "bg-amber-50 text-amber-750 border-amber-200";
      case "Hot": return "bg-orange-50 text-orange-700 border-orange-200";
      case "Critical": return "bg-rose-50 text-rose-700 border-rose-200";
      case "Closing Soon": return "bg-emerald-50 text-emerald-700 border-emerald-250 animate-pulse";
      default: return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#5D5FEF] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-semibold">Loading details...</span>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="py-24 text-center text-rose-500 font-bold font-sans">
        {error || "Lead not found."}
      </div>
    );
  }

  // Timeline chronology: newest first
  const journeyTimeline = [...(lead.leadJourney || [])].reverse();
  const activitiesTimeline = [...(lead.activities || [])].reverse();

  // Summary Metrics from cached root state
  const currentStage = lead.currentStage || "New Lead";
  const currentStatus = lead.currentStatus || "Pending";
  const currentTemperature = lead.currentTemperature || "Cold";
  const currentProbability = lead.leadJourney?.[lead.leadJourney.length - 1]?.probability || 10;
  const currentNextFollowUp = lead.currentNextFollowUpDate;
  const assignedEmployeeName = lead.assignedTo?.fullName || "Unassigned AE";

  const todayStr = new Date().toISOString().split("T")[0];
  const isFollowUpOverdue = currentNextFollowUp &&
    new Date(currentNextFollowUp).toISOString().split("T")[0] <= todayStr &&
    currentStatus !== "Completed" && currentStatus !== "Cancelled" &&
    currentStage !== "Won" && currentStage !== "Lost";

  return (
    <div className="space-y-6 font-sans select-none animate-fade-in pb-12">
      {/* Header section with back button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/leads")}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-505 hover:bg-slate-50 transition-all cursor-pointer"
            title="Go to Leads List"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-tight">
              {lead.leadName}
            </h2>
            <p className="text-[10px] text-slate-450 font-semibold mt-1">
              {lead.companyName ? `${lead.companyName} • ` : ""}Lead Stage Journey Tracker
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 ml-11 sm:ml-0">
          <button
            type="button"
            onClick={() => navigate(`/leads/${id}/edit`)}
            className="px-4 py-2 rounded-xl text-slate-650 hover:bg-slate-50 border border-slate-200 text-xs font-bold transition-all cursor-pointer bg-white flex items-center gap-1.5"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Modify Details</span>
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteLeadConfirm(true)}
            className="bg-red-50 hover:bg-red-100 border border-red-100 text-red-650 font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Profile</span>
          </button>
        </div>
      </div>

      {/* ─── Current Lead Summary Card ─── */}
      <div className="bg-white border border-slate-100 p-6 rounded-2xl custom-shadow space-y-4">
        <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
          <Award className="h-4.5 w-4.5 text-[#5D5FEF]" />
          <span>Current Lead Status Summary</span>
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Current Stage</span>
            <p className="text-sm font-black text-slate-900">{currentStage}</p>
          </div>

          <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Process Status</span>
            <div>
              <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border mt-0.5 ${getStatusBadgeClass(currentStatus)}`}>
                {currentStatus}
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Temperature</span>
            <div>
              <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border mt-0.5 ${getTempBadgeClass(currentTemperature)}`}>
                {currentTemperature}
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Probability / AE Owner</span>
            <p className="text-xs font-extrabold text-slate-900 mt-0.5">
              {currentProbability}% • <span className="text-indigo-650">{assignedEmployeeName}</span>
            </p>
          </div>

          <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl space-y-1 relative overflow-hidden">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Next Follow-Up</span>
            <p className="text-xs font-extrabold text-slate-900 mt-0.5">
              {currentNextFollowUp ? new Date(currentNextFollowUp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "None scheduled"}
            </p>
            {isFollowUpOverdue && (
              <span className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-red-100 text-red-700 border border-red-200 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded animate-pulse">
                <ShieldAlert className="h-2 w-2" />
                <span>Overdue</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Journey Timeline & Action Left, History/Activity logs Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT / MAIN COLUMN: Lead Journey (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow space-y-6">
            
            {/* Header + Add Button */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-50">
              <h3 className="text-sm font-black text-slate-950 flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-[#5D5FEF]" />
                <span>Lead Journey</span>
              </h3>
              <button
                type="button"
                onClick={handleOpenAddStage}
                className="bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer shadow-md shadow-indigo-500/10"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Stage Update</span>
              </button>
            </div>

            {/* Journey Timeline */}
            <div className="relative border-l-2 border-slate-100 pl-6 ml-3 space-y-6 py-2">
              {journeyTimeline.map((item, idx) => {
                const isLatest = idx === 0;
                const dateStr = new Date(item.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                const nextFollowUpStr = item.nextFollowUp
                  ? new Date(item.nextFollowUp).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                  : "";
                const createdTime = new Date(item.createdAt).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

                return (
                  <div key={item._id || idx} className="relative animate-fade-in">
                    {/* Ring dot */}
                    <span className={`absolute -left-[32px] top-1.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center shrink-0 ${isLatest ? "border-[#5D5FEF]" : "border-slate-300"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isLatest ? "bg-[#5D5FEF]" : "bg-slate-350"}`} />
                    </span>

                    <div className={`p-5 rounded-2xl border transition-all ${isLatest ? "bg-slate-50/50 border-slate-200/80 shadow-xs" : "bg-white border-slate-100 opacity-80"}`}>
                      {/* Title + Action Panel */}
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <span>{item.stage}</span>
                            {isLatest && (
                              <span className="text-[9px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Latest Stage</span>
                            )}
                          </h4>
                          <span className="text-[9px] text-slate-450 font-bold block mt-1">
                            Logged on {dateStr} at {createdTime}
                          </span>
                        </div>

                        {/* Edit/Delete only on latest */}
                        {isLatest && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditStage(item)}
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-slate-200 bg-white cursor-pointer"
                              title="Modify Latest Stage"
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                            {lead.leadJourney.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setStageToDelete(item)}
                                className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-650 transition-colors border border-slate-200 bg-white cursor-pointer"
                                title="Delete Latest Stage"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Badges and probability row */}
                      <div className="flex flex-wrap items-center gap-2.5 mt-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadgeClass(item.status)}`}>
                          Status: {item.status}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getTempBadgeClass(item.temperature)}`}>
                          {item.temperature}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100/50 border border-slate-150 px-2 py-0.5 rounded">
                          Probability: {item.probability}%
                        </span>
                        {item.dealValue !== undefined && item.dealValue !== null && (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50/50 border border-indigo-100 px-2 py-0.5 rounded">
                            Value: ₹{item.dealValue.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>

                      {/* Notes / Reason */}
                      <div className="mt-4 text-xs font-semibold text-slate-750 whitespace-pre-wrap leading-relaxed select-text bg-white p-3 border border-slate-100 rounded-xl">
                        {item.notes}
                      </div>

                      {/* Footer Info: Next follow up, AE owner, and attachments count */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-450 font-bold">
                        <div className="flex items-center gap-3">
                          {nextFollowUpStr && (
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              <span>Next Contact: {nextFollowUpStr}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span>AE: {item.assignedEmployee?.fullName || assignedEmployeeName}</span>
                          </span>
                        </div>

                        {item.attachments && item.attachments.length > 0 && (
                          <span className="flex items-center gap-1.5 text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100/50 select-none">
                            <Paperclip className="h-3 w-3" />
                            <span>{item.attachments.length} attachment(s)</span>
                          </span>
                        )}
                      </div>

                      {/* Attachments Download Lists */}
                      {item.attachments && item.attachments.length > 0 && (
                        <div className="mt-3.5 pt-3.5 border-t border-dashed border-slate-100 space-y-1.5">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Attached files:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {item.attachments.map((file, fIdx) => (
                              <a
                                key={file._id || fIdx}
                                href={`${import.meta.env.VITE_BACKEND_URL}/uploads/${file.path}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between p-2 rounded-xl border border-slate-150 bg-white hover:bg-slate-50 transition-colors select-none text-slate-700 font-semibold"
                              >
                                <span className="truncate pr-4 flex items-center gap-1">
                                  <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span>{file.name}</span>
                                </span>
                                <Download className="h-3.5 w-3.5 text-[#5D5FEF] shrink-0" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Activity Timeline / Lead Profile */}
        <div className="lg:col-span-1 space-y-6">
          {/* Properties Summary card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow space-y-4">
            <h3 className="text-xs font-extrabold text-slate-900 border-b border-slate-50 pb-2 flex items-center gap-2">
              <User className="h-4.5 w-4.5 text-[#5D5FEF]" />
              <span>Contact Coordinates</span>
            </h3>

            <div className="space-y-3.5 text-xs text-slate-705 font-semibold">
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Contact Person</span>
                <span className="font-extrabold text-slate-900">{lead.leadName}</span>
              </div>
              {lead.companyName && (
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Company</span>
                  <span className="font-extrabold text-slate-900">{lead.companyName}</span>
                </div>
              )}
              {lead.email && (
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Email</span>
                  <span className="font-extrabold text-slate-900 flex items-center gap-1 select-text">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {lead.email}
                  </span>
                </div>
              )}
              {lead.phone && (
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Phone</span>
                  <span className="font-extrabold text-slate-900 flex items-center gap-1 select-text">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {lead.phone}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Prospective Value</span>
                <span className="font-extrabold text-slate-950">₹{(lead.value || 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Lead Source</span>
                <span className="font-extrabold text-slate-900">{lead.source}</span>
              </div>
            </div>

            {lead.notes && (
              <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl space-y-1 mt-4 text-[11px] font-medium leading-relaxed select-text">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-black block mb-0.5">Notes Overview</span>
                {lead.notes}
              </div>
            )}
          </div>

          {/* Activity Log Timeline */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow space-y-5">
            <h3 className="text-xs font-extrabold text-slate-900 border-b border-slate-50 pb-2 flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-[#5D5FEF]" />
              <span>Activity Timeline</span>
            </h3>

            <div className="relative border-l-2 border-slate-100 pl-4 ml-2.5 space-y-4 py-1">
              {activitiesTimeline.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                  No system logs recorded.
                </div>
              ) : (
                activitiesTimeline.map((act, aIdx) => (
                  <div key={act._id || aIdx} className="relative animate-fade-in">
                    <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-slate-350 border border-white" />
                    <div>
                      <p className="text-[11px] font-bold text-slate-900 leading-normal">{act.text}</p>
                      <span className="text-[9px] text-slate-450 font-bold mt-0.5 block">
                        {new Date(act.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ─── Add/Edit Stage Update Modal ─── */}
      {isStageModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setIsStageModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-extrabold text-slate-900">
                {stageToEdit ? "Modify Journey Stage Update" : "Record Journey Stage Update"}
              </h3>
              <button onClick={() => setIsStageModalOpen(false)} className="text-slate-400 hover:text-slate-655 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleStageSubmit} className="p-6 space-y-4 text-xs font-semibold text-slate-705 max-h-[75vh] overflow-y-auto">
              
              <div className="grid grid-cols-2 gap-4">
                {/* Stage dropdown */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-450 font-black mb-1">
                    Pipeline Stage *
                  </label>
                  <select
                    value={stageName}
                    onChange={(e) => setStageName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none bg-white focus:ring-1 focus:ring-indigo-500"
                  >
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
                    <option value="Custom">Custom...</option>
                  </select>
                </div>

                {/* Date Picker */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-455 font-black mb-1">
                    Stage Change Date *
                  </label>
                  <input
                    type="date"
                    value={stageDate}
                    onChange={(e) => setStageDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                {/* Custom Stage text input */}
                {stageName === "Custom" && (
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase tracking-wider text-slate-450 font-black mb-1">
                      Custom Stage Name *
                    </label>
                    <input
                      type="text"
                      value={customStageName}
                      onChange={(e) => setCustomStageName(e.target.value)}
                      placeholder="e.g. Scope Approval"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      required
                    />
                  </div>
                )}

                {/* Status Dropdown */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-450 font-black mb-1">
                    Process Status *
                  </label>
                  <select
                    value={stageStatus}
                    onChange={(e) => setStageStatus(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none bg-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Temperature Dropdown */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-450 font-black mb-1">
                    Lead Temperature *
                  </label>
                  <select
                    value={stageTemperature}
                    onChange={(e) => setStageTemperature(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none bg-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Cold">Cold</option>
                    <option value="Warm">Warm</option>
                    <option value="Hot">Hot</option>
                    <option value="Critical">Critical</option>
                    <option value="Closing Soon">Closing Soon</option>
                  </select>
                </div>

                {/* Probability Range Slider */}
                <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                      Closing Probability
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={stageProbability}
                      onChange={(e) => setStageProbability(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#5D5FEF]"
                    />
                  </div>
                  <span className="text-sm font-black text-slate-850 w-11 text-right shrink-0">{stageProbability}%</span>
                </div>

                {/* Next Follow Up (Optional Date & Time Picker) */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-450 font-black mb-1">
                    Next Follow-up Alert
                  </label>
                  <input
                    type="datetime-local"
                    value={stageNextFollowUp}
                    onChange={(e) => setStageNextFollowUp(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Deal Value (Optional updates) & Currency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 col-span-2">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-450 font-black mb-1">
                      Currency
                    </label>
                    <select
                      value={stageCurrency}
                      onChange={(e) => setStageCurrency(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none bg-white focus:ring-1 focus:ring-indigo-500"
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.label}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-slate-450 font-black mb-1">
                      Update Deal Value ({getCurrencySymbol(stageCurrency)})
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
                        {getCurrencySymbol(stageCurrency)}
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={stageDealValue}
                        onChange={(e) => setStageDealValue(e.target.value)}
                        placeholder={lead.value ? `Current: ${getCurrencySymbol(stageCurrency)}${lead.value}` : "e.g. 150000"}
                        className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes (MANDATORY) */}
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase tracking-wider text-slate-450 font-black mb-1">
                    Notes / Reason *
                  </label>
                  <textarea
                    value={stageNotes}
                    onChange={(e) => setStageNotes(e.target.value)}
                    rows="3"
                    required
                    placeholder="Describe details of interaction, reason for change, client requirements or objections..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                </div>

                {/* File Attachments */}
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase tracking-wider text-[#5D5FEF] font-black mb-1.5 flex items-center gap-1 cursor-pointer">
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>Upload Attachments (Optional)</span>
                  </label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.xlsx,image/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setSelectedFiles(files);
                    }}
                    className="block w-full text-xs text-slate-450 font-semibold file:mr-4 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-[11px] file:font-black file:bg-[#5D5FEF]/10 file:text-[#5D5FEF] hover:file:bg-[#5D5FEF]/15 file:cursor-pointer"
                  />
                  {selectedFiles.length > 0 && (
                    <div className="mt-2 text-[10px] text-slate-450 font-bold flex flex-wrap gap-2">
                      {selectedFiles.map((file, idx) => (
                        <span key={idx} className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {file.name} ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex justify-end gap-2.5 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsStageModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-705 hover:bg-slate-50 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingStage}
                  className="bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingStage ? "Saving..." : "Save Stage"}
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Stage Dialog */}
      <ConfirmDialog
        isOpen={!!stageToDelete}
        onClose={() => setStageToDelete(null)}
        onConfirm={handleStageDelete}
        title="Delete Journey Stage"
        message={`Are you sure you want to delete the ${stageToDelete?.stage} journey stage update? Previous historical stages will remain intact.`}
        confirmText="Delete Update"
        isDeleting={isDeletingStage}
      />

      {/* Delete Lead Profile dialog */}
      <ConfirmDialog
        isOpen={showDeleteLeadConfirm}
        onClose={() => setShowDeleteLeadConfirm(false)}
        onConfirm={handleDeleteLeadConfirm}
        title="Delete Lead Profile"
        message={`Are you sure you want to delete the prospective lead profile for ${lead.leadName}? This action is permanent and will delete all associated stage timeline history.`}
        confirmText="Delete Profile"
        isDeleting={isDeletingLead}
      />
    </div>
  );
}
