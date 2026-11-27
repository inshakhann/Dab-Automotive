const express = require("express");
const customerController = require("./customer.controller");
const authenticate = require("../../middleware/authenticate");
const validate = require("../../middleware/validate");
const {
  createCustomerValidation,
  updateCustomerValidation,
} = require("./customer.validation");

const router = express.Router();

router.use(authenticate);

router.get("/me", customerController.getMyProfile);
router.post("/me", createCustomerValidation, validate, customerController.createMyProfile);
router.patch("/me", updateCustomerValidation, validate, customerController.updateMyProfile);

module.exports = router;