const mongoose = require("mongoose");

const shopInstallationSchema = new mongoose.Schema(
  {
    installationId: { type: String, required: true, unique: true, trim: true },
    customerId: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    customerName: { type: String, default: "", trim: true },
    companyName: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    databaseLabel: { type: String, default: "", trim: true },
    appVersion: { type: String, default: "", trim: true },
    licenseId: { type: String, default: "", trim: true },
    licenseStatus: { type: String, default: "trial", trim: true },
    trialEndsAt: { type: Date, default: null },
    licenseExpiresAt: { type: Date, default: null },
    lastHeartbeatAt: { type: Date, default: null },
    lastSeenAt: { type: Date, default: null },
    lastNotificationAt: { type: Date, default: null },
    lastKnownIp: { type: String, default: "", trim: true },
    syncSource: { type: String, default: "local-pos", trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ShopInstallation", shopInstallationSchema);
