const pool = require("../../config/db");

async function listUsers({ page, limit, status }) {
  const offset = (page - 1) * limit;

  const result = await pool.query(
    `SELECT
       u.id,
       u.full_name,
       u.email,
       u.phone,
       u.status,
       u.created_at,
       r.name AS role,
       requested.name AS requested_role
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN roles requested ON requested.id = u.requested_role_id
     WHERE ($1::text IS NULL OR u.status = $1)
     ORDER BY u.id DESC
     LIMIT $2 OFFSET $3`,
    [status || null, limit, offset],
  );

  return result.rows;
}

async function transaction(action) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

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

async function lockReviewer(client, actorId) {
  await client.query("SELECT pg_advisory_xact_lock(874232)");
  const result = await client.query(
    `SELECT
       u.id,
       u.status,
       EXISTS (
         SELECT 1
         FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = u.role_id
           AND p.name = 'users.review_staff'
       ) AS can_review
     FROM users u
     WHERE u.id = $1
     FOR SHARE OF u`,
    [actorId],
  );

  return result.rows[0];
}

async function lockStaffRequest(client, userId) {
  const result = await client.query(
    `SELECT
       u.id,
       u.status,
       u.role_id,
       u.requested_role_id,
       cr.name AS role,
       rr.name AS requested_role
     FROM users u
     JOIN roles cr ON cr.id = u.role_id
     LEFT JOIN roles rr ON rr.id = u.requested_role_id
     WHERE u.id = $1
     FOR UPDATE OF u`,
    [userId],
  );

  return result.rows[0];
}

async function updateStaffDecision(client, userId, roleId, status) {
  const result = await client.query(
    `UPDATE users
     SET role_id = $1,
         requested_role_id = NULL,
         status = $2,
         token_version = token_version + 1,
         failed_login_attempts = 0,
         locked_until = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3
     RETURNING id, full_name, email, status`,
    [roleId, status, userId],
  );

  return result.rows[0];
}

async function recordStaffDecision(client, actorId, userId, decision, details) {
  await client.query(
    `INSERT INTO audit_logs (
       actor_user_id,
       action,
       entity_type,
       entity_id,
       details
     )
     VALUES ($1, $2, 'user', $3, $4::jsonb)`,
    [actorId, `staff.${decision}`, userId, JSON.stringify(details)],
  );
}

async function updateOwnProfile(userId, changes) {
  return transaction(async (client) => {
    const result = await client.query(
      `UPDATE users AS u
       SET full_name = COALESCE($1::text, u.full_name),
           phone = COALESCE($2::text, u.phone),
           preferred_language = COALESCE(
             $3::text,
             u.preferred_language
           ),
           updated_at = CURRENT_TIMESTAMP
       FROM roles AS r
       WHERE u.id = $4
         AND u.status = 'active'
         AND r.id = u.role_id
       RETURNING
         u.id,
         u.full_name,
         u.email,
         u.phone,
         u.status,
         u.preferred_language,
         u.updated_at,
         r.name AS role`,
      [
        changes.full_name ?? null,
        changes.phone ?? null,
        changes.preferred_language ?? null,
        userId,
      ],
    );

    if (result.rowCount === 0) {
      return null;
    }

    const updatedFields = ["full_name", "phone", "preferred_language"].filter(
      (field) => changes[field] !== undefined,
    );

    await client.query(
      `INSERT INTO audit_logs (
         actor_user_id,
         action,
         entity_type,
         entity_id,
         details
       )
       VALUES ($1, 'profile.update', 'user', $1, $2::jsonb)`,
      [
        userId,
        JSON.stringify({
          updated_fields: updatedFields,
        }),
      ],
    );

    return result.rows[0];
  });
}

