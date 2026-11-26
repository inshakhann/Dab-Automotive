const { body } = require("express-validator");

const createCustomerValidation = [
  body("address")
    .optional({ nullable: true })
    .isString()
    .withMessage("Address must be text")
    .trim()
    .isLength({ max: 500 })
    .withMessage("Address cannot exceed 500 characters"),
  body("city")
    .optional({ nullable: true })
    .isString()
    .withMessage("City must be text")
    .trim()
    .isLength({ max: 100 })
    .withMessage("City cannot exceed 100 characters"),
];

const updateCustomerValidation = [
  body("address")
    .optional({ nullable: true })
    .isString()
    .withMessage("Address must be text")
    .trim()
    .isLength({ max: 500 })
    .withMessage("Address cannot exceed 500 characters"),
  body("city")
    .optional({ nullable: true })
    .isString()
    .withMessage("City must be text")
    .trim()
    .isLength({ max: 100 })
    .withMessage("City cannot exceed 100 characters"),
];

module.exports = {
  createCustomerValidation,
  updateCustomerValidation,
};