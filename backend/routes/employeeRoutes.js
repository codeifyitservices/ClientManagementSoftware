import express from "express";
import Employee from "../models/employeeModel.js";
import protect from "../middleware/authMiddleware.js";
import multer from "multer";
import fs from "fs";
import path from "path";

const router = express.Router();

// Multer Disk Storage Configuration for Employee Documents and CSV Importer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `empdoc-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// CSV parser helper
function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0 || !lines[0]) return [];
  const headers = parseCSVLine(lines[0]);
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] ? values[index].trim() : "";
    });
    results.push(row);
  }
  return results;
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(val => val.replace(/^"|"$/g, '').replace(/""/g, '"'));
}

// 1. GET /api/employees/dashboard - Statistics widgets
router.get("/dashboard", protect, async (req, res) => {
  try {
    const totalCount = await Employee.countDocuments();
    const activeCount = await Employee.countDocuments({ status: "Active" });
    const inactiveCount = await Employee.countDocuments({ status: "Inactive" });

    // Employees by department
    const deptStats = await Employee.aggregate([
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $match: { _id: { $ne: null, $ne: "" } } },
      { $project: { department: "$_id", count: 1, _id: 0 } }
    ]);

    // Recent joinees (last 5, sorted by joining date descending)
    const recentJoinees = await Employee.find()
      .sort({ joiningDate: -1 })
      .limit(5)
      .select("fullName employeeId companyEmail department designation joiningDate status");

    // Recently updated profiles (last 5, sorted by updatedAt descending)
    const recentlyUpdated = await Employee.find()
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("fullName employeeId companyEmail department designation updatedAt status");

    res.json({
      totalEmployees: totalCount,
      activeEmployees: activeCount,
      inactiveEmployees: inactiveCount,
      departments: deptStats,
      recentJoinees,
      recentlyUpdated,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching employee stats.", error: error.message });
  }
});

// 2. GET /api/employees/export - Export employee directory as CSV
router.get("/export", protect, async (req, res) => {
  try {
    const employees = await Employee.find().sort({ fullName: 1 }).populate("reportingManager", "fullName");
    
    // Define headers
    const headers = [
      "Employee ID", "Full Name", "Company Email", "Phone Number", "Department",
      "Designation", "Reporting Manager", "Employment Type", "Joining Date",
      "Status", "Personal Email", "DOB", "Gender", "Blood Group",
      "Emergency Contact", "Address", "Aadhaar Number", "PAN Number", "Passport Number"
    ];

    let csvContent = headers.join(",") + "\n";

    employees.forEach((emp) => {
      const joiningDateStr = emp.joiningDate ? new Date(emp.joiningDate).toISOString().split("T")[0] : "";
      const dobStr = emp.dob ? new Date(emp.dob).toISOString().split("T")[0] : "";
      const managerName = emp.reportingManager ? emp.reportingManager.fullName : "";
      
      const row = [
        emp.employeeId || "",
        emp.fullName || "",
        emp.companyEmail || "",
        emp.phoneNumber || "",
        emp.department || "",
        emp.designation || "",
        managerName,
        emp.employmentType || "",
        joiningDateStr,
        emp.status || "",
        emp.personalEmail || "",
        dobStr,
        emp.gender || "",
        emp.bloodGroup || "",
        emp.emergencyContact || "",
        emp.address || "",
        emp.aadhaarNumber || "",
        emp.panNumber || "",
        emp.passportNumber || ""
      ].map(val => {
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(val).replace(/"/g, '""');
        return escaped.includes(",") || escaped.includes("\n") || escaped.includes('"') ? `"${escaped}"` : escaped;
      });

      csvContent += row.join(",") + "\n";
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=employees_export.csv");
    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ message: "Error exporting employees list.", error: error.message });
  }
});

// 3. POST /api/employees/import - Import employees via CSV
router.post("/import", protect, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No CSV file was uploaded." });
    }

    const filePath = path.join(process.cwd(), "uploads", req.file.filename);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    fs.unlinkSync(filePath); // delete temp file

    const parsedRows = parseCSV(fileContent);
    let importedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      const fullName = row["Full Name"];
      const companyEmail = row["Company Email"];
      const joiningDateStr = row["Joining Date"];

      if (!fullName || !companyEmail || !joiningDateStr) {
        errors.push(`Row ${i + 2}: Missing required fields (Full Name, Company Email, Joining Date).`);
        skippedCount++;
        continue;
      }

      // Check if employee with email already exists
      const existing = await Employee.findOne({ companyEmail: companyEmail.toLowerCase() });
      if (existing) {
        errors.push(`Row ${i + 2}: Email '${companyEmail}' already exists in database.`);
        skippedCount++;
        continue;
      }

      try {
        const tempEmp = new Employee({
          fullName,
          companyEmail: companyEmail.toLowerCase(),
          phoneNumber: row["Phone Number"],
          department: row["Department"],
          designation: row["Designation"],
          employmentType: ["Full-time", "Part-time", "Intern", "Contract"].includes(row["Employment Type"]) ? row["Employment Type"] : "Full-time",
          joiningDate: new Date(joiningDateStr),
          status: row["Status"] === "Inactive" ? "Inactive" : "Active",
          personalEmail: row["Personal Email"],
          dob: row["DOB"] ? new Date(row["DOB"]) : undefined,
          gender: ["Male", "Female", "Other"].includes(row["Gender"]) ? row["Gender"] : "",
          bloodGroup: row["Blood Group"],
          emergencyContact: row["Emergency Contact"],
          address: row["Address"],
          aadhaarNumber: row["Aadhaar Number"],
          panNumber: row["PAN Number"],
          passportNumber: row["Passport Number"],
          password: "Welcome123", // Default initial password
          timeline: [
            {
              timestamp: new Date(),
              user: req.user.email,
              description: "Employee profile imported via CSV.",
            }
          ]
        });

        await tempEmp.save();
        importedCount++;
      } catch (err) {
        errors.push(`Row ${i + 2}: Failed to save - ${err.message}`);
        skippedCount++;
      }
    }

    res.json({
      success: true,
      message: `Successfully imported ${importedCount} employees, skipped ${skippedCount} rows.`,
      importedCount,
      skippedCount,
      errors,
    });
  } catch (error) {
    res.status(500).json({ message: "Error importing employees.", error: error.message });
  }
});

