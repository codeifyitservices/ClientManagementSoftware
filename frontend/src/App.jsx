import React, { useState, useEffect, useRef } from "react";
import {
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
  useLocation,
  useParams,
} from "react-router-dom";
import { Plus, X, ChevronDown, Eye, Search, Bell, Check } from "lucide-react";
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
import DataBackupPage from "./components/DataBackupPage";
import LoginPage from "./components/LoginPage";
import PasswordModal from "./components/PasswordModal";
import SubscriptionsPage from "./components/SubscriptionsPage";
import SubscriptionDetailPage from "./components/SubscriptionDetailPage";
import ProjectsPage from "./components/ProjectsPage";
import ProjectFormPage from "./components/ProjectFormPage";
import ProjectDetailPage from "./components/ProjectDetailPage";
import EmployeeList from "./components/EmployeeList";
import EmployeeProfile from "./components/EmployeeProfile";
import EmployeeModal from "./components/EmployeeModal";
import EmployeeDashboard from "./components/EmployeeDashboard";
import HRDashboard from "./components/HRDashboard";
import { useAppService } from "./services/appService";
import TaskListPage from "./components/TaskListPage";
import TaskDetailPage from "./components/TaskDetailPage";
import TicketListPage from "./components/TicketListPage";
import TicketDetailPage from "./components/TicketDetailPage";
import AttendancePage from "./components/attendance/AttendancePage";
import LeadsPage from "./components/LeadsPage";
import LeadFormPage from "./components/LeadFormPage";
import LeadDetailPage from "./components/LeadDetailPage";

