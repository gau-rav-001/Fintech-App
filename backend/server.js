require("dotenv").config();

const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit    = require("express-rate-limit");
const passport     = require("passport");

require("./config/db");
require("./config/passport");

const authRoutes    = require("./routes/authRoutes");
const userRoutes    = require("./routes/userRoutes");
const adminRoutes   = require("./routes/adminRoutes");
const contentRoutes = require("./routes/contentRoutes");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app    = express();
const isProd = process.env.NODE_ENV === "production";

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy:      isProd ? undefined : false,
  crossOriginEmbedderPolicy:  false,
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";
if (isProd && !process.env.CLIENT_URL) {
  console.error("CLIENT_URL is not set.");
  process.exit(1);
}
app.use(cors({
  origin:         allowedOrigin,
  credentials:    true,
  methods:        ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      300,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: "Too many requests. Try again in 15 minutes." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: "Too many auth attempts. Try again in 15 minutes." },
});

// FIX: removed the duplicate otpLimiter that was defined here but never applied.
//      The OTP rate limiter is correctly defined and applied inside authRoutes.js.

app.use(globalLimiter);

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Passport ──────────────────────────────────────────────────────────────────
app.use(passport.initialize());

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status:  "ok",
    service: "SmartFinance API",
    env:     process.env.NODE_ENV,
    time:    new Date().toISOString(),
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",    authLimiter, authRoutes);
app.use("/api/user",    userRoutes);
app.use("/api/admin",   adminRoutes);
app.use("/api/content", contentRoutes);

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 SmartFinance API  →  http://localhost:${PORT}`);
  console.log(`   Mode  : ${process.env.NODE_ENV || "development"}`);
  console.log(`   CORS  : ${allowedOrigin}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});

module.exports = app;
