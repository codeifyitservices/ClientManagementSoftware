import React, { useState, useRef } from "react";
import {
  Database,
  Users,
  Receipt,
  Download,
  Upload,
  Loader2,
  FileCode,
  ShieldCheck,
  Sliders,
  Settings,
  X,
  CheckCircle2,
  AlertCircle,
  FileUp,
} from "lucide-react";

export default function DataBackupSection({ token, showToast, onRestoreSuccess }) {
  const [downloadingType, setDownloadingType] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [restoreResult, setRestoreResult] = useState(null);
  const [restoreError, setRestoreError] = useState("");
  const fileInputRef = useRef(null);

  const API_BACKUP = `${import.meta.env.VITE_BACKEND_URL}/api/backup`;

  const handleExport = async (type) => {
    try {
      setDownloadingType(type);
      const authToken = token || localStorage.getItem("token");
      const labels = {
        full: "Full System Dataset",
        clients: "Clients Dataset",
        invoices: "Invoices Dataset",
        services: "Billing Services Dataset",
        config: "Company Configuration Dataset",
      };
      const label = labels[type] || "Backup";

      if (showToast) showToast(`Preparing ${label} ZIP archive...`, "success");

      const response = await fetch(`${API_BACKUP}/export?type=${type}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to generate backup archive.");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      const filename = `Backup_${type}_${new Date().toISOString().slice(0, 10)}.zip`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      if (showToast) showToast(`${label} ZIP backup downloaded successfully!`, "success");
    } catch (err) {
      if (showToast) showToast(err.message || "Error generating backup.", "error");
    } finally {
      setDownloadingType(null);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setRestoreError("");
      setRestoreResult(null);
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setRestoreError("Please select a .json or .zip backup file to upload.");
      return;
    }

    try {
      setUploading(true);
      setRestoreError("");
      setRestoreResult(null);

      const authToken = token || localStorage.getItem("token");
      const formData = new FormData();
      formData.append("backupFile", selectedFile);

      if (showToast) showToast("Uploading and restoring database records...", "success");

      const response = await fetch(`${API_BACKUP}/import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Data restore failed.");
      }

      setRestoreResult(data);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      if (showToast) showToast(data.message || "Data restored successfully!", "success");

      // Notify application to refresh config & lists
      window.dispatchEvent(new Event("companyConfigUpdated"));
      if (onRestoreSuccess) onRestoreSuccess();
    } catch (err) {
      setRestoreError(err.message || "Failed to upload and restore backup.");
      if (showToast) showToast(err.message || "Restore failed.", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full font-sans space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 custom-shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-[#5D5FEF] shrink-0">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 leading-none">
              System Data Backup & Restore
            </h3>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">
              Export database datasets or upload `.json` / `.zip` backup packages to restore your system data.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-bold self-start sm:self-auto">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>JSON & ZIP Supported</span>
        </div>
      </div>

      {/* ── Restore & Upload Section Card ─────────────────────────────────── */}
      <div className="bg-white border border-indigo-100 rounded-2xl p-6 custom-shadow space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <FileUp className="h-4.5 w-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                Upload & Restore Data from Backup File
              </h4>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Select a previously exported `.json` file or `.zip` backup archive to import records into the database.
              </p>
            </div>
          </div>
        </div>

        {restoreError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700 font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{restoreError}</span>
          </div>
        )}

        {restoreResult && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-semibold space-y-2 animate-fade-in">
            <div className="flex items-center gap-2 text-emerald-700 font-bold">
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
              <span>{restoreResult.message}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[10px]">
              {restoreResult.details?.clientsRestored > 0 && (
                <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                  Clients: {restoreResult.details.clientsRestored}
                </span>
              )}
              {restoreResult.details?.invoicesRestored > 0 && (
                <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                  Invoices: {restoreResult.details.invoicesRestored}
                </span>
              )}
              {restoreResult.details?.servicesRestored > 0 && (
                <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                  Services: {restoreResult.details.servicesRestored}
                </span>
              )}
              {restoreResult.details?.configRestored && (
                <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                  Company Config Updated
                </span>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleImportSubmit} className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-6 text-center transition-colors bg-slate-50/50">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,.zip"
              onChange={handleFileSelect}
              className="hidden"
              id="backup-file-upload"
            />
            <label
              htmlFor="backup-file-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <div className="p-3 rounded-full bg-indigo-50 text-indigo-600">
                <Upload className="h-5 w-5" />
              </div>
              {selectedFile ? (
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200">
                  <FileCode className="h-4 w-4" />
                  <span>{selectedFile.name}</span>
                  <span className="text-[10px] text-indigo-400 font-normal">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="p-0.5 hover:bg-indigo-100 rounded text-indigo-500 ml-1 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-xs font-bold text-slate-700">
                    Click to browse and upload backup file
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Supports JSON files (`clients.json`, `invoices.json`, etc.) or ZIP backup archives
                  </span>
                </>
              )}
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Restoring Database...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Upload & Restore Data</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Featured Full Backup Card */}
      <div className="bg-gradient-to-br from-[#0B0C24] to-[#1A1C4B] border border-indigo-900/50 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-extrabold uppercase tracking-wider">
            <Database className="h-3 w-3" />
            <span>Complete Database Export</span>
          </div>
          <h4 className="text-base font-bold text-white">
            Full System Dataset Backup
          </h4>
          <p className="text-xs text-slate-300 font-medium leading-relaxed">
            Downloads a single compressed `.zip` archive containing formatted JSON files for all database collections: Clients, Invoices, Services, and Company Configuration.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[10px] text-slate-300">
            <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">clients.json</span>
            <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">invoices.json</span>
            <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">services.json</span>
            <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">config.json</span>
          </div>
        </div>

        <button
          onClick={() => handleExport("full")}
          disabled={downloadingType === "full"}
          className="bg-[#5D5FEF] hover:bg-[#4d4fdf] active:bg-[#4345d2] text-white font-bold px-5 py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 cursor-pointer disabled:opacity-50 shrink-0"
        >
          {downloadingType === "full" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating ZIP...</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>Export Full Dataset (.zip)</span>
            </>
          )}
        </button>
      </div>

      {/* Individual Collection Backups Section Header */}
      <div className="pt-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
          Individual Dataset Collections
        </h4>

        {/* Individual Backups Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Clients Backup Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 custom-shadow flex flex-col justify-between space-y-4 hover:border-sky-300 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
                  <Users className="h-4 w-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-sky-100 text-sky-700">
                  Clients
                </span>
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-900">
                  Clients Directory
                </h5>
                <p className="text-[10px] text-slate-500 font-medium mt-1">
                  Export client company profiles, contact info, and GSTIN directory.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-[10px] font-mono text-slate-600">
                <FileCode className="h-3 w-3 text-sky-500 inline mr-1" />
                <span>clients.json</span>
              </div>
            </div>

            <button
              onClick={() => handleExport("clients")}
              disabled={downloadingType === "clients"}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {downloadingType === "clients" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>Clients (.zip)</span>
                </>
              )}
            </button>
          </div>

          {/* 2. Invoices Backup Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 custom-shadow flex flex-col justify-between space-y-4 hover:border-violet-300 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
                  <Receipt className="h-4 w-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-violet-100 text-violet-700">
                  Invoices
                </span>
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-900">
                  Invoices Ledger
                </h5>
                <p className="text-[10px] text-slate-500 font-medium mt-1">
                  Export invoice items, line calculations, tax breakdowns, and status.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-[10px] font-mono text-slate-600">
                <FileCode className="h-3 w-3 text-violet-500 inline mr-1" />
                <span>invoices.json</span>
              </div>
            </div>

            <button
              onClick={() => handleExport("invoices")}
              disabled={downloadingType === "invoices"}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {downloadingType === "invoices" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>Invoices (.zip)</span>
                </>
              )}
            </button>
          </div>

          {/* 3. Services Backup Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 custom-shadow flex flex-col justify-between space-y-4 hover:border-amber-300 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Sliders className="h-4 w-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-700">
                  Services
                </span>
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-900">
                  Billing Services
                </h5>
                <p className="text-[10px] text-slate-500 font-medium mt-1">
                  Export configured billing services, SAC tax codes, and default GST rates.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-[10px] font-mono text-slate-600">
                <FileCode className="h-3 w-3 text-amber-500 inline mr-1" />
                <span>services.json</span>
              </div>
            </div>

            <button
              onClick={() => handleExport("services")}
              disabled={downloadingType === "services"}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {downloadingType === "services" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>Services (.zip)</span>
                </>
              )}
            </button>
          </div>

          {/* 4. Config Backup Card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 custom-shadow flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Settings className="h-4 w-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-700">
                  Config
                </span>
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-900">
                  Company Configuration
                </h5>
                <p className="text-[10px] text-slate-500 font-medium mt-1">
                  Export brand details, company address, phone, email, and GSTIN settings.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-[10px] font-mono text-slate-600">
                <FileCode className="h-3 w-3 text-emerald-500 inline mr-1" />
                <span>config.json</span>
              </div>
            </div>

            <button
              onClick={() => handleExport("config")}
              disabled={downloadingType === "config"}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {downloadingType === "config" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>Config (.zip)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
