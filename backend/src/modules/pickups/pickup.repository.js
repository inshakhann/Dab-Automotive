const pool = require("../../config/db");

const findBookingForCustomer = async (bookingId, customerId) => {
  const result = await pool.query(
    "SELECT booking_id, status FROM service_bookings WHERE booking_id = $1 AND customer_id = $2",
    [bookingId, customerId]
  );
  return result.rows[0] || null;
};

const insertPickupRequest = async ({ bookingId, customerId, address, latitude, longitude, distance, fee }) => {
  const result = await pool.query(
    `INSERT INTO pickup_requests
     (booking_id, customer_id, pickup_address, latitude, longitude, distance_km, pickup_fee)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [bookingId, customerId, address, latitude, longitude, distance, fee]
  );
  return result.rows[0];
};

module.exports = {
  findBookingForCustomer,
  insertPickupRequest,
};