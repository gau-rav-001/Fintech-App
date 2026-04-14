// backend/controllers/authController.js
const bcrypt = require("bcryptjs");
const User   = require("../models/User");
const { signToken, buildPayload, revokeToken } = require("../utils/jwt");
const { generateOTP, saveOTP, verifyOTP, lockout } = require("../utils/otp");
const { sendOTPEmail, sendWelcomeEmail }            = require("../utils/email");
const { ok, fail }                                  = require("../utils/response");

// ── Cookie helpers ────────────────────────────────────────────────────────────
const COOKIE_NAME = "sf_token";
const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.COOKIE_SECURE === "true",
  sameSite: process.env.COOKIE_SAME_SITE || "lax",
  maxAge:   24 * 60 * 60 * 1000, // 1 day
  path:     "/",
};

function setAuthCookie(res, token, maxAgeMs) {
  res.cookie(COOKIE_NAME, token, { ...COOKIE_OPTS, maxAge: maxAgeMs || COOKIE_OPTS.maxAge });
}
function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, path: "/" });
}

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
const signup = async (req, res) => {
  try {
    const { fullName, email, mobile, password } = req.body;
    const existing = await User.findByEmail(email);
    if (existing) return fail(res, "An account with this email already exists.", 409);

    const user = await User.create({ fullName, email, mobile, password, provider: "email" });
    const otp  = generateOTP();
    await saveOTP(email, otp);
    await sendOTPEmail(email, otp, fullName);
    return ok(res, { userId: user.id, email }, "Account created! Check your email for the OTP.", 201);
  } catch (err) {
    console.error("signup:", err);
    return fail(res, "Signup failed.", 500);
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (lockout.isLocked(email)) {
      return fail(res, `Account locked. Try again in ${lockout.minutesLeft(email)} minute(s).`, 429);
    }

    const user = await User.findByEmailWithPassword(email);

    if (!user || user.provider !== "email") {
      await bcrypt.compare(password, "$2b$12$dummyhashtopreventtimingattack00000000000000000");
      lockout.record(email);
      return fail(res, "Invalid email or password.", 401);
    }
    const match = await User.comparePassword(user.passwordHash, password);
    if (!match) {
      lockout.record(email);
      return fail(res, "Invalid email or password.", 401);
    }

    lockout.clear(email);
    const otp = generateOTP();
    await saveOTP(email, otp);
    await sendOTPEmail(email, otp, user.fullName);
    return ok(res, { email, requiresOTP: true }, "OTP sent to your email.");
  } catch (err) {
    console.error("login:", err);
    return fail(res, "Login failed.", 500);
  }
};

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
const verifyOTPHandler = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const result = await verifyOTP(email, otp);
    if (!result.valid) return fail(res, result.error, 400);

    let user = await User.findByEmail(email);
    if (!user) return fail(res, "User not found.", 404);

    if (!user.isEmailVerified) {
      user = await User.update(user.id, { isEmailVerified: true });
      sendWelcomeEmail(email, user.fullName).catch(console.warn);
    }

    const token = signToken(buildPayload(user));
    setAuthCookie(res, token);

    // Return user in response body so frontend can update React state immediately
    return ok(res, {
      user,
      isProfileComplete: user.isProfileComplete,
      redirectTo: user.isProfileComplete ? "/dashboard" : "/onboarding",
    }, "Login successful.");
  } catch (err) {
    console.error("verify-otp:", err);
    return fail(res, "OTP verification failed.", 500);
  }
};

// ── POST /api/auth/resend-otp ─────────────────────────────────────────────────
// Never reveals whether the email exists (anti-enumeration)
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findByEmail(email);
    if (user) {
      const otp = generateOTP();
      await saveOTP(email, otp);
      await sendOTPEmail(email, otp, user.fullName);
    }
    return ok(res, {}, "If an account with that email exists, a new OTP has been sent.");
  } catch (err) {
    console.error("resend-otp:", err);
    return fail(res, "Failed to resend OTP.", 500);
  }
};

// ── GET /api/auth/google/callback ─────────────────────────────────────────────
// Fix: set HttpOnly cookie HERE, then redirect with just ?status=
// No intermediate code exchange — same pattern as every major OAuth provider.
const googleCallback = (req, res) => {
  try {
    const user  = req.user;
    const token = signToken(buildPayload(user));

    // Set the cookie directly — no temp code needed
    setAuthCookie(res, token);

    const dest = user.isProfileComplete ? "dashboard" : "onboarding";
    // Redirect to frontend callback page with only the destination, no token
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?status=${dest}`);
  } catch (err) {
    console.error("google callback:", err);
    res.redirect(`${process.env.CLIENT_URL}/login?error=google_failed`);
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
const getMe = (req, res) => ok(res, { user: req.user });

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    const cookieToken = req.cookies?.[COOKIE_NAME];
    const headerToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1] : null;
    if (cookieToken) await revokeToken(cookieToken);
    if (headerToken) await revokeToken(headerToken);
    clearAuthCookie(res);
    return ok(res, {}, "Logged out successfully.");
  } catch (err) {
    console.error("logout:", err);
    clearAuthCookie(res);
    return ok(res, {}, "Logged out.");
  }
};

module.exports = {
  signup, login, verifyOTPHandler, resendOTP,
  googleCallback, getMe, logout,
  setAuthCookie, clearAuthCookie, COOKIE_NAME,
};