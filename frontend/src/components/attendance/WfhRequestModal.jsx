import React, { useState, useEffect } from "react";
import { X, Home, Calendar, Clock, MapPin, ShieldCheck, AlertCircle, Loader2, Wifi, CheckCircle2, Info } from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function WfhRequestModal({ isOpen, onClose, onSuccess }) {
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [duration, setDuration] = useState("24 Hours");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(true);
  const [detectedIp, setDetectedIp] = useState("");
  const [coords, setCoords] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");
      setSuccessMsg("");
      setDetecting(true);
      setDetectedIp("");
      setCoords(null);
      setLocationName("");

      // 1. Detect Network IP
      const ipPromise = attendanceService
        .detectNetworkInfo()
        .then((ip) => {
          if (ip) {
            setDetectedIp(ip);
            return ip;
          }
          return attendanceService.getSecurityStatus().then((res) => {
            const clientIp = res?.clientIp || "Unknown IP";
            setDetectedIp(clientIp);
            return clientIp;
          });
        })
        .catch(() => {
          setDetectedIp("Detected Network IP");
        });

      // 2. Detect Geolocation
      let geoPromise = Promise.resolve(null);
      if (navigator.geolocation) {
        geoPromise = new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const c = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              };
              setCoords(c);
              setLocationName(`GPS Coordinates: ${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`);
              resolve(c);
            },
            () => {
              setLocationName("Remote / Home Network");
              resolve(null);
            },
            { timeout: 6000, enableHighAccuracy: true }
          );
        });
      } else {
        setLocationName("Remote / Home Network");
      }

      Promise.all([ipPromise, geoPromise]).finally(() => {
        setTimeout(() => setDetecting(false), 400);
      });
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
        locationName: locationName || (coords ? `GPS: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Remote / Home Network"),
      });

      if (res.success) {
        setSuccessMsg("Work From Home request submitted successfully. The Admin team has been notified for 24-hour network whitelisting.");
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1800);
      } else {
        setErrorMsg(res.message || "Failed to submit WFH request");
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Error submitting WFH request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 transition-all">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#5D5FEF]/20 text-[#5D5FEF] border border-[#5D5FEF]/30">
              <Home size={20} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Apply for Work From Home</h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                Request remote attendance and 24-hour IP whitelist authorization
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success State */}
        {successMsg ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800">WFH Request Submitted</h4>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed max-w-sm mx-auto">
                {successMsg}
              </p>
            </div>
          </div>
        ) : (
          /* Form Body */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-semibold text-slate-700">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Network & Location Detection Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-[#5D5FEF]" />
                  24-Hour Whitelist Verification
                </span>
                {detecting ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    <Loader2 size={11} className="animate-spin" />
                    Detecting parameters...
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <CheckCircle2 size={11} />
                    Ready to submit
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/60 shadow-xs flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-50 text-[#5D5FEF] shrink-0">
                    <Wifi size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Current Public IP</p>
                    <p className="text-[11px] font-black text-slate-800 truncate font-mono">
                      {detecting ? "Detecting..." : (detectedIp || "127.0.0.1")}
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200/60 shadow-xs flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                    <MapPin size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Current Location</p>
                    <p className="text-[11px] font-black text-slate-800 truncate">
                      {detecting ? "Detecting..." : (coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Remote Network")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-1.5 text-[10px] text-slate-500 font-medium pt-0.5">
                <Info size={13} className="text-slate-400 shrink-0 mt-0.5" />
                <span>
                  This IP address and location will be sent to the administrator to automatically grant 24-hour access upon request approval.
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
                Reason / Remarks
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide reason for working from home..."
                required
                className="w-full p-3 rounded-xl border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5D5FEF] placeholder:text-slate-400 resize-none"
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
                disabled={loading || detecting}
                className="bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white font-bold px-5 py-2 rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} />
                    <span>Continue & Submit to Admin</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
