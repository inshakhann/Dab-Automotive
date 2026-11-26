const { transaction } = require("../../common/database");
const { checkDateRange } = require("../../common/validation");
const { toMinor, fromMinor } = require("../../common/money");
const expenses = require("../expenses/expenses.repository");
const adapter = require("../../integrations/reporting.adapter");
async function buildReport(client, range) {
  const expenseSummary = await expenses.summary(client, range);
  const workshop = await adapter.revenue(client, "workshop", range);
  const store = await adapter.revenue(client, "store", range);
  const complete = workshop.available && store.available;
  const availableRevenue = [workshop, store]
    .filter((s) => s.available)
    .reduce((sum, s) => sum + toMinor(s.total), 0n);
  return {
    period: { ...range, timezone: "UTC" },
    currency: "PKR",
    basis: "received_payments_less_recorded_expenses",
    complete,
    revenue_sources: { workshop, store },
    available_sources_revenue: fromMinor(availableRevenue),
    revenue: complete ? fromMinor(availableRevenue) : null,
    expenses: expenseSummary,
    net_profit_loss: complete
      ? fromMinor(availableRevenue - toMinor(expenseSummary.total))
      : null,
    missing_integrations: [workshop, store]
      .filter((s) => !s.available)
      .map((s) => s.required_view),
  };
}
async function profitLoss(range) {
  checkDateRange(range);
  return transaction((client) => buildReport(client, range), true);
}
module.exports = { buildReport, profitLoss };
