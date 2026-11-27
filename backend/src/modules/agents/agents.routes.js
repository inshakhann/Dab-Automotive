const express = require("express");
const { body, param } = require("express-validator");
const authenticate = require("../../middleware/authenticate");
const validate = require("../../middleware/validate");
const controller = require("./agents.controller");

const router = express.Router();

router.use(authenticate);

router.get("/conversations", controller.getMyConversations);

router.post(
  "/conversations",
  body("agent_type")
    .optional()
    .isIn(["BOOKING", "GENERAL"])
    .withMessage("agent_type must be BOOKING or GENERAL."),
  validate,
  controller.createConversation
);

router.get(
  "/conversations/:id",
  param("id").isInt({ min: 1 }).toInt(),
  validate,
  controller.getConversationDetail
);

router.post(
  "/conversations/:id/messages",
  param("id").isInt({ min: 1 }).toInt(),
  body("content")
    .isString()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Message content is required."),
  validate,
  controller.postMessage
);

module.exports = router;