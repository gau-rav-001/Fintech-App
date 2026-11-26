"use strict";

function problem(status, message) {
  return Object.assign(new Error(message), { status });
}

function requiredText(value, limit) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > limit ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) {
    throw problem(422, `Enter text between 1 and ${limit} characters.`);
  }
  return value.trim();
}

function slot({ startsAt, duration }, now = Date.now()) {
  const instant = new Date(startsAt);
  if (typeof startsAt !== "string" || !Number.isFinite(instant.getTime()) ||
      instant.toISOString() !== startsAt || instant <= now ||
      instant.getUTCSeconds() !== 0 || instant.getUTCMilliseconds() !== 0) {
    throw problem(422, "Select a future date and time, to the nearest minute.");
  }
  if (!Number.isInteger(duration) || duration < 15 || duration > 120) {
    throw problem(422, "Choose a duration of 15 to 120 whole minutes.");
  }
  return { startsAt, duration };
}

function nextStatus(action, role, appointment) {
  if (!["requested", "confirmed", "rescheduled"].includes(appointment.status)) {
    throw problem(409, "This consultation is already closed.");
  }
  if (action === "cancel") return "cancelled";
  if (action === "reschedule") return "rescheduled";
  const proposer = appointment.initiated_by === "client" ? "user" : "advisor";
  if (action === "confirm" && appointment.status !== "confirmed" && proposer !== role) return "confirmed";
  if (action === "complete" && role === "advisor" && appointment.status === "confirmed") return "completed";
  throw problem(409, "This action is unavailable for the current appointment.");
}

module.exports = { problem, requiredText, slot, nextStatus };
