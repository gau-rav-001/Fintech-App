// ── AI Financial Tools Layer ──────────────────────────────────────────────────
// Wrapper functions for LLM consumption — abstracts database access

const {
  calculateNetWorth,
  calculateDebtToIncomeRatio,
  calculateEmergencyFund,
  calculateBudgetHealth,
  calculateGoalProgress,
  calculateInvestmentGrowth,
  calculateRetirementCorpus,
  calculateRiskProfile,
  calculateAffordability,
  calculateFinancialHealthScore,
} = require("../../services/financialIntelligence");

const {
  calculateSIPFutureValue,
  calculateFutureValue,
  suggestAssetAllocation,
  calculateFINumber,
} = require("../../services/financialUtils");

const User = require("../../models/User");
const { getLoans: getLoansFromUser, getIncome: getIncomeFromUser } = require("../../services/FinancialDataService");
const { parseRupees } = require("../../services/financialAmount");

// ── Tool 1: Get Financial Profile ─────────────────────────────────────────────
async function getFinancialProfile(userId) {
  const [user, netWorth, budget, emergency] = await Promise.all([
    User.findById(userId),
    calculateNetWorth(userId),
    calculateBudgetHealth(userId),
    calculateEmergencyFund(userId),
  ]);

  return {
    personal: {
      name: user?.fullName || "User",
      age: user?.dob ? new Date().getFullYear() - new Date(user.dob).getFullYear() : null,
      occupation: user?.occupation,
      city: user?.location?.city,
    },
    netWorth: {
      total: netWorth.netWorth,
      assets: netWorth.totalAssets,
      liabilities: netWorth.totalLiabilities,
    },
    monthly: {
      income: budget.monthlyIncome,
      expense: budget.monthlyExpense,
      savings: budget.monthlySavings,
      savingsRate: budget.savingsRate,
    },
    emergencyFund: {
      coverage: emergency.coverageMonths,
      status: emergency.status,
    },
  };
}

// ── Tool 2: Get Investment Summary ────────────────────────────────────────────
async function getInvestmentSummary(userId) {
  const growth = await calculateInvestmentGrowth(userId);
  return {
    portfolio: {
      totalInvested: growth.totalInvested,
      currentValue: growth.totalValue,
      returns: growth.totalReturns,
      returnPct: growth.returnPct,
    },
    monthlySIP: growth.monthlySIP,
    diversification: growth.diversificationScore,
    byType: growth.byType,
  };
}

// ── Tool 3: Get Loan Summary ──────────────────────────────────────────────────
async function getLoanSummary(userId) {
  const [loans, debtRatio] = await Promise.all([
    getLoansFromUser(userId),
    calculateDebtToIncomeRatio(userId),
  ]);

  return {
    totalLoans: loans.length,
    totalOutstanding: loans.reduce((s, l) => s + l.outstandingAmount, 0),
    totalEMI: loans.reduce((s, l) => s + l.emi, 0),
    debtToIncomeRatio: debtRatio.ratio,
    status: debtRatio.status,
    loans: loans.map((l) => ({
      type: l.loanType,
      outstanding: l.outstandingAmount,
      emi: l.emi,
      rate: l.interestRatePct,
    })),
  };
}

// ── Tool 4: Calculate Health Score ────────────────────────────────────────────
async function calculateHealthScore(userId) {
  const health = await calculateFinancialHealthScore(userId);
  return {
    score: health.overallScore,
    grade: health.grade,
    breakdown: health.scores,
    strengths: health.strengths,
    weaknesses: health.weaknesses,
    recommendations: health.recommendations,
  };
}

// ── Tool 5: Budget Analysis ───────────────────────────────────────────────────
async function budgetAnalysis(userId) {
  const budget = await calculateBudgetHealth(userId);
  return {
    income: budget.monthlyIncome,
    expenses: budget.monthlyExpense,
    savings: budget.monthlySavings,
    savingsRate: budget.savingsRate,
    status: budget.status,
    categoryBreakdown: budget.categoryBreakdown,
    recommendations: budget.recommendations,
  };
}

// ── Tool 6: Goal Analysis ─────────────────────────────────────────────────────
async function goalAnalysis(userId) {
  const goals = await calculateGoalProgress(userId);
  return {
    totalGoals: goals.length,
    onTrack: goals.filter((g) => g.onTrack).length,
    goals: goals.map((g) => ({
      name: g.name,
      progress: g.progress,
      gap: g.gap,
      monthlyNeeded: g.monthlyNeeded,
      currentContribution: g.currentContribution,
      status: g.status,
    })),
  };
}

// ── Tool 7: Retirement Analysis ───────────────────────────────────────────────
async function retirementAnalysis(userId) {
  const result = await calculateRetirementCorpus(userId);
  if (result.error) return result;

  return {
    currentAge: result.currentAge,
    retirementAge: result.retirementAge,
    projectedCorpus: result.projectedCorpus,
    requiredCorpus: result.requiredCorpus,
    gap: result.corpusGap,
    sufficient: result.isSufficient,
    assumptions: { ...result.assumptions, contributionTiming: "month end", withdrawalTiming: "annual, beginning at retirement" },
    additionalSIPNeeded: result.additionalSIPNeeded,
  };
}

// ── Tool 8: Risk Analysis ─────────────────────────────────────────────────────
async function riskAnalysis(userId) {
  const risk = await calculateRiskProfile(userId);
  return {
    score: risk.riskScore,
    category: risk.riskCategory,
    allocation: risk.allocation,
    factors: risk.factors,
  };
}

