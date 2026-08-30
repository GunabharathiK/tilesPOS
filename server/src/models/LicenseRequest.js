const mongoose = require("mongoose");

const licenseRequestSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    companyName: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    message: { type: String, default: "", trim: true },
    installationId: { type: String, default: "", trim: true },
    databaseLabel: { type: String, default: "", trim: true },
    requestedAt: { type: Date, default: Date.now },
    source: { type: String, default: "software", trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LicenseRequest", licenseRequestSchema);
