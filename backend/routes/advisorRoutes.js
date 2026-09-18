// backend/routes/advisorRoutes.js
const router    = require("express").Router();
const { body, query } = require("express-validator");
const rateLimit = require("express-rate-limit");
const validate  = require("../middleware/validate");
const { requireAdvisorSession, requireAdvisorClientAccess } = require("../middleware/auth");
const {
  getActiveClients,
  getClientDetail,
  getDashboardStats,
  createInvitation,
  createRequest,
} = require("../controllers/advisorClientController");

const isTest = process.env.NODE_ENV === "test";

// ── Rate limiters ─────────────────────────────────────────────────────────────
const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many invitation attempts. Please try again in 15 minutes." },
});

// ── Validation rules ──────────────────────────────────────────────────────────
const clientListRules = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer."),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be an integer between 1 and 100."),
  query("search")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Search query cannot exceed 255 characters."),
];

const inviteRules = [
  body("clientEmail")
    .trim()
    .isEmail()
    .withMessage("A valid client email address is required.")
    .normalizeEmail(),
  body("clientName")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Client name cannot exceed 255 characters."),
  body("notes")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Notes cannot exceed 1000 characters."),
];

const requestRules = [
  body("userEmail")
    .trim()
    .isEmail()
    .withMessage("A valid user email address is required.")
    .normalizeEmail(),
  body("notes")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Notes cannot exceed 1000 characters."),
];

// All advisor operational routes require a valid, approved advisor database session
router.use(requireAdvisorSession);

// ── GET /api/advisor/dashboard/stats (Phase 5.3 - Dashboard Statistics) ────────
router.get("/dashboard/stats", getDashboardStats);

// ── GET /api/advisor/clients ──────────────────────────────────────────────────
router.get("/clients", clientListRules, validate, getActiveClients);

// ── GET /api/advisor/clients/:clientId (Phase 5.2 - Read-Only Client Detail) ──
router.get("/clients/:clientId", requireAdvisorClientAccess, getClientDetail);

// ── POST /api/advisor/invitations (Phase 6.1 - Advisor Client Invitation) ─────
router.post("/invitations", inviteLimiter, inviteRules, validate, createInvitation);

// ── POST /api/advisor/requests (Phase 6.3 - Existing User Connection Request) ──
router.post("/requests", inviteLimiter, requestRules, validate, createRequest);

module.exports = router;
