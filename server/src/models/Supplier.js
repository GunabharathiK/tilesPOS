const mongoose = require("mongoose");

const supplierItemSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  colorDesign: { type: String, default: "" },
  size:     { type: String, default: "" },
  qty:      { type: Number, required: true },
  unit:     { type: String, required: true },
  price:    { type: Number, required: true },
  discount: { type: Number, default: 0 },
  gst:      { type: Number, default: 0 },
  hsnCode:  { type: String, default: "" },
  image:    { type: String, default: "" },
  date:     { type: Date,   default: Date.now },
});

const supplierSchema = new mongoose.Schema(
  {
    // ── Company Details ──────────────────────────────────────
    name:            { type: String, required: true }, // backward compat = companyName
    companyName:     { type: String, default: "" },
    companyEmail:    { type: String, default: "" },
    companyWebsite:  { type: String, default: "" },
    licNo:           { type: String, default: "" },
    gstin:           { type: String, default: "" },
    companyPhone:    { type: String, default: "" },

    // ── Supplier Contact ─────────────────────────────────────
    supplierName:    { type: String, default: "" },
    supplierPhone:   { type: String, default: "" },
    phone:           { type: String, default: "" }, // backward compat = supplierPhone

    // ── Bank Details ─────────────────────────────────────────
    accountNo:       { type: String, default: "" },
    ifscCode:        { type: String, default: "" },
    upiId:           { type: String, default: "" },
    accountHolder:   { type: String, default: "" },
    bankName:        { type: String, default: "" },
    branch:          { type: String, default: "" },

    // ── Address ──────────────────────────────────────────────
    address:         { type: String, default: "" }, // backward compat = companyAddress
    companyAddress:  { type: String, default: "" },
    pincode:         { type: String, default: "" },
    state:           { type: String, default: "" },
    city:            { type: String, default: "" },

    // ── Items ────────────────────────────────────────────────
    items: [supplierItemSchema],

    // ── Payment ──────────────────────────────────────────────
    totalValue:    { type: Number, default: 0 },
    totalPaid:     { type: Number, default: 0 },
    totalDue:      { type: Number, default: 0 },
    paymentStatus: {
      type:    String,
      enum:    ["Paid", "Pending", "Partial"],
      default: "Pending",
    },
    paymentMode: {
      type:    String,
      enum:    ["Cash", "Card", "UPI", "Net Banking", ""],
      default: "",
    },
    paymentType: {
      type:    String,
      enum:    ["Full Payment", "Partial", "Pending", ""],
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Supplier", supplierSchema);
