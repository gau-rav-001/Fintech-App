// ── Financial Intelligence Engine ─────────────────────────────────────────────
// Core calculation services for financial metrics and insights

const FinancialProfile = require("../models/FinancialProfile");
const Income = require("../models/Income");
const Expense = require("../models/Expense");
const Loan = require("../models/Loan");
const Investment = require("../models/Investment");
const { SIP, Asset, Goal } = require("../models/FinancialEntities");
const { RetirementPlan } = require("../models/PlanningEntities");
const User = require("../models/User");

// ── Helper: Annualize frequency amounts ──────────────────────────────────────
function annualizeAmount(amount, frequency) {
  const multipliers = {
    daily: 365,
    weekly: 52,
    monthly: 12,
    quarterly: 4,
    annual: 1,
    one_time: 0,
  };
  return amount * (multipliers[frequency] || 0);
}

// ── Helper: Monthly conversion ────────────────────────────────────────────────
function toMonthly(amount, frequency) {
  return annualizeAmount(amount, frequency) / 12;
}

function normalizeInvestmentType(type = "") {
  const t = String(type).toLowerCase();
  const aliases = {
    stocks: "stock",
    mutual_fund: "mutual_fund",
    mutual_funds: "mutual_fund",
    bonds: "bond",
    fixed_deposit: "fd",
  };
  return aliases[t] || t || "other";
}

function investmentBucket(type) {
  const t = normalizeInvestmentType(type);
  if (["stock", "stocks", "mutual_fund", "crypto"].includes(t)) return "equity";
  if (["bond", "fd", "ppf", "nps"].includes(t)) return "debt";
  if (["gold", "real_estate"].includes(t)) return "alternative";
  return "other";
}

// ── Helper: Fetch cached FinancialProfile (safe — never throws) ───────────────
// ── Helper: Build a profile-shaped snapshot from the User record's JSON fields
// (income, expenses, investments, loans, goals — set via onboarding) ─────────
// This mirrors userController.getDashboardSummary's logic and is the REAL
// source of truth for most users. FinancialProfile table (separate normalized
// schema) is checked as a secondary fallback for any fields not derivable here.
async function getProfile(userId) {
  let userSnapshot = null;

  try {
    const user = await User.findById(userId);
    if (user) {
      const investments = user.investments || [];
      let totalInvested = 0;
      let totalInvestmentValue = 0;
      investments.forEach((inv) => {
        totalInvested += parseFloat(inv.investedAmount) || 0;
        totalInvestmentValue += parseFloat(inv.currentValue) || 0;
      });
      const investmentReturns = totalInvestmentValue - totalInvested;
      const investmentReturnPct = totalInvested > 0 ? (investmentReturns / totalInvested) * 100 : 0;

      const totalAssets = totalInvestmentValue;

      const loans = user.loans || [];
      let totalLiabilities = 0;
      let monthlyEmiAmount = 0;
      loans.forEach((l) => {
        totalLiabilities += parseFloat(l.outstandingAmount) || 0;
        monthlyEmiAmount += parseFloat(l.emi) || 0;
      });

      const netWorth = totalAssets - totalLiabilities;

      const incomeObj = user.income || {};
      const totalMonthlyIncome = (parseFloat(incomeObj.monthly) || 0) + (parseFloat(incomeObj.additionalMonthly) || 0);

      const expenses = user.expenses || [];
      const totalMonthlyExpense = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

      const monthlySavings = totalMonthlyIncome - totalMonthlyExpense - monthlyEmiAmount;
      const savingsRatePct = totalMonthlyIncome > 0 ? (monthlySavings / totalMonthlyIncome) * 100 : 0;

      let monthlySipAmount = investments
        .filter((inv) => inv.isSIP || inv.frequency === "monthly")
        .reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
      if (monthlySipAmount === 0) {
        monthlySipAmount = investments
          .filter((inv) => normalizeInvestmentType(inv.type || inv.investmentType) === "mutual_fund")
          .reduce((sum, inv) => {
            const duration = Math.max(1, parseFloat(inv.durationMonths) || 0);
            return sum + ((parseFloat(inv.investedAmount) || 0) / duration);
          }, 0);
      }

      userSnapshot = {
        totalAssets,
        totalLiabilities,
        netWorth,
        totalMonthlyIncome,
        totalMonthlyExpense,
        monthlySavings,
        savingsRatePct,
        totalInvested,
        totalInvestmentValue,
        investmentReturns,
        investmentReturnPct,
        monthlySipAmount,
        monthlyEmiAmount,
        emergencyFundTarget: totalMonthlyExpense * 6,
        emergencyFundCurrent: 0,
        userInvestments: investments,
        userGoals: user.goals || [],
        _source: "user_json",
      };
    }
  } catch (err) {
    if (process.env.DEBUG_AI === "true") console.error("[getProfile] User lookup failed:", err.message);
  }

  try {
    const fpProfile = await FinancialProfile.findByUserId(userId);
    if (fpProfile) {
      if (!userSnapshot) {
        userSnapshot = { ...fpProfile, _source: "financial_profiles" };
      } else {
        for (const key of Object.keys(fpProfile)) {
          if (["id", "userId", "createdAt", "updatedAt", "lastCalculatedAt", "_source"].includes(key)) continue;
          const fpVal = fpProfile[key];
          if ((userSnapshot[key] === 0 || userSnapshot[key] === undefined) && fpVal > 0) {
            userSnapshot[key] = fpVal;
          }
        }
      }
    }
  } catch (err) {
    if (process.env.DEBUG_AI === "true") console.error("[getProfile] FinancialProfile lookup failed:", err.message);
  }

  if (process.env.DEBUG_AI === "true") {
    console.log(`[getProfile] userId=${userId} → source=${userSnapshot?._source || "none"}`,
      userSnapshot ? {
        income: userSnapshot.totalMonthlyIncome,
        expense: userSnapshot.totalMonthlyExpense,
        savings: userSnapshot.monthlySavings,
        savingsRate: userSnapshot.savingsRatePct,
        netWorth: userSnapshot.netWorth,
        invested: userSnapshot.totalInvestmentValue,
      } : null);
  }

  return userSnapshot;
}

