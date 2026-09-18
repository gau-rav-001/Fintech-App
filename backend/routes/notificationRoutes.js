// backend/routes/notificationRoutes.js
// ── SmartFinance Notification Routes ──────────────────────────────────────────
// Authenticated endpoints for listing, unread counting, and reading notifications.
// Scoped to the authenticated actor (User, Advisor, or Admin).

const router                  = require("express").Router();
const { query, param }        = require("express-validator");
const rateLimit               = require("express-rate-limit");
const validate                = require("../middleware/validate");
const { verifyToken }         = require("../utils/jwt");
const { fail }                = require("../utils/response");
const User                    = require("../models/User");
const Advisor                 = require("../models/Advisor");
const Admin                   = require("../models/Admin");
const { COOKIE_NAME }         = require("../controllers/authController");
const { ADMIN_COOKIE }        = require("../controllers/adminController");
const { ADVISOR_COOKIE }      = require("../controllers/advisorAuthController");
const {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notificationController");

const isTest = process.env.NODE_ENV === "test";

// ── Rate limiters ─────────────────────────────────────────────────────────────
const notificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 5000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many notification requests. Please try again later." },
});

// ── Authentication middleware for multi-actor notification access ─────────────
// Determines whether the caller is an authenticated User, Advisor, or Admin.
// Attaches req.notificationActor = { type: 'user'|'advisor'|'admin', id: string, record: object }
async function authenticateNotificationActor(req, res, next) {
  try {
    const advCookie   = req.cookies?.[ADVISOR_COOKIE];
    const userCookie  = req.cookies?.[COOKIE_NAME];
    const adminCookie = req.cookies?.[ADMIN_COOKIE];
    const authHeader  = req.headers?.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    // 1. If explicit Bearer token is supplied
    if (bearerToken) {
      try {
        const decoded = await verifyToken(bearerToken);
        if (decoded.role === "advisor") {
          const advisor = await Advisor.findById(decoded.id);
          if (advisor && advisor.approvalStatus === "approved" && advisor.isEmailVerified) {
            req.notificationActor = { type: "advisor", id: advisor.id, record: advisor };
            req.advisor = advisor;
            req.user = advisor;
            return next();
          }
          return fail(res, "Advisor account not authorized.", 403);
        } else if (decoded.role === "admin") {
          const admin = await Admin.findById(decoded.id);
          if (admin && admin.isActive) {
            req.notificationActor = { type: "admin", id: admin.id, record: admin };
            req.user = admin;
            return next();
          }
          return fail(res, "Admin account inactive.", 403);
        } else if (decoded.role === "user") {
          const user = await User.findById(decoded.id);
          if (user) {
            req.notificationActor = { type: "user", id: user.id, record: user };
            req.user = user;
            return next();
          }
          return fail(res, "User account not found.", 401);
        }
      } catch (err) {
        return fail(res, "Invalid or expired authorization token.", 401);
      }
    }

    // 2. Check for Advisor cookie session (prioritize if header x-actor-type === 'advisor' or only advisor cookie present)
    const isAdvisorRequested = req.headers?.["x-actor-type"] === "advisor";
    if (advCookie && (isAdvisorRequested || (!userCookie && !adminCookie))) {
      try {
        const decoded = await verifyToken(advCookie);
        if (decoded.role === "advisor") {
          const advisor = await Advisor.findById(decoded.id);
          if (advisor && advisor.approvalStatus === "approved" && advisor.isEmailVerified) {
            req.notificationActor = { type: "advisor", id: advisor.id, record: advisor };
            req.advisor = advisor;
            req.user = advisor;
            return next();
          }
          return fail(res, "Advisor account not authorized.", 403);
        }
      } catch (err) {
        // Fall through
      }
    }

    // 3. Check for Admin cookie session
    if (adminCookie) {
      try {
        const decoded = await verifyToken(adminCookie);
        if (decoded.role === "admin") {
          const admin = await Admin.findById(decoded.id);
          if (admin && admin.isActive) {
            req.notificationActor = { type: "admin", id: admin.id, record: admin };
            req.user = admin;
            return next();
          }
        }
      } catch (err) {
        // Fall through
      }
    }

    // 4. Check for User cookie session
    if (userCookie) {
      try {
        const decoded = await verifyToken(userCookie);
        if (decoded.role === "user") {
          const user = await User.findById(decoded.id);
          if (user) {
            req.notificationActor = { type: "user", id: user.id, record: user };
            req.user = user;
            return next();
          }
        }
      } catch (err) {
        // Fall through
      }
    }

    // 5. Fallback: if advisor cookie was present but not prioritized earlier
    if (advCookie && !req.notificationActor) {
      try {
        const decoded = await verifyToken(advCookie);
        if (decoded.role === "advisor") {
          const advisor = await Advisor.findById(decoded.id);
          if (advisor && advisor.approvalStatus === "approved" && advisor.isEmailVerified) {
            req.notificationActor = { type: "advisor", id: advisor.id, record: advisor };
            req.advisor = advisor;
            req.user = advisor;
            return next();
          }
        }
      } catch (err) {
        // Fall through
      }
    }

    return fail(res, "No authenticated session provided. Please log in.", 401);
  } catch (err) {
    console.error("authenticateNotificationActor error:", err);
    return fail(res, "Authentication failed.", 401);
  }
}

// ── Validation rules ──────────────────────────────────────────────────────────
const listValidationRules = [
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be an integer between 1 and 50."),
  query("offset")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Offset must be a non-negative integer."),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer."),
  query("unreadOnly")
    .optional()
    .isBoolean()
    .withMessage("unreadOnly must be a boolean value."),
];

const notificationIdRule = [
  param("notificationId")
    .isUUID()
    .withMessage("Notification ID must be a valid UUID."),
];

// All notification routes require rate limiting and valid actor authentication
router.use(notificationLimiter);
router.use(authenticateNotificationActor);

// ── Endpoints ─────────────────────────────────────────────────────────────────
// GET /api/notifications
router.get("/", listValidationRules, validate, getNotifications);

// GET /api/notifications/unread-count
router.get("/unread-count", getUnreadCount);

// PATCH /api/notifications/:notificationId/read
router.patch("/:notificationId/read", notificationIdRule, validate, markNotificationRead);

// PATCH /api/notifications/read-all
router.patch("/read-all", markAllNotificationsRead);

module.exports = router;
module.exports.authenticateNotificationActor = authenticateNotificationActor;
