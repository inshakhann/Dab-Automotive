const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./config/swagger");
const healthRoutes = require("./modules/health/health.routes");
const authRoutes = require("./modules/auth/auth.routes");
const passwordResetRoutes = require("./modules/auth/password-reset.routes");
const userRoutes = require("./modules/users/users.routes");
const serviceRoutes = require("./modules/services/service.routes");
const packageRoutes = require("./modules/packages/package.routes");
const bayRoutes = require("./modules/bays/bay.routes");
const bookingRoutes = require("./modules/bookings/booking.routes");
const customerRoutes = require("./modules/customers/customer.routes");
const vehicleRoutes = require("./modules/vehicles/vehicle.routes");
const pickupRoutes = require("./modules/pickups/pickup.routes");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Dab Automotive backend is running"
  });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/auth", passwordResetRoutes);
app.use("/api/users", userRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/bays", bayRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/pickups", pickupRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

app.use((error, req, res, next) => {
  console.error("Request error:", error.message);

  const status = error.status || 500;

  res.status(status).json({
    success: false,
    message: status >= 500 ? "Internal server error" : "Invalid request"
  });
});

module.exports = app;