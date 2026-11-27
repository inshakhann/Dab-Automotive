const notificationsService = require("./notifications.service");

async function getMyNotifications(req, res, next) {
  try {
    const limit = req.query.limit || 30;
    const data = await notificationsService.listUserNotifications(
      req.user.id,
      limit
    );
    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    return next(error);
  }
}

async function markOneRead(req, res, next) {
  try {
    const notification = await notificationsService.markNotificationRead(
      req.params.id,
      req.user.id
    );
    return res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    return next(error);
  }
}

async function markAllRead(req, res, next) {
  try {
    await notificationsService.markAllRead(req.user.id);
    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMyNotifications,
  markOneRead,
  markAllRead,
};