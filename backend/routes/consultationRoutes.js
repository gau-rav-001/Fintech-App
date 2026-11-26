"use strict";

const express = require("express");
const db = require("../config/db");
const Advisor = require("../models/Advisor");
const Workspace = require("../models/ConsultationWorkspace");
const { requiredText, problem } = require("../services/consultationRules");
const { ok } = require("../utils/response");

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function id(value) {
  if (typeof value !== "string" || !uuid.test(value)) throw problem(422, "A valid record identifier is required.");
  return value;
}
function fields(input, allowed) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => !allowed.includes(key))) {
    throw problem(422, "Unexpected request fields.");
  }
  return input;
}
function route(handler, created = false) {
  return async (req, res, next) => {
    try {
      res.set("Cache-Control", "private, no-store");
      return ok(res, await handler(req), "Success", created ? 201 : 200);
    } catch (error) { return next(error); }
  };
}

function workspaceRoutes(role) {
  const router = express.Router({ mergeParams: true });
  const scoped = (handler, created = false) => route(req => {
    const actor = role === "advisor" ? req.advisor : req.user;
    return Workspace.withRelationship(role, actor.id, id(req.params.relationshipId),
      (client, rel) => handler(client, rel, req));
  }, created);
  router.get("/availability", scoped((client, rel) => Workspace.availability(client, rel.advisor_id)));
  router.get("/:collection", scoped((client, rel, req) => {
    const page = req.query.page ?? "1";
    if (typeof page !== "string" || !/^[1-9]\d{0,4}$/.test(page)) throw problem(422, "Invalid page.");
    return Workspace.history(client, rel, role, req.params.collection, Number(page));
  }));
  router.post("/messages", scoped((client, rel, req) =>
    Workspace.sendMessage(client, rel, role, fields(req.body, ["content"])), true));
  router.patch("/messages/read", scoped(async (client, rel, req) => {
    const { ids } = fields(req.body, ["ids"]);
    if (!Array.isArray(ids) || ids.length > 20) throw problem(422, "Up to 20 message identifiers are allowed.");
    await Workspace.readMessages(client, rel, role, ids.map(id));
    return {};
  }));
  router.post("/appointments", scoped((client, rel, req) =>
    Workspace.book(client, rel, role, fields(req.body, ["title", "startsAt", "duration"])), true));
  router.patch("/appointments/:id", scoped((client, rel, req) =>
    Workspace.book(client, rel, role, fields(req.body, ["action","startsAt","duration"]), id(req.params.id))));
  if (role === "advisor") {
    router.post("/notes", scoped((client, rel, req) => Workspace.saveNote(client, rel, fields(req.body, ["title","content"])), true));
    router.post("/guidance", scoped((client, rel, req) =>
      Workspace.publishGuidance(client, rel, fields(req.body, ["topic","summary","assumptions","risks","followUp"])), true));
    router.patch("/guidance/:id/follow-up", scoped((client, rel, req) => Workspace.completeFollowUp(client, rel, id(req.params.id))));
  } else {
    router.patch("/guidance/:id/acknowledge", scoped((client, rel, req) => Workspace.acknowledge(client, rel, id(req.params.id))));
  }
  return router;
}

const practice = express.Router();
practice.get("/availability", route(req => Workspace.availability(db, req.advisor.id)));
practice.post("/availability", route(req => Workspace.changeAvailability(req.advisor.id, fields(req.body, ["startsAt","duration"])), true));
practice.patch("/availability/:id/close", route(req => Workspace.changeAvailability(req.advisor.id, {}, id(req.params.id))));
practice.patch("/profile", route(async req => {
  const data = fields(req.body, ["bio","specializations","experienceYears"]);
  const bio = typeof data.bio === "string" && !data.bio.trim() ? "" : requiredText(data.bio, 2000);
  if (!Array.isArray(data.specializations) || data.specializations.length > 12 ||
      !Number.isInteger(data.experienceYears) || data.experienceYears < 0 || data.experienceYears > 70) {
    throw problem(422, "Provide up to 12 specialties and 0–70 years of experience.");
  }
  const specializations = [...new Set(data.specializations.map(value => requiredText(value, 80)))];
  return Advisor.update(req.advisor.id, { bio, specializations, experienceYears: data.experienceYears });
}));
practice.get("/activity", route(async req => {
  const { rows } = await db.query(`WITH active AS (SELECT id FROM advisor_client_relationships
      WHERE advisor_id=$1 AND status='active'),
    events AS (
      SELECT 'Message' AS label, created_at FROM advisor_messages WHERE relationship_id IN (SELECT id FROM active)
      UNION ALL SELECT 'Consultation '||status, updated_at FROM appointments WHERE relationship_id IN (SELECT id FROM active)
      UNION ALL SELECT 'Guidance '||status, updated_at FROM advisor_recommendations WHERE relationship_id IN (SELECT id FROM active))
    SELECT (SELECT count(*)::int FROM appointments WHERE relationship_id IN (SELECT id FROM active)
            AND status IN ('requested','rescheduled')) pending,
      (SELECT count(*)::int FROM appointments WHERE relationship_id IN (SELECT id FROM active) AND status='confirmed'
        AND ((appointment_date+start_time) AT TIME ZONE timezone)>=now()) upcoming,
      (SELECT count(*)::int FROM advisor_messages WHERE relationship_id IN (SELECT id FROM active)
        AND sender_type='user' AND NOT is_read) unread,
      (SELECT count(*)::int FROM advisor_recommendations WHERE relationship_id IN (SELECT id FROM active)
        AND follow_up IS NOT NULL AND follow_up_completed_at IS NULL) followups,
      (SELECT COALESCE(json_agg(e),'[]') FROM (SELECT label, created_at FROM events ORDER BY created_at DESC LIMIT 8) e) activity`, [req.advisor.id]);
  return rows[0];
}));
module.exports = { workspaceRoutes, practice };
