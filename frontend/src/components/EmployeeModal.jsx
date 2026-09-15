import React, { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { X, FileUp, Paperclip, Trash2, Eye, EyeOff, KeyRound, Sparkles } from "lucide-react";
import PhoneInputWithCountry from "./PhoneInputWithCountry";

const DEPARTMENTS = ["Engineering", "IT", "Product", "Design", "Marketing", "Sales", "HR", "Finance", "Operations"];
const DESIGNATIONS = [
  "Software Engineer",
  "Senior Software Engineer",
  "MERN Developer",
  "Tech Lead",
  "Product Manager",
  "UI/UX Designer",
  "Marketing Analyst",
  "HR Manager",
  "Financial Analyst",
  "Intern",
  "Director",
];
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Intern", "Contract"];
const GENDERS = ["Male", "Female", "Other"];
const ROLES = ["Admin", "Employee"];

const DEFAULT_PERMISSIONS = [
  "View Employees",
  "Create Employees",
  "Edit Employees",
  "Delete Employees",
  "View Documents",
  "Upload Documents",
  "Delete Documents",
  "Manage Roles",
];

export default function EmployeeModal({
  isOpen,
  onClose,
  onSubmit,
  employee = null,
  isSaving = false,
  employeesList = [], // for reporting manager dropdown
  currentUser = null,
}) {
  const isEdit = !!employee;
  const isEmployee = currentUser?.role === "Employee";
  const canEditCompanyEmail = !isEmployee || currentUser?.permissions?.includes("Edit Employees") || !isEdit;
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    mode: "onChange",
    defaultValues: {
      fullName: "",
      companyEmail: "",
      phoneNumber: "",
      department: "",
      designation: "",
      reportingManager: "",
      employmentType: "Full-time",
      joiningDate: "",
      workLocation: "",
      personalEmail: "",
      dob: "",
      gender: "",
      bloodGroup: "",
      emergencyContact: "",
      streetAddress: "",
      pincode: "",
      city: "",
      state: "",
      aadhaarNumber: "",
      panNumber: "",
      passportNumber: "",
      password: "",
      role: "Employee",
      permissions: ["View Employees", "View Documents", "Upload Documents"],
    },
  });

  const selectedRole = useWatch({ control, name: "role" });
  const phoneNumber = useWatch({ control, name: "phoneNumber" }) || "";

  // Update form fields when editing employee
  useEffect(() => {
    setSelectedFiles([]);
    if (employee) {
      let streetAddress = "";
      let city = "";
      let state = "";
      let pincode = "";

      if (employee.address) {
        const pincodeRegex = /^(.*),\s*([^,]+),\s*([^,]+)\s*-\s*(\d{6})$/;
        const match = employee.address.match(pincodeRegex);
        if (match) {
          streetAddress = match[1].trim();
          city = match[2].trim();
          state = match[3].trim();
          pincode = match[4].trim();
        } else {
          streetAddress = employee.address;
        }
      }

      const formattedEmployee = {
        fullName: employee.fullName || "",
        companyEmail: employee.companyEmail || "",
        phoneNumber: employee.phoneNumber || "",
        department: employee.department || "",
        designation: employee.designation || "",
        reportingManager: employee.reportingManager?._id || (typeof employee.reportingManager === "string" ? employee.reportingManager : "") || "",
        employmentType: employee.employmentType || "Full-time",
        joiningDate: employee.joiningDate ? new Date(employee.joiningDate).toISOString().split("T")[0] : "",
        workLocation: employee.workLocation || "",
        personalEmail: employee.personalEmail || "",
        dob: employee.dob ? new Date(employee.dob).toISOString().split("T")[0] : "",
        gender: employee.gender || "",
        bloodGroup: employee.bloodGroup || "",
        emergencyContact: employee.emergencyContact || "",
        streetAddress,
        city,
        state,
        pincode,
        aadhaarNumber: employee.aadhaarNumber || "",
        panNumber: employee.panNumber || "",
        passportNumber: employee.passportNumber || "",
        password: "", // password remains empty on edit
        role: employee.role || "Employee",
        status: employee.status || "Active",
        permissions: Array.isArray(employee.permissions) && employee.permissions.length > 0
          ? employee.permissions
          : ["View Employees", "View Documents", "Upload Documents"],
      };
      reset(formattedEmployee);
    } else {
      reset({
        fullName: "",
        companyEmail: "",
        phoneNumber: "",
        department: "",
        designation: "",
        reportingManager: "",
        employmentType: "Full-time",
        joiningDate: new Date().toISOString().split("T")[0],
        workLocation: "",
        personalEmail: "",
        dob: "",
        gender: "",
        bloodGroup: "",
        emergencyContact: "",
        streetAddress: "",
        city: "",
        state: "",
        pincode: "",
        aadhaarNumber: "",
        panNumber: "",
        passportNumber: "",
        password: "Welcome123", // default password
        role: "Employee",
        status: "Active",
        permissions: ["View Employees", "View Documents", "Upload Documents"],
      });
    }
  }, [employee, reset, isOpen]);

  // If role is updated to Admin, select all permissions automatically
  useEffect(() => {
    if (selectedRole === "Admin") {
      setValue("permissions", DEFAULT_PERMISSIONS);
    }
  }, [selectedRole, setValue]);

  if (!isOpen) return null;

  const handlePincodeChange = async (e) => {
    const pin = e.target.value;
    setValue("pincode", pin);
    
    // Only search if it's 6 digits
    if (pin.length === 6 && /^\d{6}$/.test(pin)) {
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice[0]) {
            const po = data[0].PostOffice[0];
            setValue("city", po.District || "");
            setValue("state", po.State || "");
          }
        }
      } catch (err) {
        console.error("Error fetching pincode info:", err);
      }
    }
  };

  const handleFormSubmit = (data) => {
    let address = "";
    if (data.streetAddress || data.city || data.state || data.pincode) {
      address = `${data.streetAddress || ""}, ${data.city || ""}, ${data.state || ""} - ${data.pincode || ""}`;
    }

    const formData = new FormData();

    const allowedFields = [
      "fullName",
      "companyEmail",
      "phoneNumber",
      "department",
      "designation",
      "reportingManager",
      "employmentType",
      "joiningDate",
      "workLocation",
      "personalEmail",
      "dob",
      "gender",
      "bloodGroup",
      "emergencyContact",
      "aadhaarNumber",
      "panNumber",
      "passportNumber",
      "role",
      "status",
    ];

    allowedFields.forEach((field) => {
      let val = data[field];
      if (field === "reportingManager" && !val) {
        val = "";
      }
      formData.append(field, val !== null && val !== undefined ? val : "");
    });

    formData.append("address", address);

    if (data.password && String(data.password).trim()) {
      formData.append("password", data.password.trim());
    }

    if (Array.isArray(data.permissions)) {
      data.permissions.forEach((p) => formData.append("permissions", p));
    }

    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm select-none">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {isEdit ? "Edit Employee Coordinates" : "Register New Employee"}
            </h2>
            <span className="text-[10px] font-semibold text-slate-400 mt-1 block">
              {isEdit ? `Update profile and permissions for ${employee.fullName}` : "Setup profile, identity proofs, and initial role"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-55/10 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-6 text-slate-700"
        >
          {/* Section 1: Core Details */}
          <div>
            <h3 className="text-[10px] font-black tracking-widest text-[#5D5FEF] uppercase mb-3">
              1. Core Account Info
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className={`w-full px-3 py-1.5 rounded-xl border text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/30 ${
                    errors.fullName ? "border-red-500" : "border-slate-200"
                  }`}
                  {...register("fullName", { required: "Full name is required" })}
                />
                {errors.fullName && (
                  <span className="text-[9px] text-red-500 font-semibold mt-1 block">{errors.fullName.message}</span>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Company Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="john.doe@company.com"
                  readOnly={!canEditCompanyEmail}
                  className={`w-full px-3 py-1.5 rounded-xl border text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/30 ${
                    !canEditCompanyEmail ? "opacity-75 cursor-not-allowed bg-slate-100" : ""
                  } ${errors.companyEmail ? "border-red-500" : "border-slate-200"}`}
                  {...register("companyEmail", {
                    required: "Company email is required",
                    validate: (val) => {
                      if (!val || !val.trim()) return "Company email is required";
                      if (val.includes(",")) return "Email cannot contain commas. Use a dot (.) instead.";
                      const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                      if (!regex.test(val.trim())) return "Please enter a valid email address (e.g. name@company.com)";
                      return true;
                    },
                  })}
                />
                {errors.companyEmail && (
                  <span className="text-[9px] text-red-500 font-semibold mt-1 block">{errors.companyEmail.message}</span>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Phone Number
                </label>
                <PhoneInputWithCountry
                  value={phoneNumber}
                  onChange={(val) => setValue("phoneNumber", val, { shouldValidate: true, shouldDirty: true })}
                  placeholder="98765 43210"
                  hasError={!!errors.phoneNumber}
                />
                {errors.phoneNumber && (
                  <span className="text-[9px] text-red-500 font-semibold mt-1 block">{errors.phoneNumber.message}</span>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {isEdit ? "Change Password" : "Initial Password"}{" "}
                    {!isEdit && <span className="text-red-500">*</span>}
                  </label>
                  {isEdit && (
                    <span className="text-[9px] text-slate-400 font-semibold">
                      Leave blank to keep current
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={isEdit ? "Enter new password (optional)" : "Enter password"}
                    className={`w-full pl-3 pr-16 py-1.5 rounded-xl border text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/30 ${
                      errors.password ? "border-red-500" : "border-slate-200"
                    }`}
                    {...register("password", {
                      required: isEdit ? false : "Initial password is required",
                      minLength: isEdit
                        ? {
                            value: 6,
                            message: "Password must be at least 6 characters",
                          }
                        : undefined,
                    })}
                  />
                  <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
                    <button
                      type="button"
                      title="Generate random password"
                      onClick={() => {
                        const randomPass = "Pass@" + Math.floor(100000 + Math.random() * 900000);
                        setValue("password", randomPass, { shouldValidate: true, shouldDirty: true });
                        setShowPassword(true);
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer bg-transparent border-0"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors cursor-pointer bg-transparent border-0"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                {errors.password && (
                  <span className="text-[9px] text-red-500 font-semibold mt-1 block">{errors.password.message}</span>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Employment Details */}
          <div>
            <h3 className="text-[10px] font-black tracking-widest text-[#5D5FEF] uppercase mb-3">
              2. Employment Parameters
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Department
                </label>
                <select
                  disabled={isEmployee}
                  className={`w-full px-3 py-1.5 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none bg-slate-50/30 cursor-pointer ${
                    isEmployee ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                  {...register("department")}
                >
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Designation
                </label>
                <select
                  disabled={isEmployee}
                  className={`w-full px-3 py-1.5 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none bg-slate-50/30 cursor-pointer ${
                    isEmployee ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                  {...register("designation")}
                >
                  <option value="">Select Designation</option>
                  {DESIGNATIONS.map((desg) => (
                    <option key={desg} value={desg}>
                      {desg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Reporting Manager
                </label>
                <select
                  disabled={isEmployee}
                  className={`w-full px-3 py-1.5 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none bg-slate-50/30 cursor-pointer ${
                    isEmployee ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                  {...register("reportingManager")}
                >
                  <option value="">Select Manager</option>
                  {employeesList
                    .filter((emp) => emp._id !== employee?._id) // cannot report to self
                    .map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.fullName} ({emp.employeeId})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Employment Type
                </label>
                <select
                  disabled={isEmployee}
                  className={`w-full px-3 py-1.5 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none bg-slate-50/30 cursor-pointer ${
                    isEmployee ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                  {...register("employmentType")}
                >
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Joining Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  disabled={isEmployee}
                  className={`w-full px-3 py-1.5 rounded-xl border text-slate-900 text-xs focus:outline-none bg-slate-50/30 cursor-pointer ${
                    isEmployee ? "opacity-60 cursor-not-allowed" : ""
                  } ${errors.joiningDate ? "border-red-500" : "border-slate-200"}`}
                  {...register("joiningDate", { required: "Joining date is required" })}
                />
                {errors.joiningDate && (
                  <span className="text-[9px] text-red-500 font-semibold mt-1 block">{errors.joiningDate.message}</span>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Work Location
                </label>
                <input
                  type="text"
                  disabled={isEmployee}
                  placeholder="e.g. Noida Office, Remote"
                  className={`w-full px-3 py-1.5 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none bg-slate-50/30 ${
                    isEmployee ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                  {...register("workLocation")}
                />
              </div>

              {isEdit && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Profile Status
                  </label>
                  <select
                    disabled={isEmployee}
                    className={`w-full px-3 py-1.5 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none bg-slate-50/30 cursor-pointer font-bold text-slate-800 ${
                      isEmployee ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                    {...register("status")}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Personal Info */}
          <div>
            <h3 className="text-[10px] font-black tracking-widest text-[#5D5FEF] uppercase mb-3">
              3. Personal Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Personal Email
                </label>
                <input
                  type="email"
                  placeholder="john.doe@gmail.com"
                  className={`w-full px-3 py-1.5 rounded-xl border text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 bg-slate-50/30 ${
                    errors.personalEmail ? "border-red-500" : "border-slate-200"
                  }`}
                  {...register("personalEmail", {
                    validate: (val) => {
                      if (!val || val.trim() === "") return true;
                      if (val.includes(",")) return "Email cannot contain commas. Use a dot (.) instead.";
                      const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                      if (!regex.test(val.trim())) return "Invalid email format (e.g. name@gmail.com)";
                      return true;
                    },
                  })}
                />
                {errors.personalEmail && (
                  <span className="text-[9px] text-red-500 font-semibold mt-1 block">{errors.personalEmail.message}</span>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none bg-slate-50/30 cursor-pointer"
                  {...register("dob")}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Gender
                </label>
                <select
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none bg-slate-50/30 cursor-pointer"
                  {...register("gender")}
                >
                  <option value="">Select Gender</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Blood Group
                </label>
                <input
                  type="text"
                  placeholder="e.g. O+ve"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none bg-slate-50/30"
                  {...register("bloodGroup")}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Emergency Contact
                </label>
                <input
                  type="text"
                  placeholder="Contact name & number"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none bg-slate-50/30"
                  {...register("emergencyContact")}
                />
              </div>

              {/* Pincode & Street */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Pincode <span className="text-[9px] text-[#5D5FEF] font-bold">(Autofills City/State)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 110001"
                  maxLength={6}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none bg-slate-50/30"
                  {...register("pincode")}
                  onChange={handlePincodeChange}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Street / Area Address
                </label>
                <input
                  type="text"
                  placeholder="Flat No, Building, Area"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none bg-slate-50/30"
                  {...register("streetAddress")}
                />
              </div>

              {/* City & State */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  District / City
                </label>
                <input
                  type="text"
                  placeholder="Auto-filled city"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none bg-slate-50/30"
                  {...register("city")}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  State
                </label>
                <input
                  type="text"
                  placeholder="Auto-filled state"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-slate-900 text-xs focus:outline-none bg-slate-50/30"
                  {...register("state")}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Documents & Images */}
          <div>
            <h3 className="text-[10px] font-black tracking-widest text-[#5D5FEF] uppercase mb-3">
              4. Documents & Images
            </h3>
            <div className="space-y-3">
              <label className="border border-dashed border-slate-200 hover:border-slate-350 rounded-2xl p-6 flex flex-col items-center justify-center hover:bg-slate-50/20 cursor-pointer text-slate-455 hover:text-[#5D5FEF] transition-all">
                <FileUp className="h-8 w-8 text-[#5D5FEF] mb-2" />
                <span className="text-xs font-bold text-slate-700">Select files to upload</span>
                <span className="text-[9px] mt-0.5">PDF, Word, Images up to 10MB</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      const filesArray = Array.from(e.target.files);
                      setSelectedFiles((prev) => [...prev, ...filesArray]);
                    }
                  }}
                />
              </label>

              {selectedFiles.length > 0 && (
                <div className="space-y-1.5 pt-2 max-h-32 overflow-y-auto">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Selected ({selectedFiles.length})</p>
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Paperclip className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate flex-1">{file.name}</span>
                        <span className="text-[9px] text-slate-400 shrink-0">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        className="p-1 hover:bg-red-50 text-red-500 rounded hover:text-red-700 cursor-pointer border-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 5: System Role */}
          <div>
            <h3 className="text-[10px] font-black tracking-widest text-[#5D5FEF] uppercase mb-3">
              5. System Role
            </h3>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Role Assignment
              </label>
              <div className="flex gap-4 mt-1.5">
                {ROLES.map((r) => (
                  <label key={r} className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                    <input
                      type="radio"
                      value={r}
                      disabled={isEmployee}
                      className={`h-4 w-4 text-[#5D5FEF] accent-[#5D5FEF] ${
                        isEmployee ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                      {...register("role")}
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3.5 bg-white sticky bottom-0 z-10 py-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer select-none disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-[#5D5FEF] hover:bg-[#4d4fdf] active:bg-[#4345d2] text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-500/10 cursor-pointer select-none disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Employee</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
