const crypto = require("crypto");
const LicenseState = require("../models/LicenseState");

const TRIAL_DAYS = Number(process.env.LICENSE_TRIAL_DAYS || 30);
const EXPIRY_WARNING_DAYS = Number(process.env.LICENSE_EXPIRY_WARNING_DAYS || 10);

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const addMonths = (date, months) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const base64UrlEncode = (value) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const base64UrlDecode = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
};

const normalizeEmail = (value = "") => String(value).trim().toLowerCase();
const getLicenseSecret = () => process.env.LICENSE_SECRET || process.env.JWT_SECRET || "tiles-pos-license-secret";
const getDatabaseLabel = () => String(process.env.DATABASE_LABEL || process.env.SHOP_CODE || "").trim();
const generateInstallationId = () => `tiles-${crypto.randomBytes(6).toString("hex")}`;

const getLicenseHash = (licenseKey) =>
  crypto.createHash("sha256").update(String(licenseKey)).digest("hex");

const getLicensePreview = (licenseKey) => {
  const value = String(licenseKey || "");
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
};

const signLicensePayload = (encodedPayload) =>
  crypto.createHmac("sha256", getLicenseSecret()).update(encodedPayload).digest("hex");

const createSignedBlob = (payload) => {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signLicensePayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
};

const verifySignedBlob = (blob, invalidMessage = "Signed payload is invalid") => {
  const [encodedPayload, signature] = String(blob || "").split(".");
  if (!encodedPayload || !signature) {
    throw new Error(invalidMessage);
  }

  const expectedSignature = signLicensePayload(encodedPayload);
  if (expectedSignature !== signature) {
    throw new Error(invalidMessage);
  }

  try {
    return JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    throw new Error(invalidMessage);
  }
};

const getOrCreateLicenseState = async () => {
  let state = await LicenseState.findOne({ singletonKey: "primary" });

  if (!state) {
    const now = new Date();
    state = await LicenseState.create({
      singletonKey: "primary",
      installationId: generateInstallationId(),
      databaseLabel: getDatabaseLabel(),
      trialStartedAt: now,
      trialEndsAt: addDays(now, TRIAL_DAYS),
    });
  }

  if (!state.databaseLabel && getDatabaseLabel()) {
    state.databaseLabel = getDatabaseLabel();
    await state.save();
  }

  return state;
};

const getNotification = ({ status, remainingDays, trialEndsAt, licenseExpiresAt }) => {
  if (status === "licensed" && remainingDays <= EXPIRY_WARNING_DAYS) {
    return {
      level: remainingDays <= 3 ? "error" : "warning",
      message: `Licensed plan expires in ${remainingDays} day(s) on ${licenseExpiresAt.toLocaleDateString("en-IN")}.`,
    };
  }

  if (status === "trial" && remainingDays <= EXPIRY_WARNING_DAYS) {
    return {
      level: remainingDays <= 3 ? "error" : "warning",
      message: `Trial expires in ${remainingDays} day(s) on ${trialEndsAt.toLocaleDateString("en-IN")}.`,
    };
  }

  if (status === "expired") {
    return {
      level: "error",
      message: "License or trial has expired. Renew and activate to continue.",
    };
  }

  return {
    level: "info",
    message: status === "licensed" ? "License is active." : "Trial is active.",
  };
};

