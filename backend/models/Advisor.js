const db = require("../config/db");
const bcrypt = require("bcryptjs");

// ── Safe columns to SELECT (never return password_hash by default) ────────────
const SAFE_COLS = `
  id, full_name, email, mobile, profile_picture, is_email_verified,
  firm_name, license_number, specializations, experience_years, bio,
  city, state, country,
  approval_status, rejection_reason, suspension_reason, approved_by, approved_at,
  created_at, updated_at
`;

// ── Shape DB row into a clean JS object ───────────────────────────────────────
function formatAdvisor(row) {
  if (!row) return null;
  return {
    id:               row.id,
    fullName:         row.full_name,
    email:            row.email,
    mobile:           row.mobile || "",
    profilePicture:   row.profile_picture || "",
    isEmailVerified:  row.is_email_verified,
    firmName:         row.firm_name,
    licenseNumber:    row.license_number,
    specializations:  row.specializations || [],
    experienceYears:  row.experience_years !== undefined && row.experience_years !== null ? Number(row.experience_years) : 0,
    bio:              row.bio || "",
    location: {
      city:           row.city || "",
      state:          row.state || "",
      country:        row.country || "India",
    },
    approvalStatus:   row.approval_status,
    rejectionReason:  row.rejection_reason || "",
    suspensionReason: row.suspension_reason || "",
    approvedBy:       row.approved_by || null,
    approvedAt:       row.approved_at || null,
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
  };
}

// ── Read operations ───────────────────────────────────────────────────────────

async function findById(id) {
  const { rows } = await db.query(
    `SELECT ${SAFE_COLS} FROM advisors WHERE id = $1`,
    [id]
  );
  return formatAdvisor(rows[0]);
}

async function findByEmail(email) {
  const { rows } = await db.query(
    `SELECT ${SAFE_COLS} FROM advisors WHERE email = $1`,
    [email.toLowerCase().trim()]
  );
  return formatAdvisor(rows[0]);
}

async function findByEmailWithPassword(email) {
  const { rows } = await db.query(
    `SELECT ${SAFE_COLS}, password_hash FROM advisors WHERE email = $1`,
    [email.toLowerCase().trim()]
  );
  return rows[0]
    ? { ...formatAdvisor(rows[0]), passwordHash: rows[0].password_hash }
    : null;
}

async function findActiveAdvisor(id) {
  const { rows } = await db.query(
    `SELECT ${SAFE_COLS} FROM advisors 
     WHERE id = $1 AND approval_status = 'approved' AND is_email_verified = TRUE`,
    [id]
  );
  return formatAdvisor(rows[0]);
}

// ── Write operations ──────────────────────────────────────────────────────────

async function create({
  fullName,
  email,
  mobile = "",
  password,
  firmName,
  licenseNumber,
  specializations = [],
  experienceYears = 0,
  bio = "",
  city = "",
  state = "",
  country = "India",
  approvalStatus = "pending",
  isEmailVerified = false,
}) {
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  const { rows } = await db.query(
    `INSERT INTO advisors (
       full_name, email, mobile, password_hash, profile_picture, is_email_verified,
       firm_name, license_number, specializations, experience_years, bio,
       city, state, country, approval_status
     ) VALUES (
       $1, $2, $3, $4, $5, $6,
       $7, $8, $9, $10, $11,
       $12, $13, $14, $15
     ) RETURNING ${SAFE_COLS}`,
    [
      fullName.trim(),
      email.toLowerCase().trim(),
      mobile.trim(),
      passwordHash,
      "",
      isEmailVerified,
      firmName.trim(),
      licenseNumber.trim(),
      Array.isArray(specializations) ? specializations : [],
      Number(experienceYears) || 0,
      bio.trim(),
      city.trim(),
      state.trim(),
      country.trim(),
      approvalStatus,
    ]
  );
  return formatAdvisor(rows[0]);
}

