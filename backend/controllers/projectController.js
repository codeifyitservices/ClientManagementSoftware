import Project from "../models/projectModel.js";
import Client from "../models/clientModel.js";

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
    const { search } = req.query;
    let query = {};

    // Restrict standard employees to only see projects they are assigned to
    if (req.user.role === "Employee") {
      query.assignedEmployees = req.user._id;
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
    const project = await Project.findById(req.params.id)
      .populate("client")
      .populate("milestones.invoice")
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
    const { projectName, client, startDate, expectedEndDate, milestones, assignedEmployees } = req.body;

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
    const { projectName, client, startDate, expectedEndDate, milestones, status, assignedEmployees } = req.body;

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

    if (milestones) {
      // Map existing milestone invoice links back to updated milestones if IDs match
      project.milestones = milestones.map((newMilestone) => {
        // If it is an existing milestone, retain its invoice reference & status if not overridden
        const existing = project.milestones.id(newMilestone._id);
        if (existing) {
          return {
            ...newMilestone,
            invoice: newMilestone.invoice || existing.invoice,
            status: newMilestone.status || existing.status,
          };
        }
        return newMilestone;
      });
    }

    const updatedProject = await project.save();
    const populated = await updatedProject.populate("client");
    await populated.populate("milestones.invoice");
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
