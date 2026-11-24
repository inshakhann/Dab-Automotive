const { matchedData } = require("express-validator");

const service = require("./users.service");

const {
  sendStaffDecisionEmail,
} = require("../../integrations/email.service");

async function listUsers(req, res, next) {
  try {
    const options = matchedData(req, {
      locations: ["query"],
    });

    const users = await service.listUsers(options);

    return res.status(200).json({
      success: true,
      page: options.page,
      limit: options.limit,
      users,
    });
  } catch (error) {
    next(error);
  }
}

async function reviewStaff(req, res, next) {
  try {
    const data = matchedData(req, {
      locations: ["params", "body"],
    });

    const user = await service.reviewStaff(
      req.user.id,
      data.id,
      data.decision
    );

    let notificationSent = false;

    // The account decision has already been committed.
    try {
      await sendStaffDecisionEmail(user);
      notificationSent = true;
    } catch (error) {
      console.error(
        "Staff decision email failed:",
        error.code || error.name
      );
    }

    return res.status(200).json({
      success: true,
      message:
        data.decision === "approve"
          ? "Staff account approved."
          : "Staff account rejected.",
      user,
      notification_sent: notificationSent,
      notification_mode: process.env.MAIL_MODE,
    });
  } catch (error) {
    if ([403, 404, 409].includes(error.statusCode)) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}

module.exports = {
  listUsers,
  reviewStaff,
};