async function update(id, fields) {
  const allowed = {
    fullName:         "full_name",
    mobile:           "mobile",
    profilePicture:   "profile_picture",
    isEmailVerified:  "is_email_verified",
    firmName:         "firm_name",
    licenseNumber:    "license_number",
    specializations:  "specializations",
    experienceYears:  "experience_years",
    bio:              "bio",
    city:             "city",
    state:            "state",
    country:          "country",
  };

  const setClauses = [];
  const values = [];
  let idx = 1;

  for (const [jsKey, pgCol] of Object.entries(allowed)) {
    if (jsKey in fields && fields[jsKey] !== undefined) {
      setClauses.push(`${pgCol} = $${idx}`);
      values.push(fields[jsKey]);
      idx++;
    }
  }

  if (setClauses.length === 0) return findById(id);

  values.push(id);
  const { rows } = await db.query(
    `UPDATE advisors SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING ${SAFE_COLS}`,
    values
  );
  return formatAdvisor(rows[0]);
}

async function updateApprovalStatus(id, {
  approvalStatus,
  rejectionReason = "",
  suspensionReason = "",
  approvedBy = null,
  approvedAt = null,
}) {
  const { rows } = await db.query(
    `UPDATE advisors 
     SET approval_status = $1,
         rejection_reason = $2,
         suspension_reason = $3,
         approved_by = $4,
         approved_at = $5
     WHERE id = $6
     RETURNING ${SAFE_COLS}`,
    [
      approvalStatus,
      rejectionReason,
      suspensionReason,
      approvedBy,
      approvedAt || (approvalStatus === "approved" ? new Date() : null),
      id,
    ]
  );
  return formatAdvisor(rows[0]);
}

async function verifyAdvisorEmail(id) {
  const { rows } = await db.query(
    `UPDATE advisors SET is_email_verified = TRUE WHERE id = $1 RETURNING ${SAFE_COLS}`,
    [id]
  );
  return formatAdvisor(rows[0]);
}

async function updatePassword(id, newPassword) {
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(newPassword, salt);
  await db.query(
    `UPDATE advisors SET password_hash = $1 WHERE id = $2`,
    [hash, id]
  );
}

async function comparePassword(passwordHash, plain) {
  if (!passwordHash || !plain) return false;
  return bcrypt.compare(plain, passwordHash);
}

// ── Query & List operations ───────────────────────────────────────────────────

async function findAll({
  page = 1,
  limit = 20,
  search = "",
  status,
  firmName,
} = {}) {
  const offset = (page - 1) * limit;
  const params = [];
  const where = [];
  let idx = 1;

  if (search) {
    where.push(`(full_name ILIKE $${idx} OR email ILIKE $${idx} OR firm_name ILIKE $${idx} OR license_number ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }
  if (status) {
    where.push(`approval_status = $${idx}`);
    params.push(status);
    idx++;
  }
  if (firmName) {
    where.push(`firm_name ILIKE $${idx}`);
    params.push(`%${firmName}%`);
    idx++;
  }

  const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [{ rows: advisors }, { rows: countRows }] = await Promise.all([
    db.query(
      `SELECT ${SAFE_COLS} FROM advisors ${whereSQL} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    ),
    db.query(
      `SELECT COUNT(*) FROM advisors ${whereSQL}`,
      params
    ),
  ]);

  return {
    advisors: advisors.map(formatAdvisor),
    total: parseInt(countRows[0].count, 10),
  };
}

async function count({ status } = {}) {
  const params = [];
  let whereSQL = "";
  if (status) {
    whereSQL = "WHERE approval_status = $1";
    params.push(status);
  }
  const { rows } = await db.query(`SELECT COUNT(*) FROM advisors ${whereSQL}`, params);
  return parseInt(rows[0].count, 10);
}

module.exports = {
  findById,
  findByEmail,
  findByEmailWithPassword,
  findActiveAdvisor,
  create,
  update,
  updateApprovalStatus,
  verifyAdvisorEmail,
  updatePassword,
  comparePassword,
  findAll,
  count,
  formatAdvisor,
};
