const express = require("express");
const router = express.Router();

const { createBackupNow, exportBackup, restoreBackup } = require("../controllers/backupController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.post("/backup/create", protect, adminOnly, createBackupNow);
router.get("/backup/export", protect, adminOnly, exportBackup);
router.post("/backup/restore", protect, adminOnly, restoreBackup);

module.exports = router;
