import Lead from "../models/leadModel.js";
import Employee from "../models/employeeModel.js";

// Sync cached current state on Lead document based on the latest journey stage
const syncLeadCurrentState = (lead) => {
  if (lead.leadJourney && lead.leadJourney.length > 0) {
    // leadJourney is sorted chronologically, so latest is at the end
    const latest = lead.leadJourney[lead.leadJourney.length - 1];
    lead.currentStage = latest.stage;
    lead.currentStatus = latest.status;
    lead.currentTemperature = latest.temperature;
    lead.currentNextFollowUpDate = latest.nextFollowUp || null;
  } else {
    lead.currentStage = "New Lead";
    lead.currentStatus = "Pending";
    lead.currentTemperature = "Cold";
    lead.currentNextFollowUpDate = null;
  }
};

// GET /api/leads - Get all leads with search, filtering, and sorting
export const getLeads = async (req, res) => {
  try {
    const { search, status, sortField, sortDirection } = req.query;
    let query = {};

    // Filter by cached currentStage
    if (status && status !== "all") {
      query.currentStage = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { leadName: searchRegex },
        { companyName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { source: searchRegex },
        { currentStage: searchRegex },
      ];
    }

    // Default sorting
    let sort = { createdAt: -1 };
    if (sortField) {
      // Map frontend fields if needed
      const field = sortField === "status" ? "currentStatus" : sortField;
      const dir = sortDirection === "asc" ? 1 : -1;
      sort = { [field]: dir };
    }

    const leads = await Lead.find(query)
      .populate("assignedTo", "fullName employeeId companyEmail department designation")
      .populate("leadJourney.assignedEmployee", "fullName employeeId companyEmail")
      .sort(sort);

    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: "Error fetching leads", error: error.message });
  }
};

// GET /api/leads/:id - Get single lead details
export const getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate("assignedTo", "fullName employeeId companyEmail department designation")
      .populate("leadJourney.assignedEmployee", "fullName employeeId companyEmail");

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: "Error fetching lead detail", error: error.message });
  }
};

// POST /api/leads - Create a lead profile and append initial stage
export const createLead = async (req, res) => {
  try {
    const {
      leadName,
      companyName,
      email,
      phone,
      source,
      value,
      assignedTo,
      notes,
    } = req.body;

    if (!leadName) {
      return res.status(400).json({ message: "Lead Contact Name is required." });
    }

    const newLead = new Lead({
      leadName,
      companyName: companyName || "",
      email: email || "",
      phone: phone || "",
      source: source || "Website",
      value: value !== undefined ? Number(value) : 0,
      assignedTo: assignedTo || null,
      notes: notes || "",
      leadJourney: [],
      activities: [],
    });

    // Automatically push initial "New Lead" stage update
    newLead.leadJourney.push({
      stage: "New Lead",
      date: new Date(),
      status: "Pending",
      temperature: "Cold",
      probability: 10,
      notes: notes || "Lead profile initiated in CRM.",
      dealValue: value !== undefined ? Number(value) : 0,
      assignedEmployee: assignedTo || null,
    });

    // Record activity
    newLead.activities.push({
      text: "Lead profile created",
      timestamp: new Date(),
      type: "system",
    });
    newLead.activities.push({
      text: "New Lead stage created",
      timestamp: new Date(),
      type: "journey",
    });

    if (assignedTo) {
      const emp = await Employee.findById(assignedTo);
      if (emp) {
        newLead.activities.push({
          text: `Lead assigned to ${emp.fullName}`,
          timestamp: new Date(),
          type: "assignment",
        });
      }
    }

    syncLeadCurrentState(newLead);
    const savedLead = await newLead.save();
    const populated = await savedLead.populate("assignedTo", "fullName employeeId companyEmail");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Error creating lead", error: error.message });
  }
};

