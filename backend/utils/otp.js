// backend/utils/otp.js
// ─────────────────────────────────────────────────────────────────────────────
// OTP generation + storage with a pluggable adapter.
//
// Default:  in-memory Map  (fine for single-instance / dev)
// Production (multi-instance):  swap the adapter for Redis (instructions below)
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require("crypto");

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_TRIES  = 3;

// ── Storage adapter interface ────────────────────────────────────────────────
// To switch to Redis, create a redisAdapter and pass it to setAdapter():
//
//   const redis = require("ioredis");
//   const client = new redis(process.env.REDIS_URL);
//
//   const redisAdapter = {
//     async get(key) {
//       const raw = await client.get(`otp:${key}`);
//       return raw ? JSON.parse(raw) : null;
//     },
//     async set(key, value) {
//       await client.set(`otp:${key}`, JSON.stringify(value), "PX", OTP_TTL_MS);
//     },
//     async del(key) { await client.del(`otp:${key}`); },
//   };
//
//   require("./otp").setAdapter(redisAdapter);
//   (call setAdapter() once at startup, e.g. in server.js after db init)

const memoryStore = new Map();

let adapter = {
  async get(key) {
    return memoryStore.get(key) || null;
  },
  async set(key, value) {
    memoryStore.set(key, value);
  },
  async del(key) {
    memoryStore.delete(key);
  },
};

function setAdapter(newAdapter) {
  adapter = newAdapter;
}

// Auto-purge expired in-memory entries every 10 min
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of memoryStore) {
    if (now > v.expiresAt) memoryStore.delete(k);
  }
}, 10 * 60 * 1000);

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
  await adapter.set(key, rec); // persist incremented attempt count

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

module.exports = { generateOTP, saveOTP, verifyOTP, clearOTP, setAdapter };