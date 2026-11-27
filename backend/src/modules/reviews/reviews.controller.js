const reviewsService = require("./reviews.service");

async function submitReview(req, res, next) {
  try {
    const review = await reviewsService.createReview({
      userId: req.user.id,
      targetType: req.body.target_type,
      productId: req.body.product_id,
      bookingId: req.body.booking_id,
      rating: req.body.rating,
      comment: req.body.comment,
    });
    return res.status(201).json({
      success: true,
      review,
    });
  } catch (error) {
    return next(error);
  }
}

async function getReviews(req, res, next) {
  try {
    const reviews = await reviewsService.listReviews({
      targetType: req.query.target_type,
      productId: req.query.product_id,
      bookingId: req.query.booking_id,
      lang: req.query.lang,
    });
    return res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    return next(error);
  }
}

async function moderateReview(req, res, next) {
  try {
    const review = await reviewsService.flagReview(
      req.params.id,
      req.body.reason,
      req.user.id
    );
    return res.status(200).json({
      success: true,
      review,
    });
  } catch (error) {
    return next(error);
  }
}

async function getInsights(req, res, next) {
  try {
    const insights = await reviewsService.getSentimentInsights();
    return res.status(200).json({
      success: true,
      ...insights,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  submitReview,
  getReviews,
  moderateReview,
  getInsights,
};