// ── Calculate Net Worth ───────────────────────────────────────────────────────
async function calculateNetWorth(userId) {
  const [investments, sips, assets, loans, profile] = await Promise.all([
    Investment.findByUserId(userId, { activeOnly: true }),
    SIP.findByUserId(userId, { status: "active" }),
    Asset.findByUserId(userId),
    Loan.findByUserId(userId, { status: "active" }),
    getProfile(userId),
  ]);

  // Assets
  const investmentValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  const sipValue = sips.reduce((sum, sip) => sum + sip.currentValue, 0);
  const assetValue = assets.reduce((sum, asset) => sum + asset.currentValue, 0);
  let totalAssets = investmentValue + sipValue + assetValue;

  // Liabilities
  let totalLiabilities = loans.reduce((sum, loan) => sum + loan.outstandingAmount, 0);

  // Fallback to cached profile snapshot if granular records are empty
  if (totalAssets === 0 && profile && profile.totalAssets > 0) {
    totalAssets = profile.totalAssets;
  }
  if (totalLiabilities === 0 && profile && profile.totalLiabilities > 0) {
    totalLiabilities = profile.totalLiabilities;
  }

  const netWorth =
    totalAssets === 0 && totalLiabilities === 0 && profile && profile.netWorth
      ? profile.netWorth
      : totalAssets - totalLiabilities;

  return {
    totalAssets,
    totalLiabilities,
    netWorth,
    breakdown: {
      investments: investmentValue,
      sips: sipValue,
      assets: assetValue,
      loans: totalLiabilities,
    },
  };
}

// ── Calculate Debt-to-Income Ratio ────────────────────────────────────────────
async function calculateDebtToIncomeRatio(userId) {
  const [incomes, loans, profile] = await Promise.all([
    Income.findByUserId(userId, { activeOnly: true }),
    Loan.findByUserId(userId, { status: "active" }),
    getProfile(userId),
  ]);

  let monthlyIncome = incomes.reduce((sum, inc) => sum + toMonthly(inc.amount, inc.frequency), 0);
  let monthlyDebt = loans.reduce((sum, loan) => sum + loan.emi, 0);

  // Fallback to cached profile snapshot if granular records are empty
  if (monthlyIncome === 0 && profile && profile.totalMonthlyIncome > 0) {
    monthlyIncome = profile.totalMonthlyIncome;
  }
  if (monthlyDebt === 0 && profile && profile.monthlyEmiAmount > 0) {
    monthlyDebt = profile.monthlyEmiAmount;
  }

  const ratio = monthlyIncome > 0 ? (monthlyDebt / monthlyIncome) * 100 : 0;

  return {
    monthlyIncome,
    monthlyDebt,
    ratio: parseFloat(ratio.toFixed(2)),
    status: ratio < 36 ? "healthy" : ratio < 50 ? "moderate" : "high_risk",
  };
}

