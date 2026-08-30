const crypto = require("crypto");
const User = require("../models/User");
const ClientProvision = require("../models/ClientProvision");
const LicenseIssue = require("../models/LicenseIssue");
const LicenseRequest = require("../models/LicenseRequest");
const LicenseState = require("../models/LicenseState");
const ShopInstallation = require("../models/ShopInstallation");
const {
  EXPIRY_WARNING_DAYS,
  createProvisionPackage,
  generateInstallationId,
  generateLicenseKey,
  getDatabaseLabel,
  getLicenseHash,
  getLicensePreview,
  getOrCreateLicenseState,
  normalizeEmail,
  summarizeLicenseState,
  verifyLicenseKey,
  verifyProvisionPackage,
} = require("../utils/licenseService");
const { sendEmail, smtpConfigured } = require("../utils/emailService");
const { ORG_SYNC_HEADER, isCentralSyncConfigured, postToCentral } = require("../utils/centralOwnerSync");

const ownerEmail = () => process.env.LICENSE_OWNER_EMAIL || process.env.SMTP_USER || "";
const centralSyncHeaderValue = () => String(process.env.CENTRAL_SYNC_TOKEN || "").trim();
const hashValue = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

const buildStatusResponse = async () => {
  const state = await getOrCreateLicenseState();
  return summarizeLicenseState(state);
};

const shopSummaryPayload = async (override = {}) => {
  const state = await getOrCreateLicenseState();
  const summary = summarizeLicenseState(state);
  return {
    installationId: summary.installationId,
    databaseLabel: summary.databaseLabel,
    licenseStatus: summary.status,
    trialEndsAt: summary.trialEndsAt,
    remainingDays: summary.remainingDays,
    notification: summary.notification,
    ...override,
  };
};

const registerCentralHeartbeat = async (override = {}) => {
  if (!isCentralSyncConfigured()) return;
  const state = await getOrCreateLicenseState();
  try {
    const summary = summarizeLicenseState(state);
    await postToCentral("/api/license/hub/heartbeat", {
      installationId: summary.installationId,
      databaseLabel: summary.databaseLabel,
      trialEndsAt: summary.trialEndsAt,
      licenseStatus: summary.status,
      remainingDays: summary.remainingDays,
      notification: summary.notification,
      activatedLicense: summary.activatedLicense,
      ...override,
    });
    state.centralSync = {
      ...(state.centralSync || {}),
      lastSyncedAt: new Date(),
      lastHeartbeatAt: new Date(),
      lastError: null,
      lastRemoteStatus: "ok",
    };
    await state.save();
  } catch (error) {
    state.centralSync = {
      ...(state.centralSync || {}),
      lastError: error.message,
      lastRemoteStatus: "failed",
    };
    await state.save();
  }
};

exports.getLicenseStatus = async (_req, res) => {
  try {
    const summary = await buildStatusResponse();
    registerCentralHeartbeat().catch(() => {});
    return res.json(summary);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to fetch license status" });
  }
};

