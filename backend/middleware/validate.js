const { validationResult } = require("express-validator");
const { fail }             = require("../utils/response");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return fail(res, "Validation failed", 422, errors.array().map(({ path, msg }) => ({ path, msg })));
  next();
};

module.exports = validate;
