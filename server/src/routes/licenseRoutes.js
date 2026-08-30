const express = require("express");
const {
  activateLicense,
  bootstrapProvisionedSetup,
  generateLicense,
  getAdminLicenseDashboard,
  getLicenseStatus,
  hubHeartbeat,
  provisionClientSetup,
  requestLicense,
} = require("../controllers/licenseController");
const { protect, ownerOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/status", getLicenseStatus);
router.post("/request", requestLicense);
router.post("/activate", activateLicense);
router.post("/bootstrap/setup", bootstrapProvisionedSetup);
router.post("/hub/heartbeat", hubHeartbeat);

router.get("/admin/dashboard", protect, ownerOnly, getAdminLicenseDashboard);
router.post("/admin/generate", protect, ownerOnly, generateLicense);
router.post("/admin/provision", protect, ownerOnly, provisionClientSetup);

module.exports = router;
