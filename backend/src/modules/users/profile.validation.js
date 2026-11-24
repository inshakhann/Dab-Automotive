const { body } = require("express-validator");

function checkProfileFields(req, res, next) {
  const data = req.body;

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return res.status(400).json({
      success: false,
      message: "Provide a JSON object containing profile fields.",
    });
  }

  const allowedFields = [
    "full_name",
    "phone",
    "preferred_language",
  ];

  const submittedFields = Object.keys(data);

  if (submittedFields.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Provide at least one profile field to update.",
    });
  }

  const hasUnknownField = submittedFields.some(
    (field) => !allowedFields.includes(field)
  );

  if (hasUnknownField) {
    return res.status(400).json({
      success: false,
      message:
        "Only full_name, phone and preferred_language can be updated here.",
    });
  }

  return next();
}

const profileValidation = [
  checkProfileFields,

  body("full_name")
    .optional()
    .isString()
    .withMessage("Full name must be text.")
    .bail()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must contain 2 to 100 characters."),

  body("phone")
    .optional()
    .isString()
    .withMessage("Phone must be provided as text.")
    .bail()
    .trim()
    .matches(/^\+?[0-9 ()-]{7,30}$/)
    .withMessage("Enter a valid phone number."),

  body("preferred_language")
    .optional()
    .isString()
    .withMessage("Preferred language must be text.")
    .bail()
    .isIn(["en", "ur"])
    .withMessage("Preferred language must be en or ur."),
];

module.exports = {
  profileValidation,
};