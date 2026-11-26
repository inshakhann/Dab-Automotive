const bcrypt = require("bcrypt");
const repository = require("./admin-users.repository");
const {
  transaction,
  requirePermission,
  audit,
} = require("../../common/database");
const { httpError } = require("../../common/errors");
async function get(id) {
  const user = await repository.find(id);
  if (!user) throw httpError(404, "User not found.");
  return user;
}
async function create(actorId, data) {
  const hash = await bcrypt.hash(data.password, 12);
  return transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(874232)");
    await requirePermission(client, actorId, "users.create");
    const user = await repository.create(client, data, hash);
    await audit(client, actorId, "user.create", "user", user.id, {
      role: user.role,
      status: user.status,
    });
    return user;
  });
}
async function edit(actorId, id, data) {
  return transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(874232)");
    await requirePermission(client, actorId, "users.edit");
    const previous = await repository.find(id, client, true);
    if (!previous) throw httpError(404, "User not found.");
    const user = await repository.edit(client, id, data);
    await audit(client, actorId, "user.profile.update", "user", id, {
      updated_fields: Object.keys(data),
    });
    return user;
  });
}
module.exports = { get, create, edit };
