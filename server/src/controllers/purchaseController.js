const Purchase = require("../models/Purchase");

/* ════════════════════════════════════════════════════════════
   CREATE  POST /suppliers/purchase
════════════════════════════════════════════════════════════ */
exports.createPurchase = async (req, res) => {
  try {
    const {
      /* supplier */
      supplierId, supplierName,
      /* GRN identifiers */
      grnNo, invoiceNo, invoiceDate, poRef,
      /* logistics */
      vehicleNo, ewayBill, lotNo, receivedBy,
      /* items */
      products, additionalCharges,
      /* financials */
      subtotal, freight, gstOption, gstPct, gstAmt,
      totalInvoiceAmount, grandTotal,
      /* quality & status */
      qualityStatus, paymentStatus, remarks, isDraft,
    } = req.body;

    /* ── Validations ── */
    if (!supplierId)
      return res.status(400).json({ error: "Supplier is required" });
    if (!invoiceNo)
      return res.status(400).json({ error: "Invoice No. is required" });
    if (!Array.isArray(products) || products.length === 0)
      return res.status(400).json({ error: "At least one product is required" });
    for (const p of products) {
      if (!p.name) return res.status(400).json({ error: "Each product must have a name" });
    }

    const normalizedProducts = products.map((p) => {
      const ordered = Number(p.ordered) || 0;
      const received = Number(p.received) || Number(p.qty) || 0;
      const sqft = Number(p.sqft) || 0;
      const price = Number(p.price) || Number(p.costRate) || 0;
      const lengthCm = Number(p.lengthCm) || 0;
      const widthCm = Number(p.widthCm) || 0;
      const piecesPerBox = Number(p.piecesPerBox) || Number(p.tilesPerBox) || 0;

      return {
        name:        p.name              || "",
        category:    p.category          || "",
        brand:       p.brand             || "",
        finish:      p.finish            || "",
        lengthCm,
        widthCm,
        piecesPerBox,
        tilesPerBox: piecesPerBox,
        size:        p.size              || "",
        ordered,
        received,
        diff:        Number.isFinite(Number(p.diff)) ? Number(p.diff) : ordered - received,
        sqft,
        price,
        qty:         received,
        unit:        p.unit              || "Box",
        colorDesign: p.colorDesign       || "",
        hsnCode:     p.hsnCode           || "",
        discount:    Number(p.discount)  || 0,
        gst:         Number(p.gst)       || 0,
        image:       p.image             || "",
      };
    });

    const derivedSubtotal =
      Number(subtotal) ||
      normalizedProducts.reduce((sum, product) => sum + (product.sqft * product.price), 0);

    const total =
      Number(grandTotal) ||
      Number(totalInvoiceAmount) ||
      (derivedSubtotal + (Number(gstAmt) || 0) + (Number(freight) || 0));

    const purchase = await Purchase.create({
      /* supplier */
      supplierId,
      supplierName:      supplierName  || "",
      /* GRN identifiers */
      grnNo:             grnNo         || "",
      invoiceNo,
      invoiceDate:       invoiceDate   || "",
      poRef:             poRef         || "",
      /* logistics */
      vehicleNo:         vehicleNo     || "",
      ewayBill:          ewayBill      || "",
      lotNo:             lotNo         || "",
      receivedBy:        receivedBy    || "",
      /* items — sanitise every field */
      products: normalizedProducts,
      additionalCharges: Array.isArray(additionalCharges) ? additionalCharges : [],
      /* financials */
      subtotal:           derivedSubtotal,
      freight:            Number(freight)    || 0,
      gstOption:          gstOption          || "",
      gstPct:             Number(gstPct)     || 0,
      gstAmt:             Number(gstAmt)     || 0,
      totalInvoiceAmount: total,
      grandTotal:         total,
      finalPayable:       total,
      totalPaid:          0,
      totalDue:           total,
      /* quality & status */
      paymentStatus: isDraft ? "Draft" : (paymentStatus || "Pending"),
      qualityStatus: qualityStatus || "✅ All OK",
      remarks:       remarks       || "",
      isDraft:       !!isDraft,
    });

    res.status(201).json(purchase);
  } catch (err) {
    console.error("createPurchase error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ════════════════════════════════════════════════════════════
   GET ALL  GET /suppliers/purchase[?supplierId=xxx]
════════════════════════════════════════════════════════════ */
exports.getPurchases = async (req, res) => {
  try {
    const filter = {};
    if (req.query.supplierId) filter.supplierId = req.query.supplierId;

    const purchases = await Purchase
      .find(filter)
      .sort({ createdAt: -1 })
      .populate("supplierId", "companyName name city state companyPhone gstin bankName accountNo ifscCode");

    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ════════════════════════════════════════════════════════════
   GET ONE  GET /suppliers/purchase/:id
════════════════════════════════════════════════════════════ */
exports.getPurchaseById = async (req, res) => {
  try {
    const purchase = await Purchase
      .findById(req.params.id)
      .populate("supplierId", "companyName name city state companyPhone gstin bankName accountNo ifscCode accountHolder branch");

    if (!purchase) return res.status(404).json({ error: "Purchase not found" });
    res.json(purchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ════════════════════════════════════════════════════════════
   UPDATE  PUT /suppliers/purchase/:id
════════════════════════════════════════════════════════════ */
exports.updatePurchase = async (req, res) => {
  try {
    const {
      supplierId,
      supplierName,
      grnNo,
      invoiceNo,
      invoiceDate,
      poRef,
      vehicleNo,
      ewayBill,
      lotNo,
      receivedBy,
      products,
      additionalCharges,
      subtotal,
      freight,
      gstOption,
      gstPct,
      gstAmt,
      totalInvoiceAmount,
      grandTotal,
      qualityStatus,
      paymentStatus,
      remarks,
      isDraft,
    } = req.body;

    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ error: "Purchase not found" });

    if (!supplierId) return res.status(400).json({ error: "Supplier is required" });
    if (!invoiceNo) return res.status(400).json({ error: "Invoice No. is required" });
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "At least one product is required" });
    }

    const normalizedProducts = products.map((p) => {
      const ordered = Number(p.ordered) || 0;
      const received = Number(p.received) || Number(p.qty) || 0;
      const sqft = Number(p.sqft) || 0;
      const price = Number(p.price) || Number(p.costRate) || 0;
      const lengthCm = Number(p.lengthCm) || 0;
      const widthCm = Number(p.widthCm) || 0;
      const piecesPerBox = Number(p.piecesPerBox) || Number(p.tilesPerBox) || 0;

      return {
        name: p.name || "",
        category: p.category || "",
        brand: p.brand || "",
        finish: p.finish || "",
        lengthCm,
        widthCm,
        piecesPerBox,
        tilesPerBox: piecesPerBox,
        size: p.size || "",
        ordered,
        received,
        diff: Number.isFinite(Number(p.diff)) ? Number(p.diff) : ordered - received,
        sqft,
        price,
        qty: received,
        unit: p.unit || "Box",
        colorDesign: p.colorDesign || "",
        hsnCode: p.hsnCode || "",
        discount: Number(p.discount) || 0,
        gst: Number(p.gst) || 0,
        image: p.image || "",
      };
    });

    const derivedSubtotal =
      Number(subtotal) ||
      normalizedProducts.reduce((sum, product) => sum + (product.sqft * product.price), 0);

    const total =
      Number(grandTotal) ||
      Number(totalInvoiceAmount) ||
      (derivedSubtotal + (Number(gstAmt) || 0) + (Number(freight) || 0));

    purchase.supplierId = supplierId;
    purchase.supplierName = supplierName || "";
    purchase.grnNo = grnNo || purchase.grnNo || "";
    purchase.invoiceNo = invoiceNo;
    purchase.invoiceDate = invoiceDate || "";
    purchase.poRef = poRef || "";
    purchase.vehicleNo = vehicleNo || "";
    purchase.ewayBill = ewayBill || "";
    purchase.lotNo = lotNo || "";
    purchase.receivedBy = receivedBy || "";
    purchase.products = normalizedProducts;
    purchase.additionalCharges = Array.isArray(additionalCharges) ? additionalCharges : [];
    purchase.subtotal = derivedSubtotal;
    purchase.freight = Number(freight) || 0;
    purchase.gstOption = gstOption || "";
    purchase.gstPct = Number(gstPct) || 0;
    purchase.gstAmt = Number(gstAmt) || 0;
    purchase.totalInvoiceAmount = total;
    purchase.grandTotal = total;
    purchase.finalPayable = total;
    purchase.totalDue = Math.max(0, total - (Number(purchase.totalPaid) || 0));
    purchase.paymentStatus =
      isDraft ? "Draft" : ((Number(purchase.totalPaid) || 0) >= total && total > 0
        ? "Paid"
        : (Number(purchase.totalPaid) || 0) > 0
          ? "Partial"
          : (paymentStatus || "Pending"));
    purchase.qualityStatus = qualityStatus || "All OK";
    purchase.remarks = remarks || "";
    purchase.isDraft = !!isDraft;

    await purchase.save();
    res.json(purchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ════════════════════════════════════════════════════════════
   UPDATE PAYMENT  PATCH /suppliers/purchase/:id/payment
════════════════════════════════════════════════════════════ */
exports.updatePurchasePayment = async (req, res) => {
  try {
    const {
      totalPaid,
      paymentMode,
      paymentType,
      paymentDate,
      referenceNo,
      remarks,
      extraDiscountPct,
      extraDiscountAmt,
      extraGstPct,
      extraGstAmt,
      finalPayable,
    } = req.body;

    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ error: "Purchase not found" });

    const payable = Number(finalPayable) || purchase.grandTotal || 0;
    const previousPaid = Number(purchase.totalPaid) || 0;
    const paid = totalPaid === undefined ? previousPaid : (Number(totalPaid) || 0);
    const due     = Math.max(0, payable - paid);
    const paidNow = Math.max(0, paid - previousPaid);

    /* Derive payment status */
    let status;
    if (paid >= payable && payable > 0) status = "Paid";
    else if (paid > 0)                  status = "Partial";
    else                                status = "Pending";

    purchase.totalPaid     = paid;
    purchase.totalDue      = due;
    purchase.finalPayable  = payable;
    purchase.paymentStatus = status;
    purchase.isDraft       = false;

    if (paymentMode        !== undefined) purchase.paymentMode     = paymentMode;
    if (paymentType        !== undefined) purchase.paymentType     = paymentType;
    if (paymentDate        !== undefined) purchase.lastPaymentDate = paymentDate || "";
    if (referenceNo        !== undefined) purchase.lastReferenceNo = referenceNo || "";
    if (extraDiscountPct   !== undefined) purchase.extraDiscountPct = Number(extraDiscountPct) || 0;
    if (extraDiscountAmt   !== undefined) purchase.extraDiscountAmt = Number(extraDiscountAmt) || 0;
    if (extraGstPct        !== undefined) purchase.extraGstPct      = Number(extraGstPct)      || 0;
    if (extraGstAmt        !== undefined) purchase.extraGstAmt      = Number(extraGstAmt)      || 0;
    if (paidNow > 0) {
      purchase.paymentHistory.push({
        amount: paidNow,
        paymentDate: paymentDate || "",
        paymentMode: paymentMode || purchase.paymentMode || "",
        referenceNo: referenceNo || "",
        remarks: remarks || "",
      });
    }

    await purchase.save();
    res.json(purchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ════════════════════════════════════════════════════════════
   DELETE  DELETE /suppliers/purchase/:id
════════════════════════════════════════════════════════════ */
exports.deletePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findByIdAndDelete(req.params.id);
    if (!purchase) return res.status(404).json({ error: "Purchase not found" });
    res.json({ message: "Purchase deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
