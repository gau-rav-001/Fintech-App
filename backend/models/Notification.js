// backend/models/Notification.js
// ── SmartFinance Notification Model ──────────────────────────────────────────
// Database access layer for the notifications table.
// All queries strictly parameterize inputs and enforce recipient ownership.

const db = require("../config/db");

const COLS = `
  id, recipient_type, recipient_id, actor_type, actor_id,
  type, title, message, action_url, related_entity_type,
  related_entity_id, is_read, read_at, expires_at, created_at
`;

function formatNotification(row) {
  if (!row) return null;
  return {
    id:                row.id,
    recipientType:     row.recipient_type,
    recipientId:       row.recipient_id,
    actorType:         row.actor_type,
    actorId:           row.actor_id || null,
    type:              row.type,
    title:             row.title,
    message:           row.message,
    actionUrl:         row.action_url || "",
    relatedEntityType: row.related_entity_type || "",
    relatedEntityId:   row.related_entity_id || null,
    isRead:            Boolean(row.is_read),
    readAt:            row.read_at || null,
    expiresAt:         row.expires_at || null,
    createdAt:         row.created_at,
  };
}

// ── Formatter for safe public/client consumption ─────────────────────────────
function formatPublicNotification(notif) {
  if (!notif) return null;
  return {
    id:                notif.id,
    type:              notif.type,
    title:             notif.title,
    message:           notif.message,
    actionUrl:         notif.actionUrl || "",
    relatedEntityType: notif.relatedEntityType || "",
    relatedEntityId:   notif.relatedEntityId || null,
    isRead:            Boolean(notif.isRead),
    readAt:            notif.readAt || null,
    expiresAt:         notif.expiresAt || null,
    createdAt:         notif.createdAt,
  };
}

// ── Write operations ──────────────────────────────────────────────────────────

async function create({
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
  const queryExecutor = client ? client.query.bind(client) : db.query.bind(db);

  const { rows } = await queryExecutor(
    `INSERT INTO notifications (
       recipient_type, recipient_id, actor_type, actor_id,
       type, title, message, action_url,
       related_entity_type, related_entity_id, expires_at
     ) VALUES (
       $1, $2, $3, $4,
       $5, $6, $7, $8,
       $9, $10, $11
     ) RETURNING ${COLS}`,
    [
      recipientType,
      recipientId,
      actorType,
      actorId,
      type,
      title.trim(),
      message.trim(),
      actionUrl ? actionUrl.trim() : "",
      relatedEntityType ? relatedEntityType.trim() : "",
      relatedEntityId,
      expiresAt,
    ]
  );

  return formatNotification(rows[0]);
}

// ── Read operations ───────────────────────────────────────────────────────────

async function findByRecipient({
  recipientType,
  recipientId,
  limit = 20,
  offset = 0,
  unreadOnly = false,
  includeExpired = false,
}) {
  const params = [recipientType, recipientId];
  let whereSQL = `WHERE recipient_type = $1 AND recipient_id = $2`;
  let idx = 3;

  if (!includeExpired) {
    whereSQL += ` AND (expires_at IS NULL OR expires_at > NOW())`;
  }

  if (unreadOnly) {
    whereSQL += ` AND is_read = FALSE`;
  }

  const querySQL = `
    SELECT ${COLS}
    FROM notifications
    ${whereSQL}
    ORDER BY created_at DESC
    LIMIT $${idx} OFFSET $${idx + 1}
  `;

  const countSQL = `
    SELECT COUNT(*) AS total
    FROM notifications
    ${whereSQL}
  `;

  const unreadSQL = `
    SELECT COUNT(*) AS unread
    FROM notifications
    WHERE recipient_type = $1 
      AND recipient_id = $2 
      AND is_read = FALSE
      AND (expires_at IS NULL OR expires_at > NOW())
  `;

  const [itemsResult, countResult, unreadResult] = await Promise.all([
    db.query(querySQL, [...params, limit, offset]),
    db.query(countSQL, params),
    db.query(unreadSQL, [recipientType, recipientId]),
  ]);

  return {
    notifications: itemsResult.rows.map(formatNotification),
    total:         parseInt(countResult.rows[0]?.total, 10) || 0,
    unreadCount:   parseInt(unreadResult.rows[0]?.unread, 10) || 0,
  };
}

async function countUnread({ recipientType, recipientId }) {
  const { rows } = await db.query(
    `SELECT COUNT(*) AS unread
     FROM notifications
     WHERE recipient_type = $1 
       AND recipient_id = $2 
       AND is_read = FALSE
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [recipientType, recipientId]
  );
  return parseInt(rows[0]?.unread, 10) || 0;
}

async function findById({ id, recipientType, recipientId }) {
  const { rows } = await db.query(
    `SELECT ${COLS}
     FROM notifications
     WHERE id = $1 AND recipient_type = $2 AND recipient_id = $3`,
    [id, recipientType, recipientId]
  );
  return formatNotification(rows[0]);
}

async function markAsRead({ id, recipientType, recipientId }) {
  const { rows } = await db.query(
    `UPDATE notifications
     SET is_read = TRUE,
         read_at = COALESCE(read_at, NOW())
     WHERE id = $1 
       AND recipient_type = $2 
       AND recipient_id = $3
     RETURNING ${COLS}`,
    [id, recipientType, recipientId]
  );
  return formatNotification(rows[0]);
}

async function markAllAsRead({ recipientType, recipientId }) {
  const { rows } = await db.query(
    `UPDATE notifications
     SET is_read = TRUE,
         read_at = NOW()
     WHERE recipient_type = $1 
       AND recipient_id = $2 
       AND is_read = FALSE
       AND (expires_at IS NULL OR expires_at > NOW())
     RETURNING id`,
    [recipientType, recipientId]
  );
  return { updatedCount: rows.length };
}

async function deleteExpired() {
  const { rows } = await db.query(
    `DELETE FROM notifications
     WHERE expires_at IS NOT NULL AND expires_at < NOW()
     RETURNING id`
  );
  return { deletedCount: rows.length };
}

module.exports = {
  create,
  findByRecipient,
  countUnread,
  findById,
  markAsRead,
  markAllAsRead,
  deleteExpired,
  formatNotification,
  formatPublicNotification,
};
