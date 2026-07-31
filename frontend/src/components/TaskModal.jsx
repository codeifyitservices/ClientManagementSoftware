import React, { useState, useEffect } from "react";
import { X, Upload, FileText, Eye, Edit3 } from "lucide-react";

export default function TaskModal({
  isOpen,
  onClose,
  task = null, // if passed, we are in Edit Mode
  projects = [],
  employees = [],
  token,
  showToast,
  onSaveSuccess,
}) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editorTab, setEditorTab] = useState("write"); // 'write' | 'preview'

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setProjectId(task.project?._id || task.project || "");
      setAssignedEmployeeId(task.assignedEmployee?._id || task.assignedEmployee || "");
      setPriority(task.priority || "Medium");
      setDueDate(task.dueDate ? task.dueDate.split("T")[0] : "");
      setDescription(task.description || "");
    } else {
      setTitle("");
      setProjectId("");
      setAssignedEmployeeId("");
      setPriority("Medium");
      setDueDate("");
      setDescription("");
      setFiles([]);
    }
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const parseMarkdown = (text) => {
    if (!text) return "<p class='text-slate-400 italic'>No description provided.</p>";
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code class='bg-slate-100 px-1 rounded text-red-500 font-mono text-[11px]'>$1</code>")
      .replace(/\n/g, "<br />");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !projectId || !assignedEmployeeId || !dueDate) {
      showToast("Please fill in all required fields.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("project", projectId);
      formData.append("assignedEmployee", assignedEmployeeId);
      formData.append("priority", priority);
      formData.append("dueDate", dueDate);
      formData.append("description", description);

      files.forEach((file) => {
        formData.append("files", file);
      });

      const url = task
        ? `${import.meta.env.VITE_BACKEND_URL}/api/tasks/${task._id}`
        : `${import.meta.env.VITE_BACKEND_URL}/api/tasks`;

      const method = task ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        showToast(
          task ? "Task updated successfully." : "Task created successfully.",
          "success"
        );
        onSaveSuccess();
        onClose();
      } else {
        showToast(data.message || "Failed to save task.", "error");
      }
    } catch (error) {
      showToast("Network error saving task.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over */}
      <div className="relative w-screen max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-slide-in">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-800 tracking-wide uppercase">
              {task ? "Edit Task" : "Create New Task"}
            </h3>
            <p className="text-[10px] text-slate-450 font-bold mt-0.5">
              {task ? `Modifying ${task.taskId}` : "Add details to assign a new workspace task"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-650 transition-all cursor-pointer border-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Design Landing Page Layout"
              className="w-full px-3 py-2 rounded-xl border border-slate-205 text-slate-900 text-xs focus:outline-none focus:border-[#5D5FEF]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Project */}
            <div>
              <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Project <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-205 text-slate-900 text-xs focus:outline-none focus:border-[#5D5FEF] cursor-pointer"
              >
                <option value="">Select Project</option>
                {projects.map((proj) => (
                  <option key={proj._id} value={proj._id}>
                    {proj.projectName}
                  </option>
                ))}
              </select>
            </div>

            {/* Assign To */}
            <div>
              <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Assign To <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={assignedEmployeeId}
                onChange={(e) => setAssignedEmployeeId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-205 text-slate-900 text-xs focus:outline-none focus:border-[#5D5FEF] cursor-pointer"
              >
                <option value="">Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.fullName} ({emp.designation || "Staff"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-205 text-slate-900 text-xs focus:outline-none focus:border-[#5D5FEF] cursor-pointer"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Due Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-205 text-slate-900 text-xs focus:outline-none focus:border-[#5D5FEF] cursor-pointer"
              />
            </div>
          </div>

          {/* Description with dual-pane Write/Preview tabs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500">
                Task Description
              </label>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setEditorTab("write")}
                  className={`px-2 py-0.5 text-[9px] font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                    editorTab === "write" ? "bg-white text-slate-800 shadow-xs" : "text-slate-400 hover:text-slate-650"
                  }`}
                >
                  <Edit3 className="h-2.5 w-2.5" />
                  <span>Write</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab("preview")}
                  className={`px-2 py-0.5 text-[9px] font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                    editorTab === "preview" ? "bg-white text-slate-800 shadow-xs" : "text-slate-400 hover:text-slate-650"
                  }`}
                >
                  <Eye className="h-2.5 w-2.5" />
                  <span>Preview</span>
                </button>
              </div>
            </div>

            {editorTab === "write" ? (
              <div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Supports basic markdown formatting: **bold**, *italic*, `code`..."
                  rows={6}
                  className="w-full px-3 py-2 rounded-xl border border-slate-205 text-slate-900 text-xs focus:outline-none focus:border-[#5D5FEF] font-sans leading-relaxed"
                />
              </div>
            ) : (
              <div
                className="w-full px-3 py-2 rounded-xl border border-slate-150 text-slate-800 text-xs bg-slate-50/50 min-h-[132px] overflow-y-auto leading-relaxed"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(description) }}
              />
            )}
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Attachments (Optional)
            </label>
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-5 hover:border-[#5D5FEF] transition-all cursor-pointer bg-slate-50/40 relative">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-1.5 text-center">
                <Upload className="h-6 w-6 text-slate-400" />
                <span className="text-[10px] text-slate-600 font-bold">
                  Click or drag files here to upload
                </span>
                <span className="text-[9px] text-slate-400">
                  Multiple formats supported (Max size 10MB per file)
                </span>
              </div>
            </div>

            {/* Selected File Names */}
            {files.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[9px] font-bold text-slate-450 uppercase">
                  Queue to upload ({files.length}):
                </p>
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-xl"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="text-[10px] font-semibold text-slate-700 truncate flex-1">
                      {f.name}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {(f.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer border-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer border-0 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : null}
              <span>{task ? "Save Changes" : "Create Task"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
