const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true },
    code:    { type: String, unique: true, sparse: true, default: "" },
    barcode: { type: String, default: "" },
    category: { type: String, default: "" },
    price:   { type: Number, default: 0 },
    dealerPrice: { type: Number, default: 0 },
    contractorPrice: { type: Number, default: 0 },
    purchasePrice: { type: Number, default: 0 },
    minimumSellPrice: { type: Number, default: 0 },
    mrpPerBox: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    stock:   { type: Number, default: 0 },
    stockBoxes: { type: Number, default: 0 },
    size:    { type: String, default: "" },
    lengthCm: { type: Number, default: 0 },
    widthCm: { type: Number, default: 0 },
    colorDesign: { type: String, default: "" },
    brand: { type: String, default: "" },
    finish: { type: String, default: "" },
    uom:     { type: String, default: "" },
    tilesPerBox: { type: Number, default: 0 },
    coverageArea: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0 },
    minStockAlert: { type: Number, default: 10 },
    rackLocation: { type: String, default: "" },
    notes: { type: String, default: "" },

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
