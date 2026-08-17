import React, { useState, useEffect } from "react";
import { LogIn, LogOut, Coffee, Play, Monitor, ShieldCheck, Clock, Utensils, User, Users, X, Check } from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

import WfhRequestModal from "./WfhRequestModal";

export default function AttendanceWorkflowBar({ currentUser, onStatusChanged, onOpenAgentPairing }) {
  const [currentAttendance, setCurrentAttendance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRemote, setIsRemote] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [breakReason, setBreakReason] = useState("Lunch Break");
  const [coords, setCoords] = useState(null);
  const [securityCheckMsg, setSecurityCheckMsg] = useState(null);
  const [showWfhModal, setShowWfhModal] = useState(false);

  const empId = currentUser?._id || currentUser?.id;

  useEffect(() => {
    // Attempt browser GPS detection
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (err) => console.log("GPS position not available", err),
        { timeout: 8000 }
      );
    }
  }, []);

  const fetchCurrentSession = async () => {
    try {
      const res = await attendanceService.getMySession();
      if (res.success) {
        setCurrentAttendance(res.attendance || null);
      }
    } catch (err) {
      console.error("Failed to fetch session", err);
    }
  };

  useEffect(() => {
    fetchCurrentSession();
    const interval = setInterval(fetchCurrentSession, 1000); // 1-second instant polling
    return () => clearInterval(interval);
  }, [empId]);

  // Live timer tick
  useEffect(() => {
    if (!currentAttendance?.checkInTime || currentAttendance.checkOutTime) {
      setElapsedTime("00:00:00");
      return;
    }

    const timer = setInterval(() => {
      const startMs = new Date(currentAttendance.checkInTime).getTime();
      const nowMs = Date.now();
      const diffSecs = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      const hours = String(Math.floor(diffSecs / 3600)).padStart(2, "0");
      const minutes = String(Math.floor((diffSecs % 3600) / 60)).padStart(2, "0");
      const seconds = String(diffSecs % 60).padStart(2, "0");
      setElapsedTime(`${hours}:${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentAttendance]);

  const handleCheckIn = async () => {
    setLoading(true);
    setSecurityCheckMsg(null);
    try {
      const payload = {
        employeeId: empId,
        isRemote,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      };
      const res = await attendanceService.checkIn(payload);
      if (res.success) {
        setCurrentAttendance(res.attendance);
        if (onStatusChanged) onStatusChanged();
      } else {
        const msg = res.message || "Failed to check in";
        setSecurityCheckMsg(msg);
      }
    } catch (err) {
      setSecurityCheckMsg("Error checking in");
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreakConfirm = async (selectedReason) => {
    setLoading(true);
    setShowBreakModal(false);
    try {
      const res = await attendanceService.startBreak({ employeeId: empId, breakReason: selectedReason || breakReason });
      if (res.success) {
        setCurrentAttendance(res.attendance);
        if (onStatusChanged) onStatusChanged();
      } else {
        alert(res.message || "Failed to start break");
      }
    } catch (err) {
      alert("Error starting break");
    } finally {
      setLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setLoading(true);
    try {
      const res = await attendanceService.endBreak({ employeeId: empId });
      if (res.success) {
        setCurrentAttendance(res.attendance);
        if (onStatusChanged) onStatusChanged();
      } else {
        alert(res.message || "Failed to end break");
      }
    } catch (err) {
      alert("Error ending break");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!window.confirm("Are you sure you want to Check Out for today?")) return;
    setLoading(true);
    try {
      const res = await attendanceService.checkOut({ employeeId: empId });
      if (res.success) {
        setCurrentAttendance(res.attendance);
        if (onStatusChanged) onStatusChanged();
      } else {
        alert(res.message || "Failed to check out");
      }
    } catch (err) {
      alert("Error checking out");
    } finally {
      setLoading(false);
    }
  };

  const status = currentAttendance?.currentStatus || "Not Checked In";

  const breakOptions = [
    { type: "Lunch Break", label: "Lunch Break", icon: Utensils, color: "text-amber-500 bg-amber-50 border-amber-200" },
    { type: "Personal Break", label: "Personal Break", icon: User, color: "text-indigo-500 bg-indigo-50 border-indigo-200" },
    { type: "Meeting Break", label: "Meeting Break", icon: Users, color: "text-emerald-500 bg-emerald-50 border-emerald-200" },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* User Status Info */}
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5D5FEF] shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-slate-900 font-extrabold text-base">Daily Attendance Action</h3>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  status === "Working"
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : status === "On Break"
                    ? "bg-amber-50 text-amber-600 border-amber-200"
                    : status === "Checked Out"
                    ? "bg-slate-100 text-slate-600 border-slate-200"
                    : "bg-indigo-50 text-indigo-600 border-indigo-200"
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {currentAttendance?.checkInTime
                ? `Checked in at ${new Date(currentAttendance.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Not checked in yet today"}
            </p>
          </div>
        </div>

        {/* Live Session Counter */}
        {currentAttendance?.checkInTime && !currentAttendance.checkOutTime && (
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-semibold">Session Time:</span>
            <span className="font-mono text-lg font-bold text-[#5D5FEF]">{elapsedTime}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-3">
          {!currentAttendance?.checkInTime && (
            <>
              <button
                type="button"
                onClick={() => setShowWfhModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-[#5D5FEF] transition border border-indigo-100 cursor-pointer"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Request WFH</span>
              </button>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isRemote}
                  onChange={(e) => setIsRemote(e.target.checked)}
                  className="rounded border-slate-300 text-[#5D5FEF] focus:ring-[#5D5FEF]"
                />
                Working Remotely
              </label>
              <button
                onClick={handleCheckIn}
                disabled={loading}
                className="flex items-center gap-2 bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm shadow-indigo-500/20 cursor-pointer disabled:opacity-50"
              >
                <LogIn className="h-4 w-4" />
                <span>Check In</span>
              </button>
            </>
          )}

          {currentAttendance?.checkInTime && !currentAttendance.checkOutTime && (
            <>
              {status === "On Break" ? (
                <button
                  onClick={handleEndBreak}
                  disabled={loading}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  <span>Resume Work</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowBreakModal(true)}
                  disabled={loading}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  <Coffee className="h-4 w-4" />
                  <span>Start Break</span>
                </button>
              )}

              <button
                onClick={handleCheckOut}
                disabled={loading}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-sm shadow-rose-500/20 cursor-pointer disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
                <span>Check Out</span>
              </button>
            </>
          )}

          <button
            onClick={onOpenAgentPairing}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 transition cursor-pointer"
            title="Pair Desktop Agent for Automated Activity Tracking"
          >
            <Monitor className="h-4 w-4 text-[#5D5FEF]" />
            <span>Desktop Agent</span>
          </button>
        </div>
      </div>

      {/* Break Type Selection Modal */}
      {showBreakModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 font-bold flex items-center justify-center border border-amber-200">
                  <Coffee className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Select Break Type</h3>
                  <p className="text-xs font-semibold text-slate-500">Choose reason for your break</p>
                </div>
              </div>
              <button
                onClick={() => setShowBreakModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-3">
                {breakOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = breakReason === opt.type;
                  return (
                    <div
                      key={opt.type}
                      onClick={() => setBreakReason(opt.type)}
                      className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition ${
                        isSelected
                          ? "border-[#5D5FEF] bg-indigo-50/50 shadow-sm"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${opt.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-extrabold text-slate-900">{opt.label}</span>
                      </div>
                      {isSelected && (
                        <div className="h-6 w-6 rounded-full bg-[#5D5FEF] text-white flex items-center justify-center">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowBreakModal(false)}
                  className="text-xs px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleStartBreakConfirm(breakReason)}
                  disabled={loading}
                  className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition cursor-pointer disabled:opacity-50"
                >
                  <Coffee className="h-4 w-4" />
                  <span>Start {breakReason}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Validation Warning Banner */}
      {securityCheckMsg && (
        <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3 text-red-800 text-xs font-semibold">
            <ShieldCheck size={20} className="shrink-0 text-red-600" />
            <div>
              <p className="font-bold text-red-900">Attendance Check-In Restricted</p>
              <p className="text-[11px] text-red-700 mt-0.5">{securityCheckMsg}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowWfhModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition shrink-0 cursor-pointer shadow-sm"
          >
            Request WFH Authorization
          </button>
        </div>
      )}

      {/* WFH Request Modal */}
      <WfhRequestModal
        isOpen={showWfhModal}
        onClose={() => setShowWfhModal(false)}
        onSuccess={() => {
          setSecurityCheckMsg(null);
          if (onStatusChanged) onStatusChanged();
        }}
      />
    </div>
  );
}
