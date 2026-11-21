const express = require("express");
const healthRoutes = require("./routes/health.routes");

const app = express();

// Allows the backend to read JSON request bodies.
app.use(express.json());

// Basic welcome route.
app.get("/", (req, res) => {
  res.json({
    message: "Dab Automotive backend is running",
  });
});

// Database connection check.
app.use("/api/health", healthRoutes);

// Handle URLs that do not exist.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Shared error handler.
app.use((error, req, res, next) => {
  console.error("Request error:", error.message);

  const status = error.status || 500;

  res.status(status).json({
    success: false,
    message:
      status >= 500 ? "Internal server error" : "Invalid request",
  });
});

module.exports = app;