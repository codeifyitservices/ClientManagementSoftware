import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Clock, 
  MapPin, 
  Globe, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw,
  Sliders,
  CheckCircle2,
  Navigation,
  Crosshair,
  Wifi,
  ExternalLink,
  Compass,
  AlertCircle,
  Calendar
} from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

const WEEK_DAYS = [
  { key: "Mon", label: "M", full: "Monday" },
  { key: "Tue", label: "T", full: "Tuesday" },
  { key: "Wed", label: "W", full: "Wednesday" },
  { key: "Thu", label: "T", full: "Thursday" },
  { key: "Fri", label: "F", full: "Friday" },
  { key: "Sat", label: "S", full: "Saturday" },
  { key: "Sun", label: "S", full: "Sunday" },
];

export default function AdminAttendanceConfiguration() {
  const [activeTab, setActiveTab] = useState("shifts"); // 'shifts' | 'locations' | 'ip' | 'rules'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detectingGpsIndex, setDetectingGpsIndex] = useState(null);
  const [detectingIpIndex, setDetectingIpIndex] = useState(null);
  const [isDetectingNewLocation, setIsDetectingNewLocation] = useState(false);
  const [isDetectingNewIp, setIsDetectingNewIp] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState({ text: "", type: "info" });

  const [policy, setPolicy] = useState({
    shifts: [
      { 
        name: "General Shift", 
        startTime: "09:30", 
        endTime: "18:30", 
        graceMinutes: 15, 
        halfDayHours: 4, 
        fullDayHours: 8,
        workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      }
    ],
    locations: [
      { name: "Headquarters", address: "Main Office", latitude: 28.6139, longitude: 77.2090, radiusMeters: 100, isRestricted: false }
    ],
    ipWhitelist: [
      { ip: "127.0.0.1", label: "Local Dev" }
    ],
    rules: {
      enableGeofencing: false,
      enableIpValidation: false,
      autoClockOutEnabled: true,
      autoClockOutTime: "23:59",
      requireBreakReason: true,
      maxDailyBreaks: 5,
      maxTotalBreakMinutes: 60,
      overtimeThresholdMinutes: 30
    }
  });

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await attendanceService.getAdminPolicies();
      const payload = res?.data || res;
      if (payload?.success || res?.success) {
        const d = payload.data || payload.policy || payload;
        const normalizedShifts = (d.shifts || policy.shifts).map((s) => ({
          ...s,
          workingDays: Array.isArray(s.workingDays) && s.workingDays.length > 0 
            ? s.workingDays 
            : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        }));
        setPolicy({
          shifts: normalizedShifts,
          locations: d.locations || policy.locations,
          ipWhitelist: d.ipWhitelist || policy.ipWhitelist,
          rules: { ...policy.rules, ...(d.rules || {}) }
        });
      }
    } catch (err) {
      console.error("Failed to load attendance configuration", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await attendanceService.updateAdminPolicies({
        ...policy,
        enforceGeofence: !!policy.rules?.enableGeofencing,
        enforceIpWhitelist: !!policy.rules?.enableIpValidation,
      });
      setFeedbackMessage({ text: "Attendance settings and policies updated successfully!", type: "success" });
      setTimeout(() => setFeedbackMessage({ text: "", type: "info" }), 4000);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update configuration");
    } finally {
      setSaving(false);
    }
  };

  // Shift helpers
  const addShift = () => {
    setPolicy({
      ...policy,
      shifts: [
        ...policy.shifts,
        { 
          name: "New Shift", 
          startTime: "09:00", 
          endTime: "18:00", 
          graceMinutes: 15, 
          halfDayHours: 4, 
          fullDayHours: 8,
          workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        }
      ]
    });
  };

  const updateShift = (index, field, value) => {
    const updated = [...policy.shifts];
    updated[index][field] = value;
    setPolicy({ ...policy, shifts: updated });
  };

  const toggleShiftDay = (index, dayKey) => {
    const updated = [...policy.shifts];
    const currentDays = updated[index].workingDays || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    if (currentDays.includes(dayKey)) {
      if (currentDays.length > 1) {
        updated[index].workingDays = currentDays.filter((d) => d !== dayKey);
      }
    } else {
      updated[index].workingDays = [...currentDays, dayKey];
    }
    setPolicy({ ...policy, shifts: updated });
  };

  const setShiftDaysPreset = (index, preset) => {
    const updated = [...policy.shifts];
    if (preset === "5days") {
      updated[index].workingDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    } else if (preset === "6days") {
      updated[index].workingDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    } else if (preset === "all") {
      updated[index].workingDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    }
    setPolicy({ ...policy, shifts: updated });
  };

  const removeShift = (index) => {
    setPolicy({
      ...policy,
      shifts: policy.shifts.filter((_, i) => i !== index)
    });
  };

  // ── Geolocation Detection ──
  const detectLocationForIndex = async (index) => {
    setDetectingGpsIndex(index);
    setFeedbackMessage({ text: "Detecting current office coordinates...", type: "info" });

    try {
      const res = await attendanceService.getCurrentPositionAsync();
      if (res.latitude && res.longitude) {
        const lat = res.latitude;
        const lng = res.longitude;
        const accuracy = res.accuracy || 10;
        const updated = [...policy.locations];
        updated[index].latitude = lat;
        updated[index].longitude = lng;
        setPolicy({ ...policy, locations: updated });
        setFeedbackMessage({
          text: `Exact office coordinates detected: ${lat}, ${lng} (±${accuracy}m accuracy)`,
          type: "success"
        });
      } else {
        setFeedbackMessage({ text: `Location detection failed: ${res.error || "Unknown error"}`, type: "error" });
      }
    } catch (err) {
      setFeedbackMessage({ text: `GPS detection failed: ${err.message}`, type: "error" });
    } finally {
      setDetectingGpsIndex(null);
    }
  };

  const addLocationWithAutoDetect = async () => {
    setIsDetectingNewLocation(true);
    setFeedbackMessage({ text: "Detecting current office GPS position...", type: "info" });

    try {
      const res = await attendanceService.getCurrentPositionAsync();
      if (res.latitude && res.longitude) {
        const lat = res.latitude;
        const lng = res.longitude;
        const accuracy = res.accuracy || 10;
        setPolicy({
          ...policy,
          locations: [
            ...policy.locations,
            { name: "Current Office Location", address: "Auto-detected GPS Location", latitude: lat, longitude: lng, radiusMeters: 100, isRestricted: false }
          ]
        });
        setFeedbackMessage({ text: `Added new office with detected coordinates: ${lat}, ${lng} (±${accuracy}m)`, type: "success" });
      } else {
        addLocation();
        setFeedbackMessage({ text: `Added location manually (${res.error || "Location detection failed"})`, type: "info" });
      }
    } catch (err) {
      addLocation();
      setFeedbackMessage({ text: `Added location manually (${err.message})`, type: "info" });
    } finally {
      setIsDetectingNewLocation(false);
    }
  };

  const addLocation = () => {
    setPolicy({
      ...policy,
      locations: [
        ...policy.locations,
        { name: "New Office", address: "", latitude: 0, longitude: 0, radiusMeters: 100, isRestricted: false }
      ]
    });
  };

  const updateLocation = (index, field, value) => {
    const updated = [...policy.locations];
    updated[index][field] = value;
    setPolicy({ ...policy, locations: updated });
  };

  const removeLocation = (index) => {
    setPolicy({
      ...policy,
      locations: policy.locations.filter((_, i) => i !== index)
    });
  };

  // ── IP Detection ──
  const detectIpForIndex = async (index) => {
    try {
      setDetectingIpIndex(index);
      setFeedbackMessage({ text: "Detecting current network IP address...", type: "info" });
      const detectedIp = await attendanceService.detectNetworkInfo();
      const updated = [...policy.ipWhitelist];
      updated[index].ip = detectedIp;
      if (!updated[index].label || updated[index].label === "Office Wi-Fi" || updated[index].label === "Local Dev") {
        updated[index].label = "Current Office Network";
      }
      setPolicy({ ...policy, ipWhitelist: updated });
      setFeedbackMessage({ text: `Current IP address detected: ${detectedIp}`, type: "success" });
    } catch (e) {
      setFeedbackMessage({ text: "Failed to detect IP address", type: "error" });
    } finally {
      setDetectingIpIndex(null);
    }
  };

  const addIpWithAutoDetect = async () => {
    try {
      setIsDetectingNewIp(true);
      setFeedbackMessage({ text: "Detecting current network IP address...", type: "info" });
      const detectedIp = await attendanceService.detectNetworkInfo();
      setPolicy({
        ...policy,
        ipWhitelist: [
          ...policy.ipWhitelist,
          { ip: detectedIp, label: "Current Office Network" }
        ]
      });
      setFeedbackMessage({ text: `Added detected IP: ${detectedIp}`, type: "success" });
    } catch (e) {
      addIp();
    } finally {
      setIsDetectingNewIp(false);
    }
  };

  const addIp = () => {
    setPolicy({
      ...policy,
      ipWhitelist: [...policy.ipWhitelist, { ip: "", label: "Office Wi-Fi" }]
    });
  };

  const updateIp = (index, field, value) => {
    const updated = [...policy.ipWhitelist];
    updated[index][field] = value;
    setPolicy({ ...policy, ipWhitelist: updated });
  };

  const removeIp = (index) => {
    setPolicy({
      ...policy,
      ipWhitelist: policy.ipWhitelist.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-slate-800">Attendance Engine Configuration</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure enterprise shifts, geofencing office perimeters, IP whitelists, and compliance rules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPolicies}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving Changes..." : "Save Configuration"}
          </button>
        </div>
      </div>

      {/* Global Detection Feedback Banner */}
      {feedbackMessage.text && (
        <div className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium transition-all ${
          feedbackMessage.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : feedbackMessage.type === "error"
            ? "bg-rose-50 border-rose-200 text-rose-800"
            : "bg-indigo-50 border-indigo-200 text-indigo-800"
        }`}>
          {feedbackMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : feedbackMessage.type === "error" ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <Compass className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("shifts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === "shifts" ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Clock className="w-4 h-4" /> Shift Timing & Grace
        </button>

        <button
          onClick={() => setActiveTab("locations")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === "locations" ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <MapPin className="w-4 h-4" /> Office Geofences
        </button>

        <button
          onClick={() => setActiveTab("ip")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === "ip" ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Globe className="w-4 h-4" /> IP Whitelisting
        </button>

        <button
          onClick={() => setActiveTab("rules")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === "rules" ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Sliders className="w-4 h-4" /> Policy & Overtime Rules
        </button>
      </div>

      {/* Shifts Tab */}
      {activeTab === "shifts" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-800">Working Shifts</h3>
              <p className="text-xs text-slate-500">Define shift start, end times, grace periods, and minimum work thresholds.</p>
            </div>
            <button
              onClick={addShift}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 font-bold rounded-xl text-xs hover:bg-indigo-100 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Shift
            </button>
          </div>

          <div className="space-y-3">
            {policy.shifts.map((s, idx) => {
              const currentDays = s.workingDays || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
              return (
                <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3.5">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Shift Name</label>
                      <input
                        type="text"
                        value={s.name}
                        onChange={(e) => updateShift(idx, "name", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-semibold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Start Time</label>
                      <input
                        type="time"
                        value={s.startTime}
                        onChange={(e) => updateShift(idx, "startTime", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">End Time</label>
                      <input
                        type="time"
                        value={s.endTime}
                        onChange={(e) => updateShift(idx, "endTime", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Grace Period (Mins)</label>
                      <input
                        type="number"
                        value={s.graceMinutes}
                        onChange={(e) => updateShift(idx, "graceMinutes", parseInt(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Full Day (Hrs)</label>
                      <input
                        type="number"
                        value={s.fullDayHours}
                        onChange={(e) => updateShift(idx, "fullDayHours", parseFloat(e.target.value) || 8)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium text-slate-800"
                      />
                    </div>
                    <div className="flex justify-end pt-4 md:pt-0">
                      <button
                        onClick={() => removeShift(idx)}
                        title="Delete Shift"
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Week Days Selection (Attendance Required Schedule) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/80">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase mb-1.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Working Days (Attendance Schedule):</span>
                        <span className="text-[11px] font-bold text-indigo-600 normal-case">
                          {currentDays.length === 7 
                            ? "All 7 Days Required" 
                            : `${currentDays.length} Days/Wk (${currentDays.join(", ")})`}
                        </span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        {WEEK_DAYS.map((day) => {
                          const isSelected = currentDays.includes(day.key);
                          return (
                            <button
                              key={day.key}
                              type="button"
                              onClick={() => toggleShiftDay(idx, day.key)}
                              title={`${day.full} (${isSelected ? "Active Working Day" : "Weekly Off / Non-working"})`}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center select-none ${
                                isSelected
                                  ? "bg-indigo-600 text-white shadow-xs hover:bg-indigo-700"
                                  : "bg-white text-slate-400 border border-slate-200 hover:border-slate-300 hover:text-slate-600"
                              }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Presets:</span>
                      <button
                        type="button"
                        onClick={() => setShiftDaysPreset(idx, "5days")}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                      >
                        Mon - Fri
                      </button>
                      <button
                        type="button"
                        onClick={() => setShiftDaysPreset(idx, "6days")}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                      >
                        Mon - Sat
                      </button>
                      <button
                        type="button"
                        onClick={() => setShiftDaysPreset(idx, "all")}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                      >
                        All 7 Days
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Geofencing Locations Tab */}
      {activeTab === "locations" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-800">Office Coordinates & Geofencing</h3>
              <p className="text-xs text-slate-500">Configure physical office GPS coordinates and allowed check-in radius.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={addLocationWithAutoDetect}
                disabled={isDetectingNewLocation}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Crosshair className={`w-3.5 h-3.5 ${isDetectingNewLocation ? "animate-spin" : ""}`} />
                <span>{isDetectingNewLocation ? "Detecting GPS..." : "📍 Auto-Detect & Add Office Location"}</span>
              </button>
              <button
                onClick={addLocation}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 font-bold rounded-xl text-xs hover:bg-indigo-100 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Location
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {policy.locations.map((loc, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Office Name</label>
                    <input
                      type="text"
                      value={loc.name}
                      onChange={(e) => updateLocation(idx, "name", e.target.value)}
                      placeholder="e.g. Headquarters / Branch 1"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Latitude</label>
                      <button
                        type="button"
                        onClick={() => detectLocationForIndex(idx)}
                        disabled={detectingGpsIndex === idx}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Navigation className={`w-2.5 h-2.5 ${detectingGpsIndex === idx ? "animate-spin" : ""}`} />
                        {detectingGpsIndex === idx ? "Detecting..." : "Detect GPS"}
                      </button>
                    </div>
                    <input
                      type="number"
                      step="0.000001"
                      value={loc.latitude}
                      onChange={(e) => updateLocation(idx, "latitude", parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={loc.longitude}
                      onChange={(e) => updateLocation(idx, "longitude", parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Radius (Meters)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={loc.radiusMeters}
                        onChange={(e) => updateLocation(idx, "radiusMeters", parseInt(e.target.value) || 100)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                      <button
                        onClick={() => removeLocation(idx)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer shrink-0"
                        title="Delete location"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {loc.latitude && loc.longitude && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      Coordinates: <code className="font-mono text-slate-700">{loc.latitude}, {loc.longitude}</code> (±{loc.radiusMeters}m geofence)
                    </span>
                    <a
                      href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
                    >
                      <span>Preview in Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* IP Whitelist Tab */}
      {activeTab === "ip" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-800">Authorized IP Addresses</h3>
              <p className="text-xs text-slate-500">Specify network IP addresses or office subnets allowed for clock-in validation.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={addIpWithAutoDetect}
                disabled={isDetectingNewIp}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Wifi className={`w-3.5 h-3.5 ${isDetectingNewIp ? "animate-spin" : ""}`} />
                <span>{isDetectingNewIp ? "Detecting IP..." : "🌐 Detect & Add Current IP"}</span>
              </button>
              <button
                onClick={addIp}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 font-bold rounded-xl text-xs hover:bg-indigo-100 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add IP Address
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {policy.ipWhitelist.map((item, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-5">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">IP Address</label>
                    <button
                      type="button"
                      onClick={() => detectIpForIndex(idx)}
                      disabled={detectingIpIndex === idx}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Wifi className={`w-2.5 h-2.5 ${detectingIpIndex === idx ? "animate-spin" : ""}`} />
                      {detectingIpIndex === idx ? "Detecting..." : "Detect My IP"}
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. 192.168.1.1 or 103.21.244.2"
                    value={item.ip}
                    onChange={(e) => updateIp(idx, "ip", e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div className="md:col-span-6">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Description / Location Label</label>
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => updateIp(idx, "label", e.target.value)}
                    placeholder="e.g. Office Wi-Fi Router / Static Gateway"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="md:col-span-1 flex justify-end pt-2 md:pt-4">
                  <button
                    onClick={() => removeIp(idx)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                    title="Delete IP entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === "rules" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-800">Compliance & Validation Rules</h3>
            <p className="text-xs text-slate-500">Configure system enforcement flags, break duration rules, and overtime calculations.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.rules.enableGeofencing}
                  onChange={(e) => setPolicy({ ...policy, rules: { ...policy.rules, enableGeofencing: e.target.checked } })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">Strict Geofencing Enforcement</div>
                  <div className="text-[11px] text-slate-500">Flag check-ins performed outside allowed office GPS radius</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.rules.enableIpValidation}
                  onChange={(e) => setPolicy({ ...policy, rules: { ...policy.rules, enableIpValidation: e.target.checked } })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">IP Whitelist Enforcement</div>
                  <div className="text-[11px] text-slate-500">Verify client IP matches approved office networks</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.rules.autoClockOutEnabled}
                  onChange={(e) => setPolicy({ ...policy, rules: { ...policy.rules, autoClockOutEnabled: e.target.checked } })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">Auto Clock-Out at Midnight</div>
                  <div className="text-[11px] text-slate-500">Automatically close un-punched clock-outs to prevent runaway hour accumulation</div>
                </div>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Max Total Daily Break (Minutes)</label>
                <input
                  type="number"
                  value={policy.rules.maxTotalBreakMinutes || 60}
                  onChange={(e) => setPolicy({ ...policy, rules: { ...policy.rules, maxTotalBreakMinutes: parseInt(e.target.value) || 60 } })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Overtime Trigger Threshold (Minutes over shift)</label>
                <input
                  type="number"
                  value={policy.rules.overtimeThresholdMinutes || 30}
                  onChange={(e) => setPolicy({ ...policy, rules: { ...policy.rules, overtimeThresholdMinutes: parseInt(e.target.value) || 30 } })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
