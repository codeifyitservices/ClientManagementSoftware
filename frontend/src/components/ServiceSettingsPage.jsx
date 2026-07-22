import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sliders, Save, Plus, Edit2, Trash2, X, Hash, Percent, FileText } from "lucide-react";

export default function ServiceSettingsPage({ token }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states for creating/editing services
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    sacCode: "",
    gstRate: 18,
  });
  const [submitting, setSubmitting] = useState(false);

  const API_SERVICES = "http://localhost:5000/api/services";

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(API_SERVICES, {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem("token")}`,
        },
      });
      if (!res.ok) throw new Error("Failed to load services settings.");
      const data = await res.json();
      setServices(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [token]);

  const handleOpenAddModal = () => {
    setEditingServiceId(null);
    setServiceForm({ name: "", sacCode: "", gstRate: 18 });
    setError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (service) => {
    setEditingServiceId(service._id);
    setServiceForm({
      name: service.name,
      sacCode: service.sacCode,
      gstRate: service.gstRate,
    });
    setError("");
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setServiceForm((prev) => ({
      ...prev,
      [name]: name === "gstRate" ? Number(value) || 0 : value,
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!serviceForm.name.trim() || !serviceForm.sacCode.trim()) {
      setError("Please fill out all required fields.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    const isEdit = !!editingServiceId;
    const url = isEdit ? `${API_SERVICES}/${editingServiceId}` : API_SERVICES;
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || localStorage.getItem("token")}`,
        },
        body: JSON.stringify(serviceForm),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to save service configuration.");
      }

      setSuccess(isEdit ? "Service updated successfully!" : "Service added successfully!");
      setIsModalOpen(false);
      fetchServices();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm("Are you sure you want to delete this service? Invoices using this name won't be modified.")) {
      return;
    }

    try {
      const res = await fetch(`${API_SERVICES}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) throw new Error("Failed to delete service profile.");
      setSuccess("Service deleted successfully.");
      fetchServices();
      setTimeout(() => setSuccess(""), 4500);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full animate-fade-in font-sans space-y-6">
      
      {/* Title block - Spans full width */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <Sliders className="h-5 w-5 text-[#5D5FEF] mt-0.5" />
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 leading-none">Service settings</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              Configure prefilled billing services, SAC tax codes, and GST rates.
            </p>
          </div>
        </div>
        
        <button
          onClick={handleOpenAddModal}
          className="bg-[#5D5FEF] hover:bg-[#4d4fdf] active:bg-[#4345d2] text-white font-bold px-3.5 py-1.5 rounded-xl text-[11px] transition-all flex items-center gap-1 shadow-sm cursor-pointer ml-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Service</span>
        </button>
      </div>

      {error && !isModalOpen && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700 font-semibold animate-shake">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-700 font-semibold animate-fade-in">
          {success}
        </div>
      )}

      {/* Services List Table - Spans full width */}
      <div className="bg-white border border-slate-100 rounded-2xl custom-shadow overflow-hidden">
        {loading && services.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400 font-semibold">Loading services...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                  <th className="py-4 px-6">Service</th>
                  <th className="py-4 px-6">SAC Code</th>
                  <th className="py-4 px-6">GST Rate</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                {services.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-16 text-center text-slate-400 font-semibold">
                      No billing services configured. Click Add Service to register one.
                    </td>
                  </tr>
                ) : (
                  services.map((service) => (
                    <tr key={service._id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-900">{service.name}</td>
                      <td className="py-4 px-6 font-mono text-[11px] text-slate-500">{service.sacCode}</td>
                      <td className="py-4 px-6">
                        <span className="bg-indigo-50 text-[#5D5FEF] px-2 py-0.5 rounded text-[10px] font-bold">
                          {service.gstRate}%
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(service)}
                            className="p-1 rounded text-slate-400 hover:bg-slate-150 hover:text-slate-800 cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service._id)}
                            className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Service Modal - Rendered via Portal to ensure full screen coverage */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-sm w-full custom-shadow overflow-hidden animate-fade-in">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-950">
                  {editingServiceId ? "Edit Service" : "Add Service"}
                </h4>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-[11px] text-red-650 font-semibold animate-shake">
                  {error}
                </div>
              )}

              {/* Service Name */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Service Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="name"
                    value={serviceForm.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Mobile App Development"
                    className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  />
                  <FileText className="absolute right-3.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* SAC Code */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  SAC Code <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="sacCode"
                    value={serviceForm.sacCode}
                    onChange={handleInputChange}
                    placeholder="e.g. 998314"
                    className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  />
                  <Hash className="absolute right-3.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* GST rate */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  GST Rate (%) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="gstRate"
                    value={serviceForm.gstRate}
                    onChange={handleInputChange}
                    placeholder="e.g. 18"
                    className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                  />
                  <Percent className="absolute right-3.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-650 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <Save className="h-3.5 w-3.5" />
                  <span>{editingServiceId ? "Save Changes" : "Create Service"}</span>
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
