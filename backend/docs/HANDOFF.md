# Change log and handoff

## What changed from the uploaded archive

- Restored the missing audit.service.js; the uploaded audit controller required it but it was absent.
- Completed Administrator audit reading with existing filters and pagination.
- Added Owner/Administrator user creation and editing, covering Deliverable 2 US-06 beyond self-profile editing.
- Added settings catalog, validation, masked reads, AES-256-GCM encrypted API keys, audited updates and a server-only accessor for teammates' adapters.
- Added Owner expense create/read/update/delete, Administrator read-only access, categories, exact PKR amounts, date filters and soft deletion.
- Added period-based profit/loss and role-specific dashboard APIs, with read-only reporting contracts for external modules. Missing data is explicitly unavailable.
- Added password-reset audit records with no password/OTP in details.
- Used the same user-management transaction lock for staff review and other sensitive user changes.
- Improved malformed-JSON errors, limited request size, added clean server shutdown and startup validation for the settings-encryption key.
- Added local setup helper, environment template, Swagger documentation, Postman collection, guides and automated tests.
- Formatted JavaScript for readability. Existing endpoint URLs and main response behavior are preserved.

## Files to coordinate with the group

Shared files: `src/app.js`, `src/server.js`, package files, `.env.example`, `.gitignore`, `src/modules/users/users.routes.js`, `src/modules/users/users.repository.js`, and the password-reset repository.

New modules: `src/modules/settings`, `expenses`, `reports`, `dashboard`, `src/common`, and `src/modules/users/admin-users.*`.

New migration: `006_insha_settings_expenses_permissions.sql`. Migrations 001–005 are unchanged. The original audit files from steps 1–8 remain, with the missing service added.

New runtime dependency: `swagger-ui-express`. New development dependency: `@apidevtools/swagger-parser`. Package-lock is included; install with `npm ci`.

## Responsibility boundaries

Completed independently: account/authentication backend, audit reading, settings storage, expense CRUD, financial calculation logic, dashboard API structure, documentation and tests.

Awaiting teammates: workshop/store payment views, jobs, bay counts, order summaries and review sentiment data. These are specifically named contracts documented in TEAM_INTEGRATION.md; no fake production tables or duplicate teammate modules were added.

Awaiting local/external verification: your existing Windows database connection, real email delivery if required, actual third-party credentials and full group integration.

## Jira comment you can paste after local verification

```text
Implemented audit-log viewing, secure system settings/API-key storage, protected user creation/editing, expense CRUD and Owner/Admin reporting/dashboard APIs. Added migration 006, Swagger documentation, Postman requests and setup instructions.

Verification in an isolated PostgreSQL environment: 6 unit tests and 19 HTTP/database scenarios passed, including OTP replacement and concurrent last-active-Owner protection. Existing migrations were also tested for upgrade compatibility.

Pending: local Windows/database check, real SMTP delivery, and integration of teammates' payment/job/bay/order/review reporting views. Reporting marks missing data explicitly; full team figures are not yet verified.
```

Keep KAN-17 In Progress until the report/dashboard sources are connected and reconciled. The previously unverified OTP replacement and last-active-Owner checks are now covered by the supplied automated suite. Check the instructor's email-delivery expectation before treating test-mode mail as final delivery.

## Git handoff

This returned package has not been pushed to GitHub or merged. Preserve your original repository's `.git` and `.env`. Transfer reviewed changes into a feature branch, inspect the staged diff, then commit/push. Coordinate shared files and migration naming with teammates; do not force-push.
