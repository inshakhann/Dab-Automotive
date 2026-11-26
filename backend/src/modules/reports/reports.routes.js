const router = require("express").Router();
router.use(require("../../middleware/authenticate"));
router.get(
  "/profit-loss",
  require("../../middleware/authorize")("reports.read"),
  require("./reports.validation"),
  require("../../middleware/validate"),
  require("./reports.controller").profitLoss,
);
module.exports = router;
