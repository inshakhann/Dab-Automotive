const { body, param } = require("express-validator");

const packageIdValidation = [
  param("id").isInt({ min: 1, max: 2147483647 }).withMessage("Valid package ID is required"),
];

const createPackageValidation = [
  body("name")
    .isString()
    .withMessage("Package name is required")
    .trim()
    .notEmpty()
    .withMessage("Package name cannot be empty")
    .isLength({ max: 150 })
    .withMessage("Package name cannot exceed 150 characters"),
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
  body("serviceIds")
    .isArray({ min: 1 })
    .withMessage("At least one service ID is required"),
  body("serviceIds.*")
    .isInt({ min: 1, max: 2147483647 })
    .withMessage("Each service ID must be a positive integer"),
];

module.exports = {
  packageIdValidation,
  createPackageValidation,
};