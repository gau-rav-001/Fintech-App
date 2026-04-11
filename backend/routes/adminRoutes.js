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
router.get("/content",         getAllContent);
router.post("/content", [
  body("type").isIn(["webinar","news","video"]).withMessage("Invalid type."),
  body("title").trim().notEmpty().withMessage("Title is required."),
], validate, createContent);
router.put("/content/:id",    updateContent);
router.delete("/content/:id", deleteContent);

module.exports = router;
