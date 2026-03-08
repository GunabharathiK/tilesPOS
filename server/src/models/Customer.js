const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    // ✅ Extended customer details
    name: { type: String, default: "" },
    phone: { type: String, default: "" },
    alternateMobile: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    gstin: { type: String, default: "" },
    customerType: { type: String, default: "Retail Customer" },
    paymentTerms: { type: String, default: "Cash Only" },
    dealerDetails: {
      companyName: { type: String, default: "" },
      ownerName: { type: String, default: "" },
      primaryMobile: { type: String, default: "" },
      alternateMobile: { type: String, default: "" },
      email: { type: String, default: "" },
      city: { type: String, default: "" },
      gstin: { type: String, default: "" },
      fullAddress: { type: String, default: "" },
      dealerTier: { type: String, default: "Platinum (Top Dealer)" },
      creditLimit: { type: Number, default: 0 },
      paymentTerms: { type: String, default: "Advance" },
      standardDiscount: { type: Number, default: 0 },
      bankAccountNo: { type: String, default: "" },
      ifscCode: { type: String, default: "" },
      territoryArea: { type: String, default: "" },
      notes: { type: String, default: "" },
    },
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
