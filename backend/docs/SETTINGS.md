# System settings

Only the Administrator has `settings.read` and `settings.update`. The Owner does not automatically inherit Administrator access.

- `GET /api/settings`: list supported settings and defaults; secrets are `********` or null.
- `PUT /api/settings`: atomically update one or more known settings. Unsupported keys or invalid values reject the entire request.

Example body:

```json
{
  "settings": {
    "agents.booking.enabled": true,
    "agents.reminder.interval_minutes": 60,
    "agents.reminder.advance_hours": 24
  }
}
```

| Key | Value | Default |
| --- | --- | --- |
| maps.api_key | Secret string or null to clear | null |
| translate.api_key | Secret string or null | null |
| llama.api_key | Secret string or null | null |
| bert.api_key | Secret string or null | null |
| llama.base_url | HTTPS URL, local HTTP URL, or null | null |
| bert.base_url | HTTPS URL, local HTTP URL, or null | null |
| workshop.name | Non-empty text, up to 100 characters | Dab Automotive |
| workshop.timezone | Valid IANA time-zone name | Asia/Karachi |
| agents.booking.enabled | JSON boolean | false |
| agents.general.enabled | JSON boolean | false |
| agents.reminder.enabled | JSON boolean | false |
| agents.booking.prompt | Text, up to 4000 characters | empty |
| agents.general.prompt | Text, up to 4000 characters | empty |
| agents.reminder.prompt | Text, up to 4000 characters | empty |
| agents.reminder.interval_minutes | Integer 1–1440 | 60 |
| agents.reminder.advance_hours | Integer 1–168 | 24 |

Secret values must contain 1–4096 characters. Do not submit the mask `********` as a new secret. Service URLs reject embedded credentials, query strings and fragments; put keys in their dedicated secret settings. HTTP is accepted only for localhost/loopback development services.

## Storage and audit

Secrets use AES-256-GCM with a fresh 12-byte IV, an authentication tag and the setting name as authenticated data. `SETTINGS_ENCRYPTION_KEY` is a separate 32-byte hex key kept only in `.env`. Public GET/PUT responses never contain plaintext keys or ciphertext. Audit entries contain the key name, secret flag and whether it was cleared, but never the setting value. Non-secret configuration is stored as JSONB.

Changing an encryption key without migrating existing ciphertext makes old secrets unreadable. Preserve the key privately. No credential is included in this ZIP.

## Teammate integration

Adapters should read settings from the server-only service, for example:

```javascript
const { getSetting } = require("../modules/settings/settings.service");
const enabled = await getSetting("agents.booking.enabled");
if (!enabled) {
  // Return your module's documented disabled response.
}
const apiKey = await getSetting("llama.api_key");
const baseUrl = await getSetting("llama.base_url");
```

Adjust the relative import path for the caller. Never expose `getSetting` as an HTTP route or return a decrypted secret to the frontend. No caching is used here, so reads see committed updates. Enabling a setting stores configuration; it does not implement or start a missing teammate's agent/scheduler.

## Email

`MAIL_MODE=test` uses Ethereal and prints a preview link in the backend terminal. These are test inbox messages, not delivery to a real user's inbox.

For real mail, set `MAIL_MODE=smtp` plus `SMTP_HOST`, `SMTP_PORT` (465 or 587), `SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM`, then restart. Port 465 uses TLS; 587 requires STARTTLS. Check the provider's sender and app-password requirements. The generic forgot-password 202 response does not prove email delivery; check the terminal and actual inbox. Real SMTP delivery must be tested with your own credentials.
