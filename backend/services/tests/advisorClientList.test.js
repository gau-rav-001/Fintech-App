// backend/services/tests/advisorClientList.test.js
// ── Run: node services/tests/advisorClientList.test.js ────────────────────────
// Phase 5.1: Advisor Active Client List API Test Suite (GET /api/advisor/clients)

process.env.NODE_ENV = "test";

const http         = require("http");
const express      = require("express");
const cookieParser = require("cookie-parser");
const db           = require("../../config/db");
const User         = require("../../models/User");
const Admin        = require("../../models/Admin");
const Advisor      = require("../../models/Advisor");
const AdvisorRelationship = require("../../models/AdvisorRelationship");
const { signToken, buildPayload, buildAdvisorPayload } = require("../../utils/jwt");
const advisorRoutes = require("../../routes/advisorRoutes");

async function runTests() {
  console.log("\n==================================================================");
  console.log("  PHASE 5.1 — ADVISOR ACTIVE CLIENT LIST API TEST SUITE           ");
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

  // Setup express test app mounting the actual advisorRoutes
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

    // Advisor A (Approved, 3 active clients + 1 invited)
    const advisorA = await Advisor.create({
      fullName: "Advisor Alpha",
      email: `adv_a_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Alpha Capital",
      licenseNumber: "ARN-ALPHA-501",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorA.id, { approvalStatus: "approved", approvedAt: new Date() });
    createdAdvisorIds.push(advisorA.id);

    // Advisor B (Approved, 2 active clients)
    const advisorB = await Advisor.create({
      fullName: "Advisor Beta",
      email: `adv_b_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Beta Capital",
      licenseNumber: "ARN-BETA-502",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorB.id, { approvalStatus: "approved", approvedAt: new Date() });
    createdAdvisorIds.push(advisorB.id);

    // Advisor C (Approved, 0 clients)
    const advisorC = await Advisor.create({
      fullName: "Advisor Gamma",
      email: `adv_c_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Gamma Capital",
      licenseNumber: "ARN-GAMMA-503",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorC.id, { approvalStatus: "approved", approvedAt: new Date() });
    createdAdvisorIds.push(advisorC.id);

    // Advisor Pending
    const advisorPending = await Advisor.create({
      fullName: "Advisor Pending",
      email: `adv_pend_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Pending Capital",
      licenseNumber: "ARN-PEND-504",
      approvalStatus: "pending",
      isEmailVerified: true,
    });
    createdAdvisorIds.push(advisorPending.id);

    // Advisor Suspended
    const advisorSuspended = await Advisor.create({
      fullName: "Advisor Suspended",
      email: `adv_susp_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Suspended Capital",
      licenseNumber: "ARN-SUSP-505",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorSuspended.id, { approvalStatus: "suspended", suspensionReason: "Compliance review" });
    createdAdvisorIds.push(advisorSuspended.id);

    // Advisor Rejected
    const advisorRejected = await Advisor.create({
      fullName: "Advisor Rejected",
      email: `adv_rej_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Rejected Capital",
      licenseNumber: "ARN-REJ-506",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorRejected.id, { approvalStatus: "rejected", rejectionReason: "Invalid docs" });
    createdAdvisorIds.push(advisorRejected.id);

    // Advisor Unverified
    const advisorUnverified = await Advisor.create({
      fullName: "Advisor Unverified",
      email: `adv_unver_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Unverified Capital",
      licenseNumber: "ARN-UNVER-507",
      approvalStatus: "approved",
      isEmailVerified: false,
    });
    createdAdvisorIds.push(advisorUnverified.id);

    // Users
    // User A1 (Alice - Client of A)
    const userA1 = await User.create({
      fullName: "Alice Sharma",
      email: `alice_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    await User.update(userA1.id, {
      isProfileComplete: true,
      city: "Mumbai",
      state: "Maharashtra",
      incomeMonthly: 120000,
      investments: [{ type: "Mutual Funds", investedAmount: 200000, currentValue: 240000 }],
    });
    createdUserIds.push(userA1.id);

    // User A2 (Ananya - Client of A)
    const userA2 = await User.create({
      fullName: "Ananya Kapoor",
      email: `ananya_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    await User.update(userA2.id, {
      isProfileComplete: true,
      city: "Delhi",
      state: "Delhi",
      incomeMonthly: 95000,
      investments: [{ type: "Stocks", investedAmount: 150000, currentValue: 170000 }],
    });
    createdUserIds.push(userA2.id);

    // User A3 (Aarav - Client of A)
    const userA3 = await User.create({
      fullName: "Aarav Patel",
      email: `aarav_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    await User.update(userA3.id, {
      isProfileComplete: true,
      city: "Ahmedabad",
      state: "Gujarat",
      incomeMonthly: 150000,
    });
    createdUserIds.push(userA3.id);

    // User A_Invited (Invited client of A, not active)
    const userA_Inv = await User.create({
      fullName: "Invited Ian",
      email: `ian_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(userA_Inv.id);

    // User B1 (Bob - Client of B)
    const userB1 = await User.create({
      fullName: "Bob Verma",
      email: `bob_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    await User.update(userB1.id, {
      isProfileComplete: true,
      city: "Bengaluru",
      state: "Karnataka",
      incomeMonthly: 180000,
    });
    createdUserIds.push(userB1.id);

    // User B2 (Bhavna - Client of B)
    const userB2 = await User.create({
      fullName: "Bhavna Nair",
      email: `bhavna_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    await User.update(userB2.id, {
      isProfileComplete: true,
      city: "Kochi",
      state: "Kerala",
      incomeMonthly: 130000,
    });
    createdUserIds.push(userB2.id);

    // Relationships:
    // Advisor A -> User A1 (active)
    const relA1 = await AdvisorRelationship.create({
      advisorId: advisorA.id,
      userId: userA1.id,
      clientEmail: userA1.email,
      status: "active",
      initiatedBy: "advisor",
    });
    createdRelationshipIds.push(relA1.id);

    // Advisor A -> User A2 (active)
    const relA2 = await AdvisorRelationship.create({
      advisorId: advisorA.id,
      userId: userA2.id,
      clientEmail: userA2.email,
      status: "active",
      initiatedBy: "advisor",
    });
    createdRelationshipIds.push(relA2.id);

    // Advisor A -> User A3 (active)
    const relA3 = await AdvisorRelationship.create({
      advisorId: advisorA.id,
      userId: userA3.id,
      clientEmail: userA3.email,
      status: "active",
      initiatedBy: "advisor",
    });
    createdRelationshipIds.push(relA3.id);

    // Advisor A -> User A_Invited (status: 'invited')
    const relA_Inv = await AdvisorRelationship.create({
      advisorId: advisorA.id,
      userId: userA_Inv.id,
      clientEmail: userA_Inv.email,
      status: "invited",
      initiatedBy: "advisor",
    });
    createdRelationshipIds.push(relA_Inv.id);

    // Advisor B -> User B1 (active)
    const relB1 = await AdvisorRelationship.create({
      advisorId: advisorB.id,
      userId: userB1.id,
      clientEmail: userB1.email,
      status: "active",
      initiatedBy: "advisor",
    });
    createdRelationshipIds.push(relB1.id);

    // Advisor B -> User B2 (active)
    const relB2 = await AdvisorRelationship.create({
      advisorId: advisorB.id,
      userId: userB2.id,
      clientEmail: userB2.email,
      status: "active",
      initiatedBy: "advisor",
    });
    createdRelationshipIds.push(relB2.id);

    // Admin & User for cross-role tests
    const adminEmail = process.env.ADMIN_EMAIL || "harshvardhan.varma2023@vitbhopal.ac.in";
    let admin = await Admin.findByEmail(adminEmail);
    if (!admin) {
      admin = await Admin.create({
        fullName: "Test Admin",
        email: `adm_${Date.now()}@sf.test`,
        password: "AdminPass2026!",
      });
    }

    // Tokens
    const tokenAdvisorA          = signToken(buildAdvisorPayload(advisorA));
    const tokenAdvisorB          = signToken(buildAdvisorPayload(advisorB));
    const tokenAdvisorC          = signToken(buildAdvisorPayload(advisorC));
    const tokenAdvisorPending    = signToken(buildAdvisorPayload(advisorPending));
    const tokenAdvisorSuspended  = signToken(buildAdvisorPayload(advisorSuspended));
    const tokenAdvisorRejected   = signToken(buildAdvisorPayload(advisorRejected));
    const tokenAdvisorUnverified = signToken(buildAdvisorPayload(advisorUnverified));
    const tokenUser              = signToken(buildPayload(userA1));
    const tokenAdmin             = signToken({ id: admin.id, role: "admin", email: admin.email });

    console.log("✓ Fixtures created successfully.");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 1: CORE FUNCTIONALITY & TENANT ISOLATION TESTS
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 1: CORE FUNCTIONALITY & TENANT ISOLATION ───");

    // ── Test 1: Approved advisor with active clients -> HTTP 200
    console.log("[Test 1] Approved advisor retrieves active clients");
    const t1Res = await fetch(`${baseUrl}/clients`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    const t1Data = await t1Res.json();
    assert(t1Res.status === 200, "Approved advisor receives HTTP 200");
    assert(t1Data.success === true, "Response success is true");
    assert(Array.isArray(t1Data.data.clients), "Response data contains clients array");
    assert(t1Data.data.pagination !== undefined, "Response data contains pagination object");

    // ── Test 2: Advisor sees ONLY own active clients (3 active, 0 invited)
    console.log("[Test 2] Advisor A sees strictly own active clients");
    assert(t1Data.data.clients.length === 3, "Advisor A receives exactly 3 active clients");
    const clientAEmails = t1Data.data.clients.map(c => c.email);
    assert(clientAEmails.includes(userA1.email), "Advisor A clients include Alice");
    assert(clientAEmails.includes(userA2.email), "Advisor A clients include Ananya");
    assert(clientAEmails.includes(userA3.email), "Advisor A clients include Aarav");
    assert(!clientAEmails.includes(userA_Inv.email), "Advisor A clients do NOT include non-active (invited) client");

    // ── Test 3: Advisor A never sees Advisor B clients, and vice-versa
    console.log("[Test 3] Multi-tenant isolation: Advisor A vs Advisor B");
    assert(!clientAEmails.includes(userB1.email), "Advisor A does NOT see Advisor B's client Bob");
    assert(!clientAEmails.includes(userB2.email), "Advisor A does NOT see Advisor B's client Bhavna");

    const t3BRes = await fetch(`${baseUrl}/clients`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorB}` },
    });
    const t3BData = await t3BRes.json();
    assert(t3BRes.status === 200, "Advisor B receives HTTP 200");
    assert(t3BData.data.clients.length === 2, "Advisor B receives exactly 2 active clients");
    const clientBEmails = t3BData.data.clients.map(c => c.email);
    assert(clientBEmails.includes(userB1.email), "Advisor B clients include Bob");
    assert(clientBEmails.includes(userB2.email), "Advisor B clients include Bhavna");
    assert(!clientBEmails.includes(userA1.email), "Advisor B does NOT see Advisor A's client Alice");

    // ── Test 4: Advisor with no clients -> HTTP 200 with empty list
    console.log("[Test 4] Approved advisor with 0 clients");
    const t4Res = await fetch(`${baseUrl}/clients`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorC}` },
    });
    const t4Data = await t4Res.json();
    assert(t4Res.status === 200, "Advisor C receives HTTP 200");
    assert(Array.isArray(t4Data.data.clients) && t4Data.data.clients.length === 0, "Clients array is empty []");
    assert(t4Data.data.pagination.total === 0, "Pagination total is 0");
    assert(t4Data.data.pagination.pages === 0, "Pagination pages is 0");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 2: SEARCH & FILTERING TESTS
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 2: SEARCH & FILTERING ───");

    // ── Test 5: Search by client name
    console.log("[Test 5] Search by client name ('Alice')");
    const t5Res = await fetch(`${baseUrl}/clients?search=Alice`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    const t5Data = await t5Res.json();
    assert(t5Res.status === 200, "Search by name returns HTTP 200");
    assert(t5Data.data.clients.length === 1, "Exactly 1 match returned");
    assert(t5Data.data.clients[0].fullName === "Alice Sharma", "Returned client is Alice Sharma");

    // ── Test 6: Search by client email
    console.log("[Test 6] Search by client email");
    const t6Res = await fetch(`${baseUrl}/clients?search=${userA2.email}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    const t6Data = await t6Res.json();
    assert(t6Res.status === 200, "Search by email returns HTTP 200");
    assert(t6Data.data.clients.length === 1, "Exactly 1 match returned");
    assert(t6Data.data.clients[0].email === userA2.email, "Returned client matches search email");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 3: PAGINATION & BOUNDS ENFORCEMENT
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 3: PAGINATION & BOUNDS ───");

    // ── Test 7: Pagination (page=1, limit=2; page=2, limit=2)
    console.log("[Test 7] Pagination slicing");
    const t7P1Res = await fetch(`${baseUrl}/clients?page=1&limit=2`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    const t7P1Data = await t7P1Res.json();
    assert(t7P1Data.data.clients.length === 2, "Page 1 returns 2 clients");
    assert(t7P1Data.data.pagination.page === 1, "Pagination page is 1");
    assert(t7P1Data.data.pagination.limit === 2, "Pagination limit is 2");
    assert(t7P1Data.data.pagination.total === 3, "Pagination total is 3");
    assert(t7P1Data.data.pagination.pages === 2, "Pagination pages is 2");

    const t7P2Res = await fetch(`${baseUrl}/clients?page=2&limit=2`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    const t7P2Data = await t7P2Res.json();
    assert(t7P2Data.data.clients.length === 1, "Page 2 returns 1 client");
    assert(t7P2Data.data.pagination.page === 2, "Pagination page is 2");

    // ── Test 8: Default page/limit (page=1, limit=20)
    console.log("[Test 8] Default page & limit verification");
    assert(t1Data.data.pagination.page === 1, "Default page is 1");
    assert(t1Data.data.pagination.limit === 20, "Default limit is 20");

    // ── Test 9: Maximum limit enforcement (limit capped at 100 or rejected if out of bounds)
    console.log("[Test 9] Maximum limit enforcement");
    const t9Res = await fetch(`${baseUrl}/clients?limit=100`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    const t9Data = await t9Res.json();
    assert(t9Res.status === 200, "Limit 100 accepted");
    assert(t9Data.data.pagination.limit === 100, "Limit set to 100");

    // ── Test 10: Invalid pagination query parameters -> 422 Validation Error
    console.log("[Test 10] Malformed pagination parameters");
    const t10Res = await fetch(`${baseUrl}/clients?page=-1`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(t10Res.status === 422, "Negative page returns HTTP 422 Validation Error");

    const t10LimitRes = await fetch(`${baseUrl}/clients?limit=999`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(t10LimitRes.status === 422, "Excessive limit (>100) returns HTTP 422 Validation Error");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 4: SECURITY GUARDS & SPOOFING RESISTANCE
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 4: SECURITY GUARDS & SPOOFING RESISTANCE ───");

    // ── Test 11: Suspended advisor -> 403 ADVISOR_SUSPENDED
    console.log("[Test 11] Suspended advisor denied");
    const t11Res = await fetch(`${baseUrl}/clients`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorSuspended}` },
    });
    const t11Data = await t11Res.json();
    assert(t11Res.status === 403, "Suspended advisor returns HTTP 403");
    assert(t11Data.errors?.code === "ADVISOR_SUSPENDED", "Error code is ADVISOR_SUSPENDED");

    // ── Test 12: Pending advisor -> 403 ADVISOR_PENDING
    console.log("[Test 12] Pending advisor denied");
    const t12Res = await fetch(`${baseUrl}/clients`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorPending}` },
    });
    const t12Data = await t12Res.json();
    assert(t12Res.status === 403, "Pending advisor returns HTTP 403");
    assert(t12Data.errors?.code === "ADVISOR_PENDING", "Error code is ADVISOR_PENDING");

    // ── Test 13: Rejected advisor -> 403 ADVISOR_REJECTED
    console.log("[Test 13] Rejected advisor denied");
    const t13Res = await fetch(`${baseUrl}/clients`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorRejected}` },
    });
    const t13Data = await t13Res.json();
    assert(t13Res.status === 403, "Rejected advisor returns HTTP 403");
    assert(t13Data.errors?.code === "ADVISOR_REJECTED", "Error code is ADVISOR_REJECTED");

    // ── Test 14: Unverified advisor -> 403 EMAIL_NOT_VERIFIED
    console.log("[Test 14] Unverified email advisor denied");
    const t14Res = await fetch(`${baseUrl}/clients`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorUnverified}` },
    });
    const t14Data = await t14Res.json();
    assert(t14Res.status === 403, "Unverified advisor returns HTTP 403");
    assert(t14Data.errors?.code === "EMAIL_NOT_VERIFIED", "Error code is EMAIL_NOT_VERIFIED");

    // ── Test 15: Missing advisor session -> 401
    console.log("[Test 15] Unauthenticated request denied");
    const t15Res = await fetch(`${baseUrl}/clients`);
    assert(t15Res.status === 401, "Missing session returns HTTP 401");

    // ── Test 16: User session -> 401/403 denied
    console.log("[Test 16] User session rejected");
    const t16Res = await fetch(`${baseUrl}/clients`, {
      headers: { Cookie: `sf_token=${tokenUser}` },
    });
    assert(t16Res.status === 401 || t16Res.status === 403, "User session rejected on advisor clients route");

    // ── Test 17: Admin session -> 401/403 denied
    console.log("[Test 17] Admin session rejected");
    const t17Res = await fetch(`${baseUrl}/clients`, {
      headers: { Cookie: `sf_admin_token=${tokenAdmin}` },
    });
    assert(t17Res.status === 401 || t17Res.status === 403, "Admin session rejected on advisor clients route");

    // ── Test 18: advisorId query spoofing -> no effect
    console.log("[Test 18] ?advisorId=AdvisorB query spoofing");
    const t18Res = await fetch(`${baseUrl}/clients?advisorId=${advisorB.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    const t18Data = await t18Res.json();
    assert(t18Res.status === 200, "Query spoofing request completes");
    assert(t18Data.data.clients.length === 3, "Returns strictly Advisor A's 3 clients");
    assert(!t18Data.data.clients.some(c => c.email === userB1.email), "Advisor B's clients NOT returned");

    // ── Test 19: clientId query spoofing -> no effect
    console.log("[Test 19] ?clientId=UserB1 query spoofing");
    const t19Res = await fetch(`${baseUrl}/clients?clientId=${userB1.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    const t19Data = await t19Res.json();
    assert(t19Res.status === 200, "Query clientId request completes");
    assert(!t19Data.data.clients.some(c => c.email === userB1.email), "Client of Advisor B is NOT leaked");

    // ── Test 20: Response contains no password/token/hash fields
    console.log("[Test 20] Response schema safety & no sensitive leaks");
    const jsonStr = JSON.stringify(t1Data);
    assert(!jsonStr.includes("password_hash"), "Response does NOT contain password_hash");
    assert(!jsonStr.includes("passwordHash"), "Response does NOT contain passwordHash");
    assert(!jsonStr.includes("invitation_token_hash"), "Response does NOT contain invitation_token_hash");
    assert(!jsonStr.includes("token_hash"), "Response does NOT contain token_hash");

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
