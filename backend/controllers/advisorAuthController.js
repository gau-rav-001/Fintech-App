// backend/controllers/advisorAuthController.js
const bcrypt   = require("bcryptjs");
const Advisor  = require("../models/Advisor");
const AuditLog = require("../models/AuditLog");
const { generateOTP, saveOTP, verifyOTP, lockout } = require("../utils/otp");
const { sendAdvisorOTPEmail }                      = require("../utils/email");
const { signToken, buildAdvisorPayload, revokeToken } = require("../utils/jwt");
const { ok, fail }                                 = require("../utils/response");

// ── Advisor session cookie configuration ──────────────────────────────────────
const ADVISOR_COOKIE = "sf_advisor_token";
const ADVISOR_COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.COOKIE_SECURE === "true",
  sameSite: process.env.COOKIE_SAME_SITE || "lax",
  maxAge:   8 * 60 * 60 * 1000,   // 8 hours for advisor sessions
  path:     "/",
};

function setAdvisorCookie(res, token) {
  res.cookie(ADVISOR_COOKIE, token, ADVISOR_COOKIE_OPTS);
}

function clearAdvisorCookie(res) {
  res.clearCookie(ADVISOR_COOKIE, {
    httpOnly: true,
    secure:   process.env.COOKIE_SECURE === "true",
    sameSite: process.env.COOKIE_SAME_SITE || "lax",
    path:     "/",
  });
}

// ── POST /api/advisor/auth/register ───────────────────────────────────────────
const register = async (req, res) => {
  try {
    const {
      fullName,
      email,
      mobile,
      password,
      firmName,
      licenseNumber,
      specializations,
      experienceYears,
      bio,
      city,
      state,
      country,
    } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    // Check duplicate email
    const existing = await Advisor.findByEmail(normalizedEmail);
    if (existing) {
      return fail(res, "An advisor account with this email already exists.", 409);
    }

    // Create advisor — MANDATORY: approval_status is ALWAYS 'pending', is_email_verified = false
    const advisor = await Advisor.create({
      fullName,
      email: normalizedEmail,
      mobile,
      password,
      firmName,
      licenseNumber,
      specializations: Array.isArray(specializations) ? specializations : [],
      experienceYears: experienceYears !== undefined ? Number(experienceYears) : 0,
      bio,
      city,
      state,
      country,
      approvalStatus: "pending",
      isEmailVerified: false,
    });

    // Generate & store OTP in dedicated advisor registration namespace
    const otp = generateOTP();
    await saveOTP(`advisor:${advisor.email}`, otp);
    await sendAdvisorOTPEmail(advisor.email, otp, advisor.fullName);

    // Audit log (non-blocking)
    AuditLog.create({
      actorType:    "advisor",
      actorId:      advisor.id,
      action:       "ADVISOR_REGISTERED",
      resourceType: "advisor",
      resourceId:   advisor.id,
      details: {
        email:         advisor.email,
        firmName:      advisor.firmName,
        licenseNumber: advisor.licenseNumber,
      },
      ipAddress:    req.ip || "",
      userAgent:    req.headers["user-agent"] || "",
    }).catch(err => console.warn("Audit log warning:", err.message));

    return ok(
      res,
      {
        advisorId:      advisor.id,
        email:          advisor.email,
        approvalStatus: advisor.approvalStatus,
        isEmailVerified:advisor.isEmailVerified,
      },
      "Advisor registration successful. Please check your email for the 6-digit verification code.",
      201
    );
  } catch (err) {
    console.error("advisor register error:", err);
    return fail(res, "Advisor registration failed.", 500);
  }
};

// ── POST /api/advisor/auth/verify-otp (Registration OTP) ──────────────────────
const verifyOTPHandler = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Verify OTP in dedicated advisor namespace
    const result = await verifyOTP(`advisor:${normalizedEmail}`, otp);
    if (!result.valid) {
      return fail(res, result.error, 400);
    }

    let advisor = await Advisor.findByEmail(normalizedEmail);
    if (!advisor) {
      return fail(res, "Advisor account not found.", 404);
    }

    // Mark email verified if not already verified
    if (!advisor.isEmailVerified) {
      advisor = await Advisor.verifyAdvisorEmail(advisor.id);

      // Audit log (non-blocking)
      AuditLog.create({
        actorType:    "advisor",
        actorId:      advisor.id,
        action:       "ADVISOR_EMAIL_VERIFIED",
        resourceType: "advisor",
        resourceId:   advisor.id,
        details: { email: advisor.email },
        ipAddress:    req.ip || "",
        userAgent:    req.headers["user-agent"] || "",
      }).catch(err => console.warn("Audit log warning:", err.message));
    }

    // MANDATORY: approval_status remains 'pending' — no login token/cookie is issued!
    return ok(
      res,
      {
        advisorId:      advisor.id,
        email:          advisor.email,
        isEmailVerified:advisor.isEmailVerified,
        approvalStatus: advisor.approvalStatus,
      },
      "Email verified successfully. Your account is currently pending administrator review and approval."
    );
  } catch (err) {
    console.error("advisor verify-otp error:", err);
    return fail(res, "OTP verification failed.", 500);
  }
};

