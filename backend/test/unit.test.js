const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { isDate, checkDateRange } = require("../src/common/validation");
const { toMinor, fromMinor } = require("../src/common/money");
const { encryptSecret, decryptSecret } = require("../src/config/encryption");
const { validateSetting } = require("../src/modules/settings/settings.service");
process.env.SETTINGS_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
test("calendar validation catches rollover, zero years and non-string values", () => {
  for (const value of [
    "2026-02-29",
    "2026-04-31",
    "0000-01-01",
    "2026-1-01",
    null,
    [],
    {},
  ])
    assert.equal(isDate(value), false);
  for (const value of ["2024-02-29", "2026-11-26", "9999-12-31"])
    assert.equal(isDate(value), true);
  assert.throws(
    () => checkDateRange({ start_date: "2026-11-27", end_date: "2026-11-26" }),
    { statusCode: 400 },
  );
});
test("money arithmetic is exact for decimals, negative values and large sums", () => {
  assert.equal(fromMinor(toMinor("0.10") + toMinor("0.20")), "0.30");
  assert.equal(fromMinor(toMinor("10.01") - toMinor("12.30")), "-2.29");
  assert.equal(fromMinor(toMinor("999999999999.99") + 1n), "1000000000000.00");
  for (const value of ["1e3", "NaN", "1.001", 5])
    assert.throws(() => toMinor(value));
});
test("encryption uses random IVs and rejects tampering, wrong keys and swapped settings", () => {
  const one = encryptSecret("maps.api_key", "test-only-secret");
  const two = encryptSecret("maps.api_key", "test-only-secret");
  assert.notEqual(one, two);
  assert.ok(!one.includes("test-only-secret"));
  assert.equal(decryptSecret("maps.api_key", one), "test-only-secret");
  assert.throws(() => decryptSecret("translate.api_key", one));
  const parts = one.split(":");
  const ciphertext = Buffer.from(parts[3], "base64");
  ciphertext[0] ^= 1;
  parts[3] = ciphertext.toString("base64");
  assert.throws(() => decryptSecret("maps.api_key", parts.join(":")));
  const original = process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.SETTINGS_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
  assert.throws(() => decryptSecret("maps.api_key", one));
  process.env.SETTINGS_ENCRYPTION_KEY = original;
});
test("setting catalog rejects unknown keys, masked secrets, string booleans and credential URLs", () => {
  for (const [key, value] of [
    ["unknown", "x"],
    ["maps.api_key", "********"],
    ["agents.booking.enabled", "true"],
    ["agents.reminder.interval_minutes", 0],
    ["bert.base_url", "https://user:pass@example.com"],
    ["bert.base_url", "https://example.com?api_key=secret"],
    ["workshop.timezone", "Not/AZone"],
  ])
    assert.throws(() => validateSetting(key, value), { statusCode: 400 });
  for (const [key, value] of [
    ["maps.api_key", null],
    ["agents.booking.enabled", true],
    ["bert.base_url", "http://localhost:8000"],
    ["agents.reminder.interval_minutes", 60],
    ["workshop.timezone", "Asia/Karachi"],
  ])
    assert.doesNotThrow(() => validateSetting(key, value));
});
test("OpenAPI document validates and describes all mounted API methods", async () => {
  const parser = require("@apidevtools/swagger-parser");
  const spec = await parser.validate(require("../docs/openapi.json"));
  assert.equal(spec.openapi, "3.0.3");
  assert.equal(
    Object.values(spec.paths).reduce(
      (count, path) => count + Object.keys(path).length,
      0,
    ),
    24,
  );
});

test("local setup preserves existing secrets and database credentials", () => {
  const fs = require("node:fs");
  const os = require("node:os");
  const path = require("node:path");
  const vm = require("node:vm");
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "dab-setup-test-"));
  fs.mkdirSync(path.join(temp, "scripts"));
  try {
    fs.writeFileSync(
      path.join(temp, ".env"),
      "PGDATABASE=keep_this_database\nPGPASSWORD=keep-this-test-password\nJWT_SECRET=keep-existing-test-jwt\nOTP_SECRET=keep-existing-test-otp\n",
    );
    vm.runInNewContext(
      fs.readFileSync(
        path.join(__dirname, "../scripts/setup-local.js"),
        "utf8",
      ),
      {
        require,
        __dirname: path.join(temp, "scripts"),
        console: { log() {} },
      },
    );
    const values = require("dotenv").parse(
      fs.readFileSync(path.join(temp, ".env")),
    );
    assert.equal(values.PGDATABASE, "keep_this_database");
    assert.equal(values.PGPASSWORD, "keep-this-test-password");
    assert.equal(values.JWT_SECRET, "keep-existing-test-jwt");
    assert.equal(values.OTP_SECRET, "keep-existing-test-otp");
    assert.match(values.SETTINGS_ENCRYPTION_KEY, /^[a-f0-9]{64}$/);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
