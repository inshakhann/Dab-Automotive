// FILE: src/app.js
const express = require("express");
const path = require("path");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/users/users.routes");

// Sana's Workforce Modules
const workersRoutes = require("./modules/workforce/workers/workers.routes");
const jobsRoutes = require("./modules/workforce/jobs/jobs.routes");
const invoicesRoutes = require("./modules/workforce/invoices/invoices.routes");

// Controllers & Middleware for SRS Table 21 Direct Endpoints
const workersController = require("./modules/workforce/workers/workers.controller");
const jobsController = require("./modules/workforce/jobs/jobs.controller");
const authenticate = require("./middleware/authenticate");
const authorize = require("./middleware/authorize");

const app = express();

// CORS Middleware (Frontend integration ke liye)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.CLIENT_URL || "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static folder for uploaded job photos
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Basic welcome route
app.get("/", (req, res) => {
  res.json({
    message: "Dab Automotive backend is running",
  });
});

// Core & Auth Routes
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// --- SANA KE ROUTES (Existing /api/workforce/* Paths) ---
app.use("/api/workforce/workers", workersRoutes);
app.use("/api/workforce/jobs", jobsRoutes);
app.use("/api/workforce/invoices", invoicesRoutes);

// --- SRS TABLE 21 STANDARD ENDPOINT ALIASES ---
app.use("/api/workers", workersRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/invoices", invoicesRoutes);

app.post("/api/attendance/check-in", authenticate, authorize("mechanic"), workersController.checkIn);
app.post("/api/attendance/check-out", authenticate, authorize("mechanic"), workersController.checkOut);
app.get("/api/vehicles/:vehicleId/history", authenticate, authorize("customer", "owner", "administrator"), jobsController.getVehicleHistory);
app.get("/api/dashboard/mechanic", authenticate, authorize("mechanic"), jobsController.getMechanicDashboard);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Shared Error Handler
app.use((error, req, res, next) => {
  console.error("Request error:", error.message);

  // Multer file upload errors (5MB limit ya invalid file type)
  if (error.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message:
        error.code === "LIMIT_FILE_SIZE"
          ? "File size exceeds the 5MB limit."
          : error.message,
    });
  }

  if (error.message === "Only image files are allowed!") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  const status = error.status || error.statusCode || 500;

  res.status(status).json({
    success: false,
    message: status >= 500 ? "Internal server error" : error.message || "Invalid request",
  });
});

module.exports = app;