const express = require("express");
const router = express.Router();
const {
  createInvoice,
  getAllInvoices,
  deleteInvoice,
  updateInvoice,
  finalizeInvoiceStock,
} = require("../controllers/invoiceController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// All routes require login
router.post("/", protect, createInvoice);
router.get("/", protect, getAllInvoices);
router.post("/:id/finalize-stock", protect, finalizeInvoiceStock);

// ✅ Admin only — staff cannot edit or delete invoices
router.put("/:id", protect, adminOnly, updateInvoice);
router.delete("/:id", protect, adminOnly, deleteInvoice);

module.exports = router;


