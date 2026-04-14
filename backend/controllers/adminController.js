// backend/controllers/adminController.js
const Admin   = require("../models/Admin");
const User    = require("../models/User");
const Content = require("../models/Content");
const db      = require("../config/db");
const { signToken, buildPayload } = require("../utils/jwt");
const { generateOTP, saveOTP, verifyOTP } = require("../utils/otp");
const { sendOTPEmail }                    = require("../utils/email");
const { ok, fail }                        = require("../utils/response");
// ✅ FIX: Removed circular require("./authController") — admin uses its own cookie helpers below.

const ADMIN_COOKIE = "sf_admin_token";
const ADMIN_COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.COOKIE_SECURE === "true",
  sameSite: process.env.COOKIE_SAME_SITE || "lax",
  maxAge:   4 * 60 * 60 * 1000, // 4 hours — shorter for admin sessions
  path:     "/",
};

// ── POST /api/admin/login — Step 1: validate credentials, send OTP ────────────
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findByEmailWithPassword(email);

    if (!admin || !admin.isActive) {
      await Admin.comparePassword(
        "$2b$12$dummyhashtopreventtimingattack00000000000000000",
        password
      ).catch(() => {});
      return fail(res, "Invalid email or password.", 401);
    }

    const match = await Admin.comparePassword(admin.passwordHash, password);
    if (!match) return fail(res, "Invalid email or password.", 401);

    // Credentials valid — send OTP instead of issuing JWT immediately
    const otp = generateOTP();
    await saveOTP(`admin:${email}`, otp);
    await sendOTPEmail(email, otp, admin.fullName || "Admin");

    return ok(res, { email, requiresOTP: true }, "OTP sent to your registered email.");
  } catch (err) {
    console.error("adminLogin:", err);
    return fail(res, "Login failed.", 500);
  }
};

// ── POST /api/admin/verify-otp — Step 2: verify OTP, issue cookie ─────────────
const adminVerifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const result = await verifyOTP(`admin:${email}`, otp);
    if (!result.valid) return fail(res, result.error, 400);

    const admin = await Admin.findByEmailWithPassword(email);
    if (!admin || !admin.isActive) return fail(res, "Admin account not found.", 404);

    const { passwordHash: _, ...safeAdmin } = admin;
    const token = signToken(buildPayload({ ...safeAdmin, role: "admin" }));

    res.cookie(ADMIN_COOKIE, token, ADMIN_COOKIE_OPTS);

    return ok(res, { admin: safeAdmin }, "Admin login successful.");
  } catch (err) {
    console.error("adminVerifyOTP:", err);
    return fail(res, "OTP verification failed.", 500);
  }
};

// ── POST /api/admin/logout ─────────────────────────────────────────────────────
const adminLogout = (req, res) => {
  res.clearCookie(ADMIN_COOKIE, { httpOnly: true, path: "/" });
  return ok(res, {}, "Logged out.");
};

const getAdminMe = (req, res) => ok(res, { admin: req.user });

// ── GET /api/admin/users ──────────────────────────────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, search = "", profileComplete } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const pcFilter = profileComplete !== undefined
      ? profileComplete === "true"
      : undefined;

    const { users, total } = await User.findAll({
      page:    parseInt(page),
      limit,
      search,
      profileComplete: pcFilter,
    });

    return ok(res, {
      users,
      pagination: {
        page: parseInt(page), limit, total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("getAllUsers:", err);
    return fail(res, "Failed to fetch users.", 500);
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return fail(res, "User not found.", 404);
    return ok(res, { user });
  } catch (err) {
    console.error("getUserById:", err);
    if (err.code === "22P02") return fail(res, "Invalid user ID format.", 400);
    return fail(res, "Failed to fetch user.", 500);
  }
};

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
const getPlatformStats = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        COUNT(*)                                                    AS total_users,
        COUNT(*) FILTER (WHERE is_profile_complete = TRUE)         AS completed_profiles,
        COUNT(*) FILTER (WHERE provider = 'google')                AS google_users,
        COUNT(*) FILTER (WHERE provider = 'email')                 AS email_users,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS new_this_week
      FROM users
    `);

    const s = rows[0];
    const total     = parseInt(s.total_users);
    const completed = parseInt(s.completed_profiles);

    return ok(res, {
      totalUsers:         total,
      completedProfiles:  completed,
      incompleteProfiles: total - completed,
      googleUsers:        parseInt(s.google_users),
      emailUsers:         parseInt(s.email_users),
      newThisWeek:        parseInt(s.new_this_week),
      completionRate:     total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  } catch (err) {
    console.error("getPlatformStats:", err);
    return fail(res, "Failed to fetch stats.", 500);
  }
};

// ── Content CRUD ──────────────────────────────────────────────────────────────
const createContent = async (req, res) => {
  try {
    const content = await Content.create(req.body, req.user.id);
    return ok(res, { content }, "Content created.", 201);
  } catch (err) {
    console.error("createContent:", err);
    return fail(res, "Failed to create content.", 500);
  }
};

const updateContent = async (req, res) => {
  try {
    const content = await Content.update(req.params.id, req.body);
    if (!content) return fail(res, "Content not found.", 404);
    return ok(res, { content }, "Content updated.");
  } catch (err) {
    console.error("updateContent:", err);
    return fail(res, "Failed to update content.", 500);
  }
};

const deleteContent = async (req, res) => {
  try {
    const deleted = await Content.remove(req.params.id);
    if (!deleted) return fail(res, "Content not found.", 404);
    return ok(res, {}, "Content deleted.");
  } catch (err) {
    console.error("deleteContent:", err);
    return fail(res, "Failed to delete content.", 500);
  }
};

const getAllContent = async (req, res) => {
  try {
    const { type, page = 1, limit: rawLimit = 50 } = req.query;
    const limit = Math.min(parseInt(rawLimit) || 50, 200);
    const content = await Content.findAll(type, { page: parseInt(page), limit });
    return ok(res, { content });
  } catch (err) {
    console.error("getAllContent:", err);
    return fail(res, "Failed to fetch content.", 500);
  }
};

const getPublicContent = async (req, res) => {
  try {
    const { type, page = 1, limit: rawLimit = 20 } = req.query;
    const limit = Math.min(parseInt(rawLimit) || 20, 100);
    const content = await Content.findPublic(type, { page: parseInt(page), limit });
    return ok(res, { content });
  } catch (err) {
    console.error("getPublicContent:", err);
    return fail(res, "Failed to fetch content.", 500);
  }
};

module.exports = {
  adminLogin, adminVerifyOTP, adminLogout, getAdminMe,
  getAllUsers, getUserById, getPlatformStats,
  createContent, updateContent, deleteContent, getAllContent, getPublicContent,
  ADMIN_COOKIE,
};