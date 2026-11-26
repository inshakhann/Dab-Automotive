const repository = require("./audit.repository");
const { checkDateRange } = require("../../common/validation");
async function listAuditLogs(filters) {
  checkDateRange(filters);
  const result = await repository.listAuditLogs(filters);
  return {
    page: filters.page,
    limit: filters.limit,
    total: result.total,
    total_pages: Math.ceil(result.total / filters.limit),
    logs: result.logs,
  };
}
module.exports = { listAuditLogs };
