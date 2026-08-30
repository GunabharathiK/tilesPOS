const mongoose = require("mongoose");

const clientProvisionSchema = new mongoose.Schema(
  {
    provisionId: { type: String, required: true, unique: true, trim: true },
    customerId: { type: String, default: "", trim: true },
    licenseId: { type: String, default: "", trim: true },
    installationId: { type: String, required: true, trim: true, index: true },
    databaseLabel: { type: String, default: "", trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    customerName: { type: String, default: "", trim: true },
    companyName: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    adminName: { type: String, required: true, trim: true },
    adminPhone: { type: String, required: true, trim: true },
    adminPasswordHash: { type: String, required: true, trim: true },
    months: { type: Number, required: true },
    status: { type: String, default: "provisioned", enum: ["provisioned", "imported", "expired", "blocked"] },
    importedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    issuedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    issuedByName: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClientProvision", clientProvisionSchema);
