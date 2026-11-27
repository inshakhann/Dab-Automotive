const pool = require("../../config/db");

async function insertReviewWithSentiment({
  userId,
  targetType,
  productId,
  bookingId,
  rating,
  comment,
  sentiment,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const reviewRes = await client.query(
      `INSERT INTO reviews (user_id, target_type, product_id, booking_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, target_type, product_id, booking_id, rating, comment, is_flagged, created_at`,
      [
        userId,
        targetType,
        productId || null,
        bookingId || null,
        rating,
        comment,
      ]
    );
    const review = reviewRes.rows[0];

    const sentRes = await client.query(
      `INSERT INTO review_sentiment (review_id, sentiment_label, confidence_score, model_version)
       VALUES ($1, $2, $3, $4)
       RETURNING sentiment_label, confidence_score, model_version, analyzed_at`,
      [
        review.id,
        sentiment.sentiment_label,
        sentiment.confidence_score,
        sentiment.model_version,
      ]
    );

    await client.query("COMMIT");
    return { ...review, sentiment: sentRes.rows[0] };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function findActiveAdminIds() {
  const res = await pool.query(
    `SELECT u.id FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name IN ('owner', 'administrator') AND u.status = 'active'`
  );
  return res.rows.map((r) => r.id);
}

async function findReviews({ targetType, productId, bookingId }) {
  const conditions = ["r.is_flagged = FALSE"];
  const params = [];

  if (targetType) {
    params.push(targetType);
    conditions.push(`r.target_type = $${params.length}`);
  }
  if (productId) {
    params.push(productId);
    conditions.push(`r.product_id = $${params.length}`);
  }
  if (bookingId) {
    params.push(bookingId);
    conditions.push(`r.booking_id = $${params.length}`);
  }

  const sql = `
    SELECT r.id, r.user_id, u.full_name AS author_name,
           r.target_type, r.product_id, r.booking_id,
           r.rating, r.comment, r.created_at,
           rs.sentiment_label, rs.confidence_score
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    LEFT JOIN review_sentiment rs ON rs.review_id = r.id
    WHERE ${conditions.join(" AND ")}
    ORDER BY r.created_at DESC
    LIMIT 100
  `;

  const result = await pool.query(sql, params);
  return result.rows;
}

async function markReviewFlagged(reviewId, reason, actorUserId) {
  const result = await pool.query(
    `UPDATE reviews
     SET is_flagged = TRUE, flag_reason = $2
     WHERE id = $1
     RETURNING id, user_id, target_type, rating, comment, is_flagged, flag_reason`,
    [reviewId, reason]
  );

  if (result.rowCount === 0) return null;

  await pool.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
     VALUES ($1, 'review.flag', 'review', $2, $3::jsonb)`,
    [actorUserId, reviewId, JSON.stringify({ reason })]
  );

  return result.rows[0];
}

async function deleteReviewById(reviewId, actorUserId) {
  const result = await pool.query(
    `DELETE FROM reviews WHERE id = $1 RETURNING id`,
    [reviewId]
  );
  if (result.rowCount === 0) return null;

  await pool.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
     VALUES ($1, 'review.delete', 'review', $2, '{}'::jsonb)`,
    [actorUserId, reviewId]
  );

  return result.rows[0];
}

async function fetchSentimentStats() {
  const [summaryRes, breakdownRes] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(r.id)::int AS total_reviews,
        COALESCE(ROUND(AVG(r.rating), 2), 0) AS average_rating,
        COUNT(*) FILTER (WHERE r.is_flagged = TRUE)::int AS flagged_count
      FROM reviews r
    `),
    pool.query(`
      SELECT
        rs.sentiment_label,
        COUNT(*)::int AS count,
        ROUND(AVG(rs.confidence_score), 4) AS avg_confidence
      FROM review_sentiment rs
      GROUP BY rs.sentiment_label
    `),
  ]);

  return {
    summary: summaryRes.rows[0],
    sentimentBreakdown: breakdownRes.rows,
  };
}

module.exports = {
  insertReviewWithSentiment,
  findActiveAdminIds,
  findReviews,
  markReviewFlagged,
  deleteReviewById,
  fetchSentimentStats,
};