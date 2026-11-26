const pool = require("../../config/db");
const projection =
  "u.id,u.full_name,u.email,u.phone,u.status,u.preferred_language,r.name AS role";
async function find(id, client = pool, lock = false) {
  return (
    await client.query(
      `SELECT ${projection} FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1 ${lock ? "FOR UPDATE OF u" : ""}`,
      [id],
    )
  ).rows[0];
}
async function create(client, data, hash) {
  const result = await client.query(
    `INSERT INTO users(full_name,email,phone,password_hash,role_id,status,preferred_language)
    SELECT $1,$2,$3,$4,id,'active',$6 FROM roles WHERE name=$5 RETURNING id`,
    [
      data.full_name,
      data.email,
      data.phone,
      hash,
      data.role,
      data.preferred_language ?? "en",
    ],
  );
  if (!result.rowCount)
    throw new Error("Required role missing. Run migrations.");
  return find(result.rows[0].id, client);
}
async function edit(client, id, data) {
  await client.query(
    `UPDATE users SET full_name=COALESCE($1,full_name),email=COALESCE($2,email),
    phone=COALESCE($3,phone),preferred_language=COALESCE($4,preferred_language),
    token_version=token_version+1,updated_at=clock_timestamp() WHERE id=$5`,
    [
      data.full_name ?? null,
      data.email ?? null,
      data.phone ?? null,
      data.preferred_language ?? null,
      id,
    ],
  );
  await client.query(
    "UPDATE otp_tokens SET used_at=clock_timestamp() WHERE user_id=$1 AND used_at IS NULL",
    [id],
  );
  return find(id, client);
}
module.exports = { find, create, edit };
