const catalog = require("./settings.catalog");
const repository = require("./settings.repository");
const {
  transaction,
  requirePermission,
  audit,
} = require("../../common/database");
const { httpError } = require("../../common/errors");
const { encryptSecret, decryptSecret } = require("../../config/encryption");
function validateSetting(key, value) {
  if (!Object.prototype.hasOwnProperty.call(catalog, key))
    throw httpError(400, `Unknown setting: ${key}`);
  const rule = catalog[key];
  let valid = false;
  switch (rule.type) {
    case "secret":
      valid =
        value === null ||
        (typeof value === "string" &&
          value.trim().length > 0 &&
          value.length <= 4096 &&
          value !== "********");
      break;
    case "boolean":
      valid = typeof value === "boolean";
      break;
    case "integer":
      valid = Number.isInteger(value) && value >= rule.min && value <= rule.max;
      break;
    case "text":
      valid =
        typeof value === "string" &&
        value.length <= rule.max &&
        (key !== "workshop.name" || value.trim().length > 0);
      break;
    case "timezone":
      try {
        if (typeof value === "string" && value.length <= 100) {
          new Intl.DateTimeFormat("en", { timeZone: value });
          valid = true;
        }
      } catch {}
      break;
    case "url":
      if (value === null) {
        valid = true;
        break;
      }
      try {
        if (typeof value !== "string" || value.length > 2000) break;
        const url = new URL(value);
        valid =
          !url.username &&
          !url.password &&
          !url.search &&
          !url.hash &&
          (url.protocol === "https:" ||
            (url.protocol === "http:" &&
              ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)));
      } catch {}
      break;
  }
  if (!valid) throw httpError(400, `Invalid value for ${key}.`);
}
function publicSettings(rows) {
  const records = new Map(rows.map((row) => [row.key, row]));
  return Object.entries(catalog).map(([key, rule]) => {
    const row = records.get(key);
    const configured =
      rule.type === "secret" ? Boolean(row?.encrypted_value) : Boolean(row);
    return {
      key,
      type: rule.type,
      configured,
      value:
        rule.type === "secret"
          ? configured
            ? "********"
            : null
          : row
            ? row.value
            : rule.default,
      updated_at: row?.updated_at || null,
      updated_by: row?.updated_by || null,
    };
  });
}
async function listSettings() {
  return publicSettings(await repository.list());
}
async function updateSettings(actorId, values) {
  if (
    !values ||
    typeof values !== "object" ||
    Array.isArray(values) ||
    !Object.keys(values).length ||
    Object.keys(values).length > Object.keys(catalog).length
  ) {
    throw httpError(
      400,
      "settings must be a non-empty object of supported setting names and values.",
    );
  }
  for (const [key, value] of Object.entries(values))
    validateSetting(key, value);
  return transaction(async (client) => {
    await requirePermission(client, actorId, "settings.update");
    await client.query("SELECT pg_advisory_xact_lock(874234)");
    for (const [key, value] of Object.entries(values)) {
      const secret = catalog[key].type === "secret";
      const encrypted =
        secret && value !== null ? encryptSecret(key, value) : null;
      const row = await repository.save(
        client,
        actorId,
        key,
        secret,
        value,
        encrypted,
      );
      // Values are deliberately omitted: prompts and credentials can contain sensitive data.
      await audit(client, actorId, "settings.update", "setting", row.id, {
        key,
        is_secret: secret,
        cleared: value === null,
      });
    }
    return publicSettings(await repository.list(client));
  });
}
// Server-only accessor for teammates' adapters. Never mount this function as an HTTP endpoint.
async function getSetting(key) {
  if (!Object.prototype.hasOwnProperty.call(catalog, key))
    throw new Error("Unknown setting key.");
  const row = await repository.find(key);
  if (!row) return catalog[key].default;
  if (catalog[key].type === "secret")
    return row.encrypted_value ? decryptSecret(key, row.encrypted_value) : null;
  return row.value;
}
module.exports = { listSettings, updateSettings, getSetting, validateSetting };
