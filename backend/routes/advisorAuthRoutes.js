// backend/routes/advisorAuthRoutes.js
const router    = require("express").Router();
const { body }  = require("express-validator");
const rateLimit = require("express-rate-limit");
const validate  = require("../middleware/validate");
const { requireAdvisorSession } = require("../middleware/auth");
const {
  register,
  verifyOTPHandler,
  resendOTP,
  login,
  verifyLoginOTP,
  getMe,
  logout,
} = require("../controllers/advisorAuthController");

// ── Rate limiters ─────────────────────────────────────────────────────────────
const isTest = process.env.NODE_ENV === "test";

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many registration attempts. Please try again in 15 minutes." },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please try again in 15 minutes." },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many OTP requests. Please try again in 15 minutes." },
});

// ── Validation rules ──────────────────────────────────────────────────────────
const registerRules = [
  body("fullName")
    .trim()
    .notEmpty().withMessage("Full name is required.")
    .isLength({ max: 255 }).withMessage("Full name must be under 255 characters."),

  body("email")
    .isEmail().withMessage("Valid email address is required.")
    .normalizeEmail(),

  body("mobile")
    .optional({ checkFalsy: true })
    .matches(/^\+?[\d\s\-]{7,15}$/).withMessage("Invalid mobile number format."),

  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter.")
    .matches(/[0-9]/).withMessage("Password must contain at least one number.")
    .matches(/[^A-Za-z0-9]/).withMessage("Password must contain at least one special character."),

  body("firmName")
    .trim()
    .notEmpty().withMessage("Firm / Company name is required.")
    .isLength({ max: 255 }).withMessage("Firm name must be under 255 characters."),

  body("licenseNumber")
    .trim()
    .notEmpty().withMessage("License / Registration number (SEBI/AMFI/ARN/RIA) is required.")
    .isLength({ max: 100 }).withMessage("License number must be under 100 characters."),

  body("experienceYears")
    .optional()
    .isInt({ min: 0, max: 70 }).withMessage("Experience must be an integer between 0 and 70 years."),

  body("specializations")
    .optional()
    .isArray().withMessage("Specializations must be an array of strings."),

  body("bio")
    .optional()
    .isString().trim()
    .isLength({ max: 2000 }).withMessage("Bio must be under 2000 characters."),

  body("city")
    .optional()
    .isString().trim()
    .isLength({ max: 255 }),

  body("state")
    .optional()
    .isString().trim()
    .isLength({ max: 255 }),

  body("country")
    .optional()
    .isString().trim()
    .isLength({ max: 255 }),
];

const verifyOtpRules = [
  body("email")
    .isEmail().withMessage("Valid email address is required.")
    .normalizeEmail(),

  body("otp")
    .matches(/^\d{6}$/).withMessage("OTP must be a 6-digit numeric code."),
];

const resendOtpRules = [
  body("email")
    .isEmail().withMessage("Valid email address is required.")
    .normalizeEmail(),
];

const loginRules = [
  body("email")
    .isEmail().withMessage("Valid email address is required.")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required."),
];

const verifyLoginOtpRules = [
  body("email")
    .isEmail().withMessage("Valid email address is required.")
    .normalizeEmail(),

  body("otp")
    .matches(/^\d{6}$/).withMessage("OTP must be a 6-digit numeric code."),
];

// ── Endpoints ─────────────────────────────────────────────────────────────────
router.post("/register", registerLimiter, registerRules, validate, register);
router.post("/verify-otp", verifyOtpRules, validate, verifyOTPHandler);
router.post("/resend-otp", otpLimiter, resendOtpRules, validate, resendOTP);
router.post("/login", loginLimiter, loginRules, validate, login);
router.post("/verify-login-otp", verifyLoginOtpRules, validate, verifyLoginOTP);
router.get("/me", requireAdvisorSession, getMe);
router.post("/logout", requireAdvisorSession, logout);

module.exports = router;
