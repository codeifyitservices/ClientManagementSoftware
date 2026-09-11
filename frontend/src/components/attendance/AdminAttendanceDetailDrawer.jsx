import React from "react";
import { 
  X, 
  Clock, 
  MapPin, 
  Coffee, 
  ShieldCheck, 
  ShieldAlert, 
  Globe, 
  Laptop, 
  User, 
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  ArrowRight
} from "lucide-react";

export default function AdminAttendanceDetailDrawer({ record, onClose }) {
  if (!record) return null;

  const inTime = record.clockInTime ? new Date(record.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Not recorded";
  const outTime = record.clockOutTime ? new Date(record.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Not checked out";
  const dateStr = record.date ? new Date(record.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "";

  // Build sequential timeline events
  const timelineEvents = [];
  if (record.clockInTime) {
    timelineEvents.push({
      time: new Date(record.clockInTime),
      type: "CLOCK_IN",
      title: "Clocked In",
      subtitle: record.locationMode || "Office",
      location: record.clockInLocation,
      coords: record.clockInLatitude ? `${record.clockInLatitude.toFixed(4)}, ${record.clockInLongitude?.toFixed(4)}` : null,
      ip: record.clockInIp,
      status: record.isLate ? `Late by ${record.lateMinutes}m` : "On Time",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200"
    });
  }

  (record.breaks || []).forEach((b, idx) => {
    if (b.startTime) {
      timelineEvents.push({
        time: new Date(b.startTime),
        type: "BREAK_START",
        title: `Break #${idx + 1} Started`,
        subtitle: b.type || "General Break",
        duration: null,
        badgeColor: "bg-amber-50 text-amber-700 border-amber-200"
      });
    }
    if (b.endTime) {
      timelineEvents.push({
        time: new Date(b.endTime),
        type: "BREAK_END",
        title: `Break #${idx + 1} Ended`,
        subtitle: `Duration: ${b.duration || 0} minutes`,
        duration: b.duration,
        badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200"
      });
    }
  });

  if (record.clockOutTime) {
    timelineEvents.push({
      time: new Date(record.clockOutTime),
      type: "CLOCK_OUT",
      title: "Clocked Out",
      subtitle: record.isEarlyCheckout ? `Early Checkout (-${record.earlyCheckoutMinutes}m)` : "Normal Checkout",
      location: record.clockOutLocation,
      coords: record.clockOutLatitude ? `${record.clockOutLatitude.toFixed(4)}, ${record.clockOutLongitude?.toFixed(4)}` : null,
      ip: record.clockOutIp,
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200"
    });
  }

  // Sort timeline chronologically
  timelineEvents.sort((a, b) => a.time - b.time);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Attendance Audit Detail</h3>
            <p className="text-xs text-slate-500">{dateStr}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Employee Header Profile */}
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-base uppercase">
              {record.user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-800 truncate">{record.user?.name || "Unknown"}</h4>
              <p className="text-xs text-slate-500 truncate">{record.user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                  {record.user?.department || "General"}
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                  Shift: {record.shift || "General (9:30-18:30)"}
                </span>
              </div>
            </div>
            <div>
              <span className="text-xs px-3 py-1 font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                {record.status}
              </span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Gross Duration</span>
              <p className="text-lg font-bold text-slate-800 mt-0.5">
                {(record.grossHours || record.totalHours || 0).toFixed(2)} hrs
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
              <span className="text-[11px] font-semibold text-emerald-600 uppercase">Net Work Hours</span>
              <p className="text-lg font-bold text-emerald-700 mt-0.5">
                {(record.totalHours || 0).toFixed(2)} hrs
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
              <span className="text-[11px] font-semibold text-amber-600 uppercase">Total Breaks</span>
              <p className="text-lg font-bold text-amber-700 mt-0.5">
                {record.totalBreakMinutes || 0} mins
              </p>
            </div>
          </div>

          {/* Visual Activity Timeline */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Visual Activity Timeline
            </h5>
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {timelineEvents.map((evt, idx) => (
                <div key={idx} className="relative group">
                  {/* Dot */}
                  <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${
                    evt.type === "CLOCK_IN" ? "bg-emerald-500" :
                    evt.type === "CLOCK_OUT" ? "bg-slate-700" :
                    evt.type === "BREAK_START" ? "bg-amber-500" : "bg-indigo-500"
                  }`} />
                  
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">{evt.title}</span>
                      <span className="text-xs font-mono font-semibold text-indigo-600">
                        {evt.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    {evt.subtitle && (
                      <p className="text-xs text-slate-500 mt-0.5">{evt.subtitle}</p>
                    )}
                    {evt.location && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{evt.location}</span>
                      </div>
                    )}
                    {evt.coords && (
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        GPS: {evt.coords}
                      </div>
                    )}
                    {evt.ip && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-0.5">
                        <Globe className="w-3 h-3 text-slate-400" />
                        IP: {evt.ip}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verification & Compliance Details */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Security & Geofence Compliance
            </h5>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between items-center">
                <span>Geofence Verification:</span>
                <span className="font-semibold text-slate-800">{record.geofenceStatus || "Verified / Default Office"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>IP Whitelist Check:</span>
                <span className="font-semibold text-slate-800">{record.ipValidationStatus || "Allowed"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Punctuality Status:</span>
                <span className={record.isLate ? "font-semibold text-rose-600" : "font-semibold text-emerald-600"}>
                  {record.isLate ? `Late by ${record.lateMinutes} mins` : "On-Time Arrival"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Overtime Logged:</span>
                <span className="font-semibold text-slate-800">{record.overtimeMinutes || 0} minutes</span>
              </div>
            </div>
          </div>

          {/* Regularization History if any */}
          {record.regularizationStatus && record.regularizationStatus !== "None" && (
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-2">
              <h5 className="text-xs font-bold uppercase text-purple-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-purple-600" />
                Regularization Request: {record.regularizationStatus}
              </h5>
              <p className="text-xs text-purple-800">
                Reason: {record.regularizationReason || "No explanation provided"}
              </p>
              {record.requestedClockIn && (
                <p className="text-[11px] text-purple-700">
                  Requested In: {new Date(record.requestedClockIn).toLocaleTimeString()} | Out: {record.requestedClockOut ? new Date(record.requestedClockOut).toLocaleTimeString() : "--"}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-900 transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
