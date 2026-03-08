const mongoose = require("mongoose");

/* ── Product line item ───────────────────────────────────────── */
const productSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  size:        { type: String,  default: "" },
  ordered:     { type: Number,  default: 0  },   // Ordered (Boxes)
  received:    { type: Number,  default: 0  },   // Received (Boxes)
  diff:        { type: Number,  default: 0  },   // Ordered - Received
  sqft:        { type: Number,  default: 0  },   // Total sqft
  price:       { type: Number,  default: 0  },   // Cost Rate ₹/sqft
  qty:         { type: Number,  default: 0  },   // alias = received (compat)
  unit:        { type: String,  default: "Box" },
  colorDesign: { type: String,  default: "" },
  hsnCode:     { type: String,  default: "" },
  discount:    { type: Number,  default: 0  },
  gst:         { type: Number,  default: 0  },
  image:       { type: String,  default: "" },
}, { _id: false });

/* ── Additional charges ─────────────────────────────────────── */
const additionalChargeSchema = new mongoose.Schema({
  reason: { type: String, default: "" },
  amount: { type: Number, default: 0  },
}, { _id: false });

const paymentEntrySchema = new mongoose.Schema({
  amount:      { type: Number, default: 0 },
  paymentDate: { type: String, default: "" },
  paymentMode: { type: String, default: "" },
  referenceNo: { type: String, default: "" },
  remarks:     { type: String, default: "" },
  createdAt:   { type: Date, default: Date.now },
}, { _id: false });

/* ── Main GRN / Purchase schema ──────────────────────────────── */
const purchaseSchema = new mongoose.Schema(
  {
    /* Supplier */
    supplierId:   { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    supplierName: { type: String, default: "" },

    /* GRN identifiers */
    grnNo:       { type: String, default: "" },   // GRN-2026-XXXX
    invoiceNo:   { type: String, required: true },
    invoiceDate: { type: String, default: "" },   // Receipt / GRN Date
    poRef:       { type: String, default: "" },   // PO Reference No.

    /* Logistics */
    vehicleNo:  { type: String, default: "" },    // Vehicle / Lorry No.
    ewayBill:   { type: String, default: "" },    // E-Way Bill No.
    lotNo:      { type: String, default: "" },    // Lot / Batch No.
    receivedBy: { type: String, default: "" },

    /* Items */
    products:          { type: [productSchema],          default: [] },
    additionalCharges: { type: [additionalChargeSchema], default: [] },

    /* Financials */
    subtotal:           { type: Number, default: 0 },
    freight:            { type: Number, default: 0 },
    gstOption:          { type: String, default: "" },   // e.g. "18% CGST+SGST (Intra-State)"
    gstPct:             { type: Number, default: 0  },
    gstAmt:             { type: Number, default: 0  },
    totalInvoiceAmount: { type: Number, default: 0  },
    grandTotal:         { type: Number, default: 0  },

    /* Payment adjustments (filled later from payment module) */
    extraDiscountPct: { type: Number, default: 0 },
    extraDiscountAmt: { type: Number, default: 0 },
    extraGstPct:      { type: Number, default: 0 },
    extraGstAmt:      { type: Number, default: 0 },
    finalPayable:     { type: Number, default: 0 },

    /* Payment tracking */
    totalPaid:     { type: Number, default: 0 },
    totalDue:      { type: Number, default: 0 },
    paymentStatus: {
      type:    String,
      enum:    [
        "Paid", "Pending", "Partial", "Draft",
        "Credit (Pay Later)", "Cash on Delivery",
        "Advance Paid", "Partial Advance", "Post-dated Cheque",
      ],
      default: "Pending",
    },
    paymentMode: {
      type:    String,
      enum:    ["Cash", "Card", "UPI", "Net Banking", "Cheque", ""],
      default: "",
    },
    paymentType: {
      type:    String,
      enum:    ["Full Payment", "Partial", "Pending", ""],
      default: "",
    },
    lastPaymentDate: { type: String, default: "" },
    lastReferenceNo: { type: String, default: "" },
    paymentHistory:  { type: [paymentEntrySchema], default: [] },

    /* Quality & notes */
    qualityStatus: { type: String, default: "✅ All OK" },
    remarks:       { type: String, default: ""           },
    isDraft:       { type: Boolean, default: false       },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Purchase", purchaseSchema);
