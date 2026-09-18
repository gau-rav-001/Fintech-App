// backend/services/tests/advisorTermination.test.js
// ── Run: node services/tests/advisorTermination.test.js ──────────────────────
// Phase 6.5: User Terminates / Disconnects Active Advisor Test Suite

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
const advisorRoutes = require("../../routes/advisorRoutes");

async function runTests() {
  console.log("\n==================================================================");
  console.log("  PHASE 6.5 — USER TERMINATES / DISCONNECTS ADVISOR TEST SUITE    ");
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

  // Setup express test app mounting userRoutes and advisorRoutes
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/user", userRoutes);
  app.use("/api/advisor", advisorRoutes);

  // Start in-memory HTTP server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const userBaseUrl = `http://127.0.0.1:${port}/api/user/advisor`;
  const advisorBaseUrl = `http://127.0.0.1:${port}/api/advisor`;

  const createdAdvisorIds = [];
  const createdUserIds = [];
  const createdAdminIds = [];
  const createdRelationshipIds = [];

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // FIXTURE SETUP
    // ══════════════════════════════════════════════════════════════════════════
    console.log("─── CREATING TEST FIXTURES ───");

    // 1. Advisor Alpha
    const advisorAlpha = await Advisor.create({
      fullName: "Advisor Alpha",
      email: `adv_p65_a_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Alpha Capital Advisory",
      licenseNumber: "ARN-65-001",
      approvalStatus: "approved",
      isEmailVerified: true,
      specializations: ["Wealth Management", "Retirement"],
    });
    await Advisor.updateApprovalStatus(advisorAlpha.id, { approvalStatus: "approved", approvedAt: new Date() });
    await db.query(`UPDATE advisors SET is_email_verified = TRUE WHERE id = $1`, [advisorAlpha.id]);
    createdAdvisorIds.push(advisorAlpha.id);

    // 2. Advisor Beta
    const advisorBeta = await Advisor.create({
      fullName: "Advisor Beta",
      email: `adv_p65_b_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Beta Wealth Management",
      licenseNumber: "ARN-65-002",
      approvalStatus: "approved",
      isEmailVerified: true,
      specializations: ["Tax Strategy"],
    });
    await Advisor.updateApprovalStatus(advisorBeta.id, { approvalStatus: "approved", approvedAt: new Date() });
    await db.query(`UPDATE advisors SET is_email_verified = TRUE WHERE id = $1`, [advisorBeta.id]);
    createdAdvisorIds.push(advisorBeta.id);

    // 3. User One (Will have active relationship with Advisor Alpha)
    const userOne = await User.create({
      fullName: "User One Test",
      email: `user_p65_1_${Date.now()}@smartfinance.test`,
      password: "UserPass2026!",
      isProfileComplete: true,
    });
    createdUserIds.push(userOne.id);

    // 4. User Two (Will have active relationship with Advisor Alpha - multi-client test)
    const userTwo = await User.create({
      fullName: "User Two Test",
      email: `user_p65_2_${Date.now()}@smartfinance.test`,
      password: "UserPass2026!",
      isProfileComplete: true,
    });
    createdUserIds.push(userTwo.id);

    // 5. User Three (No active advisor)
    const userThree = await User.create({
      fullName: "User Three Test",
      email: `user_p65_3_${Date.now()}@smartfinance.test`,
      password: "UserPass2026!",
      isProfileComplete: true,
    });
    createdUserIds.push(userThree.id);

    // 6. User Four (For concurrent race condition testing)
    const userFour = await User.create({
      fullName: "User Four Race",
      email: `user_p65_4_${Date.now()}@smartfinance.test`,
      password: "UserPass2026!",
      isProfileComplete: true,
    });
    createdUserIds.push(userFour.id);

    // 7. Admin fixture
    const adminUser = await Admin.create({
      fullName: "Admin P65 Test",
      email: `admin_p65_${Date.now()}@smartfinance.test`,
      password: "AdminPassword2026!",
    });
    createdAdminIds.push(adminUser.id);

    // Auth Tokens
    const tokenUserOne   = signToken(buildPayload({ id: userOne.id, email: userOne.email, role: "user" }));
    const tokenUserTwo   = signToken(buildPayload({ id: userTwo.id, email: userTwo.email, role: "user" }));
    const tokenUserThree = signToken(buildPayload({ id: userThree.id, email: userThree.email, role: "user" }));
    const tokenUserFour  = signToken(buildPayload({ id: userFour.id, email: userFour.email, role: "user" }));
    const tokenAdvisor   = signToken(buildAdvisorPayload(advisorAlpha));
    const tokenAdmin     = signToken({ id: adminUser.id, email: adminUser.email, role: "admin" });

    // Helper for requests
    async function makeRequest(url, { method = "GET", token = null, body = null } = {}) {
      const parsedUrl = new URL(url);
      const headers = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers,
      };

      return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const json = JSON.parse(data);
              resolve({ status: res.statusCode, body: json });
            } catch (e) {
              resolve({ status: res.statusCode, raw: data });
            }
          });
        });
        req.on("error", reject);
        if (body) {
          req.write(JSON.stringify(body));
        }
        req.end();
      });
    }

    // Seed Active Relationship 1: Advisor Alpha <-> User One
    const rel1Res = await db.query(
      `INSERT INTO advisor_client_relationships 
       (advisor_id, user_id, client_email, status, initiated_by, notes, accepted_at)
       VALUES ($1, $2, $3, 'active', 'advisor', 'Initial onboarding note', NOW() - INTERVAL '30 days')
       RETURNING id`,
      [advisorAlpha.id, userOne.id, userOne.email]
    );
    const rel1Id = rel1Res.rows[0].id;
    createdRelationshipIds.push(rel1Id);

    // Seed Active Relationship 2: Advisor Alpha <-> User Two
    const rel2Res = await db.query(
      `INSERT INTO advisor_client_relationships 
       (advisor_id, user_id, client_email, status, initiated_by, notes, accepted_at)
       VALUES ($1, $2, $3, 'active', 'advisor', 'User Two notes', NOW() - INTERVAL '15 days')
       RETURNING id`,
      [advisorAlpha.id, userTwo.id, userTwo.email]
    );
    const rel2Id = rel2Res.rows[0].id;
    createdRelationshipIds.push(rel2Id);

    // Seed Active Relationship 4: Advisor Alpha <-> User Four (For concurrency test)
    const rel4Res = await db.query(
      `INSERT INTO advisor_client_relationships 
       (advisor_id, user_id, client_email, status, initiated_by, notes, accepted_at)
       VALUES ($1, $2, $3, 'active', 'advisor', 'Race condition test', NOW() - INTERVAL '5 days')
       RETURNING id`,
      [advisorAlpha.id, userFour.id, userFour.email]
    );
    const rel4Id = rel4Res.rows[0].id;
    createdRelationshipIds.push(rel4Id);

    console.log("✓ Fixtures successfully established.\n");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST CATEGORY 01: Authentication & Role Authorization Controls
    // ══════════════════════════════════════════════════════════════════════════
    console.log("─── Category 01: Authentication & Authorization Controls ───");

    // 01.01 Unauthenticated call -> 401
    const unauthRes = await makeRequest(`${userBaseUrl}/terminate`, {
      method: "POST",
      body: { reason: "Ending connection" },
    });
    assert(unauthRes.status === 401, "01.01 Unauthenticated termination request rejected (401)");

    // 01.02 Advisor role rejected -> 401/403
    const advisorCallRes = await makeRequest(`${userBaseUrl}/terminate`, {
      method: "POST",
      token: tokenAdvisor,
      body: { reason: "Advisor cannot call user terminate" },
    });
    assert(
      advisorCallRes.status === 401 || advisorCallRes.status === 403,
      "01.02 Advisor session rejected from user endpoint (401/403)"
    );

    // 01.03 Admin role rejected -> 403
    const adminCallRes = await makeRequest(`${userBaseUrl}/terminate`, {
      method: "POST",
      token: tokenAdmin,
      body: { reason: "Admin cannot call user terminate" },
    });
    assert(adminCallRes.status === 403, "01.03 Admin role rejected by requireUser (403)");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST CATEGORY 02: User Without Active Advisor Guard
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── Category 02: User Without Active Advisor Guard ───");

    // 02.01 User Three has no relationships at all -> 404 NO_ACTIVE_ADVISOR
    const noAdvRes = await makeRequest(`${userBaseUrl}/terminate`, {
      method: "POST",
      token: tokenUserThree,
      body: { reason: "No advisor to terminate" },
    });
    assert(noAdvRes.status === 404, "02.01 User without active advisor returns 404");
    assert(
      (noAdvRes.body.errors?.code || noAdvRes.body.code) === "NO_ACTIVE_ADVISOR",
      "02.02 Controlled error code NO_ACTIVE_ADVISOR returned"
    );

    // 02.03 User with only pending request cannot terminate
    const pendingRelRes = await db.query(
      `INSERT INTO advisor_client_relationships 
       (advisor_id, user_id, client_email, status, initiated_by)
       VALUES ($1, $2, $3, 'pending_user_acceptance', 'advisor')
       RETURNING id`,
      [advisorBeta.id, userThree.id, userThree.email]
    );
    createdRelationshipIds.push(pendingRelRes.rows[0].id);

    const pendingTerminateRes = await makeRequest(`${userBaseUrl}/terminate`, {
      method: "POST",
      token: tokenUserThree,
      body: { reason: "Trying to terminate pending" },
    });
    assert(pendingTerminateRes.status === 404, "02.03 Pending request not treated as active relationship (404)");

    // 02.04 User with only invited relationship cannot terminate
    await db.query(`UPDATE advisor_client_relationships SET status = 'invited' WHERE id = $1`, [pendingRelRes.rows[0].id]);
    const invitedTerminateRes = await makeRequest(`${userBaseUrl}/terminate`, {
      method: "POST",
      token: tokenUserThree,
      body: { reason: "Trying to terminate invited" },
    });
    assert(invitedTerminateRes.status === 404, "02.04 Invited relationship not treated as active (404)");

    // 02.05 User with only rejected relationship cannot terminate
    await db.query(`UPDATE advisor_client_relationships SET status = 'rejected' WHERE id = $1`, [pendingRelRes.rows[0].id]);
    const rejectedTerminateRes = await makeRequest(`${userBaseUrl}/terminate`, {
      method: "POST",
      token: tokenUserThree,
      body: { reason: "Trying to terminate rejected" },
    });
    assert(rejectedTerminateRes.status === 404, "02.05 Rejected relationship not treated as active (404)");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST CATEGORY 03: Validation & Input Sanitization
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── Category 03: Validation & Input Sanitization ───");

    // 03.01 Excessive reason (> 500 chars) returns 422
    const longReason = "a".repeat(501);
    const longReasonRes = await makeRequest(`${userBaseUrl}/terminate`, {
      method: "POST",
      token: tokenUserOne,
      body: { reason: longReason },
    });
    assert(longReasonRes.status === 422, "03.01 Reason exceeding 500 characters rejected with 422");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST CATEGORY 04: Successful Termination Flow (User One)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── Category 04: Successful Termination Flow ───");

    const reasonText = "Moving to independent index fund investing.";
    const termRes = await makeRequest(`${userBaseUrl}/terminate`, {
      method: "POST",
      token: tokenUserOne,
      body: { reason: `  ${reasonText} \x00\x07 ` }, // Includes whitespace and control characters to verify sanitization
    });

    assert(termRes.status === 200, "04.01 User successfully terminates active advisor (200)");
    assert(termRes.body.success === true, "04.02 Response envelope success is true");
    assert(termRes.body.data.status === "terminated", "04.03 Returned status is strictly 'terminated'");
    assert(termRes.body.data.relationshipId === rel1Id, "04.04 Returned relationshipId matches active relationship");
    assert(termRes.body.data.terminatedAt !== null, "04.05 Returned terminatedAt timestamp is present");
    assert(termRes.body.data.advisor.id === advisorAlpha.id, "04.06 Advisor ID matches terminated advisor");
    assert(termRes.body.data.advisor.fullName === "Advisor Alpha", "04.07 Advisor fullName returned safely");
    assert(termRes.body.data.advisor.firmName === "Alpha Capital Advisory", "04.08 Advisor firmName returned safely");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST CATEGORY 05: Database State & History Preservation
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── Category 05: Database State & History Preservation ───");

    const { rows: dbRows1 } = await db.query(
      `SELECT * FROM advisor_client_relationships WHERE id = $1`,
      [rel1Id]
    );
    const dbRel1 = dbRows1[0];

    assert(dbRel1.status === "terminated", "05.01 Database status updated to 'terminated'");
    assert(dbRel1.terminated_at !== null, "05.02 Database terminated_at populated");
    assert(dbRel1.accepted_at !== null, "05.03 Database accepted_at strictly preserved");
    assert(dbRel1.created_at !== null, "05.04 Database created_at strictly preserved");
    assert(dbRel1.notes.includes("Initial onboarding note"), "05.05 Pre-existing notes strictly preserved");
    assert(
      dbRel1.notes.includes(`Client termination reason: ${reasonText}`),
      "05.06 Client termination reason appended with prefix and sanitized"
    );
    assert(!dbRel1.notes.includes("\x00"), "05.07 Control characters stripped from notes");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST CATEGORY 06: State Machine Guards & Repeat Calls
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── Category 06: State Machine Guards & Repeat Calls ───");

    // 06.01 Calling terminate a second time fails safely -> 404 NO_ACTIVE_ADVISOR
    const repeatTermRes = await makeRequest(`${userBaseUrl}/terminate`, {
      method: "POST",
      token: tokenUserOne,
      body: { reason: "Calling terminate again" },
    });
    assert(repeatTermRes.status === 404, "06.01 Repeated termination call rejected with 404");
    assert(
      (repeatTermRes.body.errors?.code || repeatTermRes.body.code) === "NO_ACTIVE_ADVISOR",
      "06.02 Repeat call returns NO_ACTIVE_ADVISOR"
    );

    // 06.03 No duplicate mutation in database
    const { rows: dbRowsCheck } = await db.query(
      `SELECT terminated_at FROM advisor_client_relationships WHERE id = $1`,
      [rel1Id]
    );
    assert(
      new Date(dbRowsCheck[0].terminated_at).getTime() === new Date(dbRel1.terminated_at).getTime(),
      "06.03 Repeat call does not alter existing terminated_at timestamp"
    );

    // ══════════════════════════════════════════════════════════════════════════
    // TEST CATEGORY 07: Cross-User Isolation & Anti-IDOR Defense
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── Category 07: Cross-User Isolation & Anti-IDOR Defense ───");

    // User One termination must NOT have affected User Two's relationship
    const { rows: userTwoCheck } = await db.query(
      `SELECT status FROM advisor_client_relationships WHERE id = $1`,
      [rel2Id]
    );
    assert(userTwoCheck[0].status === "active", "07.01 User One termination did not affect User Two's active relationship");

    // Forged parameters in body (userId, advisorId, relationshipId, clientId) ignored
    const forgedRes = await makeRequest(`${userBaseUrl}/terminate`, {
      method: "POST",
      token: tokenUserTwo,
      body: {
        userId: userOne.id,
        advisorId: advisorBeta.id,
        relationshipId: rel1Id,
        clientId: userOne.id,
        reason: "Valid reason for User Two",
      },
    });
    assert(forgedRes.status === 200, "07.02 Forged body parameters ignored; User Two's own relationship terminated");
    assert(forgedRes.body.data.relationshipId === rel2Id, "07.03 Correct user relationship terminated (rel2Id)");

    // User Two relationship is now terminated
    const { rows: userTwoTermCheck } = await db.query(
      `SELECT status FROM advisor_client_relationships WHERE id = $1`,
      [rel2Id]
    );
    assert(userTwoTermCheck[0].status === "terminated", "07.04 User Two relationship transitioned to 'terminated'");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST CATEGORY 08: Immediate Access Revocation & System Consistency
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── Category 08: Immediate Access Revocation & System Consistency ───");

    // 08.01 Advisor Alpha accessing User One detail returns 403 ADVISOR_CLIENT_ACCESS_DENIED
    const advAccessDetailRes = await makeRequest(`${advisorBaseUrl}/clients/${userOne.id}`, {
      method: "GET",
      token: tokenAdvisor,
    });
    assert(advAccessDetailRes.status === 403, "08.01 Advisor access to terminated client detail returns 403");
    assert(
      (advAccessDetailRes.body.errors?.code || advAccessDetailRes.body.code) === "ADVISOR_CLIENT_ACCESS_DENIED",
      "08.02 Error code is ADVISOR_CLIENT_ACCESS_DENIED"
    );

    // 08.03 Advisor Alpha accessing User Two detail returns 403 ADVISOR_CLIENT_ACCESS_DENIED
    const advAccessUser2Res = await makeRequest(`${advisorBaseUrl}/clients/${userTwo.id}`, {
      method: "GET",
      token: tokenAdvisor,
    });
    assert(advAccessUser2Res.status === 403, "08.03 Advisor access to second terminated client returns 403");

    // 08.04 Terminated clients removed from findAdvisorActiveClients
    const activeClientsAlpha = await AdvisorRelationship.findAdvisorActiveClients(advisorAlpha.id);
    const clientIds = activeClientsAlpha.clients.map((c) => c.userId);
    assert(!clientIds.includes(userOne.id), "08.04 User One no longer in advisor active clients roster");
    assert(!clientIds.includes(userTwo.id), "08.05 User Two no longer in advisor active clients roster");

    // 08.06 Advisor dashboard statistics active clients count reflects termination
    const statsAlpha = await AdvisorRelationship.getAdvisorDashboardStats(advisorAlpha.id);
    assert(typeof statsAlpha.totalActiveClients === "number", "08.06 Advisor dashboard stats totalActiveClients count calculated cleanly");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST CATEGORY 09: Single Active Advisor Partial Index Release
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── Category 09: Single Active Advisor Partial Index Release ───");

    // User One should now be able to connect with Advisor Beta
    // Create connection request from Advisor Beta to User One
    const newReq = await AdvisorRelationship.createConnectionRequest({
      advisorId: advisorBeta.id,
      userId: userOne.id,
      clientEmail: userOne.email,
      notes: "New connection request after termination",
    });
    createdRelationshipIds.push(newReq.id);

    // User One accepts Advisor Beta's request
    const acceptNewRes = await makeRequest(`${userBaseUrl}/requests/${newReq.id}/accept`, {
      method: "POST",
      token: tokenUserOne,
    });
    assert(acceptNewRes.status === 200, "09.01 User can accept a new advisor request after termination");
    assert(acceptNewRes.body.data.status === "active", "09.02 New advisor relationship is active");

    // Verify active advisor in DB for User One is now Advisor Beta
    const activeForUserOne = await AdvisorRelationship.findActiveForUser(userOne.id);
    assert(activeForUserOne.advisorId === advisorBeta.id, "09.03 Active advisor is now Advisor Beta");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST CATEGORY 10: Audit Logging & Tamper-Evident Trail
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── Category 10: Audit Logging & Tamper-Evident Trail ───");

    const auditLogsUserOne = await AuditLog.findAll({ actorType: "user", actorId: userOne.id, limit: 10 });
    const termLog = auditLogsUserOne.logs.find(
      (l) => l.action === "USER_ADVISOR_RELATIONSHIP_TERMINATED" && l.resourceId === rel1Id
    );

    assert(termLog !== undefined, "10.01 Audit log USER_ADVISOR_RELATIONSHIP_TERMINATED created");
    assert(termLog.actorType === "user", "10.02 Audit actorType is 'user'");
    assert(termLog.actorId === userOne.id, "10.03 Audit actorId is user ID");
    assert(termLog.resourceType === "advisor_client_relationship", "10.04 Audit resourceType is relationship");
    assert(termLog.details?.relationshipId === rel1Id, "10.05 Audit details contains relationshipId");
    assert(termLog.details?.advisorId === advisorAlpha.id, "10.06 Audit details contains advisorId");
    assert(termLog.details?.reason === reasonText, "10.07 Audit details contains sanitized reason");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST CATEGORY 11: Termination Without Reason
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── Category 11: Termination Without Reason ───");

    // Seed active relationship for User Three with Advisor Beta
    const rel3Res = await db.query(
      `INSERT INTO advisor_client_relationships 
       (advisor_id, user_id, client_email, status, initiated_by, notes, accepted_at)
       VALUES ($1, $2, $3, 'active', 'advisor', 'Original notes preserved', NOW() - INTERVAL '1 day')
       RETURNING id`,
      [advisorBeta.id, userThree.id, userThree.email]
    );
    const rel3Id = rel3Res.rows[0].id;
    createdRelationshipIds.push(rel3Id);

    // Terminate with no reason provided
    const noReasonTermRes = await makeRequest(`${userBaseUrl}/terminate`, {
      method: "POST",
      token: tokenUserThree,
      body: {},
    });
    assert(noReasonTermRes.status === 200, "11.01 Termination without reason succeeds (200)");

    const { rows: dbRows3 } = await db.query(
      `SELECT notes, status FROM advisor_client_relationships WHERE id = $1`,
      [rel3Id]
    );
    assert(dbRows3[0].status === "terminated", "11.02 Status transitioned to 'terminated'");
    assert(dbRows3[0].notes === "Original notes preserved", "11.03 Existing notes remain completely unchanged when no reason is given");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST CATEGORY 12: Database Concurrency & Race Condition Defense
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── Category 12: Database Concurrency & Race Condition Defense ───");

    // Fire 2 simultaneous termination requests for User Four (who has active rel4Id)
    const [raceRes1, raceRes2] = await Promise.all([
      makeRequest(`${userBaseUrl}/terminate`, {
        method: "POST",
        token: tokenUserFour,
        body: { reason: "Concurrent call A" },
      }),
      makeRequest(`${userBaseUrl}/terminate`, {
        method: "POST",
        token: tokenUserFour,
        body: { reason: "Concurrent call B" },
      }),
    ]);

    const statuses = [raceRes1.status, raceRes2.status].sort();
    assert(
      statuses[0] === 200 && statuses[1] === 404,
      `12.01 Concurrent race condition handled safely: exactly one 200, one 404 (got ${statuses.join(", ")})`
    );

    // Verify exactly one termination in DB
    const { rows: rel4Db } = await db.query(
      `SELECT status, terminated_at FROM advisor_client_relationships WHERE id = $1`,
      [rel4Id]
    );
    assert(rel4Db[0].status === "terminated", "12.02 Relationship status is 'terminated'");

    // Verify only 1 audit log entry written for User Four termination
    const auditLogsUserFour = await AuditLog.findAll({ actorType: "user", actorId: userFour.id, limit: 10 });
    const termLogsFour = auditLogsUserFour.logs.filter(
      (l) => l.action === "USER_ADVISOR_RELATIONSHIP_TERMINATED" && l.resourceId === rel4Id
    );
    assert(termLogsFour.length === 1, "12.03 Exactly one audit log entry written during concurrency race");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST CATEGORY 13: Data Minimization & Leak Prevention
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── Category 13: Data Minimization & Leak Prevention ───");

    const responseKeys = Object.keys(termRes.body.data);
    assert(!responseKeys.includes("password"), "13.01 No password field in response");
    assert(!responseKeys.includes("passwordHash"), "13.02 No passwordHash field in response");
    assert(!responseKeys.includes("token"), "13.03 No token field in response");
    assert(!responseKeys.includes("financials"), "13.04 No financial data in response");

    const advisorKeys = Object.keys(termRes.body.data.advisor);
    assert(!advisorKeys.includes("mobile"), "13.05 No advisor mobile field in response");
    assert(!advisorKeys.includes("passwordHash"), "13.06 No advisor credentials in response");
    assert(!advisorKeys.includes("licenseNumber"), "13.07 License number omitted from termination response");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST CATEGORY 14: Model Transaction Rollback on Failure
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── Category 14: Transaction Rollback on Failure ───");

    // Calling terminateUserRelationship with missing userId throws USER_ID_REQUIRED without side-effects
    try {
      await AdvisorRelationship.terminateUserRelationship({ userId: null, reason: "Fail test" });
      assert(false, "Should have thrown error on null userId");
    } catch (e) {
      assert(e.code === "USER_ID_REQUIRED", "14.01 Model throws controlled USER_ID_REQUIRED error");
    }

    console.log("\n==================================================================");
    console.log(`  PHASE 6.5 TEST SUMMARY: ${testPassed} passed, ${testFailed} failed.`);
    console.log("==================================================================\n");

  } finally {
    // ══════════════════════════════════════════════════════════════════════════
    // CLEANUP FIXTURES
    // ══════════════════════════════════════════════════════════════════════════
    console.log("─── CLEANING UP TEST FIXTURES ───");
    if (createdRelationshipIds.length > 0) {
      await db.query(`DELETE FROM advisor_client_relationships WHERE id = ANY($1::uuid[])`, [createdRelationshipIds]);
    }
    if (createdUserIds.length > 0) {
      await db.query(`DELETE FROM audit_logs WHERE actor_id = ANY($1::uuid[])`, [createdUserIds]);
      await db.query(`DELETE FROM notifications WHERE actor_id = ANY($1::uuid[]) OR recipient_id = ANY($1::uuid[])`, [createdUserIds]);
      await db.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [createdUserIds]);
    }
    if (createdAdvisorIds.length > 0) {
      await db.query(`DELETE FROM audit_logs WHERE actor_id = ANY($1::uuid[])`, [createdAdvisorIds]);
      await db.query(`DELETE FROM notifications WHERE actor_id = ANY($1::uuid[]) OR recipient_id = ANY($1::uuid[])`, [createdAdvisorIds]);
      await db.query(`DELETE FROM advisors WHERE id = ANY($1::uuid[])`, [createdAdvisorIds]);
    }
    if (createdAdminIds.length > 0) {
      await db.query(`DELETE FROM admins WHERE id = ANY($1::uuid[])`, [createdAdminIds]);
    }
    server.close();
    console.log("✓ Server closed and database fixtures cleaned up cleanly.");
  }
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test execution aborted with error:", err);
    process.exit(1);
  });
