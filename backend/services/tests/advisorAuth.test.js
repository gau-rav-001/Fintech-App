// ── Run: node services/tests/advisorAuth.test.js ──────────────────────────────
// Phase 3.1, 3.2 & 3.3: Advisor Registration, Verification & Login Test Suite
process.env.NODE_ENV = "test";

const http    = require("http");
const express = require("express");
const jwt     = require("jsonwebtoken");
const db      = require("../../config/db");
const Advisor = require("../../models/Advisor");
const AuditLog = require("../../models/AuditLog");
const User    = require("../../models/User");
const Admin   = require("../../models/Admin");
const { saveOTP, verifyOTP, clearOTP, lockout } = require("../../utils/otp");
const advisorAuthRoutes = require("../../routes/advisorAuthRoutes");

async function runTests() {
  console.log("\n==================================================================");
  console.log("  PHASE 3.3 — ADVISOR AUTHENTICATION & LOGIN TEST SUITE           ");
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
  app.use("/api/advisor/auth", advisorAuthRoutes);

  // Start in-memory HTTP server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/advisor/auth`;

  const createdAdvisorIds = [];
  const createdUserIds = [];

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // PART 1: REGISTRATION & OTP VERIFICATION TESTS (3.1 & 3.2)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("─── PART 1: REGISTRATION & EMAIL OTP VERIFICATION ───");

    const testEmail = `adv_reg_${Date.now()}@smartfinance.test`;
    const validRegPayload = {
      fullName: "Vikram Malhotra",
      email: testEmail,
      mobile: "+919876543210",
      password: "StrongPassword2026!",
      firmName: "Malhotra Capital Management",
      licenseNumber: "ARN-88776655",
      specializations: ["Wealth Management", "Equity Research"],
      experienceYears: 12,
      bio: "12 years experience managing HNI portfolios.",
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
    };

    // Test 1: Successful registration
    const regRes = await fetch(`${baseUrl}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validRegPayload),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, "Registration returns HTTP 201 Created");
    assert(regData.data.approvalStatus === "pending", "Initial registration approvalStatus is 'pending'");
    assert(regData.data.isEmailVerified === false, "Initial isEmailVerified is false");
    createdAdvisorIds.push(regData.data.advisorId);

    // Test 2: Duplicate email
    const dupRes = await fetch(`${baseUrl}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validRegPayload),
    });
    assert(dupRes.status === 409, "Duplicate registration returns HTTP 409 Conflict");

    // Test 3: Validation checks
    const invRes = await fetch(`${baseUrl}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validRegPayload, email: "invalid", password: "short" }),
    });
    assert(invRes.status === 422, "Invalid input rejected with HTTP 422 Validation Error");

    // Test 4: OTP verify marks email verified while approval remains pending
    await saveOTP(`advisor:${testEmail}`, "654321");
    const otpVerifyRes = await fetch(`${baseUrl}/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, otp: "654321" }),
    });
    const otpVerifyData = await otpVerifyRes.json();
    assert(otpVerifyRes.status === 200, "Registration OTP verification returns HTTP 200 OK");
    assert(otpVerifyData.data.isEmailVerified === true, "isEmailVerified is true");
    assert(otpVerifyData.data.approvalStatus === "pending", "approvalStatus strictly remains 'pending'");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 2: ADVISOR LOGIN DECISION TREE TESTS (3.3)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 2: ADVISOR LOGIN DECISION TREE ───");

    // ── Test 5: Nonexistent advisor -> Generic 401
    console.log("\n[Test 5] Nonexistent advisor login attempt");
    const nonExistentRes = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "doesnotexist@smartfinance.test", password: "StrongPassword2026!" }),
    });
    const nonExistentData = await nonExistentRes.json();
    assert(nonExistentRes.status === 401, "Nonexistent advisor returns HTTP 401");
    assert(nonExistentData.message === "Invalid email or password.", "Generic authentication failure message returned");

    // ── Test 6: Unverified advisor -> 403 Forbidden
    console.log("\n[Test 6] Unverified advisor login attempt");
    const unverifiedEmail = `unverified_${Date.now()}@sf.test`;
    const unverifiedAdv = await Advisor.create({
      fullName: "Unverified Adv",
      email: unverifiedEmail,
      password: "StrongPassword2026!",
      firmName: "Unverified Firm",
      licenseNumber: "ARN-11111",
      approvalStatus: "pending",
      isEmailVerified: false,
    });
    createdAdvisorIds.push(unverifiedAdv.id);

    const unverifiedRes = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: unverifiedEmail, password: "StrongPassword2026!" }),
    });
    const unverifiedData = await unverifiedRes.json();
    assert(unverifiedRes.status === 403, "Unverified advisor rejected with HTTP 403 Forbidden");
    assert(unverifiedData.errors?.code === "EMAIL_NOT_VERIFIED", "Error code is EMAIL_NOT_VERIFIED");

    // ── Test 7: Verified but PENDING approval -> 403 Forbidden (NO SESSION)
    console.log("\n[Test 7] Pending approval advisor login attempt");
    const pendingRes = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "StrongPassword2026!" }),
    });
    const pendingData = await pendingRes.json();
    assert(pendingRes.status === 403, "Pending advisor rejected with HTTP 403 Forbidden");
    assert(pendingData.errors?.code === "ADVISOR_PENDING", "Error code is ADVISOR_PENDING");
    assert(!pendingRes.headers.get("set-cookie")?.includes("sf_advisor_token"), "No session cookie issued for pending advisor");

    // ── Test 8: REJECTED advisor -> 403 Forbidden (NO SESSION)
    console.log("\n[Test 8] Rejected advisor login attempt");
    const rejectedEmail = `rejected_${Date.now()}@sf.test`;
    const rejectedAdv = await Advisor.create({
      fullName: "Rejected Adv",
      email: rejectedEmail,
      password: "StrongPassword2026!",
      firmName: "Rejected Firm",
      licenseNumber: "ARN-22222",
      approvalStatus: "rejected",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(rejectedAdv.id, {
      approvalStatus: "rejected",
      rejectionReason: "Invalid SEBI registration document.",
    });
    createdAdvisorIds.push(rejectedAdv.id);

    const rejectedRes = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: rejectedEmail, password: "StrongPassword2026!" }),
    });
    const rejectedData = await rejectedRes.json();
    assert(rejectedRes.status === 403, "Rejected advisor rejected with HTTP 403 Forbidden");
    assert(rejectedData.errors?.code === "ADVISOR_REJECTED", "Error code is ADVISOR_REJECTED");
    assert(!rejectedRes.headers.get("set-cookie")?.includes("sf_advisor_token"), "No session cookie issued for rejected advisor");

    // ── Test 9: SUSPENDED advisor -> 403 Forbidden (NO SESSION)
    console.log("\n[Test 9] Suspended advisor login attempt");
    const suspendedEmail = `suspended_${Date.now()}@sf.test`;
    const suspendedAdv = await Advisor.create({
      fullName: "Suspended Adv",
      email: suspendedEmail,
      password: "StrongPassword2026!",
      firmName: "Suspended Firm",
      licenseNumber: "ARN-33333",
      approvalStatus: "suspended",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(suspendedAdv.id, {
      approvalStatus: "suspended",
      suspensionReason: "Compliance investigation under Section 12.",
    });
    createdAdvisorIds.push(suspendedAdv.id);

    const suspendedRes = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: suspendedEmail, password: "StrongPassword2026!" }),
    });
    const suspendedData = await suspendedRes.json();
    assert(suspendedRes.status === 403, "Suspended advisor rejected with HTTP 403 Forbidden");
    assert(suspendedData.errors?.code === "ADVISOR_SUSPENDED", "Error code is ADVISOR_SUSPENDED");
    assert(!suspendedRes.headers.get("set-cookie")?.includes("sf_advisor_token"), "No session cookie issued for suspended advisor");

    // ── Test 10: Approved advisor with INCORRECT password -> Generic 401
    console.log("\n[Test 10] Approved advisor with incorrect password");
    const approvedEmail = `approved_${Date.now()}@sf.test`;
    const approvedAdv = await Advisor.create({
      fullName: "Priya Sundaram",
      email: approvedEmail,
      password: "CorrectPassword2026!",
      firmName: "Sundaram Advisory",
      licenseNumber: "ARN-44444",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(approvedAdv.id, {
      approvalStatus: "approved",
      approvedAt: new Date(),
    });
    createdAdvisorIds.push(approvedAdv.id);

    const wrongPwRes = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: approvedEmail, password: "WrongPassword999!" }),
    });
    const wrongPwData = await wrongPwRes.json();
    assert(wrongPwRes.status === 401, "Incorrect password returns HTTP 401");
    assert(wrongPwData.message === "Invalid email or password.", "Generic error message returned");

    // ── Test 11: Account Lockout after consecutive failed attempts
    console.log("\n[Test 11] Account lockout mechanism");
    const lockoutEmail = `lockout_${Date.now()}@sf.test`;
    const lockoutAdv = await Advisor.create({
      fullName: "Lockout Test Adv",
      email: lockoutEmail,
      password: "CorrectPassword2026!",
      firmName: "Lockout Firm",
      licenseNumber: "ARN-55555",
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    createdAdvisorIds.push(lockoutAdv.id);

    // Fail 5 times to trigger lockout
    for (let i = 0; i < 5; i++) {
      await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: lockoutEmail, password: "BadPassword!" }),
      });
    }

    const lockedRes = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: lockoutEmail, password: "BadPassword!" }),
    });
    assert(lockedRes.status === 429, "Locked account returns HTTP 429 Too Many Requests");
    lockout.clear(`advisor:${lockoutEmail}`); // clean up lockout

    // ── Test 12: Approved advisor with CORRECT credentials -> Step 1 MFA OTP sent
    console.log("\n[Test 12] Approved advisor valid login (Step 1 -> 2FA OTP sent)");
    const loginStep1Res = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: approvedEmail, password: "CorrectPassword2026!" }),
    });
    const loginStep1Data = await loginStep1Res.json();
    assert(loginStep1Res.status === 200, "Valid credentials return HTTP 200 OK");
    assert(loginStep1Data.data.requiresOTP === true, "Response requiresOTP is true");
    assert(loginStep1Data.data.email === approvedEmail.toLowerCase(), "Response returns advisor email");
    assert(!loginStep1Res.headers.get("set-cookie")?.includes("sf_advisor_token"), "No session cookie issued in Step 1 (MFA required)");

    // ── Test 13: Step 2: Complete Login with 2FA OTP -> sf_advisor_token Cookie & Minimal JWT
    console.log("\n[Test 13] Complete login with 2FA OTP (Step 2 -> Session Cookie & Minimal JWT)");
    await saveOTP(`advisor_login:${approvedEmail}`, "889900");
    const loginStep2Res = await fetch(`${baseUrl}/verify-login-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: approvedEmail, otp: "889900" }),
    });
    const loginStep2Data = await loginStep2Res.json();

    assert(loginStep2Res.status === 200, "Step 2 login OTP verification returns HTTP 200 OK");
    assert(loginStep2Data.success === true, "Step 2 login success is true");
    assert(loginStep2Data.data.advisor.id === approvedAdv.id, "Advisor profile returned");

    // Cookie checks
    const setCookieHeader = loginStep2Res.headers.get("set-cookie") || "";
    assert(setCookieHeader.includes("sf_advisor_token="), "Cookie 'sf_advisor_token' is set");
    assert(setCookieHeader.includes("HttpOnly"), "Cookie has HttpOnly attribute");
    assert(!setCookieHeader.includes("sf_token="), "Cookie 'sf_token' (User) is NOT set or overwritten");
    assert(!setCookieHeader.includes("sf_admin_token="), "Cookie 'sf_admin_token' (Admin) is NOT set or overwritten");

    // Extract & verify minimal JWT structure
    const rawToken = setCookieHeader.split("sf_advisor_token=")[1].split(";")[0];
    const decodedJWT = jwt.verify(rawToken, process.env.JWT_SECRET);

    assert(decodedJWT.role === "advisor", "JWT role is strictly 'advisor'");
    assert(decodedJWT.id === approvedAdv.id, "JWT id matches advisor id");
    assert(decodedJWT.jti !== undefined, "JWT contains jti session nonce");
    assert(decodedJWT.iat !== undefined, "JWT contains iat");
    assert(decodedJWT.exp !== undefined, "JWT contains exp");

    // CRITICAL SECURITY INVARIANT: JWT MUST NOT contain mutable authorization state
    assert(decodedJWT.approval_status === undefined, "JWT does NOT contain mutable approval_status");
    assert(decodedJWT.approvalStatus === undefined, "JWT does NOT contain mutable approvalStatus");
    assert(decodedJWT.firm_name === undefined && decodedJWT.firmName === undefined, "JWT does NOT contain firm_name");
    assert(decodedJWT.license_number === undefined && decodedJWT.licenseNumber === undefined, "JWT does NOT contain license_number");

    // ── Test 14: Step 2 Single-Use Login OTP (Cannot be replayed)
    console.log("\n[Test 14] Login OTP single-use consumption");
    const replayLoginOtp = await fetch(`${baseUrl}/verify-login-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: approvedEmail, otp: "889900" }),
    });
    assert(replayLoginOtp.status === 400, "Replaying used login OTP is rejected with HTTP 400");

    // ══════════════════════════════════════════════════════════════════════════
    // PART 3: REGRESSION & AUDIT LOGGING TESTS
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── PART 3: REGRESSION & AUDIT VERIFICATION ───");

    // ── Test 15: User authentication models & OTP unaffected
    console.log("\n[Test 15] User authentication regression check");
    const userEmail = `reg_user_${Date.now()}@sf.test`;
    const regUser = await User.create({
      fullName: "Regular User",
      email: userEmail,
      password: "UserPassword2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(regUser.id);
    const userAuthCheck = await User.findByEmailWithPassword(userEmail);
    assert(userAuthCheck.role === "user", "User role is 'user'");
    const userMatch = await User.comparePassword(userAuthCheck.passwordHash, "UserPassword2026!");
    assert(userMatch === true, "User password validation operational");

    // ── Test 16: Admin authentication models & OTP unaffected
    console.log("\n[Test 16] Admin authentication regression check");
    const adminEmail = process.env.ADMIN_EMAIL || "harshvardhan.varma2023@vitbhopal.ac.in";
    const adminCheck = await Admin.findByEmailWithPassword(adminEmail);
    if (adminCheck) {
      assert(adminCheck.role === "admin", "Admin role is 'admin'");
      assert(adminCheck.passwordHash !== undefined, "Admin password hash retrieved properly");
    } else {
      console.log("  ℹ Admin record query executed successfully");
    }

    // ── Test 17: Audit logs for all login actions
    console.log("\n[Test 17] Audit logs verification for all login states");
    const approvedLogs = await AuditLog.findAll({ actorId: approvedAdv.id });
    const actions = approvedLogs.logs.map(l => l.action);
    assert(actions.includes("ADVISOR_LOGIN_OTP_SENT"), "AuditLog includes ADVISOR_LOGIN_OTP_SENT");
    assert(actions.includes("ADVISOR_LOGIN_SUCCESS"), "AuditLog includes ADVISOR_LOGIN_SUCCESS");

  } finally {
    // Teardown: clean up test entities
    console.log("\n[Teardown] Cleaning up test records from database...");
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
