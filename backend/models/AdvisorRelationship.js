const db = require("../config/db");

// ── Safe columns (excludes sensitive internal token hashes by default) ────────
const SAFE_COLS = `
  id, advisor_id, user_id, client_email, status, initiated_by,
  assigned_by_admin_id, invitation_expires_at, notes, rejection_reason,
  accepted_at, terminated_at, created_at, updated_at
`;

// ── Shape DB row into clean JS object ─────────────────────────────────────────
function formatRelationship(row) {
  if (!row) return null;
  const rel = {
    id:                   row.id,
    advisorId:            row.advisor_id,
    userId:               row.user_id || null,
    clientEmail:          row.client_email,
    status:               row.status,
    initiatedBy:          row.initiated_by,
    assignedByAdminId:    row.assigned_by_admin_id || null,
    invitationExpiresAt:  row.invitation_expires_at || null,
    notes:                row.notes || "",
    rejectionReason:      row.rejection_reason || "",
    acceptedAt:           row.accepted_at || null,
    terminatedAt:         row.terminated_at || null,
    createdAt:            row.created_at,
    updatedAt:            row.updated_at,
  };

  // If joined advisor data is present
  if (row.advisor_full_name || row.advisor_firm) {
    rel.advisor = {
      id:             row.advisor_id,
      fullName:       row.advisor_full_name,
      email:          row.advisor_email,
      firmName:       row.advisor_firm,
      licenseNumber:  row.advisor_license,
      mobile:         row.advisor_mobile || "",
      profilePicture: row.advisor_picture || "",
      specializations:row.advisor_specializations || [],
    };
  }

  // If joined user data is present
  if (row.user_full_name || row.user_email) {
    rel.user = {
      id:                 row.user_id,
      fullName:           row.user_full_name,
      email:              row.user_email,
      mobile:             row.user_mobile || "",
      profilePicture:     row.user_picture || "",
      isProfileComplete:  row.is_profile_complete,
      onboardedAt:        row.onboarded_at,
      location: {
        city:             row.user_city || "",
        state:            row.user_state || "",
        country:          row.user_country || "India",
      },
      incomeMonthly:      parseFloat(row.user_income_monthly) || 0,
      totalExpenses:      Array.isArray(row.user_expenses)
                            ? row.user_expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
                            : 0,
      totalInvestments:   Array.isArray(row.user_investments)
                            ? row.user_investments.reduce((s, i) => s + (parseFloat(i.currentValue ?? i.investedAmount) || 0), 0)
                            : 0,
      totalLoans:         Array.isArray(row.user_loans)
                            ? row.user_loans.reduce((s, l) => s + (parseFloat(l.outstandingAmount) || 0), 0)
                            : 0,
      goalsCount:         Array.isArray(row.user_goals) ? row.user_goals.length : 0,
    };
  }

  return rel;
}

// ── Read operations ───────────────────────────────────────────────────────────

async function findById(id) {
  const { rows } = await db.query(
    `SELECT ${SAFE_COLS} FROM advisor_client_relationships WHERE id = $1`,
    [id]
  );
  return formatRelationship(rows[0]);
}

async function findByTokenHash(tokenHash) {
  if (!tokenHash) return null;
  const { rows } = await db.query(
    `SELECT acr.*, 
            a.full_name AS advisor_full_name, 
            a.email AS advisor_email, 
            a.firm_name AS advisor_firm, 
            a.license_number AS advisor_license,
            a.profile_picture AS advisor_picture
     FROM advisor_client_relationships acr
     JOIN advisors a ON a.id = acr.advisor_id
     WHERE acr.invitation_token_hash = $1
       AND acr.status = 'invited'
       AND (acr.invitation_expires_at IS NULL OR acr.invitation_expires_at > NOW())`,
    [tokenHash]
  );
  return formatRelationship(rows[0]);
}

async function findActiveForUser(userId) {
  if (!userId) return null;
  const { rows } = await db.query(
    `SELECT acr.*, 
            a.full_name AS advisor_full_name, 
            a.email AS advisor_email, 
            a.firm_name AS advisor_firm, 
            a.license_number AS advisor_license,
            a.mobile AS advisor_mobile,
            a.profile_picture AS advisor_picture,
            a.specializations AS advisor_specializations
     FROM advisor_client_relationships acr
     JOIN advisors a ON a.id = acr.advisor_id
     WHERE acr.user_id = $1 AND acr.status = 'active'`,
    [userId]
  );
  return formatRelationship(rows[0]);
}

