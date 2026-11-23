const express = require("express");
const { rateLimit } = require("express-rate-limit");

const { register } = require("./auth.controller");
const { registerValidation } = require("./auth.validation");
const validate = require("../../middleware/validate");

const router = express.Router();

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many registration requests. Please try again later.",
  },
});

router.post(
  "/register",
  registerLimiter,
  registerValidation,
  validate,
  register
);

module.exports = router;