const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendOtpSms, OTP_EXPIRY_MINUTES } = require("../utils/smsService");

// ✅ Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const sanitizePhone = (value = "") => value.toString().replace(/\D/g, "").slice(0, 10);
const hashOtp = (otp) => crypto.createHash("sha256").update(String(otp)).digest("hex");
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

// ✅ REGISTER (admin only should call this, or use seed script)
exports.register = async (req, res) => {
  try {
    await ensureUserIndexes();
    const { name, phone, password, role } = req.body;
    const normalizedPhone = sanitizePhone(phone);

    if (!name?.trim() || !normalizedPhone || !password) {
      return res.status(400).json({ error: "Name, phone and password are required" });
    }

    if (normalizedPhone.length !== 10) {
      return res.status(400).json({ error: "Phone number must be 10 digits" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    if (role && !["admin", "staff"].includes(String(role).toLowerCase())) {
      return res.status(400).json({ error: "Role must be admin or staff" });
    }

    const exists = await User.findOne({ phone: normalizedPhone });
    if (exists) return res.status(400).json({ error: "Phone number already registered" });

    const user = await User.create({
      name: name.trim(),
      phone: normalizedPhone,
      password,
      role: String(role || "staff").toLowerCase(),
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

// ✅ LOGIN
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
    console.log(user)
    if (!user) return res.status(401).json({ error: "Invalid phone number or password" });

    const match = await user.matchPassword(password);
    if (!match) return res.status(401).json({ error: "Invalid phone number or password" });

    res.json({
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

// ✅ GET current user (me)
exports.getMe = async (req, res) => {
  try {
    await ensureUserIndexes();
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET all users — admin only
exports.getUsers = async (req, res) => {
  try {
    await ensureUserIndexes();
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ UPDATE user — admin only
exports.updateUser = async (req, res) => {
  try {
    await ensureUserIndexes();

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const incomingRole = req.body.role;
    const role = incomingRole === undefined ? user.role : String(incomingRole).toLowerCase();
    if (!["admin", "staff"].includes(role)) {
      return res.status(400).json({ error: "Role must be admin or staff" });
    }

    const normalizedPhone =
      req.body.phone === undefined ? user.phone : sanitizePhone(req.body.phone);
    if (!normalizedPhone || normalizedPhone.length !== 10) {
      return res.status(400).json({ error: "Phone number must be 10 digits" });
    }

    const name =
      req.body.name === undefined ? user.name : String(req.body.name || "").trim();
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

// ✅ DELETE user — admin only
exports.deleteUser = async (req, res) => {
  try {
    await ensureUserIndexes();
    if (req.params.id === req.user.id.toString()) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin-only forgot password: request OTP by SMS
exports.requestAdminForgotPasswordOtp = async (req, res) => {
  try {
    await ensureUserIndexes();
    const normalizedPhone = sanitizePhone(req.body.phone);

    if (!normalizedPhone || normalizedPhone.length !== 10) {
      return res.status(400).json({ error: "Valid admin phone number is required" });
    }

    const admin = await User.findOne({ phone: normalizedPhone, role: "admin" });
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

// Admin-only forgot password: verify OTP and reset password
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

    const admin = await User.findOne({ phone: normalizedPhone, role: "admin" });
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