const API_CLIENTS = `${import.meta.env.VITE_BACKEND_URL}/api/clients`;
const API_INVOICES = `${import.meta.env.VITE_BACKEND_URL}/api/invoices`;

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
  activeAlerts = [],
  onDismissAlert,
  currentUser = {
    role: "Admin",
    email: "admin@codenap.in",
    fullName: "System Admin",
  },
  notifications = [],
  unreadNotificationsCount = 0,
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const userMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
      if (
        notificationMenuRef.current &&
        !notificationMenuRef.current.contains(e.target)
      ) {
        setShowNotificationMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const headerMeta = {
    "/": {
      title: "Dashboard",
      sub:
        currentUser?.role === "Employee"
          ? "Employee Workspace"
          : "Welcome back, Admin!",
    },
    "/clients": {
      title: "Clients Profiles",
      sub: "Manage company coordinates, contact list, and GSTIN directories",
    },
    "/leads": {
      title: "Leads Pipeline",
      sub: "Track prospective clients, pipeline stages, and communication history",
    },
    "/leads/create": {
      title: "Create Lead",
      sub: "Configure initial parameters for a new pipeline lead",
    },
    "/invoices": {
      title: "Invoices Ledger",
      sub: "Track transactions, SAC tax codes, and payments",
    },
    "/invoices/create": {
      title: "Create Invoice",
      sub: "Specify billing items and values to generate a new invoice",
    },
    "/invoices/preview": {
      title: "Invoice Preview",
      sub: "Inspect your tax document formatting, items, and tax rates",
    },
    "/subscriptions": {
      title: "Subscriptions Ledger",
      sub: "Configure and track client hosting and maintenance contracts",
    },
    "/projects": {
      title: "Projects Ledger",
      sub: "Track project milestones, stage progress, and link invoices",
    },
    "/projects/create": {
      title: "Create Project",
      sub: "Configure project parameters and define milestone billing stages",
    },
    "/projects/:id/edit": {
      title: "Edit Project",
      sub: "Modify project metadata and milestone details",
    },
    "/projects/:id": {
      title: "Project Coordinates",
      sub: "Inspect project budget installments, payment milestones, and generated invoices",
    },
    "/settings/profile": {
      title: "Company Settings",
      sub: "Update brand parameters, addresses, and layout settings",
    },
    "/settings/services": {
      title: "Service Settings",
      sub: "Configure billing services, SAC tax codes, and GST rates",
    },
    "/settings/backup": {
      title: "Data Backup & Export",
      sub: "Backup entire dataset or individual collections in compressed JSON ZIP archives",
    },
    "/employees": {
      title: "Employee Directory",
      sub: "Manage your company employees, core records, personal profiles, and document checklists",
    },
    "/my-profile": {
      title: "My Profile",
      sub: "View and update your personal details, address, and emergency contact",
    },
    "/tasks": {
      title: "Tasks Management",
      sub: "Organize workspace tasks, set deadlines, and track milestones",
    },
    "/tickets": {
      title: "Bug Ticket Directory",
      sub: "Log application defects, assign developers, and track resolutions",
    },
  };

  const isEditInvoice = /^\/invoices\/.+\/edit$/.test(path);
  const isEmployeeProfile = /^\/employees\/.+$/.test(path);
  const isTaskDetail = /^\/tasks\/.+$/.test(path);
  const isTicketDetail = /^\/tickets\/.+$/.test(path);

  const isEditProject = /^\/projects\/.+\/edit$/.test(path);
  const isProjectDetail = /^\/projects\/.+$/.test(path) && !isEditProject && path !== "/projects/create";

  const isEditLead = /^\/leads\/.+\/edit$/.test(path);
  const isLeadDetail = /^\/leads\/.+$/.test(path) && !isEditLead && path !== "/leads/create";

  const currentMeta = isEditInvoice
    ? {
        title: "Edit Invoice",
        sub: "Modify fields and item calculations on existing invoice records",
      }
    : isEmployeeProfile
      ? {
          title: "Employee Profile",
          sub: "Detailed profile, personal records, identity proofs, notes, and activity timeline",
        }
      : isTaskDetail
        ? {
            title: "Task Details",
            sub: "Review task details, track progress, and write comments",
          }
        : isTicketDetail
          ? {
              title: "Bug Ticket Details",
              sub: "Review reproduction steps, assign developer, and resolve bug ticket",
            }
          : isEditProject
            ? {
                title: "Edit Project",
                sub: "Modify project metadata and milestone details",
              }
            : isProjectDetail
              ? {
                  title: "Project Coordinates",
                  sub: "Inspect project budget installments, payment milestones, and generated invoices",
                }
              : isEditLead
                ? {
                    title: "Edit Lead",
                    sub: "Modify prospective lead metadata and follow-up alerts",
                  }
                : isLeadDetail
                  ? {
                      title: "Lead Coordinates",
                      sub: "Inspect prospective client details and history of follow-up interactions",
                    }
                  : headerMeta[path] || { title: "", sub: "" };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 grid-bg flex">
      <Sidebar
        companyName={companyName}
        companyLogo={companyLogo}
        currentUser={currentUser}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Page Header */}
        <header className="border-b border-slate-100 bg-white/70 backdrop-blur-md sticky top-0 z-35 px-8 h-16 flex items-center justify-between shrink-0 select-none">
          <div>
            {currentMeta.title && (
              <>
                <h1 className="text-sm font-bold text-slate-900 leading-none">
                  {currentMeta.title}
                </h1>
                <span className="text-[10px] font-medium text-slate-400 mt-1 block">
                  {currentMeta.sub}
                </span>
              </>
            )}
          </div>

          {/* Actions + Brand Badge */}
          <div className="flex items-center gap-3">
            {path === "/clients" && (
              <button
                onClick={() => {
                  setSelectedClientForEdit(null);
                  setIsClientFormOpen(true);
                }}
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

            {/* Notification Bell */}
            <div className="relative" ref={notificationMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setShowNotificationMenu((v) => !v);
                  if (!showNotificationMenu) {
                    fetchNotifications();
                  }
                }}
                className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer select-none flex items-center justify-center animate-none"
              >
                <Bell className="h-4 w-4" />
                {activeAlerts.length + unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center animate-bounce">
                    {activeAlerts.length + unreadNotificationsCount}
                  </span>
                )}
              </button>

              {showNotificationMenu && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl py-2.5 z-50 animate-fade-in text-xs font-semibold text-slate-750">
                  <div className="px-4 py-2 border-b border-slate-50 flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-800">
                      Notifications & Alerts
                    </p>
                    {unreadNotificationsCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[9px] text-[#5D5FEF] hover:text-[#4d4fdf] font-bold border-0 bg-transparent cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-50 mt-1">
                    {/* Subscription Alerts */}
                    {activeAlerts.map((alert) => (
                      <div
                        key={`${alert.subscriptionId}-${alert.alertType}`}
                        className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-slate-50/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-900 leading-tight truncate">
                            {alert.client?.companyName}
                          </p>
                          <p className="text-[9px] text-slate-450 mt-0.5 leading-relaxed">
                            {alert.type.charAt(0).toUpperCase() +
                              alert.type.slice(1)}{" "}
                            subscription expires on{" "}
                            {new Date(alert.endDate).toLocaleDateString(
                              "en-IN",
                            )}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDismissAlert(alert)}
                          className="p-1 rounded-md bg-slate-50 hover:bg-emerald-50 text-slate-450 hover:text-emerald-650 border border-slate-100 transition-colors cursor-pointer shrink-0"
                          title="Dismiss Alert"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Task and Bug notifications */}
                    {notifications.map((notif) => (
                      <div
                        key={notif._id}
                        onClick={() => {
                          markNotificationAsRead(notif._id);
                          setShowNotificationMenu(false);
                          if (notif.type === "Task") {
                            navigate(`/tasks/${notif.relatedId}`);
                          } else if (notif.type === "Bug") {
                            navigate(`/tickets/${notif.relatedId}`);
                          }
                        }}
                        className={`px-4 py-3 flex items-start justify-between gap-3 hover:bg-slate-50/50 cursor-pointer ${
                          !notif.isRead ? "bg-indigo-50/20" : ""
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${!notif.isRead ? "bg-indigo-500" : "bg-slate-300"}`}
                            />
                            {notif.title}
                          </p>
                          <p className="text-[9px] text-slate-450 mt-0.5 leading-normal">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    ))}

                    {activeAlerts.length === 0 &&
                      notifications.length === 0 && (
                        <div className="px-4 py-6 text-center text-[10px] text-slate-400 font-semibold">
                          No active alerts or notifications 🎉
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>

            {/* User dropdown — company brand badge */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#5D5FEF]/10 border border-[#5D5FEF]/20 text-[#5D5FEF] font-bold text-xs hover:bg-[#5D5FEF]/15 transition-colors cursor-pointer select-none"
              >
                <div className="h-4 w-4 rounded-md bg-[#5D5FEF] text-white flex items-center justify-center shrink-0">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <span>{companyName}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 ml-0.5 transition-transform ${showUserMenu ? "rotate-180" : ""}`}
                  strokeWidth={2.5}
                />
              </button>

              {/* Dropdown menu */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl py-1.5 z-50 animate-fade-in">
                  <div className="px-4 py-2.5 border-b border-slate-50">
                    <p className="text-[11px] font-bold text-slate-800">
                      {currentUser.fullName}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">
                      {currentUser.email} ({currentUser.role})
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onChangePassword();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                  >
                    <svg
                      className="h-3.5 w-3.5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                    Change Password
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[11px] font-semibold text-red-500 hover:bg-red-50 transition-colors text-left cursor-pointer"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
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

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// ─── Root App ────────────────────────────────────────────────────────────────
export default function App() {
  const navigate = useNavigate();
  const service = useAppService();

  const {
    token,
    setToken,
    isAuthenticated,
    setIsAuthenticated,
    currentUser,
    setCurrentUser,
    isEmployeeFormOpen,
    setIsEmployeeFormOpen,
    selectedEmployeeForEdit,
    setSelectedEmployeeForEdit,
    employeesList,
    isSavingEmployee,
    clients,
    invoices,
    projects,
    leads,
    activeAlerts,
    searchQuery,
    setSearchQuery,
    loadingClients,
    loadingInvoices,
    companyName,
    companyLogo,
    isClientFormOpen,
    setIsClientFormOpen,
    isClientProfileOpen,
    setIsClientProfileOpen,
    isPasswordModalOpen,
    setIsPasswordModalOpen,
    selectedClientForEdit,
    setSelectedClientForEdit,
    selectedClientForView,
    setSelectedClientForView,
    clientToDelete,
    setClientToDelete,
    invoiceToDelete,
    setInvoiceToDelete,
    isSavingClient,
    isSavingInvoice,
    isDeletingClient,
    isDeletingInvoice,
    processingInvoiceIds,
    toasts,
    showToast,
    removeToast,
    handleLogin,
    handleLogout,
    authenticatedFetch,
    fetchCompanyConfig,
    fetchClients,
    fetchInvoices,
    fetchProjects,
    fetchLeads,
    fetchActiveAlerts,
    handleDismissAlert,
    fetchEmployeesList,
    handleEmployeeSubmit,
    handleClientSubmit,
    handleClientDeleteConfirm,
    handleInvoiceSubmit,
    handleInvoiceDeleteConfirm,
    handleClientBulkDelete,
    handleInvoiceBulkDelete,
    handleMarkAsPaid,
    handleResendEmail,
    handleDownloadPdf,
    handleDownloadSelectedZip,
    handlePreviewDummyInvoice,
    notifications,
    unreadNotificationsCount,
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = service;

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
    activeAlerts,
    onDismissAlert: handleDismissAlert,
    currentUser,
    notifications,
    unreadNotificationsCount,
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  };

  // ─── Views ────────────────────────────────────────────────────────────────
  const DashboardPage = () => {
    const [dashTab, setDashTab] = useState("business");
    return (
      <div className="space-y-6">
        {/* Dashboard Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setDashTab("business")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dashTab === "business"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Business Overview
          </button>
          <button
            onClick={() => setDashTab("hr")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dashTab === "hr"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            HR & Operations
          </button>
        </div>

        {dashTab === "business" ? (
          <>
            <DashboardStats clients={clients} invoices={invoices} projects={projects} leads={leads} />
            <DashboardView
              clients={clients}
              invoices={invoices}
              projects={projects}
              leads={leads}
              onViewClient={(c) => {
                setSelectedClientForView(c);
                setIsClientProfileOpen(true);
              }}
              onViewInvoice={(inv) =>
                navigate(`/invoices/${inv._id}/edit`, {
                  state: { invoice: inv },
                })
              }
              onMarkInvoiceAsPaid={handleMarkAsPaid}
              onDownloadInvoicePdf={handleDownloadPdf}
              onCreateInvoice={() => navigate("/invoices/create")}
              onAddClient={() => {
                setSelectedClientForEdit(null);
                setIsClientFormOpen(true);
              }}
              onCreateProject={() => navigate("/projects/create")}
              onAddLead={() => navigate("/leads/create")}
              processingInvoiceIds={processingInvoiceIds}
              onNavigate={(path) => navigate(`/${path}`)}
              activeAlerts={activeAlerts}
            />
          </>
        ) : (
          <HRDashboard token={token} />
        )}
      </div>
    );
  };

  const ClientsPage = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Clients Profiles Directory
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Store company coordinates, website, industry classifications, and
            Indian GSTIN references.
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              fetchClients(e.target.value);
            }}
            placeholder="Search name, company, or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                fetchClients("");
              }}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {loadingClients && clients.length === 0 ? (
        <div className="w-full h-64 bg-white border border-slate-100 rounded-2xl custom-shadow flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-400 font-medium">
              Loading clients...
            </span>
          </div>
        </div>
      ) : (
        <ClientTable
          clients={clients}
          onView={(c) => {
            setSelectedClientForView(c);
            setIsClientProfileOpen(true);
          }}
          onEdit={(c) => {
            setSelectedClientForEdit(c);
            setIsClientFormOpen(true);
          }}
          onDelete={(c) => setClientToDelete(c)}
          onDeleteSelected={handleClientBulkDelete}
        />
      )}
    </div>
  );

  const InvoicesPage = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Invoices Tracking Ledger
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Generate taxable invoices, assign SAC service codes, check GST
            breakdowns, and download PDFs.
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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                fetchInvoices(e.target.value);
              }}
              placeholder="Search INV No, client, or service..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  fetchInvoices("");
                }}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
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
            <span className="text-sm text-slate-400 font-medium">
              Loading invoices...
            </span>
          </div>
        </div>
      ) : (
        <InvoiceTable
          invoices={invoices}
          clients={clients}
          onEdit={(inv) =>
            navigate(`/invoices/${inv._id}/edit`, { state: { invoice: inv } })
          }
          onDelete={(inv) => setInvoiceToDelete(inv)}
          onMarkAsPaid={handleMarkAsPaid}
          onResendEmail={handleResendEmail}
          onDownloadPdf={handleDownloadPdf}
          processingIds={processingInvoiceIds}
          onDeleteSelected={handleInvoiceBulkDelete}
          onDownloadSelectedZip={handleDownloadSelectedZip}
        />
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <LoginPage
                onLogin={handleLogin}
                companyName={companyName}
                companyLogo={companyLogo}
                isAdminPortal={false}
              />
            )
          }
        />
        <Route
          path="/admin/login"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <LoginPage
                onLogin={handleLogin}
                companyName={companyName}
                companyLogo={companyLogo}
                isAdminPortal={true}
              />
            )
          }
        />

        {/* Protected layout shell — all child routes render via <Outlet> */}
        <Route
          element={
            isAuthenticated ? (
              <AppShell {...shellProps} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route
            index
            element={
              currentUser?.role === "Employee" ? (
                <EmployeeDashboard
                  token={token}
                  currentUser={currentUser}
                  onEditProfile={() => {
                    const loggedInEmp = employeesList.find(
                      (emp) =>
                        emp._id === currentUser._id ||
                        emp.companyEmail?.toLowerCase() ===
                          currentUser.email?.toLowerCase(),
                    ) || {
                      _id: currentUser._id,
                      fullName: currentUser.fullName,
                      companyEmail: currentUser.email,
                    };
                    setSelectedEmployeeForEdit(loggedInEmp);
                    setIsEmployeeFormOpen(true);
                  }}
                />
              ) : (
                <DashboardPage />
              )
            }
          />
          <Route
            path="clients"
            element={
              <AdminRoute currentUser={currentUser}>
                <ClientsPage />
              </AdminRoute>
            }
          />
          <Route
            path="invoices"
            element={
              <AdminRoute currentUser={currentUser}>
                <InvoicesPage />
              </AdminRoute>
            }
          />
          <Route
            path="invoices/create"
            element={
              <AdminRoute currentUser={currentUser}>
                <InvoiceFormPage
                  clients={clients}
                  isSaving={isSavingInvoice}
                  onSubmit={handleInvoiceSubmit}
                  token={token}
                />
              </AdminRoute>
            }
          />
          <Route
            path="invoices/:id/edit"
            element={
              <AdminRoute currentUser={currentUser}>
                <InvoiceFormPage
                  clients={clients}
                  isSaving={isSavingInvoice}
                  onSubmit={handleInvoiceSubmit}
                  token={token}
                />
              </AdminRoute>
            }
          />
          <Route
            path="invoices/preview"
            element={
              <AdminRoute currentUser={currentUser}>
                <InvoicePreviewPage
                  clients={clients}
                  isSaving={isSavingInvoice}
                  onSend={handleInvoiceSubmit}
                  token={token}
                />
              </AdminRoute>
            }
          />
          <Route
            path="settings/profile"
            element={
              <AdminRoute currentUser={currentUser}>
                <InvoiceConfigPage />
              </AdminRoute>
            }
          />
          <Route
            path="settings/services"
            element={
              <AdminRoute currentUser={currentUser}>
                <ServiceSettingsPage token={token} />
              </AdminRoute>
            }
          />

          <Route
            path="settings/backup"
            element={
              <AdminRoute currentUser={currentUser}>
                <DataBackupPage
                  token={token}
                  showToast={showToast}
                  onRestoreSuccess={() => {
                    fetchClients();
                    fetchInvoices();
                    fetchCompanyConfig();
                  }}
                />
              </AdminRoute>
            }
          />
          <Route path="subscriptions">
            <Route
              index
              element={
                <AdminRoute currentUser={currentUser}>
                  <SubscriptionsPage
                    token={token}
                    clients={clients}
                    showToast={showToast}
                    authenticatedFetch={authenticatedFetch}
                  />
                </AdminRoute>
              }
            />
            <Route
              path=":id"
              element={
                <AdminRoute currentUser={currentUser}>
                  <SubscriptionDetailPage
                    token={token}
                    clients={clients}
                    showToast={showToast}
                    authenticatedFetch={authenticatedFetch}
                  />
                </AdminRoute>
              }
            />
          </Route>
          <Route path="leads">
            <Route
              index
              element={
                <AdminRoute currentUser={currentUser}>
                  <LeadsPage
                    token={token}
                    showToast={showToast}
                    authenticatedFetch={authenticatedFetch}
                  />
                </AdminRoute>
              }
            />
            <Route
              path="create"
              element={
                <AdminRoute currentUser={currentUser}>
                  <LeadFormPage
                    token={token}
                    showToast={showToast}
                    authenticatedFetch={authenticatedFetch}
                  />
                </AdminRoute>
              }
            />
            <Route
              path=":id"
              element={
                <AdminRoute currentUser={currentUser}>
                  <LeadDetailPage
                    token={token}
                    showToast={showToast}
                    authenticatedFetch={authenticatedFetch}
                  />
                </AdminRoute>
              }
            />
            <Route
              path=":id/edit"
              element={
                <AdminRoute currentUser={currentUser}>
                  <LeadFormPage
                    token={token}
                    showToast={showToast}
                    authenticatedFetch={authenticatedFetch}
                  />
                </AdminRoute>
              }
            />
          </Route>
          <Route path="projects">
            <Route
              index
              element={
                <AdminRoute currentUser={currentUser}>
                  <ProjectsPage
                    token={token}
                    clients={clients}
                    invoices={invoices}
                    onFetchInvoices={fetchInvoices}
                  />
                </AdminRoute>
              }
            />
            <Route
              path="create"
              element={
                <AdminRoute currentUser={currentUser}>
                  <ProjectFormPage token={token} clients={clients} showToast={showToast} />
                </AdminRoute>
              }
            />
            <Route
              path=":id"
              element={
                <AdminRoute currentUser={currentUser}>
                  <ProjectDetailPage
                    token={token}
                    invoices={invoices}
                    onFetchInvoices={fetchInvoices}
                    currentUser={currentUser}
                  />
                </AdminRoute>
              }
            />
            <Route
              path=":id/edit"
              element={
                <AdminRoute currentUser={currentUser}>
                  <ProjectFormPage token={token} clients={clients} showToast={showToast} />
                </AdminRoute>
              }
            />
          </Route>

          <Route
            path="employees"
            element={
              <AdminRoute currentUser={currentUser}>
                <EmployeeList
                  token={token}
                  currentUser={currentUser}
                  onViewEmployee={(id) => navigate(`/employees/${id}`)}
                  onAddEmployee={() => {
                    setSelectedEmployeeForEdit(null);
                    setIsEmployeeFormOpen(true);
                  }}
                  onEditEmployee={(emp) => {
                    setSelectedEmployeeForEdit(emp);
                    setIsEmployeeFormOpen(true);
                  }}
                  onDeleteEmployee={fetchEmployeesList}
                  showToast={showToast}
                />
              </AdminRoute>
            }
          />
          <Route
            path="employees/:id"
            element={
              <EmployeeProfilePageWrapper
                token={token}
                currentUser={currentUser}
                showToast={showToast}
              />
            }
          />
          <Route
            path="my-profile"
            element={
              <EmployeeProfile
                employeeId={currentUser?._id}
                token={token}
                currentUser={currentUser}
                onBack={() => navigate("/")}
                showToast={showToast}
              />
            }
          />
          <Route
            path="attendance"
            element={<AttendancePage currentUser={currentUser} />}
          />
          <Route
            path="tasks"
            element={
              <TaskListPage
                token={token}
                currentUser={currentUser}
                showToast={showToast}
              />
            }
          />
          <Route
            path="tasks/:id"
            element={
              <TaskDetailPage
                token={token}
                currentUser={currentUser}
                showToast={showToast}
              />
            }
          />
          <Route
            path="tickets"
            element={
              <TicketListPage
                token={token}
                currentUser={currentUser}
                showToast={showToast}
              />
            }
          />
          <Route
            path="tickets/:id"
            element={
              <TicketDetailPage
                token={token}
                currentUser={currentUser}
                showToast={showToast}
              />
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

      {/* Global modals (outside routing, always mounted) */}
      <ClientModal
        isOpen={isClientFormOpen}
        onClose={() => {
          setIsClientFormOpen(false);
          setSelectedClientForEdit(null);
        }}
        onSubmit={handleClientSubmit}
        client={selectedClientForEdit}
        isSaving={isSavingClient}
      />
      <ClientProfileModal
        isOpen={isClientProfileOpen}
        onClose={() => {
          setIsClientProfileOpen(false);
          setSelectedClientForView(null);
        }}
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
      <EmployeeModal
        isOpen={isEmployeeFormOpen}
        onClose={() => {
          setIsEmployeeFormOpen(false);
          setSelectedEmployeeForEdit(null);
        }}
        onSubmit={handleEmployeeSubmit}
        employee={selectedEmployeeForEdit}
        isSaving={isSavingEmployee}
        employeesList={employeesList}
      />
      <ToastPanel toasts={toasts} removeToast={removeToast} />
    </>
  );
}

function EmployeeProfilePageWrapper({ token, currentUser, showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();

  // Only redirect if we have a valid _id and it differs from the requested id
  // Avoids redirect loop when currentUser._id is not yet hydrated
  if (
    currentUser?.role === "Employee" &&
    currentUser._id &&
    id &&
    id !== currentUser._id
  ) {
    return <Navigate to={`/employees/${currentUser._id}`} replace />;
  }

  return (
    <EmployeeProfile
      employeeId={id}
      token={token}
      currentUser={currentUser}
      onBack={
        currentUser?.role === "Employee"
          ? () => navigate("/")
          : () => navigate("/employees")
      }
      showToast={showToast}
    />
  );
}

function AdminRoute({ currentUser, children }) {
  if (currentUser?.role !== "Admin") {
    return <Navigate to="/" replace />;
  }
  return children;
}
