"use strict";

const db = require("../config/db");
const { createNotification } = require("../services/notificationService");
const { nextStatus, problem, requiredText, slot } = require("../services/consultationRules");

// Legacy appointments store wall time plus a timezone. New slots use UTC to
// preserve the exact instant even during DST overlaps or across midnight.
const starts = "((appointment_date + start_time) AT TIME ZONE timezone)";
const activeStatuses = "('requested','confirmed','rescheduled')";
const historyQueries = {
  messages: "SELECT id, sender_type, content, is_read, created_at FROM advisor_messages WHERE relationship_id=$1",
  appointments: `SELECT id, title, status, initiated_by, ${starts} AS starts_at, duration_minutes, created_at FROM appointments WHERE relationship_id=$1`,
  notes: "SELECT id, title, content, created_at FROM advisor_notes WHERE relationship_id=$1",
  guidance: "SELECT id, category, title, summary, action_items, assumptions, risk_disclosure, follow_up, follow_up_completed_at, status, created_at FROM advisor_recommendations WHERE relationship_id=$1 AND status <> 'draft'",
};
const adviceTopics = {
  "Budget planning": "budget", "Expense management": "expenses", "Debt repayment": "debt",
  "Emergency fund": "emergency_fund", "Retirement planning": "retirement",
  "Financial goal planning": "goal", "Risk assessment": "risk",
  "Educational allocation scenario": "investment",
};

function withRelationship(role, actorId, relationshipId, work) {
  const owner = role === "advisor" ? "advisor_id" : "user_id";
  return db.transaction(async client => {
    const { rows } = await client.query(`
      SELECT r.id, r.advisor_id, r.user_id
      FROM advisor_client_relationships r JOIN advisors a ON a.id = r.advisor_id
      WHERE r.id=$1 AND r.${owner}=$2 AND r.status='active'
        AND a.approval_status='approved' AND a.is_email_verified
      FOR SHARE OF r, a`, [relationshipId, actorId]);
    if (!rows.length) throw problem(403, "An active advisory relationship is required.");
    return work(client, rows[0]);
  });
}

async function notify(client, rel, role, type, entity, id, title) {
  const fromAdvisor = role === "advisor";
  return createNotification({
    recipientType: fromAdvisor ? "user" : "advisor",
    recipientId: fromAdvisor ? rel.user_id : rel.advisor_id,
    actorType: role, actorId: fromAdvisor ? rel.advisor_id : rel.user_id,
    type, title, message: title, relatedEntityType: entity, relatedEntityId: id,
    actionUrl: fromAdvisor ? "/settings" : "/advisor/portal",
  }, client);
}

async function history(client, rel, role, collection, page) {
  if (!Object.hasOwn(historyQueries, collection) || (collection === "notes" && role !== "advisor")) {
    throw problem(404, "Collection unavailable.");
  }
  const { rows } = await client.query(`${historyQueries[collection]} ORDER BY created_at DESC, id DESC LIMIT 21 OFFSET $2`, [rel.id, (page-1)*20]);
  return { items: rows.slice(0, 20), hasMore: rows.length > 20 };
}

