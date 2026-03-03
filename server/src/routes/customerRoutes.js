const express = require("express");
const router = express.Router();

const {
  createOrUpdateCustomer,
  getCustomers,
} = require("../controllers/customerController");

router.post("/", createOrUpdateCustomer);
router.get("/", getCustomers);

module.exports = router;