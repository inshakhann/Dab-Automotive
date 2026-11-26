// Load .env before importing the database or application.
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

require("./config/encryption").encryptionKey();
const app = require("./app");
const pool = require("./config/db");

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    // Check the database before starting the API server.
    await pool.query("SELECT 1");

    console.log("PostgreSQL connected successfully");

    const server = app.listen(PORT, () => {
      console.log(`Backend running at http://localhost:${PORT}`);
    });

    for (const signal of ["SIGINT", "SIGTERM"]) {
      process.once(signal, () => {
        server.close(async () => {
          await pool.end();
          process.exit(0);
        });
        setTimeout(() => process.exit(1), 10000).unref();
      });
    }
    server.on("error", (error) => {
      console.error("Server failed to start:", error.message);
      process.exit(1);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
}

startServer();
