const jwt    = require("jsonwebtoken");
const crypto = require("crypto");

const secret  = () => process.env.JWT_SECRET;
const expires = () => process.env.JWT_EXPIRES_IN || "1d";

// ── Token blacklist (in-memory) ───────────────────────────────────────────────
const blacklist = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [jti, exp] of blacklist) {
    if (now > exp) blacklist.delete(jti);
  }
}, 15 * 60 * 1000);

// ── Core functions ────────────────────────────────────────────────────────────
function signToken(payload) {
  const jti = crypto.randomBytes(16).toString("hex");
  return jwt.sign({ ...payload, jti }, secret(), { expiresIn: expires() });
}

function verifyToken(token) {
  const decoded = jwt.verify(token, secret());
  if (decoded.jti && blacklist.has(decoded.jti)) {
    const err = new Error("Token has been revoked.");
    err.name  = "TokenRevokedError";
    throw err;
  }
  return decoded;
}

function revokeToken(token) {
  try {
    const decoded = jwt.decode(token);
    if (decoded?.jti && decoded?.exp) {
      blacklist.set(decoded.jti, decoded.exp * 1000);
    }
  } catch {
    // ignore malformed tokens
  }
}

function buildPayload(user) {
  return { id: user.id, role: user.role || "user", email: user.email };
}

module.exports = { signToken, verifyToken, revokeToken, buildPayload };