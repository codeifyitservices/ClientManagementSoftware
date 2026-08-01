import React, { useState } from "react";
import { X, Save, Edit3 } from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function ManualAttendanceModal({ record, onClose, onRefresh }) {
  const [employeeId, setEmployeeId] = useState(record?.employee?._id || record?.employeeId || "");
  const [date, setDate] = useState(record?.date || new Date().toISOString().split("T")[0]);
  const [checkInTime, setCheckInTime] = useState(
    record?.checkInTime ? new Date(record.checkInTime).toISOString().slice(11, 16) : "09:00"
  );
  const [checkOutTime, setCheckOutTime] = useState(
    record?.checkOutTime ? new Date(record.checkOutTime).toISOString().slice(11, 16) : "18:00"
  );
  const [attendanceStatus, setAttendanceStatus] = useState(record?.attendanceStatus || "Present");
  const [currentStatus, setCurrentStatus] = useState(record?.currentStatus || "Checked Out");
  const [adminRemarks, setAdminRemarks] = useState(record?.adminRemarks || "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fullCheckIn = checkInTime ? `${date}T${checkInTime}:00` : null;
      const fullCheckOut = checkOutTime ? `${date}T${checkOutTime}:00` : null;

      const res = await attendanceService.manualUpsert({
        employeeId: record?.employee?._id || employeeId,
        date,
        checkInTime: fullCheckIn,
        checkOutTime: fullCheckOut,
        attendanceStatus,
        currentStatus,
        adminRemarks,
      });

      if (res.success) {
        alert("Attendance record updated successfully!");
        if (onRefresh) onRefresh();
        onClose();
      } else {
        alert(res.message || "Failed to update attendance");
      }
    } catch (err) {
      alert("Error updating attendance record");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center border border-emerald-100">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Admin Manual Attendance Entry</h2>
              <p className="text-xs font-semibold text-slate-500">{record?.employee?.name || "Edit Employee Record"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#5D5FEF]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Check-In Time</label>
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#5D5FEF]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Check-Out Time</label>
              <input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#5D5FEF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Attendance Status</label>
              <select
                value={attendanceStatus}
                onChange={(e) => setAttendanceStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#5D5FEF]"
              >
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Half Day">Half Day</option>
                <option value="Late Check-In">Late Check-In</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Current Activity Status</label>
              <select
                value={currentStatus}
                onChange={(e) => setCurrentStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#5D5FEF]"
              >
                <option value="Working">Working</option>
                <option value="On Break">On Break</option>
                <option value="Idle">Idle</option>
                <option value="Checked Out">Checked Out</option>
                <option value="Not Checked In">Not Checked In</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Admin Remarks / Correction Note</label>
            <textarea
              rows={3}
              value={adminRemarks}
              onChange={(e) => setAdminRemarks(e.target.value)}
              placeholder="Reason for manual update..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#5D5FEF]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl bg-[#5D5FEF] text-white font-bold hover:bg-[#4d4fdf] transition cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>Save Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
