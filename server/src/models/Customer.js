const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    // ✅ Extended customer details
    name: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    accountNo: { type: String, default: "" },
    ifscCode: { type: String, default: "" },
    upiId: { type: String, default: "" },
    accountHolder: { type: String, default: "" },
    bankName: { type: String, default: "" },
    branch: { type: String, default: "" },

    totalSpent: { type: Number, default: 0 },
    lastPurchase: Date,

    status: {
      type: String,
      enum: ["Paid", "Pending", "Partial"],
      default: "Pending",
    },

    method: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);