// ── Calculate Emergency Fund ──────────────────────────────────────────────────
async function calculateEmergencyFund(userId, targetMonths = 6) {
  const [expenses, assets, profile] = await Promise.all([
    Expense.findByUserId(userId, { activeOnly: true }),
    Asset.findByUserId(userId),
    getProfile(userId),
  ]);

  let monthlyExpense = expenses.reduce((sum, exp) => sum + toMonthly(exp.amount, exp.frequency), 0);

  // Liquid assets only
  let liquidAssets = assets.filter((a) => a.isLiquid).reduce((sum, a) => sum + a.currentValue, 0);

  // Fallback to cached profile snapshot if granular records are empty
  if (monthlyExpense === 0 && profile && profile.totalMonthlyExpense > 0) {
    monthlyExpense = profile.totalMonthlyExpense;
  }
  if (liquidAssets === 0 && profile && profile.emergencyFundCurrent > 0) {
    liquidAssets = profile.emergencyFundCurrent;
  }

  let targetAmount = monthlyExpense * targetMonths;
  if (targetAmount === 0 && profile && profile.emergencyFundTarget > 0) {
    targetAmount = profile.emergencyFundTarget;
  }

  const coverageMonths = monthlyExpense > 0 ? liquidAssets / monthlyExpense : 0;
  const gap = Math.max(0, targetAmount - liquidAssets);

  return {
    monthlyExpense,
    targetMonths,
    targetAmount,
    currentAmount: liquidAssets,
    coverageMonths: parseFloat(coverageMonths.toFixed(1)),
    gap,
    isSufficient: liquidAssets >= targetAmount,
    status:
      coverageMonths >= targetMonths
        ? "excellent"
        : coverageMonths >= 3
        ? "adequate"
        : coverageMonths >= 1
        ? "low"
        : "critical",
  };
}

// ── Calculate Budget Health ───────────────────────────────────────────────────
async function calculateBudgetHealth(userId) {
  const [incomes, expenses, loans, profile] = await Promise.all([
    Income.findByUserId(userId, { activeOnly: true }),
    Expense.findByUserId(userId, { activeOnly: true }),
    Loan.findByUserId(userId, { status: "active" }),
    getProfile(userId),
  ]);

  let monthlyIncome = incomes.reduce((sum, inc) => sum + toMonthly(inc.amount, inc.frequency), 0);
  let monthlyExpense = expenses.reduce((sum, exp) => sum + toMonthly(exp.amount, exp.frequency), 0);
  let monthlyEMI = loans.reduce((sum, loan) => sum + loan.emi, 0);

  // Fallback to cached profile snapshot if granular records are empty
  const usingProfileFallback = monthlyIncome === 0 && profile && profile.totalMonthlyIncome > 0;
  if (monthlyIncome === 0 && profile && profile.totalMonthlyIncome > 0) {
    monthlyIncome = profile.totalMonthlyIncome;
  }
  if (monthlyExpense === 0 && profile && profile.totalMonthlyExpense > 0) {
    monthlyExpense = profile.totalMonthlyExpense;
  }
  if (monthlyEMI === 0 && profile && profile.monthlyEmiAmount > 0) {
    monthlyEMI = profile.monthlyEmiAmount;
  }

  const totalOutflow = monthlyExpense + monthlyEMI;
  let monthlySavings = monthlyIncome - totalOutflow;
  let savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

  if (usingProfileFallback && profile.monthlySavings) {
    monthlySavings = profile.monthlySavings;
  }
  if (usingProfileFallback && profile.savingsRatePct) {
    savingsRate = profile.savingsRatePct;
  }

  // Category breakdown (only available from granular expense records)
  const categoryBreakdown = expenses.reduce((acc, exp) => {
    const monthly = toMonthly(exp.amount, exp.frequency);
    acc[exp.category] = (acc[exp.category] || 0) + monthly;
    return acc;
  }, {});

  return {
    monthlyIncome,
    monthlyExpense,
    monthlyEMI,
    totalOutflow,
    monthlySavings,
    savingsRate: parseFloat(savingsRate.toFixed(2)),
    categoryBreakdown,
    status: savingsRate >= 20 ? "healthy" : savingsRate >= 10 ? "moderate" : "poor",
    recommendations:
      savingsRate < 20
        ? [`Increase savings rate to at least 20% (currently ${savingsRate.toFixed(1)}%)`]
        : [],
  };
}

