const Customer = require("../models/Customer");

// ✅ CREATE or UPDATE CUSTOMER (called from invoice flow)
exports.createOrUpdateCustomer = async (req, res) => {
  try {
    const {
      name,
      phone,
      address,
      accountNo,
      ifscCode,
      upiId,
      accountHolder,
      bankName,
      branch,
      amount,
      status,
      method,
    } = req.body;

    if (!name) return res.status(400).json({ error: "Customer name is required" });

    let customer = await Customer.findOne({ name });

    if (customer) {
      // Update details in case they changed
      customer.phone = phone || customer.phone;
      customer.address = address || customer.address;
      customer.accountNo = accountNo || customer.accountNo;
      customer.ifscCode = ifscCode || customer.ifscCode;
      customer.upiId = upiId || customer.upiId;
      customer.accountHolder = accountHolder || customer.accountHolder;
      customer.bankName = bankName || customer.bankName;
      customer.branch = branch || customer.branch;

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
        address: address || "",
        accountNo: accountNo || "",
        ifscCode: ifscCode || "",
        upiId: upiId || "",
        accountHolder: accountHolder || "",
        bankName: bankName || "",
        branch: branch || "",
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

// ✅ GET ALL
exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
