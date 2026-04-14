// backend/server.js
require("dotenv").config();

const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit    = require("express-rate-limit");
const passport     = require("passport");

require("./config/db");
require("./config/passport");

// ── Optional Redis wiring (Fix #2) ───────────────────────────────────────────
// If REDIS_URL is set, plug in Redis adapters for OTP store and JWT blacklist.
// Remove the if-block to force in-memory (dev only).
if (process.env.REDIS_URL) {
  try {
    const Redis = require("ioredis");
    const redis = new Redis(process.env.REDIS_URL);

    const { setAdapter }         = require("./utils/otp");
    const { setBlacklistAdapter } = require("./utils/jwt");

    setAdapter({
      async get(key) {
        const raw = await redis.get(`otp:${key}`);
        return raw ? JSON.parse(raw) : null;
      },
      async set(key, value) {
        await redis.set(`otp:${key}`, JSON.stringify(value), "PX", 5 * 60 * 1000);
      },
      async del(key) { await redis.del(`otp:${key}`); },
    });

    setBlacklistAdapter({
      async add(jti, ttlMs) { await redis.set(`bl:${jti}`, "1", "PX", ttlMs); },
      async has(jti) { return (await redis.exists(`bl:${jti}`)) === 1; },
    });

    console.log("✅ Redis connected — OTP store and JWT blacklist are persistent.");
  } catch (e) {
    console.error("⚠️  REDIS_URL set but ioredis failed to connect:", e.message);
  }
} else {
  console.warn("⚠️  REDIS_URL not set — using in-memory OTP/JWT store (single-instance / dev only).");
}

const authRoutes    = require("./routes/authRoutes");
const userRoutes    = require("./routes/userRoutes");
const adminRoutes   = require("./routes/adminRoutes");
const contentRoutes = require("./routes/contentRoutes");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app    = express();
const isProd = process.env.NODE_ENV === "production";

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy:     isProd ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";
if (isProd && !process.env.CLIENT_URL) {
  console.error("CLIENT_URL is not set.");
  process.exit(1);
}
app.use(cors({
  origin:         allowedOrigin,
  credentials:    true,               // required for cookies
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

app.use(globalLimiter);

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Passport ──────────────────────────────────────────────────────────────────
app.use(passport.initialize());

// ── Health check (Fix #10) ───────────────────────────────────────────────────
// Removed NODE_ENV and internal service details — only expose liveness status
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
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