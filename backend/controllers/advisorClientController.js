// backend/controllers/advisorClientController.js
const crypto               = require("crypto");
const AdvisorRelationship = require("../models/AdvisorRelationship");
const Advisor              = require("../models/Advisor");
const User                 = require("../models/User");
const AuditLog             = require("../models/AuditLog");
const { ok, fail }         = require("../utils/response");
const { sendAdvisorInvitationEmail, sendAdvisorConnectionRequestEmail } = require("../utils/email");
const notificationService = require("../services/notificationService");
const {
  NOTIFICATION_TYPES,
  RECIPIENT_TYPES,
  ACTOR_TYPES,
  RELATED_ENTITY_TYPES,
} = require("../constants/notificationTypes");

// ── Format individual client record for the Advisor Directory ────────────────
function formatClientDirectoryItem(rel) {
  const user = rel.user || {};
  const location = user.location || {};

  return {
    relationshipId:     rel.id,
    clientId:           rel.userId || user.id || null,
    fullName:           user.fullName || "",
    email:              user.email || rel.clientEmail || "",
    mobile:             user.mobile || "",
    profilePicture:     user.profilePicture || "",
    isProfileComplete:  user.isProfileComplete || false,
    city:               location.city || "",
    state:              location.state || "",
    country:            location.country || "India",
    onboardedAt:        user.onboardedAt || null,
    connectedSince:     rel.acceptedAt || rel.createdAt,
    status:             rel.status,
    totalInvestments:   user.totalInvestments ?? 0,
    totalLoans:         user.totalLoans ?? 0,
    goalsCount:         user.goalsCount ?? 0,
  };
}

// ── Format comprehensive sanitized client details for read-only view ─────────
function formatClientDetail(row) {
  if (!row) return null;

  // Format array items safely
  const formatExpenses = (items) => {
    if (!Array.isArray(items)) return [];
    return items
      .filter((i) => i && typeof i === "object")
      .map((item) => ({
        id:          item.id || null,
        category:    item.category || "General",
        amount:      parseFloat(item.amount) || 0,
        frequency:   item.frequency || "monthly",
        isRecurring: Boolean(item.isRecurring),
      }));
  };

  const formatInvestments = (items) => {
    if (!Array.isArray(items)) return [];
    return items
      .filter((i) => i && typeof i === "object")
      .map((item) => ({
        id:             item.id || null,
        type:           item.type || "Other",
        name:           item.name || "",
        investedAmount: parseFloat(item.investedAmount) || 0,
        currentValue:   parseFloat(item.currentValue !== undefined && item.currentValue !== null ? item.currentValue : item.investedAmount) || 0,
        returnPct:      parseFloat(item.returnPct) || 0,
      }));
  };

  const formatGoals = (items) => {
    if (!Array.isArray(items)) return [];
    return items
      .filter((i) => i && typeof i === "object")
      .map((item) => ({
        id:             item.id || null,
        name:           item.name || "",
        category:       item.category || "General",
        targetAmount:   parseFloat(item.targetAmount) || 0,
        currentSavings: parseFloat(item.currentSavings) || 0,
        targetDate:     item.targetDate || null,
        priority:       item.priority || "medium",
      }));
  };

  const formatLoans = (items) => {
    if (!Array.isArray(items)) return [];
    return items
      .filter((i) => i && typeof i === "object")
      .map((item) => ({
        id:                item.id || null,
        type:              item.type || "Other",
        lender:            item.lender || "",
        outstandingAmount: parseFloat(item.outstandingAmount !== undefined && item.outstandingAmount !== null ? item.outstandingAmount : item.principalRemaining) || 0,
        emi:               parseFloat(item.emi) || 0,
        interestRate:      parseFloat(item.interestRate) || 0,
        tenureMonths:      parseInt(item.tenureMonths, 10) || 0,
      }));
  };

  return {
    client: {
      id:                 row.user_id,
      fullName:           row.full_name || "",
      profilePicture:     row.profile_picture || "",
      email:              row.email || "",
      mobile:             row.mobile || "",
      dob:                row.dob || null,
      gender:             row.gender || null,
      occupation:         row.occupation || "",
      maritalStatus:      row.marital_status || null,
      dependents:         row.dependents || 0,
      location: {
        city:             row.city || "",
        state:            row.state || "",
        country:          row.country || "India",
      },
      income: {
        monthly:          parseFloat(row.income_monthly) || 0,
        source:           row.income_source || "",
        additionalMonthly: parseFloat(row.income_additional) || 0,
        annualGrowthPct:  parseFloat(row.income_growth_pct) || 0,
      },
      riskProfile: {
        tolerance:        row.risk_tolerance || null,
        experience:       row.risk_experience || null,
        timeHorizonYears: row.risk_horizon_years || null,
        investmentStyle:  row.risk_style || null,
      },
      expenses:           formatExpenses(row.expenses),
      investments:        formatInvestments(row.investments),
      goals:              formatGoals(row.goals),
      loans:              formatLoans(row.loans),
    },
    relationship: {
      relationshipId:     row.relationship_id,
      status:             row.relationship_status,
      connectedSince:     row.connected_since,
    },
  };
}

