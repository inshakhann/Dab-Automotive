const express = require("express");
const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/users/users.routes");
const passwordResetRoutes = require("./modules/auth/password-reset.routes");
const auditRoutes = require("./modules/audit/audit.routes");
const settingsRoutes = require("./modules/settings/settings.routes");
const expenseRoutes = require("./modules/expenses/expenses.routes");
const reportRoutes = require("./modules/reports/reports.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");
const swaggerUi = require("swagger-ui-express");
const openapi = require("../docs/openapi.json");
const app = express();
app.disable("x-powered-by");

// Allows the backend to read JSON request bodies.
app.use(express.json({ limit: "64kb" }));

// Basic welcome route.
app.get("/", (req, res) => {
  res.json({
    message: "Dab Automotive backend is running",
  });
});

// Database connection check.
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", passwordResetRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.get("/api/openapi.json", (req, res) => res.json(openapi));
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(openapi, {
    swaggerOptions: { persistAuthorization: false },
  }),
);
// Handle URLs that do not exist.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Public validation errors are readable; internal database details stay server-side.
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const candidate = error.statusCode || error.status || 500;
  const status =
    Number.isInteger(candidate) && candidate >= 400 && candidate <= 599
      ? candidate
      : 500;
  if (status >= 500) console.error("Request failed:", error.code || error.name);
  let message = status >= 500 ? "Internal server error" : error.message;
  if (error.type === "entity.parse.failed")
    message =
      "Invalid JSON. Use double-quoted field names and valid JSON values.";
  if (error.type === "entity.too.large") message = "Request body is too large.";
  res.status(status).json({ success: false, message });
});
module.exports = app;
