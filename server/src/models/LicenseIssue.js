const mongoose = require("mongoose");

const licenseIssueSchema = new mongoose.Schema(
  {
    licenseId: { type: String, required: true, unique: true, trim: true },
    customerId: { type: String, default: "", trim: true },
    installationId: { type: String, default: "", trim: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    customerName: { type: String, default: "", trim: true },
    companyName: { type: String, default: "", trim: true },
    databaseLabel: { type: String, default: "", trim: true },
    months: { type: Number, required: true },
    issuedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    status: { type: String, default: "active", enum: ["active", "expired", "blocked"] },
    lastValidatedAt: { type: Date, default: null },
    lastActivatedAt: { type: Date, default: null },
    issuedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    issuedByName: { type: String, default: "", trim: true },
    keyPreview: { type: String, default: "", trim: true },
    emailSentToCustomer: { type: Boolean, default: false },
    generatedFromRequestEmail: { type: String, default: "", trim: true, lowercase: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LicenseIssue", licenseIssueSchema);
