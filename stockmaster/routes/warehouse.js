const express = require("express");
const router = express.Router();
const Warehouse = require("../models/Warehouse");
const auth = require("../middleware/auth");

// Get all warehouses
router.get("/", auth, async (req, res) => {
  try {
    const warehouses = await Warehouse.find().sort({ createdAt: -1 });
    res.json(warehouses);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Create warehouse
router.post("/", auth, async (req, res) => {
  try {
    const warehouse = new Warehouse(req.body);
    await warehouse.save();
    res.status(201).json(warehouse);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update warehouse
router.put("/:id", auth, async (req, res) => {
  try {
    const warehouse = await Warehouse.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(warehouse);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete warehouse
router.delete("/:id", auth, async (req, res) => {
  try {
    await Warehouse.findByIdAndDelete(req.params.id);
    res.json({ message: "Warehouse deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