// 4. GET /api/employees - Get list of employees with filters, sorting, and pagination
router.get("/", protect, async (req, res) => {
  try {
    const { search, department, designation, status, sort, page = 1, limit = 10 } = req.query;
    
    const query = {};

    // Search filter (name, email, or employee ID)
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { fullName: searchRegex },
        { companyEmail: searchRegex },
        { employeeId: searchRegex },
      ];
    }

    // Dropdown filters
    if (department) {
      query.department = department;
    }
    if (designation) {
      query.designation = designation;
    }
    if (status) {
      query.status = status;
    }

    // Role-based restrictions: Employees can only see profiles if they have view permissions
    if (req.user.role === "Employee" && !req.user.permissions.includes("View Employees")) {
      // Return only their own profile
      query._id = req.user._id;
    }

    // Sorting
    let sortQuery = { fullName: 1 };
    if (sort === "name_desc") {
      sortQuery = { fullName: -1 };
    } else if (sort === "joining_asc") {
      sortQuery = { joiningDate: 1 };
    } else if (sort === "joining_desc") {
      sortQuery = { joiningDate: -1 };
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    const total = await Employee.countDocuments(query);
    const employees = await Employee.find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(Number(limit))
      .populate("reportingManager", "fullName employeeId companyEmail");

    res.json({
      employees,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching employees list.", error: error.message });
  }
});

// 5a. GET /api/employees/me - Fetch the currently authenticated employee's own profile
router.get("/me", protect, async (req, res) => {
  try {
    const employee = await Employee.findById(req.user._id)
      .populate("reportingManager", "fullName employeeId companyEmail");

    if (!employee) {
      return res.status(404).json({ message: "Employee profile not found." });
    }

    const empObj = employee.toObject();
    // Employees don't see private admin notes
    if (req.user.role === "Employee") {
      delete empObj.notes;
    }

    res.json(empObj);
  } catch (error) {
    res.status(500).json({ message: "Error fetching profile.", error: error.message });
  }
});

// 5. GET /api/employees/:id - Fetch details of single employee

router.get("/:id", protect, async (req, res) => {
  try {
    // If logging in as an employee, restrict fetching notes unless they are looking at someone else (usually notes are private to admins)
    // Only Admin or managers with Manage Roles/permissions can see another's notes.
    const employee = await Employee.findById(req.params.id)
      .populate("reportingManager", "fullName employeeId companyEmail");

    if (!employee) {
      return res.status(404).json({ message: "Employee profile not found." });
    }

    // Check permissions
    if (req.user.role === "Employee" && req.user._id.toString() !== employee._id.toString() && !req.user.permissions.includes("View Employees")) {
      return res.status(403).json({ message: "Access denied. You do not have permissions to view this employee." });
    }

    const empObj = employee.toObject();

    // Redact private notes for standard employees
    if (req.user.role === "Employee") {
      delete empObj.notes;
    }

    res.json(empObj);
  } catch (error) {
    res.status(500).json({ message: "Error fetching employee details.", error: error.message });
  }
});

// 6. POST /api/employees - Add a new employee (Admin only)
router.post("/", protect, upload.array("files", 20), async (req, res) => {
  try {
    if (req.user.role === "Employee" && !req.user.permissions.includes("Create Employees")) {
      return res.status(403).json({ message: "Access denied. You do not have permissions to create employee profiles." });
    }

    const {
      fullName, companyEmail, phoneNumber, department, designation,
      reportingManager, employmentType, joiningDate, workLocation,
      personalEmail, dob, gender, bloodGroup, emergencyContact, address,
      aadhaarNumber, panNumber, passportNumber, password, role, permissions
    } = req.body;

    if (!fullName || !companyEmail || !joiningDate) {
      return res.status(400).json({ message: "Please provide Full Name, Company Email, and Joining Date." });
    }

    // Validate email uniqueness
    const emailExists = await Employee.findOne({ companyEmail: companyEmail.toLowerCase() });
    if (emailExists) {
      return res.status(400).json({ message: "An employee with this company email already exists." });
    }

    const documents = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        documents.push({
          documentType: "Document",
          fileName: file.filename,
          originalName: file.originalname,
          uploadDate: new Date()
        });
      });
    }

    const newEmployee = new Employee({
      fullName,
      companyEmail: companyEmail.toLowerCase(),
      phoneNumber,
      department,
      designation,
      reportingManager: (reportingManager && reportingManager.trim() !== "") ? reportingManager : null,
      employmentType: employmentType || "Full-time",
      joiningDate: new Date(joiningDate),
      workLocation,
      personalEmail,
      dob: (dob && dob.trim() !== "") ? new Date(dob) : undefined,
      gender: gender || "",
      bloodGroup,
      emergencyContact,
      address,
      aadhaarNumber,
      panNumber,
      passportNumber,
      password: password || "Welcome123", // default initial password
      role: role || "Employee",
      permissions: permissions || ["View Employees", "View Documents", "Upload Documents"],
      documents,
      timeline: [
        {
          timestamp: new Date(),
          user: req.user.email,
          description: `Employee profile created by ${req.user.fullName || req.user.email}.`,
        }
      ]
    });

    const saved = await newEmployee.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: "Error creating employee profile.", error: error.message });
  }
});

