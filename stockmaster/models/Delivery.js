const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema({
  deliveryNumber: {
    type: String,
    required: true,
    unique: true,
  },
  customer: {
    type: String,
    required: true,
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Warehouse",
    required: true,
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      pickedQuantity: Number,
      packedQuantity: Number,
    },
  ],
  status: {
    type: String,
    enum: ["draft", "waiting", "ready", "done", "canceled"],
    default: "draft",
  },
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  validatedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Delivery", deliverySchema);
