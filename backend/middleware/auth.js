// backend/middleware/auth.js
const { verifyToken }         = require("../utils/jwt");
const { fail }                = require("../utils/response");
const User                    = require("../models/User");
const Admin                   = require("../models/Admin");
const Advisor                 = require("../models/Advisor");
const AdvisorRelationship     = require("../models/AdvisorRelationship");
const AuditLog                = require("../models/AuditLog");
const { COOKIE_NAME }         = require("../controllers/authController");
const { ADMIN_COOKIE }        = require("../controllers/adminController");
const { ADVISOR_COOKIE }      = require("../controllers/advisorAuthController");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ── Token extraction helpers ──────────────────────────────────────────────────
// Read from HttpOnly cookie first, fall back to Authorization header
function extractToken(req) {
  if (req.cookies?.[COOKIE_NAME])  return req.cookies[COOKIE_NAME];
  if (req.cookies?.[ADMIN_COOKIE]) return req.cookies[ADMIN_COOKIE];
  const header = req.headers?.authorization;
  if (header?.startsWith("Bearer ")) return header.split(" ")[1];
  return null;
}

function extractAdvisorToken(req) {
  if (req.cookies?.[ADVISOR_COOKIE]) return req.cookies[ADVISOR_COOKIE];
  const header = req.headers?.authorization;
  if (header?.startsWith("Bearer ")) return header.split(" ")[1];
  return null;
}

// ── Main User / Admin auth middleware (Preserves existing shared behavior) ────
const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) return fail(res, "No token provided. Please log in.", 401);

    const decoded = await verifyToken(token);

    const actor = decoded.role === "admin"
      ? await Admin.findById(decoded.id)
      : await User.findById(decoded.id);

    if (!actor) return fail(res, "Account not found. Please log in again.", 401);
    req.user = actor;
    next();
  } catch (err) {
    const msg =
      err.name === "TokenExpiredError"  ? "Session expired. Please log in again."          :
      err.name === "TokenRevokedError"  ? "Session has been revoked. Please log in again." :
      err.name === "JsonWebTokenError"  ? "Invalid token."                                 :
                                          "Invalid token.";
    return fail(res, msg, 401);
  }
};

