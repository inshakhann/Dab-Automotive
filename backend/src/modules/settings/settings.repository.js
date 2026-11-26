const pool = require("../../config/db");
async function list(client = pool) {
  return (await client.query("SELECT * FROM system_settings ORDER BY key"))
    .rows;
}
async function find(key, client = pool) {
  return (
    await client.query("SELECT * FROM system_settings WHERE key=$1", [key])
  ).rows[0];
}
async function save(client, actorId, key, isSecret, value, encryptedValue) {
  const result = await client.query(
    `INSERT INTO system_settings(key,is_secret,value,encrypted_value,updated_by)
    VALUES($1,$2,$3::jsonb,$4,$5)
    ON CONFLICT(key) DO UPDATE SET is_secret=EXCLUDED.is_secret,value=EXCLUDED.value,
      encrypted_value=EXCLUDED.encrypted_value,updated_by=EXCLUDED.updated_by,updated_at=clock_timestamp()
    RETURNING *`,
    [
      key,
      isSecret,
      isSecret ? null : JSON.stringify(value),
      encryptedValue,
      actorId,
    ],
  );
  return result.rows[0];
}
module.exports = { list, find, save };
