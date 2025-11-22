const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Receipt = require("../models/Receipt");
const Delivery = require("../models/Delivery");
const Transfer = require("../models/Transfer");
const StockLedger = require("../models/StockLedger");
const auth = require("../middleware/auth");

// Get dashboard KPIs
router.get("/kpis", auth, async (req, res) => {
  try {
    // Total products
    const totalProducts = await Product.countDocuments();

    // Low stock items
    const lowStockItems = await Product.countDocuments({
      $expr: { $lte: ["$totalStock", "$minStock"] },
    });

    // Out of stock items
    const outOfStockItems = await Product.countDocuments({ totalStock: 0 });

    // Pending receipts
    const pendingReceipts = await Receipt.countDocuments({
      status: { $in: ["draft", "waiting", "ready"] },
    });

    // Pending deliveries
    const pendingDeliveries = await Delivery.countDocuments({
      status: { $in: ["draft", "waiting", "ready"] },
    });

    // Internal transfers scheduled
    const internalTransfers = await Transfer.countDocuments({
      status: { $in: ["draft", "waiting", "ready"] },
    });

    // Total stock value (can be enhanced with product prices)
    const totalStock = await Product.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$totalStock" },
        },
      },
    ]);

    res.json({
      totalProducts,
      lowStockItems,
      outOfStockItems,
      pendingReceipts,
      pendingDeliveries,
      internalTransfers,
      totalStockUnits: totalStock[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get recent activities
router.get("/activities", auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const activities = await StockLedger.find()
      .populate("product", "name sku")
      .populate("warehouse", "name")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get stock movement history for a product
router.get("/history/:productId", auth, async (req, res) => {
  try {
    const history = await StockLedger.find({ product: req.params.productId })
      .populate("warehouse", "name")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get analytics data
router.get("/analytics", auth, async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;

    let query = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    if (type) {
      query.type = type;
    }

    const movements = await StockLedger.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            type: "$type",
          },
          count: { $sum: 1 },
          totalChange: { $sum: "$quantityChange" },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    res.json(movements);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get stock by warehouse
router.get("/stock-by-warehouse", auth, async (req, res) => {
  try {
    const products = await Product.find().populate(
      "stockByWarehouse.warehouse"
    );

    const stockByWarehouse = {};

    products.forEach((product) => {
      product.stockByWarehouse.forEach((stock) => {
        const warehouseName = stock.warehouse.name;
        if (!stockByWarehouse[warehouseName]) {
          stockByWarehouse[warehouseName] = {
            totalQuantity: 0,
            productCount: 0,
            products: [],
          };
        }
        stockByWarehouse[warehouseName].totalQuantity += stock.quantity;
        stockByWarehouse[warehouseName].productCount++;
        stockByWarehouse[warehouseName].products.push({
          product: product.name,
          sku: product.sku,
          quantity: stock.quantity,
        });
      });
    });

    res.json(stockByWarehouse);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
