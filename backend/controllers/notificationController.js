// backend/controllers/notificationController.js
// ── SmartFinance Notification Controller ─────────────────────────────────────
// Handles notification listing, unread counting, and read status mutations.
// Recipient scoping is STRICTLY derived from req.notificationActor (never from query/body).

const notificationService = require("../services/notificationService");
const { ok, fail }         = require("../utils/response");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ── GET /api/notifications ────────────────────────────────────────────────────
// Lists notifications for the authenticated session (user, advisor, or admin)
const getNotifications = async (req, res) => {
  try {
    const actor = req.notificationActor;
    if (!actor || !actor.type || !actor.id) {
      return fail(res, "Access denied. Valid session required.", 401);
    }

    // Defensive parsing of pagination parameters
    const limitNum = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    
    // Support either offset or page-based pagination
    let offsetNum = 0;
    if (req.query.offset !== undefined) {
      offsetNum = Math.max(0, parseInt(req.query.offset, 10) || 0);
    } else if (req.query.page !== undefined) {
      const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
      offsetNum = (pageNum - 1) * limitNum;
    }

    const unreadOnly = req.query.unreadOnly === "true" || req.query.unreadOnly === true;

    const data = await notificationService.listNotifications({
      recipientType: actor.type,
      recipientId:   actor.id,
      limit:         limitNum,
      offset:        offsetNum,
      unreadOnly,
    });

    return ok(res, data, "Notifications retrieved successfully.");
  } catch (err) {
    console.error("getNotifications error:", err);
    return fail(res, "Failed to retrieve notifications.", 500);
  }
};

// ── GET /api/notifications/unread-count ───────────────────────────────────────
// Returns unread notification count for the authenticated session
const getUnreadCount = async (req, res) => {
  try {
    const actor = req.notificationActor;
    if (!actor || !actor.type || !actor.id) {
      return fail(res, "Access denied. Valid session required.", 401);
    }

    const unreadCount = await notificationService.getUnreadCount({
      recipientType: actor.type,
      recipientId:   actor.id,
    });

    return ok(res, { unreadCount }, "Unread notification count retrieved successfully.");
  } catch (err) {
    console.error("getUnreadCount error:", err);
    return fail(res, "Failed to retrieve unread notification count.", 500);
  }
};

// ── PATCH /api/notifications/:notificationId/read ────────────────────────────
// Marks a single notification as read if owned by the authenticated session
const markNotificationRead = async (req, res) => {
  try {
    const actor = req.notificationActor;
    if (!actor || !actor.type || !actor.id) {
      return fail(res, "Access denied. Valid session required.", 401);
    }

    const notificationId = req.params?.notificationId;
    if (!notificationId || !UUID_REGEX.test(notificationId)) {
      return fail(res, "Invalid Notification ID format.", 400, { code: "INVALID_NOTIFICATION_ID" });
    }

    const updated = await notificationService.markAsRead({
      id:            notificationId,
      recipientType: actor.type,
      recipientId:   actor.id,
    });

    if (!updated) {
      return fail(res, "Notification not found.", 404, { code: "NOTIFICATION_NOT_FOUND" });
    }

    return ok(res, updated, "Notification marked as read.");
  } catch (err) {
    console.error("markNotificationRead error:", err);
    return fail(res, "Failed to mark notification as read.", 500);
  }
};

// ── PATCH /api/notifications/read-all ─────────────────────────────────────────
// Marks all active unread notifications as read for the authenticated session
const markAllNotificationsRead = async (req, res) => {
  try {
    const actor = req.notificationActor;
    if (!actor || !actor.type || !actor.id) {
      return fail(res, "Access denied. Valid session required.", 401);
    }

    const result = await notificationService.markAllAsRead({
      recipientType: actor.type,
      recipientId:   actor.id,
    });

    return ok(res, result, "All notifications marked as read.");
  } catch (err) {
    console.error("markAllNotificationsRead error:", err);
    return fail(res, "Failed to mark all notifications as read.", 500);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};
