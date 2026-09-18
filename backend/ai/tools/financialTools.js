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
const Loan = require("../../models/Loan");
const Income = require("../../models/Income");
const Investment = require("../../models/Investment");

// ── BUG FIX: Loan.findByUserId() / Income.findByUserId() query separate
// normalized tables (loan_records / income_records) that onboarding never
// writes to — onboarding saves loans/income straight onto the `users` row
// (users.loans JSONB, users.income_monthly/income_additional columns).
// That made every loan- and tax-related tool below silently return empty/
// zero data, even when the user had completed onboarding.
//
// Fix: read loans/income from User.findById() (ground truth — same source
// userController.getDashboardSummary uses) and reshape into the same field
// names the rest of this file already expects (outstandingAmount, emi,
// interestRatePct, loanType / amount, frequency).
async function getLoansFromUser(userId) {
  const user = await User.findById(userId);
  const loans = user?.loans || [];
  return loans.map((l, i) => ({
    id: l.id || `loan-${i}`,
    loanType: l.loanType || l.type || "other",
    outstandingAmount: parseFloat(l.outstandingAmount) || 0,
    emi: parseFloat(l.emi) || 0,
    interestRatePct: parseFloat(l.interestRatePct ?? l.interestRate) || 0,
  }));
}

async function getIncomeFromUser(userId) {
  const user = await User.findById(userId);
  const incomeObj = user?.income || {};
  const entries = [];
  if (parseFloat(incomeObj.monthly) > 0) {
    entries.push({ source: incomeObj.source || "primary", amount: parseFloat(incomeObj.monthly), frequency: "monthly" });
  }
  if (parseFloat(incomeObj.additionalMonthly) > 0) {
    entries.push({ source: "additional", amount: parseFloat(incomeObj.additionalMonthly), frequency: "monthly" });
  }
  return entries;
}

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
  if (result.error) {
    const [user, growth, budget] = await Promise.all([
      User.findById(userId),
      calculateInvestmentGrowth(userId),
      calculateBudgetHealth(userId),
    ]);

    const currentAge = user?.dob ? new Date().getFullYear() - new Date(user.dob).getFullYear() : 30;
    const retirementGoal = (user?.goals || []).find((g) =>
      g.category === "retirement" || /retire|retirement/i.test(g.name || "")
    );
    const targetYear = retirementGoal?.targetDate
      ? new Date(retirementGoal.targetDate).getFullYear()
      : null;
    const retirementAge = targetYear && targetYear > new Date().getFullYear()
      ? currentAge + (targetYear - new Date().getFullYear())
      : 60;
    const lifeExpectancy = 85;
    const expectedReturn = 10;
    const inflation = 6;
    const currentCorpus = growth?.totalValue || 0;
    const monthlyContribution = growth?.monthlySIP || Math.max(0, Math.round((budget?.monthlySavings || 0) * 0.5));
    const monthlyExpense = Math.max(0, Math.round((budget?.monthlyExpense || 0) * 0.75));
    const yearsToRetirement = Math.max(1, retirementAge - currentAge);
    const yearsInRetirement = Math.max(1, lifeExpectancy - retirementAge);

    const monthlyRate = expectedReturn / 100 / 12;
    const months = yearsToRetirement * 12;
    const fvCurrentCorpus = currentCorpus * Math.pow(1 + expectedReturn / 100, yearsToRetirement);
    const fvContributions = monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    const projectedCorpus = fvCurrentCorpus + fvContributions;
    const inflationAdjustedExpense = monthlyExpense * Math.pow(1 + inflation / 100, yearsToRetirement);
    const requiredCorpus = (inflationAdjustedExpense * 12 * yearsInRetirement) / (1 + expectedReturn / 100 - inflation / 100);
    const gap = requiredCorpus - projectedCorpus;
    const additionalSIPNeeded = gap > 0
      ? (gap * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1)
      : 0;

    return {
      currentAge,
      retirementAge,
      lifeExpectancy,
      projectedCorpus: Math.round(projectedCorpus),
      requiredCorpus: Math.round(requiredCorpus),
      gap: Math.round(gap),
      sufficient: gap <= 0,
      additionalSIPNeeded: Math.round(Math.max(0, additionalSIPNeeded)),
      estimated: true,
      assumptions: {
        expectedReturn,
        inflation,
        monthlyExpensePostRetirement: Math.round(inflationAdjustedExpense),
      },
    };
  }

  return {
    currentAge: result.currentAge,
    retirementAge: result.retirementAge,
    projectedCorpus: result.projectedCorpus,
    requiredCorpus: result.requiredCorpus,
    gap: result.corpusGap,
    sufficient: result.isSufficient,
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
  const result = await calculateAffordability(userId, amount, type);
  return {
    canAfford: result.canAfford,
    recommendation: result.recommendation,
    details: result,
  };
}

