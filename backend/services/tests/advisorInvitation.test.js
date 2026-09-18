// backend/services/tests/advisorInvitation.test.js
// ── Run: node services/tests/advisorInvitation.test.js ────────────────────────
// Phase 6.1: Advisor Client Invitation Test Suite (POST /api/advisor/invitations)

process.env.NODE_ENV = "test";

const http         = require("http");
const express      = require("express");
const cookieParser = require("cookie-parser");
const crypto       = require("crypto");
const rateLimit    = require("express-rate-limit");
const db           = require("../../config/db");
const User         = require("../../models/User");
const Admin        = require("../../models/Admin");
const Advisor      = require("../../models/Advisor");
const AdvisorRelationship = require("../../models/AdvisorRelationship");
const AuditLog     = require("../../models/AuditLog");
const { signToken, buildPayload, buildAdvisorPayload } = require("../../utils/jwt");
const advisorRoutes = require("../../routes/advisorRoutes");

async function runTests() {
  console.log("\n==================================================================");
  console.log("  PHASE 6.1 — ADVISOR CLIENT INVITATION TEST SUITE               ");
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

  // Setup express test app mounting actual advisorRoutes
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/advisor", advisorRoutes);

  // Start in-memory HTTP server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/advisor`;

  const createdUserIds = [];
  const createdAdvisorIds = [];
  const createdRelationshipIds = [];

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // FIXTURE SETUP
    // ══════════════════════════════════════════════════════════════════════════
    console.log("─── CREATING TEST FIXTURES ───");

    // Advisor A (Alpha - Approved, Verified)
    const advisorA = await Advisor.create({
      fullName: "Advisor Alpha",
      email: `adv_inv_a_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Alpha Wealth Partners",
      licenseNumber: "ARN-INV-801",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorA.id, { approvalStatus: "approved", approvedAt: new Date() });
    createdAdvisorIds.push(advisorA.id);

    // Advisor B (Beta - Approved, Verified)
    const advisorB = await Advisor.create({
      fullName: "Advisor Beta",
      email: `adv_inv_b_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Beta Capital",
      licenseNumber: "ARN-INV-802",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorB.id, { approvalStatus: "approved", approvedAt: new Date() });
    createdAdvisorIds.push(advisorB.id);

    // Advisor Lifecycle States
    const advisorPending = await Advisor.create({
      fullName: "Advisor Pending",
      email: `adv_inv_pend_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Pending Wealth",
      licenseNumber: "ARN-INV-803",
      approvalStatus: "pending",
      isEmailVerified: true,
    });
    createdAdvisorIds.push(advisorPending.id);

    const advisorSuspended = await Advisor.create({
      fullName: "Advisor Suspended",
      email: `adv_inv_susp_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Suspended Wealth",
      licenseNumber: "ARN-INV-804",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorSuspended.id, { approvalStatus: "suspended" });
    createdAdvisorIds.push(advisorSuspended.id);

    const advisorRejected = await Advisor.create({
      fullName: "Advisor Rejected",
      email: `adv_inv_rej_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Rejected Wealth",
      licenseNumber: "ARN-INV-805",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorRejected.id, { approvalStatus: "rejected" });
    createdAdvisorIds.push(advisorRejected.id);

    const advisorUnverified = await Advisor.create({
      fullName: "Advisor Unverified",
      email: `adv_inv_unver_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Unverified Wealth",
      licenseNumber: "ARN-INV-806",
      approvalStatus: "approved",
      isEmailVerified: false,
    });
    createdAdvisorIds.push(advisorUnverified.id);

    // Existing User 1: Has an ACTIVE advisor relationship with Advisor B
    const userWithActiveAdvisor = await User.create({
      fullName: "Active User",
      email: `active_client_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(userWithActiveAdvisor.id);

    const activeRel = await AdvisorRelationship.create({
      advisorId: advisorB.id,
      userId: userWithActiveAdvisor.id,
      clientEmail: userWithActiveAdvisor.email,
      status: "active",
      initiatedBy: "advisor",
    });
    createdRelationshipIds.push(activeRel.id);

    // Existing User 2: Has NO advisor relationship (Existing SmartFinance account)
    const userWithoutAdvisor = await User.create({
      fullName: "Solo User",
      email: `solo_user_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(userWithoutAdvisor.id);

    // Tokens
    const tokenAdvisorA          = signToken(buildAdvisorPayload(advisorA));
    const tokenAdvisorB          = signToken(buildAdvisorPayload(advisorB));
    const tokenAdvisorPending    = signToken(buildAdvisorPayload(advisorPending));
    const tokenAdvisorSuspended  = signToken(buildAdvisorPayload(advisorSuspended));
    const tokenAdvisorRejected   = signToken(buildAdvisorPayload(advisorRejected));
    const tokenAdvisorUnverified = signToken(buildAdvisorPayload(advisorUnverified));
    const tokenUser              = signToken(buildPayload(userWithoutAdvisor));

    console.log("✓ Fixtures created successfully.");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 1: CORE INVITATION CREATION & TOKEN SECURITY
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 1: CORE INVITATION CREATION & TOKEN SECURITY ───");

    const prospectiveClientEmail = `prospect_${Date.now()}@external.test`;

    console.log("[Test 1] Approved advisor successfully sends invitation");
    const t1Res = await fetch(`${baseUrl}/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_advisor_token=${tokenAdvisorA}`,
      },
      body: JSON.stringify({
        clientEmail: `  ${prospectiveClientEmail.toUpperCase()}  `,
        clientName: "Priya Sharma",
        notes: "Prospective HNI client onboarding consultation.",
      }),
    });
    const t1Data = await t1Res.json();
    if (t1Res.status !== 201) console.log("t1Res status:", t1Res.status, t1Data);
    assert(t1Res.status === 201, "Approved advisor receives HTTP 201 Created");
    assert(t1Data.success === true, "Response success is true");
    assert(t1Data.data.relationshipId !== undefined, "Response data contains relationshipId");
    assert(t1Data.data.status === "invited", "Response data status is 'invited'");
    assert(t1Data.data.clientEmail === prospectiveClientEmail.toLowerCase(), "Email normalized to lowercase and trimmed");
    assert(t1Data.data.expiresAt !== undefined, "Response data contains expiresAt");

    const createdRelId = t1Data.data.relationshipId;
    createdRelationshipIds.push(createdRelId);

    // Verify Database Record & Token Security
    console.log("[Test 11, 12, 13, 16, 17, 20] Direct database integrity verification");
    const dbRel = await db.query("SELECT * FROM advisor_client_relationships WHERE id = $1", [createdRelId]);
    const row = dbRel.rows[0];
    assert(row !== undefined, "Relationship record found in database");
    assert(row.status === "invited", "Database status is strictly 'invited'");
    assert(row.user_id === null, "user_id is strictly NULL");
    assert(row.advisor_id === advisorA.id, "advisor_id matches req.advisor.id");
    assert(row.client_email === prospectiveClientEmail.toLowerCase(), "client_email normalized in database");
    assert(row.notes === "Prospective HNI client onboarding consultation.", "notes persisted correctly");
    assert(row.invitation_token_hash !== null, "invitation_token_hash is stored in database");
    assert(row.invitation_token_hash.length === 64, "invitation_token_hash is valid 64-char SHA-256 hex string");
    assert(row.invitation_expires_at !== null, "invitation_expires_at timestamp is stored");

    const expiryDeltaDays = (new Date(row.invitation_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    assert(expiryDeltaDays >= 6.9 && expiryDeltaDays <= 7.1, "Expiration is set to ~7 days in the future");

    // Test 18: Response does NOT contain raw token or hash
    console.log("[Test 18] Response payload sanitization");
    const t1Json = JSON.stringify(t1Data);
    assert(!t1Json.includes("rawToken"), "Response does NOT contain rawToken");
    assert(!t1Json.includes("invitationTokenHash"), "Response does NOT contain invitationTokenHash");
    assert(!t1Json.includes("token_hash"), "Response does NOT contain token_hash");
    assert(!t1Json.includes(row.invitation_token_hash), "Response does NOT leak token hash value");
    assert(!t1Json.includes("password"), "Response does NOT contain password");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 2: DUPLICATE INVITATIONS & EXISTING USER RULES
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 2: DUPLICATE INVITATIONS & EXISTING USER RULES ───");

    // Test 22: Duplicate pending invitation to same email by same advisor
    console.log("[Test 22] Duplicate active invitation from same advisor");
    const tDupRes = await fetch(`${baseUrl}/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_advisor_token=${tokenAdvisorA}`,
      },
      body: JSON.stringify({
        clientEmail: prospectiveClientEmail,
        clientName: "Priya Sharma",
      }),
    });
    const tDupData = await tDupRes.json();
    assert(tDupRes.status === 409, "Duplicate invitation returns HTTP 409 Conflict");
    assert((tDupData.errors?.code || tDupData.code) === "INVITATION_ALREADY_PENDING", "Error code is INVITATION_ALREADY_PENDING");
    assert((tDupData.errors?.data?.relationshipId || tDupData.data?.relationshipId) === createdRelId, "Returns existing relationshipId");

    // Verify count in DB is still 1
    const countCheck = await db.query("SELECT COUNT(*) FROM advisor_client_relationships WHERE advisor_id = $1 AND client_email = $2", [
      advisorA.id,
      prospectiveClientEmail.toLowerCase(),
    ]);
    assert(parseInt(countCheck.rows[0].count, 10) === 1, "Duplicate database row was NOT created");

    // Test 23: Existing user with active advisor
    console.log("[Test 23] Invite existing user who already has an active advisor");
    const tActiveUserRes = await fetch(`${baseUrl}/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_advisor_token=${tokenAdvisorA}`,
      },
      body: JSON.stringify({
        clientEmail: userWithActiveAdvisor.email,
        clientName: "Active User",
      }),
    });
    const tActiveUserData = await tActiveUserRes.json();
    assert(tActiveUserRes.status === 409, "Active client user returns HTTP 409 Conflict");
    assert((tActiveUserData.errors?.code || tActiveUserData.code) === "USER_ALREADY_HAS_ADVISOR", "Error code is USER_ALREADY_HAS_ADVISOR");

    // Test 24: Existing user without active advisor (SmartFinance user account exists)
    console.log("[Test 24] Invite existing user without active advisor -> requires request workflow");
    const tSoloUserRes = await fetch(`${baseUrl}/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_advisor_token=${tokenAdvisorA}`,
      },
      body: JSON.stringify({
        clientEmail: userWithoutAdvisor.email,
        clientName: "Solo User",
      }),
    });
    const tSoloUserData = await tSoloUserRes.json();
    assert(tSoloUserRes.status === 409, "Existing user returns HTTP 409 Conflict");
    assert((tSoloUserData.errors?.code || tSoloUserData.code) === "EXISTING_USER_REQUEST_REQUIRED", "Error code is EXISTING_USER_REQUEST_REQUIRED");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 3: INPUT VALIDATION & SPOOFING RESISTANCE
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 3: INPUT VALIDATION & SPOOFING RESISTANCE ───");

    // Test 7: Invalid client email rejected
    console.log("[Test 7] Invalid email rejected");
    const tBadEmailRes = await fetch(`${baseUrl}/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_advisor_token=${tokenAdvisorA}`,
      },
      body: JSON.stringify({
        clientEmail: "not-an-email",
      }),
    });
    assert(tBadEmailRes.status === 422, "Invalid email returns HTTP 422 Validation Error");

    // Test 9: Client name excessive length
    console.log("[Test 9] Client name exceeding length bounds");
    const tLongNameRes = await fetch(`${baseUrl}/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_advisor_token=${tokenAdvisorA}`,
      },
      body: JSON.stringify({
        clientEmail: `valid_${Date.now()}@external.test`,
        clientName: "A".repeat(300),
      }),
    });
    assert(tLongNameRes.status === 422, "Excessive client name returns HTTP 422");

    // Test 10: Notes excessive length
    console.log("[Test 10] Notes exceeding length bounds");
    const tLongNotesRes = await fetch(`${baseUrl}/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_advisor_token=${tokenAdvisorA}`,
      },
      body: JSON.stringify({
        clientEmail: `valid_${Date.now()}@external.test`,
        notes: "N".repeat(1200),
      }),
    });
    assert(tLongNotesRes.status === 422, "Excessive notes returns HTTP 422");

    // Test 14 & 15: body/query advisorId spoofing
    console.log("[Test 14 & 15] advisorId spoofing attempts");
    const spoofEmail = `spoof_target_${Date.now()}@external.test`;
    const tSpoofRes = await fetch(`${baseUrl}/invitations?advisorId=${advisorB.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_advisor_token=${tokenAdvisorA}`,
      },
      body: JSON.stringify({
        advisorId: advisorB.id,
        clientEmail: spoofEmail,
        clientName: "Spoof Target",
      }),
    });
    const tSpoofData = await tSpoofRes.json();
    assert(tSpoofRes.status === 201, "Invitation created under true session");
    createdRelationshipIds.push(tSpoofData.data.relationshipId);

    const spoofDbRel = await db.query("SELECT * FROM advisor_client_relationships WHERE id = $1", [tSpoofData.data.relationshipId]);
    assert(spoofDbRel.rows[0].advisor_id === advisorA.id, "advisor_id strictly assigned to authenticated Advisor A (not spoofed Advisor B)");

    // Test 27: Cross-advisor isolation for invitations
    console.log("[Test 27] Cross-advisor isolation on pending invitations");
    const pendingA = await AdvisorRelationship.findPendingForAdvisor(advisorA.id);
    const pendingB = await AdvisorRelationship.findPendingForAdvisor(advisorB.id);
    assert(pendingA.pending.some((p) => p.id === createdRelId), "Advisor A sees own pending invitation");
    assert(!pendingB.pending.some((p) => p.id === createdRelId), "Advisor B does NOT see Advisor A's pending invitation");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 4: SECURITY GUARDS & AUDIT LOGGING
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 4: SECURITY GUARDS & AUDIT LOGGING ───");

    // Test 2: Pending advisor denied
    console.log("[Test 2] Pending advisor denied");
    const tPendRes = await fetch(`${baseUrl}/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_advisor_token=${tokenAdvisorPending}`,
      },
      body: JSON.stringify({ clientEmail: `unauth_${Date.now()}@sf.test` }),
    });
    assert(tPendRes.status === 403, "Pending advisor returns HTTP 403");

    // Test 3: Rejected advisor denied
    console.log("[Test 3] Rejected advisor denied");
    const tRejRes = await fetch(`${baseUrl}/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_advisor_token=${tokenAdvisorRejected}`,
      },
      body: JSON.stringify({ clientEmail: `unauth_${Date.now()}@sf.test` }),
    });
    assert(tRejRes.status === 403, "Rejected advisor returns HTTP 403");

    // Test 4: Suspended advisor denied
    console.log("[Test 4] Suspended advisor denied");
    const tSuspRes = await fetch(`${baseUrl}/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_advisor_token=${tokenAdvisorSuspended}`,
      },
      body: JSON.stringify({ clientEmail: `unauth_${Date.now()}@sf.test` }),
    });
    assert(tSuspRes.status === 403, "Suspended advisor returns HTTP 403");

    // Test 5: Unverified advisor denied
    console.log("[Test 5] Unverified advisor denied");
    const tUnverRes = await fetch(`${baseUrl}/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_advisor_token=${tokenAdvisorUnverified}`,
      },
      body: JSON.stringify({ clientEmail: `unauth_${Date.now()}@sf.test` }),
    });
    assert(tUnverRes.status === 403, "Unverified advisor returns HTTP 403");

    // Test 6: Missing session denied
    console.log("[Test 6] Missing session returns HTTP 401");
    const tNoAuthRes = await fetch(`${baseUrl}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientEmail: `unauth_${Date.now()}@sf.test` }),
    });
    assert(tNoAuthRes.status === 401, "Missing session returns HTTP 401");

    // Test 25: Audit log verification
    console.log("[Test 25] Audit event ADVISOR_CLIENT_INVITED");
    // Wait brief moment for async audit logger
    await new Promise((r) => setTimeout(r, 200));
    const auditRes = await db.query(
      "SELECT * FROM audit_logs WHERE actor_id = $1 AND action = 'ADVISOR_CLIENT_INVITED' ORDER BY created_at DESC LIMIT 1",
      [advisorA.id]
    );
    const auditRow = auditRes.rows[0];
    assert(auditRow !== undefined, "Audit log record created");
    assert(auditRow.action === "ADVISOR_CLIENT_INVITED", "Audit action is ADVISOR_CLIENT_INVITED");
    assert(auditRow.actor_type === "advisor", "Audit actor_type is 'advisor'");
    assert(auditRow.resource_type === "advisor_client_relationship", "Audit resource_type is 'advisor_client_relationship'");

    // Test 19: Raw token & sensitive secrets NEVER in audit log
    console.log("[Test 19] Audit details safety");
    const auditDetailsJson = JSON.stringify(auditRow.details);
    assert(!auditDetailsJson.includes("rawToken"), "Audit details does NOT contain raw token");
    assert(!auditDetailsJson.includes("invitationTokenHash"), "Audit details does NOT contain token hash");
    assert(!auditDetailsJson.includes("password"), "Audit details does NOT contain password");

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
