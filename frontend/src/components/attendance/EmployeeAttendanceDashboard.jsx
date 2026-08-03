import React, { useState, useEffect } from "react";
import {
  Clock,
  Coffee,
  Activity,
  LogIn,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Info,
  HelpCircle,
  Save,
  MessageSquare,
  Monitor,
  Play,
  X,
  Check,
  User,
  Users,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { attendanceService } from "../../services/attendanceService";
import AgentPairingModal from "./AgentPairingModal";

const getTodayDateString = (dateObj = new Date()) => {
  const d = new Date(dateObj);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const displayDate = (dateObj) => {
  return dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// ── Shared style tokens (kept consistent across every card so nothing drifts) ──
const CARD = "bg-white border border-slate-200/70 rounded-2xl shadow-sm";
const CARD_PAD = "p-5";
const SECTION_TITLE = "text-sm font-extrabold text-slate-900";
const LABEL = "text-[10px] font-bold text-slate-400 uppercase tracking-wider";

export default function EmployeeAttendanceDashboard({ currentUser }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sessionData, setSessionData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isRemote, setIsRemote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("");
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [breakReason, setBreakReason] = useState("Lunch Break");
  const [showPairingModal, setShowPairingModal] = useState(false);

  const empId = currentUser?._id || currentUser?.id;
  const selectedDateStr = getTodayDateString(selectedDate);
  const isToday = selectedDateStr === getTodayDateString(new Date());

  const fetchData = async () => {
    try {
      // 1. Get current selected date attendance session & agent status
      const sessionRes = await attendanceService.getMySession({
        date: selectedDateStr,
      });
      if (sessionRes.success) {
        setSessionData(sessionRes);
        setNoteText(sessionRes.attendance?.notes || "");
      }

      // 2. Get today's summary metrics and weekly trends
      const summaryRes = await attendanceService.getSummary({
        date: selectedDateStr,
      });
      if (summaryRes.success) {
        setSummaryData(summaryRes);
      }

      // 3. Get recent records for table
      const listRes = await attendanceService.getList({ page: 1, limit: 5 });
      if (listRes.success) {
        setRecentRecords(listRes.records || []);
      }
    } catch (err) {
      console.error("Failed to load employee dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [selectedDateStr, empId]);

  // Poll data every 3 seconds for real-time status updates (e.g. agent connection)
  useEffect(() => {
    if (!isToday) return;
    const interval = setInterval(() => {
      fetchData();
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedDateStr, empId, isToday]);

  // Live session timer logic (running only for today's session if active)
  useEffect(() => {
    const attendance = sessionData?.attendance;
    if (
      !isToday ||
      !attendance?.checkInTime ||
      attendance.checkOutTime ||
      attendance.currentStatus === "On Break"
    ) {
      setElapsedTime("");
      return;
    }

    const timer = setInterval(() => {
      const startMs = new Date(attendance.checkInTime).getTime();
      const nowMs = Date.now();
      const diffSecs = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      const hours = String(Math.floor(diffSecs / 3600)).padStart(2, "0");
      const minutes = String(Math.floor((diffSecs % 3600) / 60)).padStart(
        2,
        "0",
      );
      const seconds = String(diffSecs % 60).padStart(2, "0");
      setElapsedTime(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionData, isToday]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    if (d <= new Date()) {
      setSelectedDate(d);
    }
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const res = await attendanceService.checkIn({
        employeeId: empId,
        isRemote,
      });
      if (res.success) {
        fetchData();
      } else {
        alert(res.message || "Failed to check in");
      }
    } catch (err) {
      alert("Error checking in");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!window.confirm("Are you sure you want to Check Out for today?"))
      return;
    setActionLoading(true);
    try {
      const res = await attendanceService.checkOut({ employeeId: empId });
      if (res.success) {
        fetchData();
      } else {
        alert(res.message || "Failed to check out");
      }
    } catch (err) {
      alert("Error checking out");
    } finally {
      setActionLoading(false);
    }
  };

  const sendAgentSignal = (statusValue) => {
    try {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = `desktop-agent://status?value=${encodeURIComponent(statusValue)}`;
      document.body.appendChild(iframe);
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    } catch (err) {
      console.error("Failed to send deep link signal to desktop agent", err);
    }
  };

  const handleStartBreakConfirm = async (selectedReason) => {
    setActionLoading(true);
    setShowBreakModal(false);
    try {
      const res = await attendanceService.startBreak({
        employeeId: empId,
        breakReason: selectedReason || breakReason,
      });
      if (res.success) {
        sendAgentSignal("On Break");
        fetchData();
      } else {
        alert(res.message || "Failed to start break");
      }
    } catch (err) {
      alert("Error starting break");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setActionLoading(true);
    try {
      const res = await attendanceService.endBreak({ employeeId: empId });
      if (res.success) {
        sendAgentSignal("Working");
        fetchData();
      } else {
        alert(res.message || "Failed to end break");
      }
    } catch (err) {
      alert("Error ending break");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNote = async () => {
    setIsSavingNote(true);
    try {
      const res = await attendanceService.saveNote({
        date: selectedDateStr,
        note: noteText,
      });
      if (res.success) {
        fetchData();
        alert("Note saved successfully");
      } else {
        alert(res.message || "Failed to save note");
      }
    } catch (err) {
      alert("Error saving note");
    } finally {
      setIsSavingNote(false);
    }
  };

  // Helper formatting functions
  const formatTime = (timeStr) => {
    if (!timeStr) return "--:--";
    return new Date(timeStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMinutes = (mins) => {
    if (!mins) return "0m";
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    if (hrs > 0) return `${hrs}h ${m}m`;
    return `${m}m`;
  };

  const formatWorkingHoursToday = (mins) => {
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return `${hrs}h ${m}m`;
  };

  // Calculations & constants
  const attendance = sessionData?.attendance;
  const summary = summaryData?.summary;
  const isAgentConnected = sessionData?.isAgentConnected;

  const currentStatusVal = summary?.myStatus || "Not Checked In";
  const checkInVal = attendance?.checkInTime
    ? formatTime(attendance.checkInTime)
    : "--:--";
  const checkOutVal = attendance?.checkOutTime
    ? formatTime(attendance.checkOutTime)
    : "--:--";

  const totalWorkingMins = summary?.myWorkingMinutesToday || 0;
  const totalBreakMins = summary?.myBreakMinutesToday || 0;
  const totalIdleMins = summary?.totalIdleMinutes || 0;
  const longestIdleMins = summary?.longestIdleMinutes || 0;
  const activityScore =
    summary?.activityScore !== undefined ? summary.activityScore : 100;
  const savedNotes = summary?.notes || "";

  // Progress Goal Calculation (8 hours = 480 mins)
  const goalMinutes = 480;
  const goalPercentage = Math.min(
    100,
    Math.round((totalWorkingMins / goalMinutes) * 100),
  );

  // Active Time = totalWorkingMinutes - totalIdleMinutes
  const activeTimeMins = Math.max(0, totalWorkingMins - totalIdleMins);

  // Recharts Trends formatting
  const chartData = summaryData?.trends?.weekTrend || [
    { day: "Mon", hours: 0, label: "" },
    { day: "Tue", hours: 0, label: "" },
    { day: "Wed", hours: 0, label: "" },
    { day: "Thu", hours: 0, label: "" },
    { day: "Fri", hours: 0, label: "" },
    { day: "Sat", hours: 0, label: "" },
    { day: "Sun", hours: 0, label: "" },
  ];

  const breakOptions = [
    {
      type: "Lunch Break",
      label: "Lunch Break",
      icon: Coffee,
      color: "text-amber-500 bg-amber-50 border-amber-200",
    },
    {
      type: "Personal Break",
      label: "Personal Break",
      icon: User,
      color: "text-indigo-500 bg-indigo-50 border-indigo-200",
    },
    {
      type: "Meeting Break",
      label: "Meeting Break",
      icon: Users,
      color: "text-emerald-500 bg-emerald-50 border-emerald-200",
    },
  ];

  // Custom label renderer for Recharts bars
  const renderCustomBarLabel = ({ x, y, width, value, index }) => {
    const item = chartData[index];
    if (!item || !item.workingMinutes || item.workingMinutes === 0) return null;
    return (
      <text
        x={x + width / 2}
        y={y - 8}
        fill="#475569"
        fontSize={10}
        fontWeight="bold"
        textAnchor="middle"
      >
        {item.label}
      </text>
    );
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-5 max-w-7xl mx-auto animate-pulse">
        <div className="h-9 bg-slate-200 rounded-xl w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="h-64 bg-slate-200 rounded-2xl lg:col-span-2"></div>
          <div className="h-64 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  // Small reusable metric-card icon badge, kept identical across the top row
  const IconBadge = ({ icon: Icon, tone }) => (
    <div
      className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center ${tone}`}
    >
      <Icon className="h-4 w-4" />
    </div>
  );

  return (
    <div className="space-y-5 w-full">
      {/* ── HEADER: title, date selector and agent status all on one aligned row ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Attendance Overview
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Track your attendance, working hours and activity
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date selector */}
          <div className="flex items-center gap-1 bg-white border border-slate-200/80 rounded-xl px-2 py-2 shadow-sm text-xs font-bold text-slate-700 h-11">
            <button
              onClick={handlePrevDay}
              className="p-1 hover:bg-slate-100 rounded-md transition cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4 text-slate-500" />
            </button>
            <div className="flex items-center gap-1.5 cursor-pointer relative px-1">
              <Calendar className="h-4 w-4 text-[#5D5FEF]" />
              <span>{displayDate(selectedDate)}</span>
              <input
                type="date"
                value={selectedDateStr}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(new Date(e.target.value));
                }}
                max={getTodayDateString(new Date())}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>
            <button
              onClick={handleNextDay}
              disabled={isToday}
              className="p-1 hover:bg-slate-100 rounded-md transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </button>
          </div>

          {/* Agent status */}
          <div className="flex items-center gap-2 bg-white border border-slate-200/80 hover:bg-slate-50 cursor-pointer rounded-xl px-3.5 h-11 shadow-sm transition-colors">
            <span
              className={`inline-block w-2 h-2 rounded-full ${isAgentConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}
            ></span>
            <div className="leading-tight">
              <div className="text-[11px] font-extrabold text-slate-800">
                Desktop Agent
              </div>
              <div className="text-[9px] font-bold text-slate-400">
                {isAgentConnected ? "Connected" : "Disconnected"}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowPairingModal(true)}
            className="flex items-center gap-2 px-4 h-11 rounded-xl text-xs font-bold text-[#5D5FEF] bg-indigo-50/70 hover:bg-indigo-50 border border-indigo-100 transition cursor-pointer shadow-sm"
          >
            <Monitor className="h-4 w-4" />
            <span>Pair / Setup Agent</span>
          </button>
        </div>
      </div>

      {/* ── METRIC CARDS ROW — equal height, identical padding/typography ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch">
        {/* Working Hours Today */}
        <div className={`${CARD} ${CARD_PAD} flex flex-col`}>
          <div className="flex items-start justify-between">
            <span className={LABEL}>Working Hours</span>
            <IconBadge icon={Clock} tone="bg-indigo-50 text-[#5D5FEF]" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight mt-2">
            {formatWorkingHoursToday(totalWorkingMins)}
          </h2>
          <span className="text-[10px] font-bold text-slate-400 mt-0.5">
            Goal: 8h 00m
          </span>
          <div className="mt-auto pt-3">
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#5D5FEF] h-full rounded-full transition-all duration-500"
                style={{ width: `${goalPercentage}%` }}
              ></div>
            </div>
            <span className="text-[10px] font-bold text-[#5D5FEF] mt-1 block text-right">
              {goalPercentage}%
            </span>
          </div>
        </div>

        {/* Check-in */}
        <div className={`${CARD} ${CARD_PAD} flex flex-col`}>
          <div className="flex items-start justify-between">
            <span className={LABEL}>Check-in Time</span>
            <IconBadge icon={LogIn} tone="bg-emerald-50 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight mt-2">
            {checkInVal}
          </h2>
          <span className="text-[10px] font-bold text-slate-400 mt-0.5">
            {attendance?.checkInTime ? "Today" : "Not Checked In"}
          </span>

          <div className="mt-auto pt-3">
            {!attendance?.checkInTime && isToday ? (
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isRemote}
                    onChange={(e) => setIsRemote(e.target.checked)}
                    className="rounded border-slate-300 text-[#5D5FEF] focus:ring-[#5D5FEF] h-3.5 w-3.5"
                  />
                  Work Remotely
                </label>
                <button
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] py-2 rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Check In</span>
                </button>
              </div>
            ) : (
              <div className="h-[2px]"></div>
            )}
          </div>
        </div>

        {/* Current Status */}
        <div className={`${CARD} ${CARD_PAD} flex flex-col`}>
          <div className="flex items-start justify-between">
            <span className={LABEL}>Current Status</span>
            <div className="h-9 w-9 shrink-0 rounded-xl bg-emerald-50 flex items-center justify-center">
              <span className="relative flex h-4 w-4">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentStatusVal === "Working" ? "bg-emerald-400" : currentStatusVal === "On Break" ? "bg-amber-400" : "bg-slate-300"}`}
                ></span>
                <Activity
                  className={`relative inline-flex rounded-full h-4 w-4 ${currentStatusVal === "Working" ? "text-emerald-500" : currentStatusVal === "On Break" ? "text-amber-500" : "text-slate-400"}`}
                />
              </span>
            </div>
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight mt-2">
            {currentStatusVal}
          </h2>
          <span className="text-[10px] font-bold text-slate-400 mt-0.5">
            {elapsedTime
              ? `Live: ${elapsedTime}`
              : attendance?.checkInTime && !attendance?.checkOutTime
                ? "Active Session"
                : "Session Ended"}
          </span>
          <div className="mt-auto pt-3 h-[2px]"></div>
        </div>

        {/* Break Time Today */}
        <div className={`${CARD} ${CARD_PAD} flex flex-col`}>
          <div className="flex items-start justify-between">
            <span className={LABEL}>Break Time Today</span>
            <IconBadge icon={Coffee} tone="bg-amber-50 text-amber-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight mt-2">
            {formatMinutes(totalBreakMins)}
          </h2>
          <span className="text-[10px] font-bold text-slate-400 mt-0.5">
            {attendance?.breaks?.length || 0} Breaks Today
          </span>
          <div className="mt-auto pt-3 h-[2px]"></div>
        </div>

        {/* Check-out */}
        <div className={`${CARD} ${CARD_PAD} flex flex-col`}>
          <div className="flex items-start justify-between">
            <span className={LABEL}>Check-out Time</span>
            <IconBadge icon={LogOut} tone="bg-rose-50 text-rose-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight mt-2">
            {checkOutVal}
          </h2>
          <span className="text-[10px] font-bold text-slate-400 mt-0.5">
            {attendance?.checkOutTime
              ? "Checked Out"
              : attendance?.checkInTime
                ? "Not Checked Out"
                : "No Session"}
          </span>
          <div className="mt-auto pt-3">
            {attendance?.checkInTime && !attendance?.checkOutTime && isToday ? (
              <button
                onClick={handleCheckOut}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] py-2 rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Check Out</span>
              </button>
            ) : (
              <div className="h-[2px]"></div>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN 12-COLUMN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* LEFT/MIDDLE (9/12) — Timeline + Trend stretch to match the right column's height */}
        <div className="lg:col-span-9">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch h-full">
            {/* Today's Timeline */}
            <div
              className={`md:col-span-5 ${CARD} ${CARD_PAD} flex flex-col h-full`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={SECTION_TITLE}>Today's Timeline</h3>
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className="text-[11px] font-bold text-[#5D5FEF] hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              <div className="max-h-[320px] overflow-y-auto pr-1">
                <div className="relative border-l border-slate-100 ml-4 pl-6 space-y-4 py-1">
                  {attendance?.timeline && attendance.timeline.length > 0 ? (
                    attendance.timeline.map((event, idx) => {
                      const getTimelineDotColor = (ev) => {
                        const type = (ev.eventType || "").toLowerCase();
                        const desc = (ev.description || "").toLowerCase();

                        if (type.includes("check-in") || type.includes("check in") || type.includes("active") || desc.includes("resumed")) {
                          return "bg-emerald-500 border-emerald-250";
                        }
                        if (type.includes("idle")) {
                          return "bg-amber-400 border-amber-200";
                        }
                        if (type.includes("break")) {
                          return "bg-indigo-500 border-indigo-200";
                        }
                        if (type.includes("check-out") || type.includes("check out") || type.includes("disconnect") || type.includes("offline")) {
                          return "bg-rose-500 border-rose-250";
                        }
                        return "bg-[#5D5FEF] border-indigo-250";
                      };

                      return (
                        <div key={idx} className="relative text-xs">
                          <span
                            className={`absolute -left-[31px] top-0.5 rounded-full w-3.5 h-3.5 border-2 border-white ${getTimelineDotColor(event)}`}
                          ></span>
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="font-mono font-bold text-slate-500 block">
                                {formatTime(event.timestamp)}
                              </span>
                              <span className="font-extrabold text-slate-800 mt-0.5 block">
                                {event.eventType}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-400 block mt-0.5 leading-normal">
                                {event.description}
                              </span>
                            </div>
                            <span className="font-bold text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200/40 shrink-0">
                              {event.source || "System"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-slate-400 font-semibold text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl pl-0 -ml-6">
                      No activity logged today.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Working Hours Trend */}
            <div
              className={`md:col-span-7 ${CARD} ${CARD_PAD} flex flex-col h-full`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={SECTION_TITLE}>Working Hours Trend</h3>
                <select className="bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-700 py-1.5 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#5D5FEF]">
                  <option>This Week</option>
                </select>
              </div>

              <div className="w-full flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f1f5f9"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      stroke="#94a3b8"
                      tick={{ fontSize: 11, fontWeight: "bold" }}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fontSize: 11, fontWeight: "bold" }}
                      axisLine={false}
                      domain={[0, 10]}
                      ticks={[0, 2, 4, 6, 8, 10]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e2e8f0",
                        borderRadius: "12px",
                        fontSize: 12,
                      }}
                      cursor={{ fill: "rgba(93, 95, 239, 0.04)" }}
                    />
                    <ReferenceLine
                      y={8}
                      stroke="#5D5FEF"
                      strokeDasharray="4 4"
                      label={{
                        value: "Goal 8h",
                        position: "insideBottomRight",
                        fill: "#5D5FEF",
                        fontSize: 9,
                        fontWeight: "extrabold",
                      }}
                    />
                    <Bar
                      dataKey="hours"
                      fill="#5D5FEF"
                      radius={[6, 6, 0, 0]}
                      barSize={26}
                      label={renderCustomBarLabel}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (3/12) */}
        <div className="lg:col-span-3 space-y-4 h-full flex flex-col">
          {/* Today's Breaks */}
          <div className={`${CARD} ${CARD_PAD} space-y-3`}>
            <div className="flex items-center justify-between">
              <h3 className={SECTION_TITLE}>Today's Breaks</h3>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 block">
                  Total Time
                </span>
                <span className="text-lg font-black text-emerald-600 block leading-tight">
                  {formatMinutes(totalBreakMins)}
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {attendance?.breaks?.map((br, index) => (
                <div
                  key={index}
                  className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-extrabold text-slate-700 block">
                      Break {index + 1}
                    </span>
                    <span className="font-mono text-slate-500 font-bold block mt-0.5">
                      {formatTime(br.startTime)} -{" "}
                      {br.endTime ? formatTime(br.endTime) : "Active"}
                    </span>
                  </div>
                  <span className="font-black text-slate-800 bg-white border border-slate-200/60 rounded-lg px-2.5 py-1">
                    {br.endTime ? `${br.durationMinutes}m` : "Active"}
                  </span>
                </div>
              ))}
              {(!attendance?.breaks || attendance.breaks.length === 0) && (
                <div className="text-xs text-slate-400 font-semibold text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                  No breaks taken today.
                </div>
              )}
            </div>

            {attendance?.checkInTime &&
              !attendance?.checkOutTime &&
              isToday && (
                <div className="pt-1">
                  {currentStatusVal === "On Break" ? (
                    <button
                      onClick={handleEndBreak}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer shadow-sm"
                    >
                      <Play className="h-4 w-4" />
                      <span>Resume Work</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowBreakModal(true)}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 border border-amber-500 hover:bg-amber-50/50 text-amber-600 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
                    >
                      <Coffee className="h-4 w-4" />
                      <span>Start Break</span>
                    </button>
                  )}
                </div>
              )}
          </div>

          {/* Activity Status */}
          <div className={`${CARD} ${CARD_PAD} space-y-3`}>
            <h3 className={SECTION_TITLE}>Activity Status</h3>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500">Active Time</span>
                <span className="text-emerald-600 font-extrabold">
                  {formatMinutes(activeTimeMins)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500">Idle Time</span>
                <span className="text-amber-500 font-extrabold">
                  {formatMinutes(totalIdleMins)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500">Longest Idle</span>
                <span className="text-slate-700 font-extrabold">
                  {formatMinutes(longestIdleMins)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500">Activity Score</span>
                <span className="text-emerald-600 font-black">
                  {activityScore}%
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-center">
              <button className="text-[11px] font-bold text-[#5D5FEF] hover:underline cursor-pointer">
                View Activity Details
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── RECENT ATTENDANCE RECORDS + NOTES — full width row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className={`lg:col-span-9 ${CARD} ${CARD_PAD}`}>
          <h3 className={`${SECTION_TITLE} mb-4`}>Recent Attendance Records</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-bold text-slate-500 border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-extrabold">Date</th>
                  <th className="py-3 px-4 font-extrabold">Check-in</th>
                  <th className="py-3 px-4 font-extrabold">Check-out</th>
                  <th className="py-3 px-4 font-extrabold">Working Hours</th>
                  <th className="py-3 px-4 font-extrabold">Break Time</th>
                  <th className="py-3 px-4 font-extrabold">Status</th>
                  <th className="py-3 px-4 font-extrabold">Activity Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentRecords.map((record) => {
                  const isVirtual =
                    typeof record._id === "string" &&
                    record._id.startsWith("virtual-");
                  return (
                    <tr
                      key={record._id}
                      className="hover:bg-slate-50/50 transition"
                    >
                      <td className="py-3 px-4 font-extrabold text-slate-900">
                        {new Date(record.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        {record.checkInTime
                          ? formatTime(record.checkInTime)
                          : "--:--"}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        {record.checkOutTime
                          ? formatTime(record.checkOutTime)
                          : "--:--"}
                      </td>
                      <td className="py-3 px-4 font-extrabold text-slate-800">
                        {formatMinutes(record.totalWorkingMinutes)}
                      </td>
                      <td className="py-3 px-4 font-extrabold text-slate-800">
                        {formatMinutes(record.totalBreakMinutes)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block text-[10px] px-2.5 py-0.5 rounded-full border font-bold ${
                            record.currentStatus === "Working"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                              : record.currentStatus === "On Break"
                                ? "bg-amber-50 text-amber-600 border-amber-200"
                                : record.currentStatus === "Checked Out" ||
                                    record.currentStatus === "Not Checked In"
                                  ? "bg-slate-50 text-slate-500 border-slate-200"
                                  : "bg-indigo-50 text-indigo-600 border-indigo-200"
                          }`}
                        >
                          {isVirtual ? "Absent" : record.currentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900">
                        {isVirtual ? "-" : `${record.activityScore || 100}%`}
                      </td>
                    </tr>
                  );
                })}
                {recentRecords.length === 0 && (
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center py-6 text-slate-400 font-semibold"
                    >
                      No recent attendance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-center">
            <button className="text-[11px] font-bold text-[#5D5FEF] hover:underline cursor-pointer">
              View All Records
            </button>
          </div>
        </div>

        {/* Attendance Notes */}
        <div className={`lg:col-span-3 ${CARD} ${CARD_PAD} space-y-3`}>
          <h3 className={SECTION_TITLE}>Attendance Notes</h3>

          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note for today (optional)"
            rows={3}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[#5D5FEF] placeholder:text-slate-400 bg-slate-50/50"
          />

          <div className="flex justify-end">
            <button
              onClick={handleSaveNote}
              disabled={isSavingNote || !noteText}
              className="flex items-center gap-1.5 bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Note</span>
            </button>
          </div>

          {savedNotes ? (
            <div className="text-left bg-slate-50 border border-slate-100 rounded-xl p-3">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-1">
                Current Saved Note
              </span>
              <p className="text-slate-700 font-medium text-xs whitespace-pre-wrap">
                {savedNotes}
              </p>
            </div>
          ) : (
            <div className="pt-1 border-t border-slate-100 text-xs font-semibold text-slate-400 text-center">
              No notes for today
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER BANNER ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-indigo-50/50 border border-indigo-100 rounded-2xl px-5 py-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-[#5D5FEF] text-white p-2 rounded-xl">
            <Info className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold text-slate-700">
            Make sure your desktop agent is running to keep your attendance
            updated.
          </span>
        </div>

        <button className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#5D5FEF] transition cursor-pointer">
          <span>Need Help?</span>
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>

      {/* ── BREAK MODAL ── */}
      {showBreakModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 font-bold flex items-center justify-center border border-amber-200">
                  <Coffee className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Select Break Type
                  </h3>
                  <p className="text-xs font-semibold text-slate-500">
                    Choose reason for your break
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBreakModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-2.5">
                {breakOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = breakReason === opt.type;
                  return (
                    <div
                      key={opt.type}
                      onClick={() => setBreakReason(opt.type)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? "border-[#5D5FEF] bg-indigo-50/50 shadow-sm"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center border ${opt.color}`}
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <span className="text-xs font-extrabold text-slate-900">
                          {opt.label}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-[#5D5FEF] text-white flex items-center justify-center">
                          <Check className="h-3 w-3" />
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
                  className="text-xs px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleStartBreakConfirm(breakReason)}
                  disabled={actionLoading}
                  className="flex items-center gap-2 text-xs px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition cursor-pointer disabled:opacity-50"
                >
                  <Coffee className="h-4 w-4" />
                  <span>Start {breakReason}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── AGENT PAIRING MODAL ───────────────────────────────────────────── */}
      {showPairingModal && (
        <AgentPairingModal
          currentUser={currentUser}
          onClose={() => {
            setShowPairingModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
