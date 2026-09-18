// backend/controllers/userAdvisorController.js
const crypto               = require("crypto");
const AdvisorRelationship = require("../models/AdvisorRelationship");
const AuditLog             = require("../models/AuditLog");
const { ok, fail }         = require("../utils/response");

const {
  sendAdvisorConnectionAcceptedEmail,
  sendAdvisorConnectionRejectedEmail,
  sendAdvisorRelationshipTerminatedEmail,
} = require("../utils/email");
const notificationService = require("../services/notificationService");
const {
  NOTIFICATION_TYPES,
  RECIPIENT_TYPES,
  ACTOR_TYPES,
  RELATED_ENTITY_TYPES,
} = require("../constants/notificationTypes");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ── GET /api/user/advisor/requests ────────────────────────────────────────────
// Authenticated user lists their pending connection requests
const getPendingRequests = async (req, res) => {
  try {
    const userId    = req.user?.id;
    const userEmail = req.user?.email;

    if (!userId) {
      return fail(res, "Access denied. Valid user session required.", 401);
    }

    const pending = await AdvisorRelationship.findPendingForUser(userId, userEmail);

    const safeRequests = pending.map((rel) => {
      const adv = rel.advisor || {};
      return {
        requestId: rel.id,
        advisor: {
          id:              adv.id || rel.advisorId,
          fullName:        adv.fullName || "",
          firmName:        adv.firmName || "",
          licenseNumber:   adv.licenseNumber || "",
          profilePicture:  adv.profilePicture || "",
          specializations: adv.specializations || [],
        },
        status:      rel.status,
        notes:       rel.notes || "",
        requestedAt: rel.createdAt,
      };
    });

    return ok(
      res,
      { requests: safeRequests, count: safeRequests.length },
      "Pending advisor connection requests retrieved successfully."
    );
  } catch (err) {
    console.error("getPendingRequests error:", err);
    return fail(res, "Failed to retrieve pending connection requests.", 500);
  }
};

// ── GET /api/user/advisor/active ──────────────────────────────────────────────
// Authenticated user retrieves their currently active advisor relationship
const getActiveAdvisor = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return fail(res, "Access denied. Valid user session required.", 401);
    }

    const activeRel = await AdvisorRelationship.findActiveForUser(userId);

    if (!activeRel) {
      return ok(
        res,
        { relationship: null, hasActiveAdvisor: false },
        "No active advisor relationship found."
      );
    }

    const advisor = activeRel.advisor || {};

    return ok(
      res,
      {
        relationship: {
          relationshipId: activeRel.id,
          status: activeRel.status,
          connectedSince: activeRel.acceptedAt || activeRel.createdAt,
          notes: activeRel.notes || "",
          advisor: {
            id: advisor.id || activeRel.advisorId,
            fullName: advisor.fullName || "",
            firmName: advisor.firmName || "",
            licenseNumber: advisor.licenseNumber || "",
            specializations: advisor.specializations || [],
            profilePicture: advisor.profilePicture || "",
            email: advisor.email || "",
          },
        },
        hasActiveAdvisor: true,
      },
      "Active advisor relationship retrieved successfully."
    );
  } catch (err) {
    console.error("getActiveAdvisor error:", err);
    return fail(res, "Failed to retrieve active advisor relationship.", 500);
  }
};

