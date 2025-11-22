const mongoose = require("mongoose");

const adjustmentSchema = new mongoose.Schema({
  adjustmentNumber: {
    type: String,
    required: true,
    unique: true,
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Warehouse",
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  recordedQuantity: {
    type: Number,
    required: true,
  },
  countedQuantity: {
    type: Number,
    required: true,
  },
  difference: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    enum: ["damage", "theft", "count_error", "other"],
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

module.exports = mongoose.model("Adjustment", adjustmentSchema);
