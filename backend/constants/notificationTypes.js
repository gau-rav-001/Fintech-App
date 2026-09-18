// backend/constants/notificationTypes.js
// ── SmartFinance Centralized Notification Constants ──────────────────────────

const NOTIFICATION_TYPES = Object.freeze({
  // Advisor ↔ Client Lifecycle Events
  ADVISOR_INVITATION:              "ADVISOR_INVITATION",
  ADVISOR_CONNECTION_REQUEST:       "ADVISOR_CONNECTION_REQUEST",
  ADVISOR_CONNECTION_ACCEPTED:      "ADVISOR_CONNECTION_ACCEPTED",
  ADVISOR_CONNECTION_REJECTED:      "ADVISOR_CONNECTION_REJECTED",
  ADVISOR_RELATIONSHIP_TERMINATED:  "ADVISOR_RELATIONSHIP_TERMINATED",

  // Future Phase 7.2 Capabilities (Step 5-9 Preparation)
  ADVISOR_MESSAGE:                  "ADVISOR_MESSAGE",
  ADVISOR_NOTE_SHARED:              "ADVISOR_NOTE_SHARED",
  ADVISOR_RECOMMENDATION:           "ADVISOR_RECOMMENDATION",
  RECOMMENDATION_ACKNOWLEDGED:      "RECOMMENDATION_ACKNOWLEDGED",
  APPOINTMENT_REQUESTED:            "APPOINTMENT_REQUESTED",
  APPOINTMENT_CONFIRMED:            "APPOINTMENT_CONFIRMED",
  APPOINTMENT_RESCHEDULED:          "APPOINTMENT_RESCHEDULED",
  APPOINTMENT_CANCELLED:            "APPOINTMENT_CANCELLED",
  APPOINTMENT_COMPLETED:            "APPOINTMENT_COMPLETED",

  // System & Financial Alerts
  SYSTEM_ALERT:                     "SYSTEM_ALERT",
});

const RECIPIENT_TYPES = Object.freeze({
  USER:    "user",
  ADVISOR: "advisor",
  ADMIN:   "admin",
});

const ACTOR_TYPES = Object.freeze({
  USER:    "user",
  ADVISOR: "advisor",
  ADMIN:   "admin",
  SYSTEM:  "system",
});

const RELATED_ENTITY_TYPES = Object.freeze({
  RELATIONSHIP:   "relationship",
  MESSAGE:        "message",
  NOTE:           "note",
  RECOMMENDATION: "recommendation",
  APPOINTMENT:    "appointment",
  SYSTEM:         "system",
});

module.exports = {
  NOTIFICATION_TYPES,
  RECIPIENT_TYPES,
  ACTOR_TYPES,
  RELATED_ENTITY_TYPES,
};
