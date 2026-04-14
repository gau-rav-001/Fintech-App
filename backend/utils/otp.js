// backend/utils/otp.js
// ─────────────────────────────────────────────────────────────────────────────
// OTP generation + storage with a pluggable adapter.
//
// Default:  in-memory Map  (fine for single-instance / dev)
// Production: call setAdapter() once at startup with a Redis adapter
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require("crypto");

const OTP_TTL_MS  = 5 * 60 * 1000; // 5 minutes
const MAX_TRIES   = 3;

// ── Storage adapter ───────────────────────────────────────────────────────────
// To switch to Redis, create this adapter and call setAdapter() in server.js:
//
//   const redis = new require("ioredis")(process.env.REDIS_URL);
//   const redisAdapter = {
//     async get(key) {
//       const raw = await redis.get(`otp:${key}`);
//       return raw ? JSON.parse(raw) : null;
//     },
//     async set(key, value, ttlMs) {
//       await redis.set(`otp:${key}`, JSON.stringify(value), "PX", ttlMs || OTP_TTL_MS);
//     },
//     async del(key) { await redis.del(`otp:${key}`); },
//   };
//   require("./otp").setAdapter(redisAdapter);

const memoryStore = new Map();

let adapter = {
  async get(key) { return memoryStore.get(key) || null; },
  async set(key, value) { memoryStore.set(key, value); },
  async del(key) { memoryStore.delete(key); },
};

function setAdapter(newAdapter) { adapter = newAdapter; }

// Auto-purge expired in-memory entries every 10 min
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of memoryStore) {
    if (now > v.expiresAt) memoryStore.delete(k);
  }
}, 10 * 60 * 1000);

// ── Account-lockout store (Fix #8) ───────────────────────────────────────────
// Tracks failed login attempts per email. In production, use Redis.
const LOCK_WINDOW_MS = 15 * 60 * 1000; // 15 min
const MAX_ATTEMPTS   = 5;

const failStore = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of failStore) {
    if (now > v.lockedUntil && now > v.windowEnd) failStore.delete(k);
  }
}, 10 * 60 * 1000);

const lockout = {
  record(email) {
    const key = email.toLowerCase();
    const rec = failStore.get(key) || { attempts: 0, windowEnd: 0, lockedUntil: 0 };
    const now = Date.now();
    if (now > rec.windowEnd) { rec.attempts = 0; rec.windowEnd = now + LOCK_WINDOW_MS; }
    rec.attempts++;
    if (rec.attempts >= MAX_ATTEMPTS) rec.lockedUntil = now + LOCK_WINDOW_MS;
    failStore.set(key, rec);
  },
  isLocked(email) {
    const rec = failStore.get(email.toLowerCase());
    if (!rec) return false;
    return Date.now() < rec.lockedUntil;
  },
  clear(email) { failStore.delete(email.toLowerCase()); },
  minutesLeft(email) {
    const rec = failStore.get(email.toLowerCase());
    if (!rec || Date.now() >= rec.lockedUntil) return 0;
    return Math.ceil((rec.lockedUntil - Date.now()) / 60_000);
  },
};

// ── Public API ────────────────────────────────────────────────────────────────
function generateOTP() {
  return String(crypto.randomInt(100000, 1000000)); // always 6 digits
}

async function saveOTP(email, code) {
  await adapter.set(email.toLowerCase(), {
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts:  0,
  });
}

async function verifyOTP(email, input) {
  const key = email.toLowerCase();
  const rec = await adapter.get(key);

  if (!rec)
    return { valid: false, error: "No OTP found. Please request a new one." };

  if (Date.now() > rec.expiresAt) {
    await adapter.del(key);
    return { valid: false, error: "OTP expired. Please request a new one." };
  }

  if (rec.attempts >= MAX_TRIES) {
    await adapter.del(key);
    return { valid: false, error: "Too many attempts. Please request a new OTP." };
  }

  rec.attempts++;
  await adapter.set(key, rec);

  if (rec.code !== String(input).trim()) {
    return {
      valid: false,
      error: `Incorrect OTP. ${MAX_TRIES - rec.attempts} attempt(s) remaining.`,
    };
  }

  await adapter.del(key);
  return { valid: true };
}

async function clearOTP(email) {
  await adapter.del(email.toLowerCase());
}

module.exports = { generateOTP, saveOTP, verifyOTP, clearOTP, setAdapter, lockout };