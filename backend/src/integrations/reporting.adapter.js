// Explicit read-only contracts: no guessing teammates' table or column names.
// See docs/TEAM_INTEGRATION.md for the six view definitions required.
const { httpError } = require("../common/errors");
const contracts = {
  workshop: {
    view: "insha_workshop_revenue",
    columns: ["receipt_id", "amount", "currency", "received_at"],
  },
  store: {
    view: "insha_store_revenue",
    columns: ["receipt_id", "amount", "currency", "received_at"],
  },
  jobs: {
    view: "insha_reporting_jobs",
    columns: ["job_id", "status", "scheduled_at", "worker_id", "bay_id"],
  },
  bays: { view: "insha_reporting_bays", columns: ["bay_id", "is_active"] },
  orders: {
    view: "insha_reporting_orders",
    columns: ["order_id", "status", "placed_at", "total_amount", "currency"],
  },
  reviews: {
    view: "insha_reporting_reviews",
    columns: ["review_id", "sentiment", "created_at"],
  },
};
async function availability(client, key) {
  const contract = contracts[key];
  const relation = await client.query(
    "SELECT oid,relkind FROM pg_class WHERE oid=to_regclass($1)",
    [contract.view],
  );
  if (!relation.rowCount || !["v", "m"].includes(relation.rows[0].relkind))
    return {
      available: false,
      reason: "integration_not_configured",
      required_view: contract.view,
    };
  const columns = (
    await client.query(
      "SELECT attname FROM pg_attribute WHERE attrelid=$1 AND attnum>0 AND NOT attisdropped",
      [relation.rows[0].oid],
    )
  ).rows.map((r) => r.attname);
  if (contract.columns.some((name) => !columns.includes(name)))
    return {
      available: false,
      reason: "integration_schema_mismatch",
      required_view: contract.view,
    };
  return { available: true, required_view: contract.view };
}
async function revenue(client, key, range) {
  const state = await availability(client, key);
  if (!state.available) return { ...state, total: null, receipt_count: null };
  // Identifier comes exclusively from the fixed catalog above; dates are parameters.
  const view = contracts[key].view;
  const result = await client.query(
    `SELECT
    COALESCE(SUM(amount),0)::numeric(20,2)::text AS total,
    COUNT(*)::integer AS receipt_count,
    COUNT(*) FILTER (WHERE currency IS DISTINCT FROM 'PKR' OR amount IS NULL OR amount<>ROUND(amount,2) OR receipt_id IS NULL OR received_at IS NULL)::integer AS invalid_count,
    COUNT(*)-COUNT(DISTINCT receipt_id) AS duplicates
    FROM ${view} WHERE received_at IS NULL OR (received_at >= ($1::date::timestamp AT TIME ZONE 'UTC')
      AND received_at < (($2::date+1)::timestamp AT TIME ZONE 'UTC'))`,
    [range.start_date, range.end_date],
  );
  const data = result.rows[0];
  if (data.invalid_count || Number(data.duplicates))
    throw httpError(
      409,
      `Invalid or duplicate revenue rows in ${view}. Check the integration contract.`,
    );
  return { ...state, total: data.total, receipt_count: data.receipt_count };
}
async function operations(client, range) {
  const result = {};
  const params = [range.start_date, range.end_date];
  const queries = {
    jobs: `SELECT status,COUNT(*)::integer AS count,COUNT(DISTINCT worker_id)::integer AS assigned_workers FROM insha_reporting_jobs
      WHERE scheduled_at >= ($1::date::timestamp AT TIME ZONE 'UTC') AND scheduled_at < (($2::date+1)::timestamp AT TIME ZONE 'UTC') GROUP BY status ORDER BY status`,
    bays: "SELECT COUNT(*)::integer AS total,COUNT(*) FILTER(WHERE is_active)::integer AS active FROM insha_reporting_bays",
    orders: `SELECT status,COUNT(*)::integer AS count,SUM(total_amount)::numeric(20,2)::text AS order_value,
      COUNT(*) FILTER(WHERE currency IS DISTINCT FROM 'PKR' OR total_amount IS NULL OR total_amount<0 OR total_amount<>ROUND(total_amount,2))::integer AS invalid_count
      FROM insha_reporting_orders WHERE placed_at >= ($1::date::timestamp AT TIME ZONE 'UTC') AND placed_at < (($2::date+1)::timestamp AT TIME ZONE 'UTC') GROUP BY status ORDER BY status`,
    reviews: `SELECT COALESCE(sentiment,'unanalysed') AS sentiment,COUNT(*)::integer AS count FROM insha_reporting_reviews
      WHERE created_at >= ($1::date::timestamp AT TIME ZONE 'UTC') AND created_at < (($2::date+1)::timestamp AT TIME ZONE 'UTC') GROUP BY sentiment ORDER BY sentiment`,
  };
  for (const key of ["jobs", "bays", "orders", "reviews"]) {
    const state = await availability(client, key);
    if (!state.available) {
      result[key] = { ...state, data: null };
      continue;
    }
    const rows = (
      await client.query(queries[key], key === "bays" ? [] : params)
    ).rows;
    if (key === "orders" && rows.some((row) => row.invalid_count))
      throw httpError(409, "Order reporting data must use valid PKR amounts.");
    rows.forEach((row) => delete row.invalid_count);
    result[key] = { ...state, data: key === "bays" ? rows[0] : rows };
  }
  return result;
}
module.exports = { contracts, availability, revenue, operations };
