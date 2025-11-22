const express = require("express");
const router = express.Router();
const Delivery = require("../models/Delivery");
const Product = require("../models/Product");
const StockLedger = require("../models/StockLedger");
const auth = require("../middleware/auth");

// Get all deliveries
router.get("/", auth, async (req, res) => {
  try {
    const { status, warehouse } = req.query;
    let query = {};

    if (status) query.status = status;
    if (warehouse) query.warehouse = warehouse;

    const deliveries = await Delivery.find(query)
      .populate("warehouse")
      .populate("items.product")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json(deliveries);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get single delivery
router.get("/:id", auth, async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate("warehouse")
      .populate("items.product")
      .populate("createdBy", "name email");
    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Create delivery
router.post("/", auth, async (req, res) => {
  try {
    const { customer, warehouse, items, notes } = req.body;

    // Generate delivery number
    const count = await Delivery.countDocuments();
    const deliveryNumber = `DEL${String(count + 1).padStart(6, "0")}`;

    const delivery = new Delivery({
      deliveryNumber,
      customer,
      warehouse,
      items,
      notes,
      createdBy: req.user.userId,
    });

    await delivery.save();
    await delivery.populate("warehouse items.product createdBy");
    res.status(201).json(delivery);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update delivery
router.put("/:id", auth, async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (delivery.status === "done") {
      return res
        .status(400)
        .json({ message: "Cannot update validated delivery" });
    }

    Object.assign(delivery, req.body);
    await delivery.save();
    await delivery.populate("warehouse items.product createdBy");
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Validate delivery (decrease stock)
router.post("/:id/validate", auth, async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id).populate(
      "items.product"
    );

    if (delivery.status === "done") {
      return res.status(400).json({ message: "Delivery already validated" });
    }

    // Update stock for each product
    for (const item of delivery.items) {
      const product = await Product.findById(item.product._id);

      // Find warehouse stock entry
      const warehouseStock = product.stockByWarehouse.find(
        (s) => s.warehouse.toString() === delivery.warehouse.toString()
      );

      if (!warehouseStock || warehouseStock.quantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}`,
        });
      }

      const quantityBefore = warehouseStock.quantity;
      const quantityChange = -item.quantity;
      const quantityAfter = quantityBefore + quantityChange;

      warehouseStock.quantity = quantityAfter;
      product.totalStock += quantityChange;
      await product.save();

      // Log in stock ledger
      await new StockLedger({
        product: product._id,
        warehouse: delivery.warehouse,
        type: "delivery",
        referenceDoc: delivery.deliveryNumber,
        referenceId: delivery._id,
        quantityBefore,
        quantityChange,
        quantityAfter,
        notes: `Delivery to ${delivery.customer}`,
        createdBy: req.user.userId,
      }).save();

      item.pickedQuantity = item.quantity;
      item.packedQuantity = item.quantity;
    }

    delivery.status = "done";
    delivery.validatedAt = new Date();
    await delivery.save();
    await delivery.populate("warehouse items.product createdBy");

    res.json(delivery);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Cancel delivery
router.post("/:id/cancel", auth, async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);

    if (delivery.status === "done") {
      return res
        .status(400)
        .json({ message: "Cannot cancel validated delivery" });
    }

    delivery.status = "canceled";
    await delivery.save();
    await delivery.populate("warehouse items.product createdBy");
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
