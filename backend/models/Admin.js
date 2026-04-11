const db     = require("../config/db");
const bcrypt = require("bcryptjs");

const SAFE_COLS = `id, full_name, email, role, is_active, created_at, updated_at`;

function formatAdmin(row) {
  if (!row) return null;
  return {
    id:        row.id,
    fullName:  row.full_name,
    email:     row.email,
    role:      row.role,
    isActive:  row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findByEmail(email) {
  const { rows } = await db.query(
    `SELECT ${SAFE_COLS} FROM admins WHERE email = $1`, [email.toLowerCase()]
  );
  return formatAdmin(rows[0]);
}

async function findByEmailWithPassword(email) {
  const { rows } = await db.query(
    `SELECT ${SAFE_COLS}, password_hash FROM admins WHERE email = $1`,
    [email.toLowerCase()]
  );
  return rows[0]
    ? { ...formatAdmin(rows[0]), passwordHash: rows[0].password_hash }
    : null;
}

async function findById(id) {
  const { rows } = await db.query(
    `SELECT ${SAFE_COLS} FROM admins WHERE id = $1`, [id]
  );
  return formatAdmin(rows[0]);
}

async function create({ fullName, email, password }) {
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(password, salt);
  const { rows } = await db.query(
    `INSERT INTO admins (full_name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING ${SAFE_COLS}`,
    [fullName, email.toLowerCase(), hash]
  );
  return formatAdmin(rows[0]);
}

async function count() {
  const { rows } = await db.query(`SELECT COUNT(*) FROM admins`);
  return parseInt(rows[0].count);
}

async function comparePassword(passwordHash, plain) {
  return bcrypt.compare(plain, passwordHash);
}

module.exports = { findByEmail, findByEmailWithPassword, findById, create, count, comparePassword, formatAdmin };
