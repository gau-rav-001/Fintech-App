// backend/services/tests/advisorMe.test.js
// Phase 7.1 Step 1: Advisor Session Restoration Endpoint (GET /api/advisor/auth/me) Tests

process.env.NODE_ENV = "test";

const http         = require("http");
const express      = require("express");
const cookieParser = require("cookie-parser");
const db           = require("../../config/db");
const Advisor      = require("../../models/Advisor");
const User         = require("../../models/User");
const { signToken, buildAdvisorPayload, buildPayload, revokeToken } = require("../../utils/jwt");
const advisorAuthRoutes = require("../../routes/advisorAuthRoutes");

async function runTests() {
  console.log("\n==================================================================");
  console.log("  PHASE 7.1 STEP 1 — ADVISOR SESSION RESTORATION (GET /me) TESTS ");
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
  app.use("/api/advisor/auth", advisorAuthRoutes);

  // Start in-memory HTTP server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/advisor/auth`;

  const createdAdvisorIds = [];
  const createdUserIds = [];

  try {
    // ── Setup test advisor 1 (Approved & Verified)
    const advEmail1 = `me_adv_${Date.now()}@smartfinance.test`;
    const testAdvisor1 = await Advisor.create({
      fullName: "Kavita Sharma",
      email: advEmail1,
      password: "AdvisorPassword2026!",
      firmName: "Sharma Capital Management",
      licenseNumber: "INA000012345",
      specializations: ["Mutual Funds", "Retirement Planning"],
      experienceYears: 12,
      bio: "Certified financial planner with 12 years of experience.",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(testAdvisor1.id, {
      approvalStatus: "approved",
      approvedAt: new Date(),
    });
    createdAdvisorIds.push(testAdvisor1.id);

    // ── Setup test advisor 2 (Approved & Verified - For override testing)
    const advEmail2 = `me_adv2_${Date.now()}@smartfinance.test`;
    const testAdvisor2 = await Advisor.create({
      fullName: "Rajesh Varma",
      email: advEmail2,
      password: "AdvisorPassword2026!",
      firmName: "Varma Wealth Advisory",
      licenseNumber: "INA000099999",
      specializations: ["Equities", "Tax Advisory"],
      experienceYears: 8,
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(testAdvisor2.id, {
      approvalStatus: "approved",
      approvedAt: new Date(),
    });
    createdAdvisorIds.push(testAdvisor2.id);

    // Tokens
    const validAdvisor1Token = signToken(buildAdvisorPayload(testAdvisor1));
    const validAdvisor2Token = signToken(buildAdvisorPayload(testAdvisor2));

    // ── Helper HTTP request function
    async function requestMe({ cookie, header, query = "", body = null, method = "GET" }) {
      return new Promise((resolve, reject) => {
        const path = `/api/advisor/auth/me${query ? "?" + query : ""}`;
        const headers = {};
        if (cookie) headers["Cookie"] = cookie;
        if (header) headers["Authorization"] = header;
        let payload = null;
        if (body) {
          payload = JSON.stringify(body);
          headers["Content-Type"] = "application/json";
          headers["Content-Length"] = Buffer.byteLength(payload);
        }

        const req = http.request(
          {
            hostname: "127.0.0.1",
            port,
            path,
            method,
            headers,
          },
          (res) => {
            let resData = "";
            res.on("data", (chunk) => { resData += chunk; });
            res.on("end", () => {
              let parsed = null;
              try { parsed = JSON.parse(resData); } catch (e) { parsed = resData; }
              resolve({ status: res.statusCode, statusCode: res.statusCode, headers: res.headers, data: parsed });
            });
          }
        );

        req.on("error", reject);
        if (payload) req.write(payload);
        req.end();
      });
    }

    // ── Test A: Authenticated approved advisor -> 200
    console.log("[Test A] Authenticated approved advisor -> 200 OK");
    const resA = await requestMe({
      cookie: `sf_advisor_token=${validAdvisor1Token}`,
    });
    assert(resA.status === 200, "Authenticated approved advisor returns HTTP 200 OK");
    assert(resA.data.success === true, "Response has success: true");
    assert(resA.data.data?.advisor?.id === testAdvisor1.id, "Returned advisor ID matches session advisor ID");
    assert(resA.data.data?.advisor?.fullName === "Kavita Sharma", "Returned advisor fullName matches");
    assert(resA.data.data?.advisor?.email === advEmail1, "Returned advisor email matches");
    assert(resA.data.data?.advisor?.firmName === "Sharma Capital Management", "Returned advisor firmName matches");
    assert(resA.data.data?.advisor?.licenseNumber === "INA000012345", "Returned advisor licenseNumber matches");
    assert(resA.data.data?.advisor?.approvalStatus === "approved", "Returned advisor approvalStatus is 'approved'");
    assert(resA.data.data?.advisor?.isEmailVerified === true, "Returned advisor isEmailVerified is true");

    // Also test via Authorization: Bearer <token>
    const resABearer = await requestMe({
      header: `Bearer ${validAdvisor1Token}`,
    });
    assert(resABearer.status === 200, "Bearer token authorization returns HTTP 200 OK");
    assert(resABearer.data.data?.advisor?.id === testAdvisor1.id, "Bearer token returns correct advisor");

    // ── Test B: No advisor cookie or token -> 401
    console.log("\n[Test B] No advisor cookie -> 401 Unauthorized");
    const resB = await requestMe({});
    assert(resB.status === 401, "Missing advisor cookie returns HTTP 401");
    assert(resB.data.success === false, "Response has success: false");

    // User cookie (sf_token) sent to advisor route
    const userEmail = `me_user_${Date.now()}@sf.test`;
    const testUser = await User.create({
      fullName: "Regular User",
      email: userEmail,
      password: "UserPassword2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(testUser.id);
    const userToken = signToken(buildPayload(testUser));

    const resBUserCookie = await requestMe({
      cookie: `sf_token=${userToken}`,
    });
    assert(resBUserCookie.status === 401, "sf_token (User cookie) alone returns HTTP 401 on advisor /me");

    // ── Test C: Invalid / revoked session -> 401/403
    console.log("\n[Test C] Invalid / Revoked / Expired session");
    // C1: Malformed token
    const resCMalformed = await requestMe({
      cookie: "sf_advisor_token=malformed.token.value",
    });
    assert(resCMalformed.status === 401, "Malformed token returns HTTP 401");

    // C2: User token placed in sf_advisor_token cookie (role mismatch)
    const resCWrongRole = await requestMe({
      cookie: `sf_advisor_token=${userToken}`,
    });
    assert(resCWrongRole.status === 403, "User token in sf_advisor_token rejected with HTTP 403 (role mismatch)");

    // C3: Revoked token
    const tokenToRevoke = signToken(buildAdvisorPayload(testAdvisor1));
    await revokeToken(tokenToRevoke);
    const resCRevoked = await requestMe({
      cookie: `sf_advisor_token=${tokenToRevoke}`,
    });
    assert(resCRevoked.status === 401, "Revoked token returns HTTP 401");

    // C4: Suspended advisor
    await Advisor.updateApprovalStatus(testAdvisor2.id, {
      approvalStatus: "suspended",
      suspensionReason: "Compliance investigation",
    });
    const resCSuspended = await requestMe({
      cookie: `sf_advisor_token=${validAdvisor2Token}`,
    });
    assert(resCSuspended.status === 403, "Suspended advisor rejected with HTTP 403");
    assert(resCSuspended.data.errors?.code === "ADVISOR_SUSPENDED", "Error code is ADVISOR_SUSPENDED");

    // C5: Rejected advisor
    await Advisor.updateApprovalStatus(testAdvisor2.id, {
      approvalStatus: "rejected",
      rejectionReason: "Ineligible credentials",
    });
    const resCRejected = await requestMe({
      cookie: `sf_advisor_token=${validAdvisor2Token}`,
    });
    assert(resCRejected.status === 403, "Rejected advisor rejected with HTTP 403");
    assert(resCRejected.data.errors?.code === "ADVISOR_REJECTED", "Error code is ADVISOR_REJECTED");

    // ── Test D: Response contains sanitized advisor data
    console.log("\n[Test D] Response contains sanitized advisor data");
    const adv = resA.data.data.advisor;
    assert(adv.id !== undefined, "advisor.id is present");
    assert(adv.fullName === "Kavita Sharma", "advisor.fullName is present");
    assert(adv.email === advEmail1, "advisor.email is present");
    assert(adv.firmName === "Sharma Capital Management", "advisor.firmName is present");
    assert(adv.licenseNumber === "INA000012345", "advisor.licenseNumber is present");
    assert(Array.isArray(adv.specializations), "advisor.specializations is an array");
    assert(adv.experienceYears === 12, "advisor.experienceYears is a number");
    assert(adv.approvalStatus === "approved", "advisor.approvalStatus is present");
    assert(adv.isEmailVerified === true, "advisor.isEmailVerified is boolean true");
    assert(adv.location !== undefined, "advisor.location object is present");

    // ── Test E: Response does NOT contain secrets / internal tokens
    console.log("\n[Test E] Response does NOT expose sensitive security fields");
    assert(!("passwordHash" in adv), "Response does NOT contain passwordHash");
    assert(!("password_hash" in adv), "Response does NOT contain password_hash");
    assert(!("password" in adv), "Response does NOT contain password");
    assert(!("otp" in adv), "Response does NOT contain otp");
    assert(!("otpHash" in adv), "Response does NOT contain otpHash");
    assert(!("mfaSecret" in adv), "Response does NOT contain mfaSecret");
    assert(!("mfa_secret" in adv), "Response does NOT contain mfa_secret");
    assert(!("token" in adv), "Response does NOT contain token");
    assert(!("jwt" in adv), "Response does NOT contain jwt");
    assert(!("token" in resA.data.data), "Data envelope does NOT contain token");

    // ── Test F: Another advisor ID supplied through request must have NO effect
    console.log("\n[Test F] Request override immunity (Query/Body parameter tampering)");
    // Attempt 1: Tamper via query string (?advisorId=<otherId>)
    const resFQuery = await requestMe({
      cookie: `sf_advisor_token=${validAdvisor1Token}`,
      query: `advisorId=${testAdvisor2.id}`,
    });
    assert(resFQuery.status === 200, "Query override attempt succeeds as session owner");
    assert(resFQuery.data.data?.advisor?.id === testAdvisor1.id, "Returned advisor ID strictly remains session owner (testAdvisor1), query param ignored");

    // Attempt 2: Tamper via JSON body ({ advisorId: <otherId> })
    const resFBody = await requestMe({
      cookie: `sf_advisor_token=${validAdvisor1Token}`,
      body: { advisorId: testAdvisor2.id },
    });
    assert(resFBody.status === 200, "Body override attempt succeeds as session owner");
    assert(resFBody.data.data?.advisor?.id === testAdvisor1.id, "Returned advisor ID strictly remains session owner (testAdvisor1), body param ignored");

    // Attempt 3: Multi-session coexistence (user cookie + advisor cookie)
    const resFMultiCookie = await requestMe({
      cookie: `sf_token=${userToken}; sf_advisor_token=${validAdvisor1Token}`,
    });
    assert(resFMultiCookie.status === 200, "Multi-session coexistence resolves sf_advisor_token cleanly");
    assert(resFMultiCookie.data.data?.advisor?.id === testAdvisor1.id, "Returned advisor is testAdvisor1 even with user cookie present");

  } finally {
    // ── Teardown
    console.log("\n[Teardown] Cleaning up test records from database...");
    for (const advId of createdAdvisorIds) {
      await db.query("DELETE FROM advisor_relationships WHERE advisor_id = $1", [advId]).catch(() => {});
      await db.query("DELETE FROM audit_logs WHERE actor_id = $1 OR resource_id = $1", [advId]).catch(() => {});
      await db.query("DELETE FROM advisors WHERE id = $1", [advId]).catch(() => {});
    }
    for (const uId of createdUserIds) {
      await db.query("DELETE FROM users WHERE id = $1", [uId]).catch(() => {});
    }
    server.close();
    await db.pool.end().catch(() => {});
    console.log("✓ Server closed and database test records cleaned cleanly.\n");
  }

  console.log("==================================================================");
  console.log(`  FINAL RESULT: ${testPassed} PASSED, ${testFailed} FAILED `);
  console.log("==================================================================\n");
  process.exit(testFailed === 0 ? 0 : 1);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
