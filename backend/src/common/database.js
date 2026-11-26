const pool = require("../config/db");
const { httpError } = require("./errors");
async function transaction(action, readOnly = false) {
  const client = await pool.connect();
  try {
    await client.query(
      readOnly ? "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY" : "BEGIN",
    );
    const result = await action(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
// Recheck permission inside write transactions, and lock the actor against deactivation.
async function requirePermission(client, actorId, permission) {
  const result = await client.query(
    `SELECT u.id FROM users u
    WHERE u.id=$1 AND u.status='active' AND EXISTS (
      SELECT 1 FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id
      WHERE rp.role_id=u.role_id AND p.name=$2
    ) FOR SHARE OF u`,
    [actorId, permission],
  );
  if (!result.rowCount)
    throw httpError(403, "You do not have permission to perform this action.");
}
async function audit(client, actorId, action, entityType, entityId, details) {
  await client.query(
    `INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,details)
    VALUES($1,$2,$3,$4,$5::jsonb)`,
    [actorId, action, entityType, entityId, JSON.stringify(details)],
  );
}
module.exports = { transaction, requirePermission, audit };
