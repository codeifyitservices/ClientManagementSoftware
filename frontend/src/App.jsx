import React, { useState, useEffect, useRef } from "react";
import {
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  Plus,
  Search,
  X,
  ChevronDown,
  Eye,
} from "lucide-react";
import Sidebar from "./components/Sidebar";
import DashboardStats from "./components/DashboardStats";
import DashboardView from "./components/DashboardView";
import ClientTable from "./components/ClientTable";
import InvoiceTable from "./components/InvoiceTable";
import ClientModal from "./components/ClientModal";
import InvoiceFormPage from "./components/InvoiceFormPage";
import InvoicePreviewPage from "./components/InvoicePreviewPage";
import ClientProfileModal from "./components/ClientProfileModal";
import ConfirmDialog from "./components/ConfirmDialog";
import InvoiceConfigPage from "./components/InvoiceConfigPage";
import ServiceSettingsPage from "./components/ServiceSettingsPage";
import LoginPage from "./components/LoginPage";
import PasswordModal from "./components/PasswordModal";

const API_CLIENTS = "http://localhost:5000/api/clients";
const API_INVOICES = "http://localhost:5000/api/invoices";

const DUMMY_PREVIEW_CLIENT = {
  _id: "dummy-preview-client",
  clientName: "Priya Sharma",
  companyName: "Acme Digital Pvt. Ltd.",
  email: "accounts@acmedigital.in",
  phone: "+91 98765 43210",
  address: "Plot 42, Cyber City",
  city: "Gurugram",
  pincode: "122002",
  gstNumber: "06AAHCA1234M1Z8",
};

const getPreviewDueDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 15);
  return date.toISOString().split("T")[0];
};

const DUMMY_PREVIEW_INVOICE = {
  client: DUMMY_PREVIEW_CLIENT._id,
  invoiceDate: new Date().toISOString().split("T")[0],
  dueDate: getPreviewDueDate(),
  invoiceType: "Tax Invoice",
  currency: "INR (₹)",
  notes: "Demo preview only. This invoice is not saved.",
  paymentStatus: "Pending",
  invoiceNumber: "INV-PREVIEW",
  _id: null,
  items: [
    {
      description: "Website design and development",
      sacCode: "998314",
      qty: 1,
      rate: 75000,
      gstRate: 18,
    },
    {
      description: "Monthly hosting and maintenance",
      sacCode: "998315",
      qty: 3,
      rate: 8500,
      gstRate: 18,
    },
  ],
};

