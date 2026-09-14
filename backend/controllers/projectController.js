import Project from "../models/projectModel.js";
import Client from "../models/clientModel.js";
import { syncMilestoneInvoiceStatus } from "./invoiceController.js";

const getNextProjectNumber = async () => {
  let count = await Project.countDocuments();
  let candidate = `PRJ-${String(count + 1).padStart(3, "0")}`;
  let exists = await Project.exists({ projectId: candidate });
  while (exists) {
    count += 1;
    candidate = `PRJ-${String(count + 1).padStart(3, "0")}`;
    exists = await Project.exists({ projectId: candidate });
  }
  return candidate;
};

// GET /api/projects - Get all projects (or assigned projects if employee)
export const getProjects = async (req, res) => {
  try {
    const { search, clientId } = req.query;
    let query = {};

    // Restrict standard employees to only see projects they are assigned to
    if (req.user.role === "Employee") {
      query.assignedEmployees = req.user._id;
    }

    if (clientId) {
      query.client = clientId;
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      const matchedClients = await Client.find({
        $or: [
          { clientName: searchRegex },
          { companyName: searchRegex },
        ],
      }).select("_id");

      const clientIds = matchedClients.map((c) => c._id);

      query.$or = [
        { projectId: searchRegex },
        { projectName: searchRegex },
        { client: { $in: clientIds } },
      ];
    }

    const projects = await Project.find(query)
      .populate("client")
      .populate("milestones.invoice")
      .populate("milestones.invoices")
      .populate("assignedEmployees", "fullName employeeId companyEmail department designation")
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: "Error fetching projects", error: error.message });
  }
};

// GET /api/projects/:id - Get project by ID
export const getProjectById = async (req, res) => {
  try {
    await syncMilestoneInvoiceStatus(req.params.id);
    const project = await Project.findById(req.params.id)
      .populate("client")
      .populate("milestones.invoice")
      .populate("milestones.invoices")
      .populate("assignedEmployees", "fullName employeeId companyEmail department designation");
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Access control: Employees can only view projects they are assigned to
    if (req.user.role === "Employee") {
      const isAssigned = project.assignedEmployees.some(
        (emp) => emp._id.toString() === req.user._id.toString()
      );
      if (!isAssigned) {
        return res.status(403).json({ message: "Access denied. You are not assigned to this project." });
      }
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: "Error fetching project detail", error: error.message });
  }
};

// POST /api/projects - Create a project
export const createProject = async (req, res) => {
  try {
    const {
      projectName,
      client,
      startDate,
      expectedEndDate,
      milestones,
      assignedEmployees,
      projectValue,
      currency,
      inclusiveGst,
      isPersonalAccount,
      commission,
    } = req.body;

    if (!projectName || !client || !startDate || !expectedEndDate) {
      return res.status(400).json({ message: "Project Name, Client, Start Date, and Expected End Date are required." });
    }

    const projectId = await getNextProjectNumber();

    const newProject = new Project({
      projectId,
      projectName,
      client,
      startDate,
      expectedEndDate,
      milestones: milestones || [],
      assignedEmployees: assignedEmployees || [],
      status: "Ongoing",
      projectValue: projectValue !== undefined ? Number(projectValue) : 0,
      currency: currency || "INR (₹)",
      inclusiveGst: inclusiveGst !== undefined ? inclusiveGst : true,
      isPersonalAccount: isPersonalAccount !== undefined ? isPersonalAccount : false,
      commission: commission || {},
    });

    const savedProject = await newProject.save();
    const populated = await savedProject.populate("client");
    await populated.populate("assignedEmployees", "fullName employeeId companyEmail department designation");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Error creating project", error: error.message });
  }
};

