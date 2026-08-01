import React, { useState } from "react";
import { X, Clock, Coffee, ShieldAlert, Monitor, Activity, CheckCircle2, User, Send } from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function AttendanceDetailsModal({ record, onClose, onRequestCorrectionRefresh }) {
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [corrCheckIn, setCorrCheckIn] = useState("");
  const [corrCheckOut, setCorrCheckOut] = useState("");
  const [corrReason, setCorrReason] = useState("");
  const [submittingCorr, setSubmittingCorr] = useState(false);

  if (!record) return null;

  const emp = record.employee || {};
  const timeline = record.timeline || [];
  const breaks = record.breaks || [];

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    if (!corrReason) {
      alert("Please provide a reason for the correction request.");
      return;
    }
    setSubmittingCorr(true);
    try {
      const res = await attendanceService.requestCorrection({
        attendanceId: record._id,
        employeeId: emp._id || record.employeeCustomId,
        date: record.date,
        checkInTime: corrCheckIn ? new Date(`${record.date}T${corrCheckIn}`) : null,
        checkOutTime: corrCheckOut ? new Date(`${record.date}T${corrCheckOut}`) : null,
        reason: corrReason,
      });

      if (res.success) {
        alert("Correction request submitted successfully!");
        setShowCorrectionForm(false);
        if (onRequestCorrectionRefresh) onRequestCorrectionRefresh();
      } else {
        alert(res.message || "Failed to submit correction request");
      }
    } catch (err) {
      alert("Error submitting correction request");
    } finally {
      setSubmittingCorr(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-[#5D5FEF] font-bold flex items-center justify-center border border-indigo-100">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">{emp.name || "Employee Attendance Details"}</h2>
              <p className="text-xs text-slate-500 font-medium">
                {emp.department || "General"} • Date: {record.date}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Check-In</div>
              <div className="text-sm font-bold text-slate-900 font-mono mt-1">
                {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Check-Out</div>
              <div className="text-sm font-bold text-slate-900 font-mono mt-1">
                {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Work Hours</div>
              <div className="text-sm font-bold text-[#5D5FEF] font-mono mt-1">
                {((record.totalWorkingMinutes || 0) / 60).toFixed(1)} hrs
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Break Time</div>
              <div className="text-sm font-bold text-amber-600 font-mono mt-1">{record.totalBreakMinutes || 0} mins</div>
            </div>
          </div>

          {/* Desktop Device Metadata */}
          {record.deviceName && (
            <div className="flex items-center gap-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-3 text-xs text-slate-700">
              <Monitor className="h-4 w-4 text-[#5D5FEF] shrink-0" />
              <div>
                <strong>Desktop Agent Device:</strong> {record.deviceName} (ID: {record.deviceId || "N/A"})
              </div>
            </div>
          )}

          {/* Break History */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <Coffee className="h-4 w-4 text-amber-500" />
              <span>Break History ({breaks.length})</span>
            </h3>

            {breaks.length === 0 ? (
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-200 font-medium">No breaks taken during this session.</div>
            ) : (
              <div className="space-y-2">
                {breaks.map((b, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold">
                      <span className="font-bold text-amber-600">Break #{idx + 1}:</span>
                      <span>{b.breakReason || "General Break"}</span>
                    </div>
                    <div className="text-slate-500 font-mono">
                      {new Date(b.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {b.endTime ? ` - ${new Date(b.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : " (Active)"}
                      <span className="ml-2 font-bold text-slate-800">({b.durationMinutes || 0} mins)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#5D5FEF]" />
              <span>Activity Timeline ({timeline.length} events)</span>
            </h3>

            {timeline.length === 0 ? (
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-200 font-medium">No activity timeline logged yet.</div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {timeline.map((event, idx) => {
                  const getTimelineDotColor = (ev) => {
                    const type = (ev.eventType || "").toLowerCase();
                    const desc = (ev.description || "").toLowerCase();

                    if (type.includes("check-in") || type.includes("check in") || type.includes("active") || desc.includes("resumed")) {
                      return "bg-emerald-500 ring-2 ring-emerald-200";
                    }
                    if (type.includes("idle")) {
                      return "bg-amber-400 ring-2 ring-amber-200";
                    }
                    if (type.includes("break")) {
                      return "bg-orange-500 ring-2 ring-orange-200";
                    }
                    if (type.includes("check-out") || type.includes("check out") || type.includes("disconnect") || type.includes("offline")) {
                      return "bg-rose-400 ring-2 ring-rose-200";
                    }
                    return "bg-[#5D5FEF] ring-2 ring-indigo-200";
                  };

                  return (
                    <div key={idx} className="relative flex items-start justify-between bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs">
                      <div className={`absolute -left-6 top-3.5 h-3 w-3 rounded-full border-2 border-white shadow-sm ${getTimelineDotColor(event)}`}></div>
                      <div>
                        <div className="font-bold text-slate-900">{event.eventType}</div>
                        <div className="text-slate-500 font-medium mt-0.5">{event.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-500 font-mono text-[11px] font-semibold">{new Date(event.timestamp).toLocaleTimeString()}</div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700 mt-1 inline-block">
                          {event.source || "System"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Correction Request Section */}
          <div className="pt-4 border-t border-slate-200">
            {!showCorrectionForm ? (
              <button
                onClick={() => setShowCorrectionForm(true)}
                className="flex items-center gap-2 text-xs font-bold text-[#5D5FEF] hover:text-[#4d4fdf] transition cursor-pointer"
              >
                <ShieldAlert className="h-4 w-4" />
                <span>Request Attendance Correction / Time Adjustment</span>
              </button>
            ) : (
              <form onSubmit={handleCorrectionSubmit} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                <h4 className="text-xs font-extrabold text-slate-900">Submit Attendance Correction Request</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500">Correct Check-In Time</label>
                    <input
                      type="time"
                      value={corrCheckIn}
                      onChange={(e) => setCorrCheckIn(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-[#5D5FEF]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500">Correct Check-Out Time</label>
                    <input
                      type="time"
                      value={corrCheckOut}
                      onChange={(e) => setCorrCheckOut(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-[#5D5FEF]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500">Reason for Correction</label>
                  <textarea
                    rows={2}
                    value={corrReason}
                    onChange={(e) => setCorrReason(e.target.value)}
                    placeholder="Provide reason for time adjustment..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-[#5D5FEF]"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCorrectionForm(false)}
                    className="text-xs px-3 py-1.5 rounded-xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCorr}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-[#5D5FEF] text-white font-bold hover:bg-[#4d4fdf] transition cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Submit Request</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
