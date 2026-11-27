const crypto = require("crypto");
const pool = require("../../config/db");
const { createNotification } = require("../notifications/notifications.service");

const BERT_SERVICE_URL =
  process.env.BERT_SERVICE_URL || "http://localhost:8001";

async function analyzeWithBert(text) {
  try {
    const response = await fetch(`${BERT_SERVICE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`BERT service status ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.warn("BERT fallback triggered:", err.message);
    return {
      sentiment_label: "NEUTRAL",
      confidence_score: 0.5,
      model_version: "fallback-offline",
    };
  }
}

async function translateText(text, targetLang) {
  if (!targetLang || targetLang === "en") return text;

  const sourceHash = crypto
    .createHash("md5")
    .update(`${targetLang}:${text}`)
    .digest("hex");

  const cached = await pool.query(
    `SELECT translated_text FROM translation_cache WHERE source_hash = $1`,
    [sourceHash]
  );
  if (cached.rowCount > 0) {
    return cached.rows[0].translated_text;
  }

  let translated = text;
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text.slice(0, 450)
    )}&langpair=en|${targetLang}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data?.responseData?.translatedText) {
      translated = data.responseData.translatedText;
    }
  } catch (err) {
    console.warn("Translation API unavailable, returning original text.");
  }

  await pool.query(
    `INSERT INTO translation_cache (source_hash, source_text, target_lang, translated_text)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (source_hash) DO NOTHING`,
    [sourceHash, text, targetLang, translated]
  );

  return translated;
}

async function createReview({
  userId,
  targetType,
  productId,
  bookingId,
  rating,
  comment,
}) {
  const bertResult = await analyzeWithBert(comment);

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
        bertResult.sentiment_label,
        bertResult.confidence_score,
        bertResult.model_version,
      ]
    );

    await client.query("COMMIT");

    // Notify workshop owner/admin if negative sentiment or low rating
    if (bertResult.sentiment_label === "NEGATIVE" || rating <= 2) {
      const owners = await pool.query(
        `SELECT u.id FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE r.name IN ('owner', 'administrator') AND u.status = 'active'`
      );
      for (const owner of owners.rows) {
        await createNotification({
          userId: owner.id,
          type: "NEGATIVE_REVIEW",
          title: `Negative ${targetType} Review (${rating}/5)`,
          message: `BERT detected ${bertResult.sentiment_label} sentiment (${bertResult.confidence_score}): "${comment.slice(0, 80)}"`,
        });
      }
    }

    return {
      ...review,
      sentiment: sentRes.rows[0],
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function listReviews({ targetType, productId, bookingId, lang }) {
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
  const rows = result.rows;

  if (lang === "ur") {
    for (const row of rows) {
      row.translated_comment = await translateText(row.comment, "ur");
    }
  }

  return rows;
}

async function flagReview(reviewId, reason, actorUserId) {
  const result = await pool.query(
    `UPDATE reviews
     SET is_flagged = TRUE, flag_reason = $2
     WHERE id = $1
     RETURNING id, user_id, target_type, rating, comment, is_flagged, flag_reason`,
    [reviewId, reason]
  );

  if (result.rowCount === 0) {
    const err = new Error("Review not found");
    err.status = 404;
    throw err;
  }

  await pool.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
     VALUES ($1, 'review.flag', 'review', $2, $3::jsonb)`,
    [actorUserId, reviewId, JSON.stringify({ reason })]
  );

  return result.rows[0];
}

async function getSentimentInsights() {
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
  createReview,
  listReviews,
  flagReview,
  getSentimentInsights,
};