// PUT /api/projects/:id - Update project (including milestones & assigned employees)
export const updateProject = async (req, res) => {
  try {
    const {
      projectName,
      client,
      startDate,
      expectedEndDate,
      milestones,
      status,
      assignedEmployees,
      projectValue,
      currency,
      inclusiveGst,
      isPersonalAccount,
      commission,
    } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.projectName = projectName ?? project.projectName;
    project.client = client ?? project.client;
    project.startDate = startDate ?? project.startDate;
    project.expectedEndDate = expectedEndDate ?? project.expectedEndDate;
    project.status = status ?? project.status;
    project.assignedEmployees = assignedEmployees ?? project.assignedEmployees;
    project.projectValue = projectValue !== undefined ? Number(projectValue) : project.projectValue;
    project.currency = currency ?? project.currency;
    project.inclusiveGst = inclusiveGst !== undefined ? inclusiveGst : project.inclusiveGst;
    project.isPersonalAccount = isPersonalAccount !== undefined ? isPersonalAccount : project.isPersonalAccount;
    if (commission !== undefined) {
      project.commission = commission;
    }

    if (milestones) {
      // Map existing milestone invoice links back to updated milestones if IDs match
      project.milestones = milestones.map((newMilestone) => {
        // If it is an existing milestone, retain its invoice reference, invoicedAmount, paidAmount & status if not overridden
        const existing = project.milestones.id(newMilestone._id);
        if (existing) {
          return {
            ...newMilestone,
            invoice: newMilestone.invoice !== undefined ? newMilestone.invoice : existing.invoice,
            invoices: newMilestone.invoices !== undefined ? newMilestone.invoices : existing.invoices,
            invoicedAmount: newMilestone.invoicedAmount !== undefined ? newMilestone.invoicedAmount : existing.invoicedAmount,
            paidAmount: newMilestone.paidAmount !== undefined ? newMilestone.paidAmount : existing.paidAmount,
            status: newMilestone.status || existing.status,
          };
        }
        return newMilestone;
      });
    }

    const updatedProject = await project.save();
    const populated = await updatedProject.populate("client");
    await populated.populate("milestones.invoice");
    await populated.populate("milestones.invoices");
    await populated.populate("assignedEmployees", "fullName employeeId companyEmail department designation");

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Error updating project", error: error.message });
  }
};

// POST /api/projects/bulk-delete - Delete multiple projects
export const bulkDeleteProjects = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No project IDs provided." });
    }
    await Project.deleteMany({ _id: { $in: ids } });
    res.json({ message: "Projects deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error deleting projects", error: error.message });
  }
};

// DELETE /api/projects/:id - Delete a project
export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting project", error: error.message });
  }
};

// POST /api/projects/:id/expenses - Add an expense to project
export const addProjectExpense = async (req, res) => {
  try {
    const { title, category, amount, date, paidBy, notes } = req.body;
    if (!title || amount === undefined || amount === null) {
      return res.status(400).json({ message: "Title and Amount are required." });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.expenses.push({
      title,
      category: category || "Other",
      amount: Number(amount) || 0,
      date: date ? new Date(date) : new Date(),
      paidBy: paidBy || "Company Account",
      notes: notes || "",
    });

    await project.save();
    res.status(201).json(project.expenses);
  } catch (error) {
    res.status(500).json({ message: "Error adding expense", error: error.message });
  }
};

// PUT /api/projects/:id/expenses/:expenseId - Update a project expense
export const updateProjectExpense = async (req, res) => {
  try {
    const { title, category, amount, date, paidBy, notes } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const expense = project.expenses.id(req.params.expenseId);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    if (title !== undefined) expense.title = title;
    if (category !== undefined) expense.category = category;
    if (amount !== undefined) expense.amount = Number(amount);
    if (date !== undefined) expense.date = new Date(date);
    if (paidBy !== undefined) expense.paidBy = paidBy;
    if (notes !== undefined) expense.notes = notes;

    await project.save();
    res.json(project.expenses);
  } catch (error) {
    res.status(500).json({ message: "Error updating expense", error: error.message });
  }
};

// DELETE /api/projects/:id/expenses/:expenseId - Delete a project expense
export const deleteProjectExpense = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.expenses.pull({ _id: req.params.expenseId });
    await project.save();
    res.json(project.expenses);
  } catch (error) {
    res.status(500).json({ message: "Error deleting expense", error: error.message });
  }
};

// PUT /api/projects/:id/commission - Update project commission settings
export const updateProjectCommission = async (req, res) => {
  try {
    const { enabled, type, basis, rate, status, paidDate, notes } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.commission = {
      enabled: enabled !== undefined ? enabled : project.commission?.enabled || false,
      type: type || project.commission?.type || "Percentage",
      basis: basis || project.commission?.basis || "Revenue",
      rate: rate !== undefined ? Number(rate) : (project.commission?.rate || 0),
      status: status || project.commission?.status || "Pending",
      paidDate: paidDate ? new Date(paidDate) : (status === "Paid" ? new Date() : null),
      notes: notes !== undefined ? notes : (project.commission?.notes || ""),
      updatedAt: new Date(),
    };

    await project.save();
    res.json(project.commission);
  } catch (error) {
    res.status(500).json({ message: "Error updating commission", error: error.message });
  }
};
