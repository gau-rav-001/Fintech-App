const { test } = require("node:test");
const assert = require("node:assert/strict");
const { solveFinancialMath } = require("../ai/brain/financialBrain");
const math = require("../services/financialUtils");

test("equivalent INR amounts have identical 50/30/20 budgets", () => {
  for (const amount of ["150000", "1.5 lakh", "₹1,50,000", "1.5L", "150k", "0.015 crore"]) {
    const budget = solveFinancialMath("budget for " + amount + " salary");
    for (const share of ["₹75,000", "₹45,000", "₹30,000"]) assert.ok(budget?.includes(share), amount + " should include " + share);
  }
});
test("small amounts are rupees and invalid amounts are rejected", () => {
  assert.match(solveFinancialMath("budget for 100 salary"), /₹50\/month/);
  for (const amount of ["1.2.3", "-200", "1,50,00", "Infinity", "1e9", "1.234", "10000000000000"]) {
    assert.equal(solveFinancialMath("budget for " + amount + " salary"), null, amount);
  }
});
test("percent, goal SIP, SIP maturity and loan EMI accept INR units and zero interest", () => {
  assert.match(solveFinancialMath("20% of 1.5L"), /30,000/);
  assert.match(solveFinancialMath("reach 120000 in 10 years at 0%"), /₹1,000/);
  assert.match(solveFinancialMath("SIP of 1k for 10 years at 0%"), /1.20 L/);
  assert.match(solveFinancialMath("EMI of 1.2 lakh at 0% for 10 years"), /₹1,000/);
});
test("zero-rate annuities preserve principal and inverse computation", () => {
  assert.equal(math.calculateSIPFutureValue(1000, 0, 10), 120000);
  assert.equal(math.calculateRequiredSIP(120000, 10, 0), 1000);
  assert.equal(math.calculateEMI(120000, 0, 120), 1000);
  for (const rate of [0.01, 8, 15]) assert.ok(Math.abs(math.calculateRequiredSIP(math.calculateSIPFutureValue(1000, rate, 10), 10, rate) - 1000) < 1e-8);
});
