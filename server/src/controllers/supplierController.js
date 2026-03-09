const Supplier = require("../models/Supplier");
const Purchase = require("../models/Purchase");

const calcTotalValue = (items) =>
  items.reduce((sum, it) => sum + Number(it.qty) * Number(it.price), 0);
const normalizeProductsSupplied = (value) => {
  const arr = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  return [...new Set(
    arr
      .map((item) => String(item || "").trim())
      .filter(Boolean)
  )];
};
const normalizeTextList = (value) => {
  const arr = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  return [...new Set(
    arr
      .map((item) => String(item || "").trim())
      .filter(Boolean)
  )];
};
const normalizeCategories = (value) => normalizeProductsSupplied(value);
const normalizeProductNames = (value) => normalizeTextList(value);

// ── CREATE ───────────────────────────────────────────────────
exports.createSupplier = async (req, res) => {
  try {
    const {
      // Company
      name, companyName, companyEmail, companyWebsite,
      companyPhone, phone, altPhone, designation, licNo, gstin,
      // Contact
      supplierName, supplierPhone,
      // Address
      address, companyAddress, pincode, state, city,
      // Products & Category
      productsSupplied, categories, productNames, productName, brands,
      // GST & Tax
      panNumber, stateCode, registrationType,
      // Payment & Credit
      paymentTerms, creditLimit, discountPct, freight,
      // Bank
      accountNo, ifscCode, upiId, accountHolder, bankName, branch, accountType,
      // Rating & Notes
      rating, priority, internalNotes,
    } = req.body;

    const resolvedName         = companyName    || name;
    const resolvedCompanyPhone = companyPhone   || phone;
    const resolvedAddress      = companyAddress || address;

    if (!resolvedName)
      return res.status(400).json({ error: "Company / Supplier Name is required" });
    if (!resolvedCompanyPhone)
      return res.status(400).json({ error: "Primary Mobile is required" });
    if (!resolvedAddress)
      return res.status(400).json({ error: "Full Address is required" });

    const normalizedCategories = normalizeCategories(
      categories !== undefined ? categories : productsSupplied
    );
    const normalizedProductNames = normalizeProductNames(
      productNames !== undefined ? productNames : productName
    );

    const supplier = await Supplier.create({
      // backward compat
      name:           resolvedName,
      phone:          resolvedCompanyPhone,
      address:        resolvedAddress,
      // company
      companyName:    resolvedName,
      companyEmail:   companyEmail    || "",
      companyWebsite: companyWebsite  || "",
      companyPhone:   resolvedCompanyPhone,
      altPhone:       altPhone        || "",
      designation:    designation     || "",
      licNo:          licNo           || "",
      gstin:          gstin           || "",
      // contact
      supplierName:   supplierName    || resolvedName,
      supplierPhone:  supplierPhone   || "",
      // address
      companyAddress: resolvedAddress,
      pincode:        pincode         || "",
      state:          state           || "",
      city:           city            || "",
      // products
      productsSupplied: normalizedCategories,
      categories:       normalizedCategories,
      productNames:     normalizedProductNames,
      brands:           normalizeTextList(brands).join(", "),
      // tax
      panNumber:        panNumber        || "",
      stateCode:        stateCode        || "",
      registrationType: registrationType || "Regular (GST)",
      // payment terms
      paymentTerms:  paymentTerms     || "Net 30 Days",
      creditLimit:   Number(creditLimit) || 0,
      discountPct:   Number(discountPct) || 0,
      freight:       freight          || "Supplier Pays (Free Delivery)",
      // bank
      bankName:      bankName         || "",
      accountNo:     accountNo        || "",
      ifscCode:      ifscCode         || "",
      accountHolder: accountHolder    || "",
      branch:        branch           || "",
      accountType:   accountType      || "Current Account",
      upiId:         upiId            || "",
      // rating
      rating:        rating           || "⭐⭐⭐⭐⭐ Excellent",
      priority:      priority         || "Primary Supplier",
      internalNotes: internalNotes    || "",
      // payment defaults
      items:         [],
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

// ── GET ALL — enriched with live purchase totals ─────────────
exports.getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ createdAt: -1 });

    // Aggregate purchase totals per supplier from Purchase collection
    const purchaseSummary = await Purchase.aggregate([
      {
        $match: { isDraft: { $ne: true } },
      },
      {
        $group: {
          _id:           "$supplierId",
          totalValue:    { $sum: "$grandTotal"  },
          totalPaid:     { $sum: "$totalPaid"   },
          totalDue:      { $sum: "$totalDue"    },
          purchaseCount: { $sum: 1 },
        },
      },
    ]);

    const summaryMap = {};
    purchaseSummary.forEach((p) => { summaryMap[p._id.toString()] = p; });

    const enriched = suppliers.map((s) => {
      const obj     = s.toObject();
      obj.categories = normalizeCategories(
        Array.isArray(obj.categories) && obj.categories.length > 0
          ? obj.categories
          : obj.productsSupplied
      );
      obj.productsSupplied = obj.categories;
      obj.productNames = normalizeProductNames(
        Array.isArray(obj.productNames) && obj.productNames.length > 0
          ? obj.productNames
          : (Array.isArray(obj.items) ? obj.items.map((item) => item?.name) : [])
      );

      // Sanitize: if supplierPhone duplicates companyPhone (old data bug), clear it
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
    obj.categories = normalizeCategories(
      Array.isArray(obj.categories) && obj.categories.length > 0
        ? obj.categories
        : obj.productsSupplied
    );
    obj.productsSupplied = obj.categories;
    obj.productNames = normalizeProductNames(
      Array.isArray(obj.productNames) && obj.productNames.length > 0
        ? obj.productNames
        : (Array.isArray(obj.items) ? obj.items.map((item) => item?.name) : [])
    );
    // Sanitize duplicate phone on the fly
    if (obj.supplierPhone && (obj.supplierPhone === obj.companyPhone || obj.supplierPhone === obj.phone)) {
      obj.supplierPhone = "";
    }

    // Also enrich with live purchase totals
    const purchases = await Purchase.find({ supplierId: req.params.id, isDraft: { $ne: true } });
    const totalValue = purchases.reduce((s, p) => s + (p.grandTotal  || 0), 0);
    const totalPaid  = purchases.reduce((s, p) => s + (p.totalPaid   || 0), 0);
    const totalDue   = purchases.reduce((s, p) => s + (p.totalDue    || 0), 0);

    obj.totalValue    = totalValue;
    obj.totalPaid     = totalPaid;
    obj.totalDue      = totalDue;
    obj.purchaseCount = purchases.length;
    if (totalDue <= 0 && totalValue > 0) obj.paymentStatus = "Paid";
    else if (totalPaid > 0)              obj.paymentStatus = "Partial";
    else                                 obj.paymentStatus = "Pending";

    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── UPDATE ───────────────────────────────────────────────────
exports.updateSupplier = async (req, res) => {
  try {
    const body = { ...req.body };

    // Sync backward-compat fields
    if (!body.name && body.companyName)       body.name    = body.companyName;
    if (!body.phone && body.companyPhone)     body.phone   = body.companyPhone;
    if (!body.address && body.companyAddress) body.address = body.companyAddress;

    // Ensure categories and productNames are normalized arrays
    if (body.categories === undefined && body.productsSupplied !== undefined) {
      body.categories = body.productsSupplied;
    }
    if (body.productNames === undefined && body.productName !== undefined) {
      body.productNames = body.productName;
    }
    if (body.categories !== undefined) {
      body.categories = normalizeCategories(body.categories);
      body.productsSupplied = body.categories;
    }
    if (body.productsSupplied !== undefined) {
      body.productsSupplied = normalizeCategories(body.productsSupplied);
      if (body.categories === undefined) body.categories = body.productsSupplied;
    }
    if (body.productNames !== undefined) {
      body.productNames = normalizeProductNames(body.productNames);
    }
    if (body.brands !== undefined) {
      body.brands = normalizeTextList(body.brands).join(", ");
    }

    // Convert numeric strings
    if (body.creditLimit !== undefined) body.creditLimit = Number(body.creditLimit) || 0;
    if (body.discountPct !== undefined) body.discountPct = Number(body.discountPct) || 0;

    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      body,
      { new: true, runValidators: true }
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
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    res.json({ message: "Supplier deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── UPDATE PAYMENT (legacy endpoint — kept for backward compat) ──
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
