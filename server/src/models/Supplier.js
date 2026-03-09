const mongoose = require("mongoose");

/* ── Items schema (legacy purchase items stored on supplier) ── */
const supplierItemSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  colorDesign: { type: String, default: "" },
  size:        { type: String, default: "" },
  hsnCode:     { type: String, default: "" },
  qty:         { type: Number, default: 0 },
  unit:        { type: String, default: "" },
  price:       { type: Number, default: 0 },
  discount:    { type: Number, default: 0 },
  gst:         { type: Number, default: 0 },
  image:       { type: String, default: "" },
});

/* ── Main Supplier schema ─────────────────────────────────── */
const supplierSchema = new mongoose.Schema(
  {
    // ── Company info ──────────────────────────────────────────
    companyName:    { type: String, required: true, trim: true },
    name:           { type: String, trim: true },         // backward compat alias
    companyEmail:   { type: String, default: "" },
    companyWebsite: { type: String, default: "" },
    companyPhone:   { type: String, required: true },
    phone:          { type: String, default: "" },        // backward compat alias
    altPhone:       { type: String, default: "" },        // alternate mobile / landline
    designation:    { type: String, default: "" },        // contact person designation
    licNo:          { type: String, default: "" },

    // ── Supplier contact ─────────────────────────────────────
    supplierName:  { type: String, default: "" },
    supplierPhone: { type: String, default: "" },

    // ── Address ──────────────────────────────────────────────
    companyAddress: { type: String, default: "" },
    address:        { type: String, default: "" },        // backward compat alias
    pincode:        { type: String, default: "" },
    state:          { type: String, default: "" },
    city:           { type: String, default: "" },

    // ── Products & Category ───────────────────────────────────
    // `productsSupplied` is kept for backward compatibility and mirrors `categories`.
    productsSupplied: [{ type: String }],
    categories:       [{ type: String }],
    productNames:     [{ type: String }],
    brands:           { type: String, default: "" },      // brands / collections

    // ── GST & Tax ────────────────────────────────────────────
    gstin:            { type: String, default: "" },
    panNumber:        { type: String, default: "" },
    stateCode:        { type: String, default: "" },
    registrationType: {
      type: String,
      enum: ["Regular (GST)", "Composition", "Unregistered"],
      default: "Regular (GST)",
    },

    // ── Payment & Credit Terms ───────────────────────────────
    paymentTerms: {
      type: String,
      enum: ["Advance Payment","On Delivery (COD)","Net 7 Days","Net 15 Days","Net 30 Days","Net 45 Days","Net 60 Days"],
      default: "Net 30 Days",
    },
    creditLimit: { type: Number, default: 0 },
    discountPct: { type: Number, default: 0 },
    freight: {
      type: String,
      enum: ["Supplier Pays (Free Delivery)", "We Pay", "Shared 50-50"],
      default: "Supplier Pays (Free Delivery)",
    },

    // ── Bank account ─────────────────────────────────────────
    bankName:      { type: String, default: "" },
    accountNo:     { type: String, default: "" },
    ifscCode:      { type: String, default: "" },
    accountHolder: { type: String, default: "" },
    branch:        { type: String, default: "" },
    accountType: {
      type: String,
      enum: ["Current Account", "Savings Account"],
      default: "Current Account",
    },
    upiId: { type: String, default: "" },

    // ── Rating & Notes ───────────────────────────────────────
    rating:        { type: String, default: "⭐⭐⭐⭐⭐ Excellent" },
    priority: {
      type: String,
      enum: ["Primary Supplier", "Secondary Supplier", "Backup / Emergency", "Inactive"],
      default: "Primary Supplier",
    },
    internalNotes: { type: String, default: "" },

    // ── Embedded items (legacy) ──────────────────────────────
    items: [supplierItemSchema],

    // ── Payment summary (computed dynamically from Purchases, kept for compat) ──
    totalValue:    { type: Number, default: 0 },
    totalPaid:     { type: Number, default: 0 },
    totalDue:      { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Pending", "Partial"],
      default: "Pending",
    },
    paymentMode: {
      type: String,
      enum: ["Cash", "Card", "UPI", "Net Banking", ""],
      default: "",
    },
    paymentType: {
      type: String,
      enum: ["Full Payment", "Partial", "Pending", ""],
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Supplier", supplierSchema);
