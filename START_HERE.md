# Insha — start here

Your existing registration, login, OTP, profile, staff approval, role and status flows are preserved. The missing audit service is included. This package adds your remaining independent administration and expense features, plus reports/dashboard APIs with documented teammate integration points.

## 1. Keep a backup

Keep your old project folder. Back up your existing `dab_automotive` database through pgAdmin before applying migrations. Do not drop the database, delete old accounts or edit previously applied migration files.

## 2. Extract into a separate folder

Extract this ZIP, open the extracted `dab-automotive` folder in VS Code, then open a terminal and run:

```bash
cd backend
npm ci
```

The package intentionally does not include `node_modules`, `.git` or your real `.env`.

## 3. Bring your local configuration across

Privately copy your old `backend/.env` into this new `backend` folder. This keeps your PostgreSQL credentials, JWT secret and OTP secret.

Then run:

```bash
npm run setup:local
```

This preserves existing non-empty values and generates any missing JWT, OTP and settings-encryption keys. It does not print the keys. Check `.env` still points to your existing `dab_automotive` database. Keep `MAIL_MODE=test` for your current Ethereal setup.

Do not replace `SETTINGS_ENCRYPTION_KEY` after storing API keys: old encrypted values need that same key. Back it up privately with your environment configuration.

## 4. Apply pending migrations

```bash
npm run migrate
```

Previously applied migrations 001–005 will be skipped. If 005 was not yet applied, it will run. Migration 006 adds settings, expenses, indexes and permissions. It does not recreate or clear your existing user tables.

Coordinate the `006_insha_settings_expenses_permissions.sql` filename with your group before merging. If another teammate already uses 006, agree on a unique next filename before anyone applies or commits the migration. Do not rename migrations already applied to your database.

Your existing Owner ID/email/password are unchanged. Do not seed another Owner if you already have one. The seed command is for a fresh database only.

## 5. Start once

Stop the backend running from your old folder with Ctrl+C, then in the new folder run:

```bash
npm run dev
```

Open:

- `http://localhost:5000/api/health` — checks PostgreSQL.
- `http://localhost:5000/api/docs` — Swagger API documentation and interactive requests.

If port 5000 is busy, stop the older server terminal. Run only one copy on this port.

## 6. Run the simple checks

Open a second terminal inside `backend`:

```bash
npm run check
npm test
```

Then follow `backend/docs/POSTMAN_GUIDE.md`. Import the collection and environment from `backend/docs`; their passwords/tokens are empty. Your Owner can now create the separate Administrator directly through protected `POST /api/users`.

## 7. Understand the reports

Expenses and settings work independently. Financial reports and business dashboard widgets need teammates' source views. Until those are connected, `complete: false` and null revenue/profit are expected. Do not add fake revenue or test fixture views to your actual project database to make these fields look complete.

Share `backend/docs/TEAM_INTEGRATION.md` with Sana, Talha, Roman and Aniqa. That document specifies what they need to expose without requiring their full unfinished code now.

## 8. Move verified code back to your Git repository

Once the extracted copy starts successfully, stop it. Copy its backend source, migrations, scripts, tests, docs, package files and `.env.example` into your original Git working folder. Keep that original folder's `.git` and private `.env`; do not copy `node_modules` or local Postman credentials.

In the original repository, review `git status`. Create a branch such as `insha/admin-finance` starting from your latest Insha branch. Stage only the intended code and documentation, review the diff, commit and push. Do not force-push or replace teammates' folders. The returned ZIP has not been pushed or merged automatically.

See `backend/docs/HANDOFF.md` for status text and the exact remaining integration boundaries.