// ── Tool 11: Wealth Forecast ──────────────────────────────────────────────────
async function wealthForecast(userId, years = 10) {
  const [netWorth, growth, budget] = await Promise.all([
    calculateNetWorth(userId),
    calculateInvestmentGrowth(userId),
    calculateBudgetHealth(userId),
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
async function whatIfSimulator(userId, changes) {
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

  modified.savings = modified.income - modified.expense;
  modified.savingsRate = (modified.savings / modified.income) * 100;

  return {
    baseline,
    modified,
    impact: {
      savingsChange: modified.savings - baseline.savings,
      savingsRateChange: modified.savingsRate - baseline.savingsRate,
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
    extraPayment: Math.round(budget.monthlySavings * 0.5),
  };
}

// ── Tool 14: Investment Advisor ───────────────────────────────────────────────
async function investmentAdvisor(userId) {
  const [user, growth, risk] = await Promise.all([
    User.findById(userId),
    calculateInvestmentGrowth(userId),
    calculateRiskProfile(userId),
  ]);

  const age = user?.dob ? new Date().getFullYear() - new Date(user.dob).getFullYear() : 35;
  const { suggestAssetAllocation } = require("../../services/financialUtils");
  const ideal = suggestAssetAllocation(age, risk.riskCategory);

  return {
    current: {
      portfolio: growth.totalValue,
      returns: growth.returnPct,
      allocation: risk.allocation,
    },
    recommended: {
      allocation: ideal,
      reasoning: `Based on age ${age} and ${risk.riskCategory} risk profile`,
    },
    gaps: {
      equity: ideal.equity - risk.allocation.equity,
      debt: ideal.debt - risk.allocation.debt,
    },
  };
}

// ── Tool 15: Tax Planner ──────────────────────────────────────────────────────
async function taxPlanner(userId) {
  const [incomes, user, loans] = await Promise.all([
    getIncomeFromUser(userId),
    User.findById(userId),
    getLoansFromUser(userId),
  ]);
  const investments = (user?.investments || []).map((inv) => ({
    investmentType: inv.investmentType || inv.type || "other",
    investedAmount: parseFloat(inv.investedAmount) || 0,
  }));

  const annualIncome = incomes.reduce((s, i) => s + (i.frequency === "monthly" ? i.amount * 12 : i.amount), 0);
  const section80C = Math.min(investments.filter(i => ["ppf", "nps", "mutual_fund"].includes(i.investmentType)).reduce((s, i) => s + i.investedAmount, 0), 150000);
  const homeLoan = Math.min(loans.filter(l => l.loanType === "home").reduce((s, l) => s + (l.outstandingAmount * l.interestRatePct / 100), 0), 200000);

  return {
    annualIncome: Math.round(annualIncome),
    deductions: {
      section80C,
      remaining80C: Math.max(0, 150000 - section80C),
      homeLoanInterest: Math.round(homeLoan),
    },
    taxSaving: Math.round((section80C + homeLoan) * 0.3),
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
