const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Warehouse = require("../models/Warehouse");
const auth = require("../middleware/auth");

// Get all products
router.get("/", auth, async (req, res) => {
  try {
    const { search, category, warehouse } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: new RegExp(search, "i") },
        { sku: new RegExp(search, "i") },
      ];
    }

    if (category) {
      query.category = category;
    }

    const products = await Product.find(query)
      .populate("stockByWarehouse.warehouse")
      .sort({ createdAt: -1 });

    // Filter by warehouse if specified
    let filteredProducts = products;
    if (warehouse) {
      filteredProducts = products.map((product) => {
        const stock = product.stockByWarehouse.find(
          (s) => s.warehouse._id.toString() === warehouse
        );
        return {
          ...product.toObject(),
          warehouseStock: stock ? stock.quantity : 0,
        };
      });
    }

    res.json(filteredProducts);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get single product
router.get("/:id", auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "stockByWarehouse.warehouse"
    );
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Create product
router.post("/", auth, async (req, res) => {
  try {
    const {
      name,
      sku,
      category,
      unitOfMeasure,
      minStock,
      initialStock,
      warehouse,
    } = req.body;

    // Check if SKU already exists
    const existing = await Product.findOne({ sku });
    if (existing) {
      return res.status(400).json({ message: "SKU already exists" });
    }

    const product = new Product({
      name,
      sku,
      category,
      unitOfMeasure,
      minStock,
      totalStock: initialStock || 0,
    });

    // If initial stock provided, add to warehouse
    if (initialStock && warehouse) {
      product.stockByWarehouse.push({
        warehouse,
        quantity: initialStock,
      });
    }

    await product.save();
    await product.populate("stockByWarehouse.warehouse");
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update product
router.put("/:id", auth, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate("stockByWarehouse.warehouse");
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete product
router.delete("/:id", auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product.totalStock > 0) {
      return res
        .status(400)
        .json({ message: "Cannot delete product with stock" });
    }
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get categories
router.get("/meta/categories", auth, async (req, res) => {
  try {
    const categories = await Product.distinct("category");
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get low stock products
router.get("/alerts/low-stock", auth, async (req, res) => {
  try {
    const products = await Product.find({
      $expr: { $lte: ["$totalStock", "$minStock"] },
    }).populate("stockByWarehouse.warehouse");
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
