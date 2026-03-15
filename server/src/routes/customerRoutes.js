const express = require("express");
const router = express.Router();

const {
  createOrUpdateCustomer,
  getCustomers,
  updateCustomerById,
  deleteCustomerById,
} = require("../controllers/customerController");

router.post("/", createOrUpdateCustomer);
router.get("/", getCustomers);
router.put("/:id", updateCustomerById);
router.delete("/:id", deleteCustomerById);

module.exports = router;
