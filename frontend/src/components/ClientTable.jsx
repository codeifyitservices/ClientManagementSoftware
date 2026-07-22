import React, { useState } from "react";
import { ArrowUpDown, Eye, Edit2, Trash2, Globe, Building } from "lucide-react";

export default function ClientTable({
  clients = [],
  onView,
  onEdit,
  onDelete,
}) {
  const [sortField, setSortField] = useState("companyName");
  const [sortOrder, setSortOrder] = useState("asc");

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedClients = [...clients].sort((a, b) => {
    const aVal = String(a[sortField] || "").toLowerCase();
    const bVal = String(b[sortField] || "").toLowerCase();

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className="w-full bg-white border border-slate-100 rounded-2xl custom-shadow overflow-hidden animate-fade-in font-sans">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
              <th
                className="py-4 px-6 cursor-pointer hover:text-slate-900 transition-colors"
                onClick={() => handleSort("companyName")}
              >
                <div className="flex items-center gap-1">
                  Client Name <ArrowUpDown className="h-3 w-3 opacity-60" />
                </div>
              </th>

              <th
                className="py-4 px-6 cursor-pointer hover:text-slate-900 transition-colors"
                onClick={() => handleSort("clientName")}
              >
                <div className="flex items-center gap-1">
                  Contact Person <ArrowUpDown className="h-3 w-3 opacity-60" />
                </div>
              </th>

              <th
                className="py-4 px-6 cursor-pointer hover:text-slate-900 transition-colors"
                onClick={() => handleSort("email")}
              >
                <div className="flex items-center gap-1">
                  Email Address <ArrowUpDown className="h-3 w-3 opacity-60" />
                </div>
              </th>

              <th className="py-4 px-6">Phone</th>
              <th className="py-4 px-6">Website</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-750 font-semibold">
            {sortedClients.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-16 text-center text-slate-400 font-semibold">
                  No client profiles registered. Click Add Client to get started.
                </td>
              </tr>
            ) : (
              sortedClients.map((client) => {
                return (
                  <tr key={client._id} className="hover:bg-slate-50/40 transition-colors">
                    
                    {/* Company Name */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <Building className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>{client.companyName}</span>
                      </div>
                    </td>

                    {/* Client Name */}
                    <td className="py-4 px-6 text-slate-800">
                      {client.clientName}
                    </td>

                    {/* Email */}
                    <td className="py-4 px-6 font-mono text-[11px] text-slate-500 font-medium">
                      {client.email}
                    </td>

                    {/* Phone */}
                    <td className="py-4 px-6 text-slate-500">
                      {client.phone || "—"}
                    </td>

                    {/* Website */}
                    <td className="py-4 px-6 text-[#5D5FEF] truncate max-w-[150px]">
                      {client.website ? (
                        <a
                          href={client.website.startsWith("http") ? client.website : `https://${client.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
                          <Globe className="h-3.5 w-3.5 shrink-0 text-[#5D5FEF]" />
                          <span>{client.website}</span>
                        </a>
                      ) : (
                        <span className="text-slate-450 font-normal">—</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                          client.status === "Inactive"
                            ? "bg-slate-100 text-slate-550"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {client.status || "Active"}
                      </span>
                    </td>

                    {/* Actions Panel */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Details */}
                        <button
                          onClick={() => onView(client)}
                          title="View Profile Details & Ledger"
                          className="p-1 rounded text-slate-400 hover:bg-slate-150 hover:text-slate-800 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {/* Edit details */}
                        <button
                          onClick={() => onEdit(client)}
                          title="Edit Profile"
                          className="p-1 rounded text-slate-400 hover:bg-slate-150 hover:text-slate-800 cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete Profile */}
                        <button
                          onClick={() => onDelete(client)}
                          title="Delete Profile"
                          className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-650 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
