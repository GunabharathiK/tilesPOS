const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true },
    code:    { type: String, unique: true, sparse: true, default: "" },
    price:   { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    stock:   { type: Number, default: 0 },
    size:    { type: String, default: "" },
    colorDesign: { type: String, default: "" },
    uom:     { type: String, default: "" },

    // ✅ NEW fields
    gst:     { type: Number, default: 0 },     // GST % — used in invoice calculation
    hsnCode: { type: String, default: "" },    // HSN Code
    image:   { type: String, default: "" },    // base64 or URL

    // ✅ Supplier reference (for supplier items)
    supplierId:   { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", default: null },
    supplierName: { type: String, default: "" },
    isSupplierItem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
