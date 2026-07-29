import React from "react";
import { X, Building, Mail, Phone, Globe, Tag, FileText, Receipt } from "lucide-react";

export default function ClientProfileModal({ isOpen, onClose, client, invoices = [] }) {
  if (!isOpen || !client) return null;

  // Filter invoices for this client
  const clientInvoices = invoices.filter(
    (inv) => (inv.client?._id || inv.client) === client._id
  );

  // Compute specific client summaries
  const totalInvoiced = clientInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const paidInvoices = clientInvoices.filter((inv) => inv.paymentStatus === "Paid");
  const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const pendingAmount = totalInvoiced - totalPaid;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-100 max-w-3xl w-full custom-shadow overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">{client.companyName}</h3>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Client Profile Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Metadata Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Contact & General Card */}
            <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100 space-y-3.5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">
                Contact & General
              </h4>
              
              <div className="space-y-2.5 text-sm text-slate-700">
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-400 font-semibold text-xs w-24">Primary Contact:</span>
                  <span className="font-semibold text-slate-900">{client.clientName}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-400 font-semibold text-xs w-24">Email Address:</span>
                  <a href={`mailto:${client.email}`} className="text-indigo-600 hover:underline">{client.email}</a>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-400 font-semibold text-xs w-24">Phone:</span>
                  <span>{client.phone || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-400 font-semibold text-xs w-24">Website:</span>
                  {client.website ? (
                    <a href={client.website.startsWith("http") ? client.website : `https://${client.website}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                      {client.website}
                    </a>
                  ) : (
                    <span>N/A</span>
                  )}
                </div>
              </div>
            </div>

            {/* Tax & Industry Card */}
            <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100 space-y-3.5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">
                Tax & Classification
              </h4>
              
              <div className="space-y-2.5 text-sm text-slate-700">
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-400 font-semibold text-xs w-24">Client Type:</span>
                  <span className="font-semibold text-slate-900">{client.isForeign ? "Foreign Client (No GST)" : "Domestic Client"}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-400 font-semibold text-xs w-24">GSTIN (GST No):</span>
                  <span className="font-mono font-bold text-slate-900">{client.gstNumber || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-400 font-semibold text-xs w-24">Industry:</span>
                  <span>{client.industry || "N/A"}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-slate-400 font-semibold text-xs w-24 mt-0.5">Address:</span>
                  <span className="text-slate-600 leading-relaxed flex-1">
                    {client.address || "N/A"}
                    {(client.city || client.pincode) && (
                      <span className="block text-slate-500 font-medium text-xs mt-0.5">
                        {client.city}{client.pincode ? ` - ${client.pincode}` : ""}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Notes Segment */}
          {client.notes && (
            <div className="bg-amber-50/40 border border-amber-100/50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed">
              <span className="block text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Internal Notes</span>
              {client.notes}
            </div>
          )}

          {/* Billing Performance Summary Card */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-100 bg-white custom-shadow text-center">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Billed</span>
              <span className="text-base font-black text-slate-900">₹{totalInvoiced.toFixed(2)}</span>
            </div>
            <div className="p-4 rounded-xl border border-slate-100 bg-white custom-shadow text-center">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Paid</span>
              <span className="text-base font-black text-emerald-600">₹{totalPaid.toFixed(2)}</span>
            </div>
            <div className="p-4 rounded-xl border border-slate-100 bg-white custom-shadow text-center">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pending Balance</span>
              <span className="text-base font-black text-amber-600">₹{pendingAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Invoice History Log */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="h-4 w-4 text-indigo-500" />
              <span>Invoice Log / History ({clientInvoices.length})</span>
            </h4>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Invoice No</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Total (INR)</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {clientInvoices.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400 font-semibold">
                        No transactions registered for this client.
                      </td>
                    </tr>
                  ) : (
                    clientInvoices.map((inv) => (
                      <tr key={inv._id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-slate-900">{inv.invoiceNumber}</td>
                        <td className="py-3 px-4 truncate max-w-[200px]">{inv.serviceDescription}</td>
                        <td className="py-3 px-4">{new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">₹{inv.totalAmount.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              inv.paymentStatus === "Paid"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {inv.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="bg-indigo-650 hover:bg-indigo-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer"
          >
            Close Profile
          </button>
        </div>

      </div>
    </div>
  );
}
