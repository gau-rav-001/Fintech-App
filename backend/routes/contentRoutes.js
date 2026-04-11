const router = require("express").Router();
const { getPublicContent } = require("../controllers/adminController");

// GET /api/content?type=webinar|news|video  — no auth required
router.get("/", getPublicContent);

module.exports = router;
