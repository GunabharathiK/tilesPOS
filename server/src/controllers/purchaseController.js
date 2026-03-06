const Purchase  = require("../models/Purchase");
const Supplier  = require("../models/Supplier");

// ── CREATE PURCHASE ──────────────────────────────────────────
// Each call always creates a NEW purchase record (never merges with previous)
exports.createPurchase = async (req, res) => {
  try {
    const {
      supplierId, supplierName,
      invoiceNo, invoiceDate,
      products, additionalCharges,
      subtotal, totalDiscount, totalGst, additionalTotal, grandTotal,
    } = req.body;

    if (!supplierId)       return res.status(400).json({ error: "supplierId is required" });
    if (!invoiceNo)        return res.status(400).json({ error: "invoiceNo is required" });
    if (!products?.length) return res.status(400).json({ error: "At least one product is required" });

    for (const p of products) {
      if (!p.name || !p.qty || !p.unit || !p.price)
        return res.status(400).json({ error: "Product name, qty, unit and price are required" });
    }

    // Verify supplier exists
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });

    const finalPayable = grandTotal; // no extra disc/gst yet at creation

    const purchase = await Purchase.create({
      supplierId,
      supplierName: supplierName || supplier.companyName || supplier.name,
      invoiceNo,
      invoiceDate:  invoiceDate || new Date(),
      products,
      additionalCharges: additionalCharges || [],
      subtotal:        Number(subtotal)        || 0,
      totalDiscount:   Number(totalDiscount)   || 0,
      totalGst:        Number(totalGst)        || 0,
      additionalTotal: Number(additionalTotal) || 0,
      grandTotal:      Number(grandTotal)      || 0,
      finalPayable,
      totalPaid:     0,
      totalDue:      Number(grandTotal) || 0,
      paymentStatus: "Pending",
    });

    // Also push items into Supplier.items array for the SupplierDetails view
    supplier.items.push(...products.map((p) => ({
      name:     p.name,
      colorDesign: p.colorDesign || "",
      size:     p.size     || "",
      qty:      p.qty,
      unit:     p.unit,
      price:    p.price,
      discount: p.discount || 0,
      gst:      p.gst      || 0,
      hsnCode:  p.hsnCode  || "",
      image:    p.image    || "",
    })));
    await supplier.save();

    res.status(201).json(purchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET PURCHASES ────────────────────────────────────────────
// Optional ?supplierId= filter. Returns most recent first.
exports.getPurchases = async (req, res) => {
  try {
    const filter = req.query.supplierId ? { supplierId: req.query.supplierId } : {};
    const purchases = await Purchase.find(filter).sort({ createdAt: -1 });
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── DELETE A PURCHASE ────────────────────────────────────────
exports.deletePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ error: "Purchase not found" });
    await Purchase.findByIdAndDelete(req.params.id);
    res.json({ message: "Purchase deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// PATCH /suppliers/purchase/:id/payment
// Only touches this one purchase record — never affects other purchases
exports.updatePurchasePayment = async (req, res) => {
  try {
    const {
      totalPaid, paymentStatus, paymentMode, paymentType,
      extraDiscountPct, extraDiscountAmt, extraGstPct, extraGstAmt, finalPayable,
    } = req.body;

    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ error: "Purchase not found" });

    const payable = Number(finalPayable) > 0 ? Number(finalPayable) : purchase.finalPayable || purchase.grandTotal;
    const paid    = Number(totalPaid) ?? purchase.totalPaid;
    const due     = Math.max(0, payable - paid);

    // Determine status
    let status = paymentStatus;
    if (!status) {
      if (paid >= payable && payable > 0) status = "Paid";
      else if (paid > 0)                  status = "Partial";
      else                                status = "Pending";
    }

    purchase.totalPaid      = paid;
    purchase.totalDue       = due;
    purchase.paymentStatus  = status;
    purchase.finalPayable   = payable;
    if (paymentMode)                           purchase.paymentMode      = paymentMode;
    if (paymentType)                           purchase.paymentType      = paymentType;
    if (extraDiscountPct !== undefined)        purchase.extraDiscountPct = Number(extraDiscountPct) || 0;
    if (extraDiscountAmt !== undefined)        purchase.extraDiscountAmt = Number(extraDiscountAmt) || 0;
    if (extraGstPct      !== undefined)        purchase.extraGstPct      = Number(extraGstPct)      || 0;
    if (extraGstAmt      !== undefined)        purchase.extraGstAmt      = Number(extraGstAmt)      || 0;

    await purchase.save();
    res.json(purchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
