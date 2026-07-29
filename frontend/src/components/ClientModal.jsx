import React, { useEffect, useState, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Check } from "lucide-react";
import { clientSchema } from "../schemas/clientSchema";

const stateLookup = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
};

export default function ClientModal({
  isOpen,
  onClose,
  onSubmit,
  client = null,
  isSaving = false,
}) {
  const isEdit = !!client;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      companyName: "",
      clientName: "",
      email: "",
      phone: "",
      gstRegistered: true,
      gstNumber: "",
      address: "",
      city: "",
      pincode: "",
      status: "Active",
      website: "",
      industry: "",
      notes: "",
      isForeign: false,
    },
  });

  // Watch field values for dynamic auto-detection
  const gstRegistered = useWatch({ control, name: "gstRegistered" });
  const gstNumber = useWatch({ control, name: "gstNumber" }) || "";
  const isForeign = useWatch({ control, name: "isForeign" }) || false;

  // Auto detect state name & fetch GST details
  const [detectedState, setDetectedState] = useState("");
  const [isFetchingGst, setIsFetchingGst] = useState(false);
  const [gstFetchMessage, setGstFetchMessage] = useState("");
  const lastFetchedGstRef = useRef("");

  const handleFetchGstDetails = async (gstinVal) => {
    const cleanGstin = (gstinVal || gstNumber).trim().toUpperCase();
    if (cleanGstin.length !== 15) return;
    setIsFetchingGst(true);
    setGstFetchMessage("");

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
      const token = localStorage.getItem("token");
      const res = await fetch(`${backendUrl}/api/clients/gstin-lookup/${cleanGstin}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.companyName) {
          setValue("companyName", data.companyName, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
          if (data.address) setValue("address", data.address, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
          if (data.city) setValue("city", data.city, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
          if (data.pincode) setValue("pincode", data.pincode, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
          setGstFetchMessage(`✓ Auto-filled: ${data.companyName}`);
        } else if (data.note) {
          setGstFetchMessage(`GSTIN lookup: ${data.note}`);
        } else if (data.stateName) {
          setGstFetchMessage(`Valid GSTIN format (${data.stateName}). Please enter Company Name.`);
        } else {
          setGstFetchMessage("Valid GSTIN structure. Please enter Company Name.");
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setGstFetchMessage(errData.message || "Error fetching GST details.");
      }
    } catch (err) {
      setGstFetchMessage("GST lookup error: " + err.message);
    } finally {
      setIsFetchingGst(false);
    }
  };

  useEffect(() => {
    if (gstRegistered && gstNumber.length >= 2) {
      const code = gstNumber.trim().slice(0, 2);
      const stateName = stateLookup[code];
      if (stateName) {
        setDetectedState(`${stateName} (${code})`);
      } else {
        setDetectedState("Unknown Code");
      }
      const currentGst = gstNumber.trim().toUpperCase();
      if (currentGst.length === 15 && currentGst !== lastFetchedGstRef.current) {
        lastFetchedGstRef.current = currentGst;
        handleFetchGstDetails(currentGst);
      }
    } else {
      setDetectedState("");
      setGstFetchMessage("");
    }
  }, [gstNumber, gstRegistered]);

  // Load editing client profile
  useEffect(() => {
    if (client) {
      const initialGst = (client.gstNumber || "").trim().toUpperCase();
      lastFetchedGstRef.current = initialGst;
      reset({
        companyName: client.companyName || "",
        clientName: client.clientName || "",
        email: client.email || "",
        phone: client.phone || "",
        gstRegistered: client.gstRegistered !== false,
        gstNumber: client.gstNumber || "",
        address: client.address || "",
        city: client.city || "",
        pincode: client.pincode || "",
        status: client.status || "Active",
        website: client.website || "",
        industry: client.industry || "",
        notes: client.notes || "",
        isForeign: client.isForeign || false,
      });
    } else {
      lastFetchedGstRef.current = "";
      reset({
        companyName: "",
        clientName: "",
        email: "",
        phone: "",
        gstRegistered: true,
        gstNumber: "",
        address: "",
        city: "",
        pincode: "",
        status: "Active",
        website: "",
        industry: "",
        notes: "",
        isForeign: false,
      });
    }
  }, [client, reset, isOpen]);

  if (!isOpen) return null;

  const isGstValid = gstNumber.trim().length === 15;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-100 max-w-5xl w-full custom-shadow overflow-hidden animate-fade-in my-8">
        
        {/* Header Block with Mockup Path Breadcrumbs */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-950">
              {isEdit ? "Update Client Profile" : "Add Client"}
            </h3>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              {isEdit ? "Modify client details and billing coordinates." : "Create a new client profile."}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-slate-400 select-none">
              Clients &nbsp;&gt;&nbsp; {isEdit ? "Edit Profile" : "Add Client"}
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* 3-Column Form Grid */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* COLUMN 1: Basic Information */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-950 pb-1 border-b border-slate-50">
                Basic Information
              </h4>

              {/* Company Name */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter company name"
                  className={`w-full px-3 py-2 rounded-xl border text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white ${
                    errors.companyName ? "border-red-500 bg-red-50/10" : "border-slate-200 bg-slate-50/30"
                  }`}
                  {...register("companyName")}
                />
                {errors.companyName && (
                  <span className="text-[10px] text-red-500 mt-1 block font-semibold">{errors.companyName.message}</span>
                )}
              </div>

              {/* Client Name */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter client name"
                  className={`w-full px-3 py-2 rounded-xl border text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white ${
                    errors.clientName ? "border-red-500 bg-red-50/10" : "border-slate-200 bg-slate-50/30"
                  }`}
                  {...register("clientName")}
                />
                {errors.clientName && (
                  <span className="text-[10px] text-red-500 mt-1 block font-semibold">{errors.clientName.message}</span>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Email Address <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  className={`w-full px-3 py-2 rounded-xl border text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white ${
                    errors.email ? "border-red-500 bg-red-50/10" : "border-slate-200 bg-slate-50/30"
                  }`}
                  {...register("email")}
                />
                {errors.email && (
                  <span className="text-[10px] text-red-500 mt-1 block font-semibold">{errors.email.message}</span>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter phone number"
                  className={`w-full px-3 py-2 rounded-xl border text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white ${
                    errors.phone ? "border-red-500 bg-red-50/10" : "border-slate-200 bg-slate-50/30"
                  }`}
                  {...register("phone")}
                />
                {errors.phone && (
                  <span className="text-[10px] text-red-500 mt-1 block font-semibold">{errors.phone.message}</span>
                )}
              </div>

              {/* Foreign Client Checkbox */}
              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-[#5D5FEF] border-slate-350 rounded focus:ring-0 focus:ring-offset-0 accent-[#5D5FEF]"
                    {...register("isForeign", {
                      onChange: (e) => {
                        const checked = e.target.checked;
                        if (checked) {
                          setValue("gstRegistered", false);
                          setValue("gstNumber", "");
                        }
                      }
                    })}
                  />
                  <span>Foreign Client (No GST)</span>
                </label>
              </div>

              {/* GST Registered? */}
              <div className={`pt-1 transition-opacity duration-350 ${isForeign ? "opacity-30 pointer-events-none" : ""}`}>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  GST Registered?
                </label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                    <input
                      type="radio"
                      value="true"
                      disabled={isForeign}
                      checked={gstRegistered === true && !isForeign}
                      onChange={() => setValue("gstRegistered", true)}
                      className="h-4 w-4 text-[#5D5FEF] focus:ring-0 focus:ring-offset-0 accent-[#5D5FEF]"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                    <input
                      type="radio"
                      value="false"
                      disabled={isForeign}
                      checked={gstRegistered === false || isForeign}
                      onChange={() => {
                        setValue("gstRegistered", false);
                        setValue("gstNumber", "");
                      }}
                      className="h-4 w-4 text-[#5D5FEF] focus:ring-0 focus:ring-offset-0 accent-[#5D5FEF]"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>
            </div>

            {/* COLUMN 2: GST Information */}
            <div className={`space-y-4 transition-opacity duration-300 ${gstRegistered ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-950 pb-1 border-b border-slate-50">
                GST Information
              </h4>

              {/* GSTIN input with validation badge */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    GSTIN <span className="text-red-500">*</span>
                  </label>
                  {gstRegistered && isGstValid && (
                    <span className="bg-emerald-50 border border-emerald-100 text-emerald-600 font-bold px-2 py-0.5 rounded-lg text-[9px] flex items-center gap-0.5 select-none">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                      <span>Valid GSTIN</span>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="06AABCT1234Q1Z5"
                    disabled={!gstRegistered}
                    className={`w-full px-3 py-2 rounded-xl border text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white uppercase font-mono tracking-wider ${
                      errors.gstNumber ? "border-red-500 bg-red-50/10" : "border-slate-200 bg-slate-50/30"
                    }`}
                    {...register("gstNumber")}
                  />
                  {gstRegistered && isGstValid && (
                    <button
                      type="button"
                      onClick={() => {
                        lastFetchedGstRef.current = gstNumber.trim().toUpperCase();
                        handleFetchGstDetails(gstNumber);
                      }}
                      disabled={isFetchingGst}
                      className="absolute right-2 top-1.5 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-[9px] rounded-lg transition-colors cursor-pointer"
                    >
                      {isFetchingGst ? "Fetching..." : "Fetch Details"}
                    </button>
                  )}
                </div>
                {gstFetchMessage && (
                  <span className="text-[10px] text-emerald-600 mt-1 block font-semibold">
                    {gstFetchMessage}
                  </span>
                )}
                {errors.gstNumber && (
                  <span className="text-[10px] text-red-500 mt-1 block font-semibold">{errors.gstNumber.message}</span>
                )}
              </div>

              {/* Auto Detected State */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  State (Auto Detected)
                </label>
                <input
                  type="text"
                  value={detectedState || "—"}
                  readOnly
                  placeholder="Auto detecting state name..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs font-semibold focus:outline-none cursor-not-allowed select-none"
                />
              </div>
            </div>

            {/* COLUMN 3: Billing Address */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-950 pb-1 border-b border-slate-50">
                Billing Address
              </h4>

              {/* Address */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows="3"
                  placeholder="Enter billing address"
                  className={`w-full px-3 py-2 rounded-xl border text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white ${
                    errors.address ? "border-red-500 bg-red-50/10" : "border-slate-200 bg-slate-50/30"
                  }`}
                  {...register("address")}
                />
                {errors.address && (
                  <span className="text-[10px] text-red-500 mt-1 block font-semibold">{errors.address.message}</span>
                )}
              </div>

              {/* City and Pincode Row */}
              <div className="grid grid-cols-2 gap-3">
                {/* City */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter city"
                    className={`w-full px-3 py-2 rounded-xl border text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white ${
                      errors.city ? "border-red-500 bg-red-50/10" : "border-slate-200 bg-slate-50/30"
                    }`}
                    {...register("city")}
                  />
                  {errors.city && (
                    <span className="text-[10px] text-red-500 mt-1 block font-semibold">{errors.city.message}</span>
                  )}
                </div>

                {/* Pincode */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter pincode"
                    className={`w-full px-3 py-2 rounded-xl border text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white ${
                      errors.pincode ? "border-red-500 bg-red-50/10" : "border-slate-200 bg-slate-50/30"
                    }`}
                    {...register("pincode")}
                  />
                  {errors.pincode && (
                    <span className="text-[10px] text-red-500 mt-1 block font-semibold">{errors.pincode.message}</span>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Status
                </label>
                <select
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/30 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white cursor-pointer"
                  {...register("status")}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Action Buttons inside the 3rd Column matching mockup */}
              <div className="flex items-center justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl text-slate-650 hover:bg-slate-50 border border-slate-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#5D5FEF] hover:bg-[#4d4fdf] active:bg-[#4345d2] text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  <span>Save Client</span>
                </button>
              </div>
            </div>

          </div>
        </form>

      </div>
    </div>
  );
}
