const { matchedData } = require("express-validator");
const service = require("./audit.service");

async function listAuditLogs(req, res, next) {
  try {
    const filters = matchedData(req, {
      locations: ["query"],
    });

    const result = await service.listAuditLogs(filters);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}

module.exports = { listAuditLogs };
