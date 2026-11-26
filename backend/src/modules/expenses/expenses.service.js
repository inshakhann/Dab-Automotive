const repository = require("./expenses.repository");
const {
  transaction,
  requirePermission,
  audit,
} = require("../../common/database");
const { httpError } = require("../../common/errors");
const { checkDateRange } = require("../../common/validation");
async function list(filters) {
  checkDateRange(filters);
  const result = await repository.list(filters);
  return {
    page: filters.page,
    limit: filters.limit,
    total_pages: Math.ceil(result.total / filters.limit),
    ...result,
  };
}
async function get(id) {
  const item = await repository.find(id);
  if (!item) throw httpError(404, "Expense not found.");
  return item;
}
async function create(actorId, data) {
  return transaction(async (client) => {
    await requirePermission(client, actorId, "expenses.write");
    const item = await repository.create(client, actorId, data);
    await audit(client, actorId, "expense.create", "expense", item.id, {
      amount: item.amount,
      category: item.category,
      expense_date: item.expense_date,
    });
    return item;
  });
}
async function update(actorId, id, data) {
  return transaction(async (client) => {
    await requirePermission(client, actorId, "expenses.write");
    const previous = await repository.find(id, client, true);
    if (!previous) throw httpError(404, "Expense not found.");
    const item = await repository.update(client, actorId, id, data);
    await audit(client, actorId, "expense.update", "expense", id, {
      updated_fields: Object.keys(data),
      previous_amount: previous.amount,
      new_amount: item.amount,
    });
    return item;
  });
}
async function remove(actorId, id) {
  return transaction(async (client) => {
    await requirePermission(client, actorId, "expenses.write");
    const previous = await repository.find(id, client, true);
    if (!previous) throw httpError(404, "Expense not found.");
    await repository.remove(client, actorId, id);
    await audit(client, actorId, "expense.delete", "expense", id, {
      amount: previous.amount,
      category: previous.category,
    });
  });
}
module.exports = { list, get, create, update, remove };
