import React, { useState, useEffect } from "react";
import { Sliders, Save, Image } from "lucide-react";

export default function InvoiceConfigPage() {
  const [config, setConfig] = useState({
    companyName: "",
    companyEmail: "",
    companyPhone: "",
    companyAddress: "",
    companyGst: "",
    invoiceTerms: "",
    companyLogo: "",
  });
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [configError, setConfigError] = useState("");
  const [configSuccess, setConfigSuccess] = useState("");

  const API_CONFIG_URL = `${import.meta.env.VITE_BACKEND_URL}/api/clients/config`;

  const fetchConfig = async () => {
    try {
      setLoadingConfig(true);
      const res = await fetch(API_CONFIG_URL, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!res.ok)
        throw new Error("Failed to load invoice layout configuration.");
      const data = await res.json();
      setConfig({
        companyName: data.companyName || "",
        companyEmail: data.companyEmail || "",
        companyPhone: data.companyPhone || "",
        companyAddress: data.companyAddress || "",
        companyGst: data.companyGst || "",
        invoiceTerms: data.invoiceTerms || "",
        companyLogo: data.companyLogo || "",
      });
    } catch (err) {
      setConfigError(err.message);
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLogoUploading(true);
    setConfigError("");
    setConfigSuccess("");

    const formData = new FormData();
    formData.append("logo", file);

    try {
      const res = await fetch(`${API_CONFIG_URL}/logo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to upload logo.");
      }

      const data = await res.json();
      setConfig((prev) => ({ ...prev, companyLogo: data.companyLogo }));
      setConfigSuccess("Company logo updated successfully!");

      // Dispatch layout config event so that header / previews sync up immediately
      window.dispatchEvent(new Event("companyConfigUpdated"));
      setTimeout(() => setConfigSuccess(""), 4000);
    } catch (err) {
      setConfigError(err.message);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigError("");
    setConfigSuccess("");
    try {
      const res = await fetch(API_CONFIG_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(config),
      });

      if (!res.ok) throw new Error("Failed to save invoice configuration.");
      setConfigSuccess("Invoice layout settings updated successfully!");

      window.dispatchEvent(new Event("companyConfigUpdated"));
      setTimeout(() => setConfigSuccess(""), 4000);
    } catch (err) {
      setConfigError(err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in font-sans">
      <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow">
        <div className="flex items-center gap-2 pb-4 mb-5 border-b border-slate-100">
          <Sliders className="h-5 w-5 text-[#5D5FEF]" />
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Company & Layout Settings
            </h3>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              Customize company details, GSTIN parameters, brand logos, and
              invoice footnotes.
            </p>
          </div>
        </div>

        {configError && (
          <div className="p-4 mb-4 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700 font-semibold animate-shake">
            {configError}
          </div>
        )}

        {configSuccess && (
          <div className="p-4 mb-4 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-700 font-semibold animate-fade-in">
            {configSuccess}
          </div>
        )}

        {loadingConfig ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-[#5D5FEF] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400 font-semibold">
              Loading settings...
            </span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* BRAND LOGO FILE UPLOAD MODULE */}
            <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                {config.companyLogo ? (
                  <div className="h-16 w-24 bg-white border border-slate-200/60 rounded-xl overflow-hidden flex items-center justify-center p-1.5 shadow-sm shrink-0">
                    <img
                      src={`${import.meta.env.VITE_BACKEND_URL}/uploads/${config.companyLogo}`}
                      alt="Company Logo Preview"
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-16 w-24 rounded-xl bg-slate-100/60 border border-dashed border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                    <Image className="h-6 w-6 opacity-40" />
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Brand Logo Image
                  </h4>
                  <p className="text-[10px] text-slate-450 font-semibold mt-0.5">
                    Upload a custom company logo (PNG, JPG) to print on invoice
                    headers.
                  </p>
                </div>
              </div>

              <div>
                <input
                  type="file"
                  id="logo-upload-input"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <label
                  htmlFor="logo-upload-input"
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-sm inline-block select-none"
                >
                  {logoUploading ? "Uploading..." : "Upload Logo"}
                </label>
              </div>
            </div>

            {/* General Form Fields */}
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company Name */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={config.companyName}
                    onChange={handleConfigChange}
                    required
                    placeholder="e.g. Codenap IT Services"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                {/* Company GSTIN */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Company GSTIN
                  </label>
                  <input
                    type="text"
                    name="companyGst"
                    value={config.companyGst}
                    onChange={handleConfigChange}
                    required
                    placeholder="e.g. 06AABCT1234Q1Z5"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 text-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company Email */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Billing Email Address
                  </label>
                  <input
                    type="email"
                    name="companyEmail"
                    value={config.companyEmail}
                    onChange={handleConfigChange}
                    required
                    placeholder="billing@company.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                {/* Company Phone */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    name="companyPhone"
                    value={config.companyPhone}
                    onChange={handleConfigChange}
                    required
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Company Address */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Postal Address
                </label>
                <textarea
                  name="companyAddress"
                  value={config.companyAddress}
                  onChange={handleConfigChange}
                  required
                  rows="3"
                  placeholder="123 Corporate Tower, Phase 1, Bangalore, KA 560001"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white"
                />
              </div>

              {/* Invoice Terms */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Payment Terms & Conditions
                </label>
                <textarea
                  name="invoiceTerms"
                  value={config.invoiceTerms}
                  onChange={handleConfigChange}
                  required
                  rows="2"
                  placeholder="Thank you for your business! Please settle outstanding balances within 15 days."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/30 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="w-full bg-[#5D5FEF] hover:bg-[#4d4fdf] active:bg-[#4345d2] text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingConfig ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="h-4.5 w-4.5" />
                  )}
                  <span>Save Layout Settings</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
