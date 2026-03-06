const Product = require("../models/Product");
const Supplier = require("../models/Supplier");
const mongoose = require("mongoose");

// CREATE
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ ALL
exports.getProducts = async (req, res) => {
  const products = await Product.find().sort({ createdAt: 1 }).lean();

  // Backfill image at response-time for older supplier products that were saved without image.
  const normalizeSupplierId = (sid) => {
    if (!sid) return "";
    const val = typeof sid === "string" ? sid : sid.toString?.() || "";
    if (!val || val === "[object Object]") return "";
    return mongoose.Types.ObjectId.isValid(val) ? val : "";
  };
  const needsImage = products.filter(
    (p) => p?.isSupplierItem && !p?.image && normalizeSupplierId(p?.supplierId)
  );
  if (needsImage.length) {
    const supplierIds = [...new Set(needsImage.map((p) => normalizeSupplierId(p.supplierId)))]
      .filter(Boolean);
    const suppliers = await Supplier.find({ _id: { $in: supplierIds } })
      .select("_id items")
      .lean();
    const supplierMap = Object.fromEntries(suppliers.map((s) => [s._id.toString(), s]));

    products.forEach((p) => {
      const supplierId = normalizeSupplierId(p?.supplierId);
      if (!p?.isSupplierItem || p?.image || !supplierId) return;
      const sup = supplierMap[supplierId];
      if (!sup?.items?.length) return;

      const exact = sup.items.find(
        (it) =>
          it?.image &&
          it?.name === p?.name &&
          (!p?.colorDesign || it?.colorDesign === p?.colorDesign) &&
          (!p?.size || it?.size === p?.size)
      );
      const byName = sup.items.find((it) => it?.image && it?.name === p?.name);
      if (exact?.image || byName?.image) p.image = exact?.image || byName?.image;
    });
  }

  res.json(products);
};

// UPDATE
exports.updateProduct = async (req, res) => {
  const updated = await Product.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(updated);
};

// DELETE
exports.deleteProduct = async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted successfully" });
};