async function findByAdvisorAndUser(advisorId, userId) {
  const { rows } = await db.query(
    `SELECT ${SAFE_COLS} FROM advisor_client_relationships 
     WHERE advisor_id = $1 AND user_id = $2 
     ORDER BY created_at DESC LIMIT 1`,
    [advisorId, userId]
  );
  return formatRelationship(rows[0]);
}

async function findActiveByAdvisorAndUser(advisorId, userId) {
  const { rows } = await db.query(
    `SELECT ${SAFE_COLS} FROM advisor_client_relationships 
     WHERE advisor_id = $1 AND user_id = $2 AND status = 'active'`,
    [advisorId, userId]
  );
  return formatRelationship(rows[0]);
}

async function findAdvisorActiveClients(advisorId, { page = 1, limit = 20, search = "" } = {}) {
  const offset = (page - 1) * limit;
  const params = [advisorId];
  let whereSQL = `WHERE acr.advisor_id = $1 AND acr.status = 'active'`;
  let idx = 2;

  if (search) {
    whereSQL += ` AND (u.full_name ILIKE $${idx} OR u.email ILIKE $${idx} OR acr.client_email ILIKE $${idx})`;
    params.push(`%${search}%`);
    idx++;
  }

  const querySQL = `
    SELECT acr.*,
           u.full_name AS user_full_name,
           u.email AS user_email,
           u.mobile AS user_mobile,
           u.profile_picture AS user_picture,
           u.is_profile_complete,
           u.onboarded_at,
           u.city AS user_city,
           u.state AS user_state,
           u.country AS user_country,
           u.income_monthly AS user_income_monthly,
           u.expenses AS user_expenses,
           u.investments AS user_investments,
           u.loans AS user_loans,
           u.goals AS user_goals
    FROM advisor_client_relationships acr
    JOIN users u ON u.id = acr.user_id
    ${whereSQL}
    ORDER BY acr.accepted_at DESC NULLS LAST, acr.created_at DESC
    LIMIT $${idx} OFFSET $${idx + 1}
  `;

  const countSQL = `
    SELECT COUNT(*) 
    FROM advisor_client_relationships acr
    JOIN users u ON u.id = acr.user_id
    ${whereSQL}
  `;

  const [{ rows: clients }, { rows: countRows }] = await Promise.all([
    db.query(querySQL, [...params, limit, offset]),
    db.query(countSQL, params),
  ]);

  return {
    clients: clients.map(formatRelationship),
    total: parseInt(countRows[0].count, 10),
  };
}

async function findPendingForUser(userId, userEmail = "") {
  const params = [userId];
  let whereSQL = `WHERE (acr.user_id = $1`;
  if (userEmail) {
    whereSQL += ` OR acr.client_email = $2) AND acr.status = 'pending_user_acceptance'`;
    params.push(userEmail.toLowerCase().trim());
  } else {
    whereSQL += `) AND acr.status = 'pending_user_acceptance'`;
  }

  const { rows } = await db.query(
    `SELECT acr.*, 
            a.full_name AS advisor_full_name, 
            a.email AS advisor_email, 
            a.firm_name AS advisor_firm, 
            a.license_number AS advisor_license,
            a.mobile AS advisor_mobile,
            a.profile_picture AS advisor_picture,
            a.specializations AS advisor_specializations
     FROM advisor_client_relationships acr
     JOIN advisors a ON a.id = acr.advisor_id
     ${whereSQL}
     ORDER BY acr.created_at DESC`,
    params
  );
  return rows.map(formatRelationship);
}

