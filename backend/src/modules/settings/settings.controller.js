const service = require("./settings.service");
async function list(req, res, next) {
  try {
    res.json({ success: true, settings: await service.listSettings() });
  } catch (error) {
    next(error);
  }
}
async function update(req, res, next) {
  try {
    res.json({
      success: true,
      message: "Settings updated.",
      settings: await service.updateSettings(req.user.id, req.body.settings),
    });
  } catch (error) {
    next(error);
  }
}
module.exports = { list, update };
