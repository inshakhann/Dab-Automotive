# Reporting contracts for the group

Insha's code does not create or assume ownership of teammates' business tables. Instead, it reads six specifically named PostgreSQL views. Teammates map their actual schemas to these columns when their modules are ready. Ordinary tables with these names are not accepted; use `CREATE VIEW` (or a refreshed materialized view).

These views live in the same database/schema as the application and must be readable by its database role. Keep row IDs unique and required timestamps/amounts non-null. If a contract view is absent or lacks a required column, the API explicitly reports that source unavailable. Other database failures are returned as server errors, not disguised as empty data.

## Revenue: Sana and Roman

| View | Owner | Required columns |
| --- | --- | --- |
| insha_workshop_revenue | Sana | receipt_id TEXT, amount NUMERIC, currency TEXT, received_at TIMESTAMPTZ |
| insha_store_revenue | Roman, coordinated with Sana's payment ledger | receipt_id TEXT, amount NUMERIC, currency TEXT, received_at TIMESTAMPTZ |

Each row is a unique **settled receipt or refund**, not an invoice or an order total. Use signed amounts: receipts positive, refunds negative, both at most two decimal places. Currency is `PKR`. Keep `receipt_id` unique within each view. A payment must never appear in both views. Do not sum invoices and their payments, or orders and their corresponding receipts, together.

Sana/Roman must agree which module is the source of truth for store payments. If Sana's central payments table holds both types, the two views should filter that one table by the agreed payment category. If a payment/refund is voided, exclude it or expose the appropriate reversal according to the agreed ledger policy. Pending, failed and unpaid transactions do not count.

Both revenue views must be connected before `report.complete` becomes true. An integrated view with no rows produces real zero revenue for that source. An absent view produces null, never a guessed zero. Reports sum signed received payments in the requested period and subtract non-deleted recorded expenses in the same period. Inventory cost of goods is not invented; agree with the team whether those costs are recorded as expenses before calling this a full accounting profit statement.

## Operations: Talha, Sana, Roman and Aniqa

| View | Owner | Required columns | Interpretation |
| --- | --- | --- | --- |
| insha_reporting_jobs | Sana | job_id TEXT, status TEXT, scheduled_at TIMESTAMPTZ, worker_id INTEGER nullable, bay_id TEXT nullable | One row per job; current status of jobs scheduled in the requested period. Counts grouped by status and distinct assigned workers. |
| insha_reporting_bays | Talha | bay_id TEXT, is_active BOOLEAN | One row per workshop bay. Counts current enabled/active bays, not historical occupancy. |
| insha_reporting_orders | Roman | order_id TEXT, status TEXT, placed_at TIMESTAMPTZ, total_amount NUMERIC, currency TEXT | One row per order. Order value grouped by status; distinct from received revenue. Amount non-negative with two decimals; PKR only. |
| insha_reporting_reviews | Aniqa | review_id TEXT, sentiment TEXT nullable, created_at TIMESTAMPTZ | One row per review. Use positive/neutral/negative labels; null appears as unanalysed. Aggregate counts contain no review text or customer PII. |

All reporting timestamps must be timezone-aware. UTC date filters include the whole end date using an exclusive midnight boundary on the following day. Do not silently reinterpret the range according to a database server's local timezone.

`dashboard.complete` requires both financial sources and all four operational views. Current accounts, expense records and Administrator configuration/health summaries do not depend on those external views.

## How to connect

1. Agree the source table/columns and payment/refund semantics with the owning member.
2. Write a new uniquely numbered group migration creating the corresponding views with aliases/casts matching these contracts.
3. Review that migration with the owning member; do not alter their tables to fit guessed column names.
4. Compare view sums/counts to the source ledger over a known date range, including a refund, an unpaid transaction and both date boundaries.
5. Call the report/dashboard endpoint and verify `available`/`complete` flags and values.

Do not run `test/reporting-fixtures.sql` on your real project database. Its fixtures are exclusively for the isolated automated test schema and are not production integration.

## Configuration integration

Talha and Aniqa can use the server-only `getSetting` accessor described in SETTINGS.md. The settings API stores agent enable flags, prompts, timing values and encrypted keys; their services must read and respect those settings.

## Shared-file coordination

Insha changed `src/app.js`, `src/server.js`, user-management files, package files, `.env.example`, and added migration 006 plus new modules. Integrate through a feature branch and review shared-file conflicts. Do not copy the entire backend over another member's uncommitted changes. All members should agree on globally unique migration filenames before running them.
