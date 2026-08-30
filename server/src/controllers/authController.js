const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendOtpSms, OTP_EXPIRY_MINUTES } = require("../utils/smsService");
const { getOrCreateLicenseState, summarizeLicenseState } = require("../utils/licenseService");

const generateToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

const sanitizePhone = (value = "") => value.toString().replace(/\D/g, "").slice(0, 10);
const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");
const isOwnerRequestAllowed = (req) => req.user?.role === "owner";
let userIndexesChecked = false;

const ensureUserIndexes = async () => {
  if (userIndexesChecked) return;
  userIndexesChecked = true;
  try {
    const indexes = await User.collection.indexes();
    const hasLegacyEmailIndex = indexes.some((idx) => idx.name === "email_1");
    if (hasLegacyEmailIndex) {
      await User.collection.dropIndex("email_1");
    }
  } catch {
    // Ignore index-inspection failures; normal auth flow should continue.
  }
};

exports.register = async (req, res) => {
  try {
    await ensureUserIndexes();
    const { name, phone, password, role } = req.body;
    const normalizedPhone = sanitizePhone(phone);
    const normalizedRole = String(role || "staff").toLowerCase();

    if (!name?.trim() || !normalizedPhone || !password) {
      return res.status(400).json({ error: "Name, phone and password are required" });
    }

    if (normalizedPhone.length !== 10) {
      return res.status(400).json({ error: "Phone number must be 10 digits" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    if (!["owner", "admin", "staff"].includes(normalizedRole)) {
      return res.status(400).json({ error: "Role must be owner, admin or staff" });
    }

    if (normalizedRole === "owner" && !isOwnerRequestAllowed(req)) {
      return res.status(403).json({ error: "Only owner can create owner accounts" });
    }

    const exists = await User.findOne({ phone: normalizedPhone });
    if (exists) return res.status(400).json({ error: "Phone number already registered" });

    const user = await User.create({
      name: name.trim(),
      phone: normalizedPhone,
      password,
      role: normalizedRole,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      token: generateToken(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    await ensureUserIndexes();
    const normalizedPhone = sanitizePhone(req.body.phone);
    const { password } = req.body;

    if (!normalizedPhone || !password) {
      return res.status(400).json({ error: "Phone number and password are required" });
    }

    if (normalizedPhone.length !== 10) {
      return res.status(400).json({ error: "Phone number must be 10 digits" });
    }

    const user = await User.findOne({ phone: normalizedPhone });
    if (!user) return res.status(401).json({ error: "Invalid phone number or password" });

    const match = await user.matchPassword(password);
    if (!match) return res.status(401).json({ error: "Invalid phone number or password" });

    const licenseStatus =
      user.role === "owner"
        ? {
            status: "owner_bypass",
            isActive: true,
            notification: {
              level: "info",
              message: "Owner account bypasses local trial and license restrictions.",
            },
          }
        : summarizeLicenseState(await getOrCreateLicenseState());

    if (user.role !== "owner" && !licenseStatus.isActive) {
      return res.status(403).json({
        error: "Trial expired. Activate a license to continue.",
        licenseStatus,
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      token: generateToken(user),
      licenseStatus,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    await ensureUserIndexes();
    const user = await User.findById(req.user.id).select("-password");
    const licenseStatus =
      user.role === "owner"
        ? {
            status: "owner_bypass",
            isActive: true,
            notification: {
              level: "info",
              message: "Owner account bypasses local trial and license restrictions.",
            },
          }
        : summarizeLicenseState(await getOrCreateLicenseState());
    res.json({ ...user.toObject(), licenseStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    await ensureUserIndexes();
    const filter = req.user?.role === "owner" ? {} : { role: { $ne: "owner" } };
    const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    await ensureUserIndexes();

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const incomingRole = req.body.role;
    const role = incomingRole === undefined ? user.role : String(incomingRole).toLowerCase();
    if (!["owner", "admin", "staff"].includes(role)) {
      return res.status(400).json({ error: "Role must be owner, admin or staff" });
    }

    if (role === "owner" && !isOwnerRequestAllowed(req)) {
      return res.status(403).json({ error: "Only owner can assign owner role" });
    }

    if (user.role === "owner" && !isOwnerRequestAllowed(req)) {
      return res.status(403).json({ error: "Only owner can modify owner account" });
    }

    const normalizedPhone =
      req.body.phone === undefined ? user.phone : sanitizePhone(req.body.phone);
    if (!normalizedPhone || normalizedPhone.length !== 10) {
      return res.status(400).json({ error: "Phone number must be 10 digits" });
    }

    const name = req.body.name === undefined ? user.name : String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const existing = await User.findOne({ phone: normalizedPhone, _id: { $ne: user._id } });
    if (existing) {
      return res.status(400).json({ error: "Phone number already registered" });
    }

    const newPassword = String(req.body.password || "").trim();
    if (newPassword && newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    user.name = name;
    user.phone = normalizedPhone;
    user.role = role;
    if (newPassword) {
      user.password = newPassword;
    }

    await user.save();

    return res.json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await ensureUserIndexes();
    if (req.params.id === req.user.id.toString()) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role === "owner" && !isOwnerRequestAllowed(req)) {
      return res.status(403).json({ error: "Only owner can delete owner account" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.requestAdminForgotPasswordOtp = async (req, res) => {
  try {
    await ensureUserIndexes();
    const normalizedPhone = sanitizePhone(req.body.phone);

    if (!normalizedPhone || normalizedPhone.length !== 10) {
      return res.status(400).json({ error: "Valid admin phone number is required" });
    }

    const admin = await User.findOne({ phone: normalizedPhone, role: { $in: ["owner", "admin"] } });
    if (!admin) {
      return res.status(404).json({ error: "Admin account not found" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    admin.passwordResetOtpHash = hashOtp(otp);
    admin.passwordResetOtpExpires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await admin.save();

    await sendOtpSms({ phone: normalizedPhone, otp });

    return res.json({
      message: "OTP sent to admin mobile number",
      ...(process.env.NODE_ENV !== "production" ? { devOtp: otp } : {}),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to send OTP" });
  }
};

exports.resetAdminPasswordWithOtp = async (req, res) => {
  try {
    await ensureUserIndexes();
    const normalizedPhone = sanitizePhone(req.body.phone);
    const otp = String(req.body.otp || "").trim();
    const newPassword = String(req.body.newPassword || "");

    if (!normalizedPhone || normalizedPhone.length !== 10) {
      return res.status(400).json({ error: "Valid admin phone number is required" });
    }

    if (!otp || otp.length !== 6) {
      return res.status(400).json({ error: "6-digit OTP is required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    const admin = await User.findOne({ phone: normalizedPhone, role: { $in: ["owner", "admin"] } });
    if (!admin) {
      return res.status(404).json({ error: "Admin account not found" });
    }

    const expired =
      !admin.passwordResetOtpExpires ||
      new Date(admin.passwordResetOtpExpires).getTime() < Date.now();

    if (!admin.passwordResetOtpHash || expired) {
      return res.status(400).json({ error: "OTP expired. Please request a new OTP" });
    }

    if (admin.passwordResetOtpHash !== hashOtp(otp)) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    admin.password = newPassword;
    admin.passwordResetOtpHash = null;
    admin.passwordResetOtpExpires = null;
    await admin.save();

    return res.json({ message: "Admin password reset successful" });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to reset password" });
  }
};
