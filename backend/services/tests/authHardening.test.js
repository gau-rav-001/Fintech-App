// backend/services/tests/authHardening.test.js
// ── Run: node services/tests/authHardening.test.js ────────────────────────────
// Phase 4.4: Authorization Hardening & Privilege Escalation Attack Matrix Tests

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
const {
  authenticate,
  requireUser,
  requireAdmin,
  requireAdvisor,
  requireAdvisorSession,
  requireProfileComplete,
  requireSelfUser,
  requireAdvisorClientAccess,
} = require("../../middleware/auth");
const {
  getProfile,
  updateProfile,
  getDashboardSummary,
} = require("../../controllers/userController");
const {
  getAllUsers,
  getUserById,
  getPlatformStats,
} = require("../../controllers/adminController");
const { ok, fail } = require("../../utils/response");

async function runTests() {
  console.log("\n==================================================================");
  console.log("  PHASE 4.4 — AUTHORIZATION HARDENING & PRIVILEGE ESCALATION      ");
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

  // Setup express test app with complete role & resource routing
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // ── Admin routes ──
  const adminRouter = express.Router();
  adminRouter.use(authenticate, requireAdmin);
  adminRouter.get("/users", getAllUsers);
  adminRouter.get("/users/:id", getUserById);
  adminRouter.get("/stats", getPlatformStats);
  adminRouter.get("/advisors/:advisorId", async (req, res) => {
    const adv = await Advisor.findById(req.params.advisorId);
    if (!adv) return fail(res, "Advisor not found.", 404);
    return ok(res, { advisor: adv });
  });
  app.use("/api/admin", adminRouter);

  // ── User routes ──
  const userRouter = express.Router();
  userRouter.use(authenticate);
  userRouter.get("/profile", requireUser, getProfile);
  userRouter.put("/update", requireUser, updateProfile);
  userRouter.get("/dashboard/summary", requireUser, requireProfileComplete, getDashboardSummary);
  userRouter.get("/resources/:userId", requireSelfUser, (req, res) => {
    return ok(res, { targetUserId: req.params.userId, actor: req.user.id }, "User resource granted.");
  });
  userRouter.put("/resources/:userId", requireSelfUser, (req, res) => {
    return ok(res, { targetUserId: req.params.userId, body: req.body }, "User resource updated.");
  });
  app.use("/api/user", userRouter);

  // ── Advisor routes ──
  const advisorRouter = express.Router();
  advisorRouter.use(requireAdvisor);
  advisorRouter.get("/portal", (req, res) => {
    return ok(res, { advisorId: req.advisor.id }, "Advisor portal accessed.");
  });
  advisorRouter.get("/clients/:clientId", requireAdvisorClientAccess, (req, res) => {
    return ok(res, {
      advisorId: req.advisor.id,
      targetClientId: req.targetClientId,
      relationshipId: req.clientRelationship.id,
      status: req.clientRelationship.status,
    }, "Client access granted.");
  });
  advisorRouter.put("/clients/:clientId", requireAdvisorClientAccess, (req, res) => {
    return ok(res, {
      advisorId: req.advisor.id,
      targetClientId: req.targetClientId,
      body: req.body,
    }, "Client updated.");
  });
  app.use("/api/advisor", advisorRouter);

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
    console.log("─── CREATING ISOLATED TEST FIXTURES ───");

    // Admin A
    const adminEmail = process.env.ADMIN_EMAIL || "harshvardhan.varma2023@vitbhopal.ac.in";
    let adminA = await Admin.findByEmail(adminEmail);
    if (!adminA) {
      adminA = await Admin.create({
        fullName: "Super Admin A",
        email: `super_admin_${Date.now()}@smartfinance.test`,
        password: "AdminPassword2026!",
      });
    }

    // Advisor A (Approved, owns User A, User B)
    const advisorA = await Advisor.create({
      fullName: "Advisor Alpha",
      email: `adv_alpha_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Alpha Capital",
      licenseNumber: "ARN-ALPHA-100",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorA.id, { approvalStatus: "approved", approvedAt: new Date() });
    createdAdvisorIds.push(advisorA.id);

    // Advisor B (Approved, owns User C)
    const advisorB = await Advisor.create({
      fullName: "Advisor Beta",
      email: `adv_beta_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Beta Capital",
      licenseNumber: "ARN-BETA-200",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorB.id, { approvalStatus: "approved", approvedAt: new Date() });
    createdAdvisorIds.push(advisorB.id);

    // Advisor C (Approved, no active clients)
    const advisorC = await Advisor.create({
      fullName: "Advisor Gamma",
      email: `adv_gamma_${Date.now()}@smartfinance.test`,
      password: "AdvisorPass2026!",
      firmName: "Gamma Capital",
      licenseNumber: "ARN-GAMMA-300",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(advisorC.id, { approvalStatus: "approved", approvedAt: new Date() });
    createdAdvisorIds.push(advisorC.id);

    // User A (Client of Advisor A)
    const userA = await User.create({
      fullName: "User Alice",
      email: `alice_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    await User.update(userA.id, {
      isProfileComplete: true,
      incomeMonthly: 90000,
      expenses: [{ category: "Rent", amount: 30000 }],
      investments: [{ type: "Mutual Funds", investedAmount: 150000, currentValue: 180000 }],
    });
    createdUserIds.push(userA.id);

    // User B (Client of Advisor A)
    const userB = await User.create({
      fullName: "User Bob",
      email: `bob_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    await User.update(userB.id, {
      isProfileComplete: true,
      incomeMonthly: 110000,
      expenses: [{ category: "EMI", amount: 40000 }],
      investments: [{ type: "Stocks", investedAmount: 250000, currentValue: 310000 }],
    });
    createdUserIds.push(userB.id);

    // User C (Client of Advisor B)
    const userC = await User.create({
      fullName: "User Charlie",
      email: `charlie_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    await User.update(userC.id, {
      isProfileComplete: true,
      incomeMonthly: 140000,
      expenses: [{ category: "Living", amount: 50000 }],
      investments: [{ type: "Real Estate", investedAmount: 1000000, currentValue: 1200000 }],
    });
    createdUserIds.push(userC.id);

    // User D (Unassigned User)
    const userD = await User.create({
      fullName: "User David",
      email: `david_${Date.now()}@sf.test`,
      password: "UserPass2026!",
      isEmailVerified: true,
    });
    await User.update(userD.id, {
      isProfileComplete: true,
      incomeMonthly: 60000,
      expenses: [{ category: "Personal", amount: 20000 }],
    });
    createdUserIds.push(userD.id);

    // Relationships:
    // Advisor A -> User A (active)
    const relA_A = await AdvisorRelationship.create({
      advisorId: advisorA.id,
      userId: userA.id,
      clientEmail: userA.email,
      status: "active",
      initiatedBy: "advisor",
    });
    createdRelationshipIds.push(relA_A.id);

    // Advisor A -> User B (active)
    const relA_B = await AdvisorRelationship.create({
      advisorId: advisorA.id,
      userId: userB.id,
      clientEmail: userB.email,
      status: "active",
      initiatedBy: "advisor",
    });
    createdRelationshipIds.push(relA_B.id);

    // Advisor B -> User C (active)
    const relB_C = await AdvisorRelationship.create({
      advisorId: advisorB.id,
      userId: userC.id,
      clientEmail: userC.email,
      status: "active",
      initiatedBy: "advisor",
    });
    createdRelationshipIds.push(relB_C.id);

    // State testing relationships for User D (initially 'invited')
    const relA_D = await AdvisorRelationship.create({
      advisorId: advisorA.id,
      userId: userD.id,
      clientEmail: userD.email,
      status: "invited",
      initiatedBy: "advisor",
    });
    createdRelationshipIds.push(relA_D.id);

    // Tokens
    const tokenAdminA   = signToken({ id: adminA.id, role: "admin", email: adminA.email });
    const tokenAdvisorA = signToken(buildAdvisorPayload(advisorA));
    const tokenAdvisorB = signToken(buildAdvisorPayload(advisorB));
    const tokenAdvisorC = signToken(buildAdvisorPayload(advisorC));
    const tokenUserA    = signToken(buildPayload(userA));
    const tokenUserB    = signToken(buildPayload(userB));
    const tokenUserC    = signToken(buildPayload(userC));

    console.log("✓ Test fixtures created successfully.");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 1 — USER PRIVILEGE ESCALATION
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── TEST 1: USER PRIVILEGE ESCALATION ───");

    // 1. User A attempts Admin route
    console.log("[1.1] User A attempts /api/admin/users");
    const uAtkAdmin = await fetch(`${baseUrl}/admin/users`, {
      headers: { Cookie: `sf_token=${tokenUserA}` },
    });
    assert(uAtkAdmin.status === 403, "User denied access to admin users list (HTTP 403)");

    // 2. User A attempts Advisor route
    console.log("[1.2] User A attempts /api/advisor/portal");
    const uAtkAdv = await fetch(`${baseUrl}/advisor/portal`, {
      headers: { Cookie: `sf_token=${tokenUserA}` },
    });
    assert(uAtkAdv.status === 401, "User denied access to advisor portal (HTTP 401)");

    // 3. User A attempts Advisor client route
    console.log("[1.3] User A attempts /api/advisor/clients/:clientId");
    const uAtkAdvClient = await fetch(`${baseUrl}/advisor/clients/${userB.id}`, {
      headers: { Cookie: `sf_token=${tokenUserA}` },
    });
    assert(uAtkAdvClient.status === 401, "User denied access to advisor client route (HTTP 401)");

    // 4. User A attempts User B resource
    console.log("[1.4] User A attempts /api/user/resources/:userBId");
    const uAtkUserB = await fetch(`${baseUrl}/user/resources/${userB.id}`, {
      headers: { Cookie: `sf_token=${tokenUserA}` },
    });
    assert(uAtkUserB.status === 403, "User A denied access to User B's resource (HTTP 403)");

    // 5. User A attempts User B financial resource
    console.log("[1.5] User A requests /api/user/dashboard/summary");
    const uAtkFin = await fetch(`${baseUrl}/user/dashboard/summary`, {
      headers: { Cookie: `sf_token=${tokenUserA}` },
    });
    const uAtkFinData = await uAtkFin.json();
    assert(uAtkFin.status === 200, "Dashboard returns only User A's data");
    assert(uAtkFinData.data.monthlyIncome === 90000, "Income reflects User A (90000), not User B (110000)");

    // 6. Body tampering with userId
    console.log("[1.6] User A body tampering on /api/user/update with userId: User B");
    const uAtkBody = await fetch(`${baseUrl}/user/update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: `sf_token=${tokenUserA}` },
      body: JSON.stringify({ userId: userB.id, occupation: "Malicious Tampering" }),
    });
    const uAtkBodyData = await uAtkBody.json();
    assert(uAtkBody.status === 200, "Update executes strictly on User A's session");
    assert(uAtkBodyData.data.user.id === userA.id, "Modified user is User A");
    const checkUserB = await User.findById(userB.id);
    assert(checkUserB.occupation !== "Malicious Tampering", "User B is completely untouched in DB");

    // 7. Query tampering with userId
    console.log("[1.7] User A query tampering with ?userId=UserB");
    const uAtkQuery = await fetch(`${baseUrl}/user/profile?userId=${userB.id}`, {
      headers: { Cookie: `sf_token=${tokenUserA}` },
    });
    const uAtkQueryData = await uAtkQuery.json();
    assert(uAtkQueryData.data.user.id === userA.id, "Profile query returns User A, ignoring query.userId");

    // 8. advisorId spoofing
    console.log("[1.8] User A supplies advisorId in body");
    const uAtkAdvId = await fetch(`${baseUrl}/user/update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: `sf_token=${tokenUserA}` },
      body: JSON.stringify({ advisorId: advisorA.id }),
    });
    assert(uAtkAdvId.status === 200, "User update succeeds without role escalation");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 2 — ADVISOR PRIVILEGE ESCALATION
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── TEST 2: ADVISOR PRIVILEGE ESCALATION ───");

    // 1. Admin route
    console.log("[2.1] Advisor A attempts /api/admin/stats");
    const advAtkAdmin = await fetch(`${baseUrl}/admin/stats`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(advAtkAdmin.status === 401 || advAtkAdmin.status === 403, "Advisor denied access to admin stats");

    // 2. Admin user management
    console.log("[2.2] Advisor A attempts /api/admin/users");
    const advAtkUsers = await fetch(`${baseUrl}/admin/users`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(advAtkUsers.status === 401 || advAtkUsers.status === 403, "Advisor denied access to admin users API");

    // 3. Advisor B's client (User C)
    console.log("[2.3] Advisor A attempts /api/advisor/clients/:userCId");
    const advAtkClientC = await fetch(`${baseUrl}/advisor/clients/${userC.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(advAtkClientC.status === 403, "Advisor A denied access to Advisor B's client (HTTP 403)");

    // 4. Unassigned user (User D)
    console.log("[2.4] Advisor A attempts /api/advisor/clients/:userDId (invited status)");
    const advAtkClientD = await fetch(`${baseUrl}/advisor/clients/${userD.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(advAtkClientD.status === 403, "Advisor A denied access to non-active client (HTTP 403)");

    // 5. Body advisorId spoofing
    console.log("[2.5] Advisor A attempts body { advisorId: Advisor B }");
    const advAtkBody = await fetch(`${baseUrl}/advisor/clients/${userC.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: `sf_advisor_token=${tokenAdvisorA}` },
      body: JSON.stringify({ advisorId: advisorB.id }),
    });
    assert(advAtkBody.status === 403, "Body advisorId spoofing blocked (HTTP 403)");

    // 6. Query advisorId spoofing
    console.log("[2.6] Advisor A attempts ?advisorId=AdvisorB");
    const advAtkQuery = await fetch(`${baseUrl}/advisor/clients/${userC.id}?advisorId=${advisorB.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(advAtkQuery.status === 403, "Query advisorId spoofing blocked (HTTP 403)");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 3 — ADMIN GLOBAL ACCESS
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── TEST 3: ADMIN GLOBAL ACCESS ───");

    // Admin accesses User A, B, C
    const admUserA = await fetch(`${baseUrl}/admin/users/${userA.id}`, { headers: { Cookie: `sf_admin_token=${tokenAdminA}` } });
    assert(admUserA.status === 200, "Admin can access User A (HTTP 200)");

    const admUserB = await fetch(`${baseUrl}/admin/users/${userB.id}`, { headers: { Cookie: `sf_admin_token=${tokenAdminA}` } });
    assert(admUserB.status === 200, "Admin can access User B (HTTP 200)");

    const admUserC = await fetch(`${baseUrl}/admin/users/${userC.id}`, { headers: { Cookie: `sf_admin_token=${tokenAdminA}` } });
    assert(admUserC.status === 200, "Admin can access User C (HTTP 200)");

    // Admin accesses Advisor A, B, C
    const admAdvA = await fetch(`${baseUrl}/admin/advisors/${advisorA.id}`, { headers: { Cookie: `sf_admin_token=${tokenAdminA}` } });
    assert(admAdvA.status === 200, "Admin can access Advisor A (HTTP 200)");

    const admAdvB = await fetch(`${baseUrl}/admin/advisors/${advisorB.id}`, { headers: { Cookie: `sf_admin_token=${tokenAdminA}` } });
    assert(admAdvB.status === 200, "Admin can access Advisor B (HTTP 200)");

    const admAdvC = await fetch(`${baseUrl}/admin/advisors/${advisorC.id}`, { headers: { Cookie: `sf_admin_token=${tokenAdminA}` } });
    assert(admAdvC.status === 200, "Admin can access Advisor C (HTTP 200)");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 4 — CROSS-ADVISOR ISOLATION
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── TEST 4: CROSS-ADVISOR ISOLATION ───");

    // Advisor A -> User C (owned by B)
    const crsA_C = await fetch(`${baseUrl}/advisor/clients/${userC.id}`, { headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` } });
    assert(crsA_C.status === 403, "Advisor A blocked from User C (HTTP 403)");

    // Advisor B -> User A (owned by A)
    const crsB_A = await fetch(`${baseUrl}/advisor/clients/${userA.id}`, { headers: { Cookie: `sf_advisor_token=${tokenAdvisorB}` } });
    assert(crsB_A.status === 403, "Advisor B blocked from User A (HTTP 403)");

    // Advisor C -> User A (owned by A)
    const crsC_A = await fetch(`${baseUrl}/advisor/clients/${userA.id}`, { headers: { Cookie: `sf_advisor_token=${tokenAdvisorC}` } });
    assert(crsC_A.status === 403, "Advisor C blocked from User A (HTTP 403)");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 5 — RELATIONSHIP STATE ENFORCEMENT
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── TEST 5: RELATIONSHIP STATE ENFORCEMENT ───");

    const nonActiveStates = ["invited", "pending_user_acceptance", "suspended", "terminated", "reassigned", "rejected"];
    for (const state of nonActiveStates) {
      await db.query("UPDATE advisor_client_relationships SET status = $1 WHERE id = $2", [state, relA_D.id]);
      const stateRes = await fetch(`${baseUrl}/advisor/clients/${userD.id}`, {
        headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
      });
      assert(stateRes.status === 403, `Relationship status '${state}' rejected with HTTP 403`);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 6 — LIVE REVOCATION
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── TEST 6: LIVE REVOCATION (SAME UNEXPIRED JWT) ───");

    // Scenario A: active -> suspended -> same JWT denied
    await db.query("UPDATE advisor_client_relationships SET status = 'active' WHERE id = $1", [relA_A.id]);
    const preRevRes = await fetch(`${baseUrl}/advisor/clients/${userA.id}`, { headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` } });
    assert(preRevRes.status === 200, "Scenario A: Active relationship granted access");

    await db.query("UPDATE advisor_client_relationships SET status = 'suspended' WHERE id = $1", [relA_A.id]);
    const postRevRes = await fetch(`${baseUrl}/advisor/clients/${userA.id}`, { headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` } });
    assert(postRevRes.status === 403, "Scenario A: Suspended relationship immediately denied (Same JWT)");

    // Scenario B: suspended -> active -> same JWT restored
    await db.query("UPDATE advisor_client_relationships SET status = 'active' WHERE id = $1", [relA_A.id]);
    const restoredRes = await fetch(`${baseUrl}/advisor/clients/${userA.id}`, { headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` } });
    assert(restoredRes.status === 200, "Scenario B: Reactivated relationship immediately allowed (Same JWT)");

    // Scenario C: reassign User A to Advisor B
    await AdvisorRelationship.reassignRelationship({
      currentRelationshipId: relA_A.id,
      newAdvisorId: advisorB.id,
      assignedByAdminId: adminA.id,
      reason: "Client request",
    });

    const oldAdvRes = await fetch(`${baseUrl}/advisor/clients/${userA.id}`, { headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` } });
    assert(oldAdvRes.status === 403, "Scenario C: Old Advisor A immediately denied for reassigned client");

    const newAdvRes = await fetch(`${baseUrl}/advisor/clients/${userA.id}`, { headers: { Cookie: `sf_advisor_token=${tokenAdvisorB}` } });
    assert(newAdvRes.status === 200, "Scenario C: New Advisor B immediately granted access");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 7 — ROLE TOKEN CONFUSION
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── TEST 7: ROLE TOKEN CONFUSION ───");

    // User JWT -> Advisor route
    const uOnAdv = await fetch(`${baseUrl}/advisor/portal`, { headers: { Cookie: `sf_token=${tokenUserA}` } });
    assert(uOnAdv.status === 401, "User JWT rejected on Advisor route (HTTP 401)");

    // User JWT -> Admin route
    const uOnAdm = await fetch(`${baseUrl}/admin/users`, { headers: { Cookie: `sf_token=${tokenUserA}` } });
    assert(uOnAdm.status === 403, "User JWT rejected on Admin route (HTTP 403)");

    // Advisor JWT -> User route
    const advOnU = await fetch(`${baseUrl}/user/profile`, { headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` } });
    assert(advOnU.status === 401 || advOnU.status === 403, "Advisor JWT rejected on User route (HTTP 401/403)");

    // Advisor JWT -> Admin route
    const advOnAdm = await fetch(`${baseUrl}/admin/users`, { headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` } });
    assert(advOnAdm.status === 401 || advOnAdm.status === 403, "Advisor JWT rejected on Admin route (HTTP 401/403)");

    // Admin JWT -> User route
    const admOnU = await fetch(`${baseUrl}/user/profile`, { headers: { Cookie: `sf_admin_token=${tokenAdminA}` } });
    assert(admOnU.status === 403, "Admin JWT rejected on User self route (HTTP 403)");

    // Admin JWT -> Advisor route
    const admOnAdv = await fetch(`${baseUrl}/advisor/portal`, { headers: { Cookie: `sf_admin_token=${tokenAdminA}` } });
    assert(admOnAdv.status === 401, "Admin JWT rejected on Advisor portal route (HTTP 401)");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 8 — IDENTIFIER TAMPERING
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── TEST 8: IDENTIFIER TAMPERING ───");

    // Attacker tries body.userId, body.advisorId, query.userId, query.advisorId
    const tamperRes = await fetch(`${baseUrl}/advisor/clients/${userB.id}?advisorId=${advisorA.id}&userId=${userA.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: `sf_advisor_token=${tokenAdvisorC}` },
      body: JSON.stringify({
        advisorId: advisorA.id,
        userId: userA.id,
        clientId: userA.id,
      }),
    });
    assert(tamperRes.status === 403, "Full parameter tampering matrix rejected with HTTP 403");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 9 — INVALID IDENTIFIERS
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── TEST 9: INVALID IDENTIFIERS ───");

    // Malformed UUID string
    const malformedRes = await fetch(`${baseUrl}/advisor/clients/not-a-valid-uuid-abc`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(malformedRes.status === 400, "Malformed UUID string returns HTTP 400 Bad Request");

    // Non-RFC compliant UUID
    const nonRfcRes = await fetch(`${baseUrl}/advisor/clients/00000000-0000-0000-0000-000000000000`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(nonRfcRes.status === 400, "Non-RFC compliant UUID returns HTTP 400 Bad Request");

    // Nonexistent valid RFC-4122 UUID
    const nonExistentRes = await fetch(`${baseUrl}/advisor/clients/550e8400-e29b-41d4-a716-446655449999`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    assert(nonExistentRes.status === 403, "Nonexistent valid UUID returns HTTP 403 Forbidden");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 10 — INFORMATION LEAKAGE
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── TEST 10: INFORMATION LEAKAGE ───");

    const leakCheckRes = await fetch(`${baseUrl}/advisor/clients/${userC.id}`, {
      headers: { Cookie: `sf_advisor_token=${tokenAdvisorA}` },
    });
    const leakCheckData = await leakCheckRes.json();
    assert(leakCheckRes.status === 403, "Denied request returns HTTP 403");
    assert(!JSON.stringify(leakCheckData).includes("Charlie"), "Target client name not leaked in error response");
    assert(!JSON.stringify(leakCheckData).includes("140000"), "Target client financial data not leaked in error response");
    assert(!JSON.stringify(leakCheckData).includes("password_hash"), "Password hash not leaked in error response");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 11 — AUDIT LOGGING
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── TEST 11: AUDIT LOGGING ───");

    const { rows: deniedAuditRows } = await db.query(
      `SELECT * FROM audit_logs 
       WHERE action = 'ADVISOR_CLIENT_ACCESS_DENIED' AND actor_id = $1 
       ORDER BY created_at DESC LIMIT 5`,
      [advisorA.id]
    );
    assert(deniedAuditRows.length > 0, "Denied advisor client access logged in audit_logs");
    assert(!JSON.stringify(deniedAuditRows).includes("AdvisorPass2026!"), "Audit log does NOT contain passwords");
    assert(!JSON.stringify(deniedAuditRows).includes("Bearer"), "Audit log does NOT contain JWT Bearer tokens");

    // ══════════════════════════════════════════════════════════════════════════
    // TEST 12 — CONCURRENCY & PARTIAL UNIQUE INDEX ENFORCEMENT
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── TEST 12: CONCURRENCY / DATABASE ENFORCEMENT ───");

    // Verify idx_acr_single_active_advisor prevents two active advisors for User D
    await db.query("UPDATE advisor_client_relationships SET status = 'active' WHERE id = $1", [relA_D.id]);

    let duplicateIndexViolated = false;
    try {
      await db.query(
        `INSERT INTO advisor_client_relationships (advisor_id, user_id, client_email, status, initiated_by)
         VALUES ($1, $2, $3, 'active', 'advisor')`,
        [advisorB.id, userD.id, userD.email]
      );
    } catch (err) {
      if (err.code === "23505" && err.constraint === "idx_acr_single_active_advisor") {
        duplicateIndexViolated = true;
      }
    }
    assert(duplicateIndexViolated === true, "Database constraint idx_acr_single_active_advisor strictly prevents 2 simultaneous active advisors");

  } finally {
    // Teardown
    console.log("\n[Teardown] Cleaning up test records from database...");
    const allCreatedRelIds = await db.query(
      `SELECT id FROM advisor_client_relationships WHERE advisor_id = ANY($1::uuid[]) OR user_id = ANY($2::uuid[])`,
      [createdAdvisorIds, createdUserIds]
    );
    if (allCreatedRelIds.rows.length > 0) {
      const ids = allCreatedRelIds.rows.map(r => r.id);
      await db.query(`DELETE FROM advisor_client_relationships WHERE id = ANY($1::uuid[])`, [ids]);
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
