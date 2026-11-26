const { body, param } = require("express-validator");

const serviceIdValidation = [
  param("id").isInt({ min: 1, max: 2147483647 }).withMessage("Valid service ID is required"),
];

const serviceBodyValidation = [
  body("name")
    .isString()
    .withMessage("Service name is required")
    .trim()
    .notEmpty()
    .withMessage("Service name cannot be empty")
    .isLength({ max: 150 })
    .withMessage("Service name cannot exceed 150 characters"),
  body("description")
    .optional({ nullable: true })
    .isString()
    .withMessage("Description must be text"),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be 0 or greater"),
  body("duration")
    .isInt({ min: 1 })
    .withMessage("Duration must be a positive integer in minutes"),
];

module.exports = {
  serviceIdValidation,
  serviceBodyValidation,
};