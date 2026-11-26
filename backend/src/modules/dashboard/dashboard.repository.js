async function administration(client, range) {
  const counts = (
    await client.query(`SELECT r.name AS role,u.status,COUNT(*)::integer AS count
    FROM users u JOIN roles r ON r.id=u.role_id GROUP BY r.name,u.status ORDER BY r.name,u.status`)
  ).rows;
  const locked = (
    await client.query(
      "SELECT COUNT(*)::integer AS count FROM users WHERE locked_until>clock_timestamp()",
    )
  ).rows[0].count;
  const actions = (
    await client.query(
      `SELECT action,COUNT(*)::integer AS count FROM audit_logs
    WHERE created_at>=($1::date::timestamp AT TIME ZONE 'UTC') AND created_at<(($2::date+1)::timestamp AT TIME ZONE 'UTC')
    GROUP BY action ORDER BY count DESC,action`,
      [range.start_date, range.end_date],
    )
  ).rows;
  return { accounts: counts, locked_accounts: locked, audit_actions: actions };
}
module.exports = { administration };
