const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
});

const bcrypt = require("bcrypt");
const pool = require("../src/config/db");

async function seedOwner() {
  let client;

  try {
    const name = process.env.BOOTSTRAP_OWNER_NAME?.trim();
    const email = process.env.BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase();
    const phone = process.env.BOOTSTRAP_OWNER_PHONE?.trim();
    const password = process.env.BOOTSTRAP_OWNER_PASSWORD;

    if (
      !name ||
      name.length < 2 ||
      name.length > 100 ||
      !email ||
      email.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !phone ||
      !/^\+?[0-9 ()-]{7,30}$/.test(phone) ||
      !password ||
      password.length < 12 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      throw new Error(
        "Check BOOTSTRAP_OWNER values in .env. Password must be at least 12 characters and at most 72 bytes.",
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    client = await pool.connect();
    await client.query("BEGIN");

    // Prevent two copies of this setup script running together.
    await client.query("SELECT pg_advisory_xact_lock(874231)");

    const existingAdmin = await client.query(
      `SELECT u.id
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE r.name IN ('owner', 'administrator')
       LIMIT 1`,
    );

    if (existingAdmin.rowCount > 0) {
      await client.query("COMMIT");
      console.log("An Owner/Admin already exists. Nothing changed.");
      return;
    }

    const existingEmail = await client.query(
      "SELECT id FROM users WHERE LOWER(email) = $1",
      [email],
    );

    if (existingEmail.rowCount > 0) {
      throw new Error(
        "That email already belongs to an account. Use a different Owner email. Existing accounts will not be promoted.",
      );
    }

    const role = await client.query(
      "SELECT id FROM roles WHERE name = 'owner'",
    );

    if (role.rowCount !== 1) {
      throw new Error("Owner role is missing. Run migrations first.");
    }

    const result = await client.query(
      `INSERT INTO users (
         full_name,
         email,
         phone,
         password_hash,
         role_id,
         status
       )
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING id, full_name, email, status`,
      [name, email, phone, passwordHash, role.rows[0].id],
    );

    const owner = result.rows[0];

    await client.query(
      `INSERT INTO audit_logs (
         actor_user_id, action, entity_type, entity_id, details
       )
       VALUES ($1, 'owner.bootstrap', 'user', $1, $2::jsonb)`,
      [owner.id, JSON.stringify({ source: "local setup script" })],
    );

    await client.query("COMMIT");

    console.log("Owner account created successfully:");
    console.log(owner);
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
    }

    console.error("Owner setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (client) {
      client.release();
    }

    await pool.end();
  }
}

seedOwner();
