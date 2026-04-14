// backend/utils/jwt.js
const jwt    = require("jsonwebtoken");
const crypto = require("crypto");

const secret  = () => process.env.JWT_SECRET;
const expires = (role) =>
  role === "admin"
    ? process.env.ADMIN_JWT_EXPIRES_IN || "4h"
    : process.env.JWT_EXPIRES_IN       || "1d";

// ── Blacklist adapter interface ───────────────────────────────────────────────
// In production swap this for a Redis adapter:
//
//   const redis = new require("ioredis")(process.env.REDIS_URL);
//   const redisBlacklist = {
//     async add(jti, ttlMs) {
//       await redis.set(`bl:${jti}`, "1", "PX", ttlMs);
//     },
//     async has(jti) {
//       return (await redis.exists(`bl:${jti}`)) === 1;
//     },
//   };
//   require("./jwt").setBlacklistAdapter(redisBlacklist);

const memBlacklist = new Map();

// Purge expired entries every 15 min
setInterval(() => {
  const now = Date.now();
  for (const [jti, exp] of memBlacklist) {
    if (now > exp) memBlacklist.delete(jti);
  }
}, 15 * 60 * 1000);

let blacklistAdapter = {
  async add(jti, ttlMs) {
    memBlacklist.set(jti, Date.now() + ttlMs);
  },
  async has(jti) {
    const exp = memBlacklist.get(jti);
    if (!exp) return false;
    if (Date.now() > exp) { memBlacklist.delete(jti); return false; }
    return true;
  },
};

function setBlacklistAdapter(adapter) {
  blacklistAdapter = adapter;
}

// ── Core functions ────────────────────────────────────────────────────────────
function signToken(payload) {
  const jti = crypto.randomBytes(16).toString("hex");
  return jwt.sign({ ...payload, jti }, secret(), {
    expiresIn: expires(payload.role),
  });
}

async function verifyToken(token) {
  const decoded = jwt.verify(token, secret());
  if (decoded.jti && await blacklistAdapter.has(decoded.jti)) {
    const err = new Error("Token has been revoked.");
    err.name  = "TokenRevokedError";
    throw err;
  }
  return decoded;
}

async function revokeToken(token) {
  try {
    const decoded = jwt.decode(token);
    if (decoded?.jti && decoded?.exp) {
      const ttlMs = Math.max(0, decoded.exp * 1000 - Date.now());
      await blacklistAdapter.add(decoded.jti, ttlMs);
    }
  } catch {
    // ignore malformed tokens
  }
}

function buildPayload(user) {
  return { id: user.id, role: user.role || "user", email: user.email };
}

module.exports = { signToken, verifyToken, revokeToken, buildPayload, setBlacklistAdapter };