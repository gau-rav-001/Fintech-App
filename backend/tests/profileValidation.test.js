const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateProfile, validDate, validatePhoto } = require("../services/profileInput");

test("equivalent rupee income values normalize before persistence", () => {
  for (const value of ["150000", "1.5 lakh", "₹1,50,000", "1.5L", "150k"]) {
    const profile = { fullName: "हर्ष कुमार", income: { monthly: value } };
    assert.equal(validateProfile(profile), true);
    assert.equal(profile.income.monthly, 150000);
  }
});

test("malformed profile values cannot reach persistence", () => {
  for (const profile of [
    { role: "admin" }, { income: [] }, { location: "Mumbai" },
    { riskProfile: null }, { income: { monthly: "100xyz" } },
    { income: { monthly: Infinity } }, { income: { monthly: -1 } },
    { income: { annualGrowthPct: Infinity } }, { expenses: [null] },
    { goals: [{ targetAmount: 0 }] }, { dob: "2025-02-30" },
    { investments: [{ investedAmount: 10, currentValue: "1.001" }] },
    { loans: [{ outstandingAmount: 10, remainingMonths: 1.5 }] },
  ]) assert.throws(() => validateProfile(profile));
});

test("calendar and image validation reject unsupported input", () => {
  assert.equal(validDate("2024-02-29"), true);
  assert.equal(validDate("2025-02-29"), false);
  assert.equal(validatePhoto("javascript:alert(1)"), false);
  assert.equal(validatePhoto("data:image/svg+xml;base64,PHN2Zz4="), false);
  assert.equal(validatePhoto("data:image/png;base64,YWJj"), false);
});
