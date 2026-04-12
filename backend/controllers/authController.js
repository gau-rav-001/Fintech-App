// backend/controllers/authController.js
const bcrypt = require("bcryptjs");                                         // ✅ FIX #1: was missing; used on line ~43 but never imported
const User   = require("../models/User");
const { signToken, buildPayload, revokeToken } = require("../utils/jwt");
const { generateOTP, saveOTP, verifyOTP }      = require("../utils/otp");
const { sendOTPEmail, sendWelcomeEmail }        = require("../utils/email");
const { ok, fail }                              = require("../utils/response");

const tempCodes = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of tempCodes) if (now > v.expiresAt) tempCodes.delete(k);
}, 60_000);

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
const signup = async (req, res) => {
  try {
    const { fullName, email, mobile, password } = req.body;

    const existing = await User.findByEmail(email);
    if (existing) return fail(res, "An account with this email already exists.", 409);

    const user = await User.create({ fullName, email, mobile, password, provider: "email" });

    const otp = generateOTP();
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

    const user = await User.findByEmailWithPassword(email);

    // ✅ FIX #2: Constant-time comparison to prevent user enumeration
    if (!user || user.provider !== "email") {
      await bcrypt.compare(password, "$2b$12$dummyhashtopreventtimingattack00000000000000000");
      return fail(res, "Invalid email or password.", 401);
    }
    const match = await User.comparePassword(user.passwordHash, password);
    if (!match) return fail(res, "Invalid email or password.", 401);

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
    return ok(res, {
      token,
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
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findByEmail(email);
    if (!user) return fail(res, "No account found.", 404);

    const otp = generateOTP();
    await saveOTP(email, otp);
    await sendOTPEmail(email, otp, user.fullName);

    return ok(res, {}, "New OTP sent.");
  } catch (err) {
    console.error("resend-otp:", err);
    return fail(res, "Failed to resend OTP.", 500);
  }
};

// ── GET /api/auth/google/callback ─────────────────────────────────────────────
const googleCallback = (req, res) => {
  try {
    const user  = req.user;
    const token = signToken(buildPayload(user));
    const dest  = user.isProfileComplete ? "dashboard" : "onboarding";

    const code = require("crypto").randomBytes(16).toString("hex");
    tempCodes.set(code, { token, expiresAt: Date.now() + 60_000 });

    res.redirect(`${process.env.CLIENT_URL}/auth/callback?code=${code}&status=${dest}`);
  } catch (err) {
    console.error("google callback:", err);
    res.redirect(`${process.env.CLIENT_URL}/login?error=google_failed`);
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
const getMe = (req, res) => ok(res, { user: req.user });

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
const logout = (req, res) => {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      revokeToken(header.split(" ")[1]);
    }
    return ok(res, {}, "Logged out successfully.");
  } catch (err) {
    console.error("logout:", err);
    return ok(res, {}, "Logged out.");
  }
};

// ── POST /api/auth/exchange-code ──────────────────────────────────────────────
// ✅ FIX #3: tempCodes was populated in googleCallback but never had an exchange endpoint
const exchangeCode = (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return fail(res, "Code is required.", 400);
    const entry = tempCodes.get(code);
    if (!entry || Date.now() > entry.expiresAt) {
      tempCodes.delete(code);
      return fail(res, "Code expired or invalid.", 400);
    }
    tempCodes.delete(code);
    return ok(res, { token: entry.token }, "Token exchanged.");
  } catch (err) {
    console.error("exchange-code:", err);
    return fail(res, "Exchange failed.", 500);
  }
};

module.exports = { signup, login, verifyOTPHandler, resendOTP, googleCallback, getMe, logout, exchangeCode };