// ── Tool 9: Emergency Fund Check ──────────────────────────────────────────────
async function emergencyFundCheck(userId) {
  const emergency = await calculateEmergencyFund(userId);
  return {
    currentAmount: emergency.currentAmount,
    targetAmount: emergency.targetAmount,
    coverage: emergency.coverageMonths,
    gap: emergency.gap,
    status: emergency.status,
    sufficient: emergency.isSufficient,
  };
}

// ── Tool 10: Affordability Check ──────────────────────────────────────────────
async function affordabilityCheck(userId, amount, type = "one_time") {
  amount = parseRupees(amount);
  if (!(amount > 0) || !["emi", "one_time"].includes(type)) return { error: "Enter a positive purchase amount and a valid purchase type." };
  const result = await calculateAffordability(userId, amount, type);
  return {
    canAfford: result.canAfford,
    recommendation: result.recommendation,
    details: result,
  };
}

// ── Tool 11: Wealth Forecast ──────────────────────────────────────────────────
async function wealthForecast(userId, years = 10) {
  if (!Number.isInteger(years) || years < 1 || years > 100) return { error: "Forecast horizon must be 1–100 whole years." };
  const [netWorth, growth] = await Promise.all([
    calculateNetWorth(userId),
    calculateInvestmentGrowth(userId),
  ]);

  const currentWealth = netWorth.netWorth;
  const growthRate = 12;
  const existingFV = calculateFutureValue(currentWealth, growthRate, years);
  const sipFV = growth.monthlySIP > 0 ? calculateSIPFutureValue(growth.monthlySIP, growthRate, years) : 0;

  return {
    currentWealth,
    projectedWealth: Math.round(existingFV + sipFV),
    years,
    growthRate,
    monthlySIP: growth.monthlySIP,
  };
}

// ── Tool 12: What-If Simulator ────────────────────────────────────────────────
async function whatIfSimulator(userId, changes = {}) {
  const adjustments = Object.values(changes);
  if (!adjustments.some(v => v !== 0) || adjustments.some(v => !Number.isFinite(v) || parseRupees(Math.abs(v)) === null)) return { error: "Specify an income or expense change in rupees." };
  const budget = await calculateBudgetHealth(userId);

  const baseline = {
    income: budget.monthlyIncome,
    expense: budget.monthlyExpense,
    savings: budget.monthlySavings,
    savingsRate: budget.savingsRate,
  };

  const modified = { ...baseline };
  if (changes.incomeChange) modified.income += changes.incomeChange;
  if (changes.expenseChange) modified.expense += changes.expenseChange;

  if (modified.income < 0 || modified.expense < 0) return { error: "The adjusted income or expense cannot be negative." };
  modified.savings = baseline.savings + (changes.incomeChange || 0) - (changes.expenseChange || 0);
  modified.savingsRate = modified.income > 0 ? (modified.savings / modified.income) * 100 : null;

  return {
    baseline,
    modified,
    impact: {
      savingsChange: modified.savings - baseline.savings,
      savingsRateChange: modified.savingsRate === null ? null : modified.savingsRate - baseline.savingsRate,
    },
  };
}

// ── Tool 13: Loan Advisor ────────────────────────────────────────────────────
async function loanAdvisor(userId) {
  const [loans, debtRatio, budget] = await Promise.all([
    getLoansFromUser(userId),
    calculateDebtToIncomeRatio(userId),
    calculateBudgetHealth(userId),
  ]);

  const sorted = [...loans].sort((a, b) => b.interestRatePct - a.interestRatePct);

  return {
    debtHealth: {
      ratio: debtRatio.ratio,
      status: debtRatio.status,
      monthlyDebt: debtRatio.monthlyDebt,
    },
    loans: sorted.map((l) => ({
      type: l.loanType,
      outstanding: l.outstandingAmount,
      emi: l.emi,
      rate: l.interestRatePct,
      priority: l.interestRatePct > 10 ? "high" : l.interestRatePct > 7 ? "medium" : "low",
    })),
    strategy: "Pay off highest interest loans first (debt avalanche)",
    extraPayment: Math.max(0, Math.round(budget.monthlySavings * 0.5)),
  };
}

// ── Tool 14: Investment Advisor ───────────────────────────────────────────────
async function investmentAdvisor(userId) {
  const [user, growth, risk] = await Promise.all([
    User.findById(userId),
    calculateInvestmentGrowth(userId),
    calculateRiskProfile(userId),
  ]);

  return {
    current: {
      portfolio: growth.totalValue,
      returns: growth.returnPct,
      allocation: risk.allocation,
    },
    disclosure: "Descriptive portfolio breakdown. Assessing a suitable allocation requires a qualified advisor and your investment objectives.",
  };
}

// ── Tool 15: Tax Planner ──────────────────────────────────────────────────────
async function taxPlanner(userId) {
  const incomes = await getIncomeFromUser(userId);
  const { annualizeAmount } = require("../../services/financialIntelligence")._helpers;
  const annualIncome = incomes.reduce((sum, income) => sum + annualizeAmount(income.amount, income.frequency), 0);
  return {
    annualIncome,
    assumptions: "Annualized recurring income before taxes. Tax liability and deductions require the assessment year, tax regime and eligible payments.",
  };
}

module.exports = {
  getFinancialProfile,
  getInvestmentSummary,
  getLoanSummary,
  calculateHealthScore,
  budgetAnalysis,
  goalAnalysis,
  retirementAnalysis,
  riskAnalysis,
  emergencyFundCheck,
  affordabilityCheck,
  wealthForecast,
  whatIfSimulator,
  loanAdvisor,
  investmentAdvisor,
  taxPlanner,
};
