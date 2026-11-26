const { transaction } = require("../../common/database");
const { checkDateRange } = require("../../common/validation");
const { httpError } = require("../../common/errors");
const repository = require("./dashboard.repository");
const reports = require("../reports/reports.service");
const adapter = require("../../integrations/reporting.adapter");
const settingsRepository = require("../settings/settings.repository");
async function dashboard(role, range) {
  checkDateRange(range);
  if (!["owner", "administrator"].includes(role))
    throw httpError(
      403,
      "This dashboard requires Owner or Administrator access.",
    );
  return transaction(async (client) => {
    const financial = await reports.buildReport(client, range);
    const operations = await adapter.operations(client, range);
    const result = {
      role,
      period: { ...range, timezone: "UTC" },
      financial,
      operations,
      complete:
        financial.complete &&
        Object.values(operations).every((item) => item.available),
    };
    if (role === "administrator") {
      result.administration = await repository.administration(client, range);
      const settings = await settingsRepository.list(client);
      result.administration.configured_secrets = settings
        .filter((s) => s.is_secret && s.encrypted_value)
        .map((s) => s.key);
      result.health = {
        database: "connected",
        server_uptime_seconds: Math.floor(process.uptime()),
      };
    }
    return result;
  }, true);
}
module.exports = { dashboard };
