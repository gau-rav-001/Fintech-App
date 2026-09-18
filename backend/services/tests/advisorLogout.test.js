// ── Run: node services/tests/advisorLogout.test.js ────────────────────────────
// Phase 3.5: Advisor Logout, Cookie Clearance, JTI Revocation & Multi-Session Isolation Tests

process.env.NODE_ENV = "test";

const http         = require("http");
const express      = require("express");
const jwt          = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const db           = require("../../config/db");
const Advisor      = require("../../models/Advisor");
const AuditLog     = require("../../models/AuditLog");
const User         = require("../../models/User");
const Admin        = require("../../models/Admin");
const { signToken, buildAdvisorPayload, buildPayload } = require("../../utils/jwt");
const { requireAdvisorSession, authenticate } = require("../../middleware/auth");
const advisorAuthRoutes = require("../../routes/advisorAuthRoutes");
const { ok }       = require("../../utils/response");

async function runTests() {
  console.log("\n==================================================================");
  console.log("  PHASE 3.5 — ADVISOR LOGOUT & REVOCATION TEST SUITE              ");
  console.log("==================================================================\n");

  let testPassed = 0;
  let testFailed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      testPassed++;
    } else {
      console.error(`  ✗ FAILED: ${testName}`);
      testFailed++;
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  // Setup express test app
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Mount advisor auth routes (includes POST /api/advisor/auth/logout)
  app.use("/api/advisor/auth", advisorAuthRoutes);

  // Protected advisor test route
  app.get("/api/test/advisor-protected", requireAdvisorSession, (req, res) => {
    return ok(res, { advisorId: req.advisor.id }, "Advisor access granted.");
  });

  // Protected user test route
  app.get("/api/test/user-protected", authenticate, (req, res) => {
    return ok(res, { userId: req.user.id, role: req.user.role }, "User access granted.");
  });

  // Start in-memory HTTP server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const createdAdvisorIds = [];
  const createdUserIds = [];

  try {
    // ── Setup test entities
    const advEmail = `logout_adv_${Date.now()}@smartfinance.test`;
    const testAdvisor = await Advisor.create({
      fullName: "Siddharth Rao",
      email: advEmail,
      password: "AdvisorPassword2026!",
      firmName: "Rao Financial Advisory",
      licenseNumber: "ARN-998877",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(testAdvisor.id, {
      approvalStatus: "approved",
      approvedAt: new Date(),
    });
    createdAdvisorIds.push(testAdvisor.id);

    const userEmail = `logout_user_${Date.now()}@sf.test`;
    const testUser = await User.create({
      fullName: "Regular Client",
      email: userEmail,
      password: "UserPassword2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(testUser.id);

    const adminEmail = process.env.ADMIN_EMAIL || "harshvardhan.varma2023@vitbhopal.ac.in";
    let testAdmin = await Admin.findByEmail(adminEmail);
    if (!testAdmin) {
      testAdmin = await Admin.create({
        fullName: "Super Admin",
        email: adminEmail,
        password: "AdminPassword2026!",
      });
    }

    // Generate valid tokens
    const advisorJWT = signToken(buildAdvisorPayload(testAdvisor));
    const userJWT    = signToken(buildPayload(testUser));
    const adminJWT   = signToken({ id: testAdmin.id, role: "admin", email: testAdmin.email });

    // ── Test 1: Verify advisor session is active prior to logout
    console.log("\n[Test 1] Verify active session before logout");
    const preLogoutRes = await fetch(`${baseUrl}/api/test/advisor-protected`, {
      headers: { Cookie: `sf_advisor_token=${advisorJWT}` },
    });
    assert(preLogoutRes.status === 200, "Advisor session is valid prior to logout");

    // ── Test 2: Multi-session simulation and Advisor logout execution
    console.log("\n[Test 2] Simultaneous Multi-Session Logout Execution (User + Admin + Advisor)");
    const multiSessionCookie = `sf_token=${userJWT}; sf_admin_token=${adminJWT}; sf_advisor_token=${advisorJWT}`;

    const logoutRes = await fetch(`${baseUrl}/api/advisor/auth/logout`, {
      method: "POST",
      headers: { Cookie: multiSessionCookie },
    });
    const logoutData = await logoutRes.json();

    assert(logoutRes.status === 200, "POST /api/advisor/auth/logout returns HTTP 200 OK");
    assert(logoutData.success === true, "Logout response success is true");
    assert(logoutData.message === "Advisor logged out successfully.", "Correct logout message returned");

    // ── Test 3: Verify cookie clearance and isolation
    console.log("\n[Test 3] Cookie clearance & isolation checks");
    const setCookieHeaders = logoutRes.headers.get("set-cookie") || "";
    assert(setCookieHeaders.includes("sf_advisor_token="), "Set-Cookie header targets sf_advisor_token");
    assert(
      setCookieHeaders.includes("Expires=Thu, 01 Jan 1970") || setCookieHeaders.includes("Max-Age=0") || setCookieHeaders.includes("sf_advisor_token=;"),
      "sf_advisor_token cookie cleared / expired"
    );
    assert(!setCookieHeaders.includes("sf_token="), "sf_token (User cookie) is NOT cleared or overwritten");
    assert(!setCookieHeaders.includes("sf_admin_token="), "sf_admin_token (Admin cookie) is NOT cleared or overwritten");

    // ── Test 4: Critical Revocation Test — Same old JWT rejected after logout
    console.log("\n[Test 4] Revocation verification (Same JWT presented after logout)");
    const postLogoutWithSameJWT = await fetch(`${baseUrl}/api/test/advisor-protected`, {
      headers: { Cookie: `sf_advisor_token=${advisorJWT}` },
    });
    const postLogoutData = await postLogoutWithSameJWT.json();
    assert(postLogoutWithSameJWT.status === 401, "Same JWT rejected with HTTP 401 after logout");
    assert(postLogoutData.message.includes("revoked"), "Error message indicates session has been revoked");

    // ── Test 5: Multi-session verification — User & Admin sessions remain valid
    console.log("\n[Test 5] User session remains 100% operational after Advisor logout");
    const userSessionCheck = await fetch(`${baseUrl}/api/test/user-protected`, {
      headers: { Cookie: `sf_token=${userJWT}` },
    });
    assert(userSessionCheck.status === 200, "User session remains valid after advisor logout");

    // ── Test 6: Repeated logout with already revoked token
    console.log("\n[Test 6] Repeated logout with already revoked token");
    const repeatLogoutRes = await fetch(`${baseUrl}/api/advisor/auth/logout`, {
      method: "POST",
      headers: { Cookie: `sf_advisor_token=${advisorJWT}` },
    });
    assert(repeatLogoutRes.status === 401, "Repeated logout with revoked token returns HTTP 401");

    // ── Test 7: Logout without cookie (Missing token)
    console.log("\n[Test 7] Logout without token");
    const noCookieLogoutRes = await fetch(`${baseUrl}/api/advisor/auth/logout`, {
      method: "POST",
    });
    assert(noCookieLogoutRes.status === 401, "Logout with missing cookie returns HTTP 401");

    // ── Test 8: Logout with invalid/malformed token
    console.log("\n[Test 8] Logout with malformed token");
    const malformedLogoutRes = await fetch(`${baseUrl}/api/advisor/auth/logout`, {
      method: "POST",
      headers: { Cookie: "sf_advisor_token=malformed.token.xyz" },
    });
    assert(malformedLogoutRes.status === 401, "Logout with malformed token returns HTTP 401");

    // ── Test 9: Audit log recorded for ADVISOR_LOGOUT
    console.log("\n[Test 9] Audit log verification for ADVISOR_LOGOUT");
    const auditLogs = await AuditLog.findAll({ actorId: testAdvisor.id });
    const actions = auditLogs.logs.map(l => l.action);
    assert(actions.includes("ADVISOR_LOGOUT"), "AuditLog includes ADVISOR_LOGOUT");

  } finally {
    // Teardown: clean up test entities
    console.log("\n[Teardown] Cleaning up test records from database...");
    if (createdAdvisorIds.length > 0) {
      await db.query(`DELETE FROM audit_logs WHERE actor_id = ANY($1::uuid[])`, [createdAdvisorIds]);
      await db.query(`DELETE FROM notifications WHERE actor_id = ANY($1::uuid[]) OR recipient_id = ANY($1::uuid[])`, [createdAdvisorIds]);
      await db.query(`DELETE FROM advisors WHERE id = ANY($1::uuid[])`, [createdAdvisorIds]);
    }
    if (createdUserIds.length > 0) {
      await db.query(`DELETE FROM notifications WHERE actor_id = ANY($1::uuid[]) OR recipient_id = ANY($1::uuid[])`, [createdUserIds]);
      await db.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [createdUserIds]);
    }
    await new Promise((resolve) => server.close(resolve));
    await db.pool.end();
    console.log("✓ Server closed and database connections terminated cleanly.");
  }

  console.log("\n==================================================================");
  console.log(`  FINAL RESULT: ${testPassed} PASSED, ${testFailed} FAILED `);
  console.log("==================================================================\n");
  process.exit(testFailed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Test runner encountered an error:", err);
  process.exit(1);
});