// ── GET /api/advisor/clients ──────────────────────────────────────────────────
// Returns paginated list of active clients strictly scoped to the authenticated advisor
const getActiveClients = async (req, res) => {
  try {
    const advisorId = req.advisor?.id;
    if (!advisorId) {
      return fail(res, "Access denied. Valid advisor session required.", 401);
    }

    // Defensive parsing of pagination parameters
    const pageNum  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search   = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const { clients, total } = await AdvisorRelationship.findAdvisorActiveClients(advisorId, {
      page:  pageNum,
      limit: limitNum,
      search,
    });

    const pages = Math.ceil(total / limitNum);

    return ok(res, {
      clients: clients.map(formatClientDirectoryItem),
      pagination: {
        page:  pageNum,
        limit: limitNum,
        total,
        pages,
      },
    }, "Active clients retrieved successfully.");
  } catch (err) {
    console.error("getActiveClients error:", err);
    return fail(res, "Failed to retrieve active clients.", 500);
  }
};

// ── GET /api/advisor/clients/:clientId ────────────────────────────────────────
// Returns sensitive detailed financial profile for a verified active client
const getClientDetail = async (req, res) => {
  try {
    const advisorId = req.advisor?.id;
    const clientId  = req.params?.clientId;

    if (!advisorId) {
      return fail(res, "Access denied. Valid advisor session required.", 401);
    }

    // Defense-in-depth: query scoped strictly through active relationship in DB
    const clientRecord = await AdvisorRelationship.findAdvisorClientDetail(advisorId, clientId);
    if (!clientRecord) {
      return fail(res, "Access denied. Client not found or not active.", 403, {
        code: "ADVISOR_CLIENT_ACCESS_DENIED",
      });
    }

    const formatted = formatClientDetail(clientRecord);

    // Audit log successful sensitive view
    AuditLog.create({
      actorType:    "advisor",
      actorId:      advisorId,
      action:       "SENSITIVE_FINANCIALS_VIEWED",
      resourceType: "user",
      resourceId:   clientId,
      details: {
        relationshipId: clientRecord.relationship_id,
        method:         req.method,
        path:           req.originalUrl || req.baseUrl + req.path,
      },
      ipAddress:    req.ip || req.connection?.remoteAddress || "",
      userAgent:    req.get?.("user-agent") || "",
    }).catch((auditErr) => {
      console.error("Audit log error on SENSITIVE_FINANCIALS_VIEWED:", auditErr);
    });

    return ok(res, formatted, "Client details retrieved successfully.");
  } catch (err) {
    console.error("getClientDetail error:", err);
    return fail(res, "Failed to retrieve client details.", 500);
  }
};

// ── GET /api/advisor/dashboard/stats ──────────────────────────────────────────
// Returns high-level aggregated metrics across active clients for the advisor dashboard
const getDashboardStats = async (req, res) => {
  try {
    const advisorId = req.advisor?.id;
    if (!advisorId) {
      return fail(res, "Access denied. Valid advisor session required.", 401);
    }

    const stats = await AdvisorRelationship.getAdvisorDashboardStats(advisorId);

    return ok(res, stats, "Dashboard statistics retrieved successfully.");
  } catch (err) {
    console.error("getDashboardStats error:", err);
    return fail(res, "Failed to retrieve dashboard statistics.", 500);
  }
};

