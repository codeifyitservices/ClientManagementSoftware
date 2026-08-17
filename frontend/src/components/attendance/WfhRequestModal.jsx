import React, { useState, useEffect } from "react";
import { X, Home, Calendar, Clock, MapPin, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function WfhRequestModal({ isOpen, onClose, onSuccess }) {
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [duration, setDuration] = useState("1 Day");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [detectedIp, setDetectedIp] = useState("Detecting IP...");
  const [coords, setCoords] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");
      // Fetch current IP & GPS
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setCoords({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
          },
          (err) => console.log("GPS unavailable for WFH request", err),
          { timeout: 8000 }
        );
      }
      attendanceService
        .getSecurityStatus()
        .then((res) => {
          if (res.clientIp) setDetectedIp(res.clientIp);
        })
        .catch(() => setDetectedIp("Unknown IP"));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await attendanceService.createWfhRequest({
        startDate,
        endDate,
        duration,
        reason,
        latitude: coords?.lat,
        longitude: coords?.lng,
        locationName: coords ? `GPS: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Remote / Home Network",
      });

      if (res.success) {
        alert("Work From Home request submitted successfully!");
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMsg(res.message || "Failed to submit WFH request");
      }
    } catch (err) {
      setErrorMsg("Error submitting WFH request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-white rounded-3xl max-w-lg w-full custom-shadow overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#5D5FEF]/20 text-[#5D5FEF] border border-[#5D5FEF]/30">
              <Home size={20} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Request Work From Home</h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                Submit remote attendance authorization request
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-semibold text-slate-700">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Captured Network Context */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100/70 text-slate-800 space-y-1 select-none">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-500 uppercase tracking-wider">Current Detected IP:</span>
              <span className="font-extrabold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-100">
                {detectedIp}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="font-bold text-slate-500 uppercase tracking-wider">Current Location:</span>
              <span className="font-bold text-slate-700">
                {coords ? `GPS: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "IP Geolocation Fallback"}
              </span>
            </div>
          </div>

          {/* Duration Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Requested Duration
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["24 Hours", "1 Day", "1 Week"].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    duration === d
                      ? "bg-[#5D5FEF] text-white border-[#5D5FEF] shadow-sm shadow-indigo-500/20"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Start Date & End Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5D5FEF]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5D5FEF]"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Reason / Remarks (Optional)
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Working from home due to personal emergency..."
              className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5D5FEF] placeholder:text-slate-400"
            />
          </div>

          {/* Submit Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white font-bold px-5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={14} />
                  <span>Submit WFH Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