// ── POST /api/user/advisor/requests/:requestId/accept ─────────────────────────
// Authenticated user accepts a pending advisor connection request
const acceptConnectionRequest = async (req, res) => {
  try {
    const userId    = req.user?.id;
    const userEmail = req.user?.email;

    if (!userId) {
      return fail(res, "Access denied. Valid user session required.", 401);
    }

    const requestId = req.params?.requestId;
    if (!requestId || !UUID_REGEX.test(requestId)) {
      return fail(res, "Invalid Request ID format.", 400, { code: "INVALID_REQUEST_ID" });
    }

    // Execute atomic acceptance transition
    const acceptedRel = await AdvisorRelationship.acceptRequest({
      id: requestId,
      userId,
      userEmail,
    });

    const advisor = acceptedRel.advisor || {};

    // Audit log successful connection acceptance
    AuditLog.create({
      actorType:    "user",
      actorId:      userId,
      action:       "USER_ADVISOR_CONNECTION_ACCEPTED",
      resourceType: "advisor_client_relationship",
      resourceId:   acceptedRel.id,
      details: {
        userId,
        advisorId:      advisor.id || acceptedRel.advisorId,
        relationshipId: acceptedRel.id,
        method:         req.method,
        path:           req.originalUrl || req.baseUrl + req.path,
      },
      ipAddress:    req.ip || req.connection?.remoteAddress || "",
      userAgent:    req.get?.("user-agent") || "",
    }).catch((auditErr) => {
      console.error("Audit log error on USER_ADVISOR_CONNECTION_ACCEPTED:", auditErr);
    });

    // Notify advisor via email asynchronously after DB commit
    if (advisor.email) {
      sendAdvisorConnectionAcceptedEmail({
        toEmail:     advisor.email,
        advisorName: advisor.fullName || "Advisor",
        clientName:  req.user?.fullName || "Client",
        clientEmail: userEmail || "",
      }).catch((emailErr) => {
        console.error("Failed to send advisor connection accepted email:", emailErr);
      });
    }

    // In-app notification to advisor (non-blocking)
    notificationService.safeNotify({
      recipientType:     RECIPIENT_TYPES.ADVISOR,
      recipientId:       advisor.id || acceptedRel.advisorId,
      actorType:         ACTOR_TYPES.USER,
      actorId:           userId,
      type:              NOTIFICATION_TYPES.ADVISOR_CONNECTION_ACCEPTED,
      title:             "Connection Request Accepted",
      message:           `${req.user?.fullName || "A client"} has accepted your connection request.`,
      actionUrl:         "/advisor/portal",
      relatedEntityType: RELATED_ENTITY_TYPES.RELATIONSHIP,
      relatedEntityId:   acceptedRel.id,
    });

    return ok(
      res,
      {
        relationshipId: acceptedRel.id,
        advisor: {
          id:              advisor.id,
          fullName:        advisor.fullName || "",
          firmName:        advisor.firmName || "",
          specializations: advisor.specializations || [],
          profilePicture:  advisor.profilePicture || "",
        },
        status:         "active",
        connectedSince: acceptedRel.acceptedAt || acceptedRel.createdAt,
      },
      "Advisor connection request accepted successfully."
    );
  } catch (err) {
    if (err.code === "REQUEST_NOT_FOUND") {
      return fail(res, "Connection request not found.", 404, { code: "REQUEST_NOT_FOUND" });
    }
    if (err.code === "FORBIDDEN_USER") {
      return fail(res, "Access denied. You cannot accept this connection request.", 403, {
        code: "FORBIDDEN_USER",
      });
    }
    if (err.code === "REQUEST_NOT_PENDING") {
      return fail(res, `Cannot accept request in '${err.currentStatus || "current"}' status.`, 400, {
        code: "REQUEST_NOT_PENDING",
        currentStatus: err.currentStatus,
      });
    }
    if (err.code === "USER_ALREADY_HAS_ADVISOR") {
      return fail(res, "You already have an active financial advisor.", 409, {
        code: "USER_ALREADY_HAS_ADVISOR",
      });
    }
    if (err.code === "ADVISOR_NOT_ELIGIBLE") {
      return fail(res, "The advisor is no longer eligible or active.", 403, {
        code: "ADVISOR_NOT_ELIGIBLE",
      });
    }

    console.error("acceptConnectionRequest error:", err);
    return fail(res, "Failed to accept connection request.", 500);
  }
};

