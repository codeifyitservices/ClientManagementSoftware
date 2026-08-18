import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
  const d = new Date();
  d.setDate(d.getDate() + 15);
  return d.toISOString().split("T")[0];
};

const DUMMY_PREVIEW_INVOICE = {
  _id: "dummy-preview-invoice",
  invoiceNumber: "CN-2026-001",
  invoiceDate: new Date().toISOString().split("T")[0],
  dueDate: getPreviewDueDate(),
  billingPeriod: "July 2026",
  paymentStatus: "Pending",
  items: [
    {
      serviceName: "Web Development Services",
      description: "Milestone 1: UI/UX Design and Frontend Prototype Delivery",
      sacCode: "998314",
      qty: 1,
      rate: 75000,
      amount: 75000,
      gstRate: 18,
    },
    {
      serviceName: "Cloud Hosting Maintenance",
      description: "Monthly recurring AWS cloud hosting management fee",
      sacCode: "998313",
      qty: 1,
      rate: 15000,
      amount: 15000,
      gstRate: 18,
    },
  ],
  totalAmount: 106200, // (75000+15000) * 1.18
};

export function useAppService() {
  const navigate = useNavigate();

  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const role = localStorage.getItem("userRole") || "Admin";
      const permissionsStr = localStorage.getItem("userPermissions");
      const permissions = permissionsStr ? JSON.parse(permissionsStr) : [
        "View Employees", "Create Employees", "Edit Employees", "Delete Employees",
        "View Documents", "Upload Documents", "Delete Documents", "Manage Roles"
      ];
      const fullName = localStorage.getItem("userFullName") || "System Admin";
      const email = localStorage.getItem("userEmail") || "admin@codenap.co.in";
      const _id = localStorage.getItem("userId") || "";
      return { role, permissions, fullName, email, _id };
    } catch {
      return { role: "Admin", permissions: [], fullName: "System Admin", email: "admin@codenap.co.in", _id: "" };
    }
  });

  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState(false);
  const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] = useState(null);
  const [employeesList, setEmployeesList] = useState([]);
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);

  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [leads, setLeads] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [companyName, setCompanyName] = useState(
    localStorage.getItem("companyName") || "Codenap IT Services",
  );
  const [companyLogo, setCompanyLogo] = useState(
    localStorage.getItem("companyLogo") || "",
  );

  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

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
    // Check if duplicate toast exists in current render state
    const exists = toasts.some((t) => t.message === message);
    if (exists) {
      return;
    }

    const id = Date.now();
    setToasts((prevToasts) => {
      // Double check within updater to prevent duplicates in batched updates
      if (prevToasts.some((t) => t.message === message)) {
        return prevToasts;
      }
      return [...prevToasts, { id, message, type }];
    });

    setTimeout(() => {
      setToasts((p) => p.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => setToasts((p) => p.filter((t) => t.id !== id));

  // ── Auth ──────────────────────────────────────────────────────────────────
  const handleLogin = (newToken, email, userData, isAdminPortal) => {
    const requiredRole = isAdminPortal ? "Admin" : "Employee";
    if (userData?.role !== requiredRole) {
      if (isAdminPortal) {
        throw new Error("Access denied. Employees must log in through the employee portal.");
      } else {
        throw new Error("Access denied. Admins must log in through the admin portal.");
      }
    }

    localStorage.setItem("token", newToken);
    localStorage.setItem("userRole", userData?.role || "Employee");
    localStorage.setItem("userPermissions", JSON.stringify(userData?.permissions || []));
    localStorage.setItem("userFullName", userData?.fullName || "User");
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userId", userData?._id || "");
    setToken(newToken);
    setCurrentUser({
      role: userData?.role || "Employee",
      permissions: userData?.permissions || [],
      fullName: userData?.fullName || "User",
      email: email,
      _id: userData?._id || "",
    });
    setIsAuthenticated(true);
    showToast("Welcome to Startup Portal!", "success");
  };

  const handleLogout = () => {
    const isAdmin = currentUser?.role === "Admin";
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userPermissions");
    localStorage.removeItem("userFullName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userId");
    setToken(null);
    setCurrentUser({ role: "Employee", permissions: [], fullName: "", email: "", _id: "" });
    setIsAuthenticated(false);
    setClients([]);
    setInvoices([]);
    navigate(isAdmin ? "/admin/login" : "/login");
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
      const url = search
        ? `${API_CLIENTS}?search=${encodeURIComponent(search)}`
        : API_CLIENTS;
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
      const url = search
        ? `${API_INVOICES}?search=${encodeURIComponent(search)}`
        : API_INVOICES;
      setInvoices(await (await authenticatedFetch(url)).json());
    } catch (err) {
      if (err.message !== "Unauthorized") showToast(err.message, "error");
    } finally {
      setLoadingInvoices(false);
    }
  };

  const fetchProjects = async () => {
    if (!token) return;
    try {
      setLoadingProjects(true);
      const res = await authenticatedFetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/projects`
      );
      if (res.ok) {
        const data = await res.json();
        setProjects(data || []);
      }
    } catch (err) {
      if (err.message !== "Unauthorized") console.error("Error fetching projects:", err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchLeads = async () => {
    if (!token) return;
    try {
      setLoadingLeads(true);
      const res = await authenticatedFetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/leads`
      );
      if (res.ok) {
        const data = await res.json();
        setLeads(data || []);
      }
    } catch (err) {
      if (err.message !== "Unauthorized") console.error("Error fetching leads:", err);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCompanyConfig();
      fetchClients();
      fetchInvoices();
      fetchActiveAlerts();
      fetchNotifications();
      fetchEmployeesList();
      fetchProjects();
      fetchLeads();
    }
  }, [token]);

  const fetchActiveAlerts = async () => {
    if (!token) return;
    try {
      const res = await authenticatedFetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/subscriptions/alerts`
      );
      if (res.ok) {
        const data = await res.json();
        setActiveAlerts(data || []);
      }
    } catch (err) {}
  };

  const handleDismissAlert = async (alert) => {
    try {
      const res = await authenticatedFetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/subscriptions/${alert.subscriptionId}/dismiss-alert`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alertType: alert.alertType })
        }
      );
      if (res.ok) {
        showToast("Alert dismissed in app.", "success");
        fetchActiveAlerts();
      }
    } catch (err) {
      showToast("Failed to dismiss alert.", "error");
    }
  };

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await authenticatedFetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/notifications`
      );
      if (res.ok) {
        const data = await res.json();
        setNotifications(data || []);
        const unreadCount = data.filter((n) => !n.isRead).length;
        setUnreadNotificationsCount(unreadCount);
      }
    } catch (err) {}
  };

  const markNotificationAsRead = async (notificationId) => {
    if (!token) return;
    try {
      const res = await authenticatedFetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/notifications/${notificationId}/read`,
        { method: "POST" }
      );
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {}
  };

  const markAllNotificationsAsRead = async () => {
    if (!token) return;
    try {
      const res = await authenticatedFetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/notifications/read-all`,
        { method: "POST" }
      );
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {}
  };

  const fetchEmployeesList = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/employees?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setEmployeesList(data.employees || []);
      }
    } catch {}
  };

  const handleEmployeeSubmit = async (data) => {
    setIsSavingEmployee(true);
    try {
      const url = selectedEmployeeForEdit
        ? `${import.meta.env.VITE_BACKEND_URL}/api/employees/${selectedEmployeeForEdit._id}`
        : `${import.meta.env.VITE_BACKEND_URL}/api/employees`;
      const method = selectedEmployeeForEdit ? "PUT" : "POST";

      const isFormData = data instanceof FormData;
      const headers = {
        Authorization: `Bearer ${token}`,
      };
      if (!isFormData) {
        headers["Content-Type"] = "application/json";
      }

      const res = await fetch(url, {
        method,
        headers,
        body: isFormData ? data : JSON.stringify(data),
      });

      const responseData = await res.json();
      if (res.ok) {
        showToast(
          selectedEmployeeForEdit
            ? "Employee profile updated successfully."
            : "Employee profile created successfully.",
          "success"
        );
        setIsEmployeeFormOpen(false);
        setSelectedEmployeeForEdit(null);
        fetchEmployeesList();
      } else {
        showToast(responseData.message || "Failed to save employee profile.", "error");
      }
    } catch (err) {
      showToast("Network error saving employee.", "error");
    } finally {
      setIsSavingEmployee(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchCompanyConfig();
      fetchClients();
      fetchActiveAlerts();
      fetchEmployeesList();
      fetchNotifications();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    window.addEventListener("companyConfigUpdated", fetchCompanyConfig);
    const handleAlertsUpdate = () => {
      fetchActiveAlerts();
    };
    window.addEventListener("subscriptionAlertsUpdated", handleAlertsUpdate);
    return () => {
      window.removeEventListener("companyConfigUpdated", fetchCompanyConfig);
      window.removeEventListener("subscriptionAlertsUpdated", handleAlertsUpdate);
    };
  }, [token]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleClientSubmit = async (data) => {
    setIsSavingClient(true);
    const isEdit = !!selectedClientForEdit;
    const url = isEdit
      ? `${API_CLIENTS}/${selectedClientForEdit._id}`
      : API_CLIENTS;
    try {
      const res = await authenticatedFetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok)
        throw new Error((await res.json()).message || "Failed to save client.");
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
      const res = await authenticatedFetch(
        `${API_CLIENTS}/${clientToDelete._id}`,
        { method: "DELETE" },
      );
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

      showToast(
        invoiceId ? "Invoice updated successfully." : "Invoice created successfully.",
        "success",
      );

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
      const res = await authenticatedFetch(
        `${API_INVOICES}/${invoiceToDelete._id}`,
        { method: "DELETE" },
      );
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

  const handleClientBulkDelete = async (ids) => {
    try {
      await Promise.all(
        ids.map((id) =>
          authenticatedFetch(`${API_CLIENTS}/${id}`, { method: "DELETE" }),
        ),
      );
      showToast(`${ids.length} client(s) deleted.`, "success");
      fetchClients(searchQuery);
      fetchInvoices();
    } catch (err) {
      if (err.message !== "Unauthorized") showToast(err.message, "error");
    }
  };

  const handleInvoiceBulkDelete = async (ids) => {
    try {
      await Promise.all(
        ids.map((id) =>
          authenticatedFetch(`${API_INVOICES}/${id}`, { method: "DELETE" }),
        ),
      );
      showToast(`${ids.length} invoice(s) deleted.`, "success");
      fetchInvoices(searchQuery);
    } catch (err) {
      if (err.message !== "Unauthorized") showToast(err.message, "error");
    }
  };

  const handleMarkAsPaid = async (invoiceArg) => {
    const invoiceId = typeof invoiceArg === "string" ? invoiceArg : invoiceArg?._id;
    const invoiceNumber = typeof invoiceArg === "object" ? invoiceArg?.invoiceNumber : invoiceArg;
    if (!invoiceId) return;

    setProcessingInvoiceIds((p) => ({
      ...p,
      [invoiceId]: { ...p[invoiceId], paid: true },
    }));
    try {
      const res = await authenticatedFetch(
        `${API_INVOICES}/${invoiceId}/mark-paid`,
        { method: "POST" },
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Error.");
      showToast(
        result.emailError
          ? "Marked Paid, email failed."
          : `Invoice ${invoiceNumber || ""} marked Paid!`,
        result.emailError ? "warning" : "success",
      );
      fetchInvoices(searchQuery);
    } catch (err) {
      if (err.message !== "Unauthorized") showToast(err.message, "error");
    } finally {
      setProcessingInvoiceIds((p) => {
        const next = { ...p };
        delete next[invoiceId];
        return next;
      });
    }
  };

  const handleResendEmail = async (invoiceArg) => {
    const invoiceId = typeof invoiceArg === "string" ? invoiceArg : invoiceArg?._id;
    const invoiceNumber = typeof invoiceArg === "object" ? invoiceArg?.invoiceNumber : invoiceArg;
    if (!invoiceId) return;

    setProcessingInvoiceIds((p) => ({
      ...p,
      [invoiceId]: { ...p[invoiceId], resend: true },
    }));
    try {
      const res = await authenticatedFetch(
        `${API_INVOICES}/${invoiceId}/resend-email`,
        { method: "POST" },
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Error.");
      showToast(`Email for invoice ${invoiceNumber || ""} sent successfully!`, "success");
    } catch (err) {
      if (err.message !== "Unauthorized") showToast(err.message, "error");
    } finally {
      setProcessingInvoiceIds((p) => {
        const next = { ...p };
        delete next[invoiceId];
        return next;
      });
    }
  };

  const handleDownloadPdf = async (invoice) => {
    try {
      showToast(`Generating PDF for ${invoice.invoiceNumber}...`, "success");
      const res = await authenticatedFetch(
        `${API_INVOICES}/${invoice._id}/download-pdf`,
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to download PDF.");
      }
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `Invoice_${invoice.invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      showToast(`Downloaded PDF for ${invoice.invoiceNumber}.`, "success");
    } catch (err) {
      if (err.message !== "Unauthorized") {
        showToast(err.message || "Error downloading PDF.", "error");
      }
    }
  };

  const handleDownloadSelectedZip = async (ids = []) => {
    if (!ids || ids.length === 0) return;
    try {
      showToast(`Generating ZIP archive for ${ids.length} invoice(s)...`, "success");
      const res = await authenticatedFetch(
        `${API_INVOICES}/download-zip?ids=${ids.join(",")}`,
      );
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to download ZIP archive.");
      }
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute(
        "download",
        `Invoices_Archive_${new Date().toISOString().slice(0, 10)}.zip`,
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      showToast(`Downloaded ZIP archive for ${ids.length} invoice(s).`, "success");
    } catch (err) {
      if (err.message !== "Unauthorized") {
        showToast(err.message || "Error downloading ZIP file.", "error");
      }
    }
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

  return {
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
    loadingProjects,
    loadingLeads,
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
  };
}
