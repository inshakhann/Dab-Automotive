const { analyzeWithBert } = require("../../integrations/sentiment.service");
const { translateText } = require("../../integrations/translate.service");
const { createNotification } = require("../notifications/notifications.service");
const reviewsRepo = require("./reviews.repository");

async function createReview({
  userId,
  targetType,
  productId,
  bookingId,
  rating,
  comment,
}) {
  const sentiment = await analyzeWithBert(comment);

  const created = await reviewsRepo.insertReviewWithSentiment({
    userId,
    targetType,
    productId,
    bookingId,
    rating,
    comment,
    sentiment,
  });

  if (sentiment.sentiment_label === "NEGATIVE" || rating <= 2) {
    const adminIds = await reviewsRepo.findActiveAdminIds();
    for (const adminId of adminIds) {
      await createNotification({
        userId: adminId,
        type: "NEGATIVE_REVIEW",
        title: `Negative ${targetType} Review (${rating}/5)`,
        message: `BERT detected ${sentiment.sentiment_label} sentiment (${sentiment.confidence_score}): "${comment.slice(0, 80)}"`,
      });
    }
  }

  return created;
}

async function listReviews({ targetType, productId, bookingId, lang }) {
  const rows = await reviewsRepo.findReviews({
    targetType,
    productId,
    bookingId,
  });

  if (lang === "ur") {
    for (const row of rows) {
      row.translated_comment = await translateText(row.comment, "ur");
    }
  }

  return rows;
}

async function flagReview(reviewId, reason, actorUserId) {
  const flagged = await reviewsRepo.markReviewFlagged(
    reviewId,
    reason,
    actorUserId
  );
  if (!flagged) {
    const err = new Error("Review not found");
    err.status = 404;
    throw err;
  }
  return flagged;
}

async function deleteReview(reviewId, actorUserId) {
  const deleted = await reviewsRepo.deleteReviewById(reviewId, actorUserId);
  if (!deleted) {
    const err = new Error("Review not found");
    err.status = 404;
    throw err;
  }
  return deleted;
}

async function getSentimentInsights() {
  return reviewsRepo.fetchSentimentStats();
}

module.exports = {
  createReview,
  listReviews,
  flagReview,
  deleteReview,
  getSentimentInsights,
};