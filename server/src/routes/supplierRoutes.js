const express = require("express");
const router = express.Router();
const {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  updateSupplierPayment,
} = require("../controllers/supplierController");
const {
  createPurchase,
  getPurchases,
  updatePurchase,
  updatePurchasePayment,
  deletePurchase,
} = require("../controllers/purchaseController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// ── Purchase routes FIRST — must come before /:id routes ────
// If these are after /:id, Express treats "purchase" as an :id param
router.post("/purchase",              protect,            createPurchase);
router.get("/purchase",               protect,            getPurchases);
router.put("/purchase/:id",           protect, adminOnly, updatePurchase);
router.patch("/purchase/:id/payment", protect, adminOnly, updatePurchasePayment);
router.delete("/purchase/:id",        protect, adminOnly, deletePurchase);

// ── Supplier CRUD ────────────────────────────────────────────
router.post("/",             protect,            createSupplier);
router.get("/",              protect,            getSuppliers);
router.get("/:id",           protect,            getSupplierById);
router.put("/:id",           protect, adminOnly, updateSupplier);
router.delete("/:id",        protect, adminOnly, deleteSupplier);
router.patch("/:id/payment", protect, adminOnly, updateSupplierPayment);

module.exports = router;
