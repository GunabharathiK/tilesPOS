const express = require("express");
const router = express.Router();
const { login, register, getMe, getUsers, deleteUser } = require("../controllers/authController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Public
router.post("/login", login);

// Logged in user
router.get("/me", protect, getMe);

// Admin only
router.post("/register", protect, adminOnly, register);
router.get("/users", protect, adminOnly, getUsers);
router.delete("/users/:id", protect, adminOnly, deleteUser);

module.exports = router;