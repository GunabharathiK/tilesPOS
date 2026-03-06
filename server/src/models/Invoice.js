const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    customer: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      address: { type: String, default: "" },
      accountNo: { type: String, default: "" },
      ifscCode: { type: String, default: "" },
      upiId: { type: String, default: "" },
      accountHolder: { type: String, default: "" },
      bankName: { type: String, default: "" },
      branch: { type: String, default: "" },
    },

    items: [
      {
        productId: String,
        code: { type: String, default: "" },
        name: String,
        colorDesign: { type: String, default: "" },
        quantity: Number,
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
    stockReduced: { type: Boolean, default: true },

    invoiceNo: String,
    date: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
