const Product = require("../models/Product");
const Supplier = require("../models/Supplier");
const mongoose = require("mongoose");

const num = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const str = (value) => (typeof value === "string" ? value.trim() : "");

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const sanitizeProductPayload = (body = {}, existing = null) => {
  const price = num(body.price, existing?.price || 0);
  const gst = num(body.gst, existing?.gst || 0);
  const coverageArea = num(body.coverageArea, existing?.coverageArea || 0);

  let stock = body.stock !== undefined ? num(body.stock, 0) : num(existing?.stock, 0);
  let stockBoxes = body.stockBoxes !== undefined ? num(body.stockBoxes, 0) : num(existing?.stockBoxes, 0);

  if (coverageArea > 0) {
    if (body.stock !== undefined && body.stockBoxes === undefined) {
      stockBoxes = round2(stock / coverageArea);
    } else if (body.stockBoxes !== undefined && body.stock === undefined) {
      stock = round2(stockBoxes * coverageArea);
    }
  }

  const lengthCm = body.lengthCm !== undefined ? num(body.lengthCm, 0) : num(existing?.lengthCm, 0);
  const widthCm = body.widthCm !== undefined ? num(body.widthCm, 0) : num(existing?.widthCm, 0);
  const size = str(body.size) || (lengthCm > 0 && widthCm > 0 ? `${lengthCm}x${widthCm}` : str(existing?.size));

  const reorderLevel = body.reorderLevel !== undefined ? num(body.reorderLevel, 0) : num(existing?.reorderLevel, 0);
  const minStockAlert = body.minStockAlert !== undefined
    ? num(body.minStockAlert, reorderLevel || existing?.minStockAlert || 10)
    : (reorderLevel || num(existing?.minStockAlert, 10));

  const payload = {
    ...body,
    name: str(body.name) || str(existing?.name),
    code: (str(body.code) || str(existing?.code)).toUpperCase(),
    barcode: body.barcode !== undefined ? str(body.barcode) : str(existing?.barcode),
    category: body.category !== undefined ? str(body.category) : str(existing?.category),
    brand: body.brand !== undefined ? str(body.brand) : str(existing?.brand),
    finish: body.finish !== undefined ? str(body.finish) : str(existing?.finish),
    colorDesign: body.colorDesign !== undefined ? str(body.colorDesign) : str(existing?.colorDesign),
    rackLocation: body.rackLocation !== undefined ? str(body.rackLocation) : str(existing?.rackLocation),
    notes: body.notes !== undefined ? str(body.notes) : str(existing?.notes),
    hsnCode: body.hsnCode !== undefined ? str(body.hsnCode) : str(existing?.hsnCode),
    uom: body.uom !== undefined ? str(body.uom) : (str(existing?.uom) || "sqrft"),
    price: round2(price),
    dealerPrice: round2(body.dealerPrice !== undefined ? num(body.dealerPrice, 0) : num(existing?.dealerPrice, 0)),
    contractorPrice: round2(body.contractorPrice !== undefined ? num(body.contractorPrice, 0) : num(existing?.contractorPrice, 0)),
    purchasePrice: round2(body.purchasePrice !== undefined ? num(body.purchasePrice, 0) : num(existing?.purchasePrice, 0)),
    minimumSellPrice: round2(body.minimumSellPrice !== undefined ? num(body.minimumSellPrice, 0) : num(existing?.minimumSellPrice, 0)),
    mrpPerBox: round2(body.mrpPerBox !== undefined ? num(body.mrpPerBox, 0) : num(existing?.mrpPerBox, 0)),
    totalPrice: round2(price * (1 + gst / 100)),
    stock: round2(stock),
    stockBoxes: round2(stockBoxes),
    lengthCm,
    widthCm,
    size,
    tilesPerBox: body.tilesPerBox !== undefined ? num(body.tilesPerBox, 0) : num(existing?.tilesPerBox, 0),
    coverageArea: round2(coverageArea),
    reorderLevel: round2(reorderLevel),
    minStockAlert: round2(minStockAlert),
    gst: round2(gst),
  };

  return payload;
};

// CREATE
exports.createProduct = async (req, res) => {
  try {
    const payload = sanitizeProductPayload(req.body);

    if (!payload.name) return res.status(400).json({ error: "Product name is required" });
    if (!payload.code) return res.status(400).json({ error: "Product code is required" });

    const product = await Product.create(payload);
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
  const existing = await Product.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Product not found" });

  const payload = sanitizeProductPayload(req.body, existing);

  const updated = await Product.findByIdAndUpdate(
    req.params.id,
    payload,
    { new: true, runValidators: true }
  );
  res.json(updated);
};

// DELETE
exports.deleteProduct = async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted successfully" });
};
