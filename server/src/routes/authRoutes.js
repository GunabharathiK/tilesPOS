const express = require("express");
const router = express.Router();
const {
  login,
  register,
  getMe,
  getUsers,
  updateUser,
  deleteUser,
  requestAdminForgotPasswordOtp,
  resetAdminPasswordWithOtp,
} = require("../controllers/authController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Public
router.post("/login", login);
router.post("/admin/forgot-password/request-otp", requestAdminForgotPasswordOtp);
router.post("/admin/forgot-password/reset", resetAdminPasswordWithOtp);

// Logged in user
router.get("/me", protect, getMe);

// Admin only
router.post("/register", protect, adminOnly, register);
router.get("/users", protect, adminOnly, getUsers);
router.put("/users/:id", protect, adminOnly, updateUser);
router.delete("/users/:id", protect, adminOnly, deleteUser);

module.exports = router;
