// backend/middleware/auth.js
const { verifyToken }  = require("../utils/jwt");
const { fail }         = require("../utils/response");
const User             = require("../models/User");
const Admin            = require("../models/Admin");
const { COOKIE_NAME }  = require("../controllers/authController");
const { ADMIN_COOKIE } = require("../controllers/adminController");

// ── Token extraction helpers ──────────────────────────────────────────────────
// Fix #5: read from HttpOnly cookie first, fall back to Authorization header
// (header fallback retains compatibility with mobile/API clients)
function extractToken(req) {
  if (req.cookies?.[COOKIE_NAME])  return req.cookies[COOKIE_NAME];
  if (req.cookies?.[ADMIN_COOKIE]) return req.cookies[ADMIN_COOKIE];
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.split(" ")[1];
  return null;
}

// ── Main auth middleware ──────────────────────────────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) return fail(res, "No token provided. Please log in.", 401);

    const decoded = await verifyToken(token);

    const actor = decoded.role === "admin"
      ? await Admin.findById(decoded.id)
      : await User.findById(decoded.id);

    if (!actor) return fail(res, "Account not found. Please log in again.", 401);
    req.user = actor;
    next();
  } catch (err) {
    const msg =
      err.name === "TokenExpiredError"  ? "Session expired. Please log in again."     :
      err.name === "TokenRevokedError"  ? "Session has been revoked. Please log in again." :
                                          "Invalid token.";
    return fail(res, msg, 401);
  }
};

// ── Role guards ───────────────────────────────────────────────────────────────
const requireProfileComplete = (req, res, next) => {
  if (!req.user)                return fail(res, "Unauthorised.", 401);
  if (req.user.role === "admin") return next();
  if (!req.user.isProfileComplete)
    return fail(res, "Complete your profile to access this service.", 403, {
      code: "PROFILE_INCOMPLETE", redirectTo: "/onboarding",
    });
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin")
    return fail(res, "Access denied. Admins only.", 403);
  next();
};

module.exports = { authenticate, requireProfileComplete, requireAdmin };