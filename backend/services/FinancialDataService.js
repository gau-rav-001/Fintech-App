// ── FinancialDataService ──────────────────────────────────────────────────────
// Centralized read abstraction for SmartFinance financial data.
//
// Strategy: NORMALIZED-FIRST + LEGACY-FALLTHROUGH (per entity type)
//   - When USE_NORMALIZED_READS=true:  query normalized table first;
//     if rows > 0 return them, otherwise derive from legacy users JSONB.
//   - When USE_NORMALIZED_READS=false (default): always read from legacy.
//
// This service contains NO authentication or authorization logic.
// It receives an already-verified userId from the controller/caller.
//
// DB errors are NEVER silently converted to empty arrays.
// Only genuinely empty query results produce [] or null.

const User = require("../models/User");
const Income = require("../models/Income");
const Expense = require("../models/Expense");
const Loan = require("../models/Loan");
const Investment = require("../models/Investment");
const { SIP, Asset, Goal } = require("../models/FinancialEntities");
const { RetirementPlan, FinancialHealthScore, Alert } = require("../models/PlanningEntities");
const FinancialProfile = require("../models/FinancialProfile");

// ── Feature flag ──────────────────────────────────────────────────────────────
function useNormalizedReads() {
  const flag = process.env.USE_NORMALIZED_READS;
  return flag === "true" || flag === "1";
}

// ── Legacy derivation helpers ─────────────────────────────────────────────────
// These transform users-table JSONB / flat columns into the canonical camelCase
// shapes that match the normalized model format() outputs.
// They NEVER throw on malformed data — they log a warning and return [].

function deriveLegacyIncome(user) {
  if (!user) return [];
  try {
    const incomeObj = user.income || {};
    const entries = [];
    const monthly = parseFloat(incomeObj.monthly) || 0;
    if (monthly > 0) {
      entries.push({
        id: null,
        userId: user.id,
        source: incomeObj.source || "primary",
        amount: monthly,
        frequency: "monthly",
        startDate: null,
        endDate: null,
        isActive: true,
        category: "primary",
      });
    }
    const additional = parseFloat(incomeObj.additionalMonthly) || 0;
    if (additional > 0) {
      entries.push({
        id: null,
        userId: user.id,
        source: "additional",
        amount: additional,
        frequency: "monthly",
        startDate: null,
        endDate: null,
        isActive: true,
        category: "additional",
      });
    }
    return entries;
  } catch (err) {
    console.warn("[FinancialDataService] Malformed legacy income data:", err.message);
    return [];
  }
}

function deriveLegacyExpenses(user) {
  if (!user) return [];
  try {
    const expenses = user.expenses;
    if (!Array.isArray(expenses)) return [];
    return expenses
      .filter((e) => e && typeof e === "object")
      .map((e, i) => ({
        id: e.id || null,
        userId: user.id,
        category: e.category || "General",
        amount: parseFloat(e.amount) || 0,
        frequency: e.frequency || "monthly",
        startDate: null,
        endDate: null,
        isActive: e.isRecurring !== false,
      }));
  } catch (err) {
    console.warn("[FinancialDataService] Malformed legacy expenses data:", err.message);
    return [];
  }
}

function deriveLegacyInvestments(user) {
  if (!user) return [];
  try {
    const investments = user.investments;
    if (!Array.isArray(investments)) return [];
    return investments
      .filter((inv) => inv && typeof inv === "object")
      .map((inv, i) => ({
        id: inv.id || null,
        userId: user.id,
        investmentType: inv.type || inv.investmentType || "other",
        name: inv.name || "",
        investedAmount: parseFloat(inv.investedAmount) || 0,
        currentValue: parseFloat(
          inv.currentValue !== undefined && inv.currentValue !== null
            ? inv.currentValue
            : inv.investedAmount
        ) || 0,
        returns:
          (parseFloat(inv.currentValue || inv.investedAmount) || 0) -
          (parseFloat(inv.investedAmount) || 0),
        returnPct: parseFloat(inv.returnPct) || 0,
        purchaseDate: inv.purchaseDate || null, // DO NOT fabricate
        maturityDate: inv.maturityDate || null,
        quantity: parseFloat(inv.quantity) || 0,
        averagePrice: parseFloat(inv.averagePrice) || 0,
        platform: inv.platform || "",
        isActive: true,
        type: inv.type || inv.investmentType || "other", // Legacy alias
      }));
  } catch (err) {
    console.warn("[FinancialDataService] Malformed legacy investments data:", err.message);
    return [];
  }
}

