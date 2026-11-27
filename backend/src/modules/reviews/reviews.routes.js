const express = require("express");
const { body, param, query } = require("express-validator");
const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");
const validate = require("../../middleware/validate");
const controller = require("./reviews.controller");

const router = express.Router();

// Public GET reviews (supports ?target_type=PRODUCT|SERVICE&product_id=1&lang=en|ur)
router.get(
  "/",
  query("target_type")
    .optional()
    .isIn(["PRODUCT", "SERVICE"])
    .withMessage("target_type must be PRODUCT or SERVICE."),
  query("product_id").optional().isInt({ min: 1 }).toInt(),
  query("booking_id").optional().isInt({ min: 1 }).toInt(),
  query("lang")
    .optional()
    .isIn(["en", "ur"])
    .withMessage("lang must be en or ur."),
  validate,
  controller.getReviews
);

// Authenticated customer submits a review -> triggers BERT sentiment analysis
router.post(
  "/",
  authenticate,
  body("target_type")
    .isIn(["PRODUCT", "SERVICE"])
    .withMessage("target_type must be PRODUCT or SERVICE."),
  body("product_id").optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body("booking_id").optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5.")
    .toInt(),
  body("comment")
    .isString()
    .trim()
    .isLength({ min: 3, max: 2000 })
    .withMessage("Comment must be between 3 and 2000 characters."),
  validate,
  controller.submitReview
);

// Owner/Admin aggregated BERT sentiment insights
router.get(
  "/insights",
  authenticate,
  authorize("reviews.insights"),
  controller.getInsights
);

// Owner/Admin flag inappropriate review
router.patch(
  "/:id/flag",
  authenticate,
  authorize("reviews.moderate"),
  param("id").isInt({ min: 1 }).toInt(),
  body("reason")
    .isString()
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage("Flag reason is required."),
  validate,
  controller.moderateReview
);

module.exports = router;