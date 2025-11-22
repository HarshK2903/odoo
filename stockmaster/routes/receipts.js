const express = require("express");
const router = express.Router();
const Receipt = require("../models/Receipt");
const Product = require("../models/Product");
const StockLedger = require("../models/StockLedger");
const auth = require("../middleware/auth");

// Get all receipts
router.get("/", auth, async (req, res) => {
  try {
    const { status, warehouse } = req.query;
    let query = {};

    if (status) query.status = status;
    if (warehouse) query.warehouse = warehouse;

    const receipts = await Receipt.find(query)
      .populate("warehouse")
      .populate("items.product")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json(receipts);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get single receipt
router.get("/:id", auth, async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id)
      .populate("warehouse")
      .populate("items.product")
      .populate("createdBy", "name email");
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }
    res.json(receipt);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Create receipt
router.post("/", auth, async (req, res) => {
  try {
    const { supplier, warehouse, items, notes } = req.body;

    // Generate receipt number
    const count = await Receipt.countDocuments();
    const receiptNumber = `RCP${String(count + 1).padStart(6, "0")}`;

    const receipt = new Receipt({
      receiptNumber,
      supplier,
      warehouse,
      items,
      notes,
      createdBy: req.user.userId,
    });

    await receipt.save();
    await receipt.populate("warehouse items.product createdBy");
    res.status(201).json(receipt);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update receipt
router.put("/:id", auth, async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (receipt.status === "done") {
      return res
        .status(400)
        .json({ message: "Cannot update validated receipt" });
    }

    Object.assign(receipt, req.body);
    await receipt.save();
    await receipt.populate("warehouse items.product createdBy");
    res.json(receipt);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Validate receipt (increase stock)
router.post("/:id/validate", auth, async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id).populate(
      "items.product"
    );

    if (receipt.status === "done") {
      return res.status(400).json({ message: "Receipt already validated" });
    }

    // Update stock for each product
    for (const item of receipt.items) {
      const product = await Product.findById(item.product._id);

      // Find or create warehouse stock entry
      let warehouseStock = product.stockByWarehouse.find(
        (s) => s.warehouse.toString() === receipt.warehouse.toString()
      );

      const quantityBefore = warehouseStock ? warehouseStock.quantity : 0;
      const quantityChange = item.quantity;
      const quantityAfter = quantityBefore + quantityChange;

      if (warehouseStock) {
        warehouseStock.quantity = quantityAfter;
      } else {
        product.stockByWarehouse.push({
          warehouse: receipt.warehouse,
          quantity: quantityAfter,
        });
      }

      product.totalStock += quantityChange;
      await product.save();

      // Log in stock ledger
      await new StockLedger({
        product: product._id,
        warehouse: receipt.warehouse,
        type: "receipt",
        referenceDoc: receipt.receiptNumber,
        referenceId: receipt._id,
        quantityBefore,
        quantityChange,
        quantityAfter,
        notes: `Receipt from ${receipt.supplier}`,
        createdBy: req.user.userId,
      }).save();

      item.receivedQuantity = item.quantity;
    }

    receipt.status = "done";
    receipt.validatedAt = new Date();
    await receipt.save();
    await receipt.populate("warehouse items.product createdBy");

    res.json(receipt);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Cancel receipt
router.post("/:id/cancel", auth, async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);

    if (receipt.status === "done") {
      return res
        .status(400)
        .json({ message: "Cannot cancel validated receipt" });
    }

    receipt.status = "canceled";
    await receipt.save();
    await receipt.populate("warehouse items.product createdBy");
    res.json(receipt);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