// ── POST /api/advisor/invitations ─────────────────────────────────────────────
// Creates and emails a cryptographically secure client invitation token
const createInvitation = async (req, res) => {
  try {
    const advisorId = req.advisor?.id;
    if (!advisorId) {
      return fail(res, "Access denied. Valid advisor session required.", 401);
    }

    const clientEmail = (req.body.clientEmail || "").toLowerCase().trim();
    const clientName  = (req.body.clientName || "").trim() || "Client";
    const notes       = (req.body.notes || "").trim();

    if (!clientEmail) {
      return fail(res, "A valid client email address is required.", 422);
    }

    // 1. Check if user already exists in SmartFinance
    const existingUser = await User.findByEmail(clientEmail);
    if (existingUser) {
      // Check if user already has an active advisor relationship
      const activeRel = await AdvisorRelationship.findActiveForUser(existingUser.id);
      if (activeRel) {
        return fail(res, "User already has an active financial advisor.", 409, {
          code: "USER_ALREADY_HAS_ADVISOR",
        });
      }

      // Existing user without active advisor -> requires direct user request workflow
      return fail(
        res,
        "This user already has a SmartFinance account. Please send a direct connection request instead of an external invitation.",
        409,
        { code: "EXISTING_USER_REQUEST_REQUIRED" }
      );
    }

    // 2. Prevent spammy duplicate active invitations from the same advisor for the same email
    const existingInvite = await AdvisorRelationship.findActiveInvitationByAdvisorAndEmail(advisorId, clientEmail);
    if (existingInvite) {
      return fail(res, "An active invitation is already pending for this email address.", 409, {
        code: "INVITATION_ALREADY_PENDING",
        data: {
          relationshipId: existingInvite.id,
          status: existingInvite.status,
          expiresAt: existingInvite.invitationExpiresAt,
        },
      });
    }

    // 3. Cryptographically secure raw token generation (32 bytes = 256 bits of entropy)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const invitationTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // 4. Create relationship with status 'invited' and token hash
    const relationship = await AdvisorRelationship.create({
      advisorId,
      userId: null,
      clientEmail,
      status: "invited",
      initiatedBy: "advisor",
      invitationTokenHash,
      invitationExpiresAt,
      notes,
    });

    // 5. Build client invite link & send branded invitation email
    const clientBaseUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const inviteUrl = `${clientBaseUrl}/advisor/invite?token=${rawToken}`;

    // Get advisor name/firm for email context
    let advisorName = req.advisor?.fullName || "Your Advisor";
    let firmName = req.advisor?.firmName || "";
    if (!firmName) {
      const advRecord = await Advisor.findById(advisorId);
      if (advRecord) {
        advisorName = advRecord.fullName || advisorName;
        firmName = advRecord.firmName || "";
      }
    }

    sendAdvisorInvitationEmail({
      toEmail: clientEmail,
      clientName,
      advisorName,
      firmName,
      inviteUrl,
      expiresAt: invitationExpiresAt,
    }).catch((emailErr) => {
      console.error("Failed to send advisor invitation email:", emailErr);
    });

    // 6. Audit log successful client invitation
    AuditLog.create({
      actorType: "advisor",
      actorId: advisorId,
      action: "ADVISOR_CLIENT_INVITED",
      resourceType: "advisor_client_relationship",
      resourceId: relationship.id,
      details: {
        clientEmail,
        expiresAt: invitationExpiresAt.toISOString(),
        method: req.method,
        path: req.originalUrl || req.baseUrl + req.path,
      },
      ipAddress: req.ip || req.connection?.remoteAddress || "",
      userAgent: req.get?.("user-agent") || "",
    }).catch((auditErr) => {
      console.error("Audit log error on ADVISOR_CLIENT_INVITED:", auditErr);
    });

    // 7. Return safe sanitized response (Zero raw token, Zero hash, Zero credentials)
    return ok(
      res,
      {
        relationshipId: relationship.id,
        clientEmail: relationship.clientEmail,
        status: "invited",
        expiresAt: relationship.invitationExpiresAt,
      },
      "Invitation sent successfully.",
      201
    );
  } catch (err) {
    console.error("createInvitation error:", err);
    return fail(res, "Failed to create invitation.", 500);
  }
};