async function sendMessage(client, rel, role, input) {
  const content = requiredText(input.content, 5000);
  const sender = role === "advisor" ? rel.advisor_id : rel.user_id;
  const { rows } = await client.query(`
    INSERT INTO advisor_messages(advisor_id,client_id,relationship_id,sender_type,sender_id,content)
    VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [rel.advisor_id, rel.user_id, rel.id, role, sender, content]);
  await notify(client, rel, role, "ADVISOR_MESSAGE", "message", rows[0].id, "New advisory message");
  return rows[0];
}

async function readMessages(client, rel, role, ids) {
  await client.query(`UPDATE advisor_messages SET is_read=true,read_at=now()
    WHERE relationship_id=$1 AND sender_type<>$2 AND id=ANY($3::uuid[]) AND NOT is_read`, [rel.id, role, ids]);
}

async function book(client, rel, role, input, appointmentId = null) {
  const action = appointmentId ? input.action : "request";
  let status = "requested";
  let title;
  // Both keys are acquired in the same order for all booking transactions.
  // Hash collisions only serialize unrelated bookings.
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 1))", [rel.advisor_id]);
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 2))", [rel.user_id]);

  if (appointmentId) {
    const { rows } = await client.query(`SELECT status, initiated_by, ${starts} AS starts_at, duration_minutes
      FROM appointments WHERE id=$1 AND relationship_id=$2 FOR UPDATE`, [appointmentId, rel.id]);
    if (!rows.length) throw problem(404, "Consultation unavailable.");
    status = nextStatus(action, role, rows[0]);
    if (action === "complete" && Date.now() < rows[0].starts_at.getTime() + rows[0].duration_minutes * 60000) {
      throw problem(409, "The consultation has not ended.");
    }
    if (action === "confirm" && rows[0].starts_at <= new Date()) throw problem(409, "The requested time has passed.");
  } else {
    title = requiredText(input.title, 150);
  }
  if (action === "request" || action === "reschedule") {
    const { startsAt, duration } = slot(input);
    const clash = await client.query(`SELECT 1 FROM appointments
      WHERE (advisor_id=$1 OR client_id=$2) AND status IN ${activeStatuses}
      AND id IS DISTINCT FROM $3::uuid
      AND ${starts} < $4::timestamptz + $5::int * interval '1 minute'
      AND ${starts} + duration_minutes * interval '1 minute' > $4::timestamptz LIMIT 1`,
      [rel.advisor_id, rel.user_id, appointmentId, startsAt, duration]);
    if (clash.rowCount) throw problem(409, "That time overlaps an existing consultation.");
    const proposer = role === "advisor" ? "advisor" : "client";
    const day = startsAt.slice(0,10);
    const startTime = startsAt.slice(11,19);
    const endTime = new Date(Date.parse(startsAt) + duration*60000).toISOString().slice(11,19);
    if (appointmentId) {
      await client.query(`UPDATE appointments SET appointment_date=$2,start_time=$3,end_time=$4,
        duration_minutes=$5,timezone='UTC',initiated_by=$6,status='rescheduled' WHERE id=$1`,
        [appointmentId, day, startTime, endTime, duration, proposer]);
    } else {
      const created = await client.query(`INSERT INTO appointments(advisor_id,client_id,relationship_id,title,
        appointment_date,start_time,end_time,duration_minutes,timezone,initiated_by,status)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,'UTC',$9,'requested') RETURNING id`,
        [rel.advisor_id, rel.user_id, rel.id, title, day, startTime, endTime, duration, proposer]);
      appointmentId = created.rows[0].id;
    }
  } else {
    await client.query("UPDATE appointments SET status=$2 WHERE id=$1", [appointmentId, status]);
  }
  await notify(client, rel, role, "APPOINTMENT_"+status.toUpperCase(), "appointment", appointmentId, "Consultation "+status);
  return { id: appointmentId, status };
}

async function saveNote(client, rel, input) {
  const title = requiredText(input.title, 150);
  const content = requiredText(input.content, 5000);
  const { rows } = await client.query(`INSERT INTO advisor_notes(advisor_id,client_id,relationship_id,title,content,category)
    VALUES ($1,$2,$3,$4,$5,'meeting') RETURNING id`, [rel.advisor_id, rel.user_id, rel.id, title, content]);
  return rows[0];
}

async function publishGuidance(client, rel, input) {
  if (!Object.hasOwn(adviceTopics, input.topic)) throw problem(422, "Select a supported planning topic.");
  const illustration = adviceTopics[input.topic] === "investment";
  const summary = illustration ? "Illustration: dividing a hypothetical ₹1,000 equally between two asset categories assigns ₹500 to each." : requiredText(input.summary, 2000);
  const assumptions = illustration ? "Hypothetical starting amount with equal illustrative weights. Fees, tax and returns are excluded." : requiredText(input.assumptions, 1000);
  const risks = illustration ? "Asset classes can lose value. This example does not establish personal suitability or recommend a security." : requiredText(input.risks, 1000);
  const followUp = illustration ? "Review the effects of diversification and concentration." : requiredText(input.followUp, 500);
  const { rows } = await client.query(`INSERT INTO advisor_recommendations(advisor_id,client_id,relationship_id,
    category,title,summary,assumptions,risk_disclosure,follow_up) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [rel.advisor_id, rel.user_id, rel.id, adviceTopics[input.topic], input.topic, summary, assumptions, risks, followUp]);
  await notify(client, rel, "advisor", "ADVISOR_RECOMMENDATION", "recommendation", rows[0].id, "New planning guidance");
  return rows[0];
}

