const Customer = require("../models/Customer");

// ✅ CREATE or UPDATE CUSTOMER (called from invoice flow)
exports.createOrUpdateCustomer = async (req, res) => {
  try {
    const { name, phone, address, district, state, pincode, amount, status, method } = req.body;

    if (!name) return res.status(400).json({ error: "Customer name is required" });

    let customer = await Customer.findOne({ name });

    if (customer) {
      // Update details in case they changed
      customer.phone = phone || customer.phone;
      customer.address = address || customer.address;
      customer.district = district || customer.district;
      customer.state = state || customer.state;
      customer.pincode = pincode || customer.pincode;

      customer.totalSpent += amount || 0;
      customer.lastPurchase = new Date();
      customer.status = status;
      customer.method = method;

      await customer.save();
    } else {
      customer = await Customer.create({
        name,
        phone: phone || "",
        address: address || "",
        district: district || "",
        state: state || "",
        pincode: pincode || "",
        totalSpent: amount || 0,
        lastPurchase: new Date(),
        status,
        method,
      });
    }

    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GET ALL
exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};