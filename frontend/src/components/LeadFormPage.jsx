import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, User, Phone, Mail, TrendingUp, Save, Briefcase, FileText } from "lucide-react";
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from "../utils/currencyUtils";

export default function LeadFormPage({
  token,
  showToast,
  authenticatedFetch
}) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [leadName, setLeadName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("Website");
  const [currency, setCurrency] = useState("INR (₹)");
  const [value, setValue] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [notes, setNotes] = useState("");

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/employees?limit=1000`, {
          headers: {
            Authorization: `Bearer ${token || localStorage.getItem("token")}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setEmployees(data.employees || []);
        }
      } catch (err) {}
    };

    const fetchLeadDetails = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/leads/${id}`, {
          headers: {
            Authorization: `Bearer ${token || localStorage.getItem("token")}`
          }
        });
        if (res.ok) {
          const lead = await res.json();
          setLeadName(lead.leadName || "");
          setCompanyName(lead.companyName || "");
          setEmail(lead.email || "");
          setPhone(lead.phone || "");
          setSource(lead.source || "Website");
          setValue(lead.value !== undefined ? String(lead.value) : "");
          setAssignedTo(lead.assignedTo?._id || lead.assignedTo || "");
          setNotes(lead.notes || "");
        } else {
          setError("Failed to fetch lead details.");
          if (showToast) showToast("Failed to fetch lead details.", "error");
        }
      } catch (err) {
        setError("Error loading lead details.");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
    if (isEdit) {
      fetchLeadDetails();
    }
  }, [id, token, isEdit]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!leadName.trim()) {
      const msg = "Lead Contact Name is required.";
      setError(msg);
      if (showToast) showToast(msg, "error");
      return;
    }

    setIsSaving(true);
    const leadData = {
      leadName,
      companyName,
      email,
      phone,
      source,
      value: value ? Number(value) : 0,
      assignedTo: assignedTo || null,
      notes,
    };

    try {
      const url = isEdit
        ? `${import.meta.env.VITE_BACKEND_URL}/api/leads/${id}`
        : `${import.meta.env.VITE_BACKEND_URL}/api/leads`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || localStorage.getItem("token")}`
        },
        body: JSON.stringify(leadData)
      });

      if (res.ok) {
        if (showToast) showToast(isEdit ? "Lead updated successfully." : "Lead created successfully.", "success");
        navigate(isEdit ? `/leads/${id}` : "/leads");
      } else {
        const errorData = await res.json();
        setError(errorData.message || "Failed to save lead.");
        if (showToast) showToast(errorData.message || "Failed to save lead.", "error");
      }
    } catch (err) {
      setError("Network error saving lead.");
      if (showToast) showToast("Error saving lead.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-semibold">Loading details...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans select-none animate-fade-in pb-12">
      {/* Header section with back button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-505 hover:bg-slate-50 transition-all cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-tight">
              {isEdit ? "Modify Lead Parameters" : "Launch Prospective Lead Profile"}
            </h2>
            <p className="text-[10px] text-slate-450 font-semibold mt-1">
              {isEdit ? "Update this prospective client's details and properties" : "Configure initial parameters for a new pipeline lead"}
            </p>
          </div>
        </div>

        {/* Top bar action buttons */}
        <div className="flex items-center gap-2.5 ml-11 sm:ml-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-xl text-slate-650 hover:bg-slate-50 border border-slate-200 text-xs font-bold transition-all cursor-pointer bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleFormSubmit}
            disabled={isSaving}
            className="bg-[#5D5FEF] hover:bg-[#4d4fdf] active:bg-[#4345d2] text-white font-bold px-4.5 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-500/10 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isSaving ? "Saving..." : isEdit ? "Save Changes" : "Create Lead"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-500 bg-red-50 p-4.5 rounded-xl border border-red-100 font-semibold max-w-4xl mx-auto">
          {error}
        </div>
      )}

      {/* Main Grid: Form Left, Side Helper Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Container (Left 2 columns) */}
        <form onSubmit={handleFormSubmit} className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 custom-shadow space-y-6">
          
          {/* Section 1: Contact Coordinates */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-slate-900 border-b border-slate-50 pb-2 flex items-center gap-2">
              <User className="h-4 w-4 text-[#5D5FEF]" />
              <span>Contact Coordinates</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Lead Name */}
              <div className="sm:col-span-2">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Lead Contact Name *
                </label>
                <input
                  type="text"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="e.g. Priyesh Shah"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              {/* Company Name */}
              <div className="sm:col-span-2">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Company / Organization Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Apex Digital Solutions"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. contact@apex.com"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <Mail className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <Phone className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Pipeline Deal Parameters */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-extrabold text-slate-900 border-b border-slate-50 pb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#5D5FEF]" />
              <span>Pipeline & Deal Parameters</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Source */}
              <div>
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Lead Source
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none bg-white focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="Website">Website</option>
                  <option value="Referral">Referral</option>
                  <option value="Cold Outreach">Cold Outreach</option>
                  <option value="Google Ads">Google Ads</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Deal Value & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Currency *
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none bg-white focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.label}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Prospective Deal Value ({getCurrencySymbol(currency)}) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
                      {getCurrencySymbol(currency)}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder="e.g. 150000"
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Assigned To Owner */}
              <div className="sm:col-span-2">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Assigned Owner / Lead Account Executive
                </label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-none bg-white focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.fullName} ({emp.department} • {emp.designation})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: General Profile Notes */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-extrabold text-slate-900 border-b border-slate-50 pb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#5D5FEF]" />
              <span>General Background & Notes</span>
            </h3>

            <div>
              <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Profile Notes / Requirements
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="4"
                placeholder="Log prospective needs, size of business, timelines, key hurdles, or custom requests..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              />
            </div>
          </div>
        </form>

        {/* Helper Panel (Right 1 column) */}
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-[#5D5FEF]" strokeWidth={2.5} />
              <span>Modern Lead Tracking</span>
            </h4>
            
            <div className="space-y-3 text-[11px] text-slate-650 font-medium">
              <p>
                Lead progress is recorded as stages in a historical journey log. 
              </p>
              <p>
                Once created, navigate to the Lead's Coordinates detail view to add stage updates, log communication timeline cards, upload quotations, and track sales progress chronologically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
