const { matchedData } = require("express-validator");

const service = require("./password-reset.service");

function forgotPassword(req, res) {
  const data = matchedData(req, {
    locations: ["body"],
  });

  res.status(202).json({
    success: true,
    message:
      "If this account is eligible, a password-reset code will be sent. Please wait before requesting another.",
  });

  // Send the same immediate response for existing and unknown accounts.
  // Process database work and email delivery afterward.
  setImmediate(async () => {
    try {
      await service.requestPasswordReset(data.email);
    } catch (error) {
      // Avoid printing passwords, OTPs or email contents.
      console.error(
        "Password-reset delivery failed. Check database, internet and email settings.",
        error.code || error.name
      );
    }
  });
}

async function resetPassword(req, res, next) {
  try {
    const data = matchedData(req, {
      locations: ["body"],
    });

    const successful = await service.resetPassword(data);

    if (!successful) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid, expired or already-used OTP. Request a new code if needed.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  forgotPassword,
  resetPassword,
};