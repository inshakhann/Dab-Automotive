const { matchedData } = require("express-validator");
const authService = require("./auth.service");

async function register(req, res, next) {
  try {
    // Only use fields that passed our validation rules.
    const data = matchedData(req, { locations: ["body"] });

    const user = await authService.registerUser(data);

    return res.status(201).json({
      success: true,
      message:
        user.status === "pending"
          ? "Staff registration submitted. Approval is required."
          : "Customer registered successfully.",
      user,
    });
  } catch (error) {
    // PostgreSQL's unique-email constraint prevents duplicates,
    // including simultaneous registration attempts.
    if (
      error.code === "23505" &&
      error.constraint === "users_email_unique"
    ) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    next(error);
  }
}

module.exports = { register };