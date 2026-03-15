const Customer = require("../models/Customer");

// CREATE or UPDATE CUSTOMER (called from invoice flow)
exports.createOrUpdateCustomer = async (req, res) => {
  try {
    const {
      name,
      phone,
      alternateMobile,
      address,
      city,
      gstin,
      customerType,
      paymentTerms,
      dealerDetails,
      amount,
      status,
      method,
    } = req.body;

    if (!name) return res.status(400).json({ error: "Customer name is required" });

    let customer = await Customer.findOne({ name });

    if (customer) {
      // Update details in case they changed
      customer.phone = phone || customer.phone;
      customer.alternateMobile = alternateMobile || customer.alternateMobile;
      customer.address = address || customer.address;
      customer.city = city || customer.city;
      customer.gstin = gstin || customer.gstin;
      customer.customerType = customerType || customer.customerType;
      customer.paymentTerms = paymentTerms || customer.paymentTerms;
      customer.dealerDetails = dealerDetails || customer.dealerDetails;

      if (Number(amount) > 0) {
        customer.totalSpent += Number(amount);
        customer.lastPurchase = new Date();
      }
      customer.status = status || customer.status;
      customer.method = method !== undefined ? method : customer.method;

      await customer.save();
    } else {
      customer = await Customer.create({
        name,
        phone: phone || "",
        alternateMobile: alternateMobile || "",
        address: address || "",
        city: city || "",
        gstin: gstin || "",
        customerType: customerType || "Retail Customer",
        paymentTerms: paymentTerms || "Cash Only",
        dealerDetails: dealerDetails || {},
        totalSpent: Number(amount) || 0,
        lastPurchase: new Date(),
        status: status || "Pending",
        method: method || "",
      });
    }

    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET ALL
exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE BY ID
exports.updateCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body || {};
    const customer = await Customer.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE BY ID
exports.deleteCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByIdAndDelete(id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
