import React, { useState } from "react";
import { X, RotateCcw, AlertTriangle, Send, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function RevertCheckoutModal({
  isOpen,
  onClose,
  attendance,
  onSuccess,
}) {
  const [selectedPreset, setSelectedPreset] = useState("Accidentally clicked Check Out button");
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const presets = [
    {
      title: "Accidentally clicked Check Out button",
      desc: "Premature click before finishing the shift",
    },
    {
      title: "Intended to start a break instead",
      desc: "Wanted to pause for a meal/tea break",
    },
    {
      title: "Closed tab / browser triggered accidental checkout",
      desc: "Browser shutdown or tab crash caused punch-out",
    },
    {
      title: "Check-out clicked prematurely during active shift",
      desc: "Still active and continuing work tasks",
    },
  ];

  const checkOutDisplay = attendance?.checkOutTime
    ? new Date(attendance.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "Recently";

  const checkInDisplay = attendance?.checkInTime
    ? new Date(attendance.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "--";

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalReason = customReason.trim() ? customReason.trim() : selectedPreset;
    if (!finalReason) {
      setErrorMsg("Please provide or select a reason for reverting checkout.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await attendanceService.requestCorrection({
        attendanceId: attendance?._id,
        date: attendance?.date,
        requestType: "Revert Checkout",
        reason: finalReason,
      });

      if (res?.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMsg(res?.message || "Failed to submit revert request. Please try again.");
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Network error submitting revert request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 bg-slate-50/80 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shadow-2xs shrink-0">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Revert Accidental Check-Out
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Request admin approval to undo punch-out and resume shift
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Punch Session Summary Info Box */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 text-xs text-amber-950 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <div className="font-bold flex items-center justify-between gap-2 flex-wrap">
                <span>Check-Out Recorded at {checkOutDisplay}</span>
                <span className="text-[10px] bg-amber-200/90 text-amber-950 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                  Session Ended
                </span>
              </div>
              <p className="text-amber-800 leading-relaxed font-medium">
                Submitting this request will alert your Admin. Upon approval, your check-out will be cleared and your shift timer will continue with status set back to <strong>Working</strong>.
              </p>
              {checkInDisplay !== "--" && (
                <div className="text-[11px] text-amber-700/90 font-mono pt-0.5">
                  Shift Start: <span className="font-bold">{checkInDisplay}</span> • Check-Out: <span className="font-bold">{checkOutDisplay}</span>
                </div>
              )}
            </div>
          </div>

          {/* Preset Reasons */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Select Reason
            </label>
            <div className="grid grid-cols-1 gap-2">
              {presets.map((p) => {
                const isSelected = selectedPreset === p.title;
                return (
                  <button
                    type="button"
                    key={p.title}
                    onClick={() => {
                      setSelectedPreset(p.title);
                      setErrorMsg("");
                    }}
                    className={`text-left p-3 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs"
                        : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className={`text-xs font-bold ${isSelected ? "text-indigo-900" : "text-slate-800"}`}>
                        {p.title}
                      </div>
                      <div className={`text-[11px] ${isSelected ? "text-indigo-700" : "text-slate-400"}`}>
                        {p.desc}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Details Textarea */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Additional Note (Optional)
            </label>
            <textarea
              rows={2}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Add any specific context or remarks for the administrator..."
              className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RotateCcw className="h-4 w-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Revert Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
