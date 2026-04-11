// backend/middleware/auth.js
const { verifyToken }  = require("../utils/jwt");
const { fail }         = require("../utils/response");
const User             = require("../models/User");
const Admin            = require("../models/Admin");

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer "))
      return fail(res, "No token provided. Please log in.", 401);

    const decoded = verifyToken(header.split(" ")[1]);

    const actor = decoded.role === "admin"
      ? await Admin.findById(decoded.id)
      : await User.findById(decoded.id);

    if (!actor) return fail(res, "Account not found. Please log in again.", 401);
    req.user = actor;
    next();
  } catch (err) {
    // ✅ FIX: handle revoked tokens (logged-out sessions) explicitly
    const msg =
      err.name === "TokenExpiredError"  ? "Session expired. Please log in again." :
      err.name === "TokenRevokedError"  ? "Session has been revoked. Please log in again." :
                                          "Invalid token.";
    return fail(res, msg, 401);
  }
};

const requireProfileComplete = (req, res, next) => {
  if (!req.user)               return fail(res, "Unauthorised.", 401);
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