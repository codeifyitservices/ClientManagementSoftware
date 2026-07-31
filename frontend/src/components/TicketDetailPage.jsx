import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Bug,
  ChevronLeft,
  Calendar,
  User,
  Folder,
  AlertTriangle,
  History,
  MessageSquare,
  Paperclip,
  Download,
  Send,
  Upload,
  FileText,
} from "lucide-react";

export default function TicketDetailPage({ token, currentUser, showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);

  // Form states
  const [assigneeId, setAssigneeId] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentFiles, setCommentFiles] = useState([]);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const isAdmin = currentUser?.role === "Admin";

  const fetchTicketDetails = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setTicket(data);
        setAssigneeId(data.assignedTo?._id || "");
      } else {
        showToast(data.message || "Failed to load ticket details.", "error");
        navigate("/tickets");
      }
    } catch (err) {
      showToast("Network error loading ticket details.", "error");
      navigate("/tickets");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeesList = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/employees?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setEmployees(data.employees || data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTicketDetails();
    if (isAdmin) {
      fetchEmployeesList();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-8 h-8 border-4 border-[#5D5FEF] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-450">Loading ticket details...</span>
      </div>
    );
  }

  if (!ticket) return null;

  const isAssigned = ticket.assignedTo?._id === currentUser?._id;
  const isReporter = ticket.raisedBy?.id === currentUser?._id;

  const handleAssign = async (empId) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tickets/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assignedTo: empId || null }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Ticket assignment updated.", "success");
        setTicket(data);
        setAssigneeId(empId);
      } else {
        showToast(data.message || "Failed to assign ticket.", "error");
      }
    } catch (err) {
      showToast("Network error updating assignment.", "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tickets/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Ticket status changed to "${newStatus}".`, "success");
        setTicket(data);
      } else {
        showToast(data.message || "Failed to update status.", "error");
      }
    } catch (err) {
      showToast("Network error updating status.", "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() && commentFiles.length === 0) return;

    setIsSubmittingComment(true);
    try {
      const formData = new FormData();
      formData.append("content", commentText);
      commentFiles.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tickets/${id}/comments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Comment posted.", "success");
        setTicket(data);
        setCommentText("");
        setCommentFiles([]);
      } else {
        showToast(data.message || "Failed to post comment.", "error");
      }
    } catch (err) {
      showToast("Network error posting comment.", "error");
    } finally {
      setIsSubmittingComment(false);
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
        return "bg-slate-150 text-slate-500 border-slate-200";
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
      {/* Back & Title */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/tickets")}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-450 hover:text-slate-700 cursor-pointer transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded">
                {ticket.ticketId}
              </span>
              <span className={`text-[8px] font-black border px-2 py-0.5 rounded ${getSeverityColor(ticket.severity)}`}>
                {ticket.severity} Severity
              </span>
              <span className={`text-[8px] font-black border px-2 py-0.5 rounded ${getStatusColor(ticket.status)}`}>
                {ticket.status}
              </span>
            </div>
            <h1 className="text-base font-black text-slate-800 tracking-wide mt-1">
              {ticket.title}
            </h1>
          </div>
        </div>

        {/* Workflow actions */}
        <div className="flex items-center gap-3">
          {/* Admin Ticket assignment */}
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black text-slate-450 uppercase">Assignee:</span>
              <select
                value={assigneeId}
                onChange={(e) => handleAssign(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-205 text-slate-900 text-xs font-bold rounded-xl focus:outline-none cursor-pointer"
              >
                <option value="">Unassigned</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Workflow Transitions */}
          <div className="flex items-center gap-1.5">
            {/* Developer In-Progress */}
            {isAssigned && ticket.status === "Assigned" && (
              <button
                onClick={() => handleStatusChange("In Progress")}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-xl transition-all cursor-pointer border border-indigo-100"
              >
                Start Progress
              </button>
            )}

            {/* Developer Resolve */}
            {isAssigned && ["Assigned", "In Progress"].includes(ticket.status) && (
              <button
                onClick={() => handleStatusChange("Resolved")}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-xl transition-all cursor-pointer border border-emerald-100"
              >
                Resolve Ticket
              </button>
            )}

            {/* Admin Close Ticket */}
            {isAdmin && ticket.status !== "Closed" && (
              <button
                onClick={() => handleStatusChange("Closed")}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-xl transition-all cursor-pointer border border-slate-200"
              >
                Close Ticket
              </button>
            )}

            {/* Reporter/Admin Reopen closed ticket */}
            {(isAdmin || isReporter) && ticket.status === "Closed" && (
              <button
                onClick={() => handleStatusChange("Reopened")}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded-xl transition-all cursor-pointer border border-rose-100"
              >
                Reopen Ticket
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid structure */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Side details */}
        <div className="col-span-2 space-y-6">
          {/* Top metadata summaries */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm grid grid-cols-4 gap-4">
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wide block">
                Project
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-850 font-bold">
                <Folder className="h-4 w-4 text-[#5D5FEF]" />
                <span className="truncate">{ticket.project?.projectName}</span>
              </div>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wide block">
                Raised By
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-850 font-bold">
                <User className="h-4 w-4 text-[#5D5FEF]" />
                <span className="truncate">{ticket.raisedBy?.name}</span>
              </div>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wide block">
                Assigned To
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-850 font-bold">
                <User className="h-4 w-4 text-[#5D5FEF]" />
                <span className="truncate">{ticket.assignedTo?.fullName || "Unassigned"}</span>
              </div>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wide block">
                Created Date
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-850 font-bold">
                <Calendar className="h-4 w-4 text-[#5D5FEF]" />
                <span>{new Date(ticket.createdAt).toLocaleDateString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-3.5">
            <h3 className="text-xs font-black tracking-widest text-[#5D5FEF] uppercase">
              Bug Description
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed font-semibold bg-slate-50/20 p-4 border border-slate-100 rounded-2xl whitespace-pre-wrap">
              {ticket.description || "No description provided."}
            </p>
          </div>

          {/* Reproducing steps */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4 grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <h3 className="text-xs font-black tracking-widest text-[#5D5FEF] uppercase mb-2">
                Steps to Reproduce
              </h3>
              <p className="text-xs text-slate-750 font-semibold bg-slate-50/20 p-4 border border-slate-100 rounded-2xl whitespace-pre-wrap leading-relaxed">
                {ticket.stepsToReproduce || "No reproduction steps provided."}
              </p>
            </div>
            <div>
              <h3 className="text-[10px] font-black tracking-widest text-slate-450 uppercase mb-2">
                Expected Result
              </h3>
              <p className="text-xs text-slate-750 font-semibold bg-slate-50/20 p-3.5 border border-slate-100 rounded-2xl whitespace-pre-wrap">
                {ticket.expectedResult || "N/A"}
              </p>
            </div>
            <div>
              <h3 className="text-[10px] font-black tracking-widest text-slate-450 uppercase mb-2">
                Actual Result
              </h3>
              <p className="text-xs text-slate-750 font-semibold bg-slate-50/20 p-3.5 border border-slate-100 rounded-2xl whitespace-pre-wrap text-rose-700 bg-rose-50/5 border-rose-50">
                {ticket.actualResult || "N/A"}
              </p>
            </div>
          </div>

          {/* Screenshots and files attachments */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black tracking-widest text-[#5D5FEF] uppercase flex items-center gap-1.5">
              <Paperclip className="h-4 w-4 text-[#5D5FEF]" />
              <span>Screenshots & Logs ({ticket.attachments?.length || 0})</span>
            </h3>

            {(!ticket.attachments || ticket.attachments.length === 0) ? (
              <p className="text-[10px] text-slate-450 italic">No screenshots uploaded.</p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {ticket.attachments.map((file) => {
                  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.fileName);

                  return (
                    <div
                      key={file._id}
                      className="border border-slate-150 rounded-2xl overflow-hidden bg-slate-50/30 flex flex-col justify-between"
                    >
                      {isImage ? (
                        <div className="h-32 w-full bg-slate-100 relative overflow-hidden flex items-center justify-center border-b border-slate-150">
                          <img
                            src={`${import.meta.env.VITE_BACKEND_URL}/uploads/${file.fileName}`}
                            alt={file.originalName}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-32 w-full bg-slate-100 flex flex-col items-center justify-center border-b border-slate-150 text-slate-400 gap-1.5">
                          <FileText className="h-8 w-8" />
                          <span className="text-[9px] font-bold">LOG / FILE</span>
                        </div>
                      )}
                      <div className="p-3 flex items-center justify-between gap-1.5">
                        <span className="text-[9px] font-black text-slate-800 truncate flex-1">
                          {file.originalName}
                        </span>
                        <a
                          href={`${import.meta.env.VITE_BACKEND_URL}/uploads/${file.fileName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-md bg-white border border-slate-200 text-slate-450 hover:text-[#5D5FEF] cursor-pointer"
                        >
                          <Download className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right side Comments & timeline */}
        <div className="col-span-1 space-y-6">
          {/* Comment thread with multiple file uploads */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col max-h-[500px]">
            <h3 className="text-xs font-black tracking-widest text-[#5D5FEF] uppercase flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-[#5D5FEF]" />
              <span>Discussion Board</span>
            </h3>

            {/* Comment Thread list */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5">
              {(!ticket.comments || ticket.comments.length === 0) ? (
                <p className="text-[10px] text-slate-400 italic text-center py-6">
                  No comments logged. Add a comment below to start developer alignment.
                </p>
              ) : (
                ticket.comments.map((comm) => (
                  <div key={comm._id} className="p-3 border border-slate-100 bg-slate-50/50 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-[8px] font-bold text-slate-450 uppercase">
                      <span>{comm.authorName} ({comm.authorRole})</span>
                      <span>{new Date(comm.createdAt).toLocaleDateString("en-IN", { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-750 whitespace-pre-wrap leading-relaxed">
                      {comm.content}
                    </p>

                    {/* Attached files inside comment */}
                    {comm.attachments && comm.attachments.length > 0 && (
                      <div className="pt-1.5 border-t border-slate-200/50 space-y-1">
                        <span className="text-[7.5px] font-bold text-slate-400 uppercase block tracking-wider">
                          Attached Files ({comm.attachments.length}):
                        </span>
                        {comm.attachments.map((cf, cIdx) => (
                          <div key={cIdx} className="flex items-center justify-between text-[9px] bg-white border border-slate-100 rounded-lg p-1.5">
                            <span className="truncate text-slate-750 font-bold max-w-[150px]">
                              {cf.originalName}
                            </span>
                            <a
                              href={`${import.meta.env.VITE_BACKEND_URL}/uploads/${cf.fileName}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-650 hover:text-indigo-850 font-extrabold"
                            >
                              Open
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Comment form with File Attachment attachment zone */}
            <form onSubmit={handlePostComment} className="border-t border-slate-100 pt-3 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Discuss bug details..."
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-205 text-slate-900 text-xs focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSubmittingComment}
                  className="p-1.5 bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white rounded-xl transition-all cursor-pointer border-0 flex items-center justify-center shrink-0 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Upload button for comment files */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <label className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-450 hover:text-indigo-650 cursor-pointer transition-colors relative">
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setCommentFiles(Array.from(e.target.files))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="h-3 w-3" />
                  </label>
                  {commentFiles.length > 0 && (
                    <span className="text-[9px] font-bold text-slate-500">
                      {commentFiles.length} file(s) queued
                    </span>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Timeline Audit Logs */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black tracking-widest text-[#5D5FEF] uppercase flex items-center gap-1.5">
              <History className="h-4 w-4 text-[#5D5FEF]" />
              <span>Ticket Timeline</span>
            </h3>

            <div className="relative pl-4 border-l border-slate-150 space-y-4 max-h-[250px] overflow-y-auto mt-2">
              {ticket.timeline?.map((log, idx) => (
                <div key={idx} className="relative space-y-1">
                  <span className="absolute -left-[20.5px] top-1 h-2 w-2 rounded-full bg-indigo-500 border-2 border-white ring-2 ring-indigo-50" />
                  <span className="text-[8px] font-bold text-slate-400 block uppercase">
                    {new Date(log.timestamp).toLocaleDateString("en-IN", { hour: '2-digit', minute: '2-digit' })} &bull; {log.user}
                  </span>
                  <p className="text-[10px] text-slate-700 font-semibold leading-relaxed">
                    {log.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
