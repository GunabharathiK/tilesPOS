const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Invoice"
  },
  method: {
    type: String,
    enum: ["CASH", "UPI"]
  },
  amount: Number,
  transactionId: String
});

module.exports = mongoose.model("Payment", paymentSchema);