// backend/routes/adminRoutes.js
const router = require("express").Router();
const { body, param } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate, requireAdmin } = require("../middleware/auth");
const {
  adminLogin, adminVerifyOTP, adminLogout, getAdminMe,
  getAllUsers, getUserById, getPlatformStats,
  createContent, updateContent, deleteContent, getAllContent,
} = require("../controllers/adminController");

// Fix #4: Step 1 — validate credentials, receive OTP
router.post("/login", [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
], validate, adminLogin);

// Fix #4: Step 2 — verify OTP, get session cookie
router.post("/verify-otp", [
  body("email").isEmail().normalizeEmail(),
  body("otp").matches(/^\d{6}$/).withMessage("OTP must be a 6-digit number."),
], validate, adminVerifyOTP);

// Logout (no auth needed — just clears the cookie)
router.post("/logout", adminLogout);

// All routes below require admin JWT
router.use(authenticate, requireAdmin);

router.get("/me",    getAdminMe);
router.get("/stats", getPlatformStats);

// Users
router.get("/users", getAllUsers);

// Fix #11: validate UUID format before hitting the DB
router.get("/users/:id", [
  param("id").isUUID().withMessage("Invalid user ID."),
], validate, getUserById);

// Content
router.get("/content", getAllContent);

router.post("/content", [
  body("type").isIn(["webinar", "news", "video"]).withMessage("Invalid type."),
  body("title").trim().notEmpty().withMessage("Title is required."),
  body("description").optional().isString().isLength({ max: 5000 }),
  body("speaker").optional().isString().isLength({ max: 255 }),
  body("link").optional().isURL().withMessage("Link must be a valid URL."),
  body("youtubeUrl").optional().isURL().withMessage("YouTube URL must be a valid URL."),
  body("status").optional().isIn(["upcoming", "completed", "cancelled"]),
  body("category").optional().isIn(["market", "tax", "insurance", "planning", "general"]),
  body("urgent").optional().isBoolean(),
  body("isPublished").optional().isBoolean(),
], validate, createContent);

router.put("/content/:id", [
  param("id").isUUID().withMessage("Invalid content ID."),
  body("title").optional().trim().notEmpty().isLength({ max: 500 }),
  body("description").optional().isString().isLength({ max: 5000 }),
  body("speaker").optional().isString().isLength({ max: 255 }),
  body("link").optional().isURL().withMessage("Link must be a valid URL."),
  body("youtubeUrl").optional().isURL().withMessage("YouTube URL must be a valid URL."),
  body("status").optional().isIn(["upcoming", "completed", "cancelled"]),
  body("category").optional().isIn(["market", "tax", "insurance", "planning", "general"]),
  body("urgent").optional().isBoolean(),
  body("isPublished").optional().isBoolean(),
], validate, updateContent);

router.delete("/content/:id", [
  param("id").isUUID().withMessage("Invalid content ID."),
], validate, deleteContent);

module.exports = router;