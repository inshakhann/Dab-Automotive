# Postman: first run and verification

Import both JSON files in this docs folder:

- `Dab-Automotive-Insha.postman_collection.json`
- `Dab-Automotive-Local.postman_environment.json`

Select **Dab Automotive — LOCAL ONLY** in Postman's environment selector. Set `ownerEmail` to your existing Owner email and `ownerPassword` to its current password. Choose a new `adminPassword` of at least 12 characters and at most 72 UTF-8 bytes. Do not upload/export the filled environment to GitHub. The supplied template contains no passwords or tokens.

Use the collection one request at a time. It includes mutating tests, so do not run every request blindly against real accounts. The collection automatically saves login tokens and newly created IDs to the selected environment. `{{...}}` values refer to those environment variables.

## Administrator setup

1. Send **Health**. Expect 200.
2. Send **Owner login**. Expect 200. Its script saves `ownerToken`.
3. Send **Owner creates Administrator**. Expect 201 and role `administrator`; its script saves `adminId`. If that email already exists, use the existing account's password or choose a different unused `adminEmail`; do not repeatedly register it.
4. Send **Administrator login**. Expect 200. Its script saves `adminToken`.
5. Send **Administrator profile**. Expect role `administrator`.

The protected `POST /api/users` endpoint can create approved accounts directly. Public `POST /api/auth/register` still rejects Owner/Administrator signup.

## Audit

- All logs / role-change logs / date filter: Administrator gets 200, with page, limit, total, total_pages and logs.
- Owner or ordinary user gets 403. No token gets 401.
- `limit=101`, repeated `page`, impossible dates or start date after end date get 400.
- A valid filter with no matches returns an empty array and total 0.
- No audit edit/delete endpoint exists.

`actor_user_id` is the person performing an action. `entity_id` is the affected record; combine it with `entity_type` when filtering across modules.

## Settings

1. Read settings as Administrator.
2. Update agent configuration. Expect persisted values.
3. Store the dummy API key. The response must show `********`, never the key.
4. Read settings again; confirm `configured: true` for maps.api_key.
5. Clear the dummy key; confirm null and configured=false.
6. Owner token on settings gets 403. Unknown keys, string `"true"` instead of boolean `true`, invalid URLs and submitting the mask as a secret get 400.

Changing an agent setting does not implement a missing agent. See TEAM_INTEGRATION.md.

## Expenses

Set `expenseDate`, `startDate`, and `endDate` appropriately. Send create, list, read, edit and delete in that order. The collection stores `expenseId` after create. A deleted expense should disappear from reads/reports but retain its audit history.

Send amounts as strings, e.g. `"1250.00"`. Zero, negative amounts, more than two decimals, numeric JSON values and impossible calendar dates are rejected. Owner may write; Administrator may read only; Customer/Mechanic/Store Manager are denied.

## Reports and dashboards

Date filters are required, e.g. `?start_date=2026-11-01&end_date=2026-11-30`. An Owner and Administrator can read the financial report. The Administrator dashboard has additional account/audit/configuration/health data.

Before teammate integration, expect 200 with `complete: false`, missing-source names, null revenue/profit, and real expense totals. This is not a server error. After the agreed views are connected, compare the report to actual received payments and expenses.

## Existing account tests

Set `targetUserId` to an actual disposable test user's ID. Do not use your only Owner account. Edit/role/status operations invalidate target tokens; log in again after reactivation or role change. The Owner cannot change their own role/status, and nobody can remove the last active Owner. Pending/rejected staff must use the staff-review workflow rather than role/status endpoints.

## OTP testing

Set `resetEmail` to a test account. Request an OTP and inspect the terminal for the Ethereal preview URL (or real inbox if SMTP is configured). Set `resetOtp` and `newPassword`, then submit. A used/expired code fails; a newer issued code replaces the previous one. Wait 60 seconds between requests; the same account is limited to 3 issued codes per hour. The generic 202 response does not prove delivery. Password reset revokes older JWTs.

## Common mistakes

- Put only `http://...` in the URL field; select GET/POST/PUT separately.
- For GET requests, select **Body → none** from the menu. Do not type `{ none }`.
- A 401 means the token is missing, expired or revoked. Log in again as the correct account.
- A 403 means the logged-in account is inactive or lacks the required permission.
- Do not paste SQL into Postman. SQL inspection belongs in pgAdmin.
