const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, unique: true, sparse: true, default: "" }, // ✅ unique product code by admin
    price: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    size: { type: String, default: "" },   // e.g. "2X2", "3X4"
    uom: { type: String, default: "" },    // e.g. "sqrft", "kg", "bag"
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);