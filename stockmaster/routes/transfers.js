const express = require("express");
const router = express.Router();
const Transfer = require("../models/Transfer");
const Product = require("../models/Product");
const StockLedger = require("../models/StockLedger");
const auth = require("../middleware/auth");

// Get all transfers
router.get("/", auth, async (req, res) => {
  try {
    const { status, warehouse } = req.query;
    let query = {};

    if (status) query.status = status;
    if (warehouse) {
      query.$or = [{ fromWarehouse: warehouse }, { toWarehouse: warehouse }];
    }

    const transfers = await Transfer.find(query)
      .populate("fromWarehouse")
      .populate("toWarehouse")
      .populate("items.product")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json(transfers);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get single transfer
router.get("/:id", auth, async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id)
      .populate("fromWarehouse")
      .populate("toWarehouse")
      .populate("items.product")
      .populate("createdBy", "name email");
    if (!transfer) {
      return res.status(404).json({ message: "Transfer not found" });
    }
    res.json(transfer);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Create transfer
router.post("/", auth, async (req, res) => {
  try {
    const { fromWarehouse, toWarehouse, items, notes } = req.body;

    if (fromWarehouse === toWarehouse) {
      return res
        .status(400)
        .json({ message: "Source and destination must be different" });
    }

    // Generate transfer number
    const count = await Transfer.countDocuments();
    const transferNumber = `TRF${String(count + 1).padStart(6, "0")}`;

    const transfer = new Transfer({
      transferNumber,
      fromWarehouse,
      toWarehouse,
      items,
      notes,
      createdBy: req.user.userId,
    });

    await transfer.save();
    await transfer.populate(
      "fromWarehouse toWarehouse items.product createdBy"
    );
    res.status(201).json(transfer);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update transfer
router.put("/:id", auth, async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (transfer.status === "done") {
      return res
        .status(400)
        .json({ message: "Cannot update validated transfer" });
    }

    Object.assign(transfer, req.body);
    await transfer.save();
    await transfer.populate(
      "fromWarehouse toWarehouse items.product createdBy"
    );
    res.json(transfer);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Validate transfer (move stock between warehouses)
router.post("/:id/validate", auth, async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id).populate(
      "items.product"
    );

    if (transfer.status === "done") {
      return res.status(400).json({ message: "Transfer already validated" });
    }

    // Process each item
    for (const item of transfer.items) {
      const product = await Product.findById(item.product._id);

      // Check from warehouse stock
      const fromStock = product.stockByWarehouse.find(
        (s) => s.warehouse.toString() === transfer.fromWarehouse.toString()
      );

      if (!fromStock || fromStock.quantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name} in source warehouse`,
        });
      }

      // Decrease from source warehouse
      const fromQuantityBefore = fromStock.quantity;
      fromStock.quantity -= item.quantity;

      // Log transfer out
      await new StockLedger({
        product: product._id,
        warehouse: transfer.fromWarehouse,
        type: "transfer_out",
        referenceDoc: transfer.transferNumber,
        referenceId: transfer._id,
        quantityBefore: fromQuantityBefore,
        quantityChange: -item.quantity,
        quantityAfter: fromStock.quantity,
        notes: `Transfer to another warehouse`,
        createdBy: req.user.userId,
      }).save();

      // Increase in destination warehouse
      let toStock = product.stockByWarehouse.find(
        (s) => s.warehouse.toString() === transfer.toWarehouse.toString()
      );

      const toQuantityBefore = toStock ? toStock.quantity : 0;

      if (toStock) {
        toStock.quantity += item.quantity;
      } else {
        product.stockByWarehouse.push({
          warehouse: transfer.toWarehouse,
          quantity: item.quantity,
        });
      }

      // Log transfer in
      await new StockLedger({
        product: product._id,
        warehouse: transfer.toWarehouse,
        type: "transfer_in",
        referenceDoc: transfer.transferNumber,
        referenceId: transfer._id,
        quantityBefore: toQuantityBefore,
        quantityChange: item.quantity,
        quantityAfter: toQuantityBefore + item.quantity,
        notes: `Transfer from another warehouse`,
        createdBy: req.user.userId,
      }).save();

      await product.save();
    }

    transfer.status = "done";
    transfer.validatedAt = new Date();
    await transfer.save();
    await transfer.populate(
      "fromWarehouse toWarehouse items.product createdBy"
    );

    res.json(transfer);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Cancel transfer
router.post("/:id/cancel", auth, async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);

    if (transfer.status === "done") {
      return res
        .status(400)
        .json({ message: "Cannot cancel validated transfer" });
    }

    transfer.status = "canceled";
    await transfer.save();
    await transfer.populate(
      "fromWarehouse toWarehouse items.product createdBy"
    );
    res.json(transfer);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
