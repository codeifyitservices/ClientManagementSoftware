import express from "express";
import { getServices, createService, updateService, deleteService } from "../controllers/serviceController.js";

const router = express.Router();

// GET /api/services - Retrieve all registered billing services
router.get("/", getServices);

// POST /api/services - Add a new billing service
router.post("/", createService);

// PUT /api/services/:id - Update an existing service
router.put("/:id", updateService);

// DELETE /api/services/:id - Delete a billing service
router.delete("/:id", deleteService);

export default router;
