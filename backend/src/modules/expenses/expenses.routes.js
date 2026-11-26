const router = require("express").Router();
const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");
const validate = require("../../middleware/validate");
const v = require("./expenses.validation");
const controller = require("./expenses.controller");
const { strictQuery } = require("../../common/validation");
router.use(authenticate);
router.get(
  "/",
  authorize("expenses.read"),
  v.listValidation,
  validate,
  controller.list,
);
router.get(
  "/:id",
  authorize("expenses.read"),
  strictQuery([]),
  v.idParam(),
  validate,
  controller.get,
);
router.post(
  "/",
  authorize("expenses.write"),
  strictQuery([]),
  v.writeValidation(),
  validate,
  controller.create,
);
router.put(
  "/:id",
  authorize("expenses.write"),
  strictQuery([]),
  v.idParam(),
  v.writeValidation(true),
  validate,
  controller.update,
);
router.delete(
  "/:id",
  authorize("expenses.write"),
  strictQuery([]),
  v.idParam(),
  validate,
  controller.remove,
);
module.exports = router;
