// Runs in an isolated temporary schema, only in an explicitly named *_test database.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync, spawn } = require("node:child_process");
const { Pool } = require("pg");
const root = path.join(__dirname, "..");
const password = "IntegrationOnly@2026";
let base, db, appPool, server, schema, owner, admin, customer, mechanic;
const delivered = [];
function command(script, extra = {}) {
  const r = spawnSync(process.execPath, [script], {
    cwd: root,
    env: { ...process.env, ...extra },
    encoding: "utf8",
    timeout: 30000,
  });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return r.stdout;
}
async function api(method, url, token, body, expected = 200) {
  const r = await fetch(base + url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const value = await r.json();
  assert.equal(
    r.status,
    expected,
    `${method} ${url}: ${JSON.stringify(value)}`,
  );
  return value;
}
async function login(email, pass = password, expected = 200) {
  return api(
    "POST",
    "/api/auth/login",
    null,
    { email, password: pass },
    expected,
  );
}
async function adminCreate(role, email) {
  const result = await api(
    "POST",
    "/api/users",
    owner.token,
    { full_name: `Test ${role}`, email, phone: "03000000000", password, role },
    201,
  );
  const session = await login(email);
  return { ...result.user, token: session.access_token };
}
async function register(email, role = "customer") {
  return (
    await api(
      "POST",
      "/api/auth/register",
      null,
      { full_name: "Test User", email, phone: "03000000000", password, role },
      201,
    )
  ).user;
}
async function otpRequest(email) {
  const before = delivered.length;
  await api("POST", "/api/auth/forgot-password", null, { email }, 202);
  const until = Date.now() + 5000;
  while (delivered.length === before && Date.now() < until)
    await new Promise((r) => setTimeout(r, 20));
  assert.ok(
    delivered.length > before,
    "OTP delivery stub should receive a code",
  );
  return delivered.at(-1).otp;
}
async function reset(email, otp, expected = 200) {
  return api(
    "POST",
    "/api/auth/reset-password",
    null,
    {
      email,
      otp,
      new_password: "ReplacementPass@2026",
      confirm_password: "ReplacementPass@2026",
    },
    expected,
  );
}
test("Dab Automotive PostgreSQL and HTTP integration", async (t) => {
  const raw = process.env.TEST_DATABASE_URL;
  assert.ok(
    raw,
    "Set TEST_DATABASE_URL to a disposable PostgreSQL database ending in _test.",
  );
  const url = new URL(raw);
  assert.match(
    decodeURIComponent(url.pathname.slice(1)),
    /_test$/,
    "Refusing a database whose name does not end in _test.",
  );
  db = new Pool({ connectionString: raw });
  schema = "insha_test_" + crypto.randomBytes(6).toString("hex");
  await db.query(`CREATE SCHEMA ${schema}`);
  Object.assign(process.env, {
    NODE_ENV: "test",
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGOPTIONS: `-c search_path=${schema}`,
    JWT_SECRET: crypto.randomBytes(32).toString("hex"),
    OTP_SECRET: crypto.randomBytes(32).toString("hex"),
    SETTINGS_ENCRYPTION_KEY: crypto.randomBytes(32).toString("hex"),
    MAIL_MODE: "test",
    BOOTSTRAP_OWNER_NAME: "Integration Owner",
    BOOTSTRAP_OWNER_EMAIL: "owner.integration@example.com",
    BOOTSTRAP_OWNER_PHONE: "03000000000",
    BOOTSTRAP_OWNER_PASSWORD: password,
  });
  if (url.searchParams.has("sslmode"))
    process.env.PGSSLMODE = url.searchParams.get("sslmode");
  try {
    command("database/migrate.js");
    command("database/migrate.js");
    command("database/seed-owner.js");
    assert.match(command("database/seed-owner.js"), /Nothing changed/);
    const email = require("../src/integrations/email.service");
    email.sendPasswordResetOtp = async (email, otp) => {
      delivered.push({ email, otp });
    };
    email.sendStaffDecisionEmail = async () => {};
    const app = require("../src/app");
    appPool = require("../src/config/db");
    server = await new Promise((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    base = `http://127.0.0.1:${server.address().port}`;
    const ownerLogin = await login(process.env.BOOTSTRAP_OWNER_EMAIL);
    owner = { ...ownerLogin.user, token: ownerLogin.access_token };
    admin = await adminCreate("administrator", "admin.integration@example.com");
    customer = await adminCreate(
      "customer",
      "customer.integration@example.com",
    );
    mechanic = await adminCreate(
      "mechanic",
      "mechanic.integration@example.com",
    );
    await t.test(
      "fresh migrations, reruns and bootstrap are safe",
      async () => {
        assert.equal(
          (
            await appPool.query(
              "SELECT COUNT(*)::integer AS n FROM schema_migrations",
            )
          ).rows[0].n,
          6,
        );
        assert.equal(
          (
            await appPool.query(
              "SELECT COUNT(*)::integer AS n FROM users WHERE email=$1",
              [owner.email],
            )
          ).rows[0].n,
          1,
        );
        await api("GET", "/api/health");
      },
    );
    await t.test(
      "upgrade from migrations 001-005 preserves existing accounts",
      async () => {
        const legacy = schema + "_legacy";
        await db.query(`CREATE SCHEMA ${legacy}`);
        const old = new Pool({
          connectionString: raw,
          options: `-c search_path=${legacy}`,
        });
        try {
          await old.query(
            "CREATE TABLE schema_migrations(filename TEXT PRIMARY KEY,applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)",
          );
          for (const file of fs
            .readdirSync(path.join(root, "database/migrations"))
            .sort()
            .filter((n) => n.endsWith(".sql") && n < "006")) {
            await old.query(
              fs.readFileSync(
                path.join(root, "database/migrations", file),
                "utf8",
              ),
            );
            await old.query(
              "INSERT INTO schema_migrations(filename) VALUES($1)",
              [file],
            );
          }
          await old.query(
            "INSERT INTO users(full_name,email,phone,password_hash,role_id) SELECT 'Preserved','preserved@example.com','03000000000','old-hash',id FROM roles WHERE name='customer'",
          );
          command("database/migrate.js", {
            PGOPTIONS: `-c search_path=${legacy}`,
          });
          const row = (
            await old.query(
              "SELECT id,password_hash FROM users WHERE email='preserved@example.com'",
            )
          ).rows[0];
          assert.equal(row.id, 1);
          assert.equal(row.password_hash, "old-hash");
        } finally {
          await old.end();
          await db.query(`DROP SCHEMA ${legacy} CASCADE`);
        }
      },
    );
    await t.test(
      "registration validates, prevents privileged signup and duplicate email",
      async () => {
        const u = await register("public.integration@example.com");
        assert.equal(u.role, "customer");
        await api(
          "POST",
          "/api/auth/register",
          null,
          {
            full_name: "Test User",
            email: "PUBLIC.integration@example.com",
            phone: "03000000000",
            password,
            role: "customer",
          },
          409,
        );
        await api(
          "POST",
          "/api/auth/register",
          null,
          {
            full_name: "Test User",
            email: "bad.integration@example.com",
            phone: "03000000000",
            password,
            role: "owner",
          },
          400,
        );
        await api("GET", "/api/users/me", null, undefined, 401);
        await api("GET", "/api/users", customer.token, undefined, 403);
      },
    );
    await t.test(
      "account creation and editing are protected, audited and reject mass assignment",
      async () => {
        await api(
          "POST",
          "/api/users",
          customer.token,
          {
            full_name: "No Permission",
            email: "no@example.com",
            phone: "03000000000",
            password,
            role: "owner",
          },
          403,
        );
        await api(
          "PUT",
          `/api/users/${customer.id}`,
          admin.token,
          { role: "owner" },
          400,
        );
        await api("PUT", `/api/users/${customer.id}`, admin.token, {
          full_name: "Edited Customer",
        });
        await api("GET", "/api/users/me", customer.token, undefined, 401);
        customer.token = (await login(customer.email)).access_token;
        assert.equal(
          (await api("GET", `/api/users/${customer.id}`, owner.token)).user
            .full_name,
          "Edited Customer",
        );
        await api(
          "PUT",
          `/api/users/${customer.id}`,
          owner.token,
          { email: owner.email },
          409,
        );
        assert.equal(
          (await api("GET", `/api/users/${customer.id}`, owner.token)).user
            .email,
          customer.email,
        );
      },
    );
    await t.test(
      "profile updates persist with no privilege escalation",
      async () => {
        await api("PUT", "/api/users/me", customer.token, {
          full_name: "Own Profile",
          preferred_language: "ur",
        });
        assert.equal(
          (await api("GET", "/api/users/me", customer.token)).user
            .preferred_language,
          "ur",
        );
        await api(
          "PUT",
          "/api/users/me",
          customer.token,
          { preferred_language: "fr" },
          400,
        );
        await api(
          "PUT",
          "/api/users/me",
          customer.token,
          { role: "owner" },
          400,
        );
      },
    );
    await t.test(
      "staff approval and rejection enforce pending registration",
      async () => {
        const pending = await register(
          "pending.integration@example.com",
          "mechanic",
        );
        await login(pending.email, password, 403);
        await api(
          "PUT",
          `/api/users/${pending.id}/role`,
          owner.token,
          { role: "mechanic" },
          409,
        );
        await api(
          "PUT",
          `/api/users/${pending.id}/staff-decision`,
          owner.token,
          { decision: "approve" },
        );
        assert.equal((await login(pending.email)).user.role, "mechanic");
        const rejected = await register(
          "rejected.integration@example.com",
          "store_manager",
        );
        await api(
          "PUT",
          `/api/users/${rejected.id}/staff-decision`,
          admin.token,
          { decision: "reject" },
        );
        await login(rejected.email, password, 403);
        await api(
          "PUT",
          `/api/users/${rejected.id}/status`,
          owner.token,
          { status: "active" },
          409,
        );
      },
    );
    await t.test(
      "role updates revoke tokens and protect self and last owner",
      async () => {
        await api("PUT", `/api/users/${mechanic.id}/role`, owner.token, {
          role: "store_manager",
        });
        await api("GET", "/api/users/me", mechanic.token, undefined, 401);
        mechanic.token = (await login(mechanic.email)).access_token;
        await api(
          "PUT",
          `/api/users/${customer.id}/role`,
          mechanic.token,
          { role: "mechanic" },
          403,
        );
        await api(
          "PUT",
          `/api/users/${mechanic.id}/role`,
          owner.token,
          { role: "store_manager" },
          409,
        );
        await api(
          "PUT",
          `/api/users/${mechanic.id}/role`,
          owner.token,
          { role: "invalid" },
          400,
        );
        await api(
          "PUT",
          `/api/users/${owner.id}/role`,
          owner.token,
          { role: "mechanic" },
          403,
        );
        await api(
          "PUT",
          `/api/users/${owner.id}/role`,
          admin.token,
          { role: "mechanic" },
          409,
        );
        await api(
          "PUT",
          `/api/users/${owner.id}/status`,
          admin.token,
          { status: "inactive" },
          409,
        );
        await api("PUT", `/api/users/${mechanic.id}/role`, owner.token, {
          role: "mechanic",
        });
        mechanic.token = (await login(mechanic.email)).access_token;
      },
    );
    await t.test(
      "status changes prevent inactive login and revoke old sessions",
      async () => {
        await api("PUT", `/api/users/${mechanic.id}/status`, owner.token, {
          status: "inactive",
        });
        await login(mechanic.email, password, 403);
        await api("GET", "/api/users/me", mechanic.token, undefined, 403);
        await api("PUT", `/api/users/${mechanic.id}/status`, owner.token, {
          status: "active",
        });
        await api("GET", "/api/users/me", mechanic.token, undefined, 401);
        mechanic.token = (await login(mechanic.email)).access_token;
      },
    );
    await t.test(
      "five wrong passwords lock account and expiry permits a fresh login",
      async () => {
        for (let i = 0; i < 4; i++)
          await login(customer.email, "wrong-password", 401);
        await login(customer.email, "wrong-password", 429);
        await login(customer.email, password, 429);
        await appPool.query(
          "UPDATE users SET locked_until=clock_timestamp()-INTERVAL '1 second' WHERE id=$1",
          [customer.id],
        );
        customer.token = (await login(customer.email)).access_token;
      },
    );
    await t.test(
      "OTP replacement, single use and JWT invalidation",
      async () => {
        const user = await register("otp.integration@example.com");
        const token = (await login(user.email)).access_token;
        const old = await otpRequest(user.email);
        await appPool.query(
          "UPDATE otp_tokens SET created_at=clock_timestamp()-INTERVAL '61 seconds' WHERE user_id=$1",
          [user.id],
        );
        const current = await otpRequest(user.email);
        assert.ok(
          (
            await appPool.query(
              "SELECT used_at FROM otp_tokens WHERE user_id=$1 ORDER BY id LIMIT 1",
              [user.id],
            )
          ).rows[0].used_at,
        );
        if (old !== current) await reset(user.email, old, 400);
        await reset(user.email, current);
        await reset(user.email, current, 400);
        await login(user.email, password, 401);
        await login(user.email, "ReplacementPass@2026");
        await api("GET", "/api/users/me", token, undefined, 401);
      },
    );
    await t.test(
      "OTP expiry, attempt limit, cooldown and hourly cap",
      async () => {
        const user = await register("expiry.integration@example.com");
        let code = await otpRequest(user.email);
        await appPool.query(
          "UPDATE otp_tokens SET created_at=clock_timestamp()-INTERVAL '11 minutes',expires_at=clock_timestamp()-INTERVAL '1 minute' WHERE user_id=$1",
          [user.id],
        );
        await reset(user.email, code, 400);
        code = await otpRequest(user.email);
        for (let i = 0; i < 5; i++)
          await reset(user.email, code === "000000" ? "000001" : "000000", 400);
        await reset(user.email, code, 400);
        const countBefore = delivered.length;
        await require("../src/modules/auth/password-reset.service").requestPasswordReset(
          user.email,
        );
        assert.equal(delivered.length, countBefore);
        await appPool.query(
          "UPDATE otp_tokens SET created_at=clock_timestamp()-INTERVAL '61 seconds' WHERE user_id=$1 AND expires_at>clock_timestamp()",
          [user.id],
        );
        await require("../src/modules/auth/password-reset.service").requestPasswordReset(
          user.email,
        );
        assert.equal(delivered.length, countBefore + 1);
        await appPool.query(
          "UPDATE otp_tokens SET created_at=clock_timestamp()-INTERVAL '61 seconds' WHERE user_id=$1 AND expires_at>clock_timestamp()",
          [user.id],
        );
        await require("../src/modules/auth/password-reset.service").requestPasswordReset(
          user.email,
        );
        assert.equal(delivered.length, countBefore + 1);
      },
    );
    await t.test(
      "audit API enforces admin access, filters, pagination and date validation",
      async () => {
        await api("GET", "/api/audit-logs", owner.token, undefined, 403);
        await api("GET", "/api/audit-logs", customer.token, undefined, 403);
        const logs = await api(
          "GET",
          `/api/audit-logs?action=user.role.update&entity_id=${mechanic.id}&actor_user_id=${owner.id}&limit=1`,
          admin.token,
        );
        assert.equal(logs.total, 2);
        assert.equal(logs.logs.length, 1);
        assert.equal(typeof logs.logs[0].id, "string");
        const empty = await api(
          "GET",
          "/api/audit-logs?page=10000",
          admin.token,
        );
        assert.equal(empty.logs.length, 0);
        assert.ok(empty.total > 0);
        for (const query of [
          "limit=101",
          "page=0",
          "page=1&page=2",
          "start_date=2026-02-30",
          "start_date=2026-12-01&end_date=2026-11-01",
          "bad=1",
        ])
          await api(
            "GET",
            "/api/audit-logs?" + query,
            admin.token,
            undefined,
            400,
          );
        await api("DELETE", "/api/audit-logs/1", admin.token, undefined, 404);
      },
    );
    await t.test(
      "settings are encrypted, masked, validated and audited without secrets",
      async () => {
        await api("GET", "/api/settings", owner.token, undefined, 403);
        const result = await api("PUT", "/api/settings", admin.token, {
          settings: {
            "maps.api_key": "integration-secret-123",
            "agents.booking.enabled": true,
            "bert.base_url": "http://localhost:8000",
          },
        });
        assert.equal(
          result.settings.find((s) => s.key === "maps.api_key").value,
          "********",
        );
        const stored = (
          await appPool.query(
            "SELECT * FROM system_settings WHERE key='maps.api_key'",
          )
        ).rows[0];
        assert.equal(stored.value, null);
        assert.ok(!stored.encrypted_value.includes("integration-secret-123"));
        assert.equal(
          await require("../src/modules/settings/settings.service").getSetting(
            "maps.api_key",
          ),
          "integration-secret-123",
        );
        assert.ok(
          !JSON.stringify(
            (
              await appPool.query(
                "SELECT details FROM audit_logs WHERE action='settings.update'",
              )
            ).rows,
          ).includes("integration-secret-123"),
        );
        await api(
          "PUT",
          "/api/settings",
          admin.token,
          {
            settings: {
              "workshop.name": "Should roll back",
              "unknown.key": "bad",
            },
          },
          400,
        );
        assert.equal(
          await require("../src/modules/settings/settings.service").getSetting(
            "workshop.name",
          ),
          "Dab Automotive",
        );
        await api(
          "PUT",
          "/api/settings",
          admin.token,
          { settings: { "maps.api_key": "********" } },
          400,
        );
        await api("PUT", "/api/settings", admin.token, {
          settings: { "maps.api_key": null },
        });
        assert.equal(
          await require("../src/modules/settings/settings.service").getSetting(
            "maps.api_key",
          ),
          null,
        );
      },
    );
    await t.test(
      "expense CRUD validates money, uses permissions and preserves deletion audit",
      async () => {
        const body = {
          title: "Workshop rent",
          category: "rent",
          amount: "100.10",
          expense_date: "2026-10-20",
          notes: "Integration fixture",
        };
        await api("POST", "/api/expenses", admin.token, body, 403);
        await api("GET", "/api/expenses", customer.token, undefined, 403);
        const created = (
          await api("POST", "/api/expenses", owner.token, body, 201)
        ).expense;
        assert.equal(created.amount, "100.10");
        const changed = (
          await api("PUT", `/api/expenses/${created.id}`, owner.token, {
            amount: "200.20",
            notes: "",
          })
        ).expense;
        assert.equal(changed.amount, "200.20");
        assert.equal(changed.notes, "");
        assert.equal(
          (await api("GET", "/api/expenses?category=rent&limit=1", admin.token))
            .total,
          1,
        );
        for (const amount of ["0", "-1", "1.001", "1e3", 1.25])
          await api(
            "POST",
            "/api/expenses",
            owner.token,
            { ...body, amount },
            400,
          );
        await api(
          "POST",
          "/api/expenses",
          owner.token,
          { ...body, expense_date: "2026-02-30" },
          400,
        );
        await api("DELETE", `/api/expenses/${created.id}`, owner.token);
        await api(
          "GET",
          `/api/expenses/${created.id}`,
          owner.token,
          undefined,
          404,
        );
        assert.ok(
          (
            await appPool.query("SELECT deleted_at FROM expenses WHERE id=$1", [
              created.id,
            ])
          ).rows[0].deleted_at,
        );
        assert.equal(
          (
            await appPool.query(
              "SELECT COUNT(*)::integer AS n FROM audit_logs WHERE entity_type='expense' AND entity_id=$1",
              [created.id],
            )
          ).rows[0].n,
          3,
        );
      },
    );
    await t.test(
      "reports mark absent teammate data unavailable, not zero profit",
      async () => {
        const r = await api(
          "GET",
          "/api/reports/profit-loss?start_date=2026-11-01&end_date=2026-11-30",
          owner.token,
        );
        assert.equal(r.report.complete, false);
        assert.equal(r.report.revenue, null);
        assert.equal(r.report.net_profit_loss, null);
        assert.equal(r.report.missing_integrations.length, 2);
        const dashboard = (
          await api(
            "GET",
            "/api/dashboard/admin?start_date=2026-11-01&end_date=2026-11-30",
            admin.token,
          )
        ).dashboard;
        assert.equal(dashboard.complete, false);
        assert.equal(dashboard.health.database, "connected");
        assert.ok(dashboard.administration);
        await api(
          "GET",
          "/api/dashboard/admin?start_date=2026-11-01&end_date=2026-11-30",
          customer.token,
          undefined,
          403,
        );
      },
    );
    await t.test(
      "connected fixture views produce exact totals, refunds and role-specific dashboards",
      async () => {
        await appPool.query(
          fs.readFileSync(
            path.join(__dirname, "reporting-fixtures.sql"),
            "utf8",
          ),
        );
        await api(
          "POST",
          "/api/expenses",
          owner.token,
          {
            title: "Report fixture",
            category: "utilities",
            amount: "100.10",
            expense_date: "2026-11-25",
          },
          201,
        );
        const r = (
          await api(
            "GET",
            "/api/reports/profit-loss?start_date=2026-11-01&end_date=2026-11-30",
            owner.token,
          )
        ).report;
        assert.equal(r.complete, true);
        assert.equal(r.revenue, "1250.00");
        assert.equal(r.expenses.total, "100.10");
        assert.equal(r.net_profit_loss, "1149.90");
        const d = (
          await api(
            "GET",
            "/api/dashboard/admin?start_date=2026-11-01&end_date=2026-11-30",
            owner.token,
          )
        ).dashboard;
        assert.equal(d.complete, true);
        assert.equal(d.operations.bays.data.active, 1);
        assert.equal(d.administration, undefined);
        const empty = (
          await api(
            "GET",
            "/api/reports/profit-loss?start_date=2020-01-01&end_date=2020-01-01",
            owner.token,
          )
        ).report;
        assert.equal(empty.complete, true);
        assert.equal(empty.net_profit_loss, "0.00");
        await appPool.query(
          "INSERT INTO test_store_receipts VALUES ('wrong-currency',1.00,'USD','2026-11-25T00:00:00Z')",
        );
        await api(
          "GET",
          "/api/reports/profit-loss?start_date=2026-11-01&end_date=2026-11-30",
          owner.token,
          undefined,
          409,
        );
        await appPool.query(
          "DELETE FROM test_store_receipts WHERE receipt_id='wrong-currency'",
        );
        await appPool.query(
          "INSERT INTO test_store_receipts VALUES ('missing-date',1.00,'PKR',NULL)",
        );
        await api(
          "GET",
          "/api/reports/profit-loss?start_date=2026-11-01&end_date=2026-11-30",
          owner.token,
          undefined,
          409,
        );
        await appPool.query(
          "DELETE FROM test_store_receipts WHERE receipt_id='missing-date'",
        );
        await appPool.query(
          "INSERT INTO test_store_receipts VALUES ('s1',1.00,'PKR','2026-11-25T00:00:00Z')",
        );
        await api(
          "GET",
          "/api/reports/profit-loss?start_date=2026-11-01&end_date=2026-11-30",
          owner.token,
          undefined,
          409,
        );
        await appPool.query(
          "DELETE FROM test_store_receipts WHERE receipt_id='s1' AND amount=1.00",
        );
      },
    );
    await t.test(
      "malformed JSON and unsupported routes return safe errors; docs are served",
      async () => {
        const r = await fetch(base + "/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{ none }",
        });
        assert.equal(r.status, 400);
        assert.match((await r.json()).message, /Invalid JSON/);
        await api("GET", "/api/not-a-route", null, undefined, 404);
        assert.equal((await api("GET", "/api/openapi.json")).openapi, "3.0.3");
        assert.equal((await fetch(base + "/api/docs/")).status, 200);
      },
    );
    await t.test(
      "real server entry point starts and shuts down cleanly",
      async () => {
        const net = require("node:net");
        const probe = net.createServer();
        await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
        const port = probe.address().port;
        await new Promise((resolve) => probe.close(resolve));
        const child = spawn(process.execPath, ["src/server.js"], {
          cwd: root,
          env: { ...process.env, PORT: String(port) },
          stdio: ["ignore", "pipe", "pipe"],
        });
        let output = "";
        try {
          await new Promise((resolve, reject) => {
            const timer = setTimeout(
              () => reject(new Error("Server startup timed out: " + output)),
              10000,
            );
            child.stdout.on("data", (data) => {
              output += data.toString();
              if (output.includes("Backend running at")) {
                clearTimeout(timer);
                resolve();
              }
            });
            child.stderr.on("data", (data) => {
              output += data.toString();
            });
            child.once("exit", (code) => {
              clearTimeout(timer);
              reject(new Error("Server exited early: " + code + " " + output));
            });
          });
          const health = await fetch(`http://127.0.0.1:${port}/api/health`);
          assert.equal(health.status, 200);
        } finally {
          const exited = new Promise((resolve) => child.once("exit", resolve));
          child.kill("SIGTERM");
          await exited;
        }
      },
    );
    await t.test(
      "concurrent demotion/deactivation cannot remove every active Owner",
      async () => {
        const another = await adminCreate("owner", "another.owner@example.com");
        const responses = await Promise.all([
          fetch(base + `/api/users/${owner.id}/role`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${admin.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ role: "mechanic" }),
          }),
          fetch(base + `/api/users/${another.id}/status`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${admin.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: "inactive" }),
          }),
        ]);
        assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
        assert.equal(
          (
            await appPool.query(
              "SELECT COUNT(*)::integer AS n FROM users u JOIN roles r ON r.id=u.role_id WHERE r.name='owner' AND u.status='active'",
            )
          ).rows[0].n,
          1,
        );
      },
    );
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (appPool) await appPool.end();
    await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await db.end();
  }
});