async function lockStatusActor(client, actorId) {
  // Serialize account-status changes.
  // Future role-changing operations should use this same lock.
  await client.query("SELECT pg_advisory_xact_lock(874232)");

  const result = await client.query(
    `SELECT
       u.id,
       u.status,
       EXISTS (
         SELECT 1
         FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = u.role_id
           AND p.name = 'users.change_status'
       ) AS can_change_status
     FROM users u
     WHERE u.id = $1
     FOR SHARE OF u`,
    [actorId],
  );

  return result.rows[0];
}

async function countActiveOwners(client) {
  const result = await client.query(
    `SELECT COUNT(*)::integer AS count
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'owner'
       AND u.status = 'active'`,
  );

  return result.rows[0].count;
}

async function updateUserStatus(client, userId, status) {
  const result = await client.query(
    `UPDATE users AS u
     SET status = $1,
         token_version = u.token_version + 1,
         failed_login_attempts = 0,
         locked_until = NULL,
         updated_at = CURRENT_TIMESTAMP
     FROM roles AS r
     WHERE u.id = $2
       AND r.id = u.role_id
     RETURNING
       u.id,
       u.full_name,
       u.email,
       u.status,
       r.name AS role`,
    [status, userId],
  );

  // Previously issued reset codes must not survive a status change.
  await client.query(
    `UPDATE otp_tokens
     SET used_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
       AND used_at IS NULL`,
    [userId],
  );

  return result.rows[0];
}

async function recordUserStatusChange(client, actorId, userId, details) {
  await client.query(
    `INSERT INTO audit_logs (
       actor_user_id,
       action,
       entity_type,
       entity_id,
       details
     )
     VALUES ($1, 'user.status.update', 'user', $2, $3::jsonb)`,
    [actorId, userId, JSON.stringify(details)],
  );
}

module.exports = {
  listUsers,
  transaction,
  lockReviewer,
  lockStaffRequest,
  updateStaffDecision,
  recordStaffDecision,
  updateOwnProfile,
  lockStatusActor,
  countActiveOwners,
  updateUserStatus,
  recordUserStatusChange,
};

async function lockRoleActor(client, actorId) {
  // Same lock used by account-status changes.
  await client.query("SELECT pg_advisory_xact_lock(874232)");

  const result = await client.query(
    `
      SELECT
        u.id,
        u.status,
        EXISTS (
          SELECT 1
          FROM role_permissions AS rp
          JOIN permissions AS p ON p.id = rp.permission_id
          WHERE rp.role_id = u.role_id
            AND p.name = 'users.change_role'
        ) AS can_change_role
      FROM users AS u
      WHERE u.id = $1
      FOR SHARE OF u
    `,
    [actorId],
  );

  return result.rows[0];
}

async function findAssignableRole(client, roleName) {
  const result = await client.query(
    "SELECT id, name FROM roles WHERE name = $1",
    [roleName],
  );

  return result.rows[0];
}

async function updateUserRole(client, userId, roleId) {
  const result = await client.query(
    `
      UPDATE users AS u
      SET
        role_id = r.id,
        token_version = u.token_version + 1,
        updated_at = CURRENT_TIMESTAMP
      FROM roles AS r
      WHERE u.id = $2
        AND r.id = $1
      RETURNING
        u.id,
        u.full_name,
        u.email,
        u.status,
        r.name AS role
    `,
    [roleId, userId],
  );

  // Invalidate outstanding password-reset codes.
  await client.query(
    `
      UPDATE otp_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
        AND used_at IS NULL
    `,
    [userId],
  );

  return result.rows[0];
}

async function recordUserRoleChange(client, actorId, userId, details) {
  await client.query(
    `
      INSERT INTO audit_logs (
        actor_user_id,
        action,
        entity_type,
        entity_id,
        details
      )
      VALUES ($1, 'user.role.update', 'user', $2, $3::jsonb)
    `,
    [actorId, userId, JSON.stringify(details)],
  );
}

module.exports.lockRoleActor = lockRoleActor;
module.exports.findAssignableRole = findAssignableRole;
module.exports.updateUserRole = updateUserRole;
module.exports.recordUserRoleChange = recordUserRoleChange;
