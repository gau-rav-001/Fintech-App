// backend/services/tests/notification.test.js
// ── Run: node backend/services/tests/notification.test.js ──────────────────────
// Phase 7.2 Step 3: Notification Foundation & Backend Service Comprehensive Test Suite

process.env.NODE_ENV = "test";

const http         = require("http");
const express      = require("express");
const cookieParser = require("cookie-parser");
const db           = require("../../config/db");
const Notification = require("../../models/Notification");
const notificationService = require("../notificationService");
const {
  NOTIFICATION_TYPES,
  RECIPIENT_TYPES,
  ACTOR_TYPES,
  RELATED_ENTITY_TYPES,
} = require("../../constants/notificationTypes");
const Advisor      = require("../../models/Advisor");
const User         = require("../../models/User");
const Admin        = require("../../models/Admin");
const { signToken, buildAdvisorPayload, buildPayload } = require("../../utils/jwt");
const notificationRoutes = require("../../routes/notificationRoutes");

async function runNotificationTests() {
  console.log("\n==================================================================");
  console.log("  PHASE 7.2 STEP 3 — NOTIFICATION FOUNDATION TEST SUITE           ");
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

  // Setup express test server
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/notifications", notificationRoutes);

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/notifications`;

  const createdUserIds = [];
  const createdAdvisorIds = [];
  const createdAdminIds = [];
  const createdNotificationIds = [];

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // FIXTURE SETUP
    // ══════════════════════════════════════════════════════════════════════════
    console.log("─── CREATING TEST ACTORS ───");

    // 1. User Fixture
    const testUser = await User.create({
      fullName: "Notification Test User",
      email: `notif_user_${Date.now()}@sf.test`,
      password: "UserSecure2026!",
      isEmailVerified: true,
    });
    createdUserIds.push(testUser.id);
    const userToken = signToken(buildPayload(testUser));

    // 2. Advisor Fixture (approved & email verified)
    const testAdvisor = await Advisor.create({
      fullName: "Notification Test Advisor",
      email: `notif_advisor_${Date.now()}@sf.test`,
      password: "AdvisorSecure2026!",
      firmName: "Advisory Services Ltd",
      licenseNumber: `ARN-${Date.now()}`,
      approvalStatus: "approved",
      isEmailVerified: true,
    });
    await Advisor.updateApprovalStatus(testAdvisor.id, {
      approvalStatus: "approved",
      approvedAt: new Date(),
    });
    createdAdvisorIds.push(testAdvisor.id);
    const advisorToken = signToken(buildAdvisorPayload(testAdvisor));

    // 3. Admin Fixture
    const testAdmin = await Admin.create({
      fullName: `Admin_${Date.now()}`,
      email: `notif_admin_${Date.now()}@sf.test`,
      password: "AdminSecure2026!",
    });
    createdAdminIds.push(testAdmin.id);
    const adminToken = signToken({ id: testAdmin.id, role: "admin", email: testAdmin.email });

    console.log(`  ✓ Test User created (${testUser.id})`);
    console.log(`  ✓ Test Advisor created (${testAdvisor.id})`);
    console.log(`  ✓ Test Admin created (${testAdmin.id})\n`);

    // ══════════════════════════════════════════════════════════════════════════
    // SECTION 1: CREATION & VALIDATION (TESTS 1 - 8)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("─── SECTION 1: NOTIFICATION CREATION & VALIDATION ───");

    // Test 1: Create user notification
    const userNotif = await notificationService.createNotification({
      recipientType: RECIPIENT_TYPES.USER,
      recipientId: testUser.id,
      actorType: ACTOR_TYPES.ADVISOR,
      actorId: testAdvisor.id,
      type: NOTIFICATION_TYPES.ADVISOR_CONNECTION_REQUEST,
      title: "New Connection Request",
      message: "Advisor Alpha requested connection.",
      actionUrl: "/settings",
      relatedEntityType: RELATED_ENTITY_TYPES.RELATIONSHIP,
    });
    createdNotificationIds.push(userNotif.id);
    assert(userNotif.recipientType === "user" && userNotif.recipientId === testUser.id, "Test 1: Create user notification");
    assert(userNotif.isRead === false, "Test 1b: Notification initially unread");

    // Test 2: Create advisor notification
    const advisorNotif = await notificationService.createNotification({
      recipientType: RECIPIENT_TYPES.ADVISOR,
      recipientId: testAdvisor.id,
      actorType: ACTOR_TYPES.USER,
      actorId: testUser.id,
      type: NOTIFICATION_TYPES.ADVISOR_CONNECTION_ACCEPTED,
      title: "Connection Accepted",
      message: "Client accepted your request.",
      actionUrl: "/advisor/portal",
    });
    createdNotificationIds.push(advisorNotif.id);
    assert(advisorNotif.recipientType === "advisor" && advisorNotif.recipientId === testAdvisor.id, "Test 2: Create advisor notification");

    // Test 3: Create admin notification
    const adminNotif = await notificationService.createNotification({
      recipientType: RECIPIENT_TYPES.ADMIN,
      recipientId: testAdmin.id,
      actorType: ACTOR_TYPES.USER,
      actorId: testUser.id,
      type: NOTIFICATION_TYPES.SYSTEM_ALERT,
      title: "Admin Notice",
      message: "Notice for platform administration.",
    });
    createdNotificationIds.push(adminNotif.id);
    assert(adminNotif.recipientType === "admin" && adminNotif.recipientId === testAdmin.id, "Test 3: Create admin notification");

    // Test 4: System actor (actorId may be null)
    const sysNotif = await notificationService.createNotification({
      recipientType: RECIPIENT_TYPES.USER,
      recipientId: testUser.id,
      actorType: ACTOR_TYPES.SYSTEM,
      actorId: null,
      type: NOTIFICATION_TYPES.SYSTEM_ALERT,
      title: "System Update",
      message: "Maintenance scheduled for Sunday.",
    });
    createdNotificationIds.push(sysNotif.id);
    assert(sysNotif.actorType === "system" && sysNotif.actorId === null, "Test 4: System actor allows null actorId");

    // Test 5: Invalid recipient type rejected
    let caughtRecipientErr = false;
    try {
      await notificationService.createNotification({
        recipientType: "invalid_recipient",
        recipientId: testUser.id,
        actorType: ACTOR_TYPES.SYSTEM,
        type: NOTIFICATION_TYPES.SYSTEM_ALERT,
        title: "Test",
        message: "Test",
      });
    } catch (e) {
      caughtRecipientErr = true;
    }
    assert(caughtRecipientErr, "Test 5: Invalid recipient type rejected");

    // Test 6: Invalid actor type rejected
    let caughtActorErr = false;
    try {
      await notificationService.createNotification({
        recipientType: RECIPIENT_TYPES.USER,
        recipientId: testUser.id,
        actorType: "invalid_actor",
        actorId: testUser.id,
        type: NOTIFICATION_TYPES.SYSTEM_ALERT,
        title: "Test",
        message: "Test",
      });
    } catch (e) {
      caughtActorErr = true;
    }
    assert(caughtActorErr, "Test 6: Invalid actor type rejected");

    // Test 7: Empty title rejected
    let caughtTitleErr = false;
    try {
      await notificationService.createNotification({
        recipientType: RECIPIENT_TYPES.USER,
        recipientId: testUser.id,
        actorType: ACTOR_TYPES.SYSTEM,
        type: NOTIFICATION_TYPES.SYSTEM_ALERT,
        title: "   ",
        message: "Valid message",
      });
    } catch (e) {
      caughtTitleErr = true;
    }
    assert(caughtTitleErr, "Test 7: Empty title rejected");

    // Test 8: Empty message rejected
    let caughtMsgErr = false;
    try {
      await notificationService.createNotification({
        recipientType: RECIPIENT_TYPES.USER,
        recipientId: testUser.id,
        actorType: ACTOR_TYPES.SYSTEM,
        type: NOTIFICATION_TYPES.SYSTEM_ALERT,
        title: "Valid Title",
        message: "   ",
      });
    } catch (e) {
      caughtMsgErr = true;
    }
    assert(caughtMsgErr, "Test 8: Empty message rejected");

    // ══════════════════════════════════════════════════════════════════════════
    // SECTION 2: LISTING, PAGINATION, UNREAD & EXPIRY (TESTS 9 - 13)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── SECTION 2: LISTING, PAGINATION, UNREAD & EXPIRY ───");

    // Seed additional notifications for User to test pagination and filtering
    const batch = [];
    for (let i = 1; i <= 5; i++) {
      batch.push(
        notificationService.createNotification({
          recipientType: RECIPIENT_TYPES.USER,
          recipientId: testUser.id,
          actorType: ACTOR_TYPES.SYSTEM,
          type: NOTIFICATION_TYPES.SYSTEM_ALERT,
          title: `Batch Item ${i}`,
          message: `Description for batch item ${i}`,
        })
      );
    }
    const createdBatch = await Promise.all(batch);
    createdBatch.forEach((n) => createdNotificationIds.push(n.id));

    // Test 9: List notifications via API (User)
    const listRes = await fetch(`${baseUrl}?limit=10`, {
      headers: { Cookie: `sf_token=${userToken}` },
    });
    const listJson = await listRes.json();
    assert(listRes.status === 200, "Test 9a: GET /api/notifications returns HTTP 200");
    assert(Array.isArray(listJson.data.notifications), "Test 9b: Returned notifications is array");
    assert(listJson.data.total >= 7, "Test 9c: Total count includes created notifications");

    // Test 10: Pagination (limit & offset)
    const p1Res = await fetch(`${baseUrl}?limit=3&offset=0`, {
      headers: { Cookie: `sf_token=${userToken}` },
    });
    const p1Json = await p1Res.json();
    const p2Res = await fetch(`${baseUrl}?limit=3&offset=3`, {
      headers: { Cookie: `sf_token=${userToken}` },
    });
    const p2Json = await p2Res.json();
    assert(p1Json.data.notifications.length === 3, "Test 10a: First page limit respected");
    assert(p2Json.data.notifications.length === 3, "Test 10b: Second page limit respected");
    assert(p1Json.data.notifications[0].id !== p2Json.data.notifications[0].id, "Test 10c: Offset offsets items cleanly");

    // Test 11: unreadOnly filter
    // First mark one as read
    await Notification.markAsRead({ id: userNotif.id, recipientType: "user", recipientId: testUser.id });
    const unreadRes = await fetch(`${baseUrl}?unreadOnly=true`, {
      headers: { Cookie: `sf_token=${userToken}` },
    });
    const unreadJson = await unreadRes.json();
    const containsRead = unreadJson.data.notifications.some((n) => n.id === userNotif.id);
    assert(!containsRead, "Test 11a: unreadOnly excludes read notifications");
    assert(unreadJson.data.notifications.every((n) => n.isRead === false), "Test 11b: All items in unreadOnly are isRead: false");

    // Test 12: Expired notifications excluded
    const expiredPast = new Date(Date.now() - 60000); // 1 minute ago
    const expiredNotif = await notificationService.createNotification({
      recipientType: RECIPIENT_TYPES.USER,
      recipientId: testUser.id,
      actorType: ACTOR_TYPES.SYSTEM,
      type: NOTIFICATION_TYPES.SYSTEM_ALERT,
      title: "Expired Notification",
      message: "This notice should be hidden.",
      expiresAt: expiredPast,
    });
    createdNotificationIds.push(expiredNotif.id);

    const listWithExpiryCheck = await fetch(`${baseUrl}?limit=50`, {
      headers: { Cookie: `sf_token=${userToken}` },
    });
    const listExpJson = await listWithExpiryCheck.json();
    const foundExpired = listExpJson.data.notifications.some((n) => n.id === expiredNotif.id);
    assert(!foundExpired, "Test 12: Expired notification excluded from active list");

    // Test 13: Unread count
    const countRes = await fetch(`${baseUrl}/unread-count`, {
      headers: { Cookie: `sf_token=${userToken}` },
    });
    const countJson = await countRes.json();
    assert(countRes.status === 200, "Test 13a: GET /api/notifications/unread-count returns HTTP 200");
    assert(typeof countJson.data.unreadCount === "number", "Test 13b: unreadCount is numeric");
    assert(countJson.data.unreadCount >= 5, "Test 13c: unreadCount accurately reflects active unread items");

    // ══════════════════════════════════════════════════════════════════════════
    // SECTION 3: READ MUTATIONS & IDEMPOTENCY (TESTS 14 - 16)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── SECTION 3: READ MUTATIONS & IDEMPOTENCY ───");

    // Target a specific unread notification
    const targetNotif = createdBatch[0];

    // Test 14: Mark notification as read
    const markReadRes = await fetch(`${baseUrl}/${targetNotif.id}/read`, {
      method: "PATCH",
      headers: { Cookie: `sf_token=${userToken}` },
    });
    const markReadJson = await markReadRes.json();
    assert(markReadRes.status === 200, "Test 14a: PATCH /:id/read returns HTTP 200");
    assert(markReadJson.data.isRead === true, "Test 14b: isRead updated to true");
    assert(markReadJson.data.readAt !== null, "Test 14c: readAt timestamp recorded");

    // Test 15: Mark read idempotency (calling it again succeeds without error)
    const repeatRes = await fetch(`${baseUrl}/${targetNotif.id}/read`, {
      method: "PATCH",
      headers: { Cookie: `sf_token=${userToken}` },
    });
    const repeatJson = await repeatRes.json();
    assert(repeatRes.status === 200, "Test 15a: Repeat mark read returns HTTP 200 (idempotent)");
    assert(repeatJson.data.isRead === true, "Test 15b: isRead remains true");

    // Test 16: Mark all as read
    const readAllRes = await fetch(`${baseUrl}/read-all`, {
      method: "PATCH",
      headers: { Cookie: `sf_token=${userToken}` },
    });
    const readAllJson = await readAllRes.json();
    assert(readAllRes.status === 200, "Test 16a: PATCH /read-all returns HTTP 200");
    assert(readAllJson.data.updatedCount >= 1, "Test 16b: updatedCount returned");

    // Verify unread count is now 0 for User
    const postReadAllCountRes = await fetch(`${baseUrl}/unread-count`, {
      headers: { Cookie: `sf_token=${userToken}` },
    });
    const postReadAllCountJson = await postReadAllCountRes.json();
    assert(postReadAllCountJson.data.unreadCount === 0, "Test 16c: Post mark-all-read unread count is 0");

    // ══════════════════════════════════════════════════════════════════════════
    // SECTION 4: ACTOR ISOLATION & IDOR DEFENSE (TESTS 17 - 21)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── SECTION 4: ACTOR ISOLATION & IDOR DEFENSE ───");

    // Test 17: User isolation (User cannot see Advisor notifications)
    const userListRes = await fetch(`${baseUrl}`, {
      headers: { Cookie: `sf_token=${userToken}` },
    });
    const userListJson = await userListRes.json();
    const userSawAdvisorNotif = userListJson.data.notifications.some((n) => n.id === advisorNotif.id);
    assert(!userSawAdvisorNotif, "Test 17: User cannot see Advisor notifications");

    // Test 18: Advisor isolation (Advisor sees only Advisor notifications)
    const advListRes = await fetch(`${baseUrl}`, {
      headers: { Cookie: `sf_advisor_token=${advisorToken}` },
    });
    const advListJson = await advListRes.json();
    const advSawUserNotif = advListJson.data.notifications.some((n) => n.id === userNotif.id);
    const advSawAdvisorNotif = advListJson.data.notifications.some((n) => n.id === advisorNotif.id);
    assert(!advSawUserNotif, "Test 18a: Advisor cannot see User notifications");
    assert(advSawAdvisorNotif, "Test 18b: Advisor sees their own notification");

    // Test 19: Admin isolation (Admin sees only Admin notifications)
    const adminListRes = await fetch(`${baseUrl}`, {
      headers: { Cookie: `sf_admin_token=${adminToken}` },
    });
    const adminListJson = await adminListRes.json();
    const adminSawUserNotif = adminListJson.data.notifications.some((n) => n.id === userNotif.id);
    const adminSawAdminNotif = adminListJson.data.notifications.some((n) => n.id === adminNotif.id);
    assert(!adminSawUserNotif, "Test 19a: Admin cannot see User notifications in normal list");
    assert(adminSawAdminNotif, "Test 19b: Admin sees their own notification");

    // Test 20: Guessed / Cross-actor notification UUID cannot be marked as read by another actor
    // User attempts to mark Advisor's notification as read
    const idorMarkRes = await fetch(`${baseUrl}/${advisorNotif.id}/read`, {
      method: "PATCH",
      headers: { Cookie: `sf_token=${userToken}` },
    });
    assert(idorMarkRes.status === 404, "Test 20a: Cross-actor notification mark read returns 404 Not Found");

    // Guessed arbitrary random UUID
    const randomUuid = "a0000000-0000-4000-8000-000000000001";
    const guessedUuidRes = await fetch(`${baseUrl}/${randomUuid}/read`, {
      method: "PATCH",
      headers: { Cookie: `sf_token=${userToken}` },
    });
    assert(guessedUuidRes.status === 404, "Test 20b: Guessed non-existent UUID returns 404");

    // Test 21: Authenticated identity strictly overrides supplied recipient ID (Parameter Spoofing Resistance)
    // Attacker sends ?recipient_id=advisorId or ?recipientId=advisorId in query
    const spoofQueryRes = await fetch(`${baseUrl}?recipient_id=${testAdvisor.id}&recipientId=${testAdvisor.id}`, {
      headers: { Cookie: `sf_token=${userToken}` },
    });
    const spoofQueryJson = await spoofQueryRes.json();
    const querySpoofSawAdvisor = spoofQueryJson.data.notifications.some((n) => n.id === advisorNotif.id);
    assert(!querySpoofSawAdvisor, "Test 21a: Query parameter ?recipient_id spoofing completely ignored");

    // Attacker sends { recipientId: advisorId } in PATCH body
    const spoofBodyRes = await fetch(`${baseUrl}/${userNotif.id}/read`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `sf_token=${userToken}`,
      },
      body: JSON.stringify({ recipientId: testAdvisor.id, recipient_id: testAdvisor.id }),
    });
    assert(spoofBodyRes.status === 200, "Test 21b: PATCH request succeeds under user identity");
    // Confirm it did NOT reassign to advisor in DB
    const checkDb = await Notification.findById({ id: userNotif.id, recipientType: "user", recipientId: testUser.id });
    assert(checkDb && checkDb.recipientId === testUser.id, "Test 21c: Recipient ID in DB remained unchanged");

    // ══════════════════════════════════════════════════════════════════════════
    // SECTION 5: SECURITY, SANITIZATION & NON-BLOCKING (TESTS 22 - 24)
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n─── SECTION 5: SECURITY, SANITIZATION & NON-BLOCKING ───");

    // Test 22: No token/password/OTP leakage in public notification representation
    const publicSample = Notification.formatPublicNotification(userNotif);
    assert(!("recipientId" in publicSample), "Test 22a: recipientId not exposed in public representation");
    assert(!("actorId" in publicSample), "Test 22b: actorId not exposed in public representation");
    assert(!("recipientType" in publicSample), "Test 22c: recipientType not exposed in public representation");
    assert(!("token" in publicSample) && !("password" in publicSample), "Test 22d: Zero auth secrets exposed");

    // Test 23: SQL Parameterization check (verifying injection strings in title/message are stored safely as literal strings)
    const sqlInjectionPayload = "'; DROP TABLE notifications; --";
    const injectionNotif = await notificationService.createNotification({
      recipientType: RECIPIENT_TYPES.USER,
      recipientId: testUser.id,
      actorType: ACTOR_TYPES.SYSTEM,
      type: NOTIFICATION_TYPES.SYSTEM_ALERT,
      title: sqlInjectionPayload,
      message: sqlInjectionPayload,
    });
    createdNotificationIds.push(injectionNotif.id);
    assert(injectionNotif.title === sqlInjectionPayload, "Test 23a: SQL injection vector treated safely as literal text");
    const testTableCheck = await db.query(`SELECT 1 FROM notifications LIMIT 1`);
    assert(testTableCheck.rows.length === 1, "Test 23b: Table intact (parameterized query protected DB)");

    // Test 24: Non-blocking safeNotify guarantees failure does not crash or corrupt primary lifecycle
    const invalidNotifyAttempt = await notificationService.safeNotify({
      recipientType: "corrupted_type",
      recipientId: "not-a-uuid",
      actorType: "invalid",
      type: null,
      title: "",
      message: "",
    });
    assert(invalidNotifyAttempt === null, "Test 24a: safeNotify safely caught error and returned null without throwing");

    // Additional check: Invalid UUID in URL parameter rejected by validator (HTTP 422/400)
    const badParamRes = await fetch(`${baseUrl}/not-a-valid-uuid/read`, {
      method: "PATCH",
      headers: { Cookie: `sf_token=${userToken}` },
    });
    assert(badParamRes.status === 400 || badParamRes.status === 422, "Validation Check: Non-UUID parameter rejected with HTTP 422/400");

    // Additional check: Unauthenticated access rejected with 401
    const unauthRes = await fetch(`${baseUrl}`);
    assert(unauthRes.status === 401, "Auth Check: Unauthenticated request rejected with HTTP 401");

  } finally {
    // ══════════════════════════════════════════════════════════════════════════
    // TEARDOWN
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n[Teardown] Cleaning up test records from database...");
    if (createdNotificationIds.length > 0) {
      await db.query(`DELETE FROM notifications WHERE id = ANY($1::uuid[])`, [createdNotificationIds]);
    }
    if (createdAdvisorIds.length > 0) {
      await db.query(`DELETE FROM notifications WHERE actor_id = ANY($1::uuid[]) OR recipient_id = ANY($1::uuid[])`, [createdAdvisorIds]);
      await db.query(`DELETE FROM advisors WHERE id = ANY($1::uuid[])`, [createdAdvisorIds]);
    }
    if (createdUserIds.length > 0) {
      await db.query(`DELETE FROM notifications WHERE actor_id = ANY($1::uuid[]) OR recipient_id = ANY($1::uuid[])`, [createdUserIds]);
      await db.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [createdUserIds]);
    }
    if (createdAdminIds.length > 0) {
      await db.query(`DELETE FROM admins WHERE id = ANY($1::uuid[])`, [createdAdminIds]);
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

runNotificationTests().catch((err) => {
  console.error("Test runner encountered an error:", err);
  process.exit(1);
});