// ─── Toast Panel ────────────────────────────────────────────────────────────
function ToastPanel({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full p-4 sm:p-0 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto px-4 py-3.5 rounded-xl shadow-lg border text-sm font-semibold flex items-start gap-2.5 animate-fade-in relative overflow-hidden ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-100"
              : toast.type === "error"
              ? "bg-red-50 text-red-800 border-red-100"
              : "bg-amber-50 text-amber-800 border-amber-100"
          }`}
        >
          <div
            className={`absolute left-0 top-0 bottom-0 w-1 ${
              toast.type === "success"
                ? "bg-emerald-500"
                : toast.type === "error"
                ? "bg-red-500"
                : "bg-amber-500"
            }`}
          />
          <div className="flex-1 pr-6">{toast.message}</div>
          <button
            onClick={() => removeToast(toast.id)}
            className="absolute right-2.5 top-3.5 rounded-md p-0.5 text-slate-400 hover:bg-black/5 transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── App Shell Layout (renders <Outlet> for child routes) ───────────────────
function AppShell({
  companyName,
  companyLogo,
  clients,
  searchQuery,
  setSearchQuery,
  setIsClientFormOpen,
  setSelectedClientForEdit,
  onLogout,
  onChangePassword,
  fetchClients,
  fetchInvoices,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const headerMeta = {
    "/": { title: "Dashboard", sub: "Welcome back, Admin!" },
    "/clients": { title: "Clients Profiles", sub: "Manage company coordinates, contact list, and GSTIN directories" },
    "/invoices": { title: "Invoices Ledger", sub: "Track transactions, SAC tax codes, and payments" },
    "/invoices/create": { title: "Create Invoice", sub: "Specify billing items and values to generate a new invoice" },
    "/invoices/preview": { title: "Invoice Preview", sub: "Inspect your tax document formatting, items, and tax rates" },
    "/settings/profile": { title: "Company Settings", sub: "Update brand parameters, addresses, and layout settings" },
    "/settings/services": { title: "Service Settings", sub: "Configure billing services, SAC tax codes, and GST rates" },
  };

  const isEditInvoice = /^\/invoices\/.+\/edit$/.test(path);
  const currentMeta = isEditInvoice
    ? { title: "Edit Invoice", sub: "Modify fields and item calculations on existing invoice records" }
    : headerMeta[path] || { title: "", sub: "" };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 grid-bg flex">
      <Sidebar companyName={companyName} companyLogo={companyLogo} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Page Header */}
        <header className="border-b border-slate-100 bg-white/70 backdrop-blur-md sticky top-0 z-35 px-8 h-16 flex items-center justify-between shrink-0 select-none">
          <div>
            {currentMeta.title && (
              <>
                <h1 className="text-sm font-bold text-slate-900 leading-none">{currentMeta.title}</h1>
                <span className="text-[10px] font-medium text-slate-400 mt-1 block">{currentMeta.sub}</span>
              </>
            )}
          </div>

          {/* Disabled search bar */}
          <div className="relative hidden md:block select-none">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              disabled
              placeholder="Search here..."
              className="pl-9 pr-12 py-1.5 w-52 border border-slate-200 rounded-xl bg-slate-50/50 text-[11px] font-medium text-slate-400 cursor-not-allowed focus:outline-none"
            />
            <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[9px] font-bold text-slate-400/70">
              Ctrl K
            </span>
          </div>

          {/* Actions + Brand Badge */}
          <div className="flex items-center gap-3">
            {path === "/clients" && (
              <button
                onClick={() => { setSelectedClientForEdit(null); setIsClientFormOpen(true); }}
                className="bg-[#5D5FEF] hover:bg-[#4d4fdf] active:bg-[#4345d2] text-white font-bold px-3.5 py-1.5 rounded-xl text-[11px] transition-all flex items-center gap-1 shadow-sm shadow-indigo-500/10 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Client</span>
              </button>
            )}
            {path === "/invoices" && (
              <button
                onClick={() => navigate("/invoices/create")}
                className="bg-[#5D5FEF] hover:bg-[#4d4fdf] active:bg-[#4345d2] text-white font-bold px-3.5 py-1.5 rounded-xl text-[11px] transition-all flex items-center gap-1 shadow-sm shadow-indigo-500/10 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Invoice</span>
              </button>
            )}

            {/* User dropdown — company brand badge */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#5D5FEF]/10 border border-[#5D5FEF]/20 text-[#5D5FEF] font-bold text-xs hover:bg-[#5D5FEF]/15 transition-colors cursor-pointer select-none"
              >
                <div className="h-4 w-4 rounded-md bg-[#5D5FEF] text-white flex items-center justify-center shrink-0">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span>{companyName}</span>
                <ChevronDown className={`h-3.5 w-3.5 ml-0.5 transition-transform ${showUserMenu ? "rotate-180" : ""}`} strokeWidth={2.5} />
              </button>

              {/* Dropdown menu */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl py-1.5 z-50 animate-fade-in">
                  <div className="px-4 py-2.5 border-b border-slate-50">
                    <p className="text-[11px] font-bold text-slate-800">Admin User</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">admin@codenap.in</p>
                  </div>
                  <button
                    onClick={() => { setShowUserMenu(false); onChangePassword(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Change Password
                  </button>
                  <button
                    onClick={() => { setShowUserMenu(false); onLogout(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[11px] font-semibold text-red-500 hover:bg-red-50 transition-colors text-left cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content via Outlet */}
        <main className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ─── Root App ────────────────────────────────────────────────────────────────
export default function App() {
  const navigate = useNavigate();

  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);

  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [companyName, setCompanyName] = useState(localStorage.getItem("companyName") || "Codenap IT Services");
  const [companyLogo, setCompanyLogo] = useState(localStorage.getItem("companyLogo") || "");

  const [isClientFormOpen, setIsClientFormOpen] = useState(false);
  const [isClientProfileOpen, setIsClientProfileOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedClientForEdit, setSelectedClientForEdit] = useState(null);
  const [selectedClientForView, setSelectedClientForView] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);

  const [isSavingClient, setIsSavingClient] = useState(false);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [isDeletingClient, setIsDeletingClient] = useState(false);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);
  const [processingInvoiceIds, setProcessingInvoiceIds] = useState({});

  const [toasts, setToasts] = useState([]);
  const showToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4500);
  };
  const removeToast = (id) => setToasts((p) => p.filter((t) => t.id !== id));

  // ── Auth ──────────────────────────────────────────────────────────────────
  const handleLogin = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setIsAuthenticated(true);
    showToast("Welcome to BillFlow!", "success");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setIsAuthenticated(false);
    setClients([]);
    setInvoices([]);
    navigate("/login");
    showToast("Logged out.", "success");
  };

  const authenticatedFetch = async (url, options = {}) => {
    const headers = { ...options.headers, Authorization: `Bearer ${token}` };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      localStorage.removeItem("token");
      setToken(null);
      setIsAuthenticated(false);
      showToast("Session expired. Please log in again.", "warning");
      throw new Error("Unauthorized");
    }
    return res;
  };

  // ── Data ──────────────────────────────────────────────────────────────────
  const fetchCompanyConfig = async () => {
    if (!token) return;
    try {
      const res = await authenticatedFetch(`${API_CLIENTS}/config`);
      const data = await res.json();
      if (data.companyName) {
        setCompanyName(data.companyName);
        localStorage.setItem("companyName", data.companyName);
      }
      setCompanyLogo(data.companyLogo || "");
      localStorage.setItem("companyLogo", data.companyLogo || "");
    } catch {}
  };

  const fetchClients = async (search = "") => {
    if (!token) return;
    try {
      setLoadingClients(true);
      const url = search ? `${API_CLIENTS}?search=${encodeURIComponent(search)}` : API_CLIENTS;
      setClients(await (await authenticatedFetch(url)).json());
    } catch (err) {
      if (err.message !== "Unauthorized") showToast(err.message, "error");
    } finally {
      setLoadingClients(false);
    }
  };

  const fetchInvoices = async (search = "") => {
    if (!token) return;
    try {
      setLoadingInvoices(true);
      const url = search ? `${API_INVOICES}?search=${encodeURIComponent(search)}` : API_INVOICES;
      setInvoices(await (await authenticatedFetch(url)).json());
    } catch (err) {
      if (err.message !== "Unauthorized") showToast(err.message, "error");
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchCompanyConfig();
      fetchClients();
      fetchInvoices();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    window.addEventListener("companyConfigUpdated", fetchCompanyConfig);
    return () => window.removeEventListener("companyConfigUpdated", fetchCompanyConfig);
  }, [token]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleClientSubmit = async (data) => {
    setIsSavingClient(true);
    const isEdit = !!selectedClientForEdit;
    const url = isEdit ? `${API_CLIENTS}/${selectedClientForEdit._id}` : API_CLIENTS;
    try {
      const res = await authenticatedFetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed to save client.");
      showToast(isEdit ? "Client updated." : "Client created.", "success");
      setIsClientFormOpen(false);
      setSelectedClientForEdit(null);
      fetchClients(searchQuery);
    } catch (err) {
      if (err.message !== "Unauthorized") showToast(err.message, "error");
    } finally {
      setIsSavingClient(false);
    }
  };

  const handleClientDeleteConfirm = async () => {
    if (!clientToDelete) return;
    setIsDeletingClient(true);
    try {
      const res = await authenticatedFetch(`${API_CLIENTS}/${clientToDelete._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete client.");
      showToast("Client and all invoices deleted.", "success");
      setClientToDelete(null);
      fetchClients(searchQuery);
      fetchInvoices();
    } catch (err) {
      if (err.message !== "Unauthorized") showToast(err.message, "error");
    } finally {
      setIsDeletingClient(false);
    }
  };

  const handleInvoiceSubmit = async (data) => {
    setIsSavingInvoice(true);
    const invoiceId = data._id;
    const url = invoiceId ? `${API_INVOICES}/${invoiceId}` : API_INVOICES;
    try {
      const res = await authenticatedFetch(url, {
        method: invoiceId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to save invoice.");

      if (data.shouldSendEmail) {
        if (result.emailError) {
          showToast(invoiceId ? "Invoice updated, email failed." : "Invoice created, email failed.", "warning");
        } else {
          if (result.previewUrl) {
            console.log("Test Mail Preview URL:", result.previewUrl);
          }
          showToast(invoiceId ? "Invoice updated and sent!" : "Invoice created and sent!", "success");
        }
      } else {
        showToast(invoiceId ? "Invoice updated." : "Invoice created.", "success");
      }

      navigate("/invoices");
      fetchInvoices();
    } catch (err) {
      if (err.message !== "Unauthorized") showToast(err.message, "error");
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const handleInvoiceDeleteConfirm = async () => {
    if (!invoiceToDelete) return;
    setIsDeletingInvoice(true);
    try {
      const res = await authenticatedFetch(`${API_INVOICES}/${invoiceToDelete._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete invoice.");
      showToast("Invoice deleted.", "success");
      setInvoiceToDelete(null);
      fetchInvoices(searchQuery);
    } catch (err) {
      if (err.message !== "Unauthorized") showToast(err.message, "error");
    } finally {
      setIsDeletingInvoice(false);
    }
  };

  const handleMarkAsPaid = async (invoice) => {
    setProcessingInvoiceIds((p) => ({ ...p, [invoice._id]: { ...p[invoice._id], paid: true } }));
    try {
      const res = await authenticatedFetch(`${API_INVOICES}/${invoice._id}/mark-paid`, { method: "POST" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Error.");
      showToast(result.emailError ? "Marked Paid, email failed." : `Invoice ${invoice.invoiceNumber} marked Paid!`, result.emailError ? "warning" : "success");
      fetchInvoices(searchQuery);
    } catch (err) {
      if (err.message !== "Unauthorized") showToast(err.message, "error");
    } finally {
      setProcessingInvoiceIds((p) => ({ ...p, [invoice._id]: { ...p[invoice._id], paid: false } }));
    }
  };

  const handleResendEmail = async (invoice) => {
    setProcessingInvoiceIds((p) => ({ ...p, [invoice._id]: { ...p[invoice._id], resend: true } }));
    try {
      const res = await authenticatedFetch(`${API_INVOICES}/${invoice._id}/resend-email`, { method: "POST" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Error.");
      showToast(`Invoice ${invoice.invoiceNumber} resent!`, "success");
    } catch (err) {
      if (err.message !== "Unauthorized") showToast(err.message, "error");
    } finally {
      setProcessingInvoiceIds((p) => ({ ...p, [invoice._id]: { ...p[invoice._id], resend: false } }));
    }
  };

  const handleDownloadPdf = (invoice) => {
    window.open(`${API_INVOICES}/${invoice._id}/download-pdf?token=${token}`, "_blank");
    showToast(`Downloading PDF for ${invoice.invoiceNumber}...`, "success");
  };

  const handlePreviewDummyInvoice = () => {
    navigate("/invoices/preview", {
      state: {
        invoiceData: DUMMY_PREVIEW_INVOICE,
        clients: [DUMMY_PREVIEW_CLIENT, ...clients],
        isDummyPreview: true,
      },
    });
  };

  // ── Shell props ───────────────────────────────────────────────────────────
  const shellProps = {
    companyName,
    companyLogo,
    clients,
    searchQuery,
    setSearchQuery,
    setIsClientFormOpen,
    setSelectedClientForEdit,
    onLogout: handleLogout,
    onChangePassword: () => setIsPasswordModalOpen(true),
    fetchClients,
    fetchInvoices,
  };

  // ─── Views ────────────────────────────────────────────────────────────────
  const DashboardPage = () => (
    <div className="space-y-6">
      <DashboardStats clients={clients} invoices={invoices} />
      <DashboardView
        clients={clients}
        invoices={invoices}
        onViewClient={(c) => { setSelectedClientForView(c); setIsClientProfileOpen(true); }}
        onViewInvoice={(inv) => navigate(`/invoices/${inv._id}/edit`, { state: { invoice: inv } })}
        onMarkInvoiceAsPaid={handleMarkAsPaid}
        onDownloadInvoicePdf={handleDownloadPdf}
        onCreateInvoice={() => navigate("/invoices/create")}
        onAddClient={() => { setSelectedClientForEdit(null); setIsClientFormOpen(true); }}
        processingInvoiceIds={processingInvoiceIds}
      />
    </div>
  );

  const ClientsPage = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Clients Profiles Directory</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Store company coordinates, website, industry classifications, and Indian GSTIN references.
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); fetchClients(e.target.value); }}
            placeholder="Search name, company, or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(""); fetchClients(""); }} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {loadingClients && clients.length === 0 ? (
        <div className="w-full h-64 bg-white border border-slate-100 rounded-2xl custom-shadow flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-400 font-medium">Loading clients...</span>
          </div>
        </div>
      ) : (
        <ClientTable
          clients={clients}
          onView={(c) => { setSelectedClientForView(c); setIsClientProfileOpen(true); }}
          onEdit={(c) => { setSelectedClientForEdit(c); setIsClientFormOpen(true); }}
          onDelete={(c) => setClientToDelete(c)}
        />
      )}
    </div>
  );

  const InvoicesPage = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Invoices Tracking Ledger</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Generate taxable invoices, assign SAC service codes, check GST breakdowns, and download PDFs.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handlePreviewDummyInvoice}
            className="px-4 py-2.5 rounded-xl border border-[#5D5FEF] bg-white text-[#5D5FEF] hover:bg-indigo-50 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Preview Dummy Invoice</span>
          </button>
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); fetchInvoices(e.target.value); }}
              placeholder="Search INV No, client, or service..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); fetchInvoices(""); }} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      {loadingInvoices && invoices.length === 0 ? (
        <div className="w-full h-64 bg-white border border-slate-100 rounded-2xl custom-shadow flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-400 font-medium">Loading invoices...</span>
          </div>
        </div>
      ) : (
        <InvoiceTable
          invoices={invoices}
          onEdit={(inv) => navigate(`/invoices/${inv._id}/edit`, { state: { invoice: inv } })}
          onDelete={(inv) => setInvoiceToDelete(inv)}
          onMarkAsPaid={handleMarkAsPaid}
          onResendEmail={handleResendEmail}
          onDownloadPdf={handleDownloadPdf}
          processingIds={processingInvoiceIds}
        />
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} companyName={companyName} companyLogo={companyLogo} />}
        />

        {/* Protected layout shell — all child routes render via <Outlet> */}
        <Route
          element={
            isAuthenticated
              ? <AppShell {...shellProps} />
              : <Navigate to="/login" replace />
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/create" element={<InvoiceFormPage clients={clients} isSaving={isSavingInvoice} onSubmit={handleInvoiceSubmit} token={token} />} />
          <Route path="invoices/:id/edit" element={<InvoiceFormPage clients={clients} isSaving={isSavingInvoice} onSubmit={handleInvoiceSubmit} token={token} />} />
          <Route path="invoices/preview" element={<InvoicePreviewPage clients={clients} isSaving={isSavingInvoice} onSend={handleInvoiceSubmit} token={token} />} />
          <Route path="settings/profile" element={<InvoiceConfigPage />} />
          <Route path="settings/services" element={<ServiceSettingsPage token={token} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

      {/* Global modals (outside routing, always mounted) */}
      <ClientModal
        isOpen={isClientFormOpen}
        onClose={() => { setIsClientFormOpen(false); setSelectedClientForEdit(null); }}
        onSubmit={handleClientSubmit}
        client={selectedClientForEdit}
        isSaving={isSavingClient}
      />
      <ClientProfileModal
        isOpen={isClientProfileOpen}
        onClose={() => { setIsClientProfileOpen(false); setSelectedClientForView(null); }}
        client={selectedClientForView}
        invoices={invoices}
      />
      <ConfirmDialog
        isOpen={!!clientToDelete}
        onClose={() => setClientToDelete(null)}
        onConfirm={handleClientDeleteConfirm}
        title="Delete Client Profile"
        message={`Delete profile for ${clientToDelete?.companyName}? This will also delete ALL associated invoices.`}
        confirmText="Delete Client & Invoices"
        isDeleting={isDeletingClient}
      />
      <ConfirmDialog
        isOpen={!!invoiceToDelete}
        onClose={() => setInvoiceToDelete(null)}
        onConfirm={handleInvoiceDeleteConfirm}
        title="Delete Invoice"
        message={`Delete invoice ${invoiceToDelete?.invoiceNumber}? This action is permanent.`}
        confirmText="Delete Invoice"
        isDeleting={isDeletingInvoice}
      />
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        showToast={showToast}
      />
      <ToastPanel toasts={toasts} removeToast={removeToast} />
    </>
  );
}
