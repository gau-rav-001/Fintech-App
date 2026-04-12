const db = require("../config/db");

// FIX: every column is explicitly aliased with the table alias (c.) so that
// the LEFT JOIN on admins in findAll() does not produce an
// "ERROR: column reference is ambiguous" crash on shared columns like
// id, created_at, and updated_at.
const COLS = `
  c.id, c.type, c.title, c.description,
  c.speaker, c.date, c.time, c.duration, c.link, c.status,
  c.summary, c.source, c.category, c.urgent, c.published_at,
  c.youtube_url, c.thumbnail,
  c.created_by, c.is_published, c.created_at, c.updated_at
`;

// Plain column list for single-table queries (no alias needed)
const COLS_PLAIN = `
  id, type, title, description,
  speaker, date, time, duration, link, status,
  summary, source, category, urgent, published_at,
  youtube_url, thumbnail,
  created_by, is_published, created_at, updated_at
`;

function formatContent(row) {
  if (!row) return null;
  return {
    id:          row.id,
    type:        row.type,
    title:       row.title,
    description: row.description || "",
    speaker:     row.speaker     || "",
    date:        row.date        || "",
    time:        row.time        || "",
    duration:    row.duration    || "",
    link:        row.link        || "",
    status:      row.status,
    summary:     row.summary     || "",
    source:      row.source      || "",
    category:    row.category,
    urgent:      row.urgent,
    publishedAt: row.published_at,
    youtubeUrl:  row.youtube_url || "",
    thumbnail:   row.thumbnail   || "",
    createdBy:   row.created_by,
    isPublished: row.is_published,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

async function findPublic(type) {
  const params = [];
  let where = "WHERE is_published = TRUE";
  if (type) { where += " AND type = $1"; params.push(type); }

  const { rows } = await db.query(
    `SELECT ${COLS_PLAIN} FROM content ${where} ORDER BY created_at DESC LIMIT 50`,
    params
  );
  return rows.map(formatContent);
}

async function findAll(type) {
  const params = [];
  let where = "";
  if (type) { where = "WHERE c.type = $1"; params.push(type); }

  // FIX: use COLS (with c. aliases) so that id/created_at/updated_at from the
  //      admins JOIN don't collide with content's own columns.
  const { rows } = await db.query(
    `SELECT ${COLS}, a.full_name AS creator_name, a.email AS creator_email
     FROM content c
     LEFT JOIN admins a ON a.id = c.created_by
     ${where}
     ORDER BY c.created_at DESC`,
    params
  );
  return rows.map(r => ({ ...formatContent(r), creatorName: r.creator_name, creatorEmail: r.creator_email }));
}

async function create(data, adminId) {
  const {
    type, title, description = "",
    speaker = "", date = "", time = "", duration = "", link = "", status = "upcoming",
    summary = "", source = "", category = "general", urgent = false, publishedAt,
    youtubeUrl = "", thumbnail = "",
    isPublished = true,
  } = data;

  const { rows } = await db.query(
    `INSERT INTO content
       (type, title, description, speaker, date, time, duration, link, status,
        summary, source, category, urgent, published_at, youtube_url, thumbnail,
        created_by, is_published)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING ${COLS_PLAIN}`,
    [
      type, title, description, speaker, date, time, duration, link, status,
      summary, source, category, urgent, publishedAt || new Date(), youtubeUrl, thumbnail,
      adminId, isPublished,
    ]
  );
  return formatContent(rows[0]);
}

async function update(id, data) {
  const allowed = {
    title: "title", description: "description", speaker: "speaker",
    date: "date", time: "time", duration: "duration", link: "link",
    status: "status", summary: "summary", source: "source",
    category: "category", urgent: "urgent", youtubeUrl: "youtube_url",
    thumbnail: "thumbnail", isPublished: "is_published",
  };

  const sets   = [];
  const values = [];
  let   idx    = 1;
  for (const [k, col] of Object.entries(allowed)) {
    if (k in data) { sets.push(`${col} = $${idx++}`); values.push(data[k]); }
  }
  if (!sets.length) return findById(id);

  values.push(id);
  const { rows } = await db.query(
    `UPDATE content SET ${sets.join(", ")} WHERE id = $${idx} RETURNING ${COLS_PLAIN}`,
    values
  );
  return formatContent(rows[0]);
}

async function remove(id) {
  const { rowCount } = await db.query(`DELETE FROM content WHERE id = $1`, [id]);
  return rowCount > 0;
}

async function findById(id) {
  const { rows } = await db.query(
    `SELECT ${COLS_PLAIN} FROM content WHERE id = $1`, [id]
  );
  return formatContent(rows[0]);
}

module.exports = { findPublic, findAll, create, update, remove, findById };
