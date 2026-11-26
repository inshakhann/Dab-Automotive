const { body, query } = require("express-validator");
const {
  strictBody,
  strictQuery,
  isDate,
  dateQuery,
  pagination,
  idParam,
} = require("../../common/validation");
const categories = [
  "rent",
  "utilities",
  "salaries",
  "supplies",
  "maintenance",
  "marketing",
  "transport",
  "other",
];
const fields = ["title", "category", "amount", "expense_date", "notes"];
function writeValidation(update = false) {
  const rule = (name) => (update ? body(name).optional() : body(name));
  return [
    strictBody(fields, {
      required: update ? [] : ["title", "category", "amount", "expense_date"],
    }),
    rule("title").isString().bail().trim().isLength({ min: 1, max: 150 }),
    rule("category").isString().bail().isIn(categories),
    rule("amount")
      .isString()
      .withMessage("Amount must be a decimal string, for example 1250.00.")
      .bail()
      .matches(/^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,2})?$/)
      .bail()
      .custom((v) => Number(v) > 0)
      .withMessage(
        "Amount must be greater than zero with at most two decimal places.",
      ),
    rule("expense_date")
      .custom(isDate)
      .withMessage("expense_date must be a real YYYY-MM-DD date."),
    body("notes").optional().isString().bail().isLength({ max: 2000 }),
  ];
}
const listValidation = [
  strictQuery(["page", "limit", "category", "start_date", "end_date"]),
  ...pagination(),
  query("category").optional().isIn(categories),
  dateQuery("start_date"),
  dateQuery("end_date"),
];
module.exports = { categories, writeValidation, listValidation, idParam };