exports.requestLicense = async (req, res) => {
  try {
    const state = await getOrCreateLicenseState();
    const email = normalizeEmail(req.body.email);
    const companyName = String(req.body.companyName || "").trim();
    const phone = String(req.body.phone || "").trim();
    const message = String(req.body.message || "").trim();
    const installationId = state.installationId;
    const databaseLabel = state.databaseLabel || getDatabaseLabel();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Valid customer email is required" });
    }

    const licenseRequest = await LicenseRequest.create({
      email,
      companyName,
      phone,
      message,
      installationId,
      databaseLabel,
    });

    state.lastLicenseRequest = {
      email,
      companyName,
      phone,
      message,
      installationId,
      databaseLabel,
      requestedAt: new Date(),
    };
    await state.save();

    const ownerRecipient = ownerEmail();
    if (ownerRecipient) {
      await sendEmail({
        to: ownerRecipient,
        subject: `Tiles POS license request from ${email}`,
        text: [
          "A new license request has been received.",
          `Customer email: ${email}`,
          `Company name: ${companyName || "-"}`,
          `Phone: ${phone || "-"}`,
          `Installation ID: ${installationId}`,
          `Database label: ${databaseLabel || "-"}`,
          `Message: ${message || "-"}`,
          `Request id: ${licenseRequest._id}`,
        ].join("\n"),
      });
    }

    registerCentralHeartbeat({
      requestEmail: email,
      companyName,
      phone,
      message,
    }).catch(() => {});

    return res.json({
      message: ownerRecipient
        ? "License request sent to company owner"
        : "License request saved. Configure owner email to send mail notifications.",
      smtpConfigured,
      installationId,
      databaseLabel,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to request license" });
  }
};

exports.activateLicense = async (req, res) => {
  try {
    const state = await getOrCreateLicenseState();
    const email = normalizeEmail(req.body.email);
    const licenseKey = String(req.body.licenseKey || "").trim();

    if (!email || !licenseKey) {
      return res.status(400).json({ error: "Email and license key are required" });
    }

    const payload = verifyLicenseKey({ email, licenseKey, installationId: state.installationId });

    state.activatedLicense = {
      licenseId: payload.licenseId,
      customerId: payload.customerId,
      installationId: payload.installationId,
      email,
      customerName: payload.customerName || "",
      companyName: payload.companyName || "",
      databaseLabel: payload.databaseLabel || state.databaseLabel,
      months: payload.months,
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt,
      activatedAt: new Date(),
      lastVerifiedAt: new Date(),
      licenseKeyHash: getLicenseHash(licenseKey),
      keyPreview: getLicensePreview(licenseKey),
    };

    await state.save();

    await LicenseIssue.findOneAndUpdate(
      { licenseId: payload.licenseId },
      {
        $set: {
          customerId: payload.customerId,
          installationId: payload.installationId,
          companyName: payload.companyName || "",
          databaseLabel: payload.databaseLabel || state.databaseLabel,
          lastValidatedAt: new Date(),
          lastActivatedAt: new Date(),
        },
      }
    );

    registerCentralHeartbeat({
      activatedLicense: state.activatedLicense,
    }).catch(() => {});

    return res.json({
      message: "License activated successfully",
      licenseStatus: summarizeLicenseState(state),
    });
  } catch (err) {
    return res.status(400).json({ error: err.message || "Failed to activate license" });
  }
};

exports.generateLicense = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const customerName = String(req.body.customerName || "").trim();
    const companyName = String(req.body.companyName || "").trim();
    const installationId = String(req.body.installationId || "").trim();
    const databaseLabel = String(req.body.databaseLabel || "").trim();
    const months = Number(req.body.months);
    const sendToCustomer = Boolean(req.body.sendToCustomer);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Valid customer email is required" });
    }

    if (!installationId) {
      return res.status(400).json({ error: "Installation ID is required" });
    }

    if (!Number.isInteger(months) || months <= 0) {
      return res.status(400).json({ error: "Months must be a positive whole number" });
    }

    const { licenseKey, payload } = generateLicenseKey({
      email,
      months,
      customerName,
      installationId,
      companyName,
      databaseLabel,
    });

    let customerEmailDelivery = { delivered: false, skipped: false };
    if (sendToCustomer) {
      customerEmailDelivery = await sendEmail({
        to: email,
        subject: "Your Tiles POS license key",
        text: [
          `Hello${customerName ? ` ${customerName}` : ""},`,
          "",
          "Your Tiles POS license has been generated.",
          `Email: ${email}`,
          `Installation ID: ${installationId}`,
          `Plan validity: ${months} month(s)`,
          `Expires on: ${new Date(payload.expiresAt).toLocaleString("en-IN")}`,
          "",
          "License key:",
          licenseKey,
          "",
          "Open the software license page and activate using this email and license key on the same installation.",
        ].join("\n"),
      });
    }

    await LicenseIssue.create({
      licenseId: payload.licenseId,
      customerId: payload.customerId,
      installationId,
      email,
      customerName,
      companyName,
      databaseLabel,
      months,
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt,
      issuedByUserId: req.user?._id || null,
      issuedByName: req.user?.name || "",
      keyPreview: getLicensePreview(licenseKey),
      emailSentToCustomer: Boolean(customerEmailDelivery.delivered),
      generatedFromRequestEmail: normalizeEmail(req.body.generatedFromRequestEmail || ""),
    });

    return res.json({
      message:
        sendToCustomer && customerEmailDelivery.delivered
          ? "License generated and emailed"
          : sendToCustomer && customerEmailDelivery.skipped
            ? "License generated. SMTP is not configured, so the email was not sent."
            : "License generated successfully",
      license: {
        licenseKey,
        licenseId: payload.licenseId,
        customerId: payload.customerId,
        installationId: payload.installationId,
        email,
        customerName,
        companyName,
        databaseLabel,
        months,
        issuedAt: payload.issuedAt,
        expiresAt: payload.expiresAt,
      },
      smtpConfigured,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to generate license" });
  }
};

