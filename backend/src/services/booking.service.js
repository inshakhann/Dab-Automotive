const crypto = require("crypto");
const bookingRepo = require("../modules/bookings/booking.repository");

const getAllBookings = (customerId) => bookingRepo.findAllByCustomer(customerId);
const getBookingById = (id, customerId) => bookingRepo.findByIdAndCustomer(id, customerId);

const createBooking = async (customerId, vehicleId, packageId, startTime) => {
  const client = await bookingRepo.getClient();

  try {
    await client.query("BEGIN");

    const vehicle = await client.query(
      `SELECT vehicle_id FROM vehicles
       WHERE vehicle_id = $1 AND customer_id = $2 AND is_deleted = FALSE`,
      [vehicleId, customerId]
    );

    if (vehicle.rows.length === 0) {
      throw new Error("Vehicle does not belong to this customer");
    }

    const duration = await bookingRepo.findActivePackageDuration(client, packageId);
    if (!duration) {
      throw new Error("Package not found or inactive");
    }

    const start = new Date(startTime);
    if (Number.isNaN(start.getTime()) || start <= new Date()) {
      throw new Error("Please provide a valid future booking time");
    }

    const end = new Date(start.getTime() + duration * 60000);
    const bays = await bookingRepo.findAvailableBaysForRange(client, start, end, null, true);

    if (bays.length === 0) {
      throw new Error("No workshop bay available for this time");
    }

    const reference = "BK-" + crypto.randomBytes(4).toString("hex").toUpperCase();

    const result = await client.query(
      `INSERT INTO service_bookings
       (booking_reference, customer_id, vehicle_id, package_id, bay_id, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [reference, customerId, vehicleId, packageId, bays[0].bay_id, start, end]
    );

    await bookingRepo.upsertBookingReminders(client, result.rows[0].booking_id, start);
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
  const client = await bookingRepo.getClient();

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

    const duration = await bookingRepo.findActivePackageDuration(client, current.package_id);
    if (!duration) {
      throw new Error("Package not found or inactive");
    }

    const end = new Date(start.getTime() + duration * 60000);
    const bays = await bookingRepo.findAvailableBaysForRange(client, start, end, bookingId, true);

    if (bays.length === 0) {
      throw new Error("No workshop bay available for this time");
    }

    const result = await client.query(
      `UPDATE service_bookings
       SET start_time = $1, end_time = $2, bay_id = $3, updated_at = CURRENT_TIMESTAMP
       WHERE booking_id = $4
       RETURNING *`,
      [start, end, bays[0].bay_id, bookingId]
    );

    await bookingRepo.upsertBookingReminders(client, bookingId, start);
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
  const client = await bookingRepo.getClient();

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

    await client.query(
      "UPDATE reminders SET status = 'cancelled' WHERE booking_id = $1 AND status = 'pending'",
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

  if (
    selectedDate.getUTCFullYear() !== year ||
    selectedDate.getUTCMonth() !== month - 1 ||
    selectedDate.getUTCDate() !== day
  ) {
    throw new Error("Invalid booking date");
  }

  const duration = await bookingRepo.findActivePackageDuration(bookingRepo.pool, packageId);
  if (!duration) {
    throw new Error("Package not found or inactive");
  }

  const slots = [];

  for (let hour = 9; hour < 18; hour++) {
    const startTime = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00+05:00`);
    const endTime = new Date(startTime.getTime() + duration * 60000);
    const closingTime = new Date(`${date}T18:00:00+05:00`);

    if (endTime > closingTime || startTime <= new Date()) {
      continue;
    }

    const availableBays = await bookingRepo.findAvailableBaysForRange(bookingRepo.pool, startTime, endTime);
    if (availableBays.length > 0) {
      slots.push({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        availableBays,
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
  getAvailableSlots,
};