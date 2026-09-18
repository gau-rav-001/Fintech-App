// backend/services/notificationService.js
// ── SmartFinance Notification Service ─────────────────────────────────────────
// Business layer for notification creation, validation, sanitization, and queries.

const Notification = require("../models/Notification");
const {
  NOTIFICATION_TYPES,
  RECIPIENT_TYPES,
  ACTOR_TYPES,
} = require("../constants/notificationTypes");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ── Sanitize text content to prevent control character injection ─────────────
function sanitizeText(str, maxLength = 1000) {
  if (typeof str !== "string") return "";
  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
    .slice(0, maxLength);
}

// ── Create a notification with strict validation ──────────────────────────────
async function createNotification({
  recipientType,
  recipientId,
  actorType,
  actorId = null,
  type,
  title,
  message,
  actionUrl = "",
  relatedEntityType = "",
  relatedEntityId = null,
  expiresAt = null,
}, client = null) {
  // 1. Recipient Type Validation
  if (!Object.values(RECIPIENT_TYPES).includes(recipientType)) {
    throw new Error(`Invalid recipientType: '${recipientType}'. Must be one of: ${Object.values(RECIPIENT_TYPES).join(", ")}`);
  }

  // 2. Recipient ID Validation
  if (!recipientId || !UUID_REGEX.test(recipientId)) {
    throw new Error(`Invalid recipientId format. Must be a valid UUID.`);
  }

  // 3. Actor Type Validation
  if (!Object.values(ACTOR_TYPES).includes(actorType)) {
    throw new Error(`Invalid actorType: '${actorType}'. Must be one of: ${Object.values(ACTOR_TYPES).join(", ")}`);
  }

  // 4. Actor ID Validation (Nullable for system actor)
  if (actorType !== ACTOR_TYPES.SYSTEM) {
    if (!actorId || !UUID_REGEX.test(actorId)) {
      throw new Error(`actorId is required and must be a valid UUID for non-system actor '${actorType}'.`);
    }
  } else {
    // For system, if actorId is provided but invalid, normalize to null
    if (actorId && !UUID_REGEX.test(actorId)) {
      actorId = null;
    }
  }

  // 5. Notification Type Validation
  if (!type || typeof type !== "string") {
    throw new Error("Notification type is required.");
  }

  // 6. Title & Message Validation
  const cleanTitle = sanitizeText(title, 255);
  if (!cleanTitle) {
    throw new Error("Notification title cannot be empty.");
  }

  const cleanMessage = sanitizeText(message, 2000);
  if (!cleanMessage) {
    throw new Error("Notification message cannot be empty.");
  }

  // 7. Related Entity ID Validation
  let cleanEntityId = null;
  if (relatedEntityId && UUID_REGEX.test(relatedEntityId)) {
    cleanEntityId = relatedEntityId;
  }

  // 8. Safe Action URL
  let cleanUrl = "";
  if (typeof actionUrl === "string" && actionUrl.trim().length <= 255) {
    cleanUrl = actionUrl.trim();
  }

  // 9. Persist to PostgreSQL
  return Notification.create({
    recipientType,
    recipientId,
    actorType,
    actorId,
    type,
    title: cleanTitle,
    message: cleanMessage,
    actionUrl: cleanUrl,
    relatedEntityType: typeof relatedEntityType === "string" ? relatedEntityType.trim().slice(0, 50) : "",
    relatedEntityId: cleanEntityId,
    expiresAt,
  }, client);
}

// ── Non-blocking safe notification dispatcher ────────────────────────────────
// Guarantees that a notification failure will NEVER break a successful parent transaction.
async function safeNotify(payload) {
  try {
    return await createNotification(payload);
  } catch (err) {
    console.error("⚠️ Notification dispatch failed (non-blocking):", err.message);
    return null;
  }
}

// ── List notifications for authenticated recipient ────────────────────────────
async function listNotifications({
  recipientType,
  recipientId,
  limit = 20,
  offset = 0,
  unreadOnly = false,
}) {
  const boundedLimit  = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const boundedOffset = Math.max(0, parseInt(offset, 10) || 0);

  const { notifications, total, unreadCount } = await Notification.findByRecipient({
    recipientType,
    recipientId,
    limit: boundedLimit,
    offset: boundedOffset,
    unreadOnly: Boolean(unreadOnly),
    includeExpired: false,
  });

  return {
    notifications: notifications.map(Notification.formatPublicNotification),
    total,
    unreadCount,
    limit: boundedLimit,
    offset: boundedOffset,
  };
}

// ── Get unread notification count ─────────────────────────────────────────────
async function getUnreadCount({ recipientType, recipientId }) {
  return Notification.countUnread({ recipientType, recipientId });
}

// ── Mark single notification as read ──────────────────────────────────────────
async function markAsRead({ id, recipientType, recipientId }) {
  if (!id || !UUID_REGEX.test(id)) {
    return null;
  }
  const updated = await Notification.markAsRead({ id, recipientType, recipientId });
  return updated ? Notification.formatPublicNotification(updated) : null;
}

// ── Mark all notifications as read ────────────────────────────────────────────
async function markAllAsRead({ recipientType, recipientId }) {
  return Notification.markAllAsRead({ recipientType, recipientId });
}

module.exports = {
  createNotification,
  safeNotify,
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