// ── POST /api/user/advisor/requests/:requestId/reject ─────────────────────────
// Authenticated user rejects a pending advisor connection request
const rejectConnectionRequest = async (req, res) => {
  try {
    const userId    = req.user?.id;
    const userEmail = req.user?.email;

    if (!userId) {
      return fail(res, "Access denied. Valid user session required.", 401);
    }

    const requestId = req.params?.requestId;
    if (!requestId || !UUID_REGEX.test(requestId)) {
      return fail(res, "Invalid Request ID format.", 400, { code: "INVALID_REQUEST_ID" });
    }

    const rejectionReason = typeof req.body?.rejectionReason === "string" ? req.body.rejectionReason.trim() : "";

    // Execute atomic rejection transition
    const rejectedRel = await AdvisorRelationship.rejectRequest({
      id: requestId,
      userId,
      userEmail,
      rejectionReason,
    });

    const advisor = rejectedRel.advisor || {};

    // Audit log successful connection rejection
    AuditLog.create({
      actorType:    "user",
      actorId:      userId,
      action:       "USER_ADVISOR_CONNECTION_REJECTED",
      resourceType: "advisor_client_relationship",
      resourceId:   rejectedRel.id,
      details: {
        userId,
        advisorId:      advisor.id || rejectedRel.advisorId,
        relationshipId: rejectedRel.id,
        rejectionReason,
        method:         req.method,
        path:           req.originalUrl || req.baseUrl + req.path,
      },
      ipAddress:    req.ip || req.connection?.remoteAddress || "",
      userAgent:    req.get?.("user-agent") || "",
    }).catch((auditErr) => {
      console.error("Audit log error on USER_ADVISOR_CONNECTION_REJECTED:", auditErr);
    });

    // Notify advisor via email asynchronously after DB commit
    if (advisor.email) {
      sendAdvisorConnectionRejectedEmail({
        toEmail:         advisor.email,
        advisorName:     advisor.fullName || "Advisor",
        clientName:      req.user?.fullName || "Client",
        clientEmail:     userEmail || "",
        rejectionReason,
      }).catch((emailErr) => {
        console.error("Failed to send advisor connection rejected email:", emailErr);
      });
    }

    // In-app notification to advisor (non-blocking)
    notificationService.safeNotify({
      recipientType:     RECIPIENT_TYPES.ADVISOR,
      recipientId:       advisor.id || rejectedRel.advisorId,
      actorType:         ACTOR_TYPES.USER,
      actorId:           userId,
      type:              NOTIFICATION_TYPES.ADVISOR_CONNECTION_REJECTED,
      title:             "Connection Request Declined",
      message:           `${req.user?.fullName || "A user"} has declined your connection request.`,
      actionUrl:         "/advisor/portal",
      relatedEntityType: RELATED_ENTITY_TYPES.RELATIONSHIP,
      relatedEntityId:   rejectedRel.id,
    });

    return ok(
      res,
      {
        relationshipId: rejectedRel.id,
        status:         "rejected",
        rejectedAt:     rejectedRel.terminatedAt || rejectedRel.updatedAt,
      },
      "Advisor connection request rejected successfully."
    );
  } catch (err) {
    if (err.code === "REQUEST_NOT_FOUND") {
      return fail(res, "Connection request not found.", 404, { code: "REQUEST_NOT_FOUND" });
    }
    if (err.code === "FORBIDDEN_USER") {
      return fail(res, "Access denied. You cannot reject this connection request.", 403, {
        code: "FORBIDDEN_USER",
      });
    }
    if (err.code === "REQUEST_NOT_PENDING") {
      return fail(res, `Cannot reject request in '${err.currentStatus || "current"}' status.`, 400, {
        code: "REQUEST_NOT_PENDING",
        currentStatus: err.currentStatus,
      });
    }

    console.error("rejectConnectionRequest error:", err);
    return fail(res, "Failed to reject connection request.", 500);
  }
};

// ── POST /api/user/advisor/claim-invite ───────────────────────────────────────
// Authenticated user claims an advisor invitation using the raw token
const claimInvitation = async (req, res) => {
  try {
    const userId    = req.user?.id;
    const userEmail = req.user?.email;

    if (!userId || !userEmail) {
      return fail(res, "Access denied. Valid user session required.", 401);
    }

    const rawToken = typeof req.body.token === "string" ? req.body.token.trim() : "";
    if (!rawToken) {
      return fail(res, "Invitation token is required.", 422, { code: "TOKEN_REQUIRED" });
    }

    // Compute SHA-256 hash of the raw token (raw token is never logged or stored)
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    // Execute atomic claim transaction
    const acceptedRel = await AdvisorRelationship.acceptInvitation({
      tokenHash,
      userId,
      userEmail,
    });

    const advisor = acceptedRel.advisor || {};

    // Audit log successful invitation claim
    AuditLog.create({
      actorType:    "user",
      actorId:      userId,
      action:       "ADVISOR_CLIENT_INVITATION_CLAIMED",
      resourceType: "advisor_client_relationship",
      resourceId:   acceptedRel.id,
      details: {
        userId,
        advisorId: advisor.id || acceptedRel.advisorId,
        relationshipId: acceptedRel.id,
        method: req.method,
        path: req.originalUrl || req.baseUrl + req.path,
      },
      ipAddress:    req.ip || req.connection?.remoteAddress || "",
      userAgent:    req.get?.("user-agent") || "",
    }).catch((auditErr) => {
      console.error("Audit log error on ADVISOR_CLIENT_INVITATION_CLAIMED:", auditErr);
    });

    // In-app notification to advisor (non-blocking)
    notificationService.safeNotify({
      recipientType:     RECIPIENT_TYPES.ADVISOR,
      recipientId:       advisor.id || acceptedRel.advisorId,
      actorType:         ACTOR_TYPES.USER,
      actorId:           userId,
      type:              NOTIFICATION_TYPES.ADVISOR_INVITATION,
      title:             "Invitation Accepted",
      message:           `${req.user?.fullName || "A new client"} has accepted your invitation and joined SmartFinance.`,
      actionUrl:         "/advisor/portal",
      relatedEntityType: RELATED_ENTITY_TYPES.RELATIONSHIP,
      relatedEntityId:   acceptedRel.id,
    });

    // Return safe sanitized response
    return ok(
      res,
      {
        relationshipId: acceptedRel.id,
        advisor: {
          id:              advisor.id,
          fullName:        advisor.fullName || "",
          firmName:        advisor.firmName || "",
          specializations: advisor.specializations || [],
          profilePicture:  advisor.profilePicture || "",
        },
        status:         "active",
        connectedSince: acceptedRel.acceptedAt || acceptedRel.createdAt,
      },
      "Advisor invitation accepted successfully."
    );
  } catch (err) {
    if (err.code === "INVITE_INVALID") {
      return fail(res, "Invalid or expired invitation token.", 400, { code: "INVITE_INVALID" });
    }
    if (err.code === "INVITE_ALREADY_CLAIMED") {
      return fail(res, "This invitation has already been claimed.", 400, { code: "INVITE_ALREADY_CLAIMED" });
    }
    if (err.code === "EMAIL_MISMATCH") {
      return fail(res, "This invitation was issued to a different email address.", 403, { code: "EMAIL_MISMATCH" });
    }
    if (err.code === "USER_ALREADY_HAS_ADVISOR") {
      return fail(res, "You already have an active financial advisor.", 409, { code: "USER_ALREADY_HAS_ADVISOR" });
    }
    if (err.code === "ADVISOR_NOT_ELIGIBLE") {
      return fail(res, "The advisor is no longer eligible or active.", 403, { code: "ADVISOR_NOT_ELIGIBLE" });
    }

    console.error("claimInvitation error:", err);
    return fail(res, "Failed to accept invitation.", 500);
  }
};

