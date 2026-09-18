// backend/services/tests/userActiveAdvisor.test.js
// ── Run: node services/tests/userActiveAdvisor.test.js ─────────────────────────
// Phase 7.1 Step 7: User Active Advisor Relationship Test Suite

process.env.NODE_ENV = "test";

const http         = require("http");
const express      = require("express");
const cookieParser = require("cookie-parser");
const db           = require("../../config/db");
const User         = require("../../models/User");
const Advisor      = require("../../models/Advisor");
const AdvisorRelationship = require("../../models/AdvisorRelationship");
const { signToken, buildPayload, buildAdvisorPayload } = require("../../utils/jwt");
const { authenticate } = require("../../middleware/auth");
const userRoutes   = require("../../routes/userRoutes");

async function runTests() {
  console.log("\n==================================================================");
  console.log("  PHASE 7.1 STEP 7 — USER ACTIVE ADVISOR RELATIONSHIP TEST SUITE  ");
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

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(authenticate);
  app.use("/api/user", userRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/user/advisor`;

  const createdAdvisorIds = [];
  const createdUserIds = [];
  const createdRelationshipIds = [];

  try {
    console.log("─── CREATING TEST FIXTURES ───");

    // 1. Create Advisor
    const adv = await Advisor.create({
      fullName: "Nikhil Kamath",
      email: `nikhil.advisor.${Date.now()}@test.com`,
      password: "Password123!",
      firmName: "True Beacon Advisory",
      licenseNumber: "INA000012345",
      specializations: ["Wealth Management", "Portfolio Strategy"],
      experienceYears: 14,
      approvalStatus: "approved",
      isEmailVerified: true,
      city: "Bangalore",
      state: "Karnataka",
    });
    createdAdvisorIds.push(adv.id);

    // 2. Create User 1 (Alice)
    const user1 = await User.create({
      fullName: "Alice Client",
      email: `alice.${Date.now()}@test.com`,
      passwordHash: "$2b$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH",
    });
    createdUserIds.push(user1.id);

    // 3. Create User 2 (Bob)
    const user2 = await User.create({
      fullName: "Bob Client",
      email: `bob.${Date.now()}@test.com`,
      passwordHash: "$2b$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH",
    });
    createdUserIds.push(user2.id);

    // JWT Tokens
    const tokenAlice = signToken(buildPayload(user1));
    const tokenBob = signToken(buildPayload(user2));
    const tokenAdv = signToken(buildAdvisorPayload(adv));

    function makeRequest(url, options = {}) {
      return new Promise((resolve, reject) => {
        const u = new URL(url);
        const headers = { ...options.headers };

        if (options.token) {
          headers["Cookie"] = `sf_token=${options.token}`;
        } else if (options.advisorToken) {
          headers["Cookie"] = `sf_advisor_token=${options.advisorToken}`;
        }

        if (options.body) {
          headers["Content-Type"] = "application/json";
        }

        const req = http.request(
          {
            hostname: u.hostname,
            port: u.port,
            path: u.pathname + u.search,
            method: options.method || "GET",
            headers,
          },
          (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
              try {
                const parsed = JSON.parse(data);
                resolve({ status: res.statusCode, body: parsed });
              } catch {
                resolve({ status: res.statusCode, raw: data });
              }
            });
          }
        );
        req.on("error", reject);
        if (options.body) {
          req.write(JSON.stringify(options.body));
        }
        req.end();
      });
    }

    console.log("✓ Fixtures created.\n");

    // ── Test 1: Unauthenticated request rejected
    console.log("[Test 1] Unauthenticated request to /api/user/advisor/active");
    const unauthRes = await makeRequest(`${baseUrl}/active`);
    assert(unauthRes.status === 401, "Unauthenticated request returns HTTP 401");

    // ── Test 2: Advisor session alone rejected on user endpoint
    console.log("[Test 2] Advisor session alone rejected on user endpoint");
    const advAloneRes = await makeRequest(`${baseUrl}/active`, { advisorToken: tokenAdv });
    assert(advAloneRes.status === 401, "Advisor token alone returns HTTP 401 (no user token provided)");

    // ── Test 3: User with no active advisor returns hasActiveAdvisor: false
    console.log("[Test 3] User Alice with no active advisor");
    const noAdvRes = await makeRequest(`${baseUrl}/active`, { token: tokenAlice });
    assert(noAdvRes.status === 200, "Alice returns HTTP 200 OK");
    assert(noAdvRes.body.success === true, "Response success is true");
    assert(noAdvRes.body.data.hasActiveAdvisor === false, "hasActiveAdvisor is false");
    assert(noAdvRes.body.data.relationship === null, "relationship is null");

    // ── Establish active relationship for Alice
    const activeRel = await AdvisorRelationship.create({
      advisorId: adv.id,
      userId: user1.id,
      clientEmail: user1.email,
      status: "active",
      initiatedBy: "advisor",
      acceptedAt: new Date(),
      notes: "High net worth client portfolio",
    });
    createdRelationshipIds.push(activeRel.id);

    // ── Test 4: User with active advisor returns active relationship
    console.log("[Test 4] User Alice with active advisor returns details");
    const activeAdvRes = await makeRequest(`${baseUrl}/active`, { token: tokenAlice });
    assert(activeAdvRes.status === 200, "Alice with active advisor returns HTTP 200 OK");
    assert(activeAdvRes.body.data.hasActiveAdvisor === true, "hasActiveAdvisor is true");
    assert(activeAdvRes.body.data.relationship !== null, "relationship is not null");
    assert(activeAdvRes.body.data.relationship.relationshipId === activeRel.id, "relationshipId matches");
    assert(activeAdvRes.body.data.relationship.status === "active", "status is 'active'");
    assert(activeAdvRes.body.data.relationship.advisor.fullName === "Nikhil Kamath", "advisor fullName matches");
    assert(activeAdvRes.body.data.relationship.advisor.firmName === "True Beacon Advisory", "advisor firmName matches");
    assert(activeAdvRes.body.data.relationship.advisor.licenseNumber === "INA000012345", "advisor licenseNumber matches");
    assert(Array.isArray(activeAdvRes.body.data.relationship.advisor.specializations), "specializations is array");

    // ── Test 5: Sanitization - No passwords or secrets leaked
    console.log("[Test 5] Response sanitization");
    const resString = JSON.stringify(activeAdvRes.body);
    assert(!resString.includes("password"), "Response does not contain password");
    assert(!resString.includes("tokenHash"), "Response does not contain tokenHash");
    assert(!resString.includes("invitation_token_hash"), "Response does not contain invitation_token_hash");

    // ── Test 6: Cross-user isolation - Bob has no advisor
    console.log("[Test 6] Cross-user isolation (Bob cannot see Alice's advisor)");
    const bobRes = await makeRequest(`${baseUrl}/active`, { token: tokenBob });
    assert(bobRes.status === 200, "Bob receives HTTP 200 OK");
    assert(bobRes.body.data.hasActiveAdvisor === false, "Bob hasActiveAdvisor is strictly false");
    assert(bobRes.body.data.relationship === null, "Bob relationship is null");

    // ── Test 7: Terminating Alice's advisor relationship transitions to hasActiveAdvisor: false
    console.log("[Test 7] Termination updates active advisor status immediately");
    await AdvisorRelationship.terminateUserRelationship({
      userId: user1.id,
      reason: "Moving to self-directed investments",
    });

    const postTermRes = await makeRequest(`${baseUrl}/active`, { token: tokenAlice });
    assert(postTermRes.status === 200, "Post-termination returns HTTP 200");
    assert(postTermRes.body.data.hasActiveAdvisor === false, "Post-termination hasActiveAdvisor is false");
    assert(postTermRes.body.data.relationship === null, "Post-termination relationship is null");

  } finally {
    console.log("\n[Teardown] Cleaning up test records...");
    for (const relId of createdRelationshipIds) {
      await db.query("DELETE FROM advisor_client_relationships WHERE id = $1", [relId]).catch(() => {});
    }
    for (const uId of createdUserIds) {
      await db.query("DELETE FROM users WHERE id = $1", [uId]).catch(() => {});
    }
    for (const aId of createdAdvisorIds) {
      await db.query("DELETE FROM advisors WHERE id = $1", [aId]).catch(() => {});
    }
    server.close();
  }

  console.log("\n==================================================================");
  console.log(`  FINAL RESULT: ${testPassed} PASSED, ${testFailed} FAILED `);
  console.log("==================================================================\n");
}

runTests().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
