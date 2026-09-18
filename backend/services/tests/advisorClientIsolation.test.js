// backend/services/tests/advisorClientIsolation.test.js
// ── Run: node services/tests/advisorClientIsolation.test.js ───────────────────
// Phase 4.1 + 4.2: Role Authorization & Advisor Client Isolation Test Suite

process.env.NODE_ENV = "test";

const http         = require("http");
const express      = require("express");
const cookieParser = require("cookie-parser");
const db           = require("../../config/db");
const Advisor      = require("../../models/Advisor");
const User         = require("../../models/User");
const Admin        = require("../../models/Admin");
const AdvisorRelationship = require("../../models/AdvisorRelationship");
const AuditLog     = require("../../models/AuditLog");
const { signToken, buildAdvisorPayload, buildPayload } = require("../../utils/jwt");
const {
  authenticate,
  requireAdvisorSession,
  requireAdvisor,
  requireUser,
  requireAdmin,
  requireAdvisorClientAccess,
} = require("../../middleware/auth");
const { ok }       = require("../../utils/response");

async function runTests() {
  console.log("\n==================================================================");
  console.log("  PHASE 4.1 & 4.2 — AUTHORIZATION & CLIENT ISOLATION TEST SUITE   ");
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

  // 1. Role-specific test routes (Phase 4.1)
  app.get("/api/test/admin-only", authenticate, requireAdmin, (req, res) => {
    return ok(res, { adminId: req.user.id, role: req.user.role }, "Admin access granted.");
  });

  app.get("/api/test/user-only", authenticate, requireUser, (req, res) => {
    return ok(res, { userId: req.user.id, role: req.user.role }, "User access granted.");
  });

  app.get("/api/test/advisor-only", requireAdvisor, (req, res) => {
    return ok(res, { advisorId: req.advisor.id, role: "advisor" }, "Advisor access granted.");
  });

  // 2. Canonical Client-isolation test routes using :clientId route param (Phase 4.2)
  app.get("/api/test/advisor/clients/:clientId", requireAdvisorSession, requireAdvisorClientAccess, (req, res) => {
    return ok(res, {
      advisorId: req.advisor.id,
      targetClientId: req.targetClientId,
      relationshipId: req.clientRelationship.id,
      status: req.clientRelationship.status,
    }, "Client access granted.");
  });

  app.post("/api/test/advisor/clients/:clientId/update", requireAdvisorSession, requireAdvisorClientAccess, (req, res) => {
    return ok(res, {
      advisorId: req.advisor.id,
      targetClientId: req.targetClientId,
      relationshipId: req.clientRelationship.id,
      body: req.body,
    }, "Client update authorized.");
  });

  // Route without :clientId in path to verify missing param detection
  app.get("/api/test/advisor/clients-no-param", requireAdvisorSession, requireAdvisorClientAccess, (req, res) => {
    return ok(res, {}, "Unexpected success");
  });

  // Start in-memory HTTP server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/test`;

  const createdAdvisorIds = [];
  const createdUserIds = [];
  const createdRelationshipIds = [];

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // FIXTURE SETUP
    // ══════════════════════════════════════════════════════════════════════════
    console.log("─── CREATING TEST FIXTURES ───");

    // Advisor A (Approved, Email Verified)
    const advisorA = await Advisor.create({
      fullName: "Advisor Alpha",
      email: `advisor_a_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Alpha Wealth Advisory",
      licenseNumber: "ARN-ALPHA-1",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorA.id, { approvalStatus: "approved", approvedAt: new Date() });
    createdAdvisorIds.push(advisorA.id);

    // Advisor B (Approved, Email Verified)
    const advisorB = await Advisor.create({
      fullName: "Advisor Beta",
      email: `advisor_b_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Beta Capital Partners",
      licenseNumber: "ARN-BETA-2",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorB.id, { approvalStatus: "approved", approvedAt: new Date() });
    createdAdvisorIds.push(advisorB.id);

    // User 1 (Client of Advisor A)
    const user1 = await User.create({
      fullName: "Client One (Alpha)",
      email: `client_1_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(user1.id);

    // User 2 (Client of Advisor A)
    const user2 = await User.create({
      fullName: "Client Two (Alpha)",
      email: `client_2_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(user2.id);

    // User 3 (Client for testing non-active relationship states)
    const user3 = await User.create({
      fullName: "Client Three (State Testing)",
      email: `client_3_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(user3.id);

    // User 4 (Client of Advisor B)
    const user4 = await User.create({
      fullName: "Client Four (Beta)",
      email: `client_4_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(user4.id);

    // Relationships:
    // Advisor A -> User 1 (active)
    const relA1 = await AdvisorRelationship.create({
      advisorId: advisorA.id,
      userId: user1.id,
      clientEmail: user1.email,
      status: "active",
      initiatedBy: "advisor",
    });
    createdRelationshipIds.push(relA1.id);

    // Advisor A -> User 2 (active)
    const relA2 = await AdvisorRelationship.create({
      advisorId: advisorA.id,
      userId: user2.id,
      clientEmail: user2.email,
      status: "active",
      initiatedBy: "advisor",
    });
    createdRelationshipIds.push(relA2.id);

    // Advisor B -> User 4 (active)
    const relB4 = await AdvisorRelationship.create({
      advisorId: advisorB.id,
      userId: user4.id,
      clientEmail: user4.email,
      status: "active",
      initiatedBy: "advisor",
    });
    createdRelationshipIds.push(relB4.id);

    // State testing relationship for User 3 (initially 'invited')
    const relA3 = await AdvisorRelationship.create({
      advisorId: advisorA.id,
      userId: user3.id,
      clientEmail: user3.email,
      status: "invited",
      initiatedBy: "advisor",
    });
    createdRelationshipIds.push(relA3.id);

    // Admin fixture
    const adminEmail = process.env.ADMIN_EMAIL || "harshvardhan.varma2023@vitbhopal.ac.in";
    let testAdmin = await Admin.findByEmail(adminEmail);
    if (!testAdmin) {
      testAdmin = await Admin.create({
        fullName: "Test Platform Admin",
        email: `admin_${Date.now()}@smartfinance.test`,
        password: "AdminPassword2026!",
      });
    }

    // JWT Tokens
    const tokenAdvisorA = signToken(buildAdvisorPayload(advisorA));
    const tokenAdvisorB = signToken(buildAdvisorPayload(advisorB));
    const tokenUser1    = signToken(buildPayload(user1));
    const tokenAdmin    = signToken({ id: testAdmin.id, role: "admin", email: testAdmin.email });

    console.log("✓ Fixtures created successfully.");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 1: PHASE 4.1 — ROLE AUTHORIZATION GUARDS
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 1: ROLE AUTHORIZATION GUARDS (requireAdmin, requireAdvisor, requireUser) ───");

    // ── Test R1: requireAdmin permits Admin
    console.log("\n[Test R1] Admin session accessing requireAdmin route");
    const adminRes = await fetch(`${baseUrl}/admin-only`, {
      headers: { Cookie: `sf_admin_token=${tokenAdmin}` },
    });
    assert(adminRes.status === 200, "Admin session granted access to admin route (HTTP 200)");

    // ── Test R2: requireAdmin rejects regular User
    console.log("\n[Test R2] User session accessing requireAdmin route");
    const userOnAdminRes = await fetch(`${baseUrl}/admin-only`, {
      headers: { Cookie: `sf_token=${tokenUser1}` },
    });
    assert(userOnAdminRes.status === 403, "User session denied on admin route (HTTP 403)");

    // ── Test R3: requireAdmin rejects Advisor session
    console.log("\n[Test R3] Advisor session accessing requireAdmin route");
    const advOnAdminRes = await fetch(`${baseUrl}/admin-only`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(advOnAdminRes.status === 401 || advOnAdminRes.status === 403, "Advisor session denied on admin route (HTTP 401/403)");

    // ── Test R4: requireUser permits User
    console.log("\n[Test R4] User session accessing requireUser route");
    const userRes = await fetch(`${baseUrl}/user-only`, {
      headers: { Cookie: `sf_token=${tokenUser1}` },
    });
    assert(userRes.status === 200, "User session granted access to user route (HTTP 200)");

    // ── Test R5: requireUser rejects Admin session
    console.log("\n[Test R5] Admin session accessing requireUser route");
    const adminOnUserRes = await fetch(`${baseUrl}/user-only`, {
      headers: { Cookie: `sf_admin_token=${tokenAdmin}` },
    });
    assert(adminOnUserRes.status === 403, "Admin session denied on user route (HTTP 403)");

    // ── Test R6: requireUser rejects Advisor session
    console.log("\n[Test R6] Advisor session accessing requireUser route");
    const advOnUserRes = await fetch(`${baseUrl}/user-only`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(advOnUserRes.status === 401 || advOnUserRes.status === 403, "Advisor session denied on user route (HTTP 401/403)");

    // ── Test R7: requireAdvisor permits approved & verified Advisor
    console.log("\n[Test R7] Advisor session accessing requireAdvisor route");
    const advRes = await fetch(`${baseUrl}/advisor-only`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(advRes.status === 200, "Advisor session granted access to advisor route (HTTP 200)");

    // ── Test R8: requireAdvisor rejects User session
    console.log("\n[Test R8] User session accessing requireAdvisor route");
    const userOnAdvRes = await fetch(`${baseUrl}/advisor-only`, {
      headers: { Cookie: `sf_token=${tokenUser1}` },
    });
    assert(userOnAdvRes.status === 401, "User session denied on advisor route (HTTP 401)");

    // ── Test R9: requireAdvisor rejects Admin session
    console.log("\n[Test R9] Admin session accessing requireAdvisor route");
    const adminOnAdvRes = await fetch(`${baseUrl}/advisor-only`, {
      headers: { Cookie: `sf_admin_token=${tokenAdmin}` },
    });
    assert(adminOnAdvRes.status === 401, "Admin session denied on advisor route (HTTP 401)");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 2: PHASE 4.2 — ADVISOR CLIENT ISOLATION (CORE TESTS)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 2: ADVISOR CLIENT ISOLATION (requireAdvisorClientAccess) ───");

    // ── Test 1: Advisor A -> User 1 = ALLOW
    console.log("\n[Test 1] Advisor A -> User 1 (Active Relationship)");
    const t1Res = await fetch(`${baseUrl}/advisor/clients/${user1.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    const t1Data = await t1Res.json();
    assert(t1Res.status === 200, "Advisor A granted access to Client 1 (HTTP 200)");
    assert(t1Data.data.targetClientId === user1.id, "Correct client ID attached to context");
    assert(t1Data.data.advisorId === advisorA.id, "Correct advisor ID attached to context");

    // ── Test 2: Advisor A -> User 2 = ALLOW
    console.log("\n[Test 2] Advisor A -> User 2 (Active Relationship)");
    const t2Res = await fetch(`${baseUrl}/advisor/clients/${user2.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(t2Res.status === 200, "Advisor A granted access to Client 2 (HTTP 200)");

    // ── Test 3: Advisor B -> User 1 = DENY 403
    console.log("\n[Test 3] Advisor B -> User 1 (No Relationship)");
    const t3Res = await fetch(`${baseUrl}/advisor/clients/${user1.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorB}` },
    });
    const t3Data = await t3Res.json();
    assert(t3Res.status === 403, "Advisor B denied access to Client 1 (HTTP 403 Forbidden)");
    assert(t3Data.errors?.code === "ADVISOR_CLIENT_ACCESS_DENIED", "Correct error code returned");

    // ── Test 4: Advisor B -> User 2 = DENY 403
    console.log("\n[Test 4] Advisor B -> User 2 (No Relationship)");
    const t4Res = await fetch(`${baseUrl}/advisor/clients/${user2.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorB}` },
    });
    assert(t4Res.status === 403, "Advisor B denied access to Client 2 (HTTP 403 Forbidden)");

    // ── Test 5: Advisor A -> Random Nonexistent User UUID = DENY 403
    console.log("\n[Test 5] Advisor A -> Random UUID (Nonexistent relationship)");
    const randomUserUUID = "550e8400-e29b-41d4-a716-446655449999";
    const t5Res = await fetch(`${baseUrl}/advisor/clients/${randomUserUUID}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(t5Res.status === 403, "Advisor A denied access to random user UUID (HTTP 403)");

    // ── Test 6: Advisor B -> Random Nonexistent User UUID = DENY 403
    console.log("\n[Test 6] Advisor B -> Random UUID (Nonexistent relationship)");
    const t6Res = await fetch(`${baseUrl}/advisor/clients/${randomUserUUID}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorB}` },
    });
    assert(t6Res.status === 403, "Advisor B denied access to random user UUID (HTTP 403)");

    // ── Test 7: Relationship status 'invited' = DENY 403
    console.log("\n[Test 7] Relationship status 'invited' -> Access DENIED");
    await db.query(`UPDATE advisor_client_relationships SET status = 'invited' WHERE id = $1`, [relA3.id]);
    const t7Res = await fetch(`${baseUrl}/advisor/clients/${user3.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(t7Res.status === 403, "'invited' relationship rejected with HTTP 403");

    // ── Test 8: Relationship status 'pending_user_acceptance' = DENY 403
    console.log("\n[Test 8] Relationship status 'pending_user_acceptance' -> Access DENIED");
    await db.query(`UPDATE advisor_client_relationships SET status = 'pending_user_acceptance' WHERE id = $1`, [relA3.id]);
    const t8Res = await fetch(`${baseUrl}/advisor/clients/${user3.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(t8Res.status === 403, "'pending_user_acceptance' relationship rejected with HTTP 403");

    // ── Test 9: Relationship status 'suspended' = DENY 403
    console.log("\n[Test 9] Relationship status 'suspended' -> Access DENIED");
    await db.query(`UPDATE advisor_client_relationships SET status = 'suspended' WHERE id = $1`, [relA3.id]);
    const t9Res = await fetch(`${baseUrl}/advisor/clients/${user3.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(t9Res.status === 403, "'suspended' relationship rejected with HTTP 403");

    // ── Test 10: Relationship status 'terminated' = DENY 403
    console.log("\n[Test 10] Relationship status 'terminated' -> Access DENIED");
    await db.query(`UPDATE advisor_client_relationships SET status = 'terminated' WHERE id = $1`, [relA3.id]);
    const t10Res = await fetch(`${baseUrl}/advisor/clients/${user3.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(t10Res.status === 403, "'terminated' relationship rejected with HTTP 403");

    // ── Test 11: Relationship status 'reassigned' = DENY 403
    console.log("\n[Test 11] Relationship status 'reassigned' -> Access DENIED");
    await db.query(`UPDATE advisor_client_relationships SET status = 'reassigned' WHERE id = $1`, [relA3.id]);
    const t11Res = await fetch(`${baseUrl}/advisor/clients/${user3.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(t11Res.status === 403, "'reassigned' relationship rejected with HTTP 403");

    // ── Test 12: Missing clientId route param = HTTP 400
    console.log("\n[Test 12] Missing clientId route param in request");
    const t12Res = await fetch(`${baseUrl}/advisor/clients-no-param`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    const t12Data = await t12Res.json();
    assert(t12Res.status === 400, "Missing clientId route param returns HTTP 400 Bad Request");
    assert(t12Data.errors?.code === "CLIENT_ID_REQUIRED", "Error code is CLIENT_ID_REQUIRED");

    // ── Test 13: Malformed client ID in route param = HTTP 400
    console.log("\n[Test 13] Malformed client ID (non-UUID)");
    const t13Res = await fetch(`${baseUrl}/advisor/clients/not-a-valid-uuid-1234`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    const t13Data = await t13Res.json();
    assert(t13Res.status === 400, "Malformed client ID returns HTTP 400 Bad Request");
    assert(t13Data.errors?.code === "INVALID_CLIENT_ID", "Error code is INVALID_CLIENT_ID");

    // ── Test 14: Missing advisor session = HTTP 401
    console.log("\n[Test 14] Missing advisor session cookie");
    const t14Res = await fetch(`${baseUrl}/advisor/clients/${user1.id}`);
    assert(t14Res.status === 401, "Missing advisor session returns HTTP 401 Unauthorised");

    // ── Test 15: User session on advisor-protected resource = HTTP 401/403
    console.log("\n[Test 15] User session attempting advisor client access");
    const t15Res = await fetch(`${baseUrl}/advisor/clients/${user1.id}`, {
      headers: { Cookie: `sf_token=${tokenUser1}` },
    });
    assert(t15Res.status === 401 || t15Res.status === 403, "User session rejected on advisor client resource");

    // ── Test 16: Admin session cannot masquerade as advisor session
    console.log("\n[Test 16] Admin session attempting advisor client access");
    const t16Res = await fetch(`${baseUrl}/advisor/clients/${user1.id}`, {
      headers: { Cookie: `sf_admin_token=${tokenAdmin}` },
    });
    assert(t16Res.status === 401 || t16Res.status === 403, "Admin session rejected on advisor client resource");

    // ── Test 17: Request Body advisorId tampering cannot override server identity
    console.log("\n[Test 17] Attacker injects 'advisorId' in POST body");
    const t17Res = await fetch(`${baseUrl}/advisor/clients/${user1.id}/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_advisor_token=${tokenAdvisorB}`, // Advisor B authenticated
      },
      body: JSON.stringify({
        advisorId: advisorA.id, // Advisor B claims to be Advisor A in body
        notes: "Malicious update attempt",
      }),
    });
    assert(t17Res.status === 403, "Body tampering attempt rejected with HTTP 403 Forbidden");

    // ── Test 18: Request Query advisorId tampering cannot override server identity
    console.log("\n[Test 18] Attacker injects '?advisorId=' in query parameter");
    const t18Res = await fetch(`${baseUrl}/advisor/clients/${user1.id}?advisorId=${advisorA.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorB}` },
    });
    assert(t18Res.status === 403, "Query parameter tampering attempt rejected with HTTP 403 Forbidden");

    // ── Test 19: Request Body clientId cannot override route param :clientId
    console.log("\n[Test 19] Attacker injects authorized 'clientId' in POST body while URL targets unauthorized client");
    const t19BodyRes = await fetch(`${baseUrl}/advisor/clients/${user1.id}/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_advisor_token=${tokenAdvisorB}`, // Advisor B authenticated (owns User 4, not User 1)
      },
      body: JSON.stringify({
        clientId: user4.id, // Advisor B puts owned client in body to fool backend
      }),
    });
    assert(t19BodyRes.status === 403, "Body clientId injection rejected — URL :clientId strictly enforced");

    // ── Test 20: Database transition: active -> suspended immediately blocks access (Same JWT)
    console.log("\n[Test 20] Dynamic DB Transition: active -> suspended (Same JWT)");
    // User 1 access works initially
    const t20PreRes = await fetch(`${baseUrl}/advisor/clients/${user1.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(t20PreRes.status === 200, "Access active before suspension");

    // Suspend relationship in database
    await db.query(`UPDATE advisor_client_relationships SET status = 'suspended' WHERE id = $1`, [relA1.id]);

    const t20PostRes = await fetch(`${baseUrl}/advisor/clients/${user1.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(t20PostRes.status === 403, "Access immediately blocked after relationship suspended (HTTP 403)");

    // ── Test 21: Database transition: suspended -> active restores access (Same JWT)
    console.log("\n[Test 21] Dynamic DB Transition: suspended -> active (Same JWT restored)");
    // Restore relationship to active
    await db.query(`UPDATE advisor_client_relationships SET status = 'active' WHERE id = $1`, [relA1.id]);

    const t21Res = await fetch(`${baseUrl}/advisor/clients/${user1.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(t21Res.status === 200, "Access immediately restored after relationship activated (HTTP 200)");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 3: MANDATORY CROSS-TENANT ATTACK TEST
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 3: MANDATORY CROSS-TENANT ATTACK TEST ───");
    console.log("Scenario: Advisor A owns Client 1. Advisor B owns Client 4.");

    // Step 1: Advisor A accesses Advisor B's client (Client 4) -> 403
    console.log("\n[Attack 1] Advisor A attempts GET /advisor/clients/Client4");
    const atk1Res = await fetch(`${baseUrl}/advisor/clients/${user4.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(atk1Res.status === 403, "Advisor A blocked from accessing Advisor B's client (HTTP 403)");

    // Step 2: Advisor A attempts POST /advisor/clients/Client4 with { advisorId: advisorB.id }
    console.log("\n[Attack 2] Advisor A POSTs with { advisorId: Advisor B }");
    const atk2Res = await fetch(`${baseUrl}/advisor/clients/${user4.id}/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_advisor_token=${tokenAdvisorA}`,
      },
      body: JSON.stringify({ advisorId: advisorB.id }),
    });
    assert(atk2Res.status === 403, "Advisor A body spoofing blocked (HTTP 403)");

    // Step 3: Advisor A attempts GET /advisor/clients/Client4?advisorId=AdvisorB
    console.log("\n[Attack 3] Advisor A GETs with ?advisorId=AdvisorB");
    const atk3Res = await fetch(`${baseUrl}/advisor/clients/${user4.id}?advisorId=${advisorB.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(atk3Res.status === 403, "Advisor A query spoofing blocked (HTTP 403)");

    // Step 4: Advisor B accesses Advisor A's client (Client 1) -> 403
    console.log("\n[Attack 4] Advisor B attempts GET /advisor/clients/Client1");
    const atk4Res = await fetch(`${baseUrl}/advisor/clients/${user1.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorB}` },
    });
    assert(atk4Res.status === 403, "Advisor B blocked from accessing Advisor A's client (HTTP 403)");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 4: AUDIT LOG VERIFICATION
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 4: AUDIT LOG VERIFICATION ───");
    const { rows: deniedLogs } = await db.query(
      `SELECT * FROM audit_logs 
       WHERE action = 'ADVISOR_CLIENT_ACCESS_DENIED' AND actor_id = ANY($1::uuid[])
       ORDER BY created_at DESC`,
      [createdAdvisorIds]
    );
    assert(deniedLogs.length > 0, "Audit log records created for denied client access attempts");
    assert(deniedLogs[0].action === "ADVISOR_CLIENT_ACCESS_DENIED", "Audit log action is ADVISOR_CLIENT_ACCESS_DENIED");
    assert(deniedLogs[0].actor_type === "advisor", "Audit log actor_type is 'advisor'");

  } finally {
    // Teardown: clean up test entities
    console.log("\n[Teardown] Cleaning up test records from database...");
    if (createdRelationshipIds.length > 0) {
      await db.query(`DELETE FROM advisor_client_relationships WHERE id = ANY($1::uuid[])`, [createdRelationshipIds]);
    }
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
