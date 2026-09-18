// backend/services/tests/advisorConnectionRequest.test.js
// ── Run: node services/tests/advisorConnectionRequest.test.js ─────────────────
// Phase 6.3: Existing User Advisor Connection Request Test Suite (POST /api/advisor/requests)

process.env.NODE_ENV = "test";

const http         = require("http");
const express      = require("express");
const cookieParser = require("cookie-parser");
const db           = require("../../config/db");
const User         = require("../../models/User");
const Advisor      = require("../../models/Advisor");
const AdvisorRelationship = require("../../models/AdvisorRelationship");
const { signToken, buildAdvisorPayload, buildPayload } = require("../../utils/jwt");
const advisorRoutes = require("../../routes/advisorRoutes");

async function runTests() {
  console.log("\n==================================================================");
  console.log("  PHASE 6.3 — ADVISOR CONNECTION REQUEST TEST SUITE               ");
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
  app.use("/api/advisor", advisorRoutes);

  // Start in-memory HTTP server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/advisor`;

  const createdAdvisorIds = [];
  const createdUserIds = [];
  const createdRelationshipIds = [];

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // FIXTURE SETUP
    // ══════════════════════════════════════════════════════════════════════════
    console.log("─── CREATING TEST FIXTURES ───");

    // 1. Advisor A (Approved, Verified)
    const advisorA = await Advisor.create({
      fullName: "Advisor Alpha",
      email: `adv_req_a_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Alpha Wealth Advisory",
      licenseNumber: "ARN-REQ-001",
      approvalStatus: "approved",
      isEmailVerified: true,
      specializations: ["Retirement", "Tax Planning"],
    });
    await Advisor.updateApprovalStatus(advisorA.id, { approvalStatus: "approved", approvedAt: new Date() });
    createdAdvisorIds.push(advisorA.id);

    // 2. Advisor B (Approved, Verified)
    const advisorB = await Advisor.create({
      fullName: "Advisor Beta",
      email: `adv_req_b_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Beta Capital",
      licenseNumber: "ARN-REQ-002",
      approvalStatus: "approved",
      isEmailVerified: true,
      specializations: ["Equity", "Derivatives"],
    });
    await Advisor.updateApprovalStatus(advisorB.id, { approvalStatus: "approved", approvedAt: new Date() });
    createdAdvisorIds.push(advisorB.id);

    // 3. Advisor Pending
    const advisorPending = await Advisor.create({
      fullName: "Advisor Pending",
      email: `adv_req_pend_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Pending Advisory",
      licenseNumber: "ARN-REQ-003",
      approvalStatus: "pending",
      isEmailVerified: true,
    });
    createdAdvisorIds.push(advisorPending.id);

    // 4. Advisor Suspended
    const advisorSuspended = await Advisor.create({
      fullName: "Advisor Suspended",
      email: `adv_req_susp_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Suspended Advisory",
      licenseNumber: "ARN-REQ-004",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorSuspended.id, { approvalStatus: "suspended" });
    createdAdvisorIds.push(advisorSuspended.id);

    // 5. Advisor Rejected
    const advisorRejected = await Advisor.create({
      fullName: "Advisor Rejected",
      email: `adv_req_rej_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Rejected Advisory",
      licenseNumber: "ARN-REQ-005",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorRejected.id, { approvalStatus: "rejected" });
    createdAdvisorIds.push(advisorRejected.id);

    // 6. Advisor Unverified
    const advisorUnverified = await Advisor.create({
      fullName: "Advisor Unverified",
      email: `adv_req_unver_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Unverified Advisory",
      licenseNumber: "ARN-REQ-006",
      approvalStatus: "approved",
      isEmailVerified: false,
    });
    await Advisor.updateApprovalStatus(advisorUnverified.id, { approvalStatus: "approved" });
    createdAdvisorIds.push(advisorUnverified.id);

    // Target User 1: Normal existing user without an advisor
    const user1 = await User.create({
      fullName: "Ananya Sharma",
      email: `user_req_1_${Date.now()}@client.test`,
      password: "ClientPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(user1.id);

    // Target User 2: Existing user with an ACTIVE advisor
    const user2 = await User.create({
      fullName: "Vikram Malhotra",
      email: `user_req_2_${Date.now()}@client.test`,
      password: "ClientPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(user2.id);

    const relUser2Active = await AdvisorRelationship.create({
      advisorId: advisorB.id,
      userId: user2.id,
      clientEmail: user2.email,
      status: "active",
      initiatedBy: "advisor",
    });
    createdRelationshipIds.push(relUser2Active.id);

    // Target User 3: Existing user with a HISTORICAL REJECTED relationship
    const user3 = await User.create({
      fullName: "Rohan Das",
      email: `user_req_3_${Date.now()}@client.test`,
      password: "ClientPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(user3.id);

    const relUser3Rejected = await AdvisorRelationship.create({
      advisorId: advisorA.id,
      userId: user3.id,
      clientEmail: user3.email,
      status: "rejected",
      initiatedBy: "advisor",
    });
    createdRelationshipIds.push(relUser3Rejected.id);

    // Target User 4: User for concurrent race condition tests
    const userConcurrent = await User.create({
      fullName: "Concurrent User",
      email: `user_req_conc_${Date.now()}@client.test`,
      password: "ClientPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(userConcurrent.id);

    // Generate JWT Tokens
    const tokenAdvisorA       = signToken(buildAdvisorPayload(advisorA));
    const tokenAdvisorB       = signToken(buildAdvisorPayload(advisorB));
    const tokenAdvisorPending = signToken(buildAdvisorPayload(advisorPending));
    const tokenAdvisorSusp    = signToken(buildAdvisorPayload(advisorSuspended));
    const tokenAdvisorRej     = signToken(buildAdvisorPayload(advisorRejected));
    const tokenAdvisorUnver   = signToken(buildAdvisorPayload(advisorUnverified));
    const tokenUser1          = signToken(buildPayload(user1));
    const tokenAdmin          = signToken({ id: "admin-uuid-test", email: "admin@sf.test", role: "admin" });

    console.log("✓ Fixtures created successfully.");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 1: CORE CONNECTION REQUEST & DATABASE INTEGRITY
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 1: CORE CONNECTION REQUEST & DATABASE INTEGRITY ───");

    console.log("[Test 1, 2, 3, 4, 5, 16, 17] Approved advisor creates connection request for existing user");
    const tReqRes = await fetch(`${baseUrl}/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_advisor_token=${tokenAdvisorA}`,
      },
      body: JSON.stringify({
        userEmail: user1.email,
        notes: "Let's review your retirement roadmap and tax savings.",
      }),
    });
    const tReqData = await tReqRes.json();
    assert(tReqRes.status === 201, "Connection request returns HTTP 201 Created");
    assert(tReqData.success === true, "Response success is true");
    assert(tReqData.data.userId === user1.id, "Returned userId matches target user");
    assert(tReqData.data.status === "pending_user_acceptance", "Returned status is 'pending_user_acceptance'");
    assert(tReqData.data.relationshipId !== undefined, "Returned data contains relationshipId");
    createdRelationshipIds.push(tReqData.data.relationshipId);

    // Database verification
    const dbRel = await db.query("SELECT * FROM advisor_client_relationships WHERE id = $1", [tReqData.data.relationshipId]);
    const rowRel = dbRel.rows[0];
    assert(rowRel !== undefined, "Relationship record created in database");
    assert(rowRel.status === "pending_user_acceptance", "Database status is strictly 'pending_user_acceptance'");
    assert(rowRel.user_id === user1.id, "Database user_id is set to existing target user");
    assert(rowRel.advisor_id === advisorA.id, "Database advisor_id is strictly authenticated req.advisor.id");
    assert(rowRel.client_email === user1.email, "Database client_email matches target user");
    assert(rowRel.notes === "Let's review your retirement roadmap and tax savings.", "Notes persisted correctly");
    assert(rowRel.invitation_token_hash === null, "invitation_token_hash is strictly NULL (no token generated)");
    assert(rowRel.invitation_expires_at === null, "invitation_expires_at is strictly NULL");

    // Test 29: Response payload sanitization
    console.log("[Test 29] Response payload sanitization");
    const resJson = JSON.stringify(tReqData);
    assert(!resJson.includes("rawToken"), "Response does NOT contain rawToken");
    assert(!resJson.includes("invitation_token_hash"), "Response does NOT contain token hash");
    assert(!resJson.includes("password"), "Response does NOT contain password");
    assert(!resJson.includes("jwt"), "Response does NOT contain jwt");
    assert(!resJson.includes("otp"), "Response does NOT contain otp");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 2: BUSINESS RULES, CONFLICTS & DUPLICATES
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 2: BUSINESS RULES, CONFLICTS & DUPLICATES ───");

    // Test 11: Duplicate pending request
    console.log("[Test 11] Duplicate pending request returns 409 Conflict");
    const tDupRes = await fetch(`${baseUrl}/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_advisor_token=${tokenAdvisorA}`,
      },
      body: JSON.stringify({
        userEmail: user1.email,
        notes: "Trying duplicate request",
      }),
    });
    const tDupData = await tDupRes.json();
    assert(tDupRes.status === 409, "Duplicate request returns HTTP 409 Conflict");
    assert((tDupData.errors?.code || tDupData.code) === "REQUEST_ALREADY_PENDING", "Error code is REQUEST_ALREADY_PENDING");

    // Test 10: Target user already has an active advisor
    console.log("[Test 10] Target user already has an active advisor");
    const tHasAdvRes = await fetch(`${baseUrl}/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_advisor_token=${tokenAdvisorA}`,
      },
      body: JSON.stringify({
        userEmail: user2.email,
        notes: "Requesting user with existing active advisor",
      }),
    });
    const tHasAdvData = await tHasAdvRes.json();
    assert(tHasAdvRes.status === 409, "Active client returns HTTP 409 Conflict");
    assert((tHasAdvData.errors?.code || tHasAdvData.code) === "USER_ALREADY_HAS_ADVISOR", "Error code is USER_ALREADY_HAS_ADVISOR");

    // Test 9: Self-request rejection
    console.log("[Test 9] Self-request rejection");
    const tSelfRes = await fetch(`${baseUrl}/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_advisor_token=${tokenAdvisorA}`,
      },
      body: JSON.stringify({
        userEmail: advisorA.email,
        notes: "Requesting myself",
      }),
    });
    const tSelfData = await tSelfRes.json();
    assert(tSelfRes.status === 422, "Self-request returns HTTP 422");
    assert((tSelfData.errors?.code || tSelfData.code) === "SELF_REQUEST_FORBIDDEN", "Error code is SELF_REQUEST_FORBIDDEN");

    // Test 8: Nonexistent user
    console.log("[Test 8] Nonexistent target user returns 404");
    const tNonExistentRes = await fetch(`${baseUrl}/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_advisor_token=${tokenAdvisorA}`,
      },
      body: JSON.stringify({
        userEmail: "does_not_exist_user_999@randomdomain.test",
      }),
    });
    const tNonExistentData = await tNonExistentRes.json();
    assert(tNonExistentRes.status === 404, "Nonexistent user returns HTTP 404 Not Found");
    assert((tNonExistentData.errors?.code || tNonExistentData.code) === "USER_NOT_FOUND", "Error code is USER_NOT_FOUND");

    // Test 12: Historical rejected relationship allows a new pending row (does not revive historical row)
    console.log("[Test 12] Historical rejected relationship handling");
    const tRejectedHistRes = await fetch(`${baseUrl}/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_advisor_token=${tokenAdvisorA}`,
      },
      body: JSON.stringify({
        userEmail: user3.email,
        notes: "New request after previous rejection",
      }),
    });
    const tRejectedHistData = await tRejectedHistRes.json();
    assert(tRejectedHistRes.status === 201, "New request after rejection returns HTTP 201 Created");
    assert(tRejectedHistData.data.relationshipId !== relUser3Rejected.id, "Creates a NEW relationship row (does not mutate historical row)");
    createdRelationshipIds.push(tRejectedHistData.data.relationshipId);

    // Verify historical row remains 'rejected'
    const dbOldRow = await db.query("SELECT * FROM advisor_client_relationships WHERE id = $1", [relUser3Rejected.id]);
    assert(dbOldRow.rows[0].status === "rejected", "Historical record remains strictly 'rejected'");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 3: IDENTITY SPOOFING & AUTHORIZATION HARDENING
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 3: IDENTITY SPOOFING & AUTHORIZATION HARDENING ───");

    // Test 6 & 7: advisorId parameter spoofing in body & query
    console.log("[Test 6, 7] advisorId parameter spoofing ignored");
    const userSpoofTarget = await User.create({
      fullName: "Spoof Target User",
      email: `spooftarget_${Date.now()}@client.test`,
      password: "ClientPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(userSpoofTarget.id);

    const tSpoofRes = await fetch(`${baseUrl}/requests?advisorId=${advisorB.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_advisor_token=${tokenAdvisorA}`,
      },
      body: JSON.stringify({
        userEmail: userSpoofTarget.email,
        advisorId: advisorB.id,
      }),
    });
    const tSpoofData = await tSpoofRes.json();
    assert(tSpoofRes.status === 201, "Request created under authenticated session");
    createdRelationshipIds.push(tSpoofData.data.relationshipId);

    const dbSpoofCheck = await db.query("SELECT * FROM advisor_client_relationships WHERE id = $1", [tSpoofData.data.relationshipId]);
    assert(dbSpoofCheck.rows[0].advisor_id === advisorA.id, "advisor_id strictly belongs to authenticated Advisor A (not spoofed Advisor B)");

    // Test 18, 19, 20, 21: Advisor status gates
    console.log("[Test 18] Pending advisor denied");
    const tPendRes = await fetch(`${baseUrl}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `sf_advisor_token=${tokenAdvisorPending}` },
      body: JSON.stringify({ userEmail: user1.email }),
    });
    assert(tPendRes.status === 403, "Pending advisor returns HTTP 403");

    console.log("[Test 19] Rejected advisor denied");
    const tRejRes = await fetch(`${baseUrl}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `sf_advisor_token=${tokenAdvisorRej}` },
      body: JSON.stringify({ userEmail: user1.email }),
    });
    assert(tRejRes.status === 403, "Rejected advisor returns HTTP 403");

    console.log("[Test 20] Suspended advisor denied");
    const tSuspRes = await fetch(`${baseUrl}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `sf_advisor_token=${tokenAdvisorSusp}` },
      body: JSON.stringify({ userEmail: user1.email }),
    });
    assert(tSuspRes.status === 403, "Suspended advisor returns HTTP 403");

    console.log("[Test 21] Unverified advisor denied");
    const tUnverRes = await fetch(`${baseUrl}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `sf_advisor_token=${tokenAdvisorUnver}` },
      body: JSON.stringify({ userEmail: user1.email }),
    });
    assert(tUnverRes.status === 403, "Unverified advisor returns HTTP 403");

    console.log("[Test 22] Missing advisor session returns 401");
    const tNoAuthRes = await fetch(`${baseUrl}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEmail: user1.email }),
    });
    assert(tNoAuthRes.status === 401, "Missing session returns HTTP 401");

    console.log("[Test 23] User session denied on advisor requests endpoint");
    const tUserSessRes = await fetch(`${baseUrl}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `sf_token=${tokenUser1}` },
      body: JSON.stringify({ userEmail: user1.email }),
    });
    assert(tUserSessRes.status === 401, "User session denied on advisor route");

    console.log("[Test 24] Admin session denied on advisor requests endpoint");
    const tAdminSessRes = await fetch(`${baseUrl}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `sf_admin_token=${tokenAdmin}` },
      body: JSON.stringify({ userEmail: user1.email }),
    });
    assert(tAdminSessRes.status === 401, "Admin session denied on advisor route");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 4: CONCURRENT REQUESTS & AUDIT LOGGING
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 4: CONCURRENT REQUESTS & AUDIT LOGGING ───");

    // Test 28: Concurrent duplicate requests
    console.log("[Test 28] Concurrent duplicate requests from same advisor");
    const [raceRes1, raceRes2] = await Promise.all([
      fetch(`${baseUrl}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `sf_advisor_token=${tokenAdvisorA}` },
        body: JSON.stringify({ userEmail: userConcurrent.email }),
      }),
      fetch(`${baseUrl}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `sf_advisor_token=${tokenAdvisorA}` },
        body: JSON.stringify({ userEmail: userConcurrent.email }),
      }),
    ]);

    const statuses = [raceRes1.status, raceRes2.status];
    assert(statuses.includes(201), "At least one concurrent request returns HTTP 201 Created");
    assert(statuses.includes(409), "The duplicate concurrent request returns HTTP 409 Conflict");
    assert(statuses.filter((s) => s === 201).length === 1, "Exactly ONE request creates a relationship row");

    const data1 = await raceRes1.json();
    const data2 = await raceRes2.json();
    const createdId = data1.data?.relationshipId || data2.data?.relationshipId;
    if (createdId) createdRelationshipIds.push(createdId);

    // Test 25 & 26: Audit event ADVISOR_CLIENT_CONNECTION_REQUESTED
    console.log("[Test 25, 26] Audit event ADVISOR_CLIENT_CONNECTION_REQUESTED");
    await new Promise((r) => setTimeout(r, 200));
    const auditRes = await db.query(
      "SELECT * FROM audit_logs WHERE actor_id = $1 AND action = 'ADVISOR_CLIENT_CONNECTION_REQUESTED' ORDER BY created_at DESC LIMIT 1",
      [advisorA.id]
    );
    const auditRow = auditRes.rows[0];
    assert(auditRow !== undefined, "Audit log record created");
    assert(auditRow.action === "ADVISOR_CLIENT_CONNECTION_REQUESTED", "Action is ADVISOR_CLIENT_CONNECTION_REQUESTED");
    assert(auditRow.actor_type === "advisor", "actor_type is 'advisor'");
    assert(auditRow.resource_type === "advisor_client_relationship", "resource_type is 'advisor_client_relationship'");

    const auditJson = JSON.stringify(auditRow.details);
    assert(!auditJson.includes("password"), "Audit details does NOT contain password");
    assert(!auditJson.includes("token"), "Audit details does NOT contain token");
    assert(!auditJson.includes("hash"), "Audit details does NOT contain hash");

  } finally {
    // Teardown
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
      await db.query(`DELETE FROM audit_logs WHERE actor_id = ANY($1::uuid[])`, [createdUserIds]);
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
