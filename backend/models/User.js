const db     = require("../config/db");
const bcrypt = require("bcryptjs");

// ── Safe columns to SELECT (never return password_hash by default) ────────────
const SAFE_COLS = `
  id, full_name, email, mobile, google_id, provider, profile_picture,
  is_email_verified, is_profile_complete, role,
  dob, gender, occupation, marital_status, dependents,
  city, state, country,
  income_monthly, income_source, income_additional, income_growth_pct,
  risk_tolerance, risk_experience, risk_horizon_years, risk_style,
  expenses, investments, goals, loans,
  onboarded_at, created_at, updated_at
`;

// ── Shape DB row into a clean JS object ───────────────────────────────────────
function formatUser(row) {
  if (!row) return null;
  return {
    id:                 row.id,
    fullName:           row.full_name,
    email:              row.email,
    mobile:             row.mobile || "",
    googleId:           row.google_id || null,
    provider:           row.provider,
    profilePicture:     row.profile_picture || "",
    isEmailVerified:    row.is_email_verified,
    isProfileComplete:  row.is_profile_complete,
    role:               row.role,
    dob:                row.dob,
    gender:             row.gender,
    occupation:         row.occupation || "",
    maritalStatus:      row.marital_status,
    dependents:         row.dependents,
    location: {
      city:    row.city    || "",
      state:   row.state   || "",
      country: row.country || "India",
    },
    income: {
      monthly:         parseFloat(row.income_monthly)    || 0,
      source:          row.income_source,
      additionalMonthly: parseFloat(row.income_additional) || 0,
      annualGrowthPct: parseFloat(row.income_growth_pct) || 8,
    },
    riskProfile: {
      tolerance:        row.risk_tolerance,
      experience:       row.risk_experience,
      timeHorizonYears: row.risk_horizon_years,
      investmentStyle:  row.risk_style,
    },
    expenses:    row.expenses    || [],
    investments: row.investments || [],
    goals:       row.goals       || [],
    loans:       row.loans       || [],
    onboardedAt: row.onboarded_at,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

// ── CRUD methods ──────────────────────────────────────────────────────────────

async function findById(id) {
  const { rows } = await db.query(
    `SELECT ${SAFE_COLS} FROM users WHERE id = $1`, [id]
  );
  return formatUser(rows[0]);
}

async function findByEmail(email) {
  const { rows } = await db.query(
    `SELECT ${SAFE_COLS} FROM users WHERE email = $1`, [email.toLowerCase()]
  );
  return formatUser(rows[0]);
}

async function findByEmailWithPassword(email) {
  const { rows } = await db.query(
    `SELECT ${SAFE_COLS}, password_hash FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );
  return rows[0] ? { ...formatUser(rows[0]), passwordHash: rows[0].password_hash } : null;
}

async function findByGoogleId(googleId) {
  const { rows } = await db.query(
    `SELECT ${SAFE_COLS} FROM users WHERE google_id = $1`, [googleId]
  );
  return formatUser(rows[0]);
}

async function create({ fullName, email, mobile, password, googleId, provider, profilePicture, isEmailVerified }) {
  let passwordHash = null;
  if (password) {
    const salt = await bcrypt.genSalt(12);
    passwordHash = await bcrypt.hash(password, salt);
  }
  const { rows } = await db.query(
    `INSERT INTO users
       (full_name, email, mobile, password_hash, google_id, provider, profile_picture, is_email_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${SAFE_COLS}`,
    [
      fullName,
      email.toLowerCase(),
      mobile || "",
      passwordHash,
      googleId || null,
      provider || "email",
      profilePicture || "",
      isEmailVerified || false,
    ]
  );
  return formatUser(rows[0]);
}

async function update(id, fields) {
  // Build SET clause dynamically from allowed fields
  const allowed = {
    fullName:          "full_name",
    mobile:            "mobile",
    profilePicture:    "profile_picture",
    isEmailVerified:   "is_email_verified",
    isProfileComplete: "is_profile_complete",
    googleId:          "google_id",
    dob:               "dob",
    gender:            "gender",
    occupation:        "occupation",
    maritalStatus:     "marital_status",
    dependents:        "dependents",
    city:              "city",
    state:             "state",
    country:           "country",
    incomeMonthly:     "income_monthly",
    incomeSource:      "income_source",
    incomeAdditional:  "income_additional",
    incomeGrowthPct:   "income_growth_pct",
    riskTolerance:     "risk_tolerance",
    riskExperience:    "risk_experience",
    riskHorizonYears:  "risk_horizon_years",
    riskStyle:         "risk_style",
    expenses:          "expenses",
    investments:       "investments",
    goals:             "goals",
    loans:             "loans",
    onboardedAt:       "onboarded_at",
  };

  const setClauses = [];
  const values     = [];
  let   idx        = 1;

  for (const [jsKey, pgCol] of Object.entries(allowed)) {
    if (jsKey in fields && fields[jsKey] !== undefined) {
      // JSONB arrays need explicit casting
      const isJsonb = ["expenses","investments","goals","loans"].includes(jsKey);
      setClauses.push(`${pgCol} = $${idx}${isJsonb ? "::jsonb" : ""}`);
      values.push(isJsonb ? JSON.stringify(fields[jsKey]) : fields[jsKey]);
      idx++;
    }
  }

  if (setClauses.length === 0) return findById(id);

  values.push(id);
  const { rows } = await db.query(
    `UPDATE users SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING ${SAFE_COLS}`,
    values
  );
  return formatUser(rows[0]);
}

async function updatePassword(id, newPassword) {
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(newPassword, salt);
  await db.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, id]);
}

async function comparePassword(passwordHash, plain) {
  if (!passwordHash) return false;
  return bcrypt.compare(plain, passwordHash);
}

async function findAll({ page = 1, limit = 20, search = "", profileComplete } = {}) {
  const offset = (page - 1) * limit;
  const params = [];
  const where  = [];
  let   idx    = 1;

  if (search) {
    where.push(`(full_name ILIKE $${idx} OR email ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }
  if (profileComplete !== undefined) {
    where.push(`is_profile_complete = $${idx}`);
    params.push(profileComplete);
    idx++;
  }

  const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [{ rows: users }, { rows: countRows }] = await Promise.all([
    db.query(`SELECT ${SAFE_COLS} FROM users ${whereSQL} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`, [...params, limit, offset]),
    db.query(`SELECT COUNT(*) FROM users ${whereSQL}`, params),
  ]);

  return {
    users: users.map(formatUser),
    total: parseInt(countRows[0].count),
  };
}

module.exports = {
  findById,
  findByEmail,
  findByEmailWithPassword,
  findByGoogleId,
  create,
  update,
  updatePassword,
  comparePassword,
  findAll,
  formatUser,
};
