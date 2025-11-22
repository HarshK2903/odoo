const mongoose = require("mongoose");

const stockLedgerSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Warehouse",
    required: true,
  },
  type: {
    type: String,
    enum: ["receipt", "delivery", "transfer_in", "transfer_out", "adjustment"],
    required: true,
  },
  referenceDoc: String,
  referenceId: mongoose.Schema.Types.ObjectId,
  quantityBefore: {
    type: Number,
    required: true,
  },
  quantityChange: {
    type: Number,
    required: true,
  },
  quantityAfter: {
    type: Number,
    required: true,
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("StockLedger", stockLedgerSchema);
