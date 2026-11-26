const { query } = require("express-validator");

const allowedFields = new Set([
  "page",
  "limit",
  "action",
  "actor_user_id",
  "entity_type",
  "entity_id",
  "start_date",
  "end_date",
]);

function checkQueryFields(req, res, next) {
  for (const [key, value] of Object.entries(req.query)) {
    if (!allowedFields.has(key)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported query parameter: ${key}`,
      });
    }

    if (typeof value !== "string") {
      return res.status(400).json({
        success: false,
        message: `${key} must be supplied once as text.`,
      });
    }
  }

  next();
}

function dateValidation(field) {
  return query(field)
    .optional()
    .isString()
    .bail()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage(`${field} must use YYYY-MM-DD.`)
    .bail()
    .isISO8601({ strict: true })
    .withMessage(`${field} must be a valid calendar date.`)
    .bail()
    .custom((value) => !value.startsWith("0000-"))
    .withMessage(`${field} must have a year greater than zero.`);
}

const auditValidation = [
  checkQueryFields,

  query("page")
    .default("1")
    .isInt({ min: 1, max: 1000000 })
    .withMessage("Page must be between 1 and 1000000.")
    .bail()
    .toInt(),

  query("limit")
    .default("20")
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100.")
    .bail()
    .toInt(),

  query("action")
    .optional()
    .isString()
    .bail()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Action must contain 1 to 100 characters."),

  query("actor_user_id")
    .optional()
    .isInt({ min: 1, max: 2147483647 })
    .withMessage("Actor user ID must be a positive integer.")
    .bail()
    .toInt(),

  query("entity_type")
    .optional()
    .isString()
    .bail()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Entity type must contain 1 to 50 characters."),

  query("entity_id")
    .optional()
    .isInt({ min: 1, max: 2147483647 })
    .withMessage("Entity ID must be a positive integer.")
    .bail()
    .toInt(),

  dateValidation("start_date"),
  dateValidation("end_date"),
];

module.exports = auditValidation;
