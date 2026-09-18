// backend/services/tests/advisorClaimInvite.test.js
// ── Run: node services/tests/advisorClaimInvite.test.js ───────────────────────
// Phase 6.2: User Claims Advisor Invitation Test Suite (POST /api/user/advisor/claim-invite)

process.env.NODE_ENV = "test";

const http         = require("http");
const express      = require("express");
const cookieParser = require("cookie-parser");
const crypto       = require("crypto");
const db           = require("../../config/db");
const User         = require("../../models/User");
const Advisor      = require("../../models/Advisor");
const AdvisorRelationship = require("../../models/AdvisorRelationship");
const { signToken, buildPayload, buildAdvisorPayload } = require("../../utils/jwt");
const userRoutes   = require("../../routes/userRoutes");
const advisorRoutes = require("../../routes/advisorRoutes");

async function runTests() {
  console.log("\n==================================================================");
  console.log("  PHASE 6.2 — USER CLAIMS ADVISOR INVITATION TEST SUITE           ");
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
  app.use("/api/user", userRoutes);
  app.use("/api/advisor", advisorRoutes);

  // Start in-memory HTTP server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/user`;

  const createdUserIds = [];
  const createdAdvisorIds = [];
  const createdRelationshipIds = [];

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // FIXTURE SETUP
    // ══════════════════════════════════════════════════════════════════════════
    console.log("─── CREATING TEST FIXTURES ───");

    // Advisor A (Approved, Verified)
    const advisorA = await Advisor.create({
      fullName: "Advisor Alpha",
      email: `adv_claim_a_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Alpha Capital Advisory",
      licenseNumber: "ARN-CLM-901",
      approvalStatus: "approved",
      isEmailVerified: true,
      specializations: ["Wealth Management", "Retirement Planning"],
    });
    await Advisor.updateApprovalStatus(advisorA.id, { approvalStatus: "approved", approvedAt: new Date() });
    createdAdvisorIds.push(advisorA.id);

    // Advisor B (Suspended)
    const advisorSuspended = await Advisor.create({
      fullName: "Advisor Suspended",
      email: `adv_claim_susp_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Suspended Advisors",
      licenseNumber: "ARN-CLM-902",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorSuspended.id, { approvalStatus: "suspended" });
    createdAdvisorIds.push(advisorSuspended.id);

    // Advisor C (Advisor for pre-existing active relationship)
    const advisorC = await Advisor.create({
      fullName: "Advisor Gamma",
      email: `adv_claim_c_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Gamma Advisory",
      licenseNumber: "ARN-CLM-903",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorC.id, { approvalStatus: "approved", approvedAt: new Date() });
    createdAdvisorIds.push(advisorC.id);

    // Prospective Target User: Alice
    const userAliceEmail = `alice_${Date.now()}@client.test`;
    const userAlice = await User.create({
      fullName: "Alice Sharma",
      email: userAliceEmail,
      password: "ClientPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(userAlice.id);

    // Unrelated User: Bob (Different email)
    const userBob = await User.create({
      fullName: "Bob Verma",
      email: `bob_${Date.now()}@other.test`,
      password: "ClientPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(userBob.id);

    // User Charlie: Already has an active advisor relationship
    const userCharlie = await User.create({
      fullName: "Charlie Singh",
      email: `charlie_${Date.now()}@client.test`,
      password: "ClientPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(userCharlie.id);

    const charlieRel = await AdvisorRelationship.create({
      advisorId: advisorC.id,
      userId: userCharlie.id,
      clientEmail: userCharlie.email,
      status: "active",
      initiatedBy: "advisor",
    });
    createdRelationshipIds.push(charlieRel.id);

    // Raw Tokens & Hashed Database Records
    // 1. Valid Invitation for Alice from Advisor A
    const rawTokenAlice = crypto.randomBytes(32).toString("hex");
    const hashAlice = crypto.createHash("sha256").update(rawTokenAlice).digest("hex");
    const relAlice = await AdvisorRelationship.create({
      advisorId: advisorA.id,
      userId: null,
      clientEmail: userAliceEmail,
      status: "invited",
      initiatedBy: "advisor",
      invitationTokenHash: hashAlice,
      invitationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: "Invitation for Alice",
    });
    createdRelationshipIds.push(relAlice.id);

    // 2. Expired Invitation for Alice
    const rawTokenExpired = crypto.randomBytes(32).toString("hex");
    const hashExpired = crypto.createHash("sha256").update(rawTokenExpired).digest("hex");
    const relExpired = await AdvisorRelationship.create({
      advisorId: advisorA.id,
      userId: null,
      clientEmail: userAliceEmail,
      status: "invited",
      initiatedBy: "advisor",
      invitationTokenHash: hashExpired,
      invitationExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
    });
    createdRelationshipIds.push(relExpired.id);

    // 3. Invitation from Suspended Advisor
    const userForSuspended = await User.create({
      fullName: "Suspended Test User",
      email: `suspended_target_${Date.now()}@client.test`,
      password: "ClientPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(userForSuspended.id);

    const tokenForSuspended = signToken(buildPayload(userForSuspended));

    const rawTokenSuspended = crypto.randomBytes(32).toString("hex");
    const hashSuspended = crypto.createHash("sha256").update(rawTokenSuspended).digest("hex");
    const relSuspended = await AdvisorRelationship.create({
      advisorId: advisorSuspended.id,
      userId: null,
      clientEmail: userForSuspended.email,
      status: "invited",
      initiatedBy: "advisor",
      invitationTokenHash: hashSuspended,
      invitationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    createdRelationshipIds.push(relSuspended.id);

    // 4. Invitation for Charlie (who already has an active advisor)
    const rawTokenCharlie = crypto.randomBytes(32).toString("hex");
    const hashCharlie = crypto.createHash("sha256").update(rawTokenCharlie).digest("hex");
    const relCharlie = await AdvisorRelationship.create({
      advisorId: advisorA.id,
      userId: null,
      clientEmail: userCharlie.email,
      status: "invited",
      initiatedBy: "advisor",
      invitationTokenHash: hashCharlie,
      invitationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    createdRelationshipIds.push(relCharlie.id);

    // 5. Invitation for concurrent race-condition testing
    const userConcurrentEmail = `concurrent_${Date.now()}@client.test`;
    const userConcurrent = await User.create({
      fullName: "Concurrent User",
      email: userConcurrentEmail,
      password: "ClientPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(userConcurrent.id);

    const rawTokenConcurrent = crypto.randomBytes(32).toString("hex");
    const hashConcurrent = crypto.createHash("sha256").update(rawTokenConcurrent).digest("hex");
    const relConcurrent = await AdvisorRelationship.create({
      advisorId: advisorA.id,
      userId: null,
      clientEmail: userConcurrentEmail,
      status: "invited",
      initiatedBy: "advisor",
      invitationTokenHash: hashConcurrent,
      invitationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    createdRelationshipIds.push(relConcurrent.id);

    // JWT Session Tokens
    const tokenAlice      = signToken(buildPayload(userAlice));
    const tokenBob        = signToken(buildPayload(userBob));
    const tokenCharlie    = signToken(buildPayload(userCharlie));
    const tokenConcurrent = signToken(buildPayload(userConcurrent));

    console.log("✓ Fixtures created successfully.");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 1: SPECIAL SECURITY TEST (CROSS-USER ISOLATION & REUSE PREVENTION)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 1: SPECIAL SECURITY TEST ───");

    // Step 1: User Bob tries to claim Alice's invitation token
    console.log("[Test 7, 8] User Bob attempts to claim Alice's invitation token");
    const tWrongUserRes = await fetch(`${baseUrl}/advisor/claim-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_token=${tokenBob}`,
      },
      body: JSON.stringify({ token: rawTokenAlice }),
    });
    const tWrongUserData = await tWrongUserRes.json();
    assert(tWrongUserRes.status === 403, "Wrong user is denied with HTTP 403 Forbidden");
    assert((tWrongUserData.errors?.code || tWrongUserData.code) === "EMAIL_MISMATCH", "Error code is EMAIL_MISMATCH");

    // Step 2: Target User Alice claims her invitation token
    console.log("[Test 1, 2, 3, 4, 5] Target User Alice successfully claims invitation");
    const tAliceRes = await fetch(`${baseUrl}/advisor/claim-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_token=${tokenAlice}`,
      },
      body: JSON.stringify({ token: rawTokenAlice }),
    });
    const tAliceData = await tAliceRes.json();
    assert(tAliceRes.status === 200, "Valid user claim returns HTTP 200 OK");
    assert(tAliceData.success === true, "Response success is true");
    assert(tAliceData.data.relationshipId === relAlice.id, "Returned relationshipId matches");
    assert(tAliceData.data.status === "active", "Returned status is 'active'");
    assert(tAliceData.data.advisor.id === advisorA.id, "Returned advisor ID matches");
    assert(tAliceData.data.advisor.fullName === "Advisor Alpha", "Returned advisor name matches");
    assert(tAliceData.data.advisor.firmName === "Alpha Capital Advisory", "Returned firm name matches");

    // Database verification: status is 'active', user_id is Alice, token hash is cleared (NULL), accepted_at set
    const dbAliceRel = await db.query("SELECT * FROM advisor_client_relationships WHERE id = $1", [relAlice.id]);
    const aliceRow = dbAliceRel.rows[0];
    assert(aliceRow.status === "active", "Database status transitioned to 'active'");
    assert(aliceRow.user_id === userAlice.id, "Database user_id set to authenticated Alice");
    assert(aliceRow.invitation_token_hash === null, "Database invitation_token_hash is cleared (NULL)");
    assert(aliceRow.accepted_at !== null, "Database accepted_at timestamp is populated");

    // Step 3: Attempt to reuse the SAME raw token
    console.log("[Test 6] Attempting to reuse already claimed raw token");
    const tReuseRes = await fetch(`${baseUrl}/advisor/claim-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_token=${tokenAlice}`,
      },
      body: JSON.stringify({ token: rawTokenAlice }),
    });
    const tReuseData = await tReuseRes.json();
    assert(tReuseRes.status === 400, "Reused token returns HTTP 400 Bad Request");
    assert((tReuseData.errors?.code || tReuseData.code) === "INVITE_INVALID", "Error code is INVITE_INVALID");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 2: INPUT VALIDATION & TOKEN ERROR HANDLING
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 2: INPUT VALIDATION & TOKEN ERROR HANDLING ───");

    // Test 9: Unauthenticated request
    console.log("[Test 9] Unauthenticated request denied");
    const tNoAuthRes = await fetch(`${baseUrl}/advisor/claim-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "some-token" }),
    });
    assert(tNoAuthRes.status === 401, "Unauthenticated request returns HTTP 401");

    // Test 10: Missing token
    console.log("[Test 10] Missing token rejected");
    const tMissingTokenRes = await fetch(`${baseUrl}/advisor/claim-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_token=${tokenAlice}`,
      },
      body: JSON.stringify({}),
    });
    assert(tMissingTokenRes.status === 422, "Missing token returns HTTP 422 Validation Error");

    // Test 11: Nonexistent / Invalid token
    console.log("[Test 11] Nonexistent token returns safe error");
    const tInvalidTokenRes = await fetch(`${baseUrl}/advisor/claim-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_token=${tokenAlice}`,
      },
      body: JSON.stringify({ token: "nonexistent_token_1234567890abcdef1234567890abcdef" }),
    });
    assert(tInvalidTokenRes.status === 400, "Invalid token returns HTTP 400");
    const tInvalidTokenData = await tInvalidTokenRes.json();
    assert((tInvalidTokenData.errors?.code || tInvalidTokenData.code) === "INVITE_INVALID", "Error code is INVITE_INVALID");

    // Test 12: Expired token
    console.log("[Test 12] Expired token returns safe error");
    const tExpiredRes = await fetch(`${baseUrl}/advisor/claim-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_token=${tokenAlice}`,
      },
      body: JSON.stringify({ token: rawTokenExpired }),
    });
    assert(tExpiredRes.status === 400, "Expired token returns HTTP 400");
    const tExpiredData = await tExpiredRes.json();
    assert((tExpiredData.errors?.code || tExpiredData.code) === "INVITE_INVALID", "Error code is INVITE_INVALID");

    // Test 14: User already has an active advisor
    console.log("[Test 14] User already has active advisor");
    const tHasAdvisorRes = await fetch(`${baseUrl}/advisor/claim-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_token=${tokenCharlie}`,
      },
      body: JSON.stringify({ token: rawTokenCharlie }),
    });
    const tHasAdvisorData = await tHasAdvisorRes.json();
    assert(tHasAdvisorRes.status === 409, "User with active advisor returns HTTP 409 Conflict");
    assert((tHasAdvisorData.errors?.code || tHasAdvisorData.code) === "USER_ALREADY_HAS_ADVISOR", "Error code is USER_ALREADY_HAS_ADVISOR");

    // Test 18: Suspended advisor invitation
    console.log("[Test 18] Suspended advisor invitation denied");
    const tSuspRes = await fetch(`${baseUrl}/advisor/claim-invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_token=${tokenForSuspended}`,
      },
      body: JSON.stringify({ token: rawTokenSuspended }),
    });
    const tSuspData = await tSuspRes.json();
    assert(tSuspRes.status === 403, "Suspended advisor invitation returns HTTP 403");
    assert((tSuspData.errors?.code || tSuspData.code) === "ADVISOR_NOT_ELIGIBLE", "Error code is ADVISOR_NOT_ELIGIBLE");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 3: IDENTITY SPOOFING RESISTANCE & RESPONSE SANITIZATION
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 3: IDENTITY SPOOFING RESISTANCE & RESPONSE SANITIZATION ───");

    // Test 15, 16, 17: Parameter spoofing resistance
    console.log("[Test 15, 16, 17] userId and advisorId spoofing resistance");
    const userSpoofTarget = await User.create({
      fullName: "Spoof Target User",
      email: `spooftarget_${Date.now()}@client.test`,
      password: "ClientPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(userSpoofTarget.id);

    const rawTokenSpoof = crypto.randomBytes(32).toString("hex");
    const hashSpoof = crypto.createHash("sha256").update(rawTokenSpoof).digest("hex");
    const relSpoof = await AdvisorRelationship.create({
      advisorId: advisorA.id,
      userId: null,
      clientEmail: userSpoofTarget.email,
      status: "invited",
      initiatedBy: "advisor",
      invitationTokenHash: hashSpoof,
      invitationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    createdRelationshipIds.push(relSpoof.id);

    const tokenSpoofTarget = signToken(buildPayload(userSpoofTarget));

    const tSpoofRes = await fetch(`${baseUrl}/advisor/claim-invite?userId=${userBob.id}&advisorId=${advisorC.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_token=${tokenSpoofTarget}`,
      },
      body: JSON.stringify({
        token: rawTokenSpoof,
        userId: userBob.id,
        advisorId: advisorC.id,
      }),
    });
    assert(tSpoofRes.status === 200, "Claim succeeds strictly for authenticated session");

    const dbSpoofCheck = await db.query("SELECT * FROM advisor_client_relationships WHERE id = $1", [relSpoof.id]);
    assert(dbSpoofCheck.rows[0].user_id === userSpoofTarget.id, "user_id is strictly authenticated user (not spoofed Bob)");
    assert(dbSpoofCheck.rows[0].advisor_id === advisorA.id, "advisor_id is strictly original Advisor A (not spoofed Advisor C)");

    // Test 23: Response sanitization
    console.log("[Test 23] Response sanitization verification");
    const jsonAlice = JSON.stringify(tAliceData);
    assert(!jsonAlice.includes("rawToken"), "Response does NOT contain rawToken");
    assert(!jsonAlice.includes("invitationTokenHash"), "Response does NOT contain invitationTokenHash");
    assert(!jsonAlice.includes("token_hash"), "Response does NOT contain token_hash");
    assert(!jsonAlice.includes("password"), "Response does NOT contain password");
    assert(!jsonAlice.includes("jwt"), "Response does NOT contain jwt");
    assert(!jsonAlice.includes("otp"), "Response does NOT contain otp");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 4: CONCURRENT DOUBLE-CLAIM & AUDIT LOGGING
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 4: CONCURRENT DOUBLE-CLAIM & AUDIT LOGGING ───");

    // Test 20: Concurrent double-claim race condition
    console.log("[Test 20] Concurrent double-claim execution");
    const [raceRes1, raceRes2] = await Promise.all([
      fetch(`${baseUrl}/advisor/claim-invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `sf_token=${tokenConcurrent}`,
        },
        body: JSON.stringify({ token: rawTokenConcurrent }),
      }),
      fetch(`${baseUrl}/advisor/claim-invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `sf_token=${tokenConcurrent}`,
        },
        body: JSON.stringify({ token: rawTokenConcurrent }),
      }),
    ]);

    const statuses = [raceRes1.status, raceRes2.status];
    assert(statuses.includes(200), "At least one concurrent request returns HTTP 200 OK");
    assert(statuses.includes(400) || statuses.includes(409), "The other concurrent request fails safely");
    assert(statuses.filter((s) => s === 200).length === 1, "Exactly ONE concurrent claim succeeds");

    // Test 21 & 22: Audit logging
    console.log("[Test 21, 22] Audit event ADVISOR_CLIENT_INVITATION_CLAIMED");
    await new Promise((r) => setTimeout(r, 200));
    const auditRes = await db.query(
      "SELECT * FROM audit_logs WHERE actor_id = $1 AND action = 'ADVISOR_CLIENT_INVITATION_CLAIMED' ORDER BY created_at DESC LIMIT 1",
      [userAlice.id]
    );
    const auditRow = auditRes.rows[0];
    assert(auditRow !== undefined, "Audit log created for invitation claim");
    assert(auditRow.action === "ADVISOR_CLIENT_INVITATION_CLAIMED", "Audit action is ADVISOR_CLIENT_INVITATION_CLAIMED");
    assert(auditRow.actor_type === "user", "Audit actor_type is 'user'");

    const auditJson = JSON.stringify(auditRow.details);
    assert(!auditJson.includes("rawToken"), "Audit details does NOT contain raw token");
    assert(!auditJson.includes("invitationTokenHash"), "Audit details does NOT contain token hash");
    assert(!auditJson.includes("password"), "Audit details does NOT contain password");

    // Test 24: User active relationship verification
    console.log("[Test 24] User active advisor relationship query verification");
    const activeAdvisorForAlice = await AdvisorRelationship.findActiveForUser(userAlice.id);
    assert(activeAdvisorForAlice !== null, "Alice now has an active advisor record");
    assert(activeAdvisorForAlice.advisorId === advisorA.id, "Alice's active advisor is Advisor A");
    assert(activeAdvisorForAlice.advisor.fullName === "Advisor Alpha", "Advisor details attached correctly");

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
