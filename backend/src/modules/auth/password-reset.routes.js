const express = require("express");
const { rateLimit } = require("express-rate-limit");

const validate = require("../../middleware/validate");

const {
  forgotPassword,
  resetPassword,
} = require("./password-reset.controller");

const {
  forgotPasswordValidation,
  resetPasswordValidation,
} = require("./password-reset.validation");

const router = express.Router();

function createLimiter(limit, message) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      success: false,
      message,
    },
  });
}

const forgotLimiter = createLimiter(
  10,
  "Too many password-reset requests. Please try again later."
);

const resetLimiter = createLimiter(
  20,
  "Too many reset attempts. Please try again later."
);

router.post(
  "/forgot-password",
  forgotLimiter,
  forgotPasswordValidation,
  validate,
  forgotPassword
);

router.post(
  "/reset-password",
  resetLimiter,
  resetPasswordValidation,
  validate,
  resetPassword
);

module.exports = router;