// ── POST /api/user/advisor/terminate ──────────────────────────────────────────
// Authenticated user terminates their own active advisor relationship
const terminateActiveAdvisor = async (req, res) => {
  try {
    const userId    = req.user?.id;
    const userEmail = req.user?.email;

    if (!userId) {
      return fail(res, "Access denied. Valid user session required.", 401);
    }

    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

    // Execute atomic termination transition
    const terminatedRel = await AdvisorRelationship.terminateUserRelationship({
      userId,
      reason,
    });

    const advisor = terminatedRel.advisor || {};

    // Audit log successful relationship termination
    AuditLog.create({
      actorType:    "user",
      actorId:      userId,
      action:       "USER_ADVISOR_RELATIONSHIP_TERMINATED",
      resourceType: "advisor_client_relationship",
      resourceId:   terminatedRel.id,
      details: {
        userId,
        advisorId:      advisor.id || terminatedRel.advisorId,
        relationshipId: terminatedRel.id,
        reason:         terminatedRel.terminationReason || reason,
        method:         req.method,
        path:           req.originalUrl || req.baseUrl + req.path,
      },
      ipAddress:    req.ip || req.connection?.remoteAddress || "",
      userAgent:    req.get?.("user-agent") || "",
    }).catch((auditErr) => {
      console.error("Audit log error on USER_ADVISOR_RELATIONSHIP_TERMINATED:", auditErr);
    });

    // Notify advisor via email asynchronously after DB commit
    if (advisor.email) {
      sendAdvisorRelationshipTerminatedEmail({
        toEmail:     advisor.email,
        advisorName: advisor.fullName || "Advisor",
        clientName:  req.user?.fullName || "Client",
        clientEmail: userEmail || "",
        reason:      terminatedRel.terminationReason || reason,
      }).catch((emailErr) => {
        console.error("Failed to send advisor relationship terminated email:", emailErr);
      });
    }

    // In-app notification to advisor (non-blocking)
    notificationService.safeNotify({
      recipientType:     RECIPIENT_TYPES.ADVISOR,
      recipientId:       advisor.id || terminatedRel.advisorId,
      actorType:         ACTOR_TYPES.USER,
      actorId:           userId,
      type:              NOTIFICATION_TYPES.ADVISOR_RELATIONSHIP_TERMINATED,
      title:             "Advisory Relationship Terminated",
      message:           `${req.user?.fullName || "A client"} has terminated the advisory relationship.`,
      actionUrl:         "/advisor/portal",
      relatedEntityType: RELATED_ENTITY_TYPES.RELATIONSHIP,
      relatedEntityId:   terminatedRel.id,
    });

    return ok(
      res,
      {
        relationshipId: terminatedRel.id,
        advisor: {
          id:       advisor.id,
          fullName: advisor.fullName || "",
          firmName: advisor.firmName || "",
        },
        status:       "terminated",
        terminatedAt: terminatedRel.terminatedAt || new Date().toISOString(),
      },
      "Advisor relationship terminated successfully."
    );
  } catch (err) {
    if (err.code === "NO_ACTIVE_ADVISOR") {
      return fail(res, "No active advisor relationship found.", 404, {
        code: "NO_ACTIVE_ADVISOR",
      });
    }

    console.error("terminateActiveAdvisor error:", err);
    return fail(res, "Failed to terminate advisor relationship.", 500);
  }
};

module.exports = {
  getPendingRequests,
  getActiveAdvisor,
  acceptConnectionRequest,
  rejectConnectionRequest,
  claimInvitation,
  terminateActiveAdvisor,
};
