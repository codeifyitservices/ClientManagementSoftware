import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ListTodo,
  Calendar,
  User,
  Folder,
  ChevronLeft,
  Paperclip,
  Clock,
  Send,
  MessageSquare,
  History,
  AlertCircle,
  Download,
} from "lucide-react";

export default function TaskDetailPage({ token, currentUser, showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  // Status and comment state
  const [status, setStatus] = useState("");
  const [commentText, setCommentText] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const fetchTaskDetails = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setTask(data);
        setStatus(data.status);
      } else {
        showToast(data.message || "Failed to load task details.", "error");
        navigate("/tasks");
      }
    } catch (err) {
      showToast("Network error loading task details.", "error");
      navigate("/tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-8 h-8 border-4 border-[#5D5FEF] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-450">Loading task details...</span>
      </div>
    );
  }

  if (!task) return null;

  const isAdmin = currentUser?.role === "Admin";
  const isAssigned = task.assignedEmployee?._id === currentUser?._id;

  const handleStatusChange = async (newStatus) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Task status updated to "${newStatus}".`, "success");
        setTask(data);
        setStatus(newStatus);
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
    if (!commentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/tasks/${id}/comments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: commentText }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Comment posted.", "success");
        setTask(data);
        setCommentText("");
      } else {
        showToast(data.message || "Failed to post comment.", "error");
      }
    } catch (err) {
      showToast("Network error posting comment.", "error");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const parseMarkdown = (text) => {
    if (!text) return "<p class='text-slate-400 italic'>No description provided.</p>";
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code class='bg-slate-100 px-1 rounded text-red-500 font-mono text-[11px]'>$1</code>")
      .replace(/\n/g, "<br />");
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

  return (
    <div className="space-y-6">
      {/* Back button & title */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/tasks")}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-450 hover:text-slate-700 cursor-pointer transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded">
                {task.taskId}
              </span>
              <span className={`text-[8px] font-black border px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                {task.priority} Priority
              </span>
            </div>
            <h1 className="text-base font-black text-slate-800 tracking-wide mt-1">
              {task.title}
            </h1>
          </div>
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black text-slate-450 uppercase">Status:</label>
          <select
            disabled={!isAdmin && !isAssigned}
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3.5 py-1.5 bg-white border border-slate-205 text-slate-900 text-xs font-bold rounded-xl focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Main Details Panel split */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left column (Metadata, Description, Attachments) */}
        <div className="col-span-2 space-y-6">
          {/* Metadata Cards */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm grid grid-cols-3 gap-4">
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wide block">
                Project
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-800 font-bold">
                <Folder className="h-4 w-4 text-[#5D5FEF]" />
                <span>{task.project?.projectName}</span>
              </div>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wide block">
                Assigned Employee
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-800 font-bold">
                <User className="h-4 w-4 text-[#5D5FEF]" />
                <span>{task.assignedEmployee?.fullName || "Unassigned"}</span>
              </div>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wide block">
                Due Date
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-800 font-bold">
                <Calendar className="h-4 w-4 text-[#5D5FEF]" />
                <span>{new Date(task.dueDate).toLocaleDateString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Description Block */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-3.5">
            <h3 className="text-xs font-black tracking-widest text-[#5D5FEF] uppercase">
              Task Description
            </h3>
            <div
              className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50/20 p-4 border border-slate-100 rounded-2xl"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(task.description) }}
            />
          </div>

          {/* Attachments Section */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black tracking-widest text-[#5D5FEF] uppercase flex items-center gap-1.5">
              <Paperclip className="h-4 w-4 text-[#5D5FEF]" />
              <span>Task Attachments ({task.attachments?.length || 0})</span>
            </h3>

            {(!task.attachments || task.attachments.length === 0) ? (
              <p className="text-[10px] text-slate-450 italic">No files attached to this task.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {task.attachments.map((file) => (
                  <div
                    key={file._id}
                    className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50/50 rounded-2xl hover:border-slate-350 transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-500 shrink-0">
                        <Paperclip className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-850 truncate">
                          {file.originalName}
                        </p>
                        <p className="text-[8px] font-bold text-slate-400">
                          {new Date(file.uploadDate).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`${import.meta.env.VITE_BACKEND_URL}/uploads/${file.fileName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-450 hover:text-indigo-650 hover:bg-white cursor-pointer transition-colors"
                      download
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column (Timeline & Comments) */}
        <div className="col-span-1 space-y-6">
          {/* Comments Section */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col max-h-[480px]">
            <h3 className="text-xs font-black tracking-widest text-[#5D5FEF] uppercase flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-[#5D5FEF]" />
              <span>Internal Comments ({task.comments?.length || 0})</span>
            </h3>

            {/* Comment list thread */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1.5">
              {(!task.comments || task.comments.length === 0) ? (
                <div className="py-6 text-center text-[10px] text-slate-400 italic">
                  No internal comments yet. Start the conversation below!
                </div>
              ) : (
                task.comments.map((comm) => (
                  <div key={comm._id} className="p-3 border border-slate-100 bg-slate-50/50 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between text-[8px] font-bold text-slate-450 uppercase">
                      <span>{comm.authorName} ({comm.authorRole})</span>
                      <span>{new Date(comm.createdAt).toLocaleDateString("en-IN", { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-750 whitespace-pre-wrap leading-relaxed">
                      {comm.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Send comment form */}
            {(isAdmin || isAssigned) && (
              <form onSubmit={handlePostComment} className="border-t border-slate-100 pt-3 flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Ask a question or comment..."
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-205 text-slate-900 text-xs focus:outline-none focus:border-[#5D5FEF]"
                />
                <button
                  type="submit"
                  disabled={isSubmittingComment || !commentText.trim()}
                  className="p-1.5 bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white rounded-xl transition-all cursor-pointer border-0 disabled:opacity-50 shrink-0 flex items-center justify-center"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            )}
          </div>

          {/* Timeline Audit Logs */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black tracking-widest text-[#5D5FEF] uppercase flex items-center gap-1.5">
              <History className="h-4 w-4 text-[#5D5FEF]" />
              <span>Activity Timeline</span>
            </h3>

            <div className="relative pl-4 border-l border-slate-150 space-y-4 max-h-[300px] overflow-y-auto mt-2">
              {task.timeline?.map((log, idx) => (
                <div key={idx} className="relative space-y-1">
                  {/* Timeline point */}
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
