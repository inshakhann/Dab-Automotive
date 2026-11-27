function validateCreateReview(req, res, next) {
  const { target_type, product_id, booking_id, rating, comment } = req.body;

  if (!["product", "service", "workshop"].includes(target_type)) {
    return res.status(400).json({
      success: false,
      message: "target_type must be product, service, or workshop",
    });
  }

  const parsedRating = Number(rating);
  if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    return res.status(400).json({
      success: false,
      message: "rating must be an integer between 1 and 5",
    });
  }

  if (!comment || typeof comment !== "string" || comment.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: "comment must be at least 3 characters long",
    });
  }

  if (target_type === "product" && !product_id) {
    return res.status(400).json({
      success: false,
      message: "product_id is required for product reviews",
    });
  }

  if (target_type === "service" && !booking_id) {
    return res.status(400).json({
      success: false,
      message: "booking_id is required for service reviews",
    });
  }

  req.body.rating = parsedRating;
  req.body.comment = comment.trim();
  return next();
}

function validateFlagReview(req, res, next) {
  const { reason } = req.body;
  if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
    return res.status(400).json({
      success: false,
      message: "reason is required and must be at least 3 characters long",
    });
  }

  req.body.reason = reason.trim();
  return next();
}

module.exports = {
  validateCreateReview,
  validateFlagReview,
};