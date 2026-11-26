const { body } = require("express-validator");

const createBayValidation = [
  body("name")
    .isString()
    .withMessage("Bay name is required")
    .trim()
    .notEmpty()
    .withMessage("Bay name cannot be empty")
    .isLength({ max: 100 })
    .withMessage("Bay name cannot exceed 100 characters"),
  body("description")
    .optional({ nullable: true })
    .isString()
    .withMessage("Description must be text"),
];

module.exports = {
  createBayValidation,
};