const pool = require("../../config/db");

const findAll = async () => {
  const result = await pool.query(`
    SELECT p.*,
      COALESCE(
        JSON_AGG(JSON_BUILD_OBJECT('service_id', s.service_id, 'name', s.name))
        FILTER (WHERE s.service_id IS NOT NULL), '[]'
      ) AS services
    FROM service_packages p
    LEFT JOIN package_services ps ON p.package_id = ps.package_id
    LEFT JOIN services s ON ps.service_id = s.service_id
    GROUP BY p.package_id
    ORDER BY p.package_id
  `);
  return result.rows;
};

const findById = async (id) => {
  const result = await pool.query(`
    SELECT p.*,
      COALESCE(
        JSON_AGG(JSON_BUILD_OBJECT('service_id', s.service_id, 'name', s.name))
        FILTER (WHERE s.service_id IS NOT NULL), '[]'
      ) AS services
    FROM service_packages p
    LEFT JOIN package_services ps ON p.package_id = ps.package_id
    LEFT JOIN services s ON ps.service_id = s.service_id
    WHERE p.package_id = $1
    GROUP BY p.package_id
  `, [id]);
  return result.rows[0] || null;
};

const insertPackageWithServices = async (name, description, price, duration, serviceIds) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const packageResult = await client.query(
      `INSERT INTO service_packages (name, description, price, estimated_duration)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description, price, duration]
    );
    const newPackage = packageResult.rows[0];
    for (const serviceId of serviceIds) {
      await client.query(
        "INSERT INTO package_services (package_id, service_id) VALUES ($1, $2)",
        [newPackage.package_id, serviceId]
      );
    }
    await client.query("COMMIT");
    return newPackage;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  findAll,
  findById,
  insertPackageWithServices,
};