// 7. PUT /api/employees/:id - Edit an employee profile
router.put("/:id", protect, upload.array("files", 20), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee profile not found." });
    }

    // Access control
    const isEditingSelf = req.user._id.toString() === employee._id.toString();
    const hasEditPermission = req.user.role === "Admin" || req.user.permissions.includes("Edit Employees");

    if (!isEditingSelf && !hasEditPermission) {
      return res.status(403).json({ message: "Access denied. You do not have permissions to edit this employee." });
    }

    const updates = req.body;
    
    // Prevent standard employee from editing core fields (department, designation, manager, salary, role, permissions, status)
    if (!hasEditPermission && isEditingSelf) {
      delete updates.department;
      delete updates.designation;
      delete updates.reportingManager;
      delete updates.joiningDate;
      delete updates.status;
      delete updates.role;
      delete updates.permissions;
      delete updates.employeeId;
    }

    // Clean empty values to prevent Mongoose CastErrors
    if (updates.dob === "") updates.dob = null;
    if (updates.joiningDate === "") delete updates.joiningDate;
    if (updates.reportingManager === "") updates.reportingManager = null;

    // Keep track of what changed for timeline
    const changedFields = [];
    const fieldsToTrack = [
      "fullName", "phoneNumber", "department", "designation", "reportingManager",
      "employmentType", "joiningDate", "status", "personalEmail", "workLocation"
    ];

    fieldsToTrack.forEach(field => {
      if (updates[field] !== undefined && String(updates[field]) !== String(employee[field])) {
        changedFields.push(field);
      }
    });

    // Update fields
    Object.keys(updates).forEach(key => {
      if (key !== "password" && key !== "documents" && key !== "notes" && key !== "timeline") {
        employee[key] = updates[key];
      }
    });

    // Append newly uploaded files if any
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        employee.documents.push({
          documentType: "Document",
          fileName: file.filename,
          originalName: file.originalname,
          uploadDate: new Date()
        });
      });
      changedFields.push("documents");
    }

    if (changedFields.length > 0) {
      employee.timeline.push({
        timestamp: new Date(),
        user: req.user.email,
        description: `Profile updated fields: ${changedFields.join(", ")}.`,
      });
    }

    const updated = await employee.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error updating employee profile.", error: error.message });
  }
});

