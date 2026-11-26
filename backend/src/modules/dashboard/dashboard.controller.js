const { matchedData } = require("express-validator");
const service = require("./dashboard.service");
async function get(req, res, next) {
  try {
    res.json({
      success: true,
      dashboard: await service.dashboard(
        req.user.role,
        matchedData(req, { locations: ["query"] }),
      ),
    });
  } catch (e) {
    next(e);
  }
}
module.exports = { get };
