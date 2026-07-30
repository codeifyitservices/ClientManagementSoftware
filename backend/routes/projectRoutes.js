import express from "express";
import Project from "../models/projectModel.js";
import Client from "../models/clientModel.js";

const router = express.Router();

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

// 1. GET /api/projects - Get all projects with client reference & linked invoice reference populated
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

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
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: "Error fetching projects", error: error.message });
  }
});

// 2. GET /api/projects/:id - Get project by ID
router.get("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("client")
      .populate("milestones.invoice");
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: "Error fetching project detail", error: error.message });
  }
});

// 3. POST /api/projects - Create a project
router.post("/", async (req, res) => {
  try {
    const { projectName, client, startDate, expectedEndDate, milestones } = req.body;

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
      status: "Ongoing",
    });

    const savedProject = await newProject.save();
    const populated = await savedProject.populate("client");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Error creating project", error: error.message });
  }
});

// 4. PUT /api/projects/:id - Update project (including milestones)
router.put("/:id", async (req, res) => {
  try {
    const { projectName, client, startDate, expectedEndDate, milestones, status } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.projectName = projectName ?? project.projectName;
    project.client = client ?? project.client;
    project.startDate = startDate ?? project.startDate;
    project.expectedEndDate = expectedEndDate ?? project.expectedEndDate;
    project.status = status ?? project.status;

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

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Error updating project", error: error.message });
  }
});

// 5. POST /api/projects/bulk-delete - Delete multiple projects
router.post("/bulk-delete", async (req, res) => {
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
});

// 6. DELETE /api/projects/:id - Delete a project
router.delete("/:id", async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting project", error: error.message });
  }
});

export default router;
