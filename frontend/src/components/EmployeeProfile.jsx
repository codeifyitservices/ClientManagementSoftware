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

  const handlePincodeChange = async (val) => {
    const clean = val.replace(/\D/g, "").slice(0, 6);
    setForm((f) => ({ ...f, pincode: clean }));
    if (clean.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`);
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
        }
      );
      const data = await res.json();
      if (res.ok) {
        showToast("Profile updated successfully.", "success");
        setEmployee(data);
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
          <span className="text-sm text-slate-400 font-semibold">Loading profile…</span>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="w-full text-center py-20">
        <p className="text-sm text-slate-500 font-semibold">Profile not found.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">
          Go Back
        </button>
      </div>
    );
  }

  // ── Field helpers ─────────────────────────────────────────────────────────
  const Field = ({ label, children, icon: Icon }) => (
    <div className="space-y-1.5">
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
    "w-full px-3.5 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 text-sm font-medium cursor-not-allowed select-none";

  const statusColor =
    employee.status === "Active"
      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
      : "bg-red-50 text-red-600 border border-red-100";

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Breadcrumb */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        {isEmployee ? "Back to Dashboard" : "Back to Employees"}
      </button>

      {/* ── Hero Card ────────────────────────────────────────────────────── */}
      <div className="relative bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        {/* Decorative gradient strip */}
        <div className="h-24 bg-gradient-to-r from-[#5D5FEF] via-indigo-500 to-violet-500" />

        <div className="px-8 pb-6">
          {/* Avatar — overlaps gradient */}
          <div className="flex items-end gap-5 -mt-10">
            <div className="h-20 w-20 rounded-2xl bg-white shadow-lg border-4 border-white flex items-center justify-center text-indigo-600 font-black text-2xl select-none">
              {monogram(employee.fullName)}
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg font-black text-slate-900 leading-tight">
                  {employee.fullName}
                </h1>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${statusColor}`}>
                  {employee.status}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-wider">
                  {employee.employeeId}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                {employee.designation || "—"} &bull; {employee.department || "—"}
              </p>
            </div>
          </div>

          {/* Quick stat row */}
          <div className="mt-5 grid grid-cols-3 gap-4">
            {[
              {
                icon: Building2,
                label: "Department",
                value: employee.department || "—",
              },
              {
                icon: BadgeCheck,
                label: "Role",
                value: employee.role || "Employee",
              },
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
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3"
              >
                <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    {label}
                  </p>
                  <p className="text-xs font-bold text-slate-700 truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Read-Only Work Details ─────────────────────────────────────── */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-50">
          <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Building2 className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <h2 className="text-xs font-black tracking-widest text-slate-700 uppercase">
            Work Information
          </h2>
          <span className="ml-auto text-[9px] bg-slate-100 text-slate-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
            Read-only
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Company Email">
            <div className={readonlyCls}>{employee.companyEmail || "—"}</div>
          </Field>
          <Field label="Designation">
            <div className={readonlyCls}>{employee.designation || "—"}</div>
          </Field>
          <Field label="Employment Type">
            <div className={readonlyCls}>{employee.employmentType || "—"}</div>
          </Field>
        </div>
      </div>

      {/* ── Editable Personal Details ─────────────────────────────────── */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-50">
          <div className="h-6 w-6 rounded-lg bg-violet-50 flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-violet-500" />
          </div>
          <h2 className="text-xs font-black tracking-widest text-slate-700 uppercase">
            Personal Details
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <Field label="Phone Number" icon={Phone}>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+91 99999 99999"
              className={inputCls}
            />
          </Field>

          <Field label="Personal Email" icon={Mail}>
            <input
              type="email"
              value={form.personalEmail}
              onChange={(e) => setForm((f) => ({ ...f, personalEmail: e.target.value }))}
              placeholder="personal@gmail.com"
              className={inputCls}
            />
          </Field>

          <Field label="Date of Birth" icon={Cake}>
            <input
              type="date"
              value={form.dob}
              onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
              className={inputCls}
            />
          </Field>

          <Field label="Gender" icon={User}>
            <select
              value={form.gender}
              onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
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
              onChange={(e) => setForm((f) => ({ ...f, bloodGroup: e.target.value }))}
              className={selectCls}
            >
              <option value="">Select blood group…</option>
              {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </Field>

          <Field label="Emergency Contact" icon={AlertCircle}>
            <input
              type="text"
              value={form.emergencyContact}
              onChange={(e) => setForm((f) => ({ ...f, emergencyContact: e.target.value }))}
              placeholder="Name - Relationship - Phone"
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      {/* ── Address ───────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-50">
          <div className="h-6 w-6 rounded-lg bg-emerald-50 flex items-center justify-center">
            <MapPin className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <h2 className="text-xs font-black tracking-widest text-slate-700 uppercase">
            Residential Address
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-3">
            <Field label="Street / Locality" icon={MapPin}>
              <input
                type="text"
                value={form.street}
                onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
                placeholder="Flat / Building / Street name"
                className={inputCls}
              />
            </Field>
          </div>

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
              className={`${readonlyCls}`}
            />
          </Field>

          <Field label="State">
            <input
              type="text"
              value={form.state}
              disabled
              placeholder="Auto-filled"
              className={`${readonlyCls}`}
            />
          </Field>
        </div>
      </div>

      {/* ── Save Button ───────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-[#5D5FEF] hover:bg-[#4d4fdf] active:bg-[#4345d2] disabled:opacity-60 text-white font-bold text-sm rounded-2xl shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
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
  );
}
