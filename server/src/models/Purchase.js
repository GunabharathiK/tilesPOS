const mongoose = require("mongoose");

const purchaseItemSchema = new mongoose.Schema({
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

const purchaseSchema = new mongoose.Schema(
  {
    supplierId:   { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    supplierName: { type: String, default: "" },
    invoiceNo:    { type: String, required: true },
    invoiceDate:  { type: Date,   default: Date.now },

    additionalCharges: [
      {
        reason: { type: String, default: "" },
        amount: { type: Number, default: 0 },
      },
    ],

    products: [purchaseItemSchema],

    // ── Purchase totals (from SupplierProduct form) ──────────
    subtotal:        { type: Number, default: 0 },
    totalDiscount:   { type: Number, default: 0 },
    totalGst:        { type: Number, default: 0 },
    additionalTotal: { type: Number, default: 0 },
    grandTotal:      { type: Number, default: 0 },

    // ── Extra GST/Discount applied at payment time ───────────
    extraDiscountPct: { type: Number, default: 0 },
    extraDiscountAmt: { type: Number, default: 0 },
    extraGstPct:      { type: Number, default: 0 },
    extraGstAmt:      { type: Number, default: 0 },
    finalPayable:     { type: Number, default: 0 }, // grandTotal after extra disc/gst

    // ── Per-purchase payment tracking ────────────────────────
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

// ── Drop any stale unique index on purchaseId left from old schema ──
purchaseSchema.post("init", () => {});
const Purchase = mongoose.model("Purchase", purchaseSchema);

// Drop the bad index if it exists (runs once on startup, safe to call repeatedly)
Purchase.collection
  .dropIndex("purchaseId_1")
  .catch(() => {}); // silently ignore if index doesn't exist

module.exports = Purchase;
