// backend/routes/authRoutes.js
const router      = require("express").Router();
const passport    = require("passport");
const { body }    = require("express-validator");
const rateLimit   = require("express-rate-limit");
const validate         = require("../middleware/validate");
const { authenticate, requireUser } = require("../middleware/auth");
const {
  signup, login, verifyOTPHandler, resendOTP,
  forgotPassword, resetPassword,
  googleCallback, getMe, logout,
} = require("../controllers/authController");

// ── Rate limiters ─────────────────────────────────────────────────────────────
const isDev = process.env.NODE_ENV !== "production";
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 5,
  message: { success: false, message: "Too many OTP requests. Try again in 15 minutes." },
});

// Stricter limit for password reset — prevents abuse
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 3,
  message: { success: false, message: "Too many reset requests. Try again in 15 minutes." },
});

// ── Validation rules ──────────────────────────────────────────────────────────
const signupRules = [
  body("fullName").isString().trim().isLength({ min: 1, max: 255 }).matches(/^[\p{L}\p{M}][\p{L}\p{M}\p{Zs}.\u2019\x27-]*$/u).withMessage("Full name is required."),
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required."),
  body("mobile").optional().matches(/^\+?[\d\s\-]{7,15}$/).withMessage("Invalid mobile number."),
  body("password")
    .isString().isLength({ min: 8 }).custom(value => Buffer.byteLength(value, "utf8") <= 72).withMessage("Password must be at least 8 characters.")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter.")
    .matches(/[0-9]/).withMessage("Password must contain at least one number.")
    .matches(/[^A-Za-z0-9]/).withMessage("Password must contain at least one special character."),
];

const loginRules = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required."),
  body("password").notEmpty().withMessage("Password is required."),
];

const otpRules = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required."),
  body("otp").matches(/^\d{6}$/).withMessage("OTP must be a 6-digit number."),
];

const resetPasswordRules = [
  body("token").notEmpty().withMessage("Reset token is required."),
  body("password")
    .isString().isLength({ min: 8 }).custom(value => Buffer.byteLength(value, "utf8") <= 72).withMessage("Password must be at least 8 characters.")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter.")
    .matches(/[0-9]/).withMessage("Password must contain at least one number.")
    .matches(/[^A-Za-z0-9]/).withMessage("Password must contain at least one special character."),
];

// ── Routes ────────────────────────────────────────────────────────────────────
router.post("/signup",     signupRules, validate, signup);
router.post("/login",      loginRules,  validate, login);
router.post("/verify-otp", otpRules,    validate, verifyOTPHandler);
router.post("/resend-otp", otpLimiter,
  [body("email").isEmail().normalizeEmail()], validate, resendOTP);

// ── Password reset (public — no auth required) ────────────────────────────────
router.post("/forgot-password", resetLimiter,
  [body("email").isEmail().normalizeEmail().withMessage("Valid email is required.")],
  validate, forgotPassword);

router.post("/reset-password", resetPasswordRules, validate, resetPassword);

// ── Google OAuth ──────────────────────────────────────────────────────────────
const requireGoogle = (req, res, next) => passport._strategy("google") ? next() : res.status(503).json({ success: false, message: "Google sign-in is unavailable. Use email sign-in." });
router.get("/google", requireGoogle,
  passport.authenticate("google", { scope: ["profile", "email"], session: false }));

router.get("/google/callback", requireGoogle,
  passport.authenticate("google", {
    session:         false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google`,
  }),
  googleCallback);

// ── Protected ─────────────────────────────────────────────────────────────────
router.get("/me",      authenticate, requireUser, getMe);
router.post("/logout", authenticate, requireUser, logout);

module.exports = router;