exports.provisionClientSetup = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const customerName = String(req.body.customerName || "").trim();
    const companyName = String(req.body.companyName || "").trim();
    const installationId = String(req.body.installationId || "").trim() || generateInstallationId();
    const databaseLabel = String(req.body.databaseLabel || "").trim() || companyName || adminPhone;
    const months = Number(req.body.months);
    const phone = String(req.body.phone || "").trim();
    const adminName = String(req.body.adminName || "").trim();
    const adminPhone = String(req.body.adminPhone || "").trim();
    const adminPassword = String(req.body.adminPassword || "").trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Valid customer email is required" });
    }
    if (!adminName || !adminPhone || adminPhone.length !== 10 || !adminPassword || adminPassword.length < 6) {
      return res.status(400).json({ error: "Valid admin name, 10-digit admin phone, and password are required" });
    }
    if (!Number.isInteger(months) || months <= 0) {
      return res.status(400).json({ error: "Months must be a positive whole number" });
    }

    const { licenseKey, payload } = generateLicenseKey({
      email,
      months,
      customerName,
      installationId,
      companyName,
      databaseLabel,
    });

    await LicenseIssue.findOneAndUpdate(
      { licenseId: payload.licenseId },
      {
        $set: {
          customerId: payload.customerId,
          installationId,
          email,
          customerName,
          companyName,
          databaseLabel,
          months,
          issuedAt: payload.issuedAt,
          expiresAt: payload.expiresAt,
          issuedByUserId: req.user?._id || null,
          issuedByName: req.user?.name || "",
          keyPreview: getLicensePreview(licenseKey),
        },
      },
      { upsert: true, new: true }
    );

    const provisionId = crypto.randomBytes(10).toString("hex");
    await ClientProvision.findOneAndUpdate(
      { installationId },
      {
        $set: {
          provisionId,
          customerId: payload.customerId,
          licenseId: payload.licenseId,
          installationId,
          databaseLabel,
          email,
          customerName,
          companyName,
          phone,
          adminName,
          adminPhone,
          adminPasswordHash: hashValue(adminPassword),
          months,
          expiresAt: payload.expiresAt,
          status: "provisioned",
          issuedByUserId: req.user?._id || null,
          issuedByName: req.user?.name || "",
        },
      },
      { upsert: true, new: true }
    );

    const setupPackagePayload = {
      provisionId,
      customerId: payload.customerId,
      licenseId: payload.licenseId,
      installationId,
      databaseLabel,
      email,
      customerName,
      companyName,
      phone,
      admin: {
        name: adminName,
        phone: adminPhone,
        password: adminPassword,
        role: "admin",
      },
      licenseKey,
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt,
      generatedBy: req.user?.name || "",
    };

    const setupPackage = createProvisionPackage(setupPackagePayload);

    return res.json({
      message: "Client setup package generated",
      setupPackage,
      preview: setupPackagePayload,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to provision client setup" });
  }
};

