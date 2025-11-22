require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/products", require("./routes/products"));
app.use("/api/receipts", require("./routes/receipts"));
app.use("/api/deliveries", require("./routes/deliveries"));
app.use("/api/transfers", require("./routes/transfers"));
app.use("/api/adjustments", require("./routes/adjustments"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/warehouses", require("./routes/warehouse"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
