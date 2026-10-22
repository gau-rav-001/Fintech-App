// backend/controllers/authController.js
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User   = require("../models/User");
const { signToken, buildPayload, revokeToken } = require("../utils/jwt");
const { generateOTP, saveOTP, verifyOTP, lockout } = require("../utils/otp");
const { sendOTPEmail, sendWelcomeEmail, sendPasswordResetEmail } = require("../utils/email");
const { ok, fail } = require("../utils/response");

// ── Cookie helpers ────────────────────────────────────────────────────────────
const COOKIE_NAME = "sf_token";
const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.COOKIE_SECURE === "true",
  sameSite: process.env.COOKIE_SAME_SITE || "lax",
  maxAge:   24 * 60 * 60 * 1000,
  path:     "/",
};

function setAuthCookie(res, token, maxAgeMs) {
  res.cookie(COOKIE_NAME, token, { ...COOKIE_OPTS, maxAge: maxAgeMs || COOKIE_OPTS.maxAge });
}
function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, path: "/" });
}

// ── In-memory reset token store ───────────────────────────────────────────────
// In production swap for a DB table or Redis.
// Map: token → { email, expiresAt }
const resetTokens = new Map();

// Purge expired tokens every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of resetTokens) {
    if (now > data.expiresAt) resetTokens.delete(token);
  }
}, 5 * 60 * 1000);

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
    const isDemo = email.toLowerCase() === "demo@smartfinance.in";
    const otp = isDemo ? "123456" : generateOTP();
    await saveOTP(email, otp);
    let emailSent = false;
    try {
      await sendOTPEmail(email, otp, user.fullName);
      emailSent = true;
    } catch (e) {
      console.warn("⚠️ [Email Delivery Failed]:", e.message);
    }

    const payload = {
      email,
      requiresOTP: true,
      ...(isDemo || !emailSent || process.env.ALLOW_DEMO_OTP === "true" || process.env.NODE_ENV !== "production"
        ? { previewOtp: otp }
        : {}),
    };
    const msg = isDemo
      ? "Demo Account: Use OTP 123456"
      : emailSent
      ? "OTP sent to your email."
      : `Email service unavailable. Use OTP: ${otp}`;
    return ok(res, payload, msg);
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

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
// Never reveals whether the email exists (anti-enumeration)
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findByEmail(email);

    if (user && user.provider === "email") {
      // Generate a secure random token
      const token     = crypto.randomBytes(32).toString("hex");
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

      // Store it (replace existing if any)
      resetTokens.set(token, { email: email.toLowerCase(), expiresAt });

      const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
      await sendPasswordResetEmail(email, resetLink, user.fullName);
    }

    // Always return the same response — don't reveal if email exists
    return ok(res, {}, "If an account with that email exists, a reset link has been sent.");
  } catch (err) {
    console.error("forgot-password:", err);
    return fail(res, "Failed to send reset email.", 500);
  }
};

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token) return fail(res, "Reset token is required.", 400);

    const data = resetTokens.get(token);

    if (!data)                    return fail(res, "Invalid or expired reset link.", 400);
    if (Date.now() > data.expiresAt) {
      resetTokens.delete(token);
      return fail(res, "Reset link has expired. Please request a new one.", 400);
    }

    const user = await User.findByEmail(data.email);
    if (!user) return fail(res, "Account not found.", 404);

    // Update password
    await User.updatePassword(user.id, password);

    // Invalidate the token immediately after use
    resetTokens.delete(token);

    return ok(res, {}, "Password reset successfully. You can now log in.");
  } catch (err) {
    console.error("reset-password:", err);
    return fail(res, "Password reset failed.", 500);
  }
};

// ── GET /api/auth/google/callback ─────────────────────────────────────────────
const googleCallback = (req, res) => {
  try {
    const user  = req.user;
    const token = signToken(buildPayload(user));
    setAuthCookie(res, token);
    const dest = user.isProfileComplete ? "dashboard" : "onboarding";
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?status=${dest}&token=${token}`);
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
  forgotPassword, resetPassword,
  googleCallback, getMe, logout,
  setAuthCookie, clearAuthCookie, COOKIE_NAME,
};