const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const file = require("node:path").join(__dirname, "../services/consultationRules.js");
const rules = fs.existsSync(file) ? require(file) : {};

test("consultations use explicit UTC instants and bounded whole-minute durations", () => {
  assert.equal(typeof rules.slot, "function");
  const input = { startsAt: "2030-01-31T18:45:00.000Z", duration: 30 };
  assert.equal(rules.slot(input, 0).startsAt, input.startsAt);
  for (const change of [
    { startsAt: "2030-01-31T18:45" }, { startsAt: "2030-02-31T18:45:00.000Z" },
    { startsAt: "2030-01-31T18:45:01.000Z" }, { duration: -20 }, { duration: 20.1 },
    { startsAt: "2000-01-01T00:00:00.000Z" },
  ]) assert.throws(() => rules.slot({ ...input, ...change }, Date.UTC(2029, 0)), { status: 422 });
});

test("booking acceptance requires the other participant and a live request", () => {
  assert.equal(typeof rules.nextStatus, "function");
  const proposed = { status: "requested", initiated_by: "client" };
  assert.equal(rules.nextStatus("confirm", "advisor", proposed), "confirmed");
  assert.throws(() => rules.nextStatus("confirm", "user", proposed), { status: 409 });
  assert.throws(() => rules.nextStatus("reschedule", "advisor", { status: "cancelled" }), { status: 409 });
  assert.equal(rules.nextStatus("cancel", "user", proposed), "cancelled");
  assert.equal(rules.nextStatus("reschedule", "user", { status: "confirmed" }), "rescheduled");
});

test("message and guidance inputs enforce strict limits", () => {
  assert.equal(typeof rules.requiredText, "function");
  assert.equal(rules.requiredText("  नमस्ते  ", 50), "नमस्ते");
  for (const value of ["   ", [], "evil\u0000", "x".repeat(51)]) {
    assert.throws(() => rules.requiredText(value, 50), { status: 422 });
  }
});
