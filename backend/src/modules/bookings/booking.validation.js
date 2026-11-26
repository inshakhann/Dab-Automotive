const { body, param, query } = require("express-validator");

const bookingIdValidation = [
  param("id").isInt({ min: 1, max: 2147483647 }).withMessage("Valid booking ID is required"),
];

const availableSlotsValidation = [
  query("date")
    .isString()
    .notEmpty()
    .withMessage("Date is required")
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("Date must be in YYYY-MM-DD format"),
  query("packageId")
    .isInt({ min: 1, max: 2147483647 })
    .withMessage("Valid package ID is required"),
];

const createBookingValidation = [
  body("vehicleId")
    .isInt({ min: 1, max: 2147483647 })
    .withMessage("Valid vehicle ID is required"),
  body("packageId")
    .isInt({ min: 1, max: 2147483647 })
    .withMessage("Valid package ID is required"),
  body("startTime")
    .isISO8601()
    .withMessage("Valid ISO 8601 startTime is required"),
];

const updateBookingValidation = [
  ...bookingIdValidation,
  body("startTime")
    .isISO8601()
    .withMessage("Valid ISO 8601 startTime is required"),
];

module.exports = {
  bookingIdValidation,
  availableSlotsValidation,
  createBookingValidation,
  updateBookingValidation,
};