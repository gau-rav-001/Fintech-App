const router      = require("express").Router();
const passport    = require("passport");
const { body }    = require("express-validator");
const rateLimit   = require("express-rate-limit");
const validate         = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const {
  signup, login, verifyOTPHandler, resendOTP,
  googleCallback, getMe, logout,
  exchangeCode,   // ✅ FIX #5: import the new exchangeCode handler
} = require("../controllers/authController");

// ── OTP rate limiter ──────────────────────────────────────────────────────────
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many OTP requests. Try again in 15 minutes." },
});

// ── Validation rules ──────────────────────────────────────────────────────────
const signupRules = [
  body("fullName").trim().notEmpty().withMessage("Full name is required."),
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required."),
  body("mobile").optional().matches(/^\+?[\d\s\-]{7,15}$/).withMessage("Invalid mobile number."),
  body("password")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
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

// ── Routes ────────────────────────────────────────────────────────────────────
router.post("/signup",     signupRules, validate, signup);
router.post("/login",      loginRules,  validate, login);
router.post("/verify-otp", otpRules,    validate, verifyOTPHandler);
router.post("/resend-otp", otpLimiter,
  [body("email").isEmail().normalizeEmail()], validate, resendOTP);

// ✅ FIX #5: Google OAuth code-exchange endpoint — AuthCallback.tsx calls this
//   but it was never defined. Without it the frontend gets a 404 after Google OAuth.
router.post("/exchange-code",
  [body("code").notEmpty().withMessage("Code is required.")],
  validate,
  exchangeCode,
);

// Google OAuth
router.get("/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false }));

router.get("/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google`,
  }),
  googleCallback);

// Protected
router.get("/me",      authenticate, getMe);
router.post("/logout", authenticate, logout);

module.exports = router;