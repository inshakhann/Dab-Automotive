const { strictQuery, dateQuery } = require("../../common/validation");
module.exports = [
  strictQuery(["start_date", "end_date"]),
  dateQuery("start_date", true),
  dateQuery("end_date", true),
];