const summarizeLicenseState = (state) => {
  const now = new Date();
  const trialEndsAt = new Date(state.trialEndsAt);
  const activatedLicense = state.activatedLicense || {};
  const licenseExpiresAt = activatedLicense.expiresAt ? new Date(activatedLicense.expiresAt) : null;
  const hasActiveLicense = Boolean(licenseExpiresAt && licenseExpiresAt.getTime() >= now.getTime());

  let status = "expired";
  if (hasActiveLicense) status = "licensed";
  else if (trialEndsAt.getTime() >= now.getTime()) status = "trial";

  const msPerDay = 1000 * 60 * 60 * 24;
  const remainingMs = status === "licensed"
    ? licenseExpiresAt.getTime() - now.getTime()
    : trialEndsAt.getTime() - now.getTime();
  const remainingDays = Math.max(0, Math.ceil(remainingMs / msPerDay));
  const notification = getNotification({ status, remainingDays, trialEndsAt, licenseExpiresAt });

  return {
    installationId: state.installationId,
    databaseLabel: state.databaseLabel || getDatabaseLabel(),
    trialDays: TRIAL_DAYS,
    trialStartedAt: state.trialStartedAt,
    trialEndsAt: state.trialEndsAt,
    status,
    isActive: status === "licensed" || status === "trial",
    remainingDays,
    expiresSoon: remainingDays <= EXPIRY_WARNING_DAYS,
    notification,
    activatedLicense: hasActiveLicense
      ? {
          licenseId: activatedLicense.licenseId,
          customerId: activatedLicense.customerId,
          installationId: activatedLicense.installationId,
          email: activatedLicense.email,
          customerName: activatedLicense.customerName,
          companyName: activatedLicense.companyName,
          databaseLabel: activatedLicense.databaseLabel,
          months: activatedLicense.months,
          issuedAt: activatedLicense.issuedAt,
          expiresAt: activatedLicense.expiresAt,
          activatedAt: activatedLicense.activatedAt,
          lastVerifiedAt: activatedLicense.lastVerifiedAt,
          keyPreview: activatedLicense.keyPreview,
        }
      : null,
    lastLicenseRequest: state.lastLicenseRequest || null,
    centralSync: state.centralSync || null,
  };
};

const generateLicenseKey = ({ email, months, customerName = "", installationId, companyName = "", databaseLabel = "" }) => {
  const normalizedEmail = normalizeEmail(email);
  const issuedAt = new Date();
  const expiresAt = addMonths(issuedAt, Number(months));
  const payload = {
    v: 2,
    licenseId: crypto.randomBytes(10).toString("hex"),
    customerId: crypto.randomBytes(8).toString("hex"),
    installationId: String(installationId || "").trim(),
    email: normalizedEmail,
    customerName: String(customerName || "").trim(),
    companyName: String(companyName || "").trim(),
    databaseLabel: String(databaseLabel || "").trim(),
    months: Number(months),
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  return {
    licenseKey: createSignedBlob(payload),
    payload,
  };
};

const verifyLicenseKey = ({ licenseKey, email, installationId }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedInstallationId = String(installationId || "").trim();
  const [encodedPayload, signature] = String(licenseKey || "").split(".");

  if (!encodedPayload || !signature) {
    throw new Error("Invalid license key format");
  }

  const expectedSignature = signLicensePayload(encodedPayload);
  if (expectedSignature !== signature) {
    throw new Error("License key signature is invalid");
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    throw new Error("License key payload is invalid");
  }

  if (normalizeEmail(payload.email) !== normalizedEmail) {
    throw new Error("License email does not match");
  }

  if (String(payload.installationId || "").trim() !== normalizedInstallationId) {
    throw new Error("License is not issued for this installation");
  }

  if (!Number.isFinite(Number(payload.months)) || Number(payload.months) <= 0) {
    throw new Error("License duration is invalid");
  }

  if (!payload.expiresAt || new Date(payload.expiresAt).getTime() < Date.now()) {
    throw new Error("License key has expired");
  }

  return payload;
};

const createProvisionPackage = (payload) => createSignedBlob({ v: 1, ...payload });

const verifyProvisionPackage = (value) =>
  verifySignedBlob(value, "Provision package is invalid");

module.exports = {
  TRIAL_DAYS,
  EXPIRY_WARNING_DAYS,
  addMonths,
  generateLicenseKey,
  generateInstallationId,
  getDatabaseLabel,
  getLicenseHash,
  getLicensePreview,
  getOrCreateLicenseState,
  normalizeEmail,
  summarizeLicenseState,
  createProvisionPackage,
  verifyLicenseKey,
  verifyProvisionPackage,
};