// ── Advisor Session Validation Middleware ─────────────────────────────────────
// Validates sf_advisor_token against CURRENT database state on every request
const requireAdvisorSession = async (req, res, next) => {
  try {
    const token = extractAdvisorToken(req);
    if (!token) {
      return fail(res, "No advisor token provided. Please log in as an advisor.", 401);
    }

    const decoded = await verifyToken(token);

    // Explicit Role Check: Must be advisor
    if (decoded.role !== "advisor") {
      return fail(res, "Access denied. Advisor session required.", 403);
    }

    // Load live advisor from PostgreSQL using the decoded ID
    const advisor = await Advisor.findById(decoded.id);
    if (!advisor) {
      return fail(res, "Advisor account not found. Please log in again.", 401);
    }

    // Live Database Status Checks (Never trust JWT claims for mutable approval state)
    if (!advisor.isEmailVerified) {
      return fail(res, "Advisor email address is not verified.", 403, {
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    if (advisor.approvalStatus === "pending") {
      return fail(res, "Your advisor account is pending administrator review and approval.", 403, {
        code: "ADVISOR_PENDING",
      });
    }

    if (advisor.approvalStatus === "rejected") {
      return fail(res, "Your advisor application has been rejected.", 403, {
        code: "ADVISOR_REJECTED",
        rejectionReason: advisor.rejectionReason || "",
      });
    }

    if (advisor.approvalStatus === "suspended") {
      return fail(res, "Your advisor account has been suspended by an administrator.", 403, {
        code: "ADVISOR_SUSPENDED",
        suspensionReason: advisor.suspensionReason || "",
      });
    }

    if (advisor.approvalStatus !== "approved") {
      return fail(res, "Advisor account unauthorized.", 403);
    }

    // Attach sanitized, database-backed advisor context
    req.advisor = advisor;
    req.user    = advisor;

    next();
  } catch (err) {
    const msg =
      err.name === "TokenExpiredError"  ? "Session expired. Please log in again."          :
      err.name === "TokenRevokedError"  ? "Session has been revoked. Please log in again." :
      err.name === "JsonWebTokenError"  ? "Invalid token."                                 :
                                          "Authentication failed.";
    return fail(res, msg, 401);
  }
};

// ── Role guards (Phase 4.1) ───────────────────────────────────────────────────
const requireProfileComplete = (req, res, next) => {
  if (!req.user) return fail(res, "Unauthorised.", 401);
  if (req.user.role === "admin") return next();
  if (req.user.role !== "user") return fail(res, "Access denied.", 403);
  if (!req.user.isProfileComplete)
    return fail(res, "Complete your profile to access this service.", 403, {
      code: "PROFILE_INCOMPLETE", redirectTo: "/onboarding",
    });
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin")
    return fail(res, "Access denied. Admins only.", 403);
  next();
};

const requireUser = (req, res, next) => {
  if (!req.user) return fail(res, "Unauthorised. Please log in.", 401);
  if (req.user.role !== "user") {
    return fail(res, "Access denied. Users only.", 403);
  }
  next();
};

const requireAdvisor = requireAdvisorSession;

// ── Client Isolation Verification Helper (Phase 4.2) ──────────────────────────
async function verifyAdvisorClient(req, res, next) {
  const advisorId = req.advisor?.id;
  if (!advisorId) {
    return fail(res, "Access denied. Valid advisor session required.", 401);
  }

  // Canonical resource identifier: ONLY from req.params.clientId
  const clientId = req.params?.clientId;
  if (!clientId) {
    return fail(res, "Client ID parameter is required in route.", 400, {
      code: "CLIENT_ID_REQUIRED",
    });
  }

  // Validate UUID format
  if (!UUID_REGEX.test(clientId)) {
    return fail(res, "Invalid Client ID format.", 400, {
      code: "INVALID_CLIENT_ID",
    });
  }

  try {
    // Single scoped authorization query using authenticated advisor ID and target client ID
    const relationship = await AdvisorRelationship.findActiveByAdvisorAndUser(advisorId, clientId);

    // Enforce relationship status = 'active' and strict advisor ownership
    if (!relationship || relationship.status !== "active" || relationship.advisorId !== advisorId) {
      // Audit log denied sensitive access attempt (non-blocking)
      AuditLog.create({
        actorType: "advisor",
        actorId: advisorId,
        action: "ADVISOR_CLIENT_ACCESS_DENIED",
        resourceType: "user",
        resourceId: clientId,
        details: {
          reason: "No active relationship with target client",
          attemptedClientId: clientId,
          attemptedAdvisorOverride: req.body?.advisorId || req.query?.advisorId || null,
          method: req.method,
          path: req.originalUrl || req.baseUrl + req.path,
        },
        ipAddress: req.ip || req.connection?.remoteAddress || "",
        userAgent: req.get?.("user-agent") || "",
      }).catch(() => {});

      return fail(
        res,
        "Access denied. You do not have an active advisory relationship with this client.",
        403,
        { code: "ADVISOR_CLIENT_ACCESS_DENIED" }
      );
    }

    // Attach verified client relationship and target ID to request context
    req.targetClientId = clientId;
    req.clientRelationship = relationship;

    next();
  } catch (err) {
    return fail(res, "Failed to verify client authorization.", 500);
  }
}

// ── Advisor Client Access Guard (Phase 4.2) ───────────────────────────────────
// Usage: `router.get('/api/advisor/clients/:clientId', requireAdvisorClientAccess, handler)`
const requireAdvisorClientAccess = async (req, res, next) => {
  if (!req.advisor) {
    return requireAdvisorSession(req, res, () => {
      verifyAdvisorClient(req, res, next);
    });
  }
  return verifyAdvisorClient(req, res, next);
};

// ── User Self-Authorization Guard (Phase 4.3) ─────────────────────────────────
// Enforces that the authenticated actor is either the target user itself (req.user.id === targetUserId)
// or an Admin with global platform access (req.user.role === 'admin').
// Canonical target user ID resolution: req.params.userId || req.params.id (never trusts body/query).
function requireSelfUser(arg1, arg2, arg3) {
  // Direct middleware invocation: requireSelfUser(req, res, next)
  if (
    typeof arg1 === "object" &&
    arg1 !== null &&
    ("headers" in arg1 || "params" in arg1) &&
    typeof arg2 === "object" &&
    arg2 !== null &&
    typeof arg3 === "function"
  ) {
    return handleSelfUserCheck(arg1, arg2, arg3, "userId");
  }

  // Factory invocation: requireSelfUser("paramName")(req, res, next)
  const paramName = typeof arg1 === "string" ? arg1 : "userId";
  return (req, res, next) => handleSelfUserCheck(req, res, next, paramName);
}

function handleSelfUserCheck(req, res, next, paramName) {
  if (!req.user) {
    return fail(res, "Unauthorised. Please log in.", 401);
  }

  // Admins retain platform-wide global access
  if (req.user.role === "admin") {
    return next();
  }

  // Non-users (e.g. advisors) cannot access user self endpoints without advisor-specific routes
  if (req.user.role !== "user") {
    return fail(res, "Access denied. User session required.", 403);
  }

  // Extract target user ID strictly from route params (never body or query)
  const targetUserId = req.params?.[paramName] || req.params?.userId || req.params?.id;

  // If no target ID in route params, this route is self-scoped to the authenticated session
  if (!targetUserId) {
    return next();
  }

  // Validate UUID format
  if (!UUID_REGEX.test(targetUserId)) {
    return fail(res, "Invalid User ID format.", 400, { code: "INVALID_USER_ID" });
  }

  // Strict ownership check: authenticated user ID MUST match target user ID
  if (req.user.id !== targetUserId) {
    return fail(res, "Access denied. You can only access your own resources.", 403, {
      code: "USER_RESOURCE_FORBIDDEN",
    });
  }

  next();
}

module.exports = {
  authenticate,
  requireAdvisorSession,
  authenticateAdvisor: requireAdvisorSession,
  requireAdvisor,
  requireUser,
  requireAdmin,
  requireProfileComplete,
  requireAdvisorClientAccess,
  requireSelfUser,
  requireSelfOrAdmin: requireSelfUser,
};