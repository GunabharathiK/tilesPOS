const express = require("express");
const cors = require("cors");

const productRoutes  = require("./routes/productRoutes");
const customerRoutes = require("./routes/customerRoutes");
const invoiceRoutes  = require("./routes/invoiceRoutes");
const authRoutes     = require("./routes/authRoutes");
const supplierRoutes = require("./routes/supplierRoutes"); // ✅ NEW

const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Routes
app.use("/api/products",  productRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/invoices",  invoiceRoutes);
app.use("/api/auth",      authRoutes);
app.use("/api/suppliers", supplierRoutes); // ✅ NEW

module.exports = app;