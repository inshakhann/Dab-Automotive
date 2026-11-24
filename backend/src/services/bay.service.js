const pool = require("../config/db");

const getAllBays = async () => {
  const result = await pool.query(
    "SELECT * FROM workshop_bays ORDER BY bay_id"
  );

  return result.rows;
};

const createBay = async (name, description) => {
  const result = await pool.query(
    `INSERT INTO workshop_bays (bay_name, description)
     VALUES ($1, $2)
     RETURNING *`,
    [name, description]
  );

  return result.rows[0];
};

module.exports = {
  getAllBays,
  createBay
};
