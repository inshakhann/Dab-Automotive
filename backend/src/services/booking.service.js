const pool = require("../config/db");
const crypto = require("crypto");

const getAllBookings = async () => {
  const result = await pool.query(`
    SELECT b.*, p.name AS package_name,
           v.make, v.model, v.plate_no,
           w.bay_name
    FROM service_bookings b
    JOIN service_packages p ON b.package_id = p.package_id
    JOIN vehicles v ON b.vehicle_id = v.vehicle_id
    LEFT JOIN workshop_bays w ON b.bay_id = w.bay_id
    ORDER BY b.booking_id
  `);

  return result.rows;
};

const getBookingById = async (id) => {
  const result = await pool.query(`
    SELECT b.*, p.name AS package_name,
           v.make, v.model, v.plate_no,
           w.bay_name
    FROM service_bookings b
    JOIN service_packages p ON b.package_id = p.package_id
    JOIN vehicles v ON b.vehicle_id = v.vehicle_id
    LEFT JOIN workshop_bays w ON b.bay_id = w.bay_id
    WHERE b.booking_id = $1
  `, [id]);

  return result.rows[0] || null;
};

const createBooking = async (customerId, vehicleId, packageId, startTime) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const vehicle = await client.query(
      `SELECT vehicle_id FROM vehicles
       WHERE vehicle_id = $1
       AND customer_id = $2
       AND is_deleted = FALSE`,
      [vehicleId, customerId]
    );

    if (vehicle.rows.length === 0) {
      throw new Error("Vehicle does not belong to this customer");
    }

    const packageResult = await client.query(
      `SELECT estimated_duration FROM service_packages
       WHERE package_id = $1 AND is_active = TRUE`,
      [packageId]
    );

    if (packageResult.rows.length === 0) {
      throw new Error("Package not found or inactive");
    }

    const start = new Date(startTime);

    if (Number.isNaN(start.getTime()) || start <= new Date()) {
      throw new Error("Please provide a valid future booking time");
    }

    const end = new Date(
      start.getTime() + packageResult.rows[0].estimated_duration * 60000
    );

    const bay = await client.query(`
      SELECT b.bay_id
      FROM workshop_bays b
      WHERE b.is_active = TRUE
      AND NOT EXISTS (
        SELECT 1
        FROM service_bookings sb
        WHERE sb.bay_id = b.bay_id
        AND sb.status IN ('pending', 'confirmed')
        AND sb.start_time < $2
        AND sb.end_time > $1
      )
      ORDER BY b.bay_id
      LIMIT 1
      FOR UPDATE OF b SKIP LOCKED
    `, [start, end]);

    if (bay.rows.length === 0) {
      throw new Error("No workshop bay available for this time");
    }

    const reference = "BK-" + crypto.randomBytes(4).toString("hex").toUpperCase();

    const result = await client.query(
      `INSERT INTO service_bookings
       (booking_reference, customer_id, vehicle_id, package_id,
        bay_id, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [reference, customerId, vehicleId, packageId,
       bay.rows[0].bay_id, start, end]
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getAllBookings,
  getBookingById,
  createBooking
};
