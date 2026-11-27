const express = require("express");
const pool = require("../../config/db");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database"
    );

    res.status(200).json({
      success: true,
      message: "Backend and PostgreSQL are connected",
      database: result.rows[0].database,
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);

    res.status(503).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

module.exports = router;