async function findPendingForAdvisor(advisorId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const [{ rows: items }, { rows: countRows }] = await Promise.all([
    db.query(
      `SELECT acr.*,
              u.full_name AS user_full_name,
              u.email AS user_email
       FROM advisor_client_relationships acr
       LEFT JOIN users u ON u.id = acr.user_id
       WHERE acr.advisor_id = $1 AND acr.status IN ('invited', 'pending_user_acceptance')
       ORDER BY acr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [advisorId, limit, offset]
    ),
    db.query(
      `SELECT COUNT(*) FROM advisor_client_relationships 
       WHERE advisor_id = $1 AND status IN ('invited', 'pending_user_acceptance')`,
      [advisorId]
    ),
  ]);

  return {
    pending: items.map(formatRelationship),
    total: parseInt(countRows[0].count, 10),
  };
}

// ── Write operations ──────────────────────────────────────────────────────────

async function create({
  advisorId,
  userId = null,
  clientEmail,
  status = "invited",
  initiatedBy = "advisor",
  assignedByAdminId = null,
  invitationTokenHash = null,
  invitationExpiresAt = null,
  notes = "",
}) {
  const { rows } = await db.query(
    `INSERT INTO advisor_client_relationships (
       advisor_id, user_id, client_email, status, initiated_by,
       assigned_by_admin_id, invitation_token_hash, invitation_expires_at, notes
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8, $9
     ) RETURNING ${SAFE_COLS}`,
    [
      advisorId,
      userId,
      clientEmail.toLowerCase().trim(),
      status,
      initiatedBy,
      assignedByAdminId,
      invitationTokenHash,
      invitationExpiresAt,
      notes.trim(),
    ]
  );
  return formatRelationship(rows[0]);
}

async function updateStatus(id, newStatus, {
  notes,
  rejectionReason,
  terminatedAt,
  acceptedAt,
} = {}) {
  const setClauses = ["status = $1"];
  const values = [newStatus];
  let idx = 2;

  if (notes !== undefined) {
    setClauses.push(`notes = $${idx}`);
    values.push(notes);
    idx++;
  }
  if (rejectionReason !== undefined) {
    setClauses.push(`rejection_reason = $${idx}`);
    values.push(rejectionReason);
    idx++;
  }
  if (terminatedAt !== undefined) {
    setClauses.push(`terminated_at = $${idx}`);
    values.push(terminatedAt);
    idx++;
  }
  if (acceptedAt !== undefined) {
    setClauses.push(`accepted_at = $${idx}`);
    values.push(acceptedAt);
    idx++;
  }

  values.push(id);
  const { rows } = await db.query(
    `UPDATE advisor_client_relationships 
     SET ${setClauses.join(", ")} 
     WHERE id = $${idx} 
     RETURNING ${SAFE_COLS}`,
    values
  );
  return formatRelationship(rows[0]);
}

// ── State machine transition methods ──────────────────────────────────────────

async function acceptInvitation({ tokenHash, userId, userEmail }) {
  return db.transaction(async (client) => {
    // 1. Locate valid invitation by hashed token with row-level lock
    const { rows: invites } = await client.query(
      `SELECT * FROM advisor_client_relationships 
       WHERE invitation_token_hash = $1 
         AND status = 'invited' 
         AND (invitation_expires_at IS NULL OR invitation_expires_at > NOW())
       FOR UPDATE`,
      [tokenHash]
    );

    if (!invites[0]) {
      const err = new Error("Invalid or expired invitation token.");
      err.code = "INVITE_INVALID";
      throw err;
    }

    const invite = invites[0];

    // 2. Check if already claimed
    if (invite.user_id) {
      const err = new Error("This invitation has already been claimed.");
      err.code = "INVITE_ALREADY_CLAIMED";
      throw err;
    }

    // 3. Verify email matches (if token was sent to specific email)
    if (invite.client_email && userEmail && invite.client_email.toLowerCase().trim() !== userEmail.toLowerCase().trim()) {
      const err = new Error("This invitation was issued to a different email address.");
      err.code = "EMAIL_MISMATCH";
      throw err;
    }

    // 4. Verify user does not already have an active advisor
    const { rows: activeExisting } = await client.query(
      `SELECT id FROM advisor_client_relationships
       WHERE user_id = $1 AND status = 'active'
       FOR UPDATE`,
      [userId]
    );
    if (activeExisting.length > 0) {
      const err = new Error("You already have an active financial advisor.");
      err.code = "USER_ALREADY_HAS_ADVISOR";
      throw err;
    }

    // 5. Verify advisor is eligible (approved and email verified)
    const { rows: advisors } = await client.query(
      `SELECT id, full_name, email, firm_name, specializations, profile_picture, approval_status, is_email_verified
       FROM advisors
       WHERE id = $1`,
      [invite.advisor_id]
    );
    const advisor = advisors[0];
    if (!advisor || advisor.approval_status !== "approved" || !advisor.is_email_verified) {
      const err = new Error("The advisor is no longer eligible or active.");
      err.code = "ADVISOR_NOT_ELIGIBLE";
      throw err;
    }

    // 6. Atomically consume token and activate relationship (partial unique index idx_acr_single_active_advisor enforces 1 active advisor)
    const { rows: updated } = await client.query(
      `UPDATE advisor_client_relationships 
       SET user_id = $1,
           status = 'active',
           accepted_at = NOW(),
           invitation_token_hash = NULL
       WHERE id = $2 
       RETURNING ${SAFE_COLS}`,
      [userId, invite.id]
    );

    const rel = formatRelationship(updated[0]);
    rel.advisor = {
      id:              advisor.id,
      fullName:        advisor.full_name || "",
      firmName:        advisor.firm_name || "",
      specializations: advisor.specializations || [],
      profilePicture:  advisor.profile_picture || "",
    };

    return rel;
  });
}

async function acceptRequest(arg1, arg2, arg3) {
  const { id, userId, userEmail } =
    typeof arg1 === "object" && arg1 !== null
      ? arg1
      : { id: arg1, userId: arg2, userEmail: arg3 };

  return db.transaction(async (client) => {
    // 1. Lock the target relationship row FOR UPDATE
    const { rows: reqRows } = await client.query(
      `SELECT * FROM advisor_client_relationships 
       WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (!reqRows[0]) {
      const err = new Error("Connection request not found.");
      err.code = "REQUEST_NOT_FOUND";
      throw err;
    }

    const relRow = reqRows[0];

    // 2. Verify ownership: must belong to authenticated user
    const normalizedUserEmail = (userEmail || "").toLowerCase().trim();
    const relEmail = (relRow.client_email || "").toLowerCase().trim();
    const isOwner =
      (relRow.user_id && relRow.user_id === userId) ||
      (!relRow.user_id && normalizedUserEmail && relEmail === normalizedUserEmail);

    if (!isOwner) {
      const err = new Error("Access denied. This request does not belong to you.");
      err.code = "FORBIDDEN_USER";
      throw err;
    }

    // 3. Verify status: MUST be 'pending_user_acceptance'
    if (relRow.status !== "pending_user_acceptance") {
      const err = new Error(`Cannot accept request in '${relRow.status}' status.`);
      err.code = "REQUEST_NOT_PENDING";
      err.currentStatus = relRow.status;
      throw err;
    }

    // 4. Concurrency lock & check: User does NOT already have an active advisor
    const { rows: activeRows } = await client.query(
      `SELECT id FROM advisor_client_relationships 
       WHERE user_id = $1 AND status = 'active' 
       FOR UPDATE`,
      [userId]
    );

    if (activeRows.length > 0) {
      const err = new Error("You already have an active financial advisor.");
      err.code = "USER_ALREADY_HAS_ADVISOR";
      throw err;
    }

    // 5. Verify advisor remains eligible (approved and email verified)
    const { rows: advRows } = await client.query(
      `SELECT id, full_name, email, firm_name, license_number, specializations, profile_picture, approval_status, is_email_verified 
       FROM advisors 
       WHERE id = $1`,
      [relRow.advisor_id]
    );

    const advisor = advRows[0];
    if (!advisor || advisor.approval_status !== "approved" || !advisor.is_email_verified) {
      const err = new Error("The advisor is no longer eligible or active.");
      err.code = "ADVISOR_NOT_ELIGIBLE";
      err.approvalStatus = advisor?.approval_status;
      err.isEmailVerified = advisor?.is_email_verified;
      throw err;
    }

    // 6. Transition relationship to 'active' with accepted_at timestamp
    let updated;
    try {
      const res = await client.query(
        `UPDATE advisor_client_relationships 
         SET user_id = $1,
             status = 'active',
             accepted_at = NOW()
         WHERE id = $2
         RETURNING ${SAFE_COLS}`,
        [userId, relRow.id]
      );
      updated = res.rows;
    } catch (updateErr) {
      // Catch race condition hitting partial unique index idx_acr_single_active_advisor
      if (updateErr.code === "23505" || updateErr.constraint === "idx_acr_single_active_advisor") {
        const conflictErr = new Error("You already have an active financial advisor.");
        conflictErr.code = "USER_ALREADY_HAS_ADVISOR";
        throw conflictErr;
      }
      throw updateErr;
    }

    const rel = formatRelationship(updated[0]);
    rel.advisor = {
      id:              advisor.id,
      fullName:        advisor.full_name || "",
      email:           advisor.email || "",
      firmName:        advisor.firm_name || "",
      licenseNumber:   advisor.license_number || "",
      specializations: advisor.specializations || [],
      profilePicture:  advisor.profile_picture || "",
    };

    return rel;
  });
}

async function rejectRequest(arg1, arg2, arg3) {
  const { id, userId, rejectionReason, userEmail } =
    typeof arg1 === "object" && arg1 !== null
      ? arg1
      : { id: arg1, userId: arg2, rejectionReason: arg3 };

  return db.transaction(async (client) => {
    // 1. Lock the target relationship row FOR UPDATE
    const { rows: reqRows } = await client.query(
      `SELECT * FROM advisor_client_relationships 
       WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (!reqRows[0]) {
      const err = new Error("Connection request not found.");
      err.code = "REQUEST_NOT_FOUND";
      throw err;
    }

    const relRow = reqRows[0];

    // 2. Ownership check
    const normalizedUserEmail = (userEmail || "").toLowerCase().trim();
    const relEmail = (relRow.client_email || "").toLowerCase().trim();
    const isOwner =
      (relRow.user_id && relRow.user_id === userId) ||
      (!relRow.user_id && normalizedUserEmail && relEmail === normalizedUserEmail);

    if (!isOwner) {
      const err = new Error("Access denied. This request does not belong to you.");
      err.code = "FORBIDDEN_USER";
      throw err;
    }

    // 3. Status check: MUST be 'pending_user_acceptance'
    if (relRow.status !== "pending_user_acceptance") {
      const err = new Error(`Cannot reject request in '${relRow.status}' status.`);
      err.code = "REQUEST_NOT_PENDING";
      err.currentStatus = relRow.status;
      throw err;
    }

    // 4. Fetch advisor info for notification/response
    const { rows: advRows } = await client.query(
      `SELECT id, full_name, email, firm_name, license_number, specializations, profile_picture 
       FROM advisors 
       WHERE id = $1`,
      [relRow.advisor_id]
    );
    const advisor = advRows[0] || {};

    // 5. Update status to 'rejected', store sanitized rejection_reason, set terminated_at
    const sanitizedReason = typeof rejectionReason === "string" ? rejectionReason.trim().slice(0, 500) : "";
    const { rows: updated } = await client.query(
      `UPDATE advisor_client_relationships 
       SET status = 'rejected',
           rejection_reason = $1,
           terminated_at = NOW()
       WHERE id = $2
       RETURNING ${SAFE_COLS}`,
      [sanitizedReason, relRow.id]
    );

    const rel = formatRelationship(updated[0]);
    rel.advisor = {
      id:              advisor.id || relRow.advisor_id,
      fullName:        advisor.full_name || "",
      email:           advisor.email || "",
      firmName:        advisor.firm_name || "",
      licenseNumber:   advisor.license_number || "",
      specializations: advisor.specializations || [],
      profilePicture:  advisor.profile_picture || "",
    };

    return rel;
  });
}

async function terminateRelationship(id, { reason = "" } = {}) {
  const { rows } = await db.query(
    `UPDATE advisor_client_relationships 
     SET status = 'terminated',
         terminated_at = NOW(),
         notes = CASE WHEN $1 <> '' THEN $1 ELSE notes END
     WHERE id = $2 AND status IN ('active', 'suspended', 'invited', 'pending_user_acceptance')
     RETURNING ${SAFE_COLS}`,
    [reason, id]
  );
  return formatRelationship(rows[0]);
}

async function terminateUserRelationship(arg1, arg2) {
  const { userId, reason = "" } =
    typeof arg1 === "object" && arg1 !== null
      ? arg1
      : { userId: arg1, reason: arg2 };

  if (!userId) {
    const err = new Error("User ID is required.");
    err.code = "USER_ID_REQUIRED";
    throw err;
  }

  return db.transaction(async (client) => {
    // 1. Locate and lock the user's active relationship FOR UPDATE
    const { rows: reqRows } = await client.query(
      `SELECT * FROM advisor_client_relationships 
       WHERE user_id = $1 AND status = 'active' 
       FOR UPDATE`,
      [userId]
    );

    if (!reqRows[0]) {
      const err = new Error("No active advisor relationship found.");
      err.code = "NO_ACTIVE_ADVISOR";
      throw err;
    }

    const relRow = reqRows[0];

    // 2. Retrieve advisor information required for notification and safe response
    const { rows: advRows } = await client.query(
      `SELECT id, full_name, email, firm_name, profile_picture 
       FROM advisors 
       WHERE id = $1`,
      [relRow.advisor_id]
    );
    const advisor = advRows[0] || {};

    // 3. Sanitize reason (trim, strip control chars, max 500 chars)
    let sanitizedReason = "";
    if (typeof reason === "string") {
      sanitizedReason = reason
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        .trim()
        .slice(0, 500);
    }

    // 4. Preserve existing notes and append termination note if reason provided
    let updatedNotes = relRow.notes || "";
    if (sanitizedReason) {
      const terminationNote = `Client termination reason: ${sanitizedReason}`;
      updatedNotes = updatedNotes ? `${updatedNotes}\n${terminationNote}` : terminationNote;
    }

    // 5. Update status atomically to 'terminated' and set terminated_at = NOW()
    const { rows: updatedRows } = await client.query(
      `UPDATE advisor_client_relationships 
       SET status = 'terminated',
           terminated_at = NOW(),
           notes = $1
       WHERE id = $2
       RETURNING ${SAFE_COLS}`,
      [updatedNotes, relRow.id]
    );

    const rel = formatRelationship(updatedRows[0]);
    rel.advisor = {
      id:             advisor.id || relRow.advisor_id,
      fullName:       advisor.full_name || "",
      email:          advisor.email || "",
      firmName:       advisor.firm_name || "",
      profilePicture: advisor.profile_picture || "",
    };
    rel.terminationReason = sanitizedReason;

    return rel;
  });
}

async function reassignRelationship({ currentRelationshipId, newAdvisorId, assignedByAdminId, reason = "" }) {
  return db.transaction(async (client) => {
    // 1. Get and lock current active relationship
    const { rows: current } = await client.query(
      `SELECT * FROM advisor_client_relationships WHERE id = $1 FOR UPDATE`,
      [currentRelationshipId]
    );

    if (!current[0]) {
      const err = new Error("Relationship not found.");
      err.code = "NOT_FOUND";
      throw err;
    }

    const oldRel = current[0];

    // 2. Mark current relationship as reassigned
    await client.query(
      `UPDATE advisor_client_relationships 
       SET status = 'reassigned',
           terminated_at = NOW(),
           notes = $1
       WHERE id = $2`,
      [reason ? `Reassigned: ${reason}` : "Reassigned by administrator", oldRel.id]
    );

    // 3. Insert new active relationship for new advisor
    const { rows: newRel } = await client.query(
      `INSERT INTO advisor_client_relationships (
         advisor_id, user_id, client_email, status, initiated_by,
         assigned_by_admin_id, accepted_at, notes
       ) VALUES (
         $1, $2, $3, 'active', 'admin',
         $4, NOW(), $5
       ) RETURNING ${SAFE_COLS}`,
      [
        newAdvisorId,
        oldRel.user_id,
        oldRel.client_email,
        assignedByAdminId,
        reason ? `Assigned by admin: ${reason}` : "Assigned by administrator",
      ]
    );

    return formatRelationship(newRel[0]);
  });
}

async function suspendRelationshipsForAdvisor(advisorId, reason = "") {
  const { rows } = await db.query(
    `UPDATE advisor_client_relationships 
     SET status = 'suspended',
         notes = CASE WHEN $1 <> '' THEN notes || ' | ' || $1 ELSE notes END
     WHERE advisor_id = $2 AND status = 'active'
     RETURNING ${SAFE_COLS}`,
    [reason ? `Suspended: ${reason}` : "", advisorId]
  );
  return rows.map(formatRelationship);
}

async function restoreSuspendedRelationship(id, adminId) {
  const { rows } = await db.query(
    `UPDATE advisor_client_relationships 
     SET status = 'active',
         assigned_by_admin_id = $1,
         notes = notes || ' | Restored by admin'
     WHERE id = $2 AND status = 'suspended'
     RETURNING ${SAFE_COLS}`,
    [adminId, id]
  );
  return formatRelationship(rows[0]);
}

async function findAdvisorClientDetail(advisorId, clientId) {
  const querySQL = `
    SELECT u.id AS user_id,
           u.full_name,
           u.profile_picture,
           u.email,
           u.mobile,
           u.dob,
           u.gender,
           u.occupation,
           u.marital_status,
           u.dependents,
           u.city,
           u.state,
           u.country,
           u.income_monthly,
           u.income_source,
           u.income_additional,
           u.income_growth_pct,
           u.risk_tolerance,
           u.risk_experience,
           u.risk_horizon_years,
           u.risk_style,
           u.expenses,
           u.investments,
           u.goals,
           u.loans,
           acr.id AS relationship_id,
           acr.status AS relationship_status,
           COALESCE(acr.accepted_at, acr.created_at) AS connected_since
    FROM users u
    INNER JOIN advisor_client_relationships acr
      ON acr.user_id = u.id
     AND acr.advisor_id = $1
     AND acr.status = 'active'
    WHERE u.id = $2
    LIMIT 1
  `;

  const { rows } = await db.query(querySQL, [advisorId, clientId]);
  if (!rows || rows.length === 0) return null;
  return rows[0];
}

async function getAdvisorDashboardStats(advisorId) {
  const [activeClientsResult, pendingResult] = await Promise.all([
    db.query(
      `SELECT acr.id,
              COALESCE(acr.accepted_at, acr.created_at) AS active_since,
              u.investments,
              u.loans,
              u.goals
       FROM advisor_client_relationships acr
       JOIN users u ON u.id = acr.user_id
       WHERE acr.advisor_id = $1 AND acr.status = 'active'`,
      [advisorId]
    ),
    db.query(
      `SELECT COUNT(*) AS pending_count
       FROM advisor_client_relationships
       WHERE advisor_id = $1 AND status IN ('invited', 'pending_user_acceptance')`,
      [advisorId]
    ),
  ]);

  const activeRows = activeClientsResult.rows || [];
  const pendingCount = parseInt(pendingResult.rows[0]?.pending_count, 10) || 0;

  let totalInvestmentsCurrentValue = 0;
  let totalInvestmentsAmount = 0;
  let totalOutstandingLoans = 0;
  let totalClientGoals = 0;
  let totalClientsAddedThisMonth = 0;
  let totalClientsAddedLastMonth = 0;

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth(); // 0-11
  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;

  for (const row of activeRows) {
    // 1. Investments aggregation
    if (Array.isArray(row.investments)) {
      for (const inv of row.investments) {
        if (inv && typeof inv === "object") {
          const invested = parseFloat(inv.investedAmount) || 0;
          const current = parseFloat(inv.currentValue !== undefined && inv.currentValue !== null ? inv.currentValue : inv.investedAmount) || 0;
          totalInvestmentsAmount += invested;
          totalInvestmentsCurrentValue += current;
        }
      }
    }

    // 2. Loans aggregation
    if (Array.isArray(row.loans)) {
      for (const loan of row.loans) {
        if (loan && typeof loan === "object") {
          const outstanding = parseFloat(loan.outstandingAmount !== undefined && loan.outstandingAmount !== null ? loan.outstandingAmount : loan.principalRemaining) || 0;
          totalOutstandingLoans += outstanding;
        }
      }
    }

    // 3. Goals aggregation
    if (Array.isArray(row.goals)) {
      totalClientGoals += row.goals.length;
    }

    // 4. Monthly addition tracking
    if (row.active_since) {
      const activeDate = new Date(row.active_since);
      if (!isNaN(activeDate.getTime())) {
        const rowYear = activeDate.getUTCFullYear();
        const rowMonth = activeDate.getUTCMonth();
        if (rowYear === currentYear && rowMonth === currentMonth) {
          totalClientsAddedThisMonth++;
        } else if (rowYear === prevMonthYear && rowMonth === prevMonth) {
          totalClientsAddedLastMonth++;
        }
      }
    }
  }

  // Safe client growth percentage calculation
  let clientGrowthPercentage = 0;
  if (totalClientsAddedLastMonth === 0) {
    clientGrowthPercentage = totalClientsAddedThisMonth > 0 ? 100 : 0;
  } else {
    const rawGrowth = ((totalClientsAddedThisMonth - totalClientsAddedLastMonth) / totalClientsAddedLastMonth) * 100;
    clientGrowthPercentage = Math.round(rawGrowth * 100) / 100;
  }

  return {
    totalActiveClients: activeRows.length,
    pendingClientRequests: pendingCount,
    totalInvestmentsCurrentValue: Math.round(totalInvestmentsCurrentValue * 100) / 100,
    totalInvestmentsAmount: Math.round(totalInvestmentsAmount * 100) / 100,
    totalOutstandingLoans: Math.round(totalOutstandingLoans * 100) / 100,
    totalClientGoals,
    totalClientsAddedThisMonth,
    totalClientsAddedLastMonth,
    clientGrowthPercentage,
  };
}

async function findActiveInvitationByAdvisorAndEmail(advisorId, clientEmail) {
  if (!advisorId || !clientEmail) return null;
  const { rows } = await db.query(
    `SELECT ${SAFE_COLS} FROM advisor_client_relationships
     WHERE advisor_id = $1 
       AND client_email = $2
       AND status = 'invited'
       AND (invitation_expires_at IS NULL OR invitation_expires_at > NOW())
     ORDER BY created_at DESC
     LIMIT 1`,
    [advisorId, clientEmail.toLowerCase().trim()]
  );
  return formatRelationship(rows[0]);
}

async function findPendingRequestByAdvisorAndUser(advisorId, userId) {
  if (!advisorId || !userId) return null;
  const { rows } = await db.query(
    `SELECT ${SAFE_COLS} FROM advisor_client_relationships
     WHERE advisor_id = $1 
       AND user_id = $2
       AND status = 'pending_user_acceptance'
     ORDER BY created_at DESC
     LIMIT 1`,
    [advisorId, userId]
  );
  return formatRelationship(rows[0]);
}

async function createConnectionRequest({ advisorId, userId, clientEmail, notes = "" }) {
  return db.transaction(async (client) => {
    // 1. Lock the target user's record to prevent race conditions on relationship creation
    await client.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [userId]);

    // 2. Check if target user already has an active advisor
    const { rows: activeRows } = await client.query(
      `SELECT id FROM advisor_client_relationships
       WHERE user_id = $1 AND status = 'active'
       FOR UPDATE`,
      [userId]
    );
    if (activeRows.length > 0) {
      const err = new Error("This user already has an active financial advisor.");
      err.code = "USER_ALREADY_HAS_ADVISOR";
      throw err;
    }

    // 3. Check if a pending request already exists between this advisor and user
    const { rows: pendingRows } = await client.query(
      `SELECT id FROM advisor_client_relationships
       WHERE advisor_id = $1 AND user_id = $2 AND status = 'pending_user_acceptance'
       FOR UPDATE`,
      [advisorId, userId]
    );
    if (pendingRows.length > 0) {
      const err = new Error("A connection request is already pending for this user.");
      err.code = "REQUEST_ALREADY_PENDING";
      err.existingRelationshipId = pendingRows[0].id;
      throw err;
    }

    // 4. Create new relationship row
    const { rows: created } = await client.query(
      `INSERT INTO advisor_client_relationships (
        advisor_id,
        user_id,
        client_email,
        status,
        initiated_by,
        notes,
        invitation_token_hash,
        invitation_expires_at
      ) VALUES ($1, $2, $3, 'pending_user_acceptance', 'advisor', $4, NULL, NULL)
      RETURNING ${SAFE_COLS}`,
      [advisorId, userId, clientEmail.toLowerCase().trim(), notes]
    );

    return formatRelationship(created[0]);
  });
}

module.exports = {
  findById,
  findByTokenHash,
  findActiveForUser,
  findByAdvisorAndUser,
  findActiveByAdvisorAndUser,
  findAdvisorActiveClients,
  findAdvisorClientDetail,
  findActiveInvitationByAdvisorAndEmail,
  findPendingRequestByAdvisorAndUser,
  getAdvisorDashboardStats,
  findPendingForUser,
  findPendingForAdvisor,
  create,
  createConnectionRequest,
  updateStatus,
  acceptInvitation,
  acceptRequest,
  rejectRequest,
  terminateRelationship,
  terminateUserRelationship,
  reassignRelationship,
  suspendRelationshipsForAdvisor,
  restoreSuspendedRelationship,
  formatRelationship,
};
