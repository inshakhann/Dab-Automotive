const router = require("express").Router();
const authenticate = require("../../middleware/authenticate");
const authorize = require("../../middleware/authorize");
const { strictBody, strictQuery } = require("../../common/validation");
const controller = require("./settings.controller");
router.use(authenticate);
router.get("/", authorize("settings.read"), strictQuery([]), controller.list);
router.put(
  "/",
  authorize("settings.update"),
  strictQuery([]),
  strictBody(["settings"], { required: ["settings"] }),
  controller.update,
);
module.exports = router;