// PUT /api/leads/:id - Update core lead details (excluding journey stages)
export const updateLead = async (req, res) => {
  try {
    const {
      leadName,
      companyName,
      email,
      phone,
      source,
      value,
      assignedTo,
      notes,
    } = req.body;

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // Check if assignment changed
    if (assignedTo !== undefined && String(assignedTo) !== String(lead.assignedTo)) {
      if (assignedTo) {
        const emp = await Employee.findById(assignedTo);
        if (emp) {
          lead.activities.push({
            text: `Lead reassigned to ${emp.fullName}`,
            timestamp: new Date(),
            type: "assignment",
          });
        }
      } else {
        lead.activities.push({
          text: "Lead owner unassigned",
          timestamp: new Date(),
          type: "assignment",
        });
      }
    }

    lead.leadName = leadName ?? lead.leadName;
    lead.companyName = companyName ?? lead.companyName;
    lead.email = email ?? lead.email;
    lead.phone = phone ?? lead.phone;
    lead.source = source ?? lead.source;
    lead.value = value !== undefined ? Number(value) : lead.value;
    lead.assignedTo = assignedTo !== undefined ? assignedTo : lead.assignedTo;
    lead.notes = notes ?? lead.notes;

    syncLeadCurrentState(lead);
    const updatedLead = await lead.save();
    const populated = await updatedLead.populate("assignedTo", "fullName employeeId companyEmail");

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Error updating lead details", error: error.message });
  }
};

// POST /api/leads/:id/journey - Add a new journey stage update
export const addLeadJourneyStage = async (req, res) => {
  try {
    const {
      stage,
      date,
      status,
      temperature,
      probability,
      nextFollowUp,
      notes,
      dealValue,
      assignedEmployee,
    } = req.body;

    if (!stage) {
      return res.status(400).json({ message: "Stage name is required." });
    }
    if (!notes) {
      return res.status(400).json({ message: "Notes / Reason is required." });
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // Process attachments from uploaded files
    const attachments = [];
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((file) => {
        attachments.push({
          name: file.originalname,
          path: file.filename,
          mimeType: file.mimetype,
        });
      });
    }

    // Push new stage update
    const newStageObj = {
      stage,
      date: date || new Date(),
      status: status || "Pending",
      temperature: temperature || "Cold",
      probability: probability !== undefined ? Number(probability) : 0,
      nextFollowUp: nextFollowUp || null,
      notes,
      dealValue: dealValue ? Number(dealValue) : null,
      assignedEmployee: assignedEmployee || lead.assignedTo || null,
      attachments,
    };

    lead.leadJourney.push(newStageObj);

    // Update root deal value if updated in this stage
    if (dealValue !== undefined && dealValue !== null && dealValue !== "") {
      lead.value = Number(dealValue);
    }

    // Logs system activity
    lead.activities.push({
      text: `${stage} stage created`,
      timestamp: new Date(),
      type: "journey",
    });

    // Log attachments upload if any
    attachments.forEach((att) => {
      lead.activities.push({
        text: `Attachment "${att.name}" uploaded`,
        timestamp: new Date(),
        type: "attachment",
      });
    });

    syncLeadCurrentState(lead);
    const updatedLead = await lead.save();
    const populated = await Lead.findById(updatedLead._id)
      .populate("assignedTo", "fullName employeeId companyEmail department designation")
      .populate("leadJourney.assignedEmployee", "fullName employeeId companyEmail");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Error adding journey stage update", error: error.message });
  }
};

