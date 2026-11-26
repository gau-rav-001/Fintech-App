const { test } = require("node:test");
const assert = require("node:assert/strict");

// Replace only storage in this isolated test process. Every tool executes its real calculation.
const userId = "fixture-owner";
function model(value) {
  const lookup = async id => {
    assert.equal(id, userId);
    return value;
  };
  return {findById: lookup, findByUserId: lookup};
}
function useFixture(name, exports) {
  const id = require.resolve("../models/" + name);
  require.cache[id] = {id, filename: id, loaded: true, exports};
}
const loans = [{loanType: "home", outstandingAmount: 50000, emi: 5000, interestRatePct: 8}];
const investments = [{investmentType: "stock", currentValue: 120000, investedAmount: 100000, returns: 20000}];
const goals = [{name: "Laptop", status: "active", targetAmount: 10000, currentAmount: 4000, monthlyContribution: 100, targetDate: "2000-01-01"}];
useFixture("User", model({id: userId, fullName: "Fixture", dob: "1990-04-01", loans, investments, income: {monthly: 150000}}));
useFixture("FinancialProfile", model(null));
useFixture("Income", model([{amount: 1800000, frequency: "annual"}]));
useFixture("Expense", model([{category: "rent", amount: 30000, frequency: "monthly"}]));
useFixture("Loan", model(loans));
useFixture("Investment", model(investments));
useFixture("FinancialEntities", {Asset: model([{currentValue: 60000, isLiquid: true}]), SIP: model([]), Goal: model(goals)});
useFixture("PlanningEntities", {RetirementPlan: model({currentAge: 59, retirementAge: 60, lifeExpectancy: 62, currentCorpus: 50000, monthlyContribution: 1000, expectedReturnPct: 0, inflationPct: 0, monthlyExpensePostRetirement: 10000})});
process.env.USE_NORMALIZED_READS = "true";
const tools = require("../ai/tools/financialTools");
const scenarios = {
  getFinancialProfile: [[], d => assert.deepEqual([d.netWorth.total, d.monthly.savings], [130000, 115000])],
  getInvestmentSummary: [[], d => assert.equal(d.portfolio.returnPct, 20)],
  getLoanSummary: [[], d => assert.deepEqual([d.totalOutstanding, d.totalEMI], [50000, 5000])],
  calculateHealthScore: [[], d => { assert.ok(d.score >= 0 && d.score <= 100); assert.equal(d.breakdown.insuranceScore, null); }],
  budgetAnalysis: [[], d => assert.deepEqual([d.income, d.expenses, d.savings], [150000, 30000, 115000])],
  goalAnalysis: [[], d => assert.deepEqual([d.goals[0].gap, d.goals[0].progress, d.onTrack], [6000, 40, 0])],
  retirementAnalysis: [[], d => assert.deepEqual([d.projectedCorpus, d.requiredCorpus, d.gap], [62000, 240000, 178000])],
  riskAnalysis: [[], d => assert.equal(d.allocation.equity, 100)],
  emergencyFundCheck: [[], d => assert.deepEqual([d.coverage, d.gap], [2, 120000])],
  affordabilityCheck: [[30000], d => assert.equal(d.details.remainingLiquid, 30000)],
  wealthForecast: [[1], d => assert.equal(d.projectedWealth, 145600)],
  whatIfSimulator: [[{incomeChange: 10000, expenseChange: 2000}], d => assert.equal(d.impact.savingsChange, 8000)],
  loanAdvisor: [[], d => assert.equal(d.extraPayment, 57500)],
  investmentAdvisor: [[], d => {assert.equal(d.current.portfolio, 120000);assert.equal(d.current.allocation.equity, 100);} ],
  taxPlanner: [[], d => assert.equal(d.annualIncome, 1800000)]
};
for (const [name, [args, verify]] of Object.entries(scenarios)) {
  test(name + " numerical contract", async () => verify(await tools[name](userId, ...args)));
}
test("all exported tools have a scenario", () => assert.deepEqual(Object.keys(scenarios).sort(), Object.keys(tools).sort()));
