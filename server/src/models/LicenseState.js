const mongoose = require("mongoose");

const licenseStateSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      unique: true,
      default: "primary",
    },
    installationId: {
      type: String,
      required: true,
      trim: true,
    },
    databaseLabel: {
      type: String,
      default: "",
      trim: true,
    },
    trialStartedAt: {
      type: Date,
      required: true,
    },
    trialEndsAt: {
      type: Date,
      required: true,
    },
    activatedLicense: {
      licenseId: { type: String, default: null },
      customerId: { type: String, default: null },
      installationId: { type: String, default: null },
      email: { type: String, default: null },
      customerName: { type: String, default: null },
      companyName: { type: String, default: null },
      databaseLabel: { type: String, default: null },
      months: { type: Number, default: null },
      issuedAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
      activatedAt: { type: Date, default: null },
      lastVerifiedAt: { type: Date, default: null },
      licenseKeyHash: { type: String, default: null },
      keyPreview: { type: String, default: null },
    },
    lastLicenseRequest: {
      email: { type: String, default: null },
      companyName: { type: String, default: null },
      phone: { type: String, default: null },
      message: { type: String, default: null },
      installationId: { type: String, default: null },
      databaseLabel: { type: String, default: null },
      requestedAt: { type: Date, default: null },
    },
    centralSync: {
      lastSyncedAt: { type: Date, default: null },
      lastHeartbeatAt: { type: Date, default: null },
      lastError: { type: String, default: null },
      lastRemoteStatus: { type: String, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LicenseState", licenseStateSchema);
