# Verification — 26 November 2026

## Environment

- Node.js 24.22.3
- PostgreSQL 17.12, separate local test server
- Application's real Express routes, validation, JWT authentication, permissions, SQL and migrations
- Email-delivery functions replaced only inside the test process with an in-memory capture stub; no real inbox delivery was claimed

## Results

| Check | Result |
| --- | --- |
| JavaScript syntax checks | Passed |
| Unit tests | 6 passed |
| PostgreSQL/HTTP integration scenarios | 19 passed |
| OpenAPI 3.0.3 validation | Passed; 24 operations |
| Fresh migration setup and rerun | Passed |
| Upgrade from 001–005 with an existing account | Passed; user ID and stored password value preserved |
| Actual `src/server.js` startup, database health and shutdown | Passed |

The Node test runner reports 20 integration tests because it also counts the parent test containing the 19 scenarios.

## Tested behavior

- Public registration, duplicate email and blocked public privileged-role registration.
- Protected account creation/editing, rejection of role mass assignment and token invalidation after admin edits.
- Own-profile persistence and invalid-language rejection.
- Pending staff cannot log in; approval/rejection and bypass prevention.
- Role change/reversal, revoked tokens, self-change prevention and last-active-Owner protection.
- Deactivation, reactivation, inactive login rejection and stale-token rejection.
- Five-password-attempt lockout and simulated expiry without waiting 15 minutes.
- OTP replacement, one-time consumption, expiration, five wrong attempts, cooldown, hourly limit and password-reset JWT revocation.
- Audit permissions, filtering, pagination beyond the last page, invalid/repeated query values and no delete route.
- Settings permission checks, encryption at rest, masked reads, server-side decryption, atomic validation and secret-free audit details.
- Ciphertext tampering, wrong encryption key and swapping ciphertext between setting names are rejected.
- Expense CRUD, date and amount validation, Owner write/Admin read permissions, soft deletion and audit history.
- Missing reporting contracts produce null revenue/profit rather than fabricated zero figures.
- Connected test views produce exact totals, signed refunds and correct inclusive UTC date boundaries; duplicate receipts, missing receipt dates and wrong currencies are rejected.
- Dashboard output differs by role; absent integrations remain explicit.
- Concurrent Owner demotion/deactivation leaves at least one active Owner.
- Existing local configuration values survive the setup script unchanged.

## Limits that remain

- The user's Windows/PostgreSQL 19 environment and existing database contents were not accessible here. Follow START_HERE.md and check local startup.
- Real Ethereal/SMTP delivery was not exercised in this run. Existing email code and SMTP configuration support are included; actual credentials/delivery remain a local check.
- Reporting was verified against isolated contract fixtures, not teammates' actual tables. Source mapping, ledger reconciliation and full team integration remain pending.
- No Google/Llama/BERT call, agent scheduler, frontend, deployed HTTPS setup or 100-concurrent-user performance test was run. Configuration storage does not implement teammates' integrations.
- GitHub push/merge, Jira updates, instructor collaborator invitations and the whole-group final ZIP are outside this returned code package.

Run `npm run check`, `npm test`, and the isolated `npm run test:integration` as documented in README.md to reproduce checks.
