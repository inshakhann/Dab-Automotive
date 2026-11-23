const pool = require("../config/db");

const getCustomerByUserId = async (userId) => {
  const result = await pool.query(
    "SELECT customer_id, user_id, address, city, created_at, updated_at FROM customers WHERE user_id = $1",
    [userId]
  );

  return result.rows[0] || null;
};

const createCustomer = async (userId, address, city) => {
  const result = await pool.query(
    `INSERT INTO customers (user_id, address, city)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO NOTHING
     RETURNING customer_id, user_id, address, city, created_at, updated_at`,
    [userId, address, city]
  );

  return result.rows[0] || null;
};

const updateCustomer = async (userId, address, city) => {
  const result = await pool.query(
    `UPDATE customers
     SET address = $2, city = $3, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING customer_id, user_id, address, city, created_at, updated_at`,
    [userId, address, city]
  );

  return result.rows[0] || null;
};

module.exports = {
  getCustomerByUserId,
  createCustomer,
  updateCustomer,
};
