const { Pool } = require("pg");

// Reads PGHOST, PGPORT, PGDATABASE, PGUSER,
// and PGPASSWORD from the environment.
const pool = new Pool({
  connectionTimeoutMillis: 5000,
});

// Handle errors from idle database connections.
pool.on("error", (error) => {
  console.error("Database connection error:", error.message);
});

module.exports = pool;