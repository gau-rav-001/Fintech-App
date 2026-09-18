// ── Run: node services/tests/advisorModels.test.js ────────────────────────────
// Focused test suite for Advisor, AdvisorRelationship, and AuditLog models.

const crypto = require("crypto");
const db = require("../../config/db");
const Advisor = require("../../models/Advisor");
const AdvisorRelationship = require("../../models/AdvisorRelationship");
const AuditLog = require("../../models/AuditLog");
const User = require("../../models/User");
const Admin = require("../../models/Admin");

async function runTests() {
  console.log("\n==================================================");
  console.log("  PHASE 2.2 — ADVISOR DATABASE MODELS TEST SUITE  ");
  console.log("==================================================\n");

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

  // Use a transactional boundary so all test data is cleanly rolled back
  await db.transaction(async (client) => {
    // ── Pre-check: existing users and admins count
    const { rows: initialUsers } = await client.query("SELECT COUNT(*) FROM users");
    const { rows: initialAdmins } = await client.query("SELECT COUNT(*) FROM admins");
    const initUserCount = parseInt(initialUsers[0].count, 10);
    const initAdminCount = parseInt(initialAdmins[0].count, 10);

    console.log(`[Baseline] Existing users: ${initUserCount}, Existing admins: ${initAdminCount}`);

    // ── Test 1: Create advisor
    console.log("\n[Test 1] Create advisor");
    const testEmail = `advisor_${Date.now()}@smartfinance.test`;
    const createdAdv = await Advisor.create({
      fullName: "Rohan Varma",
      email: testEmail,
      mobile: "+919876543210",
      password: "AdvisorSecurePassword2026!",
      firmName: "Varma Wealth Advisory LLP",
      licenseNumber: "ARN-1928374",
      specializations: ["Mutual Funds", "Retirement Planning", "Tax Strategy"],
      experienceYears: 8,
      bio: "Certified financial planner with 8+ years experience in Indian equity markets.",
      city: "Mumbai",
      state: "Maharashtra",
    });

    assert(createdAdv.id !== undefined, "Advisor created with valid UUID");
    assert(createdAdv.fullName === "Rohan Varma", "Advisor full name matches");
    assert(createdAdv.email === testEmail.toLowerCase(), "Advisor email normalized to lowercase");
    assert(createdAdv.firmName === "Varma Wealth Advisory LLP", "Advisor firm name matches");
    assert(createdAdv.approvalStatus === "pending", "Advisor initial approval_status is 'pending'");
    assert(createdAdv.isEmailVerified === false, "Advisor initial is_email_verified is false");
    assert(createdAdv.experienceYears === 8, "Advisor experience_years is 8");
    assert(createdAdv.passwordHash === undefined, "password_hash is NOT exposed in safe return object");

    // ── Test 2: Find advisor by email & password comparison
    console.log("\n[Test 2] Find advisor by email & verify password");
    const foundAdv = await Advisor.findByEmail(testEmail);
    assert(foundAdv !== null, "Advisor found by email");
    assert(foundAdv.id === createdAdv.id, "Found advisor ID matches created ID");

    const foundWithPw = await Advisor.findByEmailWithPassword(testEmail);
    assert(foundWithPw.passwordHash !== undefined, "Password hash retrieved for auth verification");
    const pwMatch = await Advisor.comparePassword(foundWithPw.passwordHash, "AdvisorSecurePassword2026!");
    const pwWrong = await Advisor.comparePassword(foundWithPw.passwordHash, "WrongPassword!");
    assert(pwMatch === true, "Password verification succeeds with correct password");
    assert(pwWrong === false, "Password verification fails with incorrect password");

    // ── Test 3: Update advisor
    console.log("\n[Test 3] Update advisor profile & approval status");
    const updatedAdv = await Advisor.update(createdAdv.id, {
      bio: "Updated bio: Specialising in NRI portfolio management.",
      mobile: "+919876500000",
      experienceYears: 9,
    });
    assert(updatedAdv.bio.includes("NRI portfolio management"), "Advisor bio updated");
    assert(updatedAdv.experienceYears === 9, "Advisor experience_years updated");

    const approvedAdv = await Advisor.updateApprovalStatus(createdAdv.id, {
      approvalStatus: "approved",
      approvedBy: null,
      approvedAt: new Date(),
    });
    assert(approvedAdv.approvalStatus === "approved", "Advisor approval_status transitioned to 'approved'");

    const verifiedAdv = await Advisor.verifyAdvisorEmail(createdAdv.id);
    assert(verifiedAdv.isEmailVerified === true, "Advisor email verified successfully");

    const activeAdv = await Advisor.findActiveAdvisor(createdAdv.id);
    assert(activeAdv !== null, "findActiveAdvisor successfully locates approved & verified advisor");

    // ── Test 4: Create relationship (Invitation flow)
    console.log("\n[Test 4] Create relationship (Invitation with hashed token)");
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const clientEmail = `prospective_client_${Date.now()}@example.test`;
    const createdRel = await AdvisorRelationship.create({
      advisorId: createdAdv.id,
      clientEmail: clientEmail,
      status: "invited",
      invitationTokenHash: tokenHash,
      invitationExpiresAt: inviteExpiresAt,
      notes: "Prospective HNI client meeting on Saturday",
    });

    assert(createdRel.id !== undefined, "Relationship record created with valid UUID");
    assert(createdRel.advisorId === createdAdv.id, "Relationship advisorId matches");
    assert(createdRel.clientEmail === clientEmail, "Client email stored");
    assert(createdRel.status === "invited", "Relationship status is 'invited'");

    // ── Test 5: Find relationship by ID & by token hash
    console.log("\n[Test 5] Find relationship by ID and by hashed token");
    const foundRel = await AdvisorRelationship.findById(createdRel.id);
    assert(foundRel !== null, "Relationship found by ID");
    assert(foundRel.clientEmail === clientEmail, "Client email verified");

    const foundByHash = await AdvisorRelationship.findByTokenHash(tokenHash);
    assert(foundByHash !== null, "Relationship found by tokenHash");
    assert(foundByHash.id === createdRel.id, "Hashed token correctly maps to relationship");
    assert(foundByHash.advisor !== undefined, "Advisor firm info joined in token lookup");
    assert(foundByHash.advisor.firmName === "Varma Wealth Advisory LLP", "Joined advisor firm name matches");

    // ── Test 6: Accept invitation & active client queries
    console.log("\n[Test 6] Accept invitation and query advisor active clients");
    // Create a real user record to connect to
    const testUser = await User.create({
      fullName: "Ananya Sharma",
      email: clientEmail,
      password: "ClientPassword2026!",
      isEmailVerified: true,
    });

    const acceptedRel = await AdvisorRelationship.acceptInvitation({
      tokenHash: tokenHash,
      userId: testUser.id,
      userEmail: clientEmail,
    });

    assert(acceptedRel.status === "active", "Relationship status transitioned to 'active'");
    assert(acceptedRel.userId === testUser.id, "User ID connected to relationship");
    assert(acceptedRel.acceptedAt !== null, "accepted_at timestamp populated");

    // Attempting to reuse the consumed token hash MUST fail
    const reusedTokenLookup = await AdvisorRelationship.findByTokenHash(tokenHash);
    assert(reusedTokenLookup === null, "Consumed token cannot be looked up or reused (single-use enforced)");

    // Query active advisor for user
    const activeRelForUser = await AdvisorRelationship.findActiveForUser(testUser.id);
    assert(activeRelForUser !== null, "findActiveForUser successfully returns active relationship");
    assert(activeRelForUser.advisor.fullName === "Rohan Varma", "Advisor details attached to user relationship");

    // Query active clients for advisor
    const advisorClients = await AdvisorRelationship.findAdvisorActiveClients(createdAdv.id);
    assert(advisorClients.total === 1, "Advisor active clients count is 1");
    assert(advisorClients.clients[0].user.fullName === "Ananya Sharma", "Active client user profile joined");

    // ── Test 7: Relationship state transitions (Terminate & Reassign)
    console.log("\n[Test 7] Relationship state transitions: Reassign to Advisor 2");
    const secondAdv = await Advisor.create({
      fullName: "Pooja Mehta",
      email: `pooja_${Date.now()}@smartfinance.test`,
      password: "PoojaPassword2026!",
      firmName: "Mehta Capital Advisors",
      licenseNumber: "ARN-9876543",
    });

    const reassignedRel = await AdvisorRelationship.reassignRelationship({
      currentRelationshipId: acceptedRel.id,
      newAdvisorId: secondAdv.id,
      assignedByAdminId: null,
      reason: "Client relocated to Bangalore branch",
    });

    assert(reassignedRel.status === "active", "New relationship created with status 'active'");
    assert(reassignedRel.advisorId === secondAdv.id, "New relationship belongs to Advisor 2");

    // Verify old relationship is marked 'reassigned' and no longer 'active'
    const oldRelCheck = await AdvisorRelationship.findById(acceptedRel.id);
    assert(oldRelCheck.status === "reassigned", "Old relationship transitioned to 'reassigned'");
    assert(oldRelCheck.terminatedAt !== null, "Old relationship has terminated_at timestamp");

    // ── Test 8: AuditLog model
    console.log("\n[Test 8] Create and query AuditLog entries");
    const createdLog = await AuditLog.create({
      actorType: "advisor",
      actorId: createdAdv.id,
      action: "CLIENT_INVITED",
      resourceType: "relationship",
      resourceId: createdRel.id,
      details: { clientEmail: "prospective_client@example.com", firmName: "Varma Wealth Advisory LLP" },
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });

    assert(createdLog !== null, "AuditLog created successfully");
    assert(createdLog.action === "CLIENT_INVITED", "AuditLog action matches");
    assert(createdLog.details.clientEmail === "prospective_client@example.com", "AuditLog details JSONB stored");

    const foundLog = await AuditLog.findById(createdLog.id);
    assert(foundLog !== null, "AuditLog found by ID");

    const logList = await AuditLog.findAll({ actorId: createdAdv.id });
    assert(logList.total >= 1, "AuditLog list filters correctly by actorId");

    // ── Test 9: Verify existing users/admins integrity
    console.log("\n[Test 9] Verify existing users and admins remain intact");
    const { rows: postUsers } = await client.query("SELECT COUNT(*) FROM users");
    const { rows: postAdmins } = await client.query("SELECT COUNT(*) FROM admins");
    // Since we created 1 test user inside the transaction, count should be init + 1
    assert(parseInt(postUsers[0].count, 10) === initUserCount + 1, "Users table unaffected by new models");
    assert(parseInt(postAdmins[0].count, 10) === initAdminCount, "Admins table unaffected by new models");

    // ── Clean rollback so no test clutter remains
    throw new Error("ROLLBACK_TEST_TRANSACTION_CLEAN");
  }).catch((err) => {
    if (err.message === "ROLLBACK_TEST_TRANSACTION_CLEAN") {
      console.log("\n✓ All test data rolled back cleanly. Database remains unmodified.");
    } else {
      console.error("\n❌ Test failed with error:", err);
      process.exit(1);
    }
  });

  console.log("\n==================================================");
  console.log(`  TEST RESULTS: ${testPassed} PASSED, ${testFailed} FAILED `);
  console.log("==================================================\n");

  await db.pool.end();
}

runTests().catch((err) => {
  console.error("Runner error:", err);
  process.exit(1);
});
