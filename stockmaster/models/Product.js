const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  sku: {
    type: String,
    required: true,
    unique: true,
  },
  category: {
    type: String,
    required: true,
  },
  unitOfMeasure: {
    type: String,
    required: true,
    default: "units",
  },
  minStock: {
    type: Number,
    default: 10,
  },
  stockByWarehouse: [
    {
      warehouse: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
      },
      quantity: {
        type: Number,
        default: 0,
      },
    },
  ],
  totalStock: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Product", productSchema);
