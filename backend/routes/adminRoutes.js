// backend/routes/adminRoutes.js
const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate, requireAdmin } = require("../middleware/auth");
const {
  adminLogin, getAdminMe,
  getAllUsers, getUserById, getPlatformStats,
  createContent, updateContent, deleteContent, getAllContent,
} = require("../controllers/adminController");

// Admin login (no auth required)
router.post("/login", [
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
], validate, adminLogin);

// All routes below require admin JWT
router.use(authenticate, requireAdmin);

router.get("/me",    getAdminMe);
router.get("/stats", getPlatformStats);

// Users
router.get("/users",     getAllUsers);
router.get("/users/:id", getUserById);

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

// FIX: PUT /content/:id previously had no validation middleware — arbitrary
//      fields could be sent with no type or length checks.
//      All updatable fields are now validated consistently with the POST route.
router.put("/content/:id", [
  body("title").optional().trim().notEmpty().isLength({ max: 500 })
    .withMessage("Title must not be empty and under 500 characters."),
  body("description").optional().isString().isLength({ max: 5000 }),
  body("speaker").optional().isString().isLength({ max: 255 }),
  body("link").optional().isURL().withMessage("Link must be a valid URL."),
  body("youtubeUrl").optional().isURL().withMessage("YouTube URL must be a valid URL."),
  body("status").optional().isIn(["upcoming", "completed", "cancelled"])
    .withMessage("Status must be one of: upcoming, completed, cancelled."),
  body("category").optional().isIn(["market", "tax", "insurance", "planning", "general"])
    .withMessage("Category must be one of: market, tax, insurance, planning, general."),
  body("urgent").optional().isBoolean().withMessage("Urgent must be a boolean."),
  body("isPublished").optional().isBoolean().withMessage("isPublished must be a boolean."),
], validate, updateContent);

router.delete("/content/:id", deleteContent);

module.exports = router;
