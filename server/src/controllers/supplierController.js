const Supplier = require("../models/Supplier");
const Purchase = require("../models/Purchase");

const calcTotalValue = (items) =>
  items.reduce((sum, it) => sum + Number(it.qty) * Number(it.price), 0);

// ── CREATE ───────────────────────────────────────────────────
exports.createSupplier = async (req, res) => {
  try {
    const {
      name, companyName, companyEmail, companyWebsite, licNo, gstin, companyPhone,
      supplierName, supplierPhone, phone,
      accountNo, ifscCode, upiId, accountHolder, bankName, branch,
      address, companyAddress, pincode, state, city,
    } = req.body;

    const resolvedName          = companyName    || name;
    const resolvedCompanyPhone  = companyPhone   || phone;
    const resolvedSupplierPhone = supplierPhone  || phone;
    const resolvedAddress       = companyAddress || address;

    if (!resolvedName || !resolvedCompanyPhone || !resolvedAddress)
      return res.status(400).json({ error: "Company name, phone and address are required" });

    const supplier = await Supplier.create({
      name: resolvedName, companyName: resolvedName,
      companyEmail:    companyEmail    || "",
      companyWebsite:  companyWebsite  || "",
      licNo:           licNo           || "",
      gstin:           gstin           || "",
      companyPhone:    resolvedCompanyPhone,
      supplierName:    supplierName    || resolvedName,
      supplierPhone:   resolvedSupplierPhone,
      phone:           resolvedCompanyPhone,
      accountNo:       accountNo       || "",
      ifscCode:        ifscCode        || "",
      upiId:           upiId           || "",
      accountHolder:   accountHolder   || "",
      bankName:        bankName        || "",
      branch:          branch          || "",
      address:         resolvedAddress,
      companyAddress:  resolvedAddress,
      pincode:         pincode         || "",
      state:           state           || "",
      city:            city            || "",
      items: [],
      // Payment summary fields kept for backward compat but computed dynamically
      totalValue:    0,
      totalPaid:     0,
      totalDue:      0,
      paymentStatus: "Pending",
    });

    res.status(201).json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET ALL — aggregates payment totals from Purchase collection ──
exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ createdAt: -1 });

    // Aggregate purchase totals per supplier
    const purchaseSummary = await Purchase.aggregate([
      {
        $group: {
          _id:         "$supplierId",
          totalValue:  { $sum: "$grandTotal"   },
          totalPaid:   { $sum: "$totalPaid"    },
          totalDue:    { $sum: "$totalDue"     },
          purchaseCount: { $sum: 1 },
        },
      },
    ]);

    const summaryMap = {};
    purchaseSummary.forEach((p) => { summaryMap[p._id.toString()] = p; });

    const enriched = suppliers.map((s) => {
      const obj     = s.toObject();

      // Sanitize: if supplierPhone is same as companyPhone (old bug), clear it
      // so the UI never shows duplicate phone numbers
      if (
        obj.supplierPhone &&
        (obj.supplierPhone === obj.companyPhone || obj.supplierPhone === obj.phone)
      ) {
        obj.supplierPhone = "";
      }

      const summary = summaryMap[s._id.toString()];
      if (summary) {
        obj.totalValue    = summary.totalValue;
        obj.totalPaid     = summary.totalPaid;
        obj.totalDue      = summary.totalDue;
        obj.purchaseCount = summary.purchaseCount;
        // Derive overall payment status
        if (summary.totalDue <= 0 && summary.totalValue > 0) obj.paymentStatus = "Paid";
        else if (summary.totalPaid > 0)                      obj.paymentStatus = "Partial";
        else                                                  obj.paymentStatus = "Pending";
      } else {
        obj.totalValue    = 0;
        obj.totalPaid     = 0;
        obj.totalDue      = 0;
        obj.purchaseCount = 0;
        obj.paymentStatus = "Pending";
      }
      return obj;
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET BY ID ────────────────────────────────────────────────
exports.getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    const obj = supplier.toObject();
    // Sanitize duplicate phone on the fly (old records)
    if (obj.supplierPhone && (obj.supplierPhone === obj.companyPhone || obj.supplierPhone === obj.phone)) {
      obj.supplierPhone = "";
    }
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── UPDATE ───────────────────────────────────────────────────
exports.updateSupplier = async (req, res) => {
  try {
    const body = req.body;
    // Sync backward-compat fields WITHOUT overwriting supplierPhone with companyPhone
    if (!body.name && body.companyName)       body.name    = body.companyName;
    if (!body.phone && body.companyPhone)     body.phone   = body.companyPhone;
    if (!body.address && body.companyAddress) body.address = body.companyAddress;
    // Always persist supplierPhone as-is from the form (never fall back to companyPhone)
    if (body.supplierPhone !== undefined)     body.supplierPhone = body.supplierPhone;

    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id, body, { new: true, runValidators: true }
    );
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── DELETE ───────────────────────────────────────────────────
exports.deleteSupplier = async (req, res) => {
  try {
    await Supplier.findByIdAndDelete(req.params.id);
    res.json({ message: "Supplier deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── UPDATE SUPPLIER PAYMENT (legacy — kept for backward compat) ──
exports.updateSupplierPayment = async (req, res) => {
  try {
    const { totalPaid, paymentStatus, paymentMode, paymentType } = req.body;
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });

    const paid       = Number(totalPaid) ?? supplier.totalPaid;
    const totalValue = supplier.totalValue || calcTotalValue(supplier.items);
    const due        = Math.max(0, totalValue - paid);

    let status = paymentStatus;
    if (!status) {
      if (paid >= totalValue && totalValue > 0) status = "Paid";
      else if (paid > 0)                        status = "Partial";
      else                                      status = "Pending";
    }

    supplier.totalPaid     = paid;
    supplier.totalDue      = due;
    supplier.totalValue    = totalValue;
    supplier.paymentStatus = status;
    if (paymentMode) supplier.paymentMode = paymentMode;
    if (paymentType) supplier.paymentType = paymentType;
    await supplier.save();
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};