const { matchedData } = require("express-validator");
const service = require("./expenses.service");
async function list(req, res, next) {
  try {
    res.json({
      success: true,
      ...(await service.list(matchedData(req, { locations: ["query"] }))),
    });
  } catch (e) {
    next(e);
  }
}
async function get(req, res, next) {
  try {
    res.json({
      success: true,
      expense: await service.get(Number(req.params.id)),
    });
  } catch (e) {
    next(e);
  }
}
async function create(req, res, next) {
  try {
    res
      .status(201)
      .json({
        success: true,
        expense: await service.create(
          req.user.id,
          matchedData(req, { locations: ["body"] }),
        ),
      });
  } catch (e) {
    next(e);
  }
}
async function update(req, res, next) {
  try {
    res.json({
      success: true,
      expense: await service.update(
        req.user.id,
        Number(req.params.id),
        matchedData(req, { locations: ["body"] }),
      ),
    });
  } catch (e) {
    next(e);
  }
}
async function remove(req, res, next) {
  try {
    await service.remove(req.user.id, Number(req.params.id));
    res.json({ success: true, message: "Expense deleted." });
  } catch (e) {
    next(e);
  }
}
module.exports = { list, get, create, update, remove };
