const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const mongoose = require("mongoose");

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const normalizeCustomerType = (value) => {
  if (value === "Dealer" || value === "Wholesale") return "Dealer";
  if (value === "Contractor" || value === "B2B") return "Contractor";
  if (value === "Builder / Project") return "Builder / Project";
  return "Retail Customer";
};

const getPriceByCustomerType = (product, customerType) => {
  const retail = Number(product?.price || 0);
  const dealer = Number(product?.dealerPrice || 0);
  const contractor = Number(product?.contractorPrice || 0);
  const minimum = Number(product?.minimumSellPrice || 0);

  if (customerType === "Dealer") return dealer > 0 ? dealer : retail;
  if (customerType === "Contractor") return contractor > 0 ? contractor : (dealer > 0 ? dealer : retail);
  if (customerType === "Builder / Project") {
    if (minimum > 0) return minimum;
    if (contractor > 0) return contractor;
    if (dealer > 0) return dealer;
    return retail;
  }
  return retail;
};

const buildInvoicePayload = async (body = {}) => {
  if (typeof body.customer === "string") {
    body.customer = { name: body.customer };
  }

  const customerType = normalizeCustomerType(
    body.customerType ||
    body.saleType ||
    body?.customer?.customerType ||
    body?.customer?.saleType
  );

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const productIds = rawItems
    .map((item) => item?.productId)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(id));

  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds } }).lean()
    : [];
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  const normalizedItems = rawItems.map((item) => {
    const product = productMap.get(String(item.productId || ""));
    const quantity = Number(item?.quantity) || 0;
    const boxes = Number(item?.boxes) || 0;
    const gst = Number(item?.gst) || 0;
    const discount = Number(item?.discount) || 0;
    const price = product ? getPriceByCustomerType(product, customerType) : (Number(item?.price) || 0);

    const base = quantity * price;
    const gstAmount = (base * gst) / 100;
    const discountAmount = (base * discount) / 100;
    const total = base + gstAmount - discountAmount;

    return {
      ...item,
      quantity: round2(quantity),
      boxes: round2(boxes),
      price: round2(price),
      gst,
      discount,
      gstAmount: round2(gstAmount),
      discountAmount: round2(discountAmount),
      total: round2(total),
    };
  });

  const itemSubTotal = round2(normalizedItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0));
  const itemDiscountTotal = round2(normalizedItems.reduce((sum, item) => sum + (Number(item.discountAmount) || 0), 0));
  const discountPercent = Number(body.discount) || 0;
  const discountPercentAmount = round2((itemSubTotal * discountPercent) / 100);
  const loadingCharge = round2(Number(body?.charges?.loading) || Number(body?.charges?.loadingCharge) || 0);
  const transportCharge = round2(Number(body?.charges?.transport) || 0);
  const extraDiscount = round2(Number(body?.charges?.extraDiscount) || 0);
  const customerTypeDiscount = round2(Number(body?.charges?.customerTypeDiscount) || 0);
  const customerTypeDiscountPct = Number(body?.charges?.customerTypeDiscountPct) || 0;
  const taxableBase = round2(
    Math.max(
      0,
      itemSubTotal - discountPercentAmount - extraDiscount - customerTypeDiscount + loadingCharge + transportCharge
    )
  );
  const tax = Number(body.tax) || 0;
  const taxAmount = round2((taxableBase * tax) / 100);
  const totalAmount = round2(taxableBase + taxAmount);

  const rawPaidAmount = Number(body?.payment?.paidAmount);
  const rawDueAmount = Number(body?.payment?.dueAmount);
  let paidAmount = 0;
  if (body.status === "Paid") {
    paidAmount = totalAmount;
  } else if (body.status === "Partial") {
    if (Number.isFinite(rawPaidAmount) && rawPaidAmount > 0) {
      paidAmount = Math.min(rawPaidAmount, totalAmount);
    } else if (Number.isFinite(rawDueAmount) && rawDueAmount >= 0) {
      paidAmount = Math.max(0, totalAmount - rawDueAmount);
    }
  }
  paidAmount = round2(paidAmount);
  const dueAmount = round2(Math.max(0, totalAmount - paidAmount));

  const reduceStockNow = body?.reduceStockNow !== false;

  return {
    ...body,
    customer: {
      ...(body.customer || {}),
      customerType,
      saleType: customerType,
    },
    customerType,
    saleType: customerType,
    items: normalizedItems,
    taxAmount,
    discountAmount: round2(itemDiscountTotal + discountPercentAmount + extraDiscount + customerTypeDiscount),
    charges: {
      ...(body.charges || {}),
      loading: loadingCharge,
      transport: transportCharge,
      extraDiscount,
      customerTypeDiscount,
      customerTypeDiscountPct,
    },
    payment: {
      ...(body.payment || {}),
      amount: totalAmount,
      paidAmount,
      dueAmount,
      paymentType: body?.payment?.paymentType || "",
    },
    stockReduced: reduceStockNow,
  };
};

// CREATE - optionally reduce stock immediately
exports.createInvoice = async (req, res) => {
  try {
    const body = await buildInvoicePayload(req.body);
    const invoice = await Invoice.create(body);

    if (body.stockReduced) {
      for (const item of body.items || []) {
        if (item.productId) {
          const qty = Number(item.quantity) || 0;
          await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { stock: -qty } },
            { new: true }
          );
        }
      }
    }

    res.status(201).json(invoice);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    const existing = await Invoice.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Invoice not found" });

    const isFullUpdate = Array.isArray(req.body?.items) || !!req.body?.customer || !!req.body?.invoiceNo || !!req.body?.documentType;
    if (!isFullUpdate) {
      return exports.updateInvoiceStatus(req, res);
    }

    if (existing.stockReduced !== false) {
      for (const item of existing.items || []) {
        if (item.productId) {
          const qty = Number(item.quantity) || 0;
          await Product.findByIdAndUpdate(item.productId, { $inc: { stock: qty } });
        }
      }
    }

    const nextBody = await buildInvoicePayload({
      ...existing.toObject(),
      ...req.body,
    });

    Object.assign(existing, nextBody);
    await existing.save();

    if (existing.stockReduced) {
      for (const item of existing.items || []) {
        if (item.productId) {
          const qty = Number(item.quantity) || 0;
          await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -qty } });
        }
      }
    }

    res.json(existing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET ALL
exports.getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE - restore stock only if it was reduced earlier
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    if (invoice.stockReduced !== false) {
      for (const item of invoice.items || []) {
        if (item.productId) {
          const qty = Number(item.quantity) || 0;
          await Product.findByIdAndUpdate(
            item.productId,
            { $inc: { stock: qty } }
          );
        }
      }
    }

    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Finalize stock reduction (used by Create Bill Done action)
exports.finalizeInvoiceStock = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    if (invoice.stockReduced !== false) {
      return res.json(invoice);
    }

    for (const item of invoice.items || []) {
      if (item.productId) {
        const qty = Number(item.quantity) || 0;
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: -qty } },
          { new: true }
        );
      }
    }

    invoice.stockReduced = true;
    await invoice.save();
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE STATUS
exports.updateInvoiceStatus = async (req, res) => {
  try {
    const { status, payment } = req.body;
    const update = {};

    if (status) {
      update.status = status;
    }
    if (payment && typeof payment === "object") {
      update.payment = payment;
    }

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    );

    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
