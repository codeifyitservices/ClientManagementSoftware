import React, { useState, useEffect } from "react";
import { FileText, Download, Printer, Filter, Calendar, Users, Clock, AlertTriangle } from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function AttendanceReports() {
  const [reportType, setReportType] = useState("daily");
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await attendanceService.getReports({
        type: reportType,
        startDate,
        endDate,
      });
      if (res.success) {
        setReportData(res);
      }
    } catch (err) {
      console.error("Failed to load attendance report", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [reportType, startDate, endDate]);

  const handleExportCSV = () => {
    if (!reportData?.rows?.length) return;
    const headers = ["Date", "Employee ID", "Employee Name", "Department", "Check-In", "Check-Out", "Work Hours", "Break Hours", "Status"];
    const csvRows = [headers.join(",")];

    reportData.rows.forEach((r) => {
      csvRows.push(
        [
          r.date,
          `"${r.employeeId}"`,
          `"${r.employeeName}"`,
          `"${r.department}"`,
          r.checkInTime,
          r.checkOutTime,
          r.workingHours,
          r.breakHours,
          r.attendanceStatus,
        ].join(",")
      );
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Attendance_Report_${reportType}_${startDate}_to_${endDate}.csv`;
    a.click();
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const summary = reportData?.summary || {};
  const rows = reportData?.rows || [];

  return (
    <div className="space-y-6">
      {/* Report Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center flex-wrap gap-3">
          {/* Report Type */}
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#5D5FEF]"
          >
            <option value="daily">Daily Attendance Report</option>
            <option value="weekly">Weekly Attendance Report</option>
            <option value="monthly">Monthly Attendance Report</option>
            <option value="late">Late Check-Ins Report</option>
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none"
            />
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm shadow-indigo-500/20 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-200 transition cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold mb-1">Total Attendance Records</div>
          <div className="text-2xl font-black text-slate-900">{summary.totalRecords || 0}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold mb-1">Total Working Hours</div>
          <div className="text-2xl font-black text-[#5D5FEF]">{summary.totalWorkingHours || 0} hrs</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold mb-1">Total Break Hours</div>
          <div className="text-2xl font-black text-amber-600">{summary.totalBreakHours || 0} hrs</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold mb-1">Late Check-Ins</div>
          <div className="text-2xl font-black text-rose-600">{summary.lateCheckIns || 0}</div>
        </div>
      </div>

      {/* Report Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-900 font-extrabold text-sm">Attendance Log Summary Report</h3>
          <span className="text-xs font-semibold text-slate-400">Generated on {new Date().toLocaleDateString()}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">Date</th>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Check-In</th>
                <th className="py-3 px-4">Check-Out</th>
                <th className="py-3 px-4">Work Hours</th>
                <th className="py-3 px-4">Break Hours</th>
                <th className="py-3 px-4 rounded-r-xl">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                    Generating report data...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                    No data matching report criteria.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-slate-700 font-mono font-semibold">{row.date}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono">{row.employeeId}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{row.employeeName}</td>
                    <td className="py-3 px-4 text-slate-700">{row.department}</td>
                    <td className="py-3 px-4 text-slate-700 font-mono font-semibold">{row.checkInTime}</td>
                    <td className="py-3 px-4 text-slate-700 font-mono font-semibold">{row.checkOutTime}</td>
                    <td className="py-3 px-4 font-bold text-[#5D5FEF] font-mono">{row.workingHours} hrs</td>
                    <td className="py-3 px-4 text-slate-500 font-mono">{row.breakHours} hrs</td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {row.attendanceStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