async function acknowledge(client, rel, id) {
  const result = await client.query(`UPDATE advisor_recommendations SET status='acknowledged',acknowledged_at=now()
    WHERE id=$1 AND relationship_id=$2 AND status='submitted' RETURNING id`, [id, rel.id]);
  if (!result.rowCount) throw problem(409, "Guidance unavailable for acknowledgement.");
  await notify(client, rel, "user", "RECOMMENDATION_ACKNOWLEDGED", "recommendation", id, "Planning guidance acknowledged");
  return result.rows[0];
}

async function completeFollowUp(client, rel, id) {
  const result = await client.query(`UPDATE advisor_recommendations SET follow_up_completed_at=now()
    WHERE id=$1 AND relationship_id=$2 AND follow_up IS NOT NULL AND follow_up_completed_at IS NULL RETURNING id`, [id, rel.id]);
  if (!result.rowCount) throw problem(409, "Follow-up unavailable.");
  return result.rows[0];
}

async function availability(client, advisorId) {
  const { rows } = await client.query(`SELECT w.id,w.starts_at,w.ends_at FROM advisor_availability w
    WHERE w.advisor_id=$1 AND NOT w.closed AND w.starts_at>now()
      AND NOT EXISTS (SELECT 1 FROM appointments WHERE advisor_id=w.advisor_id AND status IN ${activeStatuses}
        AND ${starts}<w.ends_at AND ${starts}+duration_minutes*interval '1 minute'>w.starts_at)
    ORDER BY w.starts_at LIMIT 100`, [advisorId]);
  return rows;
}

async function changeAvailability(advisorId, input, closeId) {
  return db.transaction(async client => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,1))", [advisorId]);
    if (closeId) {
      const result = await client.query("UPDATE advisor_availability SET closed=true WHERE id=$1 AND advisor_id=$2 AND NOT closed RETURNING id", [closeId, advisorId]);
      if (!result.rowCount) throw problem(404, "Availability unavailable.");
      return result.rows[0];
    }
    const { startsAt, duration } = slot(input);
    const endAt = new Date(Date.parse(startsAt) + duration*60000).toISOString();
    const overlaps = await client.query(`SELECT 1 FROM advisor_availability WHERE advisor_id=$1
      AND NOT closed AND starts_at<$3 AND ends_at>$2
      UNION ALL SELECT 1 FROM appointments WHERE advisor_id=$1 AND status IN ${activeStatuses}
      AND ${starts}<$3 AND ${starts}+duration_minutes*interval '1 minute'>$2 LIMIT 1`, [advisorId, startsAt, endAt]);
    if (overlaps.rowCount) throw problem(409, "This window overlaps an existing slot.");
    const result = await client.query("INSERT INTO advisor_availability(advisor_id,starts_at,ends_at) VALUES ($1,$2,$3) RETURNING id", [advisorId, startsAt, endAt]);
    return result.rows[0];
  });
}

module.exports = { withRelationship, history, sendMessage, readMessages, book, saveNote, publishGuidance, acknowledge, completeFollowUp, availability, changeAvailability };
