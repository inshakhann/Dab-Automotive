const pool = require("../../config/db");
async function list(filters) {
  const result = await pool.query(
    `WITH filtered AS (
    SELECT id,title,category,amount::text,currency,expense_date::text,notes,created_by,updated_by,created_at,updated_at
    FROM expenses WHERE deleted_at IS NULL
      AND ($1::text IS NULL OR category=$1)
      AND ($2::date IS NULL OR expense_date >= $2)
      AND ($3::date IS NULL OR expense_date <= $3)
    ), paged AS (SELECT * FROM filtered ORDER BY expense_date DESC,id DESC LIMIT $4 OFFSET $5)
    SELECT (SELECT COUNT(*)::text FROM filtered) AS total,
      COALESCE((SELECT jsonb_agg(paged ORDER BY expense_date DESC,id DESC) FROM paged),'[]'::jsonb) AS expenses`,
    [
      filters.category ?? null,
      filters.start_date ?? null,
      filters.end_date ?? null,
      filters.limit,
      (filters.page - 1) * filters.limit,
    ],
  );
  return {
    total: Number(result.rows[0].total),
    expenses: result.rows[0].expenses,
  };
}
const projection =
  "id,title,category,amount::text,currency,expense_date::text,notes,created_by,updated_by,created_at,updated_at";
async function find(id, client = pool, lock = false) {
  return (
    await client.query(
      `SELECT ${projection} FROM expenses WHERE id=$1 AND deleted_at IS NULL ${lock ? "FOR UPDATE" : ""}`,
      [id],
    )
  ).rows[0];
}
async function create(client, actorId, data) {
  return (
    await client.query(
      `INSERT INTO expenses(title,category,amount,expense_date,notes,created_by,updated_by)
    VALUES($1,$2,$3,$4,$5,$6,$6) RETURNING ${projection}`,
      [
        data.title,
        data.category,
        data.amount,
        data.expense_date,
        data.notes ?? "",
        actorId,
      ],
    )
  ).rows[0];
}
async function update(client, actorId, id, data) {
  return (
    await client.query(
      `UPDATE expenses SET title=COALESCE($1,title),category=COALESCE($2,category),
    amount=COALESCE($3::numeric,amount),expense_date=COALESCE($4::date,expense_date),notes=COALESCE($5,notes),
    updated_by=$6,updated_at=clock_timestamp() WHERE id=$7 AND deleted_at IS NULL RETURNING ${projection}`,
      [
        data.title ?? null,
        data.category ?? null,
        data.amount ?? null,
        data.expense_date ?? null,
        data.notes ?? null,
        actorId,
        id,
      ],
    )
  ).rows[0];
}
async function remove(client, actorId, id) {
  await client.query(
    "UPDATE expenses SET deleted_at=clock_timestamp(),updated_at=clock_timestamp(),updated_by=$1 WHERE id=$2",
    [actorId, id],
  );
}
async function summary(client, filters) {
  const totals = await client.query(
    `SELECT COUNT(*)::integer AS count,COALESCE(SUM(amount),0)::numeric(20,2)::text AS total
    FROM expenses WHERE deleted_at IS NULL AND expense_date BETWEEN $1::date AND $2::date`,
    [filters.start_date, filters.end_date],
  );
  const categories = await client.query(
    `SELECT category,COUNT(*)::integer AS count,SUM(amount)::numeric(20,2)::text AS total
    FROM expenses WHERE deleted_at IS NULL AND expense_date BETWEEN $1::date AND $2::date GROUP BY category ORDER BY category`,
    [filters.start_date, filters.end_date],
  );
  return { ...totals.rows[0], by_category: categories.rows };
}
module.exports = { list, find, create, update, remove, summary };
