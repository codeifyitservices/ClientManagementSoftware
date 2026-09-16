import React, { useState, useEffect } from "react";
import { X, Home, Calendar, Clock, MapPin, ShieldCheck, AlertCircle, Loader2, Wifi, CheckCircle2, Info } from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function WfhRequestModal({ isOpen, onClose, onSuccess, activeRequest }) {
  const [duration, setDuration] = useState("24 hrs");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
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
      const geoPromise = attendanceService
        .getCurrentPositionAsync()
        .then((res) => {
          if (res?.latitude && res?.longitude) {
            const c = { lat: res.latitude, lng: res.longitude };
            setCoords(c);
            setLocationName(`GPS Coordinates: ${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`);
            return c;
          } else {
            setLocationName("Remote / Home Network");
            return null;
          }
        })
        .catch(() => {
          setLocationName("Remote / Home Network");
          return null;
        });

      Promise.all([ipPromise, geoPromise]).finally(() => {
        setTimeout(() => setDetecting(false), 400);
      });
    }
  }, [isOpen]);

  if (!isOpen || activeRequest?.status === "Approved") return null;

  const handleCancelRequest = async () => {
    if (!activeRequest?._id) return;
    if (!window.confirm("Are you sure you want to cancel this Work From Home request?")) return;

    setCancelling(true);
    setErrorMsg("");
    try {
      const res = await attendanceService.cancelWfhRequest(activeRequest._id);
      if (res.success) {
        setSuccessMsg("Your Work From Home request has been cancelled.");
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1500);
      } else {
        setErrorMsg(res.message || "Failed to cancel WFH request");
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Error cancelling request");
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const now = new Date();
    let durationHours = 24;
    if (duration === "3 days") durationHours = 72;
    if (duration === "1 week") durationHours = 168;
    const end = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

    try {
      const res = await attendanceService.createWfhRequest({
        startDate: now.toISOString(),
        endDate: end.toISOString(),
        duration,
        reason,
        latitude: coords?.lat,
        longitude: coords?.lng,
        locationName: locationName || (coords ? `GPS: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Remote / Home Network"),
      });

      if (res.success) {
        setSuccessMsg(`Work From Home request for ${duration} submitted successfully. The Admin team has been notified for remote whitelisting.`);
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

  const isPending = activeRequest?.status === "Pending";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 transition-all">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${
              isPending
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                : "bg-[#5D5FEF]/20 text-[#5D5FEF] border-[#5D5FEF]/30"
            }`}>
              <Home size={20} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                {isPending 
                  ? "Pending WFH Request" 
                  : "Apply for Work From Home"}
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                {isPending
                  ? "You have a submitted request awaiting administrator approval"
                  : "Request remote attendance and temporary whitelist authorization"}
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
              <h4 className="text-sm font-black text-slate-800">Status Updated</h4>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed max-w-sm mx-auto">
                {successMsg}
              </p>
            </div>
          </div>
        ) : isPending ? (
          /* View Active / Pending Request & Cancel State */
          <div className="p-6 space-y-4 text-xs font-semibold text-slate-700">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Status Banner */}
            <div className="p-4 rounded-2xl border flex items-center justify-between bg-amber-50/80 border-amber-200 text-amber-900">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <Clock size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wide">
                    Request Submitted & Pending
                  </h4>
                  <p className="text-[11px] font-medium opacity-80 mt-0.5">
                    Awaiting admin approval for {activeRequest.duration || "24 hrs"}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500 text-white">
                {activeRequest.status}
              </span>
            </div>

            {/* Request Details Grid */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/60 shadow-xs">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Duration</p>
                  <p className="text-xs font-black text-slate-800 mt-0.5">{activeRequest.duration || "24 hrs"}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200/60 shadow-xs">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Requested IP</p>
                  <p className="text-xs font-black text-slate-800 mt-0.5 font-mono truncate">{activeRequest.requestIp || "Auto-detected"}</p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200/60 shadow-xs">
                <p className="text-[10px] uppercase font-bold text-slate-400">Reason / Remarks</p>
                <p className="text-xs font-medium text-slate-700 mt-0.5">{activeRequest.reason || "No reason specified"}</p>
              </div>

              {activeRequest.endDate && (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                  <Info size={13} className="text-slate-400 shrink-0" />
                  <span>
                    Valid until: <strong>{new Date(activeRequest.endDate).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancelRequest}
                disabled={cancelling}
                className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {cancelling ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Cancelling Request...</span>
                  </>
                ) : (
                  <>
                    <X size={14} />
                    <span>Cancel WFH Request</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* New Request Form Body */
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
                  Remote Access Whitelist Verification
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
                  This IP address and location will be authorized by the administrator to enable remote check-in for the requested period.
                </span>
              </div>
            </div>

            {/* Duration Selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Requested Duration
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "24 hrs", val: "24 hrs" },
                  { label: "3 days", val: "3 days" },
                  { label: "1 week", val: "1 week" }
                ].map((d) => (
                  <button
                    key={d.val}
                    type="button"
                    onClick={() => setDuration(d.val)}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      duration === d.val
                        ? "bg-[#5D5FEF] text-white border-[#5D5FEF] shadow-sm shadow-indigo-500/20"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
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
