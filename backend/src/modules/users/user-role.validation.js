const { body, param } = require("express-validator");

function checkRoleFields(req, res, next) {
  const data = req.body;

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    Object.keys(data).length !== 1 ||
    !Object.prototype.hasOwnProperty.call(data, "role")
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide only the role field in the request body.",
    });
  }

  next();
}

const roleValidation = [
  checkRoleFields,

  param("id")
    .isInt({ min: 1, max: 2147483647 })
    .withMessage("A valid user ID is required.")
    .bail()
    .toInt(),

  body("role")
    .isString()
    .withMessage("Role must be text.")
    .bail()
    .isIn([
      "customer",
      "mechanic",
      "store_manager",
      "owner",
      "administrator",
    ])
    .withMessage(
      "Role must be customer, mechanic, store_manager, owner, or administrator."
    ),
];

module.exports = roleValidation;