// ── POST /api/advisor/auth/resend-otp ─────────────────────────────────────────
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const advisor = await Advisor.findByEmail(normalizedEmail);

    if (advisor && !advisor.isEmailVerified) {
      const otp = generateOTP();
      await saveOTP(`advisor:${advisor.email}`, otp);
      await sendAdvisorOTPEmail(advisor.email, otp, advisor.fullName);
    }

    // Generic response to prevent email enumeration
    return ok(
      res,
      {},
      "If a pending advisor account with that email exists, a new verification code has been sent."
    );
  } catch (err) {
    console.error("advisor resend-otp error:", err);
    return fail(res, "Failed to resend verification code.", 500);
  }
};

// ── POST /api/advisor/auth/login (Step 1: Credentials -> MFA OTP) ─────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const lockoutKey = `advisor:${normalizedEmail}`;

    // 0. Check Account Lockout
    if (lockout.isLocked(lockoutKey)) {
      return fail(
        res,
        `Account temporarily locked due to too many failed attempts. Try again in ${lockout.minutesLeft(lockoutKey)} minute(s).`,
        429
      );
    }

    const advisor = await Advisor.findByEmailWithPassword(normalizedEmail);

    // 1. Advisor does not exist (Generic error + timing defense)
    if (!advisor) {
      await bcrypt.compare(password, "$2b$12$dummyhashtopreventtimingattack00000000000000000").catch(() => {});
      lockout.record(lockoutKey);
      AuditLog.create({
        actorType:    "advisor",
        actorId:      "00000000-0000-0000-0000-000000000000",
        action:       "ADVISOR_LOGIN_FAILED",
        resourceType: "advisor",
        resourceId:   normalizedEmail,
        details:      { reason: "NONEXISTENT_ADVISOR" },
        ipAddress:    req.ip || "",
        userAgent:    req.headers["user-agent"] || "",
      }).catch(() => {});
      return fail(res, "Invalid email or password.", 401);
    }

    // 2. Advisor exists but email is not verified
    if (!advisor.isEmailVerified) {
      const match = await Advisor.comparePassword(advisor.passwordHash, password);
      if (!match) {
        lockout.record(lockoutKey);
        return fail(res, "Invalid email or password.", 401);
      }
      AuditLog.create({
        actorType:    "advisor",
        actorId:      advisor.id,
        action:       "ADVISOR_LOGIN_BLOCKED",
        resourceType: "advisor",
        resourceId:   advisor.id,
        details:      { reason: "EMAIL_NOT_VERIFIED" },
        ipAddress:    req.ip || "",
        userAgent:    req.headers["user-agent"] || "",
      }).catch(() => {});
      return fail(res, "Please verify your email address before logging in.", 403, {
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    // 3. Verify password
    const match = await Advisor.comparePassword(advisor.passwordHash, password);
    if (!match) {
      lockout.record(lockoutKey);
      AuditLog.create({
        actorType:    "advisor",
        actorId:      advisor.id,
        action:       "ADVISOR_LOGIN_FAILED",
        resourceType: "advisor",
        resourceId:   advisor.id,
        details:      { reason: "INVALID_PASSWORD" },
        ipAddress:    req.ip || "",
        userAgent:    req.headers["user-agent"] || "",
      }).catch(() => {});
      return fail(res, "Invalid email or password.", 401);
    }

    // 4. Check approval_status: Pending
    if (advisor.approvalStatus === "pending") {
      AuditLog.create({
        actorType:    "advisor",
        actorId:      advisor.id,
        action:       "ADVISOR_LOGIN_BLOCKED",
        resourceType: "advisor",
        resourceId:   advisor.id,
        details:      { reason: "ADVISOR_PENDING" },
        ipAddress:    req.ip || "",
        userAgent:    req.headers["user-agent"] || "",
      }).catch(() => {});
      return fail(res, "Your advisor account is pending administrator review and approval.", 403, {
        code: "ADVISOR_PENDING",
      });
    }

    // 5. Check approval_status: Rejected
    if (advisor.approvalStatus === "rejected") {
      AuditLog.create({
        actorType:    "advisor",
        actorId:      advisor.id,
        action:       "ADVISOR_LOGIN_BLOCKED",
        resourceType: "advisor",
        resourceId:   advisor.id,
        details:      { reason: "ADVISOR_REJECTED", rejectionReason: advisor.rejectionReason },
        ipAddress:    req.ip || "",
        userAgent:    req.headers["user-agent"] || "",
      }).catch(() => {});
      return fail(res, "Your advisor application has been rejected.", 403, {
        code: "ADVISOR_REJECTED",
        rejectionReason: advisor.rejectionReason || "",
      });
    }

    // 6. Check approval_status: Suspended
    if (advisor.approvalStatus === "suspended") {
      AuditLog.create({
        actorType:    "advisor",
        actorId:      advisor.id,
        action:       "ADVISOR_LOGIN_BLOCKED",
        resourceType: "advisor",
        resourceId:   advisor.id,
        details:      { reason: "ADVISOR_SUSPENDED", suspensionReason: advisor.suspensionReason },
        ipAddress:    req.ip || "",
        userAgent:    req.headers["user-agent"] || "",
      }).catch(() => {});
      return fail(res, "Your advisor account has been suspended by an administrator.", 403, {
        code: "ADVISOR_SUSPENDED",
        suspensionReason: advisor.suspensionReason || "",
      });
    }

    // 7. General non-approved safety check
    if (advisor.approvalStatus !== "approved") {
      return fail(res, "Advisor account unauthorized.", 403);
    }

    // 8. Approved + verified + correct credentials -> 2-Step MFA OTP challenge
    lockout.clear(lockoutKey);
    const otp = generateOTP();
    await saveOTP(`advisor_login:${normalizedEmail}`, otp);
    await sendAdvisorOTPEmail(advisor.email, otp, advisor.fullName);

    AuditLog.create({
      actorType:    "advisor",
      actorId:      advisor.id,
      action:       "ADVISOR_LOGIN_OTP_SENT",
      resourceType: "advisor",
      resourceId:   advisor.id,
      details:      { email: advisor.email },
      ipAddress:    req.ip || "",
      userAgent:    req.headers["user-agent"] || "",
    }).catch(() => {});

    return ok(
      res,
      {
        email: advisor.email,
        requiresOTP: true,
      },
      "Login verification code sent to your email."
    );
  } catch (err) {
    console.error("advisor login error:", err);
    return fail(res, "Advisor login failed.", 500);
  }
};

// ── POST /api/advisor/auth/verify-login-otp (Step 2: Login OTP -> Session) ───
const verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Verify OTP from dedicated login namespace
    const result = await verifyOTP(`advisor_login:${normalizedEmail}`, otp);
    if (!result.valid) {
      return fail(res, result.error, 400);
    }

    // Query live DB record
    const advisor = await Advisor.findByEmail(normalizedEmail);
    if (!advisor) {
      return fail(res, "Advisor account not found.", 404);
    }

    if (!advisor.isEmailVerified) {
      return fail(res, "Email address is not verified.", 403, { code: "EMAIL_NOT_VERIFIED" });
    }

    if (advisor.approvalStatus !== "approved") {
      return fail(res, `Advisor account is ${advisor.approvalStatus}.`, 403, {
        code: `ADVISOR_${advisor.approvalStatus.toUpperCase()}`,
      });
    }

    // Build minimal stateless JWT payload (strictly id and role='advisor')
    const payload = buildAdvisorPayload(advisor);
    const token = signToken(payload);
    setAdvisorCookie(res, token);

    AuditLog.create({
      actorType:    "advisor",
      actorId:      advisor.id,
      action:       "ADVISOR_LOGIN_SUCCESS",
      resourceType: "advisor",
      resourceId:   advisor.id,
      details:      { email: advisor.email },
      ipAddress:    req.ip || "",
      userAgent:    req.headers["user-agent"] || "",
    }).catch(() => {});

    return ok(
      res,
      {
        advisor,
        isProfileComplete: true,
      },
      "Advisor login successful."
    );
  } catch (err) {
    console.error("advisor verify-login-otp error:", err);
    return fail(res, "Login verification failed.", 500);
  }
};

