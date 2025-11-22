const express = require("express");
const router = express.Router();
const Adjustment = require("../models/Adjustment");
const Product = require("../models/Product");
const StockLedger = require("../models/StockLedger");
const auth = require("../middleware/auth");

// Get all adjustments
router.get("/", auth, async (req, res) => {
  try {
    const { warehouse, product } = req.query;
    let query = {};

    if (warehouse) query.warehouse = warehouse;
    if (product) query.product = product;

    const adjustments = await Adjustment.find(query)
      .populate("warehouse")
      .populate("product")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json(adjustments);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get single adjustment
router.get("/:id", auth, async (req, res) => {
  try {
    const adjustment = await Adjustment.findById(req.params.id)
      .populate("warehouse")
      .populate("product")
      .populate("createdBy", "name email");
    if (!adjustment) {
      return res.status(404).json({ message: "Adjustment not found" });
    }
    res.json(adjustment);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Create adjustment
router.post("/", auth, async (req, res) => {
  try {
    const {
      warehouse,
      product: productId,
      countedQuantity,
      reason,
      notes,
    } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Find warehouse stock
    const warehouseStock = product.stockByWarehouse.find(
      (s) => s.warehouse.toString() === warehouse
    );

    const recordedQuantity = warehouseStock ? warehouseStock.quantity : 0;
    const difference = countedQuantity - recordedQuantity;

    // Generate adjustment number
    const count = await Adjustment.countDocuments();
    const adjustmentNumber = `ADJ${String(count + 1).padStart(6, "0")}`;

    const adjustment = new Adjustment({
      adjustmentNumber,
      warehouse,
      product: productId,
      recordedQuantity,
      countedQuantity,
      difference,
      reason,
      notes,
      createdBy: req.user.userId,
    });

    await adjustment.save();

    // Update stock
    const quantityBefore = recordedQuantity;
    const quantityChange = difference;
    const quantityAfter = countedQuantity;

    if (warehouseStock) {
      warehouseStock.quantity = quantityAfter;
    } else {
      product.stockByWarehouse.push({
        warehouse,
        quantity: quantityAfter,
      });
    }

    product.totalStock += quantityChange;
    await product.save();

    // Log in stock ledger
    await new StockLedger({
      product: productId,
      warehouse,
      type: "adjustment",
      referenceDoc: adjustmentNumber,
      referenceId: adjustment._id,
      quantityBefore,
      quantityChange,
      quantityAfter,
      notes: `Adjustment: ${reason} - ${notes || ""}`,
      createdBy: req.user.userId,
    }).save();

    await adjustment.populate("warehouse product createdBy");
    res.status(201).json(adjustment);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
