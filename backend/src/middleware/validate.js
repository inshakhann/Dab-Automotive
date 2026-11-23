const { validationResult } = require("express-validator");

function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Please correct the submitted details.",
      errors: errors.array({ onlyFirstError: true }).map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });
  }

  next();
}

module.exports = validate;