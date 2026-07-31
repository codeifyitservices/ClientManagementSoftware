import express from "express";
import Ticket from "../models/ticketModel.js";
import Notification from "../models/notificationModel.js";
import Employee from "../models/employeeModel.js";
import multer from "multer";
import path from "path";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `bugdoc-${Date.now()}-${Math.floor(Math.random() * 1000)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Helper to create notifications
async function createNotification(recipient, recipientRole, title, message, relatedId) {
  try {
    await Notification.create({
      recipient,
      recipientRole,
      title,
      message,
      type: "Bug",
      relatedId,
    });
  } catch (err) {
    console.error("Error creating ticket notification:", err.message);
  }
}

// 1. GET /api/tickets - Fetch all tickets (role-restricted)
router.get("/", async (req, res) => {
  try {
    const { project, severity, priority, status, search, page = 1, limit = 10 } = req.query;

    const query = {};

    // Role restrictions
    if (req.user.role === "Employee") {
      query.$or = [
        { "raisedBy.id": req.user._id },
        { assignedTo: req.user._id },
      ];
    }

    if (project) query.project = project;
    if (severity) query.severity = severity;
    if (priority) query.priority = priority;
    if (status) query.status = status;
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    const total = await Ticket.countDocuments(query);
    const tickets = await Ticket.find(query)
      .populate("project", "projectName projectId")
      .populate("assignedTo", "fullName employeeId companyEmail department designation")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      tickets,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching tickets list.", error: error.message });
  }
});

// 2. GET /api/tickets/:id - Fetch single ticket details
router.get("/:id", async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("project", "projectName projectId")
      .populate("assignedTo", "fullName employeeId companyEmail department designation");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    // Role check
    if (req.user.role === "Employee" &&
        ticket.raisedBy.id.toString() !== req.user._id.toString() &&
        (!ticket.assignedTo || ticket.assignedTo._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: "Access denied. You cannot view this ticket." });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: "Error fetching ticket details.", error: error.message });
  }
});

// 3. POST /api/tickets - Raise a ticket (Admin or Employee)
router.post("/", upload.array("files", 10), async (req, res) => {
  try {
    const { title, project, severity, priority, description, stepsToReproduce, expectedResult, actualResult } = req.body;

    if (!title || !project) {
      return res.status(400).json({ message: "Please enter Title and Project." });
    }

    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          fileName: file.filename,
          originalName: file.originalname,
          uploadDate: new Date(),
        });
      });
    }

    const newTicket = new Ticket({
      title,
      project,
      severity: severity || "Minor",
      priority: priority || "Medium",
      description: description || "",
      stepsToReproduce: stepsToReproduce || "",
      expectedResult: expectedResult || "",
      actualResult: actualResult || "",
      attachments,
      raisedBy: {
        id: req.user._id,
        name: req.user.fullName || "User",
        role: req.user.role,
      },
      status: "Open",
      timeline: [
        {
          user: req.user.fullName || req.user.email,
          description: `Ticket raised by ${req.user.fullName || req.user.email}.`,
        },
      ],
    });

    const saved = await newTicket.save();

    // Notify Admins
    await createNotification(
      null, // broadcast to all admins
      "Admin",
      "New Bug Ticket Raised",
      `A new bug ticket "${title}" was raised by ${req.user.fullName}.`,
      saved._id
    );

    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: "Error raising ticket.", error: error.message });
  }
});

// 4. PUT /api/tickets/:id - Update ticket (Assign, Resolve, Close, Reopen)
router.put("/:id", upload.array("files", 10), async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    const isAdmin = req.user.role === "Admin";
    const isAssigned = ticket.assignedTo?.toString() === req.user._id.toString();
    const isReporter = ticket.raisedBy.id.toString() === req.user._id.toString();

    // Check permissions
    if (!isAdmin && !isAssigned && !isReporter) {
      return res.status(403).json({ message: "Access denied. You cannot modify this ticket." });
    }

    const updates = req.body;
    const oldStatus = ticket.status;
    const oldAssigneeId = ticket.assignedTo ? ticket.assignedTo.toString() : null;

    // Apply updates (core edits restricted to Admins)
    if (!isAdmin) {
      // Employees can only update status
      const statusUpdate = updates.status;
      Object.keys(updates).forEach(key => delete updates[key]);
      updates.status = statusUpdate;

      // Status Rules:
      // - Reporter can only reopen
      if (isReporter && !isAssigned && updates.status !== "Reopened") {
        return res.status(403).json({ message: "Reporters can only reopen tickets." });
      }
      // - Assignee can update to In Progress, Resolved
      if (isAssigned && updates.status === "Closed") {
        return res.status(403).json({ message: "Only Admins can close tickets." });
      }
    }

    // Assign / Reassign rules
    if (updates.assignedTo !== undefined && updates.assignedTo !== oldAssigneeId) {
      if (updates.assignedTo) {
        const emp = await Employee.findById(updates.assignedTo);
        if (emp) {
          ticket.assignedTo = updates.assignedTo;
          ticket.status = "Assigned";
          ticket.timeline.push({
            user: req.user.fullName || req.user.email,
            description: `Ticket assigned to ${emp.fullName}.`,
          });

          // Notify new assignee
          await createNotification(
            emp._id,
            "Employee",
            "Ticket Assigned",
            `Bug ticket "${ticket.title}" has been assigned to you.`,
            ticket._id
          );
        }
      } else {
        ticket.assignedTo = null;
        ticket.status = "Open";
        ticket.timeline.push({
          user: req.user.fullName || req.user.email,
          description: `Ticket unassigned.`,
        });
      }
    }

    // Apply other updates
    Object.keys(updates).forEach(key => {
      if (key !== "assignedTo" && key !== "attachments" && key !== "comments" && key !== "timeline" && key !== "ticketId") {
        ticket[key] = updates[key];
      }
    });

    // Handle attachments
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        ticket.attachments.push({
          fileName: file.filename,
          originalName: file.originalname,
          uploadDate: new Date(),
        });
      });
      ticket.timeline.push({
        user: req.user.fullName || req.user.email,
        description: `Uploaded ${req.files.length} new screenshot/file(s).`,
      });
    }

    // Status change logging and notifications
    if (updates.status && updates.status !== oldStatus) {
      ticket.timeline.push({
        user: req.user.fullName || req.user.email,
        description: `Status changed from "${oldStatus}" to "${updates.status}".`,
      });

      if (updates.status === "Closed") {
        await createNotification(
          ticket.raisedBy.id,
          "Employee",
          "Ticket Closed",
          `Your raised bug ticket "${ticket.title}" was closed by Admin.`,
          ticket._id
        );
      } else if (updates.status === "Reopened") {
        await createNotification(
          ticket.assignedTo || null,
          ticket.assignedTo ? "Employee" : "Admin",
          "Ticket Reopened",
          `Ticket "${ticket.title}" has been reopened.`,
          ticket._id
        );
      } else if (updates.status === "Resolved") {
        await createNotification(
          ticket.raisedBy.id,
          "Employee",
          "Ticket Resolved",
          `Ticket "${ticket.title}" has been resolved.`,
          ticket._id
        );
      }
    }

    const saved = await ticket.save();
    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: "Error updating ticket.", error: error.message });
  }
});

// 5. POST /api/tickets/:id/comments - Add comment (supports text + files!)
router.post("/:id/comments", upload.array("files", 5), async (req, res) => {
  try {
    const { content } = req.body;
    if ((!content || !content.trim()) && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ message: "Comment content or files required." });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          fileName: file.filename,
          originalName: file.originalname,
        });
      });
    }

    const newComment = {
      authorId: req.user._id,
      authorName: req.user.fullName || "User",
      authorRole: req.user.role,
      content: content || "Uploaded file attachment(s).",
      attachments,
    };

    ticket.comments.push(newComment);
    ticket.timeline.push({
      user: req.user.fullName || req.user.email,
      description: `Added a comment${attachments.length > 0 ? " with attachment(s)" : ""}.`,
    });

    const saved = await ticket.save();

    // Trigger Notification
    const otherRecipient = req.user._id.toString() === ticket.raisedBy.id.toString()
      ? ticket.assignedTo
      : ticket.raisedBy.id;

    if (otherRecipient) {
      await createNotification(
        otherRecipient,
        "Employee",
        "New Ticket Comment",
        `New comment added on ticket "${ticket.title}".`,
        ticket._id
      );
    }

    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: "Error posting comment.", error: error.message });
  }
});

// 6. DELETE /api/tickets/:id - Delete ticket (Admin only)
router.delete("/:id", async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found." });
    }

    res.json({ message: "Ticket deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error deleting ticket.", error: error.message });
  }
});

export default router;