// ── Calculate Goal Progress ───────────────────────────────────────────────────
async function calculateGoalProgress(userId) {
  const [dbGoals, profile] = await Promise.all([
    Goal.findByUserId(userId, { status: "active" }),
    getProfile(userId),
  ]);

  const goals = dbGoals.length > 0
    ? dbGoals
    : (profile?.userGoals || []).map((goal) => ({
        id: goal.id,
        name: goal.name,
        category: goal.category,
        targetAmount: parseFloat(goal.targetAmount) || 0,
        currentAmount: parseFloat(goal.currentSavings ?? goal.currentAmount) || 0,
        targetDate: goal.targetDate,
        monthlyContribution: parseFloat(goal.monthlyContribution) || 0,
      }));

  return goals.map((goal) => {
    const targetAmount = parseFloat(goal.targetAmount) || 0;
    const currentAmount = parseFloat(goal.currentAmount) || 0;
    const monthlyContribution = parseFloat(goal.monthlyContribution) || 0;
    const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
    const today = new Date();
    const target = new Date(goal.targetDate);
    const monthsRemaining = Math.max(0, (target - today) / (30 * 24 * 60 * 60 * 1000));
    const gap = Math.max(0, targetAmount - currentAmount);
    const monthlyNeeded = monthsRemaining > 0 ? gap / monthsRemaining : 0;

    // Projected completion with current contribution
    const projectedMonths =
      monthlyContribution > 0 ? gap / monthlyContribution : Infinity;

    return {
      id: goal.id,
      name: goal.name,
      category: goal.category,
      targetAmount,
      currentAmount,
      progress: parseFloat(progress.toFixed(2)),
      gap,
      targetDate: goal.targetDate,
      monthsRemaining: parseFloat(monthsRemaining.toFixed(1)),
      monthlyNeeded: parseFloat(monthlyNeeded.toFixed(2)),
      currentContribution: monthlyContribution,
      projectedMonths: projectedMonths === Infinity ? null : parseFloat(projectedMonths.toFixed(1)),
      onTrack: monthlyContribution >= monthlyNeeded,
      status:
        progress >= 100
          ? "achieved"
          : monthlyContribution >= monthlyNeeded
          ? "on_track"
          : "behind",
    };
  });
}

// ── Calculate Investment Growth ───────────────────────────────────────────────
async function calculateInvestmentGrowth(userId) {
  const [investments, sips, profile] = await Promise.all([
    Investment.findByUserId(userId, { activeOnly: true }),
    SIP.findByUserId(userId, { status: "active" }),
    getProfile(userId),
  ]);

  let totalInvested =
    investments.reduce((sum, inv) => sum + inv.investedAmount, 0) +
    sips.reduce((sum, sip) => sum + sip.totalInvested, 0);

  let totalValue =
    investments.reduce((sum, inv) => sum + inv.currentValue, 0) +
    sips.reduce((sum, sip) => sum + sip.currentValue, 0);

  // Fallback to cached profile snapshot if granular records are empty
  if (totalInvested === 0 && profile && profile.totalInvested > 0) {
    totalInvested = profile.totalInvested;
  }
  if (totalValue === 0 && profile && profile.totalInvestmentValue > 0) {
    totalValue = profile.totalInvestmentValue;
  }

  const totalReturns = totalValue - totalInvested;
  const returnPct = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

  // By type (only available from granular investment records)
  const byTypeSource = investments.length > 0
    ? investments
    : (profile?.userInvestments || []).map((inv) => ({
        investmentType: normalizeInvestmentType(inv.investmentType || inv.type),
        investedAmount: parseFloat(inv.investedAmount) || 0,
        currentValue: parseFloat(inv.currentValue) || 0,
        returns: (parseFloat(inv.currentValue) || 0) - (parseFloat(inv.investedAmount) || 0),
      }));

  const byType = byTypeSource.reduce((acc, inv) => {
    const type = normalizeInvestmentType(inv.investmentType || inv.type);
    if (!acc[type]) {
      acc[type] = {
        invested: 0,
        value: 0,
        returns: 0,
        count: 0,
      };
    }
    acc[type].invested += inv.investedAmount;
    acc[type].value += inv.currentValue;
    acc[type].returns += inv.returns;
    acc[type].count++;
    return acc;
  }, {});

  // Add SIP allocation
  let sipAllocation = sips.reduce((sum, sip) => sum + sip.amount, 0);
  if (sipAllocation === 0 && profile && profile.monthlySipAmount > 0) {
    sipAllocation = profile.monthlySipAmount;
  }

  return {
    totalInvested,
    totalValue,
    totalReturns,
    returnPct: parseFloat(returnPct.toFixed(2)),
    monthlySIP: sipAllocation,
    byType,
    diversificationScore: Object.keys(byType).length >= 3 ? "good" : "low",
  };
}

