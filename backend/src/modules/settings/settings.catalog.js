// Only these settings are writable. Add future settings here with validation and a default.
const catalog = {
  "maps.api_key": { type: "secret", default: null },
  "translate.api_key": { type: "secret", default: null },
  "llama.api_key": { type: "secret", default: null },
  "bert.api_key": { type: "secret", default: null },
  "llama.base_url": { type: "url", default: null },
  "bert.base_url": { type: "url", default: null },
  "workshop.name": { type: "text", max: 100, default: "Dab Automotive" },
  "workshop.timezone": { type: "timezone", default: "Asia/Karachi" },
  "agents.booking.enabled": { type: "boolean", default: false },
  "agents.general.enabled": { type: "boolean", default: false },
  "agents.reminder.enabled": { type: "boolean", default: false },
  "agents.booking.prompt": { type: "text", max: 4000, default: "" },
  "agents.general.prompt": { type: "text", max: 4000, default: "" },
  "agents.reminder.prompt": { type: "text", max: 4000, default: "" },
  "agents.reminder.interval_minutes": {
    type: "integer",
    min: 1,
    max: 1440,
    default: 60,
  },
  "agents.reminder.advance_hours": {
    type: "integer",
    min: 1,
    max: 168,
    default: 24,
  },
};
module.exports = catalog;