// PUT /api/leads/:id/journey/:stageId - Update only the most recent stage update
export const updateLeadJourneyStage = async (req, res) => {
  try {
    const { stageId } = req.params;
    const {
      stage,
      date,
      status,
      temperature,
      probability,
      nextFollowUp,
      notes,
      dealValue,
      assignedEmployee,
    } = req.body;

    if (!notes) {
      return res.status(400).json({ message: "Notes / Reason is required." });
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // Check if it is the most recent stage update
    const latestStage = lead.leadJourney[lead.leadJourney.length - 1];
    if (String(latestStage._id) !== String(stageId)) {
      return res.status(400).json({ message: "Only the most recent stage update can be modified. Historical records are immutable." });
    }

    // Process new attachments
    const newAttachments = [];
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((file) => {
        newAttachments.push({
          name: file.originalname,
          path: file.filename,
          mimeType: file.mimetype,
        });
      });
    }

    // Update latest stage attributes
    latestStage.stage = stage ?? latestStage.stage;
    latestStage.date = date ?? latestStage.date;
    latestStage.status = status ?? latestStage.status;
    latestStage.temperature = temperature ?? latestStage.temperature;
    latestStage.probability = probability !== undefined ? Number(probability) : latestStage.probability;
    latestStage.nextFollowUp = nextFollowUp !== undefined ? nextFollowUp : latestStage.nextFollowUp;
    latestStage.notes = notes ?? latestStage.notes;
    latestStage.dealValue = dealValue !== undefined ? (dealValue ? Number(dealValue) : null) : latestStage.dealValue;
    latestStage.assignedEmployee = assignedEmployee !== undefined ? (assignedEmployee || null) : latestStage.assignedEmployee;

    if (newAttachments.length > 0) {
      latestStage.attachments.push(...newAttachments);
    }

    // Update root deal value if updated
    if (dealValue !== undefined && dealValue !== null && dealValue !== "") {
      lead.value = Number(dealValue);
    }

    lead.activities.push({
      text: `${latestStage.stage} stage updated`,
      timestamp: new Date(),
      type: "journey",
    });

    newAttachments.forEach((att) => {
      lead.activities.push({
        text: `Attachment "${att.name}" uploaded`,
        timestamp: new Date(),
        type: "attachment",
      });
    });

    syncLeadCurrentState(lead);
    const updatedLead = await lead.save();
    const populated = await Lead.findById(updatedLead._id)
      .populate("assignedTo", "fullName employeeId companyEmail department designation")
      .populate("leadJourney.assignedEmployee", "fullName employeeId companyEmail");

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Error updating journey stage update", error: error.message });
  }
};

// DELETE /api/leads/:id/journey/:stageId - Delete only the most recent stage update
export const deleteLeadJourneyStage = async (req, res) => {
  try {
    const { stageId } = req.params;
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (lead.leadJourney.length === 0) {
      return res.status(400).json({ message: "Lead has no journey updates." });
    }

    // Check if it is the most recent stage update
    const latestStage = lead.leadJourney[lead.leadJourney.length - 1];
    if (String(latestStage._id) !== String(stageId)) {
      return res.status(400).json({ message: "Only the most recent stage update can be deleted. Historical records are immutable." });
    }

    if (lead.leadJourney.length === 1) {
      return res.status(400).json({ message: "Cannot delete the only stage update in the journey." });
    }

    // Remove the stage update
    lead.leadJourney.pop();

    lead.activities.push({
      text: `${latestStage.stage} stage deleted`,
      timestamp: new Date(),
      type: "journey",
    });

    syncLeadCurrentState(lead);
    const updatedLead = await lead.save();
    const populated = await Lead.findById(updatedLead._id)
      .populate("assignedTo", "fullName employeeId companyEmail department designation")
      .populate("leadJourney.assignedEmployee", "fullName employeeId companyEmail");

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Error deleting journey stage update", error: error.message });
  }
};

// DELETE /api/leads/:id - Delete lead profile
export const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }
    res.json({ message: "Lead profile deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting lead", error: error.message });
  }
};

// POST /api/leads/bulk-delete - Delete multiple leads
export const bulkDeleteLeads = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No lead IDs provided." });
    }
    await Lead.deleteMany({ _id: { $in: ids } });
    res.json({ message: "Leads deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error bulk deleting leads", error: error.message });
  }
};
