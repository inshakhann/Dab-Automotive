# Dab Automotive — Insha's backend modules

Start with **[../START_HERE.md](../START_HERE.md)** for the Windows upgrade steps.

This package extends the uploaded Node/Express/PostgreSQL backend. It is Insha's portion of the group project, not the whole group's completed submission.

## Implemented

- Customer/staff registration, JWT login, account lockout, OTP password reset.
- Owner bootstrap, protected user creation/editing/listing, profile changes, staff decisions, role and status management.
- Administrator-only, filterable, paginated audit-log reading.
- Administrator settings and agent configuration; API secrets encrypted with AES-256-GCM and masked on reads.
- Owner expense CRUD with exact PKR amounts, categories, date filters, soft deletion and audit records. Administrator has read access.
- Profit/loss calculations and role-specific Owner/Administrator dashboard APIs.
- Swagger UI at `/api/docs`, OpenAPI JSON at `/api/openapi.json`, Postman collection and automated tests.

## Pending external integration

The archive does not contain teammates' bookings/jobs/bays/payments/orders/reviews modules. Their reporting contracts are documented in [TEAM_INTEGRATION.md](docs/TEAM_INTEGRATION.md). Until connected, reports return `complete: false`, `revenue: null` and `net_profit_loss: null`, while expense totals remain real. This is deliberate: missing revenue must not appear as zero income or a confirmed loss. Test-only views verify the calculations; they are never installed by normal migrations.

Ethereal test-email mode is retained. Real SMTP is implemented but requires your own working credentials and a delivery check. No real API keys, passwords, account data, Git history or node_modules are included.

## Commands (inside backend)

```bash
npm ci
npm run setup:local
# Check database credentials in .env before continuing.
npm run migrate
npm run dev
```

For a new database only, fill `BOOTSTRAP_OWNER_*` in `.env`, run `npm run seed:owner`, then remove those bootstrap values. Existing databases keep their accounts and passwords.

```bash
npm run check
npm test
```

Integration tests require a disposable PostgreSQL database ending in `_test`:

PowerShell:

```powershell
$env:TEST_DATABASE_URL = "postgresql://postgres:YOUR_URL_ENCODED_PASSWORD@localhost:5432/dab_automotive_test"
npm run test:integration
```

Git Bash:

```bash
TEST_DATABASE_URL='postgresql://postgres:YOUR_URL_ENCODED_PASSWORD@localhost:5432/dab_automotive_test' npm run test:integration
```

Create this empty test database in pgAdmin first. Tests use temporary schemas and delete only those schemas in cleanup. They refuse a database name without the `_test` suffix. Tests run the real migrations and HTTP routes against PostgreSQL, using an in-memory email-delivery stub only. Tests do not connect to Ethereal or real SMTP.

Node 22+ and PostgreSQL 15+ are required; this package was verified with Node 24.22.3 and PostgreSQL 17.12. Your PostgreSQL 19 connection still needs a local startup check.

## Documentation

- [API and testing walkthrough](docs/POSTMAN_GUIDE.md)
- [Settings and secrets](docs/SETTINGS.md)
- [Reporting contracts for teammates](docs/TEAM_INTEGRATION.md)
- [Verification evidence and limits](docs/VERIFICATION.md)
- [Change log and Jira text](docs/HANDOFF.md)

All date filters use inclusive UTC calendar dates. Expenses use the recorded calendar date. `workshop.timezone` configures future scheduling/presentation adapters; it does not change report date semantics.

No frontend screens, teammates' business modules, real-mail credentials, deployment, GitHub merge or Jira changes are performed by this package.
