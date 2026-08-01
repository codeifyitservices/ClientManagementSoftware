import React, { useState } from "react";
import { X, Monitor, Copy, Check, ExternalLink, ShieldCheck, Download } from "lucide-react";
import { attendanceService } from "../../services/attendanceService";

export default function AgentPairingModal({ currentUser, onClose }) {
  const [pairingToken, setPairingToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const empId = currentUser?.employeeId || currentUser?._id || "EMP-DEFAULT";

  const handleGenerateToken = async () => {
    setLoading(true);
    try {
      const res = await attendanceService.generatePairingToken(empId);
      if (res.success) {
        setPairingToken(res.pairingToken);
      } else {
        alert("Failed to generate pairing token");
      }
    } catch (err) {
      alert("Error generating token");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!pairingToken) return;
    navigator.clipboard.writeText(pairingToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const deepLinkUrl = pairingToken ? `desktop-agent://pair?token=${pairingToken}&emp=${empId}` : "#";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-[#5D5FEF] font-bold flex items-center justify-center border border-indigo-100">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Pair Windows Desktop Agent</h2>
              <p className="text-xs font-semibold text-slate-500">Automated Presence & Activity Tracking</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Link your physical desktop agent to automatically measure system idle time, report presence, and sync break status with your attendance profile.
          </p>

          <a
            href={`${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/agent/download`}
            download="Company_Desktop_Agent_Package.zip"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-[#5D5FEF] border border-indigo-200 text-xs font-bold rounded-xl transition cursor-pointer text-center"
          >
            <Download className="h-4 w-4" />
            <span>Download Desktop Agent Setup (.zip)</span>
          </a>

          {!pairingToken ? (
            <button
              onClick={handleGenerateToken}
              disabled={loading}
              className="w-full py-3 bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white text-xs font-bold rounded-xl transition shadow-sm shadow-indigo-500/20 cursor-pointer disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate Pairing Token"}
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-indigo-100 rounded-2xl p-4 text-center">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Your Pairing Token</div>
                <div className="text-xl font-mono font-black text-[#5D5FEF] tracking-wider my-2">{pairingToken}</div>
                <div className="text-[11px] font-medium text-slate-500">Valid for 15 minutes</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? "Copied to Clipboard!" : "Copy Token"}</span>
                </button>

                <a
                  href={deepLinkUrl}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#5D5FEF] hover:bg-[#4d4fdf] text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm shadow-indigo-500/20 text-center"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Launch Agent</span>
                </a>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>The Desktop Agent strictly measures presence and idle time. It never records keystrokes or screenshots.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
