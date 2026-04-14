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

// ── Shared JSONB item validators (Fix #6) ─────────────────────────────────────
const expenseItemSchema = body("expenses").optional().isArray()
  .withMessage("Expenses must be an array.")
  .custom((arr) => {
    for (const item of arr) {
      if (!item.category || typeof item.category !== "string")
        throw new Error("Each expense must have a string 'category'.");
      const amount = parseFloat(item.amount);
      if (isNaN(amount) || amount < 0)
        throw new Error("Each expense 'amount' must be a non-negative number.");
    }
    return true;
  });

const investmentItemSchema = body("investments").optional().isArray()
  .withMessage("Investments must be an array.")
  .custom((arr) => {
    for (const item of arr) {
      if (!item.type || typeof item.type !== "string")
        throw new Error("Each investment must have a string 'type'.");
      const invested = parseFloat(item.investedAmount);
      if (isNaN(invested) || invested < 0)
        throw new Error("Each investment 'investedAmount' must be a non-negative number.");
    }
    return true;
  });

const goalItemSchema = body("goals").optional().isArray()
  .withMessage("Goals must be an array.")
  .custom((arr) => {
    for (const item of arr) {
      if (!item.name || typeof item.name !== "string")
        throw new Error("Each goal must have a string 'name'.");
      const target = parseFloat(item.targetAmount);
      if (isNaN(target) || target <= 0)
        throw new Error("Each goal 'targetAmount' must be a positive number.");
    }
    return true;
  });

const loanItemSchema = body("loans").optional().isArray()
  .withMessage("Loans must be an array.")
  .custom((arr) => {
    for (const item of arr) {
      if (!item.type || typeof item.type !== "string")
        throw new Error("Each loan must have a string 'type'.");
      const outstanding = parseFloat(item.outstandingAmount);
      if (isNaN(outstanding) || outstanding < 0)
        throw new Error("Each loan 'outstandingAmount' must be a non-negative number.");
    }
    return true;
  });

// Fix #7: profilePicture must be a valid HTTPS URL
const profilePictureRule = body("profilePicture")
  .optional()
  .isURL({ protocols: ["https"], require_protocol: true })
  .withMessage("Profile picture must be a valid HTTPS URL.");

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

  body("riskProfile.timeHorizonYears")
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage("Time horizon must be between 1 and 50 years."),

  // Fix #6: validate JSONB array item shapes
  expenseItemSchema,
  investmentItemSchema,
  goalItemSchema,
  loanItemSchema,

  // Fix #7
  profilePictureRule,

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
  body("riskProfile.timeHorizonYears")
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage("Time horizon must be between 1 and 50 years."),

  // Fix #6 + #7 on update too
  expenseItemSchema,
  investmentItemSchema,
  goalItemSchema,
  loanItemSchema,
  profilePictureRule,
], validate, updateProfile);

// ── Password ──────────────────────────────────────────────────────────────────
router.post("/change-password", [
  body("currentPassword").notEmpty().withMessage("Current password is required."),
  body("newPassword")
    .isLength({ min: 8 }).withMessage("New password must be at least 8 characters.")
    .matches(/[A-Z]/).withMessage("New password must contain at least one uppercase letter.")
    .matches(/[0-9]/).withMessage("New password must contain at least one number.")
    .matches(/[^A-Za-z0-9]/).withMessage("New password must contain at least one special character."),
], validate, changePassword);

// ── Dashboard — requires completed profile ────────────────────────────────────
router.get("/dashboard/summary", requireProfileComplete, getDashboardSummary);

module.exports = router;