function deriveLegacyLoans(user) {
  if (!user) return [];
  try {
    const loans = user.loans;
    if (!Array.isArray(loans)) return [];
    return loans
      .filter((l) => l && typeof l === "object")
      .map((l, i) => ({
        id: l.id || null,
        userId: user.id,
        loanType: l.loanType || l.type || "other",
        lender: l.lender || "",
        principalAmount: parseFloat(l.principalAmount) || 0,
        outstandingAmount: parseFloat(l.outstandingAmount) || 0,
        interestRatePct: parseFloat(l.interestRatePct ?? l.interestRate) || 0,
        emi: parseFloat(l.emi) || 0,
        tenureMonths: parseInt(l.tenureMonths, 10) || 0,
        remainingMonths: parseInt(l.remainingMonths, 10) || 0,
        startDate: l.startDate || null, // DO NOT fabricate
        endDate: l.endDate || null,
        status: l.status || "active",
        type: l.loanType || l.type || "other", // Legacy alias
      }));
  } catch (err) {
    console.warn("[FinancialDataService] Malformed legacy loans data:", err.message);
    return [];
  }
}

function deriveLegacyGoals(user) {
  if (!user) return [];
  try {
    const goals = user.goals;
    if (!Array.isArray(goals)) return [];
    return goals
      .filter((g) => g && typeof g === "object")
      .map((g, i) => ({
        id: g.id || null,
        userId: user.id,
        name: g.name || "",
        category: g.category || "General",
        targetAmount: parseFloat(g.targetAmount) || 0,
        currentAmount: parseFloat(g.currentSavings ?? g.currentAmount) || 0,
        currentSavings: parseFloat(g.currentSavings ?? g.currentAmount) || 0, // Legacy alias
        targetDate: g.targetDate || null, // DO NOT fabricate
        priority: g.priority || "medium",
        status: g.status || "active",
        monthlyContribution: parseFloat(g.monthlyContribution) || 0,
        expectedReturnPct: parseFloat(g.expectedReturnPct) || 8,
      }));
  } catch (err) {
    console.warn("[FinancialDataService] Malformed legacy goals data:", err.message);
    return [];
  }
}

// ── Service Methods ───────────────────────────────────────────────────────────
// Every method:
//   - Accepts an already-authorized userId
//   - Throws on DB failures (never returns [] for infrastructure errors)
//   - Returns [] for genuinely empty data
//   - Returns camelCase objects

/**
 * @param {string|number} userId - Already-authorized user ID
 * @returns {Promise<Array>} Income records (camelCase)
 */
async function getIncome(userId) {
  if (useNormalizedReads()) {
    const normalized = await Income.findByUserId(userId, { activeOnly: true });
    if (normalized.length > 0) return normalized;
  }
  // Legacy fallthrough
  const user = await User.findById(userId);
  return deriveLegacyIncome(user);
}

/**
 * @param {string|number} userId
 * @returns {Promise<Array>} Expense records (camelCase)
 */
async function getExpenses(userId) {
  if (useNormalizedReads()) {
    const normalized = await Expense.findByUserId(userId, { activeOnly: true });
    if (normalized.length > 0) return normalized;
  }
  const user = await User.findById(userId);
  return deriveLegacyExpenses(user);
}

/**
 * @param {string|number} userId
 * @returns {Promise<Array>} Investment records (camelCase)
 */
async function getInvestments(userId) {
  if (useNormalizedReads()) {
    const normalized = await Investment.findByUserId(userId, { activeOnly: true });
    if (normalized.length > 0) {
      return normalized.map((inv) => ({ ...inv, type: inv.investmentType }));
    }
  }
  const user = await User.findById(userId);
  return deriveLegacyInvestments(user);
}

/**
 * @param {string|number} userId
 * @returns {Promise<Array>} Loan records (camelCase)
 */
async function getLoans(userId) {
  if (useNormalizedReads()) {
    const normalized = await Loan.findByUserId(userId, { status: "active" });
    if (normalized.length > 0) {
      return normalized.map((l) => ({ ...l, type: l.loanType }));
    }
  }
  const user = await User.findById(userId);
  return deriveLegacyLoans(user);
}

/**
 * @param {string|number} userId
 * @returns {Promise<Array>} Goal records (camelCase)
 */
async function getGoals(userId) {
  if (useNormalizedReads()) {
    const normalized = await Goal.findByUserId(userId);
    const validStatuses = ["planning", "active", "on_track"];
    const activeNormalized = normalized.filter((g) => validStatuses.includes(g.status));
    if (activeNormalized.length > 0) {
      return activeNormalized.map((g) => ({ ...g, currentSavings: g.currentAmount }));
    }
  }
  const user = await User.findById(userId);
  return deriveLegacyGoals(user);
}

/**
 * SIPs have no legacy equivalent.
 * @param {string|number} userId
 * @returns {Promise<Array>}
 */
