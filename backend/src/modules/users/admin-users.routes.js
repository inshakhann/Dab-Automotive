// Mounted inside users.routes.js after its authentication middleware and /me routes.
const router = require("express").Router();
const authorize = require("../../middleware/authorize");
const validate = require("../../middleware/validate");
const { idParam, strictQuery } = require("../../common/validation");
const {
  createValidation,
  editValidation,
} = require("./admin-users.validation");
const controller = require("./admin-users.controller");
router.get(
  "/:id",
  authorize("users.read"),
  strictQuery([]),
  idParam(),
  validate,
  controller.get,
);
router.post(
  "/",
  authorize("users.create"),
  strictQuery([]),
  createValidation,
  validate,
  controller.create,
);
router.put(
  "/:id",
  authorize("users.edit"),
  strictQuery([]),
  idParam(),
  editValidation,
  validate,
  controller.edit,
);
module.exports = router;
