const { query, param } = require("express-validator");
const { httpError } = require("./errors");
function strictBody(fields, { required = [], nonempty = true } = {}) {
  return (req, res, next) => {
    const value = req.body;
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      (nonempty && !Object.keys(value).length) ||
      Object.keys(value).some((key) => !fields.includes(key)) ||
      required.some((key) => !Object.prototype.hasOwnProperty.call(value, key))
    ) {
      return next(
        httpError(
          400,
          `Provide a JSON object containing only: ${fields.join(", ")}. Required: ${required.join(", ") || "at least one field"}.`,
        ),
      );
    }
    next();
  };
}
function strictQuery(fields) {
  return (req, res, next) => {
    if (
      Object.entries(req.query).some(
        ([key, value]) => !fields.includes(key) || typeof value !== "string",
      )
    ) {
      return next(httpError(400, "Unsupported or repeated query parameter."));
    }
    next();
  };
}
function isDate(value) {
  if (
    typeof value !== "string" ||
    !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) ||
    value.startsWith("0000")
  )
    return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
function dateQuery(name, required = false) {
  const chain = query(name);
  if (!required) chain.optional();
  return chain
    .custom(isDate)
    .withMessage(`${name} must be a real date in YYYY-MM-DD format.`);
}
function checkDateRange(filters) {
  if (
    filters.start_date &&
    filters.end_date &&
    filters.start_date > filters.end_date
  ) {
    throw httpError(400, "start_date must be on or before end_date.");
  }
}
function pagination() {
  return [
    query("page").default("1").isInt({ min: 1, max: 1000000 }).bail().toInt(),
    query("limit").default("20").isInt({ min: 1, max: 100 }).bail().toInt(),
  ];
}
function idParam() {
  return param("id")
    .isInt({ min: 1, max: 2147483647 })
    .withMessage("A valid ID is required.")
    .bail()
    .toInt();
}
module.exports = {
  strictBody,
  strictQuery,
  isDate,
  dateQuery,
  checkDateRange,
  pagination,
  idParam,
};
