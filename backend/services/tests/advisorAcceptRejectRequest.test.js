// backend/services/tests/advisorAcceptRejectRequest.test.js
// ── Run: node services/tests/advisorAcceptRejectRequest.test.js ─────────────────
// Phase 6.4: User Accepts/Rejects Advisor Connection Request Test Suite

process.env.NODE_ENV = "test";

const http         = require("http");
const express      = require("express");
const cookieParser = require("cookie-parser");
const db           = require("../../config/db");
const User         = require("../../models/User");
const Advisor      = require("../../models/Advisor");
const Admin        = require("../../models/Admin");
const AdvisorRelationship = require("../../models/AdvisorRelationship");
const AuditLog     = require("../../models/AuditLog");
const { signToken, buildPayload, buildAdvisorPayload } = require("../../utils/jwt");
const userRoutes   = require("../../routes/userRoutes");

async function runTests() {
  console.log("\n==================================================================");
  console.log("  PHASE 6.4 — USER ACCEPTS / REJECTS ADVISOR REQUEST TEST SUITE   ");
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

  // Setup express test app mounting actual userRoutes
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/user", userRoutes);

  // Start in-memory HTTP server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/user/advisor`;

  const createdAdvisorIds = [];
  const createdUserIds = [];
  const createdAdminIds = [];
  const createdRelationshipIds = [];

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // FIXTURE SETUP
    // ══════════════════════════════════════════════════════════════════════════
    console.log("─── CREATING TEST FIXTURES ───");

    // 1. Advisor A (Approved, Email Verified)
    const advisorA = await Advisor.create({
      fullName: "Advisor Alpha",
      email: `adv_p64_a_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Alpha Capital Advisory",
      licenseNumber: "ARN-64-001",
      approvalStatus: "approved",
      isEmailVerified: true,
      specializations: ["Wealth Management", "Tax Strategy"],
    });
    await Advisor.updateApprovalStatus(advisorA.id, { approvalStatus: "approved", approvedAt: new Date() });
    await db.query(`UPDATE advisors SET is_email_verified = TRUE WHERE id = $1`, [advisorA.id]);
    createdAdvisorIds.push(advisorA.id);

    // 2. Advisor B (Approved, Email Verified)
    const advisorB = await Advisor.create({
      fullName: "Advisor Beta",
      email: `adv_p64_b_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Beta Financial Partners",
      licenseNumber: "ARN-64-002",
      approvalStatus: "approved",
      isEmailVerified: true,
      specializations: ["Retirement", "Equities"],
    });
    await Advisor.updateApprovalStatus(advisorB.id, { approvalStatus: "approved", approvedAt: new Date() });
    await db.query(`UPDATE advisors SET is_email_verified = TRUE WHERE id = $1`, [advisorB.id]);
    createdAdvisorIds.push(advisorB.id);

    // 3. Advisor Suspended
    const advisorSuspended = await Advisor.create({
      fullName: "Advisor Suspended",
      email: `adv_p64_susp_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Suspended Advisory",
      licenseNumber: "ARN-64-003",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorSuspended.id, { approvalStatus: "suspended", suspensionReason: "Regulatory audit failure" });
    createdAdvisorIds.push(advisorSuspended.id);

    // 4. Advisor Unverified
    const advisorUnverified = await Advisor.create({
      fullName: "Advisor Unverified",
      email: `adv_p64_unver_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Unverified Advisory",
      licenseNumber: "ARN-64-004",
      approvalStatus: "approved",
      isEmailVerified: false,
    });
    await Advisor.updateApprovalStatus(advisorUnverified.id, { approvalStatus: "approved" });
    await db.query(`UPDATE advisors SET is_email_verified = FALSE WHERE id = $1`, [advisorUnverified.id]);
    createdAdvisorIds.push(advisorUnverified.id);

    // 5. Advisor Rejected
    const advisorRejected = await Advisor.create({
      fullName: "Advisor Rejected",
      email: `adv_p64_rej_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Rejected Advisory",
      licenseNumber: "ARN-64-005",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorRejected.id, { approvalStatus: "rejected", rejectionReason: "Invalid license credentials" });
    createdAdvisorIds.push(advisorRejected.id);

    // 6. User 1: Normal client without an advisor
    const user1 = await User.create({
      fullName: "Pooja Verma",
      email: `user_p64_1_${Date.now()}@client.test`,
      password: "ClientPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(user1.id);

    // 7. User 2: Client who ALREADY HAS an active advisor (Advisor B)
    const user2 = await User.create({
      fullName: "Rajesh Khanna",
      email: `user_p64_2_${Date.now()}@client.test`,
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
    await db.query(`UPDATE advisor_client_relationships SET accepted_at = NOW() WHERE id = $1`, [relUser2Active.id]);
    createdRelationshipIds.push(relUser2Active.id);

    // 8. User 3: Independent second user for isolation testing
    const user3 = await User.create({
      fullName: "Suresh Iyer",
      email: `user_p64_3_${Date.now()}@client.test`,
      password: "ClientPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(user3.id);

    // 9. User Concurrent: Dedicated user for concurrency race condition testing
    const userConcurrent = await User.create({
      fullName: "Deepa Nair",
      email: `user_p64_conc_${Date.now()}@client.test`,
      password: "ClientPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(userConcurrent.id);

    // ── Pre-existing Connection Requests ─────────────────────────────────────
    // Request 1: Advisor A -> User 1 (Valid pending request to be accepted)
    const req1 = await AdvisorRelationship.createConnectionRequest({
      advisorId: advisorA.id,
      userId: user1.id,
      clientEmail: user1.email,
      notes: "Looking forward to helping you with portfolio rebalancing.",
    });
    createdRelationshipIds.push(req1.id);

    // Request 2: Advisor B -> User 1 (Valid pending request to be rejected)
    const req2 = await AdvisorRelationship.createConnectionRequest({
      advisorId: advisorB.id,
      userId: user1.id,
      clientEmail: user1.email,
      notes: "Review your retirement timeline.",
    });
    createdRelationshipIds.push(req2.id);

    // Request 3: Advisor A -> User 3 (Belongs to User 3 — User 1 must NOT access)
    const req3 = await AdvisorRelationship.createConnectionRequest({
      advisorId: advisorA.id,
      userId: user3.id,
      clientEmail: user3.email,
      notes: "Request for User 3.",
    });
    createdRelationshipIds.push(req3.id);

    // Request 4: Advisor Suspended -> User 1
    const reqSusp = await AdvisorRelationship.createConnectionRequest({
      advisorId: advisorSuspended.id,
      userId: user1.id,
      clientEmail: user1.email,
      notes: "Suspended advisor request.",
    });
    createdRelationshipIds.push(reqSusp.id);

    // Request 5: Advisor Unverified -> User 1
    const reqUnver = await AdvisorRelationship.createConnectionRequest({
      advisorId: advisorUnverified.id,
      userId: user1.id,
      clientEmail: user1.email,
      notes: "Unverified advisor request.",
    });
    createdRelationshipIds.push(reqUnver.id);

    // Request 6: Advisor Rejected -> User 1
    const reqRej = await AdvisorRelationship.createConnectionRequest({
      advisorId: advisorRejected.id,
      userId: user1.id,
      clientEmail: user1.email,
      notes: "Rejected advisor request.",
    });
    createdRelationshipIds.push(reqRej.id);

    // Request 7: Advisor A -> User 2 (User 2 already has active advisor B)
    const reqUser2Pending = await AdvisorRelationship.create({
      advisorId: advisorA.id,
      userId: user2.id,
      clientEmail: user2.email,
      status: "pending_user_acceptance",
      initiatedBy: "advisor",
      notes: "Pending request to already-advised user.",
    });
    createdRelationshipIds.push(reqUser2Pending.id);

    // Requests for Concurrent tests: Two pending requests for userConcurrent
    const reqConc1 = await AdvisorRelationship.createConnectionRequest({
      advisorId: advisorA.id,
      userId: userConcurrent.id,
      clientEmail: userConcurrent.email,
      notes: "Concurrent slot candidate 1",
    });
    createdRelationshipIds.push(reqConc1.id);

    const reqConc2 = await AdvisorRelationship.createConnectionRequest({
      advisorId: advisorB.id,
      userId: userConcurrent.id,
      clientEmail: userConcurrent.email,
      notes: "Concurrent slot candidate 2",
    });
    createdRelationshipIds.push(reqConc2.id);

    // 10. Admin fixture for role testing
    const adminFixture = await Admin.create({
      fullName: "Admin Tester",
      email: `admin_p64_${Date.now()}@smartfinance.test`,
      password: "AdminPass2026!",
    });
    createdAdminIds.push(adminFixture.id);

    // Authentication Tokens
    const tokenUser1       = signToken(buildPayload(user1));
    const tokenUser2       = signToken(buildPayload(user2));
    const tokenUser3       = signToken(buildPayload(user3));
    const tokenUserConc    = signToken(buildPayload(userConcurrent));
    const tokenAdvisorA    = signToken(buildAdvisorPayload(advisorA));
    const tokenAdmin       = signToken({ id: adminFixture.id, email: adminFixture.email, role: "admin" });

    console.log("✓ Fixtures created successfully.");

    // ══════════════════════════════════════════════════════════════════════════
    // CATEGORY 1: PENDING REQUEST LISTING (GET /api/user/advisor/requests)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── CATEGORY 1: PENDING REQUEST LISTING ───");

    console.log("[Test 1, 2, 3, 4] User lists their pending connection requests");
    const listRes = await fetch(`${baseUrl}/requests`, {
      method: "GET",
      headers: { Cookie: `sf_token=${tokenUser1}` },
    });
    const listData = await listRes.json();

    assert(listRes.status === 200, "GET /api/user/advisor/requests returns HTTP 200");
    assert(listData.success === true, "Response success is true");
    assert(Array.isArray(listData.data.requests), "Returns an array of requests");
    assert(listData.data.count >= 2, "Returns at least 2 pending requests for User 1");

    // Verify User 1 only sees their requests, not User 3's
    const user1RequestIds = listData.data.requests.map((r) => r.requestId);
    assert(user1RequestIds.includes(req1.id), "Includes Request 1 in pending list");
    assert(user1RequestIds.includes(req2.id), "Includes Request 2 in pending list");
    assert(!user1RequestIds.includes(req3.id), "Strictly EXCLUDES User 3's pending request (Isolation)");

    // Verify safe advisor payload structure
    const sampleReq = listData.data.requests.find((r) => r.requestId === req1.id);
    assert(sampleReq.advisor.id === advisorA.id, "Advisor ID matches");
    assert(sampleReq.advisor.fullName === advisorA.fullName, "Advisor full name matches");
    assert(sampleReq.advisor.firmName === advisorA.firmName, "Advisor firm name matches");
    assert(sampleReq.advisor.licenseNumber === advisorA.licenseNumber, "Advisor license number matches");
    assert(Array.isArray(sampleReq.advisor.specializations), "Advisor specializations is array");
    assert(sampleReq.notes === "Looking forward to helping you with portfolio rebalancing.", "Notes match");
    assert(sampleReq.status === "pending_user_acceptance", "Status is pending_user_acceptance");

    // Verify NO secrets leaked in list response
    const rawListJson = JSON.stringify(listData);
    assert(!rawListJson.includes("password"), "List response does not leak passwords");
    assert(!rawListJson.includes("tokenHash"), "List response does not leak token hashes");
    assert(!rawListJson.includes("invitation_token_hash"), "List response does not leak invitation hashes");

    // ══════════════════════════════════════════════════════════════════════════
    // CATEGORY 2 & 3: AUTHENTICATION & ROLE-BOUND AUTHORIZATION
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── CATEGORIES 2 & 3: AUTHENTICATION & ROLE AUTHORIZATION ───");

    console.log("[Test 5] Unauthenticated call is rejected with 401");
    const unauthRes = await fetch(`${baseUrl}/requests`, { method: "GET" });
    assert(unauthRes.status === 401, "Unauthenticated request returns HTTP 401");

    console.log("[Test 6] Admin attempting to access user pending requests is rejected with 403 (requireUser)");
    const adminRes = await fetch(`${baseUrl}/requests`, {
      method: "GET",
      headers: { Cookie: `sf_admin_token=${tokenAdmin}` },
    });
    assert(adminRes.status === 403, "Admin accessing user endpoint returns HTTP 403");

    console.log("[Test 7] Advisor attempting to access user accept route is rejected with 401/403");
    const advAcceptRes = await fetch(`${baseUrl}/requests/${req1.id}/accept`, {
      method: "POST",
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(advAcceptRes.status === 401 || advAcceptRes.status === 403, "Advisor accessing user accept route rejected with 401/403");

    // ══════════════════════════════════════════════════════════════════════════
    // CATEGORY 4, 5, 6, 7: PARAMETER VALIDATION & CROSS-USER ISOLATION
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── CATEGORIES 4, 5, 6, 7: VALIDATION & CROSS-USER ISOLATION ───");

    console.log("[Test 8] Non-UUID requestId returns 400 Bad Request");
    const badUuidRes = await fetch(`${baseUrl}/requests/not-a-uuid/accept`, {
      method: "POST",
      headers: { Cookie: `sf_token=${tokenUser1}` },
    });
    assert(badUuidRes.status === 400, "Non-UUID requestId returns HTTP 400");

    console.log("[Test 9] Non-existent requestId returns 404 Not Found");
    const nonExistentUuid = "a0000000-0000-4000-8000-000000000099";
    const notFoundRes = await fetch(`${baseUrl}/requests/${nonExistentUuid}/accept`, {
      method: "POST",
      headers: { Cookie: `sf_token=${tokenUser1}` },
    });
    assert(notFoundRes.status === 404, "Non-existent requestId returns HTTP 404");

    console.log("[Test 10] Cross-user access denial: User 1 cannot accept User 3's request (403 FORBIDDEN_USER)");
    const crossAcceptRes = await fetch(`${baseUrl}/requests/${req3.id}/accept`, {
      method: "POST",
      headers: { Cookie: `sf_token=${tokenUser1}` },
    });
    assert(crossAcceptRes.status === 403, "User 1 accepting User 3's request returns HTTP 403 Forbidden");

    console.log("[Test 11] Cross-user access denial: User 1 cannot reject User 3's request (403 FORBIDDEN_USER)");
    const crossRejectRes = await fetch(`${baseUrl}/requests/${req3.id}/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_token=${tokenUser1}`,
      },
      body: JSON.stringify({ rejectionReason: "Intruder rejection" }),
    });
    assert(crossRejectRes.status === 403, "User 1 rejecting User 3's request returns HTTP 403 Forbidden");

    // ══════════════════════════════════════════════════════════════════════════
    // CATEGORY 8, 9, 19, 21, 22: ACCEPT PENDING REQUEST & AUDIT LOGGING
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── CATEGORIES 8, 9, 19, 21, 22: ACCEPT PENDING REQUEST ───");

    console.log("[Test 12, 13, 14, 15] User 1 accepts Advisor A's connection request (req1)");
    const acceptRes = await fetch(`${baseUrl}/requests/${req1.id}/accept`, {
      method: "POST",
      headers: { Cookie: `sf_token=${tokenUser1}` },
    });
    const acceptData = await acceptRes.json();

    assert(acceptRes.status === 200, "Accept returns HTTP 200 OK");
    assert(acceptData.success === true, "Response success is true");
    assert(acceptData.data.relationshipId === req1.id, "Returned relationshipId matches req1");
    assert(acceptData.data.status === "active", "Returned status is 'active'");
    assert(acceptData.data.advisor.id === advisorA.id, "Advisor ID in response matches");
    assert(acceptData.data.advisor.fullName === advisorA.fullName, "Advisor full name matches");
    assert(Boolean(acceptData.data.connectedSince), "connectedSince timestamp is present");

    // Verify database row
    const dbRel1 = await db.query("SELECT * FROM advisor_client_relationships WHERE id = $1", [req1.id]);
    const rowRel1 = dbRel1.rows[0];
    assert(rowRel1.status === "active", "Database status strictly updated to 'active'");
    assert(rowRel1.user_id === user1.id, "Database user_id strictly matches User 1");
    assert(rowRel1.accepted_at !== null, "accepted_at timestamp strictly set in database");

    // Verify Audit Log
    const auditAcceptRes = await db.query(
      `SELECT * FROM audit_logs WHERE action = 'USER_ADVISOR_CONNECTION_ACCEPTED' AND resource_id = $1`,
      [req1.id]
    );
    assert(auditAcceptRes.rows.length > 0, "Audit log record created for USER_ADVISOR_CONNECTION_ACCEPTED");
    const acceptAudit = auditAcceptRes.rows[0];
    assert(acceptAudit.actor_type === "user", "Audit actor_type is 'user'");
    assert(acceptAudit.actor_id === user1.id, "Audit actor_id matches User 1");

    // ══════════════════════════════════════════════════════════════════════════
    // CATEGORY 11: STATE MACHINE INTEGRITY (CANNOT RE-ACCEPT ALREADY ACTIVE)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── CATEGORY 11: STATE MACHINE INTEGRITY ───");

    console.log("[Test 16] Attempting to re-accept already active relationship returns 400 Bad Request");
    const reAcceptRes = await fetch(`${baseUrl}/requests/${req1.id}/accept`, {
      method: "POST",
      headers: { Cookie: `sf_token=${tokenUser1}` },
    });
    const reAcceptData = await reAcceptRes.json();
    assert(reAcceptRes.status === 400, "Re-accept returns HTTP 400 Bad Request");
    assert((reAcceptData.errors?.code || reAcceptData.code) === "REQUEST_NOT_PENDING", "Error code is REQUEST_NOT_PENDING");

    console.log("[Test 17] Attempting to reject already active relationship returns 400 Bad Request");
    const rejectActiveRes = await fetch(`${baseUrl}/requests/${req1.id}/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_token=${tokenUser1}`,
      },
      body: JSON.stringify({ rejectionReason: "Too late" }),
    });
    assert(rejectActiveRes.status === 400, "Reject active returns HTTP 400 Bad Request");

    // ══════════════════════════════════════════════════════════════════════════
    // CATEGORY 16: MULTIPLE ACTIVE ADVISOR PREVENTION
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── CATEGORY 16: MULTIPLE ACTIVE ADVISOR PREVENTION ───");

    console.log("[Test 18, 19] User 1 (now has active Advisor A) attempts to accept Advisor B's request (req2)");
    const secondAdvisorRes = await fetch(`${baseUrl}/requests/${req2.id}/accept`, {
      method: "POST",
      headers: { Cookie: `sf_token=${tokenUser1}` },
    });
    const secondAdvisorData = await secondAdvisorRes.json();
    assert(secondAdvisorRes.status === 409, "Accepting 2nd active advisor returns HTTP 409 Conflict");
    assert((secondAdvisorData.errors?.code || secondAdvisorData.code) === "USER_ALREADY_HAS_ADVISOR", "Error code is USER_ALREADY_HAS_ADVISOR");

    console.log("[Test 20] User 2 (pre-configured with active advisor B) attempts to accept reqUser2Pending");
    const user2AcceptRes = await fetch(`${baseUrl}/requests/${reqUser2Pending.id}/accept`, {
      method: "POST",
      headers: { Cookie: `sf_token=${tokenUser2}` },
    });
    assert(user2AcceptRes.status === 409, "User 2 accepting 2nd advisor returns HTTP 409 Conflict");

    // ══════════════════════════════════════════════════════════════════════════
    // CATEGORIES 13, 14, 15: ADVISOR ELIGIBILITY ENFORCEMENT
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── CATEGORIES 13, 14, 15: ADVISOR ELIGIBILITY CHECKS ───");

    console.log("[Test 21] Cannot accept request from Suspended Advisor (403 ADVISOR_NOT_ELIGIBLE)");
    const acceptSuspRes = await fetch(`${baseUrl}/requests/${reqSusp.id}/accept`, {
      method: "POST",
      headers: { Cookie: `sf_token=${tokenUser3}` },
    });
    // reqSusp was created for user1, but let's test for user1 or verify advisor eligibility check
    // Since user1 has active advisor, let's create a fresh user for clean eligibility tests
    const userClean = await User.create({
      fullName: "Clean Client",
      email: `clean_user_${Date.now()}@client.test`,
      password: "ClientPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(userClean.id);
    const tokenClean = signToken(buildPayload(userClean));

    // Request from Suspended Advisor to Clean Client
    const reqCleanSusp = await AdvisorRelationship.createConnectionRequest({
      advisorId: advisorSuspended.id,
      userId: userClean.id,
      clientEmail: userClean.email,
    });
    createdRelationshipIds.push(reqCleanSusp.id);

    const testSuspRes = await fetch(`${baseUrl}/requests/${reqCleanSusp.id}/accept`, {
      method: "POST",
      headers: { Cookie: `sf_token=${tokenClean}` },
    });
    const testSuspData = await testSuspRes.json();
    assert(testSuspRes.status === 403, "Suspended advisor accept returns HTTP 403");
    assert((testSuspData.errors?.code || testSuspData.code) === "ADVISOR_NOT_ELIGIBLE", "Code is ADVISOR_NOT_ELIGIBLE for suspended advisor");

    console.log("[Test 22] Cannot accept request from Unverified Advisor (403 ADVISOR_NOT_ELIGIBLE)");
    const reqCleanUnver = await AdvisorRelationship.createConnectionRequest({
      advisorId: advisorUnverified.id,
      userId: userClean.id,
      clientEmail: userClean.email,
    });
    createdRelationshipIds.push(reqCleanUnver.id);

    const testUnverRes = await fetch(`${baseUrl}/requests/${reqCleanUnver.id}/accept`, {
      method: "POST",
      headers: { Cookie: `sf_token=${tokenClean}` },
    });
    const testUnverData = await testUnverRes.json();
    assert(testUnverRes.status === 403, "Unverified advisor accept returns HTTP 403");
    assert((testUnverData.errors?.code || testUnverData.code) === "ADVISOR_NOT_ELIGIBLE", "Code is ADVISOR_NOT_ELIGIBLE for unverified advisor");

    console.log("[Test 23] Cannot accept request from Rejected Advisor (403 ADVISOR_NOT_ELIGIBLE)");
    const reqCleanRej = await AdvisorRelationship.createConnectionRequest({
      advisorId: advisorRejected.id,
      userId: userClean.id,
      clientEmail: userClean.email,
    });
    createdRelationshipIds.push(reqCleanRej.id);

    const testRejRes = await fetch(`${baseUrl}/requests/${reqCleanRej.id}/accept`, {
      method: "POST",
      headers: { Cookie: `sf_token=${tokenClean}` },
    });
    const testRejData = await testRejRes.json();
    assert(testRejRes.status === 403, "Rejected advisor accept returns HTTP 403");
    assert((testRejData.errors?.code || testRejData.code) === "ADVISOR_NOT_ELIGIBLE", "Code is ADVISOR_NOT_ELIGIBLE for rejected advisor");

    // ══════════════════════════════════════════════════════════════════════════
    // CATEGORIES 10, 12, 20: REJECT PENDING REQUEST & VALIDATION
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── CATEGORIES 10, 12, 20: REJECT PENDING REQUEST ───");

    console.log("[Test 24, 25, 26, 27] User 1 rejects Advisor B's request (req2) with rejection reason");
    const rejectionReasonText = "I have chosen to work with Advisor Alpha for comprehensive wealth planning.";
    const rejectRes = await fetch(`${baseUrl}/requests/${req2.id}/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_token=${tokenUser1}`,
      },
      body: JSON.stringify({
        rejectionReason: rejectionReasonText,
        // Attempt to inject arbitrary DB fields — must be ignored
        status: "active",
        accepted_at: new Date(),
        assignedByAdminId: "admin-forged",
      }),
    });
    const rejectData = await rejectRes.json();

    assert(rejectRes.status === 200, "Reject returns HTTP 200 OK");
    assert(rejectData.success === true, "Response success is true");
    assert(rejectData.data.relationshipId === req2.id, "Returned relationshipId matches req2");
    assert(rejectData.data.status === "rejected", "Returned status is 'rejected'");
    assert(Boolean(rejectData.data.rejectedAt), "rejectedAt timestamp present");

    // Verify in database
    const dbRel2 = await db.query("SELECT * FROM advisor_client_relationships WHERE id = $1", [req2.id]);
    const rowRel2 = dbRel2.rows[0];
    assert(rowRel2.status === "rejected", "Database status strictly 'rejected'");
    assert(rowRel2.rejection_reason === rejectionReasonText, "rejection_reason persisted in database");
    assert(rowRel2.terminated_at !== null, "terminated_at timestamp strictly set in database");
    assert(rowRel2.accepted_at === null, "accepted_at remains NULL (injected field ignored)");

    // Verify Audit Log for rejection
    const auditRejectRes = await db.query(
      `SELECT * FROM audit_logs WHERE action = 'USER_ADVISOR_CONNECTION_REJECTED' AND resource_id = $1`,
      [req2.id]
    );
    assert(auditRejectRes.rows.length > 0, "Audit log record created for USER_ADVISOR_CONNECTION_REJECTED");
    const rejectAudit = auditRejectRes.rows[0];
    assert(rejectAudit.actor_type === "user", "Audit actor_type is 'user'");
    assert(rejectAudit.actor_id === user1.id, "Audit actor_id matches User 1");
    assert(rejectAudit.details.rejectionReason === rejectionReasonText, "Rejection reason captured in audit details");

    console.log("[Test 28] Repeating reject on already rejected request returns 400 Bad Request");
    const repeatRejectRes = await fetch(`${baseUrl}/requests/${req2.id}/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_token=${tokenUser1}`,
      },
      body: JSON.stringify({ rejectionReason: "Repeated rejection attempt" }),
    });
    assert(repeatRejectRes.status === 400, "Repeat reject returns HTTP 400 Bad Request");

    console.log("[Test 29] Cannot accept an already rejected request returns 400 Bad Request");
    const acceptRejectedRes = await fetch(`${baseUrl}/requests/${req2.id}/accept`, {
      method: "POST",
      headers: { Cookie: `sf_token=${tokenUser1}` },
    });
    assert(acceptRejectedRes.status === 400, "Accepting rejected request returns HTTP 400 Bad Request");

    console.log("[Test 30] Rejection reason exceeding 500 characters is rejected or sanitized");
    const longReason = "A".repeat(600);
    const longReasonRes = await fetch(`${baseUrl}/requests/${req3.id}/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_token=${tokenUser3}`,
      },
      body: JSON.stringify({ rejectionReason: longReason }),
    });
    assert(longReasonRes.status === 400 || longReasonRes.status === 422, "Rejection reason > 500 chars returns HTTP 400/422");

    // ══════════════════════════════════════════════════════════════════════════
    // CATEGORIES 17, 18, 27: CONCURRENCY & RACE CONDITION SAFETY
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── CATEGORIES 17, 18, 27: CONCURRENCY & RACE CONDITION SAFETY ───");

    console.log("[Test 31, 32, 33] Simultaneous concurrent accept attempts for the same user");
    // Fire two accept requests at the exact same moment for userConcurrent
    const [concRes1, concRes2] = await Promise.all([
      fetch(`${baseUrl}/requests/${reqConc1.id}/accept`, {
        method: "POST",
        headers: { Cookie: `sf_token=${tokenUserConc}` },
      }),
      fetch(`${baseUrl}/requests/${reqConc2.id}/accept`, {
        method: "POST",
        headers: { Cookie: `sf_token=${tokenUserConc}` },
      }),
    ]);

    const concStatuses = [concRes1.status, concRes2.status];
    console.log(`     Concurrent HTTP status results: [${concStatuses.join(", ")}]`);

    // Exactly one must succeed (200) and the other must fail with conflict (409)
    assert(concStatuses.includes(200), "One concurrent accept attempt succeeds with HTTP 200");
    assert(concStatuses.includes(409), "The other concurrent accept attempt fails with HTTP 409 Conflict");

    // Verify in database: userConcurrent MUST have exactly ONE active advisor
    const activeCountRes = await db.query(
      `SELECT COUNT(*) FROM advisor_client_relationships WHERE user_id = $1 AND status = 'active'`,
      [userConcurrent.id]
    );
    const activeCount = parseInt(activeCountRes.rows[0].count, 10);
    assert(activeCount === 1, "Database guarantees EXACTLY 1 active advisor under concurrency");

    // ══════════════════════════════════════════════════════════════════════════
    // CATEGORY 24, 25, 26, 28: RESPONSE SANITIZATION & LEAKAGE CHECKS
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── CATEGORIES 24, 25, 26, 28: RESPONSE SANITIZATION & LEAKAGE ───");

    console.log("[Test 34, 35, 36, 37] Response contracts adhere to security standards");
    const acceptPayloadJson = JSON.stringify(acceptData);
    assert(!acceptPayloadJson.includes("password"), "Accept response contains no passwords");
    assert(!acceptPayloadJson.includes("password_hash"), "Accept response contains no password_hash");
    assert(!acceptPayloadJson.includes("invitation_token_hash"), "Accept response contains no token hash");
    assert(!acceptPayloadJson.includes("notes"), "Accept response contains no internal notes");

    const rejectPayloadJson = JSON.stringify(rejectData);
    assert(!rejectPayloadJson.includes("password"), "Reject response contains no passwords");
    assert(!rejectPayloadJson.includes("invitation_token_hash"), "Reject response contains no token hash");

    console.log("[Test 38, 39, 40] Forged body identifiers (userId, clientId, advisorId) have zero effect");
    // User 3 accepts req3 while injecting a fake userId and advisorId in body
    const forgedAcceptRes = await fetch(`${baseUrl}/requests/${req3.id}/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_token=${tokenUser3}`,
      },
      body: JSON.stringify({
        userId: user1.id,
        clientId: user1.id,
        advisorId: advisorB.id,
      }),
    });
    const forgedAcceptData = await forgedAcceptRes.json();
    assert(forgedAcceptRes.status === 200, "User 3 accept succeeds for their own request");
    assert(forgedAcceptData.data.advisor.id === advisorA.id, "Advisor ID is authentic advisorA, not forged advisorB");

    const dbForgedCheck = await db.query("SELECT * FROM advisor_client_relationships WHERE id = $1", [req3.id]);
    assert(dbForgedCheck.rows[0].user_id === user3.id, "Database user_id is strictly authenticated User 3, ignoring forged userId");
    assert(dbForgedCheck.rows[0].advisor_id === advisorA.id, "Database advisor_id is strictly original advisor A, ignoring forged advisorId");

  } finally {
    // ══════════════════════════════════════════════════════════════════════════
    // TEARDOWN
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n[Teardown] Cleaning up Phase 6.4 test records from database...");
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
    if (createdAdminIds.length > 0) {
      await db.query(`DELETE FROM admins WHERE id = ANY($1::uuid[])`, [createdAdminIds]);
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