// ── Calculate Retirement Corpus ───────────────────────────────────────────────
async function calculateRetirementCorpus(userId, params = {}) {
  const plan = await RetirementPlan.findByUserId(userId);

  if (!plan) {
    return { error: "No retirement plan found. Create one first." };
  }

  const currentAge = params.currentAge || plan.currentAge;
  const retirementAge = params.retirementAge || plan.retirementAge;
  const lifeExpectancy = params.lifeExpectancy || plan.lifeExpectancy;
  const currentCorpus = params.currentCorpus || plan.currentCorpus;
  const monthlyContribution = params.monthlyContribution || plan.monthlyContribution;
  const expectedReturn = params.expectedReturnPct || plan.expectedReturnPct;
  const inflation = params.inflationPct || plan.inflationPct;
  const monthlyExpense = params.monthlyExpensePostRetirement || plan.monthlyExpensePostRetirement;

  const yearsToRetirement = retirementAge - currentAge;
  const yearsInRetirement = lifeExpectancy - retirementAge;

  if (yearsToRetirement <= 0) {
    return { error: "Already at or past retirement age" };
  }

  // Future value of current corpus
  const fvCurrentCorpus =
    currentCorpus * Math.pow(1 + expectedReturn / 100, yearsToRetirement);

  // Future value of monthly contributions (annuity)
  const monthlyRate = expectedReturn / 100 / 12;
  const months = yearsToRetirement * 12;
  const fvContributions =
    monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

  const projectedCorpus = fvCurrentCorpus + fvContributions;

  // Required corpus (considering inflation)
  const inflationAdjustedExpense =
    monthlyExpense * Math.pow(1 + inflation / 100, yearsToRetirement);
  const requiredCorpus = (inflationAdjustedExpense * 12 * yearsInRetirement) / (1 + expectedReturn / 100 - inflation / 100);

  const corpusGap = requiredCorpus - projectedCorpus;

  // Additional monthly SIP needed to close gap
  const additionalSIPNeeded =
    corpusGap > 0 && months > 0
      ? (corpusGap * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1)
      : 0;

  return {
    currentAge,
    retirementAge,
    lifeExpectancy,
    yearsToRetirement,
    yearsInRetirement,
    currentCorpus,
    monthlyContribution,
    projectedCorpus: parseFloat(projectedCorpus.toFixed(2)),
    requiredCorpus: parseFloat(requiredCorpus.toFixed(2)),
    corpusGap: parseFloat(corpusGap.toFixed(2)),
    isSufficient: corpusGap <= 0,
    additionalSIPNeeded: parseFloat(Math.max(0, additionalSIPNeeded).toFixed(2)),
    assumptions: {
      expectedReturn,
      inflation,
      monthlyExpensePostRetirement: inflationAdjustedExpense,
    },
  };
}

