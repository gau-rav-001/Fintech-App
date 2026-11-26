// backend/server.js
require("./config/env").loadEnv();

require("./config/env").validateProduction();

const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit    = require("express-rate-limit");
const passport     = require("passport");

const db = require("./config/db");
const { schemaReady } = require("./db/run");
require("./config/passport");

// ── Optional Redis wiring (Fix #2) ───────────────────────────────────────────
// If REDIS_URL is set, plug in Redis adapters for OTP store and JWT blacklist.
// Remove the if-block to force in-memory (dev only).
let redis;
if (process.env.REDIS_URL) {
    const Redis = require("ioredis");
    redis = new Redis(process.env.REDIS_URL, { password: process.env.REDIS_PASSWORD || undefined, enableOfflineQueue: false, maxRetriesPerRequest: 1, commandTimeout: 2500 });
    redis.on("error", () => console.error("Redis unavailable"));

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

} else {
  console.warn("⚠️  REDIS_URL not set — using in-memory OTP/JWT store (single-instance / dev only).");
}

const authRoutes        = require("./routes/authRoutes");
const advisorAuthRoutes = require("./routes/advisorAuthRoutes");
const advisorRoutes     = require("./routes/advisorRoutes");
const userRoutes        = require("./routes/userRoutes");
const adminRoutes       = require("./routes/adminRoutes");
const contentRoutes     = require("./routes/contentRoutes");
const aiRoutes          = require("./routes/aiRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app    = express();
if (process.env.TRUSTED_PROXY_IP) app.set("trust proxy", process.env.TRUSTED_PROXY_IP);
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
  max:      isProd ? 300 : 5000,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: "Too many requests. Try again in 15 minutes." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      isProd ? 20 : 1000,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: "Too many auth attempts. Try again in 15 minutes." },
});

app.get(["/health", "/api/health"], (_req, res) => res.json({ status: "ok" }));
app.get(["/ready", "/api/ready"], async (_req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    if (redis && await redis.ping() !== "PONG") throw new Error();
    if (!(await schemaReady(db))) throw new Error();
    res.json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});

app.use(globalLimiter);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "128kb", parameterLimit: 128 }));
app.use(cookieParser());
app.use(passport.initialize());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",         authLimiter, authRoutes);
app.use("/api/advisor/auth", authLimiter, advisorAuthRoutes);
app.use("/api/advisor",      advisorRoutes);
app.use("/api/user",         userRoutes);
app.use("/api/admin",        adminRoutes);
app.use("/api/content",      contentRoutes);
app.use("/api/ai",           aiRoutes);
app.use("/api/notifications", notificationRoutes);

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
