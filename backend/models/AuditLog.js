const db = require("../config/db");

const COLS = `
  id, actor_type, actor_id, action, resource_type, resource_id,
  details, ip_address, user_agent, created_at
`;

// ── Shape DB row into clean JS object ─────────────────────────────────────────
function formatAuditLog(row) {
  if (!row) return null;
  return {
    id:           row.id,
    actorType:    row.actor_type,
    actorId:      row.actor_id,
    action:       row.action,
    resourceType: row.resource_type,
    resourceId:   row.resource_id,
    details:      row.details || {},
    ipAddress:    row.ip_address || "",
    userAgent:    row.user_agent || "",
    createdAt:    row.created_at,
  };
}

// ── Write operation ───────────────────────────────────────────────────────────

async function create({
  actorType,
  actorId,
  action,
  resourceType,
  resourceId,
  details = {},
  ipAddress = "",
  userAgent = "",
}) {
  try {
    const { rows } = await db.query(
      `INSERT INTO audit_logs (
         actor_type, actor_id, action, resource_type, resource_id,
         details, ip_address, user_agent
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8
       ) RETURNING ${COLS}`,
      [
        actorType,
        actorId,
        action,
        resourceType,
        String(resourceId),
        JSON.stringify(details || {}),
        ipAddress || "",
        userAgent || "",
      ]
    );
    return formatAuditLog(rows[0]);
  } catch (err) {
    // Non-blocking logger: surface warning to console without breaking parent flow
    console.error("⚠️ Failed to write audit log:", err.message);
    return null;
  }
}

// ── Read operations ───────────────────────────────────────────────────────────

async function findById(id) {
  const { rows } = await db.query(
    `SELECT ${COLS} FROM audit_logs WHERE id = $1`,
    [id]
  );
  return formatAuditLog(rows[0]);
}

async function findAll({
  page = 1,
  limit = 50,
  actorType,
  actorId,
  action,
  resourceType,
  resourceId,
  startDate,
  endDate,
} = {}) {
  const offset = (page - 1) * limit;
  const params = [];
  const where = [];
  let idx = 1;

  if (actorType) {
    where.push(`actor_type = $${idx}`);
    params.push(actorType);
    idx++;
  }
  if (actorId) {
    where.push(`actor_id = $${idx}`);
    params.push(actorId);
    idx++;
  }
  if (action) {
    where.push(`action = $${idx}`);
    params.push(action);
    idx++;
  }
  if (resourceType) {
    where.push(`resource_type = $${idx}`);
    params.push(resourceType);
    idx++;
  }
  if (resourceId) {
    where.push(`resource_id = $${idx}`);
    params.push(String(resourceId));
    idx++;
  }
  if (startDate) {
    where.push(`created_at >= $${idx}`);
    params.push(startDate);
    idx++;
  }
  if (endDate) {
    where.push(`created_at <= $${idx}`);
    params.push(endDate);
    idx++;
  }

  const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [{ rows: logs }, { rows: countRows }] = await Promise.all([
    db.query(
      `SELECT ${COLS} FROM audit_logs ${whereSQL} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    ),
    db.query(
      `SELECT COUNT(*) FROM audit_logs ${whereSQL}`,
      params
    ),
  ]);

  return {
    logs: logs.map(formatAuditLog),
    total: parseInt(countRows[0].count, 10),
    page,
    limit,
  };
}

async function count({ actorType, action, resourceType } = {}) {
  const params = [];
  const where = [];
  let idx = 1;

  if (actorType) {
    where.push(`actor_type = $${idx}`);
    params.push(actorType);
    idx++;
  }
  if (action) {
    where.push(`action = $${idx}`);
    params.push(action);
    idx++;
  }
  if (resourceType) {
    where.push(`resource_type = $${idx}`);
    params.push(resourceType);
    idx++;
  }

  const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows } = await db.query(`SELECT COUNT(*) FROM audit_logs ${whereSQL}`, params);
  return parseInt(rows[0].count, 10);
}

module.exports = {
  create,
  findById,
  findAll,
  count,
  formatAuditLog,
};
