// backend/routes/userRoutes.js
const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate, requireProfileComplete } = require("../middleware/auth");
const {
  onboarding, getProfile, updateProfile,
  changePassword, getDashboardSummary,
} = require("../controllers/userController");

// All user routes require a valid JWT
router.use(authenticate);

// ── POST /api/user/onboarding ─────────────────────────────────────────────────
router.post("/onboarding", [
  body("dob")
    .optional()
    .isISO8601().withMessage("Invalid date of birth (use YYYY-MM-DD)."),

  body("gender")
    .optional()
    .isIn(["male", "female", "other", "prefer_not_to_say"])
    .withMessage("Gender must be one of: male, female, other, prefer_not_to_say."),

  body("maritalStatus")
    .optional()
    .isIn(["single", "married", "divorced", "widowed"])
    .withMessage("Marital status must be one of: single, married, divorced, widowed."),

  body("dependents")
    .optional()
    .isInt({ min: 0 }).withMessage("Dependents must be a non-negative integer."),

  body("occupation")
    .optional()
    .isString().trim().isLength({ max: 255 })
    .withMessage("Occupation must be a string under 255 characters."),

  body("city").optional().isString().trim().isLength({ max: 255 }),
  body("state").optional().isString().trim().isLength({ max: 255 }),
  body("country").optional().isString().trim().isLength({ max: 255 }),

  body("income.monthly")
    .optional()
    .isFloat({ min: 0 }).withMessage("Monthly income must be a non-negative number."),

  body("income.additionalMonthly")
    .optional()
    .isFloat({ min: 0 }).withMessage("Additional income must be a non-negative number."),

  body("income.source")
    .optional()
    .isIn(["salaried", "self_employed", "business", "freelance", "other"])
    .withMessage("Income source must be one of: salaried, self_employed, business, freelance, other."),

  body("income.annualGrowthPct")
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage("Annual growth % must be between 0 and 100."),

  body("riskProfile.tolerance")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Risk tolerance must be one of: low, medium, high."),

  body("riskProfile.experience")
    .optional()
    .isIn(["beginner", "intermediate", "expert"])
    .withMessage("Risk experience must be one of: beginner, intermediate, expert."),

  body("riskProfile.investmentStyle")
    .optional()
    .isIn(["conservative", "balanced", "aggressive"])
    .withMessage("Investment style must be one of: conservative, balanced, aggressive."),

  // FIX: min changed from 0 to 1 to match the DB CHECK constraint
  //      (risk_horizon_years > 0). Sending 0 previously passed route
  //      validation but then caused a DB constraint violation and returned
  //      a confusing 500 instead of a clean 400.
  body("riskProfile.timeHorizonYears")
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage("Time horizon must be between 1 and 50 years."),

  body("expenses")
    .optional()
    .isArray().withMessage("Expenses must be an array."),

  body("investments")
    .optional()
    .isArray().withMessage("Investments must be an array."),

  body("goals")
    .optional()
    .isArray().withMessage("Goals must be an array."),

  body("loans")
    .optional()
    .isArray().withMessage("Loans must be an array."),

], validate, onboarding);

// ── Profile ───────────────────────────────────────────────────────────────────
router.get("/profile", getProfile);

router.put("/update", [
  body("fullName").optional().trim().notEmpty().isLength({ max: 255 }),
  body("mobile").optional().matches(/^\+?[\d\s\-]{7,15}$/),
  body("gender").optional().isIn(["male", "female", "other", "prefer_not_to_say"]),
  body("maritalStatus").optional().isIn(["single", "married", "divorced", "widowed"]),
  body("occupation").optional().isString().trim().isLength({ max: 255 }),
  body("income.source").optional()
    .isIn(["salaried", "self_employed", "business", "freelance", "other"]),
  body("riskProfile.tolerance").optional().isIn(["low", "medium", "high"]),
  body("riskProfile.investmentStyle").optional()
    .isIn(["conservative", "balanced", "aggressive"]),
  // FIX: same min:1 guard on the update route
  body("riskProfile.timeHorizonYears")
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage("Time horizon must be between 1 and 50 years."),
], validate, updateProfile);

// ── Password ──────────────────────────────────────────────────────────────────
router.post("/change-password", [
  body("currentPassword").notEmpty().withMessage("Current password is required."),

  // FIX: apply the same password-strength rules as signup.
  //      Previously only isLength({ min: 8 }) was checked, allowing users to
  //      downgrade to a weaker password after account creation.
  body("newPassword")
    .isLength({ min: 8 }).withMessage("New password must be at least 8 characters.")
    .matches(/[A-Z]/).withMessage("New password must contain at least one uppercase letter.")
    .matches(/[0-9]/).withMessage("New password must contain at least one number.")
    .matches(/[^A-Za-z0-9]/).withMessage("New password must contain at least one special character."),
], validate, changePassword);

// ── Dashboard — requires completed profile ────────────────────────────────────
router.get("/dashboard/summary", requireProfileComplete, getDashboardSummary);

module.exports = router;
