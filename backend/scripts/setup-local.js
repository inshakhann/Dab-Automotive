const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const dotenv = require("dotenv");
const target = path.join(__dirname, "..", ".env");
let text = fs.existsSync(target)
  ? fs.readFileSync(target, "utf8")
  : fs.readFileSync(path.join(__dirname, "..", ".env.example"), "utf8");
const values = dotenv.parse(text);
for (const key of ["JWT_SECRET", "OTP_SECRET", "SETTINGS_ENCRYPTION_KEY"]) {
  if (values[key]) continue;
  const generated = crypto.randomBytes(32).toString("hex");
  const pattern = new RegExp(`^${key}=.*$`, "m");
  text = pattern.test(text)
    ? text.replace(pattern, `${key}=${generated}`)
    : `${text}\n${key}=${generated}\n`;
}
fs.writeFileSync(target, text, { mode: 0o600 });
console.log(
  "Local .env prepared. Existing non-empty values were preserved. Check PostgreSQL credentials before migrating.",
);
