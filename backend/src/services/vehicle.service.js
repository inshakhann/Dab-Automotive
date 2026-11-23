const pool = require("../config/db");

const getVehicles = async (customerId) => {
  const result = await pool.query(
    `SELECT * FROM vehicles
     WHERE customer_id = $1 AND is_deleted = FALSE
     ORDER BY vehicle_id DESC`,
    [customerId]
  );

  return result.rows;
};

const getVehicleById = async (customerId, vehicleId) => {
  const result = await pool.query(
    `SELECT * FROM vehicles
     WHERE customer_id = $1
     AND vehicle_id = $2
     AND is_deleted = FALSE`,
    [customerId, vehicleId]
  );

  return result.rows[0] || null;
};

const createVehicle = async (customerId, vehicle) => {
  const { make, model, year, plate_no, fuel_type, mileage } = vehicle;

  const result = await pool.query(
    `INSERT INTO vehicles
     (customer_id, make, model, year, plate_no, fuel_type, mileage)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [customerId, make, model, year, plate_no, fuel_type || null, mileage ?? 0]
  );

  return result.rows[0];
};

const updateVehicle = async (customerId, vehicleId, vehicle) => {
  const { make, model, year, plate_no, fuel_type, mileage } = vehicle;

  const result = await pool.query(
    `UPDATE vehicles
     SET make = COALESCE($3, make),
         model = COALESCE($4, model),
         year = COALESCE($5, year),
         plate_no = COALESCE($6, plate_no),
         fuel_type = COALESCE($7, fuel_type),
         mileage = COALESCE($8, mileage),
         updated_at = CURRENT_TIMESTAMP
     WHERE customer_id = $1
     AND vehicle_id = $2
     AND is_deleted = FALSE
     RETURNING *`,
    [customerId, vehicleId, make, model, year, plate_no, fuel_type, mileage]
  );

  return result.rows[0] || null;
};

const deleteVehicle = async (customerId, vehicleId) => {
  const result = await pool.query(
    `UPDATE vehicles
     SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
     WHERE customer_id = $1
     AND vehicle_id = $2
     AND is_deleted = FALSE
     RETURNING vehicle_id`,
    [customerId, vehicleId]
  );

  return result.rows[0] || null;
};

module.exports = {
  getVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
};
