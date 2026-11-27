const express = require("express");
const { param, query } = require("express-validator");
const authenticate = require("../../middleware/authenticate");
const validate = require("../../middleware/validate");
const controller = require("./notifications.controller");

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100.")
    .toInt(),
  validate,
  controller.getMyNotifications
);

router.patch("/read-all", controller.markAllRead);

router.patch(
  "/:id/read",
  param("id")
    .isInt({ min: 1, max: 2147483647 })
    .withMessage("A valid notification ID is required.")
    .toInt(),
  validate,
  controller.markOneRead
);

module.exports = router;