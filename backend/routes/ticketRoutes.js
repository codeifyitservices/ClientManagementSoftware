import express from "express";
import multer from "multer";
import path from "path";
import {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  addComment,
  deleteTicket,
} from "../controllers/ticketController.js";

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

// GET /api/tickets - Fetch all tickets (role-restricted)
router.get("/", getTickets);

// GET /api/tickets/:id - Fetch single ticket details
router.get("/:id", getTicketById);

// POST /api/tickets - Raise a ticket (Admin or Employee)
router.post("/", upload.array("files", 10), createTicket);

// PUT /api/tickets/:id - Update ticket (Assign, Resolve, Close, Reopen)
router.put("/:id", upload.array("files", 10), updateTicket);

// POST /api/tickets/:id/comments - Add comment (supports text + files!)
router.post("/:id/comments", upload.array("files", 5), addComment);

// DELETE /api/tickets/:id - Delete ticket (Admin only)
router.delete("/:id", deleteTicket);

export default router;
