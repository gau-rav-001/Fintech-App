// ── Run: node services/tests/advisorSession.test.js ───────────────────────────
// Phase 3.4: Advisor Session Validation Middleware & Real-Time Invalidation Tests

process.env.NODE_ENV = "test";

const http     = require("http");
const express  = require("express");
const jwt      = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const db       = require("../../config/db");
const Advisor  = require("../../models/Advisor");
const User     = require("../../models/User");
const Admin    = require("../../models/Admin");
const { signToken, buildAdvisorPayload, buildPayload, revokeToken } = require("../../utils/jwt");
const { requireAdvisorSession, authenticate } = require("../../middleware/auth");
const { ok }   = require("../../utils/response");

async function runTests() {
  console.log("\n==================================================================");
  console.log("  PHASE 3.4 — ADVISOR SESSION VALIDATION TEST SUITE               ");
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

  // Setup express test app with protected test routes
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Protected advisor test route
  app.get("/api/test/advisor-protected", requireAdvisorSession, (req, res) => {
    return ok(res, {
      advisor: {
        id: req.advisor.id,
        fullName: req.advisor.fullName,
        email: req.advisor.email,
        firmName: req.advisor.firmName,
        approvalStatus: req.advisor.approvalStatus,
        isEmailVerified: req.advisor.isEmailVerified,
      },
      hasPasswordHash: "passwordHash" in req.advisor || "password_hash" in req.advisor,
    }, "Advisor access granted.");
  });

  // Protected user test route
  app.get("/api/test/user-protected", authenticate, (req, res) => {
    return ok(res, { userId: req.user.id, role: req.user.role }, "User access granted.");
  });

  // Start in-memory HTTP server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/test`;

  const createdAdvisorIds = [];
  const createdUserIds = [];

  try {
    // Setup test baseline advisor
    const advEmail = `session_adv_${Date.now()}@smartfinance.test`;
    const testAdvisor = await Advisor.create({
      fullName: "Anand Deshmukh",
      email: advEmail,
      password: "AdvisorPassword2026!",
      firmName: "Deshmukh Wealth LLP",
      licenseNumber: "ARN-778899",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(testAdvisor.id, {
      approvalStatus: "approved",
      approvedAt: new Date(),
    });
    createdAdvisorIds.push(testAdvisor.id);

    // Setup test regular user
    const userEmail = `session_user_${Date.now()}@sf.test`;
    const testUser = await User.create({
      fullName: "Regular Client",
      email: userEmail,
      password: "UserPassword2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(testUser.id);

    // Valid tokens
    const validAdvisorJWT = signToken(buildAdvisorPayload(testAdvisor));
    const validUserJWT = signToken(buildPayload(testUser));

    // ── Test 1: Missing advisor cookie
    console.log("\n[Test 1] Missing advisor session cookie");
    const missingRes = await fetch(`${baseUrl}/advisor-protected`);
    const missingData = await missingRes.json();
    assert(missingRes.status === 401, "Missing cookie returns HTTP 401");
    assert(missingData.message.includes("No advisor token provided"), "Clear error message returned");

    // ── Test 2: Malformed JWT
    console.log("\n[Test 2] Malformed JWT in sf_advisor_token");
    const malformedRes = await fetch(`${baseUrl}/advisor-protected`, {
      headers: { Cookie: "sf_advisor_token=malformed.token.value" },
    });
    assert(malformedRes.status === 401, "Malformed JWT returns HTTP 401");

    // ── Test 3: Invalid JWT signature
    console.log("\n[Test 3] Invalid signature in sf_advisor_token");
    const fakeToken = jwt.sign({ id: testAdvisor.id, role: "advisor" }, "wrong_secret_key_12345");
    const invalidSigRes = await fetch(`${baseUrl}/advisor-protected`, {
      headers: { Cookie: `sf_advisor_token=${fakeToken}` },
    });
    assert(invalidSigRes.status === 401, "Invalid signature returns HTTP 401");

    // ── Test 4: Expired JWT
    console.log("\n[Test 4] Expired JWT in sf_advisor_token");
    const expiredToken = jwt.sign(
      { id: testAdvisor.id, role: "advisor" },
      process.env.JWT_SECRET,
      { expiresIn: "-1s" }
    );
    const expiredRes = await fetch(`${baseUrl}/advisor-protected`, {
      headers: { Cookie: `sf_advisor_token=${expiredToken}` },
    });
    const expiredData = await expiredRes.json();
    assert(expiredRes.status === 401, "Expired JWT returns HTTP 401");
    assert(expiredData.message.includes("Session expired"), "Session expired message returned");

    // ── Test 5: Wrong JWT role (User JWT sent to Advisor route)
    console.log("\n[Test 5] Role mismatch: User JWT sent in sf_advisor_token");
    const wrongRoleToken = jwt.sign({ id: testUser.id, role: "user" }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const wrongRoleRes = await fetch(`${baseUrl}/advisor-protected`, {
      headers: { Cookie: `sf_advisor_token=${wrongRoleToken}` },
    });
    assert(wrongRoleRes.status === 403, "Wrong role returns HTTP 403 Forbidden");

    // ── Test 6: Revoked jti (Blacklisted token)
    console.log("\n[Test 6] Token revocation via jti blacklist");
    const tokenToRevoke = signToken(buildAdvisorPayload(testAdvisor));
    const preRevokeRes = await fetch(`${baseUrl}/advisor-protected`, {
      headers: { Cookie: `sf_advisor_token=${tokenToRevoke}` },
    });
    assert(preRevokeRes.status === 200, "Token valid before revocation");

    await revokeToken(tokenToRevoke);
    const postRevokeRes = await fetch(`${baseUrl}/advisor-protected`, {
      headers: { Cookie: `sf_advisor_token=${tokenToRevoke}` },
    });
    const postRevokeData = await postRevokeRes.json();
    assert(postRevokeRes.status === 401, "Revoked token returns HTTP 401");
    assert(postRevokeData.message.includes("revoked"), "Revocation message returned");

    // ── Test 7: Nonexistent advisor ID in valid signed JWT
    console.log("\n[Test 7] Nonexistent advisor UUID in signed JWT");
    const nonExistentToken = signToken({ id: "00000000-0000-0000-0000-000000000099", role: "advisor" });
    const nonExistentRes = await fetch(`${baseUrl}/advisor-protected`, {
      headers: { Cookie: `sf_advisor_token=${nonExistentToken}` },
    });
    assert(nonExistentRes.status === 401, "Nonexistent advisor returns HTTP 401");

    // ── Test 8: Valid approved + verified advisor -> HTTP 200 OK
    console.log("\n[Test 8] Approved and verified advisor access");
    const approvedRes = await fetch(`${baseUrl}/advisor-protected`, {
      headers: { Cookie: `sf_advisor_token=${validAdvisorJWT}` },
    });
    const approvedData = await approvedRes.json();
    assert(approvedRes.status === 200, "Approved advisor returns HTTP 200 OK");
    assert(approvedData.data.advisor.id === testAdvisor.id, "Correct advisor context attached");
    assert(approvedData.data.hasPasswordHash === false, "password_hash is NOT exposed in request context");

    // ══════════════════════════════════════════════════════════════════════════
    // CRITICAL LIVE DATABASE STATUS CHANGE TESTS (SAME UNEXPIRED JWT)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── CRITICAL: LIVE DATABASE STATE INVALIDATION TESTS ───");

    // ── Test 9: Suspend advisor in DB -> Same JWT immediately rejected
    console.log("\n[Test 9] Database transition: 'approved' -> 'suspended' (Same JWT)");
    await Advisor.updateApprovalStatus(testAdvisor.id, {
      approvalStatus: "suspended",
      suspensionReason: "Regulatory audit in progress.",
    });

    const suspendedRes = await fetch(`${baseUrl}/advisor-protected`, {
      headers: { Cookie: `sf_advisor_token=${validAdvisorJWT}` },
    });
    const suspendedData = await suspendedRes.json();
    assert(suspendedRes.status === 403, "Suspended advisor rejected with HTTP 403 Forbidden");
    assert(suspendedData.errors?.code === "ADVISOR_SUSPENDED", "Error code is ADVISOR_SUSPENDED");

    // ── Test 10: Reactivate advisor in DB -> Same JWT immediately allowed again
    console.log("\n[Test 10] Database transition: 'suspended' -> 'approved' (Same JWT restored)");
    await Advisor.updateApprovalStatus(testAdvisor.id, {
      approvalStatus: "approved",
      approvedAt: new Date(),
    });

    const restoredRes = await fetch(`${baseUrl}/advisor-protected`, {
      headers: { Cookie: `sf_advisor_token=${validAdvisorJWT}` },
    });
    assert(restoredRes.status === 200, "Restored advisor immediately regains access with same JWT");

    // ── Test 11: Reject advisor in DB -> Same JWT immediately rejected
    console.log("\n[Test 11] Database transition: 'approved' -> 'rejected' (Same JWT)");
    await Advisor.updateApprovalStatus(testAdvisor.id, {
      approvalStatus: "rejected",
      rejectionReason: "License documentation forged.",
    });

    const rejectedRes = await fetch(`${baseUrl}/advisor-protected`, {
      headers: { Cookie: `sf_advisor_token=${validAdvisorJWT}` },
    });
    const rejectedData = await rejectedRes.json();
    assert(rejectedRes.status === 403, "Rejected advisor rejected with HTTP 403 Forbidden");
    assert(rejectedData.errors?.code === "ADVISOR_REJECTED", "Error code is ADVISOR_REJECTED");

    // Restore to approved for subsequent checks
    await Advisor.updateApprovalStatus(testAdvisor.id, {
      approvalStatus: "approved",
      approvedAt: new Date(),
    });

    // ── Test 12: Revoke email verification in DB -> Same JWT rejected
    console.log("\n[Test 12] Database transition: is_email_verified = false (Same JWT)");
    await db.query("UPDATE advisors SET is_email_verified = FALSE WHERE id = $1", [testAdvisor.id]);

    const unverifiedEmailRes = await fetch(`${baseUrl}/advisor-protected`, {
      headers: { Cookie: `sf_advisor_token=${validAdvisorJWT}` },
    });
    const unverifiedEmailData = await unverifiedEmailRes.json();
    assert(unverifiedEmailRes.status === 403, "Unverified email advisor rejected with HTTP 403 Forbidden");
    assert(unverifiedEmailData.errors?.code === "EMAIL_NOT_VERIFIED", "Error code is EMAIL_NOT_VERIFIED");

    // Restore email verified
    await Advisor.verifyAdvisorEmail(testAdvisor.id);

    // ══════════════════════════════════════════════════════════════════════════
    // ROLE & COOKIE ISOLATION TESTS
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── ROLE & COOKIE ISOLATION TESTS ───");

    // ── Test 13: sf_token (User cookie) cannot authenticate Advisor route
    console.log("\n[Test 13] sf_token (User cookie) sent to Advisor route");
    const userCookieOnAdvRes = await fetch(`${baseUrl}/advisor-protected`, {
      headers: { Cookie: `sf_token=${validUserJWT}` },
    });
    assert(userCookieOnAdvRes.status === 401, "sf_token alone cannot authenticate Advisor route (HTTP 401)");

    // ── Test 14: sf_admin_token (Admin cookie) cannot authenticate Advisor route
    console.log("\n[Test 14] sf_admin_token (Admin cookie) sent to Advisor route");
    const adminEmail = process.env.ADMIN_EMAIL || "harshvardhan.varma2023@vitbhopal.ac.in";
    const foundAdmin = await Admin.findByEmail(adminEmail);
    if (foundAdmin) {
      const validAdminJWT = signToken({ id: foundAdmin.id, role: "admin" });
      const adminCookieOnAdvRes = await fetch(`${baseUrl}/advisor-protected`, {
        headers: { Cookie: `sf_admin_token=${validAdminJWT}` },
      });
      assert(adminCookieOnAdvRes.status === 401, "sf_admin_token alone cannot authenticate Advisor route (HTTP 401)");
    } else {
      console.log("  ℹ Admin cookie isolation test skipped (no admin in db)");
    }

    // ── Test 15: Multi-session coexistence (User, Admin, and Advisor cookies in same header)
    console.log("\n[Test 15] Multi-session coexistence (sf_token + sf_advisor_token in same request)");
    const multiCookieRes = await fetch(`${baseUrl}/advisor-protected`, {
      headers: { Cookie: `sf_token=${validUserJWT}; sf_advisor_token=${validAdvisorJWT}` },
    });
    assert(multiCookieRes.status === 200, "Advisor route successfully reads sf_advisor_token when sf_token coexists");

    const multiUserRes = await fetch(`${baseUrl}/user-protected`, {
      headers: { Cookie: `sf_token=${validUserJWT}; sf_advisor_token=${validAdvisorJWT}` },
    });
    assert(multiUserRes.status === 200, "User route successfully reads sf_token when sf_advisor_token coexists");

    // ── Test 16: User & Admin regression
    console.log("\n[Test 16] User & Admin auth regression");
    const userProtectedRes = await fetch(`${baseUrl}/user-protected`, {
      headers: { Cookie: `sf_token=${validUserJWT}` },
    });
    const userProtectedData = await userProtectedRes.json();
    assert(userProtectedRes.status === 200, "User protected route operational");
    assert(userProtectedData.data.userId === testUser.id, "User context preserved");

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