// ── Calculate Risk Profile ────────────────────────────────────────────────────
async function calculateRiskProfile(userId) {
  const [investments, netWorthData, debtData, emergencyData, profile] = await Promise.all([
    Investment.findByUserId(userId, { activeOnly: true }),
    calculateNetWorth(userId),
    calculateDebtToIncomeRatio(userId),
    calculateEmergencyFund(userId),
    getProfile(userId),
  ]);

  const investmentSource = investments.length > 0
    ? investments
    : (profile?.userInvestments || []).map((inv) => ({
        investmentType: normalizeInvestmentType(inv.investmentType || inv.type),
        currentValue: parseFloat(inv.currentValue) || 0,
      }));

  // Asset allocation
  const allocation = investmentSource.reduce(
    (acc, inv) => {
      const bucket = investmentBucket(inv.investmentType || inv.type);
      if (bucket === "equity") {
        acc.equity += inv.currentValue;
      } else if (bucket === "debt") {
        acc.debt += inv.currentValue;
      } else if (bucket === "alternative") {
        acc.alternative += inv.currentValue;
      }
      return acc;
    },
    { equity: 0, debt: 0, alternative: 0 }
  );

  const totalInvestment = allocation.equity + allocation.debt + allocation.alternative;

  const equityPct = totalInvestment > 0 ? (allocation.equity / totalInvestment) * 100 : 0;
  const debtPct = totalInvestment > 0 ? (allocation.debt / totalInvestment) * 100 : 0;
  const alternativePct = totalInvestment > 0 ? (allocation.alternative / totalInvestment) * 100 : 0;

  // Risk score (0-100)
  let riskScore = 0;

  // 1. Equity allocation (max 40 points)
  riskScore += Math.min(equityPct, 40);

  // 2. Debt ratio (max 30 points) — inverse scoring
  riskScore += Math.max(0, 30 - debtData.ratio);

  // 3. Emergency fund (max 20 points)
  riskScore += Math.min(emergencyData.coverageMonths * 3.33, 20);

  // 4. Diversification (max 10 points)
  const assetTypes = new Set(investmentSource.map((i) => normalizeInvestmentType(i.investmentType || i.type))).size;
  riskScore += Math.min(assetTypes * 2, 10);

  riskScore = Math.min(100, Math.max(0, riskScore));

  return {
    riskScore: parseFloat(riskScore.toFixed(2)),
    riskCategory:
      riskScore >= 70 ? "aggressive" : riskScore >= 40 ? "moderate" : "conservative",
    allocation: {
      equity: parseFloat(equityPct.toFixed(2)),
      debt: parseFloat(debtPct.toFixed(2)),
      alternative: parseFloat(alternativePct.toFixed(2)),
    },
    factors: {
      debtRatio: debtData.ratio,
      emergencyCoverage: emergencyData.coverageMonths,
      diversification: assetTypes,
    },
  };
}

// ── Calculate Affordability ───────────────────────────────────────────────────
async function calculateAffordability(userId, purchaseAmount, purchaseType = "one_time") {
  const [budgetData, netWorthData, debtData, emergencyData] = await Promise.all([
    calculateBudgetHealth(userId),
    calculateNetWorth(userId),
    calculateDebtToIncomeRatio(userId),
    calculateEmergencyFund(userId),
  ]);

  const liquidAssets = emergencyData.currentAmount;

  // One-time purchase affordability
  if (purchaseType === "one_time") {
    const canAfford = liquidAssets >= purchaseAmount;
    const percentOfLiquid = liquidAssets > 0 ? (purchaseAmount / liquidAssets) * 100 : 0;

    // Check emergency fund impact
    const remainingLiquid = liquidAssets - purchaseAmount;
    const monthsCovered =
      budgetData.monthlyExpense > 0 ? remainingLiquid / budgetData.monthlyExpense : 0;

    return {
      purchaseAmount,
      purchaseType,
      canAfford,
      liquidAssets,
      percentOfLiquid: parseFloat(percentOfLiquid.toFixed(2)),
      remainingLiquid,
      emergencyFundImpact: {
        current: emergencyData.coverageMonths,
        after: parseFloat(monthsCovered.toFixed(1)),
        acceptable: monthsCovered >= 3,
      },
      recommendation: canAfford
        ? monthsCovered >= 3
          ? "Affordable without compromising emergency fund"
          : "Affordable but will reduce emergency fund below 3 months"
        : "Not affordable with current liquid assets",
    };
  }

  // EMI-based affordability
  if (purchaseType === "emi") {
    const availableForEMI = budgetData.monthlySavings * 0.5; // Max 50% of savings
    const canAffordEMI = purchaseAmount <= availableForEMI;

    const newDebtRatio =
      budgetData.monthlyIncome > 0
        ? ((budgetData.monthlyEMI + purchaseAmount) / budgetData.monthlyIncome) * 100
        : 0;

    return {
      purchaseAmount,
      purchaseType,
      canAfford: canAffordEMI && newDebtRatio < 50,
      monthlyEMI: purchaseAmount,
      availableForEMI,
      currentDebtRatio: debtData.ratio,
      newDebtRatio: parseFloat(newDebtRatio.toFixed(2)),
      acceptable: newDebtRatio < 50,
      recommendation: canAffordEMI
        ? newDebtRatio < 36
          ? "Affordable and safe debt level"
          : newDebtRatio < 50
          ? "Affordable but increases debt burden"
          : "Will exceed safe debt-to-income ratio (50%)"
        : "Monthly EMI exceeds 50% of your current savings",
    };
  }

  return { error: "Invalid purchase type. Use 'one_time' or 'emi'." };
}

