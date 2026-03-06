const Invoice = require("../models/Invoice");
const Product = require("../models/Product");

// CREATE - optionally reduce stock immediately
exports.createInvoice = async (req, res) => {
  try {
    const body = req.body;

    if (typeof body.customer === "string") {
      body.customer = { name: body.customer };
    }

    const totalAmount = Number(body?.payment?.amount || 0);
    const paidAmount = Number(
      body?.payment?.paidAmount ??
      (body.status === "Paid"
        ? totalAmount
        : body.status === "Partial"
          ? Math.max(0, totalAmount - Number(body?.payment?.dueAmount || 0))
          : 0)
    );
    const dueAmount = Number(body?.payment?.dueAmount ?? Math.max(0, totalAmount - paidAmount));

    body.payment = {
      ...(body.payment || {}),
      amount: totalAmount,
      paidAmount,
      dueAmount,
      paymentType: body?.payment?.paymentType || "",
    };

    const reduceStockNow = body?.reduceStockNow !== false;
    body.stockReduced = reduceStockNow;

    const invoice = await Invoice.create(body);

    if (reduceStockNow) {
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
