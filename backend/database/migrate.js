const fs = require("fs");
const path = require("path");

// Load backend/.env regardless of the terminal location.
require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
});

const pool = require("../src/config/db");

async function runMigrations() {
  let client;

  try {
    client = await pool.connect();

    // Records which migration files have already run.
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrationsFolder = path.join(__dirname, "migrations");

    const files = fs
      .readdirSync(migrationsFolder)
      .filter((filename) => filename.endsWith(".sql"))
      .sort();

    for (const filename of files) {
      await client.query("BEGIN");

      try {
        // Prevent two migration runners from applying a file together.
        await client.query("LOCK TABLE schema_migrations IN EXCLUSIVE MODE");

        const existing = await client.query(
          "SELECT filename FROM schema_migrations WHERE filename = $1",
          [filename],
        );

        if (existing.rowCount > 0) {
          await client.query("COMMIT");
          console.log(`Already applied: ${filename}`);
          continue;
        }

        const sql = fs.readFileSync(
          path.join(migrationsFolder, filename),
          "utf8",
        );

        await client.query(sql);

        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [filename],
        );

        await client.query("COMMIT");

        console.log(`Applied: ${filename}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    console.log("Database migrations completed.");
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (client) {
      client.release();
    }

    await pool.end();
  }
}

runMigrations();
