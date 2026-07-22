import express from "express";
import Service from "../models/serviceModel.js";

const router = express.Router();

// 1. GET /api/services - Retrieve all registered billing services
router.get("/", async (req, res) => {
  try {
    const services = await Service.find().sort({ name: 1 });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: "Error fetching services", error: error.message });
  }
});

// 2. POST /api/services - Add a new billing service
router.post("/", async (req, res) => {
  try {
    const { name, sacCode, gstRate } = req.body;

    if (!name || !sacCode || gstRate === undefined) {
      return res.status(400).json({ message: "Please provide Service Name, SAC Code, and GST Rate." });
    }

    const existing = await Service.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
    if (existing) {
      return res.status(400).json({ message: "A service with this name already exists." });
    }

    const newService = new Service({
      name,
      sacCode,
      gstRate: Number(gstRate),
    });

    const saved = await newService.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: "Error creating service", error: error.message });
  }
});

// 3. PUT /api/services/:id - Update an existing service
router.put("/:id", async (req, res) => {
  try {
    const { name, sacCode, gstRate } = req.body;

    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service not found." });
    }

    if (name) {
      // Check unique name clash
      const duplicate = await Service.findOne({
        _id: { $ne: req.params.id },
        name: { $regex: new RegExp(`^${name}$`, "i") },
      });
      if (duplicate) {
        return res.status(400).json({ message: "A service with this name already exists." });
      }
      service.name = name;
    }

    if (sacCode) service.sacCode = sacCode;
    if (gstRate !== undefined) service.gstRate = Number(gstRate);

    const updated = await service.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error updating service", error: error.message });
  }
});

// 4. DELETE /api/services/:id - Delete a billing service
router.delete("/:id", async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service not found." });
    }
    res.json({ message: "Service deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error deleting service", error: error.message });
  }
});

export default router;
