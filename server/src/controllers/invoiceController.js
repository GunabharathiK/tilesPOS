const Invoice = require("../models/Invoice");
const Product = require("../models/Product");

// ✅ CREATE — reduces stock automatically
exports.createInvoice = async (req, res) => {
  try {
    const body = req.body;

    // Support old string format — convert to object if needed
    if (typeof body.customer === "string") {
      body.customer = { name: body.customer };
    }

    const invoice = await Invoice.create(body);

    // ✅ Reduce stock for each item that has a productId
    for (const item of body.items || []) {
      if (item.productId) {
        const qty = Number(item.quantity) || 0;
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: -qty } },   // decrement stock
          { new: true }
        );
      }
    }

    res.status(201).json(invoice);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET ALL
exports.getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ DELETE — restores stock
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    // ✅ Restore stock for each item
    for (const item of invoice.items || []) {
      if (item.productId) {
        const qty = Number(item.quantity) || 0;
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: qty } }   // add back
        );
      }
    }

    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ UPDATE STATUS
exports.updateInvoiceStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};