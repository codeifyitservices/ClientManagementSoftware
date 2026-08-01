import React, { useState, useEffect } from "react";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Heart,
  AlertCircle,
  Cake,
  Save,
  Loader2,
  Building2,
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  IdCard,
  Home,
} from "lucide-react";

export default function EmployeeProfile({
  employeeId,
  token,
  currentUser,
  onBack,
  showToast,
}) {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");

  // Editable fields
  const [form, setForm] = useState({
    phone: "",
    personalEmail: "",
    dob: "",
    gender: "",
    bloodGroup: "",
    emergencyContact: "",
    street: "",
    pincode: "",
    city: "",
    state: "",
  });

  const isEmployee = currentUser?.role === "Employee";

  const fetchEmployee = async () => {
    setLoading(true);
    try {
      // Use /me when no employeeId — resolves identity from the auth token
      const url = employeeId
        ? `${import.meta.env.VITE_BACKEND_URL}/api/employees/${employeeId}`
        : `${import.meta.env.VITE_BACKEND_URL}/api/employees/me`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setEmployee(data);
        const addr = data.address || "";
        const match = addr.match(/^(.*),\s*([^,]+),\s*([^-]+)\s*-\s*(\d{6})$/);
        setForm({
          phone: data.phoneNumber || "",
          personalEmail: data.personalEmail || "",
          dob: data.dob ? data.dob.split("T")[0] : "",
          gender: data.gender || "",
          bloodGroup: data.bloodGroup || "",
          emergencyContact: data.emergencyContact || "",
          street: match ? match[1].trim() : addr,
          city: match ? match[2].trim() : "",
          state: match ? match[3].trim() : "",
          pincode: match ? match[4].trim() : "",
        });
        setDirty(false);
      } else {
        showToast(data.message || "Failed to load profile.", "error");
      }
    } catch {
      showToast("Network error loading profile.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Always fetch — either by employeeId or via /me (token-based)
  useEffect(() => {
    fetchEmployee();
  }, [employeeId]);

  const updateForm = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  const handlePincodeChange = async (val) => {
    const clean = val.replace(/\D/g, "").slice(0, 6);
    updateForm({ pincode: clean });
    if (clean.length === 6) {
      try {
        const res = await fetch(
          `https://api.postalpincode.in/pincode/${clean}`,
        );
        const data = await res.json();
        if (data?.[0]?.Status === "Success") {
          const po = data[0].PostOffice[0];
          setForm((f) => ({
            ...f,
            city: po.District || po.Name || f.city,
            state: po.State || f.state,
          }));
        }
      } catch {}
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const address =
        form.street && form.city && form.state && form.pincode
          ? `${form.street}, ${form.city}, ${form.state} - ${form.pincode}`
          : form.street;

      const payload = {
        phoneNumber: form.phone,
        personalEmail: form.personalEmail,
        dob: form.dob || undefined,
        gender: form.gender,
        bloodGroup: form.bloodGroup,
        emergencyContact: form.emergencyContact,
        address,
      };

      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/employees/${employee._id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (res.ok) {
        showToast("Profile updated successfully.", "success");
        setEmployee(data);
        setDirty(false);
      } else {
        showToast(data.message || "Failed to update.", "error");
      }
    } catch {
      showToast("Network error.", "error");
    } finally {
      setSaving(false);
    }
  };

  const monogram = (name = "") =>
    name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full h-96 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400 font-semibold">
            Loading profile…
          </span>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="w-full text-center py-20">
        <p className="text-sm text-slate-500 font-semibold">
          Profile not found.
        </p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  // ── Shared building blocks ───────────────────────────────────────────────
  const Field = ({ label, children, icon: Icon, span }) => (
    <div className={`space-y-1.5 ${span ? "sm:col-span-2" : ""}`}>
      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </label>
      {children}
    </div>
  );

  const inputCls =
    "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-300";
  const selectCls =
    "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer";
  const readonlyCls =
    "w-full px-3.5 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 text-sm font-medium cursor-not-allowed select-none truncate";

  const statusColor =
    employee.status === "Active"
      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
      : "bg-red-50 text-red-600 border border-red-100";

  const sidebarStats = [
    { icon: Building2, label: "Department", value: employee.department || "—" },
    { icon: BadgeCheck, label: "Role", value: employee.role || "Employee" },
    {
      icon: CalendarDays,
      label: "Joined",
      value: employee.joiningDate
        ? new Date(employee.joiningDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "—",
    },
    { icon: Mail, label: "Company Email", value: employee.companyEmail || "—" },
    { icon: IdCard, label: "Designation", value: employee.designation || "—" },
    {
      icon: Building2,
      label: "Employment Type",
      value: employee.employmentType || "—",
    },
  ];

  const tabs = [
    { id: "personal", label: "Personal", icon: User },
    { id: "address", label: "Address", icon: Home },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-28">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {isEmployee ? "Back to Dashboard" : "Back to Employees"}
        </button>
        <span
          className={`hidden sm:block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
            dirty
              ? "bg-amber-50 text-amber-600 border border-amber-100"
              : "bg-slate-50 text-slate-300 border border-slate-100"
          }`}
        >
          {dirty ? "Unsaved changes" : "Up to date"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
        {/* ── Identity sidebar — persistent context ───────────────────── */}
        <aside className="lg:sticky lg:top-6 space-y-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#5D5FEF] to-violet-500 shadow-lg flex items-center justify-center text-white font-black text-xl select-none">
                {monogram(employee.fullName)}
              </div>
              <h1 className="mt-3 text-base font-black text-slate-900 leading-tight">
                {employee.fullName}
              </h1>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                {employee.designation || "—"}
              </p>
              <div className="flex items-center gap-1.5 mt-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${statusColor}`}
                >
                  {employee.status}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-wider">
                  {employee.employeeId}
                </span>
              </div>
            </div>

            <div className="mt-5 pt-5 border-t border-slate-50 space-y-3.5">
              {sidebarStats.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                      {label}
                    </p>
                    <p className="text-xs font-bold text-slate-700 truncate">
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Main content — editable, organized by tabs for focus ──────── */}
        <div className="space-y-4">
          {/* Tab nav */}
          <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-2xl p-1.5 shadow-sm w-fit">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === id
                    ? "bg-[#5D5FEF] text-white shadow-sm shadow-indigo-500/20"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Personal tab */}
          {activeTab === "personal" && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-sm font-black text-slate-800">
                  Contact & basics
                </h2>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  How we reach you and identify you in an emergency.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Phone Number" icon={Phone}>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateForm({ phone: e.target.value })}
                    placeholder="+91 99999 99999"
                    className={inputCls}
                  />
                </Field>

                <Field label="Personal Email" icon={Mail}>
                  <input
                    type="email"
                    value={form.personalEmail}
                    onChange={(e) =>
                      updateForm({ personalEmail: e.target.value })
                    }
                    placeholder="personal@gmail.com"
                    className={inputCls}
                  />
                </Field>

                <Field label="Date of Birth" icon={Cake}>
                  <input
                    type="date"
                    value={form.dob}
                    onChange={(e) => updateForm({ dob: e.target.value })}
                    className={inputCls}
                  />
                </Field>

                <Field label="Gender" icon={User}>
                  <select
                    value={form.gender}
                    onChange={(e) => updateForm({ gender: e.target.value })}
                    className={selectCls}
                  >
                    <option value="">Select gender…</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </Field>

                <Field label="Blood Group" icon={Heart}>
                  <select
                    value={form.bloodGroup}
                    onChange={(e) => updateForm({ bloodGroup: e.target.value })}
                    className={selectCls}
                  >
                    <option value="">Select blood group…</option>
                    {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(
                      (bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <Field label="Emergency Contact" icon={AlertCircle}>
                  <input
                    type="text"
                    value={form.emergencyContact}
                    onChange={(e) =>
                      updateForm({ emergencyContact: e.target.value })
                    }
                    placeholder="Name - Relationship - Phone"
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Address tab */}
          {activeTab === "address" && (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-sm font-black text-slate-800">
                  Residential address
                </h2>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Enter a valid pincode and district / state fill in
                  automatically.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <Field label="Street / Locality" icon={MapPin} span>
                  <input
                    type="text"
                    value={form.street}
                    onChange={(e) => updateForm({ street: e.target.value })}
                    placeholder="Flat / Building / Street name"
                    className={inputCls}
                  />
                </Field>

                <Field label="Pincode">
                  <input
                    type="text"
                    value={form.pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    maxLength={6}
                    placeholder="e.g. 110001"
                    className={inputCls}
                  />
                </Field>

                <Field label="District / City">
                  <input
                    type="text"
                    value={form.city}
                    disabled
                    placeholder="Auto-filled"
                    className={readonlyCls}
                  />
                </Field>

                <Field label="State">
                  <input
                    type="text"
                    value={form.state}
                    disabled
                    placeholder="Auto-filled"
                    className={readonlyCls}
                  />
                </Field>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky save bar ───────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none">
        <div className="max-w-6xl mx-auto px-4 sm:px-0 pb-5 flex justify-end">
          <div className="pointer-events-auto flex items-center gap-4 bg-white/95 backdrop-blur border border-slate-100 shadow-lg shadow-slate-900/5 rounded-2xl px-5 py-3">
            <span className="hidden sm:block text-[11px] font-bold text-slate-400">
              {dirty ? "You have unsaved changes" : "All changes saved"}
            </span>
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#5D5FEF] hover:bg-[#4d4fdf] active:bg-[#4345d2] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
