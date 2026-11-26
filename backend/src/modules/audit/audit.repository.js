const pool = require("../../config/db");

async function listAuditLogs(filters) {
  const offset = (filters.page - 1) * filters.limit;

  const result = await pool.query(
    `
      WITH filtered AS (
        SELECT
          a.id,
          a.actor_user_id,
          u.full_name AS actor_name,
          a.action,
          a.entity_type,
          a.entity_id,
          a.details,
          a.created_at
        FROM audit_logs AS a
        LEFT JOIN users AS u ON u.id = a.actor_user_id
        WHERE
          ($1::text IS NULL OR a.action = $1)
          AND ($2::integer IS NULL OR a.actor_user_id = $2)
          AND ($3::text IS NULL OR a.entity_type = $3)
          AND ($4::integer IS NULL OR a.entity_id = $4)
          AND (
            $5::date IS NULL
            OR a.created_at >= (
              $5::date::timestamp AT TIME ZONE 'UTC'
            )
          )
          AND (
            $6::date IS NULL
            OR a.created_at < (
              ($6::date + 1)::timestamp AT TIME ZONE 'UTC'
            )
          )
      ),
      paged AS (
        SELECT *
        FROM filtered
        ORDER BY created_at DESC, id DESC
        LIMIT $7 OFFSET $8
      )
      SELECT
        (SELECT COUNT(*)::text FROM filtered) AS total,
        COALESCE(
          (
            SELECT jsonb_agg(
              to_jsonb(paged)
                || jsonb_build_object('id', paged.id::text)
              ORDER BY paged.created_at DESC, paged.id DESC
            )
            FROM paged
          ),
          '[]'::jsonb
        ) AS logs
    `,
    [
      filters.action ?? null,
      filters.actor_user_id ?? null,
      filters.entity_type ?? null,
      filters.entity_id ?? null,
      filters.start_date ?? null,
      filters.end_date ?? null,
      filters.limit,
      offset,
    ],
  );

  return {
    total: Number(result.rows[0].total),
    logs: result.rows[0].logs,
  };
}

module.exports = { listAuditLogs };