// ── GET /api/advisor/auth/me ──────────────────────────────────────────────────
const getMe = async (req, res) => {
  if (!req.advisor) {
    return fail(res, "Advisor session not found.", 401);
  }
  return ok(res, { advisor: req.advisor });
};

// ── POST /api/advisor/auth/logout ─────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    const cookieToken = req.cookies?.[ADVISOR_COOKIE];
    const headerToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1] : null;

    if (cookieToken) await revokeToken(cookieToken);
    if (headerToken) await revokeToken(headerToken);

    clearAdvisorCookie(res);

    if (req.advisor) {
      AuditLog.create({
        actorType:    "advisor",
        actorId:      req.advisor.id,
        action:       "ADVISOR_LOGOUT",
        resourceType: "advisor",
        resourceId:   req.advisor.id,
        details:      { email: req.advisor.email },
        ipAddress:    req.ip || "",
        userAgent:    req.headers["user-agent"] || "",
      }).catch(err => console.warn("Audit log warning (logout):", err.message));
    }

    return ok(res, {}, "Advisor logged out successfully.");
  } catch (err) {
    console.error("advisor logout error:", err);
    clearAdvisorCookie(res);
    return ok(res, {}, "Advisor logged out.");
  }
};

module.exports = {
  register,
  verifyOTPHandler,
  resendOTP,
  login,
  verifyLoginOTP,
  getMe,
  logout,
  clearAdvisorCookie,
  ADVISOR_COOKIE,
  ADVISOR_COOKIE_OPTS,
};

