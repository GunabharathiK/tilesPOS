const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    customer: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      address: { type: String, default: "" },
      district: { type: String, default: "" },
      state: { type: String, default: "" },
      pincode: { type: String, default: "" },
    },

    items: [
      {
        productId: String,
        code: { type: String, default: "" },   // ✅ unique product code
        name: String,
        quantity: Number,
        size: { type: String, default: "" },   // e.g. "2X2"
        uom: { type: String, default: "" },    // e.g. "sqrft", "kg", "bag"
        price: Number,
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
    },

    status: {
      type: String,
      enum: ["Paid", "Pending"],
      default: "Pending",
    },

    invoiceNo: String,
    date: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);