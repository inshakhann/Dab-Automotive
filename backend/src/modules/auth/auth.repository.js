const pool = require("../../config/db");

async function findRoleByName(name) {
  const result = await pool.query(
    "SELECT id, name FROM roles WHERE name = $1",
    [name],
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
    ],
  );

  return result.rows[0];
}

async function withLoginUser(email, action) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT u.*, r.name AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE LOWER(u.email) = LOWER($1)
       FOR UPDATE OF u`,
      [email],
    );

    const user = result.rows[0];

    // The service checks the password and decides what to update.
    const outcome = await action(user, client);

    // Failed-password counters must also be committed.
    await client.query("COMMIT");

    return outcome;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateLoginState(client, userId, failedAttempts, lockedUntil) {
  await client.query(
    `UPDATE users
     SET failed_login_attempts = $1,
         locked_until = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [failedAttempts, lockedUntil, userId],
  );
}

async function findUserById(id) {
  const result = await pool.query(
    `SELECT
       u.id,
       u.full_name,
       u.email,
       u.phone,
       u.status,
       u.preferred_language,
       u.token_version,
       r.name AS role
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [id],
  );

  return result.rows[0];
}

module.exports = {
  findRoleByName,
  createUser,
  withLoginUser,
  updateLoginState,
  findUserById,
};
