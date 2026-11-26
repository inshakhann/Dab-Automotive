const { matchedData } = require("express-validator");
const service = require("./reports.service");
async function profitLoss(req, res, next) {
  try {
    res.json({
      success: true,
      report: await service.profitLoss(
        matchedData(req, { locations: ["query"] }),
      ),
    });
  } catch (e) {
    next(e);
  }
}
module.exports = { profitLoss };
