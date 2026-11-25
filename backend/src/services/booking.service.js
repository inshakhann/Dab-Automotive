const pool = require("../config/db");
const crypto = require("crypto");

const getAllBookings = async (customerId) => {
  const result = await pool.query(`
    SELECT b.*, p.name AS package_name,
           v.make, v.model, v.plate_no,
           w.bay_name
    FROM service_bookings b
    JOIN service_packages p ON b.package_id = p.package_id
    JOIN vehicles v ON b.vehicle_id = v.vehicle_id
    LEFT JOIN workshop_bays w ON b.bay_id = w.bay_id
    WHERE b.customer_id = $1
    ORDER BY b.booking_id
  `, [customerId]);

  return result.rows;
};

const getBookingById = async (id, customerId) => {
  const result = await pool.query(`
    SELECT b.*, p.name AS package_name,
           v.make, v.model, v.plate_no,
           w.bay_name
    FROM service_bookings b
    JOIN service_packages p ON b.package_id = p.package_id
    JOIN vehicles v ON b.vehicle_id = v.vehicle_id
    LEFT JOIN workshop_bays w ON b.bay_id = w.bay_id
    WHERE b.booking_id = $1 AND b.customer_id = $2
  `, [id, customerId]);

  return result.rows[0] || null;
};

const createBooking = async (customerId, vehicleId, packageId, startTime) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const vehicle = await client.query(
      `SELECT vehicle_id FROM vehicles
       WHERE vehicle_id = $1 AND customer_id = $2
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
        SELECT 1 FROM service_bookings sb
        WHERE sb.bay_id = b.bay_id
        AND sb.status IN ('pending', 'confirmed')
        AND sb.start_time < $2 AND sb.end_time > $1
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

const updateBooking = async (bookingId, customerId, startTime) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const booking = await client.query(
      `SELECT * FROM service_bookings
       WHERE booking_id = $1 AND customer_id = $2
       FOR UPDATE`,
      [bookingId, customerId]
    );

    if (booking.rows.length === 0) {
      throw new Error("Booking not found");
    }

    const current = booking.rows[0];

    if (current.job_card_created) {
      throw new Error("Booking cannot be modified after job card creation");
    }

    if (!["pending", "confirmed"].includes(current.status)) {
      throw new Error("Only active bookings can be modified");
    }

    const start = new Date(startTime);

    if (Number.isNaN(start.getTime()) || start <= new Date()) {
      throw new Error("Please provide a valid future booking time");
    }

    const packageResult = await client.query(
      `SELECT estimated_duration FROM service_packages
       WHERE package_id = $1 AND is_active = TRUE`,
      [current.package_id]
    );

    if (packageResult.rows.length === 0) {
      throw new Error("Package not found or inactive");
    }

    const end = new Date(
      start.getTime() + packageResult.rows[0].estimated_duration * 60000
    );

    const bay = await client.query(`
      SELECT b.bay_id
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
      LIMIT 1
      FOR UPDATE OF b SKIP LOCKED
    `, [start, end, bookingId]);

    if (bay.rows.length === 0) {
      throw new Error("No workshop bay available for this time");
    }

    const result = await client.query(
      `UPDATE service_bookings
       SET start_time = $1, end_time = $2, bay_id = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE booking_id = $4
       RETURNING *`,
      [start, end, bay.rows[0].bay_id, bookingId]
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

const cancelBooking = async (bookingId, customerId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const booking = await client.query(
      `SELECT * FROM service_bookings
       WHERE booking_id = $1 AND customer_id = $2
       FOR UPDATE`,
      [bookingId, customerId]
    );

    if (booking.rows.length === 0) {
      throw new Error("Booking not found");
    }

    const current = booking.rows[0];

    if (current.job_card_created) {
      throw new Error("Booking cannot be cancelled after job card creation");
    }

    if (!["pending", "confirmed"].includes(current.status)) {
      throw new Error("Only active bookings can be cancelled");
    }

    const result = await client.query(
      `UPDATE service_bookings
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE booking_id = $1
       RETURNING *`,
      [bookingId]
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

const getAvailableSlots = async (date, packageId) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Date must be in YYYY-MM-DD format");
  }

  const [year, month, day] = date.split("-").map(Number);
  const selectedDate = new Date(Date.UTC(year, month - 1, day));

  if (selectedDate.getUTCFullYear() !== year ||
      selectedDate.getUTCMonth() !== month - 1 ||
      selectedDate.getUTCDate() !== day) {
    throw new Error("Invalid booking date");
  }

  const packageResult = await pool.query(
    `SELECT estimated_duration FROM service_packages
     WHERE package_id = $1 AND is_active = TRUE`,
    [packageId]
  );

  if (packageResult.rows.length === 0) {
    throw new Error("Package not found or inactive");
  }

  const duration = packageResult.rows[0].estimated_duration;
  const slots = [];

  for (let hour = 9; hour < 18; hour++) {
    const startTime = new Date(
      `${date}T${String(hour).padStart(2, "0")}:00:00+05:00`
    );

    const endTime = new Date(startTime.getTime() + duration * 60000);
    const closingTime = new Date(`${date}T18:00:00+05:00`);

    if (endTime > closingTime || startTime <= new Date()) {
      continue;
    }

    const result = await pool.query(`
      SELECT b.bay_id, b.bay_name
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
    `, [startTime, endTime]);

    if (result.rows.length > 0) {
      slots.push({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        availableBays: result.rows
      });
    }
  }

  return slots;
};

module.exports = {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  cancelBooking,
  getAvailableSlots
};


