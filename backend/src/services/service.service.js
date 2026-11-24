const pool = require("../config/db");

const getAllServices = async () => {
  const result = await pool.query(
    "SELECT * FROM services ORDER BY service_id"
  );

  return result.rows;
};

const getServiceById = async (id) => {
  const result = await pool.query(
    "SELECT * FROM services WHERE service_id = $1",
    [id]
  );

  return result.rows[0] || null;
};

const createService = async (name, description, price, duration) => {
  const result = await pool.query(
    `INSERT INTO services (name, description, price, estimated_duration)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, description, price, duration]
  );

  return result.rows[0];
};

const updateService = async (id, name, description, price, duration) => {
  const result = await pool.query(
    `UPDATE services
     SET name = $2,
         description = $3,
         price = $4,
         estimated_duration = $5,
         updated_at = CURRENT_TIMESTAMP
     WHERE service_id = $1
     RETURNING *`,
    [id, name, description, price, duration]
  );

  return result.rows[0] || null;
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService
};
