import React from "react";
import {
  X,
  Building,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from "lucide-react";

export default function ClientDetailModal({ isOpen, onClose, client }) {
  if (!isOpen || !client) return null;

  const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return "-";
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    if (includeTime) {
      options.hour = "2-digit";
      options.minute = "2-digit";
    }
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const isPending = client.paymentStatus === "Pending";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
          <div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              Client Details
            </span>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {client.invoiceNumber}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Amount and Status Header */}
          <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100/50 dark:border-slate-800">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Amount Due
              </p>
              <p className="text-3xl font-black text-slate-900 mt-1">
                ₹{Number(client.amount).toFixed(2)}
              </p>
            </div>
            <div>
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${
                  isPending
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/40 dark:border-amber-900/30"
                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/40 dark:border-emerald-900/30"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full mr-2 ${
                    isPending ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                />
                {client.paymentStatus}
              </span>
            </div>
          </div>

          {/* Contact Details Grid */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              Client & Company Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Building className="h-5 w-5 text-slate-400 dark:text-slate-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                    Client Name
                  </p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {client.clientName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {client.companyName}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-slate-400 dark:text-slate-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                    Email Address
                  </p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono break-all">
                    {client.email}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-slate-400 dark:text-slate-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                    Phone Number
                  </p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {client.phone || "Not provided"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Service Rendered Description
            </h4>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/20 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans border border-slate-100/50 dark:border-slate-800/50">
              {client.serviceDescription}
            </div>
          </div>

          {/* Invoice Milestones */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              Milestone Log
            </h4>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 dark:text-slate-500">Created At:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {formatDate(client.createdAt, true)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 dark:text-slate-500">Payment Due:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {formatDate(client.dueDate)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 dark:text-slate-500">Invoice Emailed:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {client.invoiceSentAt ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {formatDate(client.invoiceSentAt, true)}
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-500 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Not emailed yet
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
