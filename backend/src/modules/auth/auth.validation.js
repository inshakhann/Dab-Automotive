const { body } = require("express-validator");

const registerValidation = [
  body("full_name")
    .isString()
    .withMessage("Full name is required.")
    .bail()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must contain 2 to 100 characters."),

  body("email")
    .isString()
    .withMessage("Email is required.")
    .bail()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Email is too long.")
    .bail()
    .isEmail()
    .withMessage("Enter a valid email address.")
    .bail()
    .customSanitizer((value) => value.toLowerCase()),

  body("phone")
    .isString()
    .withMessage("Phone must be provided as text.")
    .bail()
    .trim()
    .matches(/^\+?[0-9 ()-]{7,30}$/)
    .withMessage("Enter a valid phone number."),

  body("password")
    .isString()
    .withMessage("Password is required.")
    .bail()
    .isLength({ min: 8 })
    .withMessage("Password must contain at least 8 characters.")
    .bail()
    .custom((value) => Buffer.byteLength(value, "utf8") <= 72)
    .withMessage("Password must not exceed 72 bytes."),

  body("role")
    .optional()
    .isString()
    .withMessage("Role must be text.")
    .bail()
    .isIn(["customer", "mechanic", "store_manager"])
    .withMessage("You can register as customer, mechanic, or store_manager."),
];

const loginValidation = [
  body("email")
    .isString()
    .withMessage("Email is required.")
    .bail()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Email is too long.")
    .bail()
    .isEmail()
    .withMessage("Enter a valid email address.")
    .bail()
    .customSanitizer((value) => value.toLowerCase()),

  body("password")
    .isString()
    .withMessage("Password is required.")
    .bail()
    .notEmpty()
    .withMessage("Password is required.")
    .bail()
    .custom((value) => Buffer.byteLength(value, "utf8") <= 72)
    .withMessage("Password must not exceed 72 bytes."),
];

module.exports = {
  registerValidation,
  loginValidation,
};
