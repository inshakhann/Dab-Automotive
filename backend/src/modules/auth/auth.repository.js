const pool = require("../../config/db");

async function findRoleByName(name) {
  const result = await pool.query(
    "SELECT id, name FROM roles WHERE name = $1",
    [name]
  );

  return result.rows[0];
}

async function createUser(data) {
  const result = await pool.query(
    `INSERT INTO users (
      full_name,
      email,
      phone,
      password_hash,
      role_id,
      requested_role_id,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING
      id,
      full_name,
      email,
      phone,
      status,
      created_at`,
    [
      data.full_name,
      data.email,
      data.phone,
      data.password_hash,
      data.role_id,
      data.requested_role_id,
      data.status,
    ]
  );

  return result.rows[0];
}

module.exports = { findRoleByName, createUser };