const Admin   = require("../models/Admin");
const User    = require("../models/User");
const Content = require("../models/Content");
const db      = require("../config/db");
const { signToken, buildPayload } = require("../utils/jwt");
const { ok, fail }                = require("../utils/response");

// ── POST /api/admin/login ─────────────────────────────────────────────────────
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findByEmailWithPassword(email);
    if (!admin || !admin.isActive) return fail(res, "Invalid credentials.", 401);

    const match = await Admin.comparePassword(admin.passwordHash, password);
    if (!match) return fail(res, "Incorrect password.", 401);

    const { passwordHash: _, ...safeAdmin } = admin;
    const token = signToken(buildPayload(safeAdmin));
    return ok(res, { token, admin: safeAdmin }, "Admin login successful.");
  } catch (err) {
    console.error("adminLogin:", err);
    return fail(res, "Login failed.", 500);
  }
};

const getAdminMe = (req, res) => ok(res, { admin: req.user });

// ── GET /api/admin/users ──────────────────────────────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", profileComplete } = req.query;
    const pcFilter = profileComplete !== undefined
      ? profileComplete === "true"
      : undefined;

    const { users, total } = await User.findAll({
      page:    parseInt(page),
      limit:   parseInt(limit),
      search,
      profileComplete: pcFilter,
    });

    return ok(res, {
      users,
      pagination: {
        page: parseInt(page), limit: parseInt(limit), total,
        pages: Math.ceil(total / parseInt(limit)),
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
    const content = await Content.findAll(req.query.type);
    return ok(res, { content });
  } catch (err) {
    console.error("getAllContent:", err);
    return fail(res, "Failed to fetch content.", 500);
  }
};

const getPublicContent = async (req, res) => {
  try {
    const content = await Content.findPublic(req.query.type);
    return ok(res, { content });
  } catch (err) {
    console.error("getPublicContent:", err);
    return fail(res, "Failed to fetch content.", 500);
  }
};

module.exports = {
  adminLogin, getAdminMe,
  getAllUsers, getUserById, getPlatformStats,
  createContent, updateContent, deleteContent, getAllContent, getPublicContent,
};