// ── Calculate Financial Health Score ──────────────────────────────────────────
async function calculateFinancialHealthScore(userId) {
  const [netWorthData, budgetData, debtData, emergencyData, investmentData, goalData] =
    await Promise.all([
      calculateNetWorth(userId),
      calculateBudgetHealth(userId),
      calculateDebtToIncomeRatio(userId),
      calculateEmergencyFund(userId),
      calculateInvestmentGrowth(userId),
      calculateGoalProgress(userId),
    ]);

  // Component scores (0-100 each)
  const scores = {
    netWorth: Math.min(100, (netWorthData.netWorth / 10000000) * 100), // 1Cr = 100
    savingsRate: Math.min(100, budgetData.savingsRate * 3.33), // 30% = 100
    debt: Math.max(0, 100 - debtData.ratio * 2), // 0% = 100, 50% = 0
    investment: Math.min(100, (investmentData.totalValue / 5000000) * 100), // 50L = 100
    emergencyFund: Math.min(100, emergencyData.coverageMonths * 16.67), // 6mo = 100
    insurance: 50, // Placeholder (needs insurance data)
    goalProgress:
      goalData.length > 0
        ? goalData.reduce((sum, g) => sum + Math.min(100, g.progress), 0) / goalData.length
        : 50,
  };

  // Overall score (weighted average)
  const overallScore =
    scores.netWorth * 0.25 +
    scores.savingsRate * 0.2 +
    scores.debt * 0.2 +
    scores.investment * 0.15 +
    scores.emergencyFund * 0.1 +
    scores.insurance * 0.05 +
    scores.goalProgress * 0.05;

  // Strengths and weaknesses
  const strengths = [];
  const weaknesses = [];
  const recommendations = [];

  if (scores.netWorth >= 60) strengths.push("Strong net worth");
  else {
    weaknesses.push("Low net worth");
    recommendations.push("Focus on increasing assets and reducing debt");
  }

  if (scores.savingsRate >= 60) strengths.push("Good savings rate");
  else {
    weaknesses.push("Low savings rate");
    recommendations.push("Aim to save at least 20% of income");
  }

  if (scores.debt >= 70) strengths.push("Healthy debt levels");
  else {
    weaknesses.push("High debt burden");
    recommendations.push("Reduce high-interest debt first");
  }

  if (scores.emergencyFund >= 60) strengths.push("Adequate emergency fund");
  else {
    weaknesses.push("Insufficient emergency fund");
    recommendations.push("Build emergency fund covering 6 months expenses");
  }

  if (scores.investment >= 50) strengths.push("Good investment portfolio");
  else {
    weaknesses.push("Low investment value");
    recommendations.push("Increase monthly SIP contributions");
  }

  return {
    overallScore: parseFloat(overallScore.toFixed(2)),
    scores: {
      netWorthScore: parseFloat(scores.netWorth.toFixed(2)),
      savingsRateScore: parseFloat(scores.savingsRate.toFixed(2)),
      debtScore: parseFloat(scores.debt.toFixed(2)),
      investmentScore: parseFloat(scores.investment.toFixed(2)),
      emergencyFundScore: parseFloat(scores.emergencyFund.toFixed(2)),
      insuranceScore: parseFloat(scores.insurance.toFixed(2)),
      goalProgressScore: parseFloat(scores.goalProgress.toFixed(2)),
    },
    strengths,
    weaknesses,
    recommendations,
    grade:
      overallScore >= 80
        ? "A"
        : overallScore >= 60
        ? "B"
        : overallScore >= 40
        ? "C"
        : "D",
  };
}

module.exports = {
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
  // Export helpers for testing
  _helpers: { annualizeAmount, toMonthly },
};
