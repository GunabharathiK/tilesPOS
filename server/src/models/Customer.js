const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    // ✅ Extended customer details
    name: { type: String, default: "" },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    district: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },

    totalSpent: { type: Number, default: 0 },
    lastPurchase: Date,

    status: {
      type: String,
      enum: ["Paid", "Pending"],
      default: "Pending",
    },

    method: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);