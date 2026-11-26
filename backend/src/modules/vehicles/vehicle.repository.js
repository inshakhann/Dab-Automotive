const pool = require("../../config/db");

const findAllByCustomerId = async (customerId) => {
  const result = await pool.query(
    `SELECT * FROM vehicles
     WHERE customer_id = $1 AND is_deleted = FALSE
     ORDER BY vehicle_id DESC`,
    [customerId]
  );
  return result.rows;
};

const findByIdAndCustomer = async (customerId, vehicleId) => {
  const result = await pool.query(
    `SELECT * FROM vehicles
     WHERE customer_id = $1 AND vehicle_id = $2 AND is_deleted = FALSE`,
    [customerId, vehicleId]
  );
  return result.rows[0] || null;
};

const findByIdWithOwner = async (vehicleId) => {
  const result = await pool.query(
    `SELECT v.*, c.user_id, u.full_name AS owner_name, u.email AS owner_email
     FROM vehicles v
     JOIN customers c ON c.customer_id = v.customer_id
     JOIN users u ON u.id = c.user_id
     WHERE v.vehicle_id = $1 AND v.is_deleted = FALSE`,
    [vehicleId]
  );
  return result.rows[0] || null;
};

const insertVehicle = async (customerId, { make, model, year, plate_no, fuel_type, mileage }) => {
  const result = await pool.query(
    `INSERT INTO vehicles
     (customer_id, make, model, year, plate_no, fuel_type, mileage)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [customerId, make, model, year, plate_no, fuel_type || null, mileage ?? 0]
  );
  return result.rows[0];
};

const updateVehicleById = async (customerId, vehicleId, { make, model, year, plate_no, fuel_type, mileage }) => {
  const result = await pool.query(
    `UPDATE vehicles
     SET make = COALESCE($3, make),
         model = COALESCE($4, model),
         year = COALESCE($5, year),
         plate_no = COALESCE($6, plate_no),
         fuel_type = COALESCE($7, fuel_type),
         mileage = COALESCE($8, mileage),
         updated_at = CURRENT_TIMESTAMP
     WHERE customer_id = $1 AND vehicle_id = $2 AND is_deleted = FALSE
     RETURNING *`,
    [customerId, vehicleId, make, model, year, plate_no, fuel_type, mileage]
  );
  return result.rows[0] || null;
};

const countActiveBookingsForVehicle = async (vehicleId) => {
  const result = await pool.query(
    `SELECT 1 FROM service_bookings
     WHERE vehicle_id = $1 AND status IN ('pending', 'confirmed')
     LIMIT 1`,
    [vehicleId]
  );
  return result.rows.length > 0;
};

const softDeleteVehicle = async (customerId, vehicleId) => {
  const result = await pool.query(
    `UPDATE vehicles
     SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
     WHERE customer_id = $1 AND vehicle_id = $2 AND is_deleted = FALSE
     RETURNING vehicle_id`,
    [customerId, vehicleId]
  );
  return result.rows[0] || null;
};

const checkJobCardsTableExists = async () => {
  const result = await pool.query("SELECT to_regclass('public.job_cards') AS table_name");
  return Boolean(result.rows[0]?.table_name);
};

const findHistoryWithJobCards = async (vehicleId) => {
  const result = await pool.query(
    `SELECT b.booking_id, b.booking_reference, b.start_time AS service_date, b.end_time,
            b.status AS booking_status, b.job_card_created,
            p.package_id, p.name AS package_name, p.description AS package_description,
            p.price AS service_cost, wb.bay_name, pr.pickup_fee,
            jc.job_card_id, jc.status AS job_status, jc.complaint AS mechanic_notes, jc.completed_at
     FROM service_bookings b
     JOIN service_packages p ON p.package_id = b.package_id
     LEFT JOIN workshop_bays wb ON wb.bay_id = b.bay_id
     LEFT JOIN pickup_requests pr ON pr.booking_id = b.booking_id
     LEFT JOIN job_cards jc ON jc.booking_id = b.booking_id
     WHERE b.vehicle_id = $1 AND b.status IN ('completed', 'confirmed', 'pending')
     ORDER BY b.start_time DESC`,
    [vehicleId]
  );
  return result.rows;
};

const findHistoryFromBookings = async (vehicleId) => {
  const result = await pool.query(
    `SELECT b.booking_id, b.booking_reference, b.start_time AS service_date, b.end_time,
            b.status AS booking_status, b.job_card_created,
            p.package_id, p.name AS package_name, p.description AS package_description,
            p.price AS service_cost, wb.bay_name, pr.pickup_fee,
            COALESCE(
              (
                SELECT json_agg(
                  json_build_object('service_id', s.service_id, 'name', s.name, 'price', s.price)
                )
                FROM package_services ps
                JOIN services s ON s.service_id = ps.service_id
                WHERE ps.package_id = p.package_id
              ),
              '[]'::json
            ) AS services_included
     FROM service_bookings b
     JOIN service_packages p ON p.package_id = b.package_id
     LEFT JOIN workshop_bays wb ON wb.bay_id = b.bay_id
     LEFT JOIN pickup_requests pr ON pr.booking_id = b.booking_id
     WHERE b.vehicle_id = $1 AND b.status IN ('completed', 'confirmed', 'pending')
     ORDER BY b.start_time DESC`,
    [vehicleId]
  );
  return result.rows;
};

module.exports = {
  findAllByCustomerId,
  findByIdAndCustomer,
  findByIdWithOwner,
  insertVehicle,
  updateVehicleById,
  countActiveBookingsForVehicle,
  softDeleteVehicle,
  checkJobCardsTableExists,
  findHistoryWithJobCards,
  findHistoryFromBookings,
};