const { body } = require("express-validator");
const { strictBody } = require("../../common/validation");
function profileRules(optional = false) {
  const rule = (name) => (optional ? body(name).optional() : body(name));
  return [
    rule("full_name").isString().bail().trim().isLength({ min: 2, max: 100 }),
    rule("email")
      .isString()
      .bail()
      .trim()
      .isLength({ max: 255 })
      .bail()
      .isEmail()
      .bail()
      .customSanitizer((v) => v.toLowerCase()),
    rule("phone")
      .isString()
      .bail()
      .trim()
      .matches(/^\+?[0-9 ()-]{7,30}$/),
    body("preferred_language").optional().isIn(["en", "ur"]),
  ];
}
const createValidation = [
  strictBody(
    ["full_name", "email", "phone", "password", "role", "preferred_language"],
    { required: ["full_name", "email", "phone", "password", "role"] },
  ),
  ...profileRules(),
  body("password")
    .isString()
    .bail()
    .isLength({ min: 12 })
    .bail()
    .custom((v) => Buffer.byteLength(v, "utf8") <= 72),
  body("role")
    .isString()
    .bail()
    .isIn(["customer", "mechanic", "store_manager", "owner", "administrator"]),
];
const editValidation = [
  strictBody(["full_name", "email", "phone", "preferred_language"]),
  ...profileRules(true),
];
module.exports = { createValidation, editValidation };
