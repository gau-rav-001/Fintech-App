// backend/services/tests/advisorDashboardStats.test.js
// ── Run: node services/tests/advisorDashboardStats.test.js ────────────────────
// Phase 5.3: Advisor Dashboard Statistics Test Suite (GET /api/advisor/dashboard/stats)

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
  console.log("  PHASE 5.3 — ADVISOR DASHBOARD STATISTICS TEST SUITE             ");
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

    // Advisor A (Alpha - Approved, multiple active clients & pending requests)
    const advisorA = await Advisor.create({
      fullName: "Advisor Alpha",
      email: `adv_a_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Alpha Capital",
      licenseNumber: "ARN-ALPHA-701",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorA.id, { approvalStatus: "approved", approvedAt: new Date() });
    createdAdvisorIds.push(advisorA.id);

    // Advisor B (Beta - Approved, 1 active client)
    const advisorB = await Advisor.create({
      fullName: "Advisor Beta",
      email: `adv_b_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Beta Capital",
      licenseNumber: "ARN-BETA-702",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorB.id, { approvalStatus: "approved", approvedAt: new Date() });
    createdAdvisorIds.push(advisorB.id);

    // Advisor C (Gamma - Approved, 0 clients)
    const advisorC = await Advisor.create({
      fullName: "Advisor Gamma",
      email: `adv_c_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Gamma Capital",
      licenseNumber: "ARN-GAMMA-703",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorC.id, { approvalStatus: "approved", approvedAt: new Date() });
    createdAdvisorIds.push(advisorC.id);

    // Lifecycle state advisors
    const advisorPending = await Advisor.create({
      fullName: "Advisor Pending",
      email: `adv_pend_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Pending Capital",
      licenseNumber: "ARN-PEND-704",
      approvalStatus: "pending",
      isEmailVerified: true,
    });
    createdAdvisorIds.push(advisorPending.id);

    const advisorSuspended = await Advisor.create({
      fullName: "Advisor Suspended",
      email: `adv_susp_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Suspended Capital",
      licenseNumber: "ARN-SUSP-705",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorSuspended.id, { approvalStatus: "suspended" });
    createdAdvisorIds.push(advisorSuspended.id);

    const advisorRejected = await Advisor.create({
      fullName: "Advisor Rejected",
      email: `adv_rej_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Rejected Capital",
      licenseNumber: "ARN-REJ-706",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorRejected.id, { approvalStatus: "rejected" });
    createdAdvisorIds.push(advisorRejected.id);

    const advisorUnverified = await Advisor.create({
      fullName: "Advisor Unverified",
      email: `adv_unver_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Unverified Capital",
      licenseNumber: "ARN-UNVER-707",
      approvalStatus: "approved",
      isEmailVerified: false,
    });
    createdAdvisorIds.push(advisorUnverified.id);

    // Date calculations for monthly clients
    const now = new Date();
    const thisMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 10));
    const lastMonthYear = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
    const lastMonth = now.getUTCMonth() === 0 ? 11 : now.getUTCMonth() - 1;
    const lastMonthDate = new Date(Date.UTC(lastMonthYear, lastMonth, 15));

    // User A1 (Client of Advisor A - Added THIS month)
    // Investments: invested 200,000, current 250,000. Loans: 500,000. Goals: 2.
    const userA1 = await User.create({
      fullName: "Alice Sharma",
      email: `alice_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    await User.update(userA1.id, {
      isProfileComplete: true,
      investments: [
        { id: "inv-1", type: "Mutual Funds", investedAmount: 200000, currentValue: 250000 },
      ],
      loans: [
        { id: "loan-1", type: "Personal Loan", outstandingAmount: 500000 },
      ],
      goals: [
        { id: "goal-1", name: "Vacation", targetAmount: 200000 },
        { id: "goal-2", name: "Emergency", targetAmount: 500000 },
      ],
    });
    createdUserIds.push(userA1.id);

    // User A2 (Client of Advisor A - Added LAST month)
    // Investments: invested 300,000, current 360,000. Loans: 1,500,000. Goals: 1.
    const userA2 = await User.create({
      fullName: "Ananya Kapoor",
      email: `ananya_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    await User.update(userA2.id, {
      isProfileComplete: true,
      investments: [
        { id: "inv-2", type: "Stocks", investedAmount: 300000, currentValue: 360000 },
      ],
      loans: [
        { id: "loan-2", type: "Home Loan", outstandingAmount: 1500000 },
      ],
      goals: [
        { id: "goal-3", name: "Retirement", targetAmount: 20000000 },
      ],
    });
    createdUserIds.push(userA2.id);

    // User A3 (Client of Advisor A - Added THIS month, with malformed/edge JSONB items)
    // Investments: invested 100,000, current 110,000 + 1 corrupted item. Loans: none. Goals: 1.
    const userA3 = await User.create({
      fullName: "Aarav Patel",
      email: `aarav_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    await User.update(userA3.id, {
      isProfileComplete: true,
      investments: [
        { id: "inv-3", type: "FD", investedAmount: "100000", currentValue: "110000" },
        null, // Malformed entry
        { invalidField: true }, // Empty values
      ],
      loans: null, // Null array
      goals: [
        { id: "goal-4", name: "Car", targetAmount: 800000 },
      ],
    });
    createdUserIds.push(userA3.id);

    // User B1 (Client of Advisor B)
    // Investments: invested 50,000, current 70,000. Loans: 100,000. Goals: 3.
    const userB1 = await User.create({
      fullName: "Bob Verma",
      email: `bob_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    await User.update(userB1.id, {
      isProfileComplete: true,
      investments: [
        { id: "inv-b1", type: "Crypto", investedAmount: 50000, currentValue: 70000 },
      ],
      loans: [
        { id: "loan-b1", type: "Car Loan", outstandingAmount: 100000 },
      ],
      goals: [
        { id: "goal-b1", name: "Bike" },
        { id: "goal-b2", name: "Laptop" },
        { id: "goal-b3", name: "House" },
      ],
    });
    createdUserIds.push(userB1.id);

    // User P1 (Pending client for Advisor A)
    const userP1 = await User.create({
      fullName: "Pending Peter",
      email: `peter_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(userP1.id);

    // User P2 (Invited client for Advisor A)
    const userP2 = await User.create({
      fullName: "Invited Ivan",
      email: `ivan_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(userP2.id);

    // Relationships for Advisor A:
    // 1. Rel A1 -> active (created/accepted this month)
    const relA1 = await AdvisorRelationship.create({
      advisorId: advisorA.id,
      userId: userA1.id,
      clientEmail: userA1.email,
      status: "active",
      initiatedBy: "advisor",
    });
    await db.query("UPDATE advisor_client_relationships SET accepted_at = $1, created_at = $1 WHERE id = $2", [thisMonthDate, relA1.id]);
    createdRelationshipIds.push(relA1.id);

    // 2. Rel A2 -> active (created/accepted last month)
    const relA2 = await AdvisorRelationship.create({
      advisorId: advisorA.id,
      userId: userA2.id,
      clientEmail: userA2.email,
      status: "active",
      initiatedBy: "advisor",
    });
    await db.query("UPDATE advisor_client_relationships SET accepted_at = $1, created_at = $1 WHERE id = $2", [lastMonthDate, relA2.id]);
    createdRelationshipIds.push(relA2.id);

    // 3. Rel A3 -> active (created/accepted this month)
    const relA3 = await AdvisorRelationship.create({
      advisorId: advisorA.id,
      userId: userA3.id,
      clientEmail: userA3.email,
      status: "active",
      initiatedBy: "advisor",
    });
    await db.query("UPDATE advisor_client_relationships SET accepted_at = $1, created_at = $1 WHERE id = $2", [thisMonthDate, relA3.id]);
    createdRelationshipIds.push(relA3.id);

    // 4. Rel P1 -> pending_user_acceptance (pending count)
    const relP1 = await AdvisorRelationship.create({
      advisorId: advisorA.id,
      userId: userP1.id,
      clientEmail: userP1.email,
      status: "pending_user_acceptance",
      initiatedBy: "user",
    });
    createdRelationshipIds.push(relP1.id);

    // 5. Rel P2 -> invited (pending count)
    const relP2 = await AdvisorRelationship.create({
      advisorId: advisorA.id,
      userId: userP2.id,
      clientEmail: userP2.email,
      status: "invited",
      initiatedBy: "advisor",
    });
    createdRelationshipIds.push(relP2.id);

    // Relationships for Advisor B:
    // Rel B1 -> active (created this month)
    const relB1 = await AdvisorRelationship.create({
      advisorId: advisorB.id,
      userId: userB1.id,
      clientEmail: userB1.email,
      status: "active",
      initiatedBy: "advisor",
    });
    createdRelationshipIds.push(relB1.id);

    // Admin & User for cross-role auth tests
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
    // PART 1: CORE METRICS ACCURACY TESTS (ADVISOR A)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 1: CORE METRICS ACCURACY ───");

    // Expected aggregates for Advisor A:
    // totalActiveClients: 3 (Alice, Ananya, Aarav)
    // pendingClientRequests: 2 (Peter [pending_user_acceptance], Ivan [invited])
    // totalInvestmentsCurrentValue: 250,000 + 360,000 + 110,000 = 720,000
    // totalInvestmentsAmount: 200,000 + 300,000 + 100,000 = 600,000
    // totalOutstandingLoans: 500,000 + 1,500,000 = 2,000,000
    // totalClientGoals: 2 + 1 + 1 = 4
    // totalClientsAddedThisMonth: 2 (Alice, Aarav)
    // totalClientsAddedLastMonth: 1 (Ananya)
    // clientGrowthPercentage: ((2 - 1) / 1) * 100 = 100%

    console.log("[Test 1] Approved advisor retrieves dashboard stats");
    const t1Res = await fetch(`${baseUrl}/dashboard/stats`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    const t1Data = await t1Res.json();
    assert(t1Res.status === 200, "Approved advisor receives HTTP 200");
    assert(t1Data.success === true, "Response success is true");
    assert(t1Data.data !== undefined, "Response data is present");

    const statsA = t1Data.data;

    // Test 2: totalActiveClients
    console.log("[Test 2] totalActiveClients");
    assert(statsA.totalActiveClients === 3, "totalActiveClients is exactly 3");

    // Test 3: pendingClientRequests
    console.log("[Test 3] pendingClientRequests");
    assert(statsA.pendingClientRequests === 2, "pendingClientRequests is exactly 2");

    // Test 4: totalInvestmentsCurrentValue
    console.log("[Test 4] totalInvestmentsCurrentValue");
    assert(statsA.totalInvestmentsCurrentValue === 720000, "totalInvestmentsCurrentValue is 720000");

    // Test 5: totalInvestmentsAmount
    console.log("[Test 5] totalInvestmentsAmount");
    assert(statsA.totalInvestmentsAmount === 600000, "totalInvestmentsAmount is 600000");

    // Test 6: totalOutstandingLoans
    console.log("[Test 6] totalOutstandingLoans");
    assert(statsA.totalOutstandingLoans === 2000000, "totalOutstandingLoans is 2000000");

    // Test 7: totalClientGoals
    console.log("[Test 7] totalClientGoals");
    assert(statsA.totalClientGoals === 4, "totalClientGoals is 4");

    // Test 8: totalClientsAddedThisMonth
    console.log("[Test 8] totalClientsAddedThisMonth");
    assert(statsA.totalClientsAddedThisMonth === 2, "totalClientsAddedThisMonth is 2");

    // Test 9: totalClientsAddedLastMonth
    console.log("[Test 9] totalClientsAddedLastMonth");
    assert(statsA.totalClientsAddedLastMonth === 1, "totalClientsAddedLastMonth is 1");

    // Test 10: clientGrowthPercentage
    console.log("[Test 10] clientGrowthPercentage");
    assert(statsA.clientGrowthPercentage === 100, "clientGrowthPercentage is 100%");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 2: ZERO STATE & EDGE CASE HANDLING
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 2: ZERO STATE & DIVISION-BY-ZERO SAFETY ───");

    // Test 11 & 12: Advisor C with zero clients
    console.log("[Test 11 & 12] Advisor with zero active clients");
    const tZeroRes = await fetch(`${baseUrl}/dashboard/stats`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorC}` },
    });
    const tZeroData = await tZeroRes.json();
    assert(tZeroRes.status === 200, "Zero client advisor receives HTTP 200");
    const statsC = tZeroData.data;
    assert(statsC.totalActiveClients === 0, "Zero active clients is 0");
    assert(statsC.pendingClientRequests === 0, "Zero pending requests is 0");
    assert(statsC.totalInvestmentsCurrentValue === 0, "Zero investments currentValue is 0");
    assert(statsC.totalInvestmentsAmount === 0, "Zero investments amount is 0");
    assert(statsC.totalOutstandingLoans === 0, "Zero loans is 0");
    assert(statsC.totalClientGoals === 0, "Zero goals is 0");
    assert(statsC.totalClientsAddedThisMonth === 0, "Zero clients this month is 0");
    assert(statsC.totalClientsAddedLastMonth === 0, "Zero clients last month is 0");
    assert(statsC.clientGrowthPercentage === 0, "clientGrowthPercentage is safely 0 (no NaN/Infinity)");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 3: MULTI-TENANT ISOLATION (ADVISOR A VS ADVISOR B)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 3: MULTI-TENANT ISOLATION ───");

    // Expected for Advisor B:
    // totalActiveClients: 1 (Bob)
    // totalInvestmentsCurrentValue: 70,000
    // totalInvestmentsAmount: 50,000
    // totalOutstandingLoans: 100,000
    // totalClientGoals: 3

    console.log("[Test 13, 14, 15] Cross-tenant isolation verification");
    const tBRes = await fetch(`${baseUrl}/dashboard/stats`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorB}` },
    });
    const tBData = await tBRes.json();
    const statsB = tBData.data;
    assert(statsB.totalActiveClients === 1, "Advisor B active clients is exactly 1");
    assert(statsB.totalInvestmentsCurrentValue === 70000, "Advisor B investments value is 70000 (not mixed with A)");
    assert(statsB.totalInvestmentsAmount === 50000, "Advisor B invested amount is 50000");
    assert(statsB.totalOutstandingLoans === 100000, "Advisor B loans is 100000");
    assert(statsB.totalClientGoals === 3, "Advisor B goals is 3");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 4: SECURITY GUARDS & SPOOFING RESISTANCE
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 4: SECURITY GUARDS & SPOOFING RESISTANCE ───");

    // Test 16: User session denied
    console.log("[Test 16] User session rejected");
    const tUserRes = await fetch(`${baseUrl}/dashboard/stats`, {
      headers: { Cookie: `sf_token=${tokenUser}` },
    });
    assert(tUserRes.status === 401 || tUserRes.status === 403, "User session rejected on advisor dashboard stats");

    // Test 17: Admin session denied
    console.log("[Test 17] Admin session rejected");
    const tAdminRes = await fetch(`${baseUrl}/dashboard/stats`, {
      headers: { Cookie: `sf_admin_token=${tokenAdmin}` },
    });
    assert(tAdminRes.status === 401 || tAdminRes.status === 403, "Admin session rejected on advisor dashboard stats");

    // Test 18: Pending advisor denied
    console.log("[Test 18] Pending advisor denied");
    const tPendRes = await fetch(`${baseUrl}/dashboard/stats`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorPending}` },
    });
    assert(tPendRes.status === 403, "Pending advisor returns HTTP 403");

    // Test 19: Suspended advisor denied
    console.log("[Test 19] Suspended advisor denied");
    const tSuspRes = await fetch(`${baseUrl}/dashboard/stats`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorSuspended}` },
    });
    assert(tSuspRes.status === 403, "Suspended advisor returns HTTP 403");

    // Test 20: Rejected advisor denied
    console.log("[Test 20] Rejected advisor denied");
    const tRejRes = await fetch(`${baseUrl}/dashboard/stats`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorRejected}` },
    });
    assert(tRejRes.status === 403, "Rejected advisor returns HTTP 403");

    // Test 21: Unverified advisor denied
    console.log("[Test 21] Unverified advisor denied");
    const tUnverRes = await fetch(`${baseUrl}/dashboard/stats`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorUnverified}` },
    });
    assert(tUnverRes.status === 403, "Unverified advisor returns HTTP 403");

    // Test 22: Missing session returns 401
    console.log("[Test 22] Missing session returns HTTP 401");
    const tNoAuthRes = await fetch(`${baseUrl}/dashboard/stats`);
    assert(tNoAuthRes.status === 401, "Missing session returns HTTP 401");

    // Test 23: advisorId query spoofing -> no effect
    console.log("[Test 23] Query spoofing with ?advisorId=AdvisorB");
    const tSpoofRes = await fetch(`${baseUrl}/dashboard/stats?advisorId=${advisorB.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    const tSpoofData = await tSpoofRes.json();
    assert(tSpoofData.data.totalActiveClients === 3, "Query spoofing ignored — returns strictly Advisor A stats (3)");
    assert(tSpoofData.data.totalInvestmentsCurrentValue === 720000, "Query spoofing ignored — returns Advisor A investments (720000)");

    // Test 24: Malformed JSONB handled safely
    console.log("[Test 24] Malformed JSONB array items handled safely");
    assert(!isNaN(statsA.totalInvestmentsCurrentValue), "Investments value is not NaN");
    assert(!isNaN(statsA.totalOutstandingLoans), "Loans value is not NaN");

    // Test 25: No sensitive fields returned
    console.log("[Test 25] Schema safety & zero sensitive PII exposure");
    const jsonA = JSON.stringify(t1Data);
    assert(!jsonA.includes("Alice"), "Response does NOT contain client name");
    assert(!jsonA.includes("password"), "Response does NOT contain password");
    assert(!jsonA.includes("jwt"), "Response does NOT contain jwt");
    assert(!jsonA.includes("otp"), "Response does NOT contain otp");

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