// 8. DELETE /api/employees/:id - Delete an employee profile (Admin only)
router.delete("/:id", protect, async (req, res) => {
  try {
    if (req.user.role === "Employee" && !req.user.permissions.includes("Delete Employees")) {
      return res.status(403).json({ message: "Access denied. You do not have permissions to delete employee profiles." });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee profile not found." });
    }

    // Delete uploaded documents from filesystem
    employee.documents.forEach(doc => {
      const docPath = path.join(process.cwd(), "uploads", doc.fileName);
      if (fs.existsSync(docPath)) {
        try {
          fs.unlinkSync(docPath);
        } catch (e) {
          console.error(`Failed to delete document file ${doc.fileName}:`, e.message);
        }
      }
    });

    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: `Employee profile for ${employee.fullName} deleted successfully.` });
  } catch (error) {
    res.status(500).json({ message: "Error deleting employee profile.", error: error.message });
  }
});

// 9. POST /api/employees/bulk - Perform bulk updates (Activate, Deactivate, Delete)
router.post("/bulk", protect, async (req, res) => {
  try {
    const { action, ids } = req.body;

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Please specify action ('Activate', 'Deactivate', 'Delete') and a list of employee IDs." });
    }

    if (req.user.role === "Employee") {
      return res.status(403).json({ message: "Access denied. Bulk actions are reserved for administrative accounts." });
    }

    if (action === "Delete") {
      // Find all employees first to delete files
      const employees = await Employee.find({ _id: { $in: ids } });
      employees.forEach(emp => {
        emp.documents.forEach(doc => {
          const docPath = path.join(process.cwd(), "uploads", doc.fileName);
          if (fs.existsSync(docPath)) {
            try { fs.unlinkSync(docPath); } catch (e) {}
          }
        });
      });

      await Employee.deleteMany({ _id: { $in: ids } });
      return res.json({ message: `Bulk deleted ${employees.length} employee profiles successfully.` });
    } else if (action === "Activate" || action === "Deactivate") {
      const targetStatus = action === "Activate" ? "Active" : "Inactive";
      
      const result = await Employee.updateMany(
        { _id: { $in: ids } },
        { 
          $set: { status: targetStatus },
          $push: { 
            timeline: {
              timestamp: new Date(),
              user: req.user.email,
              description: `Employee profile status changed to ${targetStatus} via bulk update.`,
            }
          }
        }
      );
      
      return res.json({ message: `Successfully updated status to ${targetStatus} for ${result.modifiedCount} employees.` });
    } else {
      return res.status(400).json({ message: "Invalid action. Supported: 'Activate', 'Deactivate', 'Delete'" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error executing bulk action.", error: error.message });
  }
});

// 10. POST /api/employees/:id/reset-password - Reset password (Admin only)
router.post("/:id/reset-password", protect, async (req, res) => {
  try {
    if (req.user.role === "Employee") {
      return res.status(403).json({ message: "Access denied. Only administrators can reset employee passwords." });
    }

    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ message: "Please provide a new password." });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee profile not found." });
    }

    employee.password = newPassword;
    employee.timeline.push({
      timestamp: new Date(),
      user: req.user.email,
      description: `Employee password reset by admin.`,
    });

    await employee.save();
    res.json({ message: `Successfully reset password for ${employee.fullName}.` });
  } catch (error) {
    res.status(500).json({ message: "Error resetting password.", error: error.message });
  }
});

