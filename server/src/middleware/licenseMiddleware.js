const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getOrCreateLicenseState, summarizeLicenseState } = require("../utils/licenseService");

const resolveToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.split(" ")[1];
};

const isOwnerToken = async (req) => {
  try {
    const token = resolveToken(req);
    if (!token) return false;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("role");
    return user?.role === "owner";
  } catch {
    return false;
  }
};

exports.attachLicenseStatus = async (req, _res, next) => {
  try {
    const state = await getOrCreateLicenseState();
    req.licenseStatus = summarizeLicenseState(state);
    next();
  } catch (err) {
    next(err);
  }
};

exports.requireActiveLicense = async (req, res, next) => {
  try {
    if (await isOwnerToken(req)) {
      req.licenseStatus = {
        status: "owner_bypass",
        isActive: true,
        notification: {
          level: "info",
          message: "Owner account bypasses local trial and license restrictions.",
        },
      };
      return next();
    }

    const state = await getOrCreateLicenseState();
    const summary = summarizeLicenseState(state);
    req.licenseStatus = summary;

    if (!summary.isActive) {
      return res.status(403).json({
        error: "Trial expired. Activate a valid license to continue.",
        licenseStatus: summary,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};
