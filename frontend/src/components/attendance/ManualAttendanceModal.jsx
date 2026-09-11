import React, { useState, useEffect } from "react";
import { X, Save, Edit3, User, Loader2, CheckCircle2 } from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function ManualAttendanceModal({ record, onClose, onRefresh }) {
  const [employeeId, setEmployeeId] = useState(
    record?.employee?._id || record?.employeeId || (typeof record?.employee === "string" ? record.employee : "")
  );
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const [date, setDate] = useState(
    record?.date 
      ? (record.date.includes("T") ? record.date.split("T")[0] : record.date)
      : new Date().toISOString().split("T")[0]
  );
  const [checkInTime, setCheckInTime] = useState(
    record?.checkInTime 
      ? new Date(record.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) 
      : "09:00"
  );
  const [checkOutTime, setCheckOutTime] = useState(
    record?.checkOutTime 
      ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) 
      : "18:00"
  );
  const [attendanceStatus, setAttendanceStatus] = useState(record?.attendanceStatus || "Present");
  const [currentStatus, setCurrentStatus] = useState(record?.currentStatus || "Checked Out");
  const [adminRemarks, setAdminRemarks] = useState(record?.adminRemarks || "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch employees list on mount
  useEffect(() => {
    let isMounted = true;
    const loadEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const res = await attendanceService.getEmployeesList({ limit: 500 });
        if (isMounted) {
          const list = res?.employees || (Array.isArray(res) ? res : []);
          setEmployees(list);

          // If no employee was selected and list is not empty, auto-select first one if creating new
          if (!employeeId && list.length > 0 && !record) {
            setEmployeeId(list[0]._id);
          }
        }
      } catch (err) {
        console.error("Failed to load employees for manual attendance:", err);
      } finally {
        if (isMounted) setLoadingEmployees(false);
      }
    };
    loadEmployees();
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedEmployee = employees.find((e) => e._id === employeeId) || (record?.employee && typeof record.employee === "object" ? record.employee : null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeId) {
      setErrorMsg("Please select an employee to override attendance.");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);

    try {
      const fullCheckIn = checkInTime ? `${date}T${checkInTime}:00` : null;
      const fullCheckOut = checkOutTime ? `${date}T${checkOutTime}:00` : null;

      const res = await attendanceService.manualUpsert({
        employeeId,
        date,
        checkInTime: fullCheckIn,
        checkOutTime: fullCheckOut,
        attendanceStatus,
        currentStatus,
        adminRemarks: adminRemarks.trim() || `Manual override updated by Admin on ${new Date().toLocaleDateString()}`,
      });

      if (res.success) {
        if (onRefresh) onRefresh();
        onClose();
      } else {
        setErrorMsg(res.message || "Failed to update attendance");
      }
    } catch (err) {
      setErrorMsg("Error updating attendance record. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 select-none animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center border border-emerald-100 shadow-sm shrink-0">
              <Edit3 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-slate-900 truncate">Admin Manual Attendance Entry</h2>
              <p className="text-[11px] font-semibold text-slate-500 truncate">
                {selectedEmployee 
                  ? `Override for ${selectedEmployee.fullName || selectedEmployee.name} (${selectedEmployee.employeeId || "Staff"})` 
                  : "Select an employee to record/override attendance"}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-5 mt-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-[11px] font-bold text-red-700 shrink-0">
            {errorMsg}
          </div>
        )}

        {/* Form Body - Scrollable */}
        <form id="manual-att-form" onSubmit={handleSubmit} className="p-5 space-y-3 text-xs overflow-y-auto flex-1">
          {/* Employee Selection Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-600 uppercase tracking-wider text-[10px] font-bold flex items-center gap-1">
                <User size={11} className="text-[#5D5FEF]" />
                <span>Select Employee to Override</span>
              </label>
              <span className="text-[10px] font-bold text-[#5D5FEF] bg-indigo-50 px-2 py-0.2 rounded">
                {loadingEmployees ? "Loading..." : `${employees.length} Staff`}
              </span>
            </div>

            {loadingEmployees ? (
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 font-semibold text-xs">
                <Loader2 size={13} className="animate-spin text-[#5D5FEF]" />
                <span>Loading employee list...</span>
              </div>
            ) : (
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#5D5FEF] focus:ring-1 focus:ring-[#5D5FEF]/20 cursor-pointer shadow-sm transition"
              >
                <option value="">-- Choose Employee --</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.fullName || emp.name} ({emp.employeeId || "EMP"}) — {emp.department || "General"}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date Picker */}
          <div>
            <label className="text-slate-600 uppercase tracking-wider text-[10px] font-bold block mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#5D5FEF]"
            />
          </div>

          {/* Time pickers */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-slate-600 uppercase tracking-wider text-[10px] font-bold block mb-1">Check-In Time</label>
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#5D5FEF]"
              />
            </div>

            <div>
              <label className="text-slate-600 uppercase tracking-wider text-[10px] font-bold block mb-1">Check-Out Time</label>
              <input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#5D5FEF]"
              />
            </div>
          </div>

          {/* Attendance and Activity status */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-slate-600 uppercase tracking-wider text-[10px] font-bold block mb-1">Attendance Status</label>
              <select
                value={attendanceStatus}
                onChange={(e) => setAttendanceStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#5D5FEF]"
              >
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Half Day">Half Day</option>
                <option value="Late Check-In">Late Check-In</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>

            <div>
              <label className="text-slate-600 uppercase tracking-wider text-[10px] font-bold block mb-1">Current Activity Status</label>
              <select
                value={currentStatus}
                onChange={(e) => setCurrentStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#5D5FEF]"
              >
                <option value="Checked Out">Checked Out</option>
                <option value="Working">Working</option>
                <option value="On Break">On Break</option>
                <option value="Idle">Idle</option>
                <option value="Not Checked In">Not Checked In</option>
              </select>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="text-slate-600 uppercase tracking-wider text-[10px] font-bold block mb-1">Admin Remarks / Correction Note</label>
            <textarea
              rows={2}
              value={adminRemarks}
              onChange={(e) => setAdminRemarks(e.target.value)}
              placeholder="Reason for manual update / override..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#5D5FEF] resize-none"
            />
          </div>
        </form>

        {/* Footer Actions - Fixed at bottom of modal */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="manual-att-form"
            disabled={submitting || !employeeId}
            className="flex items-center gap-2 text-xs px-5 py-2 rounded-xl bg-[#5D5FEF] text-white font-bold hover:bg-[#4d4fdf] transition cursor-pointer disabled:opacity-50 shadow-sm shadow-indigo-500/20"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save Record</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
