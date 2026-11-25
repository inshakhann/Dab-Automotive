const { body } = require("express-validator");

function emailRule() {
  return body("email")
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
    .customSanitizer((value) => value.toLowerCase());
}

const forgotPasswordValidation = [
  emailRule(),
];

const resetPasswordValidation = [
  emailRule(),

  body("otp")
    .isString()
    .withMessage("OTP must be provided as text.")
    .bail()
    .trim()
    .matches(/^[0-9]{6}$/)
    .withMessage("OTP must contain exactly six digits."),

  body("new_password")
    .isString()
    .withMessage("New password is required.")
    .bail()
    .isLength({ min: 8 })
    .withMessage("Password must contain at least 8 characters.")
    .bail()
    .custom((value) => Buffer.byteLength(value, "utf8") <= 72)
    .withMessage("Password must not exceed 72 bytes."),

  body("confirm_password")
    .isString()
    .withMessage("Confirm password is required.")
    .bail()
    .custom((value, { req }) => value === req.body.new_password)
    .withMessage("Passwords do not match."),
];

module.exports = {
  forgotPasswordValidation,
  resetPasswordValidation,
};