// 11. POST /api/employees/:id/documents - Upload multiple documents / images
router.post("/:id/documents", protect, upload.array("files", 20), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee profile not found." });
    }

    // Access check
    const isSelf = req.user._id.toString() === employee._id.toString();
    const hasDocPermission = req.user.role === "Admin" || req.user.permissions.includes("Upload Documents");

    if (!isSelf && !hasDocPermission) {
      return res.status(403).json({ message: "Access denied. You do not have permissions to upload documents for this employee." });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No document files were uploaded." });
    }

    const fileNames = [];
    req.files.forEach(file => {
      employee.documents.push({
        documentType: "Document",
        fileName: file.filename,
        originalName: file.originalname,
        uploadDate: new Date()
      });
      fileNames.push(file.originalname);
    });

    employee.timeline.push({
      timestamp: new Date(),
      user: req.user.email,
      description: `Uploaded documents: ${fileNames.join(", ")}`,
    });

    await employee.save();
    res.json({
      message: `${req.files.length} document(s) uploaded successfully.`,
      documents: employee.documents,
    });
  } catch (error) {
    res.status(500).json({ message: "Error uploading documents.", error: error.message });
  }
});

// 12. DELETE /api/employees/:id/documents/:docId - Delete document
router.delete("/:id/documents/:docId", protect, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee profile not found." });
    }

    // Access check
    const isSelf = req.user._id.toString() === employee._id.toString();
    const hasDocPermission = req.user.role === "Admin" || req.user.permissions.includes("Delete Documents");

    if (!isSelf && !hasDocPermission) {
      return res.status(403).json({ message: "Access denied. You do not have permissions to delete documents for this employee." });
    }

    const docIndex = employee.documents.findIndex(d => d._id.toString() === req.params.docId);
    if (docIndex === -1) {
      return res.status(404).json({ message: "Document record not found." });
    }

    const doc = employee.documents[docIndex];
    const docPath = path.join(process.cwd(), "uploads", doc.fileName);

    // Delete file
    if (fs.existsSync(docPath)) {
      try {
        fs.unlinkSync(docPath);
      } catch (e) {
        console.error("Failed to delete file from disk:", e.message);
      }
    }

    employee.documents.splice(docIndex, 1);
    employee.timeline.push({
      timestamp: new Date(),
      user: req.user.email,
      description: `Deleted document: ${doc.documentType}.`,
    });

    await employee.save();
    res.json({
      message: `Successfully deleted document ${doc.documentType}.`,
      documents: employee.documents,
    });
  } catch (error) {
    res.status(500).json({ message: "Error deleting document.", error: error.message });
  }
});

// 13. POST /api/employees/:id/notes - Add notes (Admin only)
router.post("/:id/notes", protect, async (req, res) => {
  try {
    // Only Admin can add notes
    if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied. Private notes are reserved for administrators." });
    }

    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: "Note content cannot be empty." });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee profile not found." });
    }

    employee.notes.push({
      author: req.user.fullName || req.user.email,
      content,
      createdAt: new Date(),
    });

    employee.timeline.push({
      timestamp: new Date(),
      user: req.user.email,
      description: `Added private admin note.`,
    });

    await employee.save();
    res.json({
      message: "Note added successfully.",
      notes: employee.notes,
    });
  } catch (error) {
    res.status(500).json({ message: "Error adding note.", error: error.message });
  }
});

// 14. DELETE /api/employees/:id/notes/:noteId - Delete notes (Admin only)
router.delete("/:id/notes/:noteId", protect, async (req, res) => {
  try {
    // Only Admin can delete notes
    if (req.user.role !== "Admin") {
      return res.status(403).json({ message: "Access denied. Private notes are reserved for administrators." });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee profile not found." });
    }

    const noteIndex = employee.notes.findIndex(n => n._id.toString() === req.params.noteId);
    if (noteIndex === -1) {
      return res.status(404).json({ message: "Note record not found." });
    }

    employee.notes.splice(noteIndex, 1);
    employee.timeline.push({
      timestamp: new Date(),
      user: req.user.email,
      description: `Deleted private admin note.`,
    });

    await employee.save();
    res.json({
      message: "Note deleted successfully.",
      notes: employee.notes,
    });
  } catch (error) {
    res.status(500).json({ message: "Error deleting note.", error: error.message });
  }
});

export default router;
