const { body } = require("express-validator");

const estimatePickupValidation = [
  body("latitude")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Valid latitude between -90 and 90 is required"),
  body("longitude")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Valid longitude between -180 and 180 is required"),
];

const createPickupValidation = [
  body("bookingId")
    .isInt({ min: 1, max: 2147483647 })
    .withMessage("Valid booking ID is required"),
  body("address")
    .isString()
    .withMessage("Pickup address is required")
    .trim()
    .notEmpty()
    .withMessage("Pickup address cannot be empty"),
  ...estimatePickupValidation,
];

module.exports = {
  estimatePickupValidation,
  createPickupValidation,
};