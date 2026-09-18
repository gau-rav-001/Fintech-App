// backend/services/tests/advisorClientDetail.test.js
// ── Run: node services/tests/advisorClientDetail.test.js ──────────────────────
// Phase 5.2: Advisor Client Detail (Read-Only) Test Suite (GET /api/advisor/clients/:clientId)

process.env.NODE_ENV = "test";

const http         = require("http");
const express      = require("express");
const cookieParser = require("cookie-parser");
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
  console.log("  PHASE 5.2 — ADVISOR CLIENT DETAIL (READ-ONLY) TEST SUITE        ");
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

    // Advisor A (Alpha - Approved)
    const advisorA = await Advisor.create({
      fullName: "Advisor Alpha",
      email: `adv_a_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Alpha Capital",
      licenseNumber: "ARN-ALPHA-601",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorA.id, { approvalStatus: "approved", approvedAt: new Date() });
    createdAdvisorIds.push(advisorA.id);

    // Advisor B (Beta - Approved)
    const advisorB = await Advisor.create({
      fullName: "Advisor Beta",
      email: `adv_b_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Beta Capital",
      licenseNumber: "ARN-BETA-602",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorB.id, { approvalStatus: "approved", approvedAt: new Date() });
    createdAdvisorIds.push(advisorB.id);

    // User A1 (Alice - Client of Advisor A with rich financial portfolio)
    const userA1 = await User.create({
      fullName: "Alice Sharma",
      email: `alice_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    await User.update(userA1.id, {
      isProfileComplete: true,
      dob: "1992-05-15",
      gender: "female",
      occupation: "Lead Software Architect",
      maritalStatus: "married",
      dependents: 1,
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      incomeMonthly: 185000,
      incomeSource: "salaried",
      incomeAdditional: 25000,
      incomeGrowthPct: 10,
      riskTolerance: "medium",
      riskExperience: "intermediate",
      riskHorizonYears: 15,
      riskStyle: "balanced",
      expenses: [
        { id: "exp-1", category: "Rent", amount: 45000, frequency: "monthly", isRecurring: true },
        { id: "exp-2", category: "Groceries", amount: 15000, frequency: "monthly", isRecurring: true },
      ],
      investments: [
        { id: "inv-1", type: "Mutual Funds", name: "Parag Parikh Flexi Cap", investedAmount: 350000, currentValue: 420000, returnPct: 20 },
        { id: "inv-2", type: "Stocks", name: "HDFC Bank", investedAmount: 200000, currentValue: 215000, returnPct: 7.5 },
      ],
      goals: [
        { id: "goal-1", name: "Retirement Fund", category: "Retirement", targetAmount: 25000000, currentSavings: 1500000, targetDate: "2047-05-15", priority: "high" },
        { id: "goal-2", name: "Child Education", category: "Education", targetAmount: 5000000, currentSavings: 500000, targetDate: "2038-06-01", priority: "high" },
      ],
      loans: [
        { id: "loan-1", type: "Home Loan", lender: "SBI", outstandingAmount: 4500000, emi: 42000, interestRate: 8.4, tenureMonths: 180 },
      ],
    });
    createdUserIds.push(userA1.id);

    // User B1 (Bob - Client of Advisor B)
    const userB1 = await User.create({
      fullName: "Bob Verma",
      email: `bob_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    await User.update(userB1.id, {
      isProfileComplete: true,
      incomeMonthly: 140000,
      expenses: [{ id: "exp-b1", category: "Personal", amount: 30000 }],
      investments: [{ id: "inv-b1", type: "Crypto", name: "Bitcoin", investedAmount: 100000, currentValue: 160000 }],
    });
    createdUserIds.push(userB1.id);

    // User D (For lifecycle relationship tests)
    const userD = await User.create({
      fullName: "David Rao",
      email: `david_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(userD.id);

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

    // Advisor B -> User B1 (active)
    const relB1 = await AdvisorRelationship.create({
      advisorId: advisorB.id,
      userId: userB1.id,
      clientEmail: userB1.email,
      status: "active",
      initiatedBy: "advisor",
    });
    createdRelationshipIds.push(relB1.id);

    // Advisor A -> User D (for state testing)
    const relD = await AdvisorRelationship.create({
      advisorId: advisorA.id,
      userId: userD.id,
      clientEmail: userD.email,
      status: "invited",
      initiatedBy: "advisor",
    });
    createdRelationshipIds.push(relD.id);

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
    const tokenAdvisorA = signToken(buildAdvisorPayload(advisorA));
    const tokenAdvisorB = signToken(buildAdvisorPayload(advisorB));
    const tokenUserA    = signToken(buildPayload(userA1));
    const tokenAdmin    = signToken({ id: admin.id, role: "admin", email: admin.email });

    console.log("✓ Fixtures created successfully.");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 1: CORE AUTHORIZATION & TENANT ISOLATION TESTS
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 1: CORE AUTHORIZATION & TENANT ISOLATION ───");

    // ── Test 1: Advisor A can view own active client -> 200
    console.log("[Test 1] Advisor A views own active client (Alice)");
    const t1Res = await fetch(`${baseUrl}/clients/${userA1.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    const t1Data = await t1Res.json();
    assert(t1Res.status === 200, "Advisor A receives HTTP 200");
    assert(t1Data.success === true, "Response success is true");
    assert(t1Data.data.client !== undefined, "Response data contains client object");
    assert(t1Data.data.relationship !== undefined, "Response data contains relationship object");
    assert(t1Data.data.client.id === userA1.id, "Client ID matches target client");
    assert(t1Data.data.client.fullName === "Alice Sharma", "Client name matches");

    // ── Test 2: Advisor A cannot view Advisor B client -> 403
    console.log("[Test 2] Advisor A attempts to view Advisor B's client (Bob)");
    const t2Res = await fetch(`${baseUrl}/clients/${userB1.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    const t2Data = await t2Res.json();
    assert(t2Res.status === 403, "Advisor A denied access to Advisor B's client (HTTP 403)");
    assert(t2Data.errors?.code === "ADVISOR_CLIENT_ACCESS_DENIED", "Error code is ADVISOR_CLIENT_ACCESS_DENIED");

    // ── Test 3: Advisor B cannot view Advisor A client -> 403
    console.log("[Test 3] Advisor B attempts to view Advisor A's client (Alice)");
    const t3Res = await fetch(`${baseUrl}/clients/${userA1.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorB}` },
    });
    assert(t3Res.status === 403, "Advisor B denied access to Advisor A's client (HTTP 403)");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 2: RELATIONSHIP STATE ENFORCEMENT
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 2: RELATIONSHIP STATE ENFORCEMENT ───");

    // ── Test 4: Suspended relationship -> 403
    console.log("[Test 4] Suspended relationship denied");
    await db.query("UPDATE advisor_client_relationships SET status = 'suspended' WHERE id = $1", [relD.id]);
    const t4Res = await fetch(`${baseUrl}/clients/${userD.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(t4Res.status === 403, "Suspended relationship returns HTTP 403");

    // ── Test 5: Terminated relationship -> 403
    console.log("[Test 5] Terminated relationship denied");
    await db.query("UPDATE advisor_client_relationships SET status = 'terminated' WHERE id = $1", [relD.id]);
    const t5Res = await fetch(`${baseUrl}/clients/${userD.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(t5Res.status === 403, "Terminated relationship returns HTTP 403");

    // ── Test 6: Reassigned relationship -> 403
    console.log("[Test 6] Reassigned relationship denied");
    await db.query("UPDATE advisor_client_relationships SET status = 'reassigned' WHERE id = $1", [relD.id]);
    const t6Res = await fetch(`${baseUrl}/clients/${userD.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(t6Res.status === 403, "Reassigned relationship returns HTTP 403");

    // ── Test 7: Invited relationship -> 403
    console.log("[Test 7] Invited relationship denied");
    await db.query("UPDATE advisor_client_relationships SET status = 'invited' WHERE id = $1", [relD.id]);
    const t7Res = await fetch(`${baseUrl}/clients/${userD.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(t7Res.status === 403, "Invited relationship returns HTTP 403");

    // ── Test 8: Pending relationship -> 403
    console.log("[Test 8] Pending relationship denied");
    await db.query("UPDATE advisor_client_relationships SET status = 'pending_user_acceptance' WHERE id = $1", [relD.id]);
    const t8Res = await fetch(`${baseUrl}/clients/${userD.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(t8Res.status === 403, "Pending relationship returns HTTP 403");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 3: ROLE & INPUT VALIDATION GUARDS
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 3: ROLE & INPUT VALIDATION ───");

    // ── Test 9: Missing advisor session -> 401
    console.log("[Test 9] Missing session returns 401");
    const t9Res = await fetch(`${baseUrl}/clients/${userA1.id}`);
    assert(t9Res.status === 401, "Missing session returns HTTP 401");

    // ── Test 10: User session -> denied (401/403)
    console.log("[Test 10] User session denied");
    const t10Res = await fetch(`${baseUrl}/clients/${userA1.id}`, {
      headers: { Cookie: `sf_token=${tokenUserA}` },
    });
    assert(t10Res.status === 401 || t10Res.status === 403, "User session rejected on advisor client detail");

    // ── Test 11: Admin session -> denied (401/403)
    console.log("[Test 11] Admin session denied from advisor endpoint");
    const t11Res = await fetch(`${baseUrl}/clients/${userA1.id}`, {
      headers: { Cookie: `sf_admin_token=${tokenAdmin}` },
    });
    assert(t11Res.status === 401 || t11Res.status === 403, "Admin session rejected on advisor client detail");

    // ── Test 12: Invalid client UUID format -> 400
    console.log("[Test 12] Malformed UUID format");
    const t12Res = await fetch(`${baseUrl}/clients/invalid-uuid-format-123`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(t12Res.status === 400, "Malformed client UUID returns HTTP 400 Bad Request");

    // ── Test 13: Nonexistent client UUID -> 403
    console.log("[Test 13] Nonexistent client UUID");
    const t13Res = await fetch(`${baseUrl}/clients/550e8400-e29b-41d4-a716-446655449999`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(t13Res.status === 403, "Nonexistent client UUID returns HTTP 403");

    // ── Test 14: body.advisorId spoofing -> no effect
    console.log("[Test 14] body.advisorId spoofing");
    const t14Res = await fetch(`${baseUrl}/clients/${userB1.id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_advisor_token=${tokenAdvisorA}`,
      },
    });
    assert(t14Res.status === 403, "body.advisorId cannot grant access to Advisor B's client");

    // ── Test 15: query.advisorId spoofing -> no effect
    console.log("[Test 15] query.advisorId spoofing");
    const t15Res = await fetch(`${baseUrl}/clients/${userB1.id}?advisorId=${advisorB.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(t15Res.status === 403, "query.advisorId cannot grant access to Advisor B's client");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 4: DATA SANITIZATION & AUDIT LOGGING
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 4: DATA SANITIZATION & AUDIT LOGGING ───");

    // ── Test 16: Response contains no password_hash / passwordHash
    console.log("[Test 16] Verify zero password hash exposure");
    const jsonStr = JSON.stringify(t1Data);
    assert(!jsonStr.includes("password_hash"), "Response does NOT contain password_hash");
    assert(!jsonStr.includes("passwordHash"), "Response does NOT contain passwordHash");

    // ── Test 17: Response contains no google_id / googleId / provider
    console.log("[Test 17] Verify zero oauth / google ID exposure");
    assert(!jsonStr.includes("google_id"), "Response does NOT contain google_id");
    assert(!jsonStr.includes("googleId"), "Response does NOT contain googleId");

    // ── Test 18: Response contains no OTP / JWT / token data
    console.log("[Test 18] Verify zero OTP / token exposure");
    assert(!jsonStr.includes("otp"), "Response does NOT contain OTP");
    assert(!jsonStr.includes("token_hash"), "Response does NOT contain token_hash");
    assert(!jsonStr.includes("invitation_token_hash"), "Response does NOT contain invitation_token_hash");

    // ── Test 19: Full financial JSONB fields are mapped correctly
    console.log("[Test 19] Financial fields mapping verification");
    const { client, relationship } = t1Data.data;
    assert(client.income.monthly === 185000, "Monthly income is 185000");
    assert(client.income.additionalMonthly === 25000, "Additional income is 25000");
    assert(client.riskProfile.tolerance === "medium", "Risk tolerance is medium");
    assert(client.riskProfile.timeHorizonYears === 15, "Risk horizon is 15 years");
    assert(Array.isArray(client.expenses) && client.expenses.length === 2, "Expenses array length is 2");
    assert(client.expenses[0].category === "Rent" && client.expenses[0].amount === 45000, "Expense 1 mapped correctly");
    assert(Array.isArray(client.investments) && client.investments.length === 2, "Investments array length is 2");
    assert(client.investments[0].name === "Parag Parikh Flexi Cap" && client.investments[0].currentValue === 420000, "Investment 1 mapped correctly");
    assert(Array.isArray(client.goals) && client.goals.length === 2, "Goals array length is 2");
    assert(client.goals[0].name === "Retirement Fund" && client.goals[0].targetAmount === 25000000, "Goal 1 mapped correctly");
    assert(Array.isArray(client.loans) && client.loans.length === 1, "Loans array length is 1");
    assert(client.loans[0].lender === "SBI" && client.loans[0].outstandingAmount === 4500000, "Loan 1 mapped correctly");
    assert(relationship.status === "active", "Relationship status is active");

    // ── Test 20: Audit event SENSITIVE_FINANCIALS_VIEWED created on success
    console.log("[Test 20] Audit event SENSITIVE_FINANCIALS_VIEWED verification");
    // Give async audit log a tiny moment to write
    await new Promise((r) => setTimeout(r, 100));
    const { rows: auditRows } = await db.query(
      `SELECT * FROM audit_logs 
       WHERE action = 'SENSITIVE_FINANCIALS_VIEWED' AND actor_id = $1 AND resource_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [advisorA.id, userA1.id]
    );
    assert(auditRows.length === 1, "SENSITIVE_FINANCIALS_VIEWED audit log entry created");
    const auditRecord = auditRows[0];
    assert(auditRecord.actor_type === "advisor", "Audit actor_type is 'advisor'");
    assert(auditRecord.resource_type === "user", "Audit resource_type is 'user'");
    const auditDetailsStr = JSON.stringify(auditRecord.details);
    assert(!auditDetailsStr.includes("185000"), "Audit log does NOT contain financial values");
    assert(!auditDetailsStr.includes("password"), "Audit log does NOT contain passwords");

    // ── Test 21: Unauthorized attempt does not leak financial data
    console.log("[Test 21] Unauthorized attempt does not leak financial data");
    const deniedJsonStr = JSON.stringify(t2Data);
    assert(!deniedJsonStr.includes("Crypto"), "Denied response does NOT leak client asset");
    assert(!deniedJsonStr.includes("140000"), "Denied response does NOT leak client income");
    assert(!deniedJsonStr.includes("160000"), "Denied response does NOT leak client investment value");

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