async function getSips(userId) {
  return SIP.findByUserId(userId, { status: "active" });
}

/**
 * Assets have no legacy equivalent.
 * @param {string|number} userId
 * @returns {Promise<Array>}
 */
async function getAssets(userId) {
  return Asset.findByUserId(userId);
}

/**
 * @param {string|number} userId
 * @returns {Promise<Object|null>} RetirementPlan or null
 */
async function getRetirementPlans(userId) {
  return RetirementPlan.findByUserId(userId);
}

/**
 * Returns the financial profile, enriched from legacy data when applicable.
 * Preserves the existing dual-source behavior from financialIntelligence.getProfile().
 * @param {string|number} userId
 * @returns {Promise<Object|null>}
 */
async function getFinancialProfile(userId) {
  if (useNormalizedReads()) {
    // Check normalized financial_profiles first
    const fpProfile = await FinancialProfile.findByUserId(userId);
    if (fpProfile) return fpProfile;
  }

  // No normalized profile — derive summary from legacy user data
  const user = await User.findById(userId);
  if (!user) return null;

  const investments = user.investments || [];
  let totalInvested = 0;
  let totalInvestmentValue = 0;
  investments.forEach((inv) => {
    totalInvested += parseFloat(inv.investedAmount) || 0;
    totalInvestmentValue += parseFloat(inv.currentValue) || 0;
  });

  const totalAssets = totalInvestmentValue;

  const loans = user.loans || [];
  let totalLiabilities = 0;
  let monthlyEmiAmount = 0;
  loans.forEach((l) => {
    totalLiabilities += parseFloat(l.outstandingAmount) || 0;
    monthlyEmiAmount += parseFloat(l.emi) || 0;
  });

  const incomeObj = user.income || {};
  const totalMonthlyIncome =
    (parseFloat(incomeObj.monthly) || 0) +
    (parseFloat(incomeObj.additionalMonthly) || 0);

  const expenses = user.expenses || [];
  const totalMonthlyExpense = expenses.reduce(
    (sum, e) => sum + (parseFloat(e.amount) || 0),
    0
  );

  const monthlySavings = totalMonthlyIncome - totalMonthlyExpense - monthlyEmiAmount;
  const savingsRatePct =
    totalMonthlyIncome > 0 ? (monthlySavings / totalMonthlyIncome) * 100 : 0;

  return {
    id: null,
    userId: user.id,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    totalMonthlyIncome,
    totalMonthlyExpense,
    monthlySavings,
    savingsRatePct,
    totalInvested,
    totalInvestmentValue,
    investmentReturns: totalInvestmentValue - totalInvested,
    investmentReturnPct: totalInvested > 0
      ? ((totalInvestmentValue - totalInvested) / totalInvested) * 100
      : 0,
    monthlySipAmount: 0,
    monthlyEmiAmount,
    emergencyFundTarget: totalMonthlyExpense * 6,
    emergencyFundCurrent: 0,
    _source: "legacy_derived",
  };
}

/**
 * @param {string|number} userId
 * @returns {Promise<Object|null>} Latest FinancialHealthScore or null
 */
async function getFinancialHealth(userId) {
  return FinancialHealthScore.findLatestByUserId(userId);
}

/**
 * @param {string|number} userId
 * @returns {Promise<Array>} Alerts for the user
 */
async function getAlerts(userId) {
  return Alert.findByUserId(userId);
}

/**
 * Complete financial snapshot — all entity types batched via Promise.all().
 * If ANY underlying DB call fails, the entire snapshot fails (no partial data).
 * @param {string|number} userId
 * @returns {Promise<Object>} { income, expenses, investments, loans, goals, sips, assets, profile }
 */
async function getFinancialSnapshot(userId) {
  const [income, expenses, investments, loans, goals, sips, assets, profile] =
    await Promise.all([
      getIncome(userId),
      getExpenses(userId),
      getInvestments(userId),
      getLoans(userId),
      getGoals(userId),
      getSips(userId),
      getAssets(userId),
      getFinancialProfile(userId),
    ]);

  return { income, expenses, investments, loans, goals, sips, assets, profile };
}

module.exports = {
  getIncome,
  getExpenses,
  getInvestments,
  getLoans,
  getGoals,
  getSips,
  getAssets,
  getRetirementPlans,
  getFinancialProfile,
  getFinancialHealth,
  getAlerts,
  getFinancialSnapshot,
  // Export for testing only
  _internals: {
    useNormalizedReads,
    deriveLegacyIncome,
    deriveLegacyExpenses,
    deriveLegacyInvestments,
    deriveLegacyLoans,
    deriveLegacyGoals,
  },
};
