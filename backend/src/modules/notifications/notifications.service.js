const pool = require("../../config/db");

async function createNotification({ userId, type, title, message }) {
  const result = await pool.query(
    `INSERT INTO notifications (user_id, type, title, message)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, type, title, message, is_read, created_at`,
    [userId, type, title, message]
  );
  return result.rows[0];
}

async function listUserNotifications(userId, limit = 30) {
  const [listRes, unreadRes] = await Promise.all([
    pool.query(
      `SELECT id, type, title, message, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS unread_count
       FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    ),
  ]);

  return {
    unreadCount: unreadRes.rows[0].unread_count,
    notifications: listRes.rows,
  };
}

async function markNotificationRead(notificationId, userId) {
  const result = await pool.query(
    `UPDATE notifications
     SET is_read = TRUE
     WHERE id = $1 AND user_id = $2
     RETURNING id, type, title, message, is_read, created_at`,
    [notificationId, userId]
  );

  if (result.rowCount === 0) {
    const err = new Error("Notification not found");
    err.status = 404;
    throw err;
  }

  return result.rows[0];
}

async function markAllRead(userId) {
  await pool.query(
    `UPDATE notifications
     SET is_read = TRUE
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
}

module.exports = {
  createNotification,
  listUserNotifications,
  markNotificationRead,
  markAllRead,
};