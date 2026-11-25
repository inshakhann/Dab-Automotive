const pool = require("../../config/db");

async function withResetUser(email, action) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT id, email, status
       FROM users
       WHERE LOWER(email) = LOWER($1)
       FOR UPDATE`,
      [email]
    );

    const outcome = await action(result.rows[0], client);

    await client.query("COMMIT");

    return outcome;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function canIssueOtp(client, userId) {
  const result = await client.query(
    `SELECT
       COUNT(*) FILTER (
         WHERE created_at > clock_timestamp() - INTERVAL '1 hour'
       )::integer AS hourly_count,
       COUNT(*) FILTER (
         WHERE created_at > clock_timestamp() - INTERVAL '60 seconds'
       )::integer AS recent_count
     FROM otp_tokens
     WHERE user_id = $1`,
    [userId]
  );

  const counts = result.rows[0];

  return counts.hourly_count < 3 && counts.recent_count === 0;
}

async function invalidateUserOtps(client, userId) {
  await client.query(
    `UPDATE otp_tokens
     SET used_at = clock_timestamp()
     WHERE user_id = $1
       AND used_at IS NULL`,
    [userId]
  );
}

async function createOtp(client, userId, otpHash) {
  const result = await client.query(
    `INSERT INTO otp_tokens (
       user_id,
       otp_hash,
       created_at,
       expires_at
     )
     VALUES (
       $1,
       $2,
       clock_timestamp(),
       clock_timestamp() + INTERVAL '10 minutes'
     )
     RETURNING id`,
    [userId, otpHash]
  );

  return result.rows[0];
}

async function findLatestOtp(client, userId) {
  const result = await client.query(
    `SELECT
       id,
       otp_hash,
       attempts,
       used_at,
       expires_at > clock_timestamp() AS is_valid
     FROM otp_tokens
     WHERE user_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [userId]
  );

  return result.rows[0];
}

async function recordWrongOtp(client, otpId) {
  await client.query(
    `UPDATE otp_tokens
     SET attempts = attempts + 1,
         used_at = CASE
           WHEN attempts + 1 >= 5 THEN clock_timestamp()
           ELSE used_at
         END
     WHERE id = $1`,
    [otpId]
  );
}

async function applyPasswordReset(
  client,
  userId,
  otpId,
  passwordHash
) {
  const consumed = await client.query(
    `UPDATE otp_tokens
     SET used_at = clock_timestamp()
     WHERE id = $1
       AND user_id = $2
       AND used_at IS NULL
       AND attempts < 5
       AND expires_at > clock_timestamp()
     RETURNING id`,
    [otpId, userId]
  );

  if (consumed.rowCount === 0) {
    return false;
  }

  await client.query(
    `UPDATE users
     SET password_hash = $1,
         token_version = token_version + 1,
         failed_login_attempts = 0,
         locked_until = NULL,
         updated_at = clock_timestamp()
     WHERE id = $2`,
    [passwordHash, userId]
  );

  await invalidateUserOtps(client, userId);

  return true;
}

async function invalidateOtpById(otpId) {
  await pool.query(
    `UPDATE otp_tokens
     SET used_at = clock_timestamp()
     WHERE id = $1
       AND used_at IS NULL`,
    [otpId]
  );
}

module.exports = {
  withResetUser,
  canIssueOtp,
  invalidateUserOtps,
  createOtp,
  findLatestOtp,
  recordWrongOtp,
  applyPasswordReset,
  invalidateOtpById,
};