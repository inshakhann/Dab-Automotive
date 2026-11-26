const express = require("express");

const { profileValidation } = require("./profile.validation");

const { body, param, query } = require("express-validator");

const { statusValidation } = require("./user-status.validation");

const roleValidation = require("./user-role.validation");
const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");
const validate = require("../../middleware/validate");

const controller = require("./users.controller");

const router = express.Router();

// Every route in this file requires a valid login.
router.use(authenticate);

// Preserve the existing profile endpoint.
router.get("/me", (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
});

router.put("/me", profileValidation, validate, controller.updateMyProfile);

router.get(
  "/",
  authorize("users.read"),

  query("page")
    .default("1")
    .isString()
    .bail()
    .isInt({ min: 1, max: 1000000 })
    .withMessage("Page must be a positive integer.")
    .bail()
    .toInt(),

  query("limit")
    .default("20")
    .isString()
    .bail()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100.")
    .bail()
    .toInt(),

  query("status")
    .optional()
    .isString()
    .bail()
    .isIn(["active", "pending", "inactive", "rejected"])
    .withMessage("Invalid account status."),

  validate,
  controller.listUsers,
);

router.put(
  "/:id/staff-decision",
  authorize("users.review_staff"),

  param("id")
    .isInt({ min: 1, max: 2147483647 })
    .withMessage("A valid user ID is required.")
    .bail()
    .toInt(),

  body("decision")
    .isString()
    .bail()
    .isIn(["approve", "reject"])
    .withMessage("Decision must be approve or reject."),

  validate,
  controller.reviewStaff,
);

router.put(
  "/:id/status",
  authorize("users.change_status"),
  statusValidation,
  validate,
  controller.changeUserStatus,
);

router.put(
  "/:id/role",
  authorize("users.change_role"),
  roleValidation,
  validate,
  controller.changeUserRole,
);
router.use("/", require("./admin-users.routes"));

module.exports = router;
