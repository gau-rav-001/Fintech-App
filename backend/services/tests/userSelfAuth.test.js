// backend/services/tests/userSelfAuth.test.js
// ── Run: node services/tests/userSelfAuth.test.js ─────────────────────────────
// Phase 4.3: User Self-Authorization & Admin Global Access Review Test Suite

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
const {
  authenticate,
  requireUser,
  requireAdmin,
  requireAdvisor,
  requireProfileComplete,
  requireSelfUser,
  requireAdvisorClientAccess,
} = require("../../middleware/auth");
const {
  getProfile,
  updateProfile,
  getDashboardSummary,
} = require("../../controllers/userController");
const { ok, fail } = require("../../utils/response");

async function runTests() {
  console.log("\n==================================================================");
  console.log("  PHASE 4.3 — USER SELF-AUTHORIZATION & ADMIN GLOBAL ACCESS TESTS ");
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

  // Setup express test app with user routes & parametrized routes
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // 1. Session-derived standard user routes (Same as userRoutes.js)
  const userRouter = express.Router();
  userRouter.use(authenticate);
  userRouter.get("/profile", getProfile);
  userRouter.put("/update", updateProfile);
  userRouter.get("/dashboard/summary", requireProfileComplete, getDashboardSummary);

  // Parametrized resource route testing requireSelfUser
  userRouter.get("/resources/:userId", requireSelfUser, (req, res) => {
    return ok(res, {
      requestingActorId: req.user.id,
      requestingRole: req.user.role,
      targetUserId: req.params.userId,
    }, "User resource accessed.");
  });

  userRouter.put("/resources/:userId", requireSelfUser, (req, res) => {
    return ok(res, {
      requestingActorId: req.user.id,
      targetUserId: req.params.userId,
      body: req.body,
    }, "User resource updated.");
  });

  app.use("/api/user", userRouter);

  // 2. Admin platform-wide routes
  const adminRouter = express.Router();
  adminRouter.use(authenticate, requireAdmin);
  adminRouter.get("/users/:id", async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return fail(res, "User not found.", 404);
    return ok(res, { user });
  });
  app.use("/api/admin", adminRouter);

  // 3. Advisor scoped client route
  app.get("/api/advisor/clients/:clientId", requireAdvisor, requireAdvisorClientAccess, (req, res) => {
    return ok(res, {
      advisorId: req.advisor.id,
      targetClientId: req.targetClientId,
      relationshipId: req.clientRelationship.id,
    }, "Advisor client data access granted.");
  });

  // Start in-memory HTTP server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const createdUserIds = [];
  const createdAdvisorIds = [];
  const createdRelationshipIds = [];

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // FIXTURE SETUP
    // ══════════════════════════════════════════════════════════════════════════
    console.log("─── CREATING TEST FIXTURES ───");

    // User A (Alice)
    const userA = await User.create({
      fullName: "Alice Sharma",
      email: `alice_${Date.now()}@sf.test`,
      password: "AlicePassword2026!",
      isEmailVerified: true,
    });
    await User.update(userA.id, {
      isProfileComplete: true,
      incomeMonthly: 85000,
      expenses: [{ category: "Rent", amount: 25000 }],
      investments: [{ type: "Mutual Funds", investedAmount: 100000, currentValue: 120000 }],
    });
    createdUserIds.push(userA.id);

    // User B (Bob)
    const userB = await User.create({
      fullName: "Bob Varma",
      email: `bob_${Date.now()}@sf.test`,
      password: "BobPassword2026!",
      isEmailVerified: true,
    });
    await User.update(userB.id, {
      isProfileComplete: true,
      incomeMonthly: 120000,
      expenses: [{ category: "Mortgage", amount: 45000 }],
      investments: [{ type: "Stocks", investedAmount: 300000, currentValue: 380000 }],
    });
    createdUserIds.push(userB.id);

    // Admin (Platform Admin)
    const adminEmail = process.env.ADMIN_EMAIL || "harshvardhan.varma2023@vitbhopal.ac.in";
    let testAdmin = await Admin.findByEmail(adminEmail);
    if (!testAdmin) {
      testAdmin = await Admin.create({
        fullName: "Super Admin",
        email: `super_admin_${Date.now()}@smartfinance.test`,
        password: "SuperAdminPass2026!",
      });
    }

    // Advisor (Approved Advisor)
    const advisor = await Advisor.create({
      fullName: "Advisor Ramesh",
      email: `ramesh_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Ramesh Financials",
      licenseNumber: "ARN-999111",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisor.id, { approvalStatus: "approved", approvedAt: new Date() });
    createdAdvisorIds.push(advisor.id);

    // Relationship: Advisor -> User A (active)
    const rel = await AdvisorRelationship.create({
      advisorId: advisor.id,
      userId: userA.id,
      clientEmail: userA.email,
      status: "active",
      initiatedBy: "advisor",
    });
    createdRelationshipIds.push(rel.id);

    // Tokens
    const tokenUserA   = signToken(buildPayload(userA));
    const tokenUserB   = signToken(buildPayload(userB));
    const tokenAdmin   = signToken({ id: testAdmin.id, role: "admin", email: testAdmin.email });
    const tokenAdvisor = signToken(buildAdvisorPayload(advisor));

    console.log("✓ Fixtures created successfully.");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 1: USER SELF-AUTHORIZATION TESTS (12 CORE SCENARIOS)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 1: USER SELF-AUTHORIZATION TESTS ───");

    // ── Test 1: User A accesses own profile -> 200
    console.log("\n[Test 1] User A accesses own profile (/api/user/profile)");
    const t1Res = await fetch(`${baseUrl}/user/profile`, {
      headers: { Cookie: `sf_token=${tokenUserA}` },
    });
    const t1Data = await t1Res.json();
    assert(t1Res.status === 200, "User A granted access to own profile (HTTP 200)");
    assert(t1Data.data.user.id === userA.id, "Profile returned belongs strictly to User A");
    assert(t1Data.data.user.fullName === "Alice Sharma", "Correct user name returned");

    // ── Test 2: User A accesses User B's profile via parametrized route -> 403
    console.log("\n[Test 2] User A attempts to access User B's resource (/api/user/resources/:userBId)");
    const t2Res = await fetch(`${baseUrl}/user/resources/${userB.id}`, {
      headers: { Cookie: `sf_token=${tokenUserA}` },
    });
    const t2Data = await t2Res.json();
    assert(t2Res.status === 403, "User A denied access to User B's resource (HTTP 403 Forbidden)");
    assert(t2Data.errors?.code === "USER_RESOURCE_FORBIDDEN", "Error code is USER_RESOURCE_FORBIDDEN");

    // ── Test 3: User A updates own profile -> 200
    console.log("\n[Test 3] User A updates own profile (/api/user/update)");
    const t3Res = await fetch(`${baseUrl}/user/update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_token=${tokenUserA}`,
      },
      body: JSON.stringify({ occupation: "Senior Software Architect" }),
    });
    const t3Data = await t3Res.json();
    assert(t3Res.status === 200, "User A updated own profile (HTTP 200)");
    assert(t3Data.data.user.occupation === "Senior Software Architect", "Updated occupation persisted");

    // ── Test 4: User A attempts to update User B's resource via parametrized route -> 403
    console.log("\n[Test 4] User A attempts to update User B's resource (/api/user/resources/:userBId)");
    const t4Res = await fetch(`${baseUrl}/user/resources/${userB.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_token=${tokenUserA}`,
      },
      body: JSON.stringify({ occupation: "Hacked by User A" }),
    });
    assert(t4Res.status === 403, "User A denied from updating User B's resource (HTTP 403 Forbidden)");

    // ── Test 5: body.userId tampering in session-derived route cannot alter target
    console.log("\n[Test 5] User A supplies body.userId = User B on /api/user/update");
    const t5Res = await fetch(`${baseUrl}/user/update`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_token=${tokenUserA}`,
      },
      body: JSON.stringify({
        userId: userB.id,
        occupation: "Malicious Attempt",
      }),
    });
    const t5Data = await t5Res.json();
    assert(t5Res.status === 200, "Request completes on User A's own session");
    assert(t5Data.data.user.id === userA.id, "Profile modified is User A, NOT User B");

    // Verify User B remained untouched in DB
    const freshUserB = await User.findById(userB.id);
    assert(freshUserB.occupation !== "Malicious Attempt", "User B data remained unmodified in database");

    // ── Test 6: query.userId tampering cannot alter target
    console.log("\n[Test 6] User A supplies ?userId=UserB on /api/user/profile");
    const t6Res = await fetch(`${baseUrl}/user/profile?userId=${userB.id}`, {
      headers: { Cookie: `sf_token=${tokenUserA}` },
    });
    const t6Data = await t6Res.json();
    assert(t6Res.status === 200, "Profile response returns User A");
    assert(t6Data.data.user.id === userA.id, "Returned profile is strictly User A despite query param");

    // ── Test 7: User financial data remains strictly self-scoped
    console.log("\n[Test 7] User A accesses dashboard summary (/api/user/dashboard/summary)");
    const t7Res = await fetch(`${baseUrl}/user/dashboard/summary`, {
      headers: { Cookie: `sf_token=${tokenUserA}` },
    });
    const t7Data = await t7Res.json();
    assert(t7Res.status === 200, "Dashboard summary calculated for User A");
    assert(t7Data.data.monthlyIncome === 85000, "Financial data reflects User A's income (85000), not User B (120000)");
    assert(t7Data.data.totalInvested === 100000, "Financial data reflects User A's investments (100000)");

    // ── Test 8: Admin can access another user's data (Platform-wide global access)
    console.log("\n[Test 8] Admin accesses User A data (/api/admin/users/:userAId)");
    const t8Res = await fetch(`${baseUrl}/admin/users/${userA.id}`, {
      headers: { Cookie: `sf_admin_token=${tokenAdmin}` },
    });
    const t8Data = await t8Res.json();
    assert(t8Res.status === 200, "Admin granted platform-wide access to User A (HTTP 200)");
    assert(t8Data.data.user.id === userA.id, "Admin retrieved User A record");

    // Admin access via requireSelfUser route
    const adminOnSelfRes = await fetch(`${baseUrl}/user/resources/${userA.id}`, {
      headers: { Cookie: `sf_admin_token=${tokenAdmin}` },
    });
    assert(adminOnSelfRes.status === 200, "Admin granted global override on requireSelfUser route (HTTP 200)");

    // ── Test 9: Advisor without active relationship cannot access user
    console.log("\n[Test 9] Advisor attempts to access User B (No relationship)");
    const t9Res = await fetch(`${baseUrl}/advisor/clients/${userB.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisor}` },
    });
    assert(t9Res.status === 403, "Advisor without active relationship blocked (HTTP 403 Forbidden)");

    // ── Test 10: Advisor with active relationship is governed by advisor client guard
    console.log("\n[Test 10] Advisor accesses User A (Active relationship)");
    const t10Res = await fetch(`${baseUrl}/advisor/clients/${userA.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisor}` },
    });
    const t10Data = await t10Res.json();
    assert(t10Res.status === 200, "Advisor with active relationship granted access (HTTP 200)");
    assert(t10Data.data.targetClientId === userA.id, "Correct client relationship confirmed");

    // ── Test 11: Missing user session -> 401
    console.log("\n[Test 11] Unauthenticated request to /api/user/profile");
    const t11Res = await fetch(`${baseUrl}/user/profile`);
    assert(t11Res.status === 401, "Missing session returns HTTP 401 Unauthorised");

    // ── Test 12: Wrong role (Advisor token sent directly to /api/user routes) -> 401/403
    console.log("\n[Test 12] Advisor token sent directly to /api/user/profile");
    const t12Res = await fetch(`${baseUrl}/user/profile`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisor}` },
    });
    assert(t12Res.status === 401 || t12Res.status === 403, "Advisor session rejected from direct User self endpoint");

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
