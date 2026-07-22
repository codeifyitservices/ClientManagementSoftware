import React, { useState } from "react";
import { Mail, Lock, AlertTriangle, KeyRound } from "lucide-react";

export default function LoginPage({
  onLogin,
  companyName = localStorage.getItem("companyName") || "Codenap IT Services",
  companyLogo = localStorage.getItem("companyLogo") || "",
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to log in.");
      }

      onLogin(data.token, data.email);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 w-screen flex items-center justify-center p-4 grid-bg font-sans">
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-2xl p-8 custom-shadow animate-fade-in">
        
        {/* Branding header */}
        <div className="flex flex-col items-center mb-8 text-center select-none">
          {companyLogo ? (
            <div className="h-16 w-28 bg-white border border-slate-100 rounded-2xl mb-4 shadow-sm flex items-center justify-center p-2 overflow-hidden">
              <img
                src={`http://localhost:5000/uploads/${companyLogo}`}
                alt={companyName}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <h1 className="text-xl font-black text-slate-900 tracking-tight mb-3">
              {companyName}
            </h1>
          )}
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Welcome back</h2>
          <p className="text-xs text-slate-400 font-bold mt-1.5 uppercase tracking-widest">
            Invoice Management Admin Portal
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                <Mail className="h-4.5 w-4.5" />
              </span>
              <input
                type="email"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@clientflow.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                <Lock className="h-4.5 w-4.5" />
              </span>
              <input
                type="password"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Error Prompt */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Sign In Trigger */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-500/10 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <KeyRound className="h-4.5 w-4.5" />
            )}
            <span>Sign In to Dashboard</span>
          </button>
        </form>
      </div>
    </div>
  );
}
