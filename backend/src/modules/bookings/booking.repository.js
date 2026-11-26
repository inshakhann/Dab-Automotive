const pool = require("../../config/db");

const getClient = () => pool.connect();

const findAllByCustomer = async (customerId) => {
  const result = await pool.query(`
    SELECT b.*, p.name AS package_name, v.make, v.model, v.plate_no, w.bay_name
    FROM service_bookings b
    JOIN service_packages p ON b.package_id = p.package_id
    JOIN vehicles v ON b.vehicle_id = v.vehicle_id
    LEFT JOIN workshop_bays w ON b.bay_id = w.bay_id
    WHERE b.customer_id = $1
    ORDER BY b.booking_id
  `, [customerId]);
  return result.rows;
};

const findByIdAndCustomer = async (id, customerId) => {
  const result = await pool.query(`
    SELECT b.*, p.name AS package_name, v.make, v.model, v.plate_no, w.bay_name
    FROM service_bookings b
    JOIN service_packages p ON b.package_id = p.package_id
    JOIN vehicles v ON b.vehicle_id = v.vehicle_id
    LEFT JOIN workshop_bays w ON b.bay_id = w.bay_id
    WHERE b.booking_id = $1 AND b.customer_id = $2
  `, [id, customerId]);
  return result.rows[0] || null;
};

const findActivePackageDuration = async (db, packageId) => {
  const result = await db.query(
    "SELECT estimated_duration FROM service_packages WHERE package_id = $1 AND is_active = TRUE",
    [packageId]
  );
  return result.rows[0]?.estimated_duration || null;
};

const findAvailableBaysForRange = async (db, startTime, endTime, excludeBookingId = null, lockForUpdate = false) => {
  const lockClause = lockForUpdate ? "FOR UPDATE OF b SKIP LOCKED" : "";
  if (excludeBookingId) {
    const result = await db.query(`
      SELECT b.bay_id, b.bay_name
      FROM workshop_bays b
      WHERE b.is_active = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM service_bookings sb
        WHERE sb.bay_id = b.bay_id
        AND sb.booking_id <> $3
        AND sb.status IN ('pending', 'confirmed')
        AND sb.start_time < $2 AND sb.end_time > $1
      )
      ORDER BY b.bay_id
      ${lockClause}
    `, [startTime, endTime, excludeBookingId]);
    return result.rows;
  }

  const result = await db.query(`
    SELECT b.bay_id, b.bay_name
    FROM workshop_bays b
    WHERE b.is_active = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM service_bookings sb
      WHERE sb.bay_id = b.bay_id
      AND sb.status IN ('pending', 'confirmed')
      AND sb.start_time < $2 AND sb.end_time > $1
    )
    ORDER BY b.bay_id
    ${lockClause}
  `, [startTime, endTime]);
  return result.rows;
};

const upsertBookingReminders = async (client, bookingId, startTime) => {
  const start = new Date(startTime);

  for (const reminder of [
    { type: "24_hours", hours: 24 },
    { type: "2_hours", hours: 2 },
  ]) {
    const scheduledAt = new Date(start.getTime() - reminder.hours * 60 * 60 * 1000);

    await client.query(
      `INSERT INTO reminders (booking_id, reminder_type, scheduled_at, status, alert_date)
       VALUES ($1, $2, $3, CASE WHEN $3 > CURRENT_TIMESTAMP THEN 'pending' ELSE 'cancelled' END, CURRENT_DATE)
       ON CONFLICT (booking_id, reminder_type, alert_date)
       DO UPDATE SET
         scheduled_at = EXCLUDED.scheduled_at,
         status = CASE WHEN EXCLUDED.scheduled_at > CURRENT_TIMESTAMP THEN 'pending' ELSE 'cancelled' END,
         sent_at = NULL,
         retry_count = 0`,
      [bookingId, reminder.type, scheduledAt]
    );
  }
};

module.exports = {
  pool,
  getClient,
  findAllByCustomer,
  findByIdAndCustomer,
  findActivePackageDuration,
  findAvailableBaysForRange,
  upsertBookingReminders,
};