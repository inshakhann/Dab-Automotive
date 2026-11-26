const { matchedData } = require("express-validator");
const service = require("./admin-users.service");
function handle(error, res, next) {
  if (error.code === "23505" && error.constraint === "users_email_unique")
    return res
      .status(409)
      .json({ success: false, message: "Email is already registered." });
  next(error);
}
async function get(req, res, next) {
  try {
    res.json({ success: true, user: await service.get(Number(req.params.id)) });
  } catch (e) {
    handle(e, res, next);
  }
}
async function create(req, res, next) {
  try {
    res
      .status(201)
      .json({
        success: true,
        user: await service.create(
          req.user.id,
          matchedData(req, { locations: ["body"] }),
        ),
      });
  } catch (e) {
    handle(e, res, next);
  }
}
async function edit(req, res, next) {
  try {
    res.json({
      success: true,
      message:
        "User updated. Previous access tokens and reset codes are invalid.",
      user: await service.edit(
        req.user.id,
        Number(req.params.id),
        matchedData(req, { locations: ["body"] }),
      ),
    });
  } catch (e) {
    handle(e, res, next);
  }
}
module.exports = { get, create, edit };