// ── POST /api/advisor/requests ────────────────────────────────────────────────
// Approved advisor requests connection with an existing registered SmartFinance user
const createRequest = async (req, res) => {
  try {
    const advisorId = req.advisor?.id;
    if (!advisorId) {
      return fail(res, "Access denied. Valid advisor session required.", 401);
    }

    const { userEmail, notes } = req.body;
    const normalizedEmail = (userEmail || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return fail(res, "User email is required.", 422, { code: "EMAIL_REQUIRED" });
    }

    // 1. Self-request prevention (advisor email check)
    if (req.advisor.email && req.advisor.email.toLowerCase().trim() === normalizedEmail) {
      return fail(res, "You cannot send a connection request to your own email.", 422, {
        code: "SELF_REQUEST_FORBIDDEN",
      });
    }

    // 2. Target user must exist in SmartFinance
    const targetUser = await User.findByEmail(normalizedEmail);
    if (!targetUser) {
      return fail(res, "No SmartFinance user found with this email address.", 404, {
        code: "USER_NOT_FOUND",
      });
    }

    // Double check self-request in case advisor has matching email in DB
    if (targetUser.email.toLowerCase().trim() === (req.advisor.email || "").toLowerCase().trim()) {
      return fail(res, "You cannot send a connection request to yourself.", 422, {
        code: "SELF_REQUEST_FORBIDDEN",
      });
    }

    // 3. Atomically check active advisor / existing pending request & create relationship
    let relationship;
    try {
      relationship = await AdvisorRelationship.createConnectionRequest({
        advisorId,
        userId: targetUser.id,
        clientEmail: targetUser.email,
        notes: typeof notes === "string" ? notes.trim() : "",
      });
    } catch (createErr) {
      if (createErr.code === "USER_ALREADY_HAS_ADVISOR") {
        return fail(res, "This user already has an active financial advisor.", 409, {
          code: "USER_ALREADY_HAS_ADVISOR",
        });
      }
      if (createErr.code === "REQUEST_ALREADY_PENDING") {
        return fail(res, "A connection request is already pending for this user.", 409, {
          code: "REQUEST_ALREADY_PENDING",
          relationshipId: createErr.existingRelationshipId,
        });
      }
      throw createErr;
    }

    // 4. Send email notification to user
    let advisorName = req.advisor?.fullName || "Your Advisor";
    let firmName = req.advisor?.firmName || "";
    let specializations = req.advisor?.specializations || [];

    if (!firmName || !specializations.length) {
      const advRecord = await Advisor.findById(advisorId);
      if (advRecord) {
        advisorName = advRecord.fullName || advisorName;
        firmName = advRecord.firmName || firmName;
        specializations = advRecord.specializations || specializations;
      }
    }

    sendAdvisorConnectionRequestEmail({
      toEmail: targetUser.email,
      userName: targetUser.fullName || "Valued User",
      advisorName,
      firmName,
      specializations,
      notes: typeof notes === "string" ? notes.trim() : "",
    }).catch((emailErr) => {
      console.error("Failed to send advisor connection request email:", emailErr);
    });

    // 5. In-app notification to user (non-blocking)
    notificationService.safeNotify({
      recipientType:     RECIPIENT_TYPES.USER,
      recipientId:       targetUser.id,
      actorType:         ACTOR_TYPES.ADVISOR,
      actorId:           advisorId,
      type:              NOTIFICATION_TYPES.ADVISOR_CONNECTION_REQUEST,
      title:             "New Advisor Connection Request",
      message:           `${advisorName} has sent you a connection request.`,
      actionUrl:         "/settings",
      relatedEntityType: RELATED_ENTITY_TYPES.RELATIONSHIP,
      relatedEntityId:   relationship.id,
    });

    // 6. Audit log
    AuditLog.create({
      actorType: "advisor",
      actorId: advisorId,
      action: "ADVISOR_CLIENT_CONNECTION_REQUESTED",
      resourceType: "advisor_client_relationship",
      resourceId: relationship.id,
      details: {
        advisorId,
        userId: targetUser.id,
        relationshipId: relationship.id,
        method: req.method,
        path: req.originalUrl || req.baseUrl + req.path,
      },
      ipAddress: req.ip || req.connection?.remoteAddress || "",
      userAgent: req.get?.("user-agent") || "",
    }).catch((auditErr) => {
      console.error("Audit log error on ADVISOR_CLIENT_CONNECTION_REQUESTED:", auditErr);
    });

    // 6. Return sanitized response
    return ok(
      res,
      {
        relationshipId: relationship.id,
        userId: targetUser.id,
        status: "pending_user_acceptance",
        requestedAt: relationship.createdAt,
      },
      "Connection request sent successfully.",
      201
    );
  } catch (err) {
    console.error("createRequest error:", err);
    return fail(res, "Failed to send connection request.", 500);
  }
};

module.exports = {
  getActiveClients,
  getClientDetail,
  getDashboardStats,
  createInvitation,
  createRequest,
  formatClientDirectoryItem,
  formatClientDetail,
};
