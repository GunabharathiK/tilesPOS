const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    customer: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      address: { type: String, default: "" },
      gstin: { type: String, default: "" },
      dealerTier: { type: String, default: "" },
      paymentTerms: { type: String, default: "" },
      transportMode: { type: String, default: "" },
      vehicleNo: { type: String, default: "" },
      ewayBillNo: { type: String, default: "" },
      customerType: { type: String, default: "Retail Customer" },
      saleType: { type: String, default: "Retail Customer" },
    },

    items: [
      {
        productId: String,
        code: { type: String, default: "" },
        name: String,
        colorDesign: { type: String, default: "" },
        category: { type: String, default: "" },
        finish: { type: String, default: "" },
        quantity: Number,
        boxes: { type: Number, default: 0 },
        size: { type: String, default: "" },
        uom: { type: String, default: "" },
        price: Number,
        gst: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        gstAmount: { type: Number, default: 0 },
        discountAmount: { type: Number, default: 0 },
        total: Number,
      },
    ],

    tax: Number,
    discount: Number,
    taxAmount: Number,
    discountAmount: Number,

    payment: {
      method: String,
      amount: Number,
      paidAmount: { type: Number, default: 0 },
      dueAmount: { type: Number, default: 0 },
      paymentType: { type: String, default: "" },
    },

    status: {
      type: String,
      enum: ["Paid", "Pending", "Partial"],
      default: "Pending",
    },
    documentType: {
      type: String,
      enum: ["invoice", "quotation"],
      default: "invoice",
    },
    stockReduced: { type: Boolean, default: true },
    charges: {
      loading: { type: Number, default: 0 },
      transport: { type: Number, default: 0 },
      extraDiscount: { type: Number, default: 0 },
      customerTypeDiscount: { type: Number, default: 0 },
      customerTypeDiscountPct: { type: Number, default: 0 },
    },
    notes: { type: String, default: "" },

    invoiceNo: String,
    date: String,
    customerType: { type: String, default: "Retail Customer" },
    saleType: { type: String, default: "Retail Customer" },
    businessMeta: {
      dealerTier: { type: String, default: "" },
      paymentTerms: { type: String, default: "" },
      transportMode: { type: String, default: "" },
      vehicleNo: { type: String, default: "" },
      ewayBillNo: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
