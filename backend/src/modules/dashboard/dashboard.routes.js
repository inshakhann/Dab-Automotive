const router = require("express").Router();
router.use(require("../../middleware/authenticate"));
router.get(
  "/admin",
  require("../../middleware/authorize")("dashboard.read"),
  require("../reports/reports.validation"),
  require("../../middleware/validate"),
  require("./dashboard.controller").get,
);
module.exports = router;
