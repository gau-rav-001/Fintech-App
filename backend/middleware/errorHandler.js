const { fail } = require("../utils/response");

const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);

  // PostgreSQL unique constraint
  if (err.code === "23505") {
    const detail = err.detail || "";
    const field  = detail.match(/\(([^)]+)\)/)?.[1] || "field";
    return fail(res, `${field.replace(/_/g," ")} already exists.`, 409);
  }
  // PostgreSQL foreign key violation
  if (err.code === "23503") return fail(res, "Referenced record not found.", 400);
  // PostgreSQL invalid enum
  if (err.code === "22P02") return fail(res, "Invalid value provided.", 400);

  if (err.name === "JsonWebTokenError")  return fail(res, "Invalid token.", 401);
  if (err.name === "TokenExpiredError")  return fail(res, "Token expired.", 401);

  const status  = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === "production" && status === 500
    ? "Internal server error."
    : err.message || "Internal server error.";
  return fail(res, message, status);
};

const notFound = (req, res) =>
  fail(res, `${req.method} ${req.originalUrl} not found.`, 404);

module.exports = { errorHandler, notFound };