exports.bootstrapProvisionedSetup = async (req, res) => {
  try {
    const setupPackage = String(req.body.setupPackage || "").trim();
    if (!setupPackage) {
      return res.status(400).json({ error: "Setup package is required" });
    }

    const packagePayload = verifyProvisionPackage(setupPackage);
    const state = await getOrCreateLicenseState();
    const requestedInstallationId = String(packagePayload.installationId || "").trim();
    const canAdoptProvisionInstallationId = !state.activatedLicense?.licenseId;

    if (canAdoptProvisionInstallationId && requestedInstallationId && state.installationId !== requestedInstallationId) {
      state.installationId = requestedInstallationId;
    }

    if (state.installationId !== requestedInstallationId) {
      return res.status(400).json({ error: "This setup package is not for this installation" });
    }

    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      return res.status(400).json({ error: "Setup import is allowed only before creating local users" });
    }

    verifyLicenseKey({
      email: packagePayload.email,
      licenseKey: packagePayload.licenseKey,
      installationId: state.installationId,
    });

    const user = await User.create({
      name: packagePayload.admin?.name,
      phone: String(packagePayload.admin?.phone || "").replace(/\D/g, "").slice(0, 10),
      password: packagePayload.admin?.password,
      role: "admin",
    });

    state.databaseLabel = packagePayload.databaseLabel || state.databaseLabel;
    state.activatedLicense = {
      licenseId: packagePayload.licenseId,
      customerId: packagePayload.customerId,
      installationId: packagePayload.installationId,
      email: packagePayload.email,
      customerName: packagePayload.customerName || "",
      companyName: packagePayload.companyName || "",
      databaseLabel: packagePayload.databaseLabel || state.databaseLabel,
      months: null,
      issuedAt: packagePayload.issuedAt,
      expiresAt: packagePayload.expiresAt,
      activatedAt: new Date(),
      lastVerifiedAt: new Date(),
      licenseKeyHash: getLicenseHash(packagePayload.licenseKey),
      keyPreview: getLicensePreview(packagePayload.licenseKey),
    };
    await state.save();

    await ClientProvision.findOneAndUpdate(
      { provisionId: packagePayload.provisionId },
      { $set: { status: "imported", importedAt: new Date() } }
    ).catch(() => {});

    registerCentralHeartbeat({
      activatedLicense: state.activatedLicense,
      companyName: packagePayload.companyName || "",
      phone: packagePayload.phone || "",
    }).catch(() => {});

    return res.json({
      message: "Setup imported successfully. Client admin is ready to log in.",
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      licenseStatus: summarizeLicenseState(state),
    });
  } catch (err) {
    return res.status(400).json({ error: err.message || "Failed to import setup package" });
  }
};

exports.getAdminLicenseDashboard = async (_req, res) => {
  try {
    const now = new Date();
    const warningCutoff = new Date(now);
    warningCutoff.setDate(warningCutoff.getDate() + EXPIRY_WARNING_DAYS);

    const [status, requests, issues, expiringSoon, installations, provisions] = await Promise.all([
      buildStatusResponse(),
      LicenseRequest.find().sort({ createdAt: -1 }).limit(20),
      LicenseIssue.find().sort({ createdAt: -1 }).limit(20),
      LicenseIssue.find({
        status: "active",
        expiresAt: { $gte: now, $lte: warningCutoff },
      }).sort({ expiresAt: 1 }).limit(20),
      ShopInstallation.find().sort({ lastSeenAt: -1 }).limit(20),
      ClientProvision.find().sort({ createdAt: -1 }).limit(20),
    ]);

    return res.json({
      status,
      requests,
      issues,
      expiringSoon,
      installations,
      provisions,
      smtpConfigured,
      ownerEmail: ownerEmail(),
      centralSyncConfigured: isCentralSyncConfigured(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to fetch license dashboard" });
  }
};

const validateHubRequest = (req, res) => {
  if (!centralSyncHeaderValue() || req.headers[ORG_SYNC_HEADER] !== centralSyncHeaderValue()) {
    res.status(401).json({ error: "Invalid central sync token" });
    return false;
  }
  return true;
};

exports.hubHeartbeat = async (req, res) => {
  try {
    if (!validateHubRequest(req, res)) return;

    const installationId = String(req.body.installationId || "").trim();
    if (!installationId) {
      return res.status(400).json({ error: "Installation ID is required" });
    }

    const activatedLicense = req.body.activatedLicense || {};
    const installation = await ShopInstallation.findOneAndUpdate(
      { installationId },
      {
        $set: {
          installationId,
          databaseLabel: String(req.body.databaseLabel || "").trim(),
          email: normalizeEmail(activatedLicense.email || req.body.requestEmail || ""),
          customerName: String(activatedLicense.customerName || "").trim(),
          companyName: String(activatedLicense.companyName || req.body.companyName || "").trim(),
          phone: String(req.body.phone || "").trim(),
          customerId: String(activatedLicense.customerId || "").trim(),
          licenseId: String(activatedLicense.licenseId || "").trim(),
          licenseStatus: String(req.body.licenseStatus || "trial").trim(),
          trialEndsAt: req.body.trialEndsAt || null,
          licenseExpiresAt: activatedLicense.expiresAt || null,
          lastHeartbeatAt: new Date(),
          lastSeenAt: new Date(),
          lastKnownIp: req.ip,
        },
      },
      { upsert: true, new: true }
    );

    return res.json({
      message: "Heartbeat synced",
      installationId: installation.installationId,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to sync heartbeat" });
  }
};
