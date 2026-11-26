const { body, param } = require("express-validator");

function checkStatusFields(req, res, next) {
  const data = req.body;

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    Object.keys(data).length !== 1 ||
    !Object.prototype.hasOwnProperty.call(data, "status")
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide only the status field in the request body.",
    });
  }

  return next();
}

const statusValidation = [
  checkStatusFields,

  param("id")
    .isInt({ min: 1, max: 2147483647 })
    .withMessage("A valid user ID is required.")
    .bail()
    .toInt(),

  body("status")
    .isString()
    .withMessage("Status must be text.")
    .bail()
    .isIn(["active", "inactive"])
    .withMessage("Status must be active or inactive."),
];

module.exports = {
  statusValidation,
};
