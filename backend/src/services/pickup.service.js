const pool = require("../config/db");
const { calculateDistanceKm } = require("../adapters/maps.adapter");

const createPickupRequest = async (customerId, bookingId, address, latitude, longitude) => {
  if (!address || !address.trim()) {
    throw new Error("Pickup address is required");
  }

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("Invalid pickup latitude");
  }

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("Invalid pickup longitude");
  }

  const workshopLatitude = Number(process.env.WORKSHOP_LATITUDE);
  const workshopLongitude = Number(process.env.WORKSHOP_LONGITUDE);
  const feePerKm = Number(process.env.PICKUP_FEE_PER_KM);

  if (
    !Number.isFinite(workshopLatitude) ||
    workshopLatitude < -90 ||
    workshopLatitude > 90 ||
    !Number.isFinite(workshopLongitude) ||
    workshopLongitude < -180 ||
    workshopLongitude > 180 ||
    !Number.isFinite(feePerKm) ||
    feePerKm < 0
  ) {
    throw new Error("Workshop location or pickup fee configuration is missing");
  }

  const bookingResult = await pool.query(
    `SELECT booking_id, status
     FROM service_bookings
     WHERE booking_id = $1 AND customer_id = $2`,
    [bookingId, customerId]
  );

  if (bookingResult.rows.length === 0) {
    throw new Error("Booking not found");
  }

  if (!["pending", "confirmed"].includes(bookingResult.rows[0].status)) {
    throw new Error("Pickup is not available for this booking");
  }

  const distance = calculateDistanceKm(
    latitude,
    longitude,
    workshopLatitude,
    workshopLongitude
  );

  const fee = Number((distance * feePerKm).toFixed(2));

  const result = await pool.query(
    `INSERT INTO pickup_requests
     (booking_id, customer_id, pickup_address, latitude, longitude, distance_km, pickup_fee)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [bookingId, customerId, address.trim(), latitude, longitude, distance, fee]
  );

  return result.rows[0];
};

module.exports = {
  createPickupRequest
};
