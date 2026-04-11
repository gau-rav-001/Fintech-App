// backend/controllers/userController.js
const User       = require("../models/User");
const { ok, fail } = require("../utils/response");

// ── POST /api/user/onboarding ─────────────────────────────────────────────────
const onboarding = async (req, res) => {
  try {
    const {
      dob, gender, occupation, maritalStatus, dependents,
      city, state, country,
      income, riskProfile,
      expenses, investments, goals, loans,
      mobile, profilePicture,
    } = req.body;

    const updates = {
      isProfileComplete: true,
      onboardedAt:       new Date(),
    };

    if (dob)            updates.dob           = dob;
    if (gender)         updates.gender        = gender;
    if (occupation)     updates.occupation    = occupation;
    if (maritalStatus)  updates.maritalStatus = maritalStatus;
    if (dependents !== undefined) updates.dependents = Number(dependents);
    if (city)           updates.city          = city;
    if (state)          updates.state         = state;
    if (country)        updates.country       = country;
    if (mobile)         updates.mobile        = mobile;
    if (profilePicture) updates.profilePicture = profilePicture;

    if (income) {
      if (income.monthly           !== undefined) updates.incomeMonthly    = Number(income.monthly);
      if (income.source)                           updates.incomeSource     = income.source;
      if (income.additionalMonthly !== undefined)  updates.incomeAdditional = Number(income.additionalMonthly);
      if (income.annualGrowthPct   !== undefined)  updates.incomeGrowthPct  = Number(income.annualGrowthPct);
    }

    if (riskProfile) {
      if (riskProfile.tolerance)        updates.riskTolerance    = riskProfile.tolerance;
      if (riskProfile.experience)       updates.riskExperience   = riskProfile.experience;
      if (riskProfile.timeHorizonYears) updates.riskHorizonYears = Number(riskProfile.timeHorizonYears);
      if (riskProfile.investmentStyle)  updates.riskStyle        = riskProfile.investmentStyle;
    }

    if (Array.isArray(expenses))    updates.expenses    = expenses;
    if (Array.isArray(investments)) updates.investments = investments;
    if (Array.isArray(goals))       updates.goals       = goals;
    if (Array.isArray(loans))       updates.loans       = loans;

    const user = await User.update(req.user.id, updates);
    if (!user) return fail(res, "User not found.", 404);

    return ok(res, { user }, "Profile completed successfully.");
  } catch (err) {
    console.error("onboarding:", err);
    // ✅ FIX: surface DB ENUM validation errors as 400 instead of 500
    if (err.code === "22P02" || err.message?.includes("invalid input value for enum")) {
      return fail(res, "One or more values are invalid. Check gender, marital status, or risk profile.", 400);
    }
    return fail(res, "Failed to save profile.", 500);
  }
};

// ── GET /api/user/profile ─────────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return fail(res, "User not found.", 404);
    return ok(res, { user });
  } catch (err) {
    console.error("getProfile:", err);
    return fail(res, "Failed to fetch profile.", 500);
  }
};

// ── PUT /api/user/update ──────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const forbidden = ["password", "passwordHash", "email", "googleId", "role", "isEmailVerified"];
    forbidden.forEach(f => delete req.body[f]);

    const { income, riskProfile, location, ...rest } = req.body;
    const updates = { ...rest };

    if (location) {
      if (location.city)    updates.city    = location.city;
      if (location.state)   updates.state   = location.state;
      if (location.country) updates.country = location.country;
    }
    if (income) {
      if (income.monthly           !== undefined) updates.incomeMonthly    = Number(income.monthly);
      if (income.source)                           updates.incomeSource     = income.source;
      if (income.additionalMonthly !== undefined)  updates.incomeAdditional = Number(income.additionalMonthly);
      if (income.annualGrowthPct   !== undefined)  updates.incomeGrowthPct  = Number(income.annualGrowthPct);
    }
    if (riskProfile) {
      if (riskProfile.tolerance)        updates.riskTolerance    = riskProfile.tolerance;
      if (riskProfile.experience)       updates.riskExperience   = riskProfile.experience;
      if (riskProfile.timeHorizonYears) updates.riskHorizonYears = Number(riskProfile.timeHorizonYears);
      if (riskProfile.investmentStyle)  updates.riskStyle        = riskProfile.investmentStyle;
    }

    const user = await User.update(req.user.id, updates);
    if (!user) return fail(res, "User not found.", 404);
    return ok(res, { user }, "Profile updated.");
  } catch (err) {
    console.error("updateProfile:", err);
    if (err.code === "22P02" || err.message?.includes("invalid input value for enum")) {
      return fail(res, "One or more values are invalid.", 400);
    }
    return fail(res, "Failed to update profile.", 500);
  }
};

// ── POST /api/user/change-password ────────────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const userWithPw = await User.findByEmailWithPassword(req.user.email);
    if (!userWithPw) return fail(res, "User not found.", 404);
    if (userWithPw.provider === "google" && !userWithPw.passwordHash)
      return fail(res, "Google accounts cannot change password here.", 400);

    const match = await User.comparePassword(userWithPw.passwordHash, currentPassword);
    if (!match) return fail(res, "Current password is incorrect.", 401);

    await User.updatePassword(req.user.id, newPassword);
    return ok(res, {}, "Password changed successfully.");
  } catch (err) {
    console.error("changePassword:", err);
    return fail(res, "Failed to change password.", 500);
  }
};

// ── GET /api/user/dashboard/summary ──────────────────────────────────────────
const getDashboardSummary = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return fail(res, "User not found.", 404);

    // ── Investment calculations ───────────────────────────────────────────────
    const investments = user.investments || [];
    let totalInvested = 0, totalCurrentValue = 0;
    const investmentsByType = {};

    investments.forEach(inv => {
      const invested = parseFloat(inv.investedAmount) || 0;
      const current  = parseFloat(inv.currentValue)   || 0;
      totalInvested     += invested;
      totalCurrentValue += current;
      investmentsByType[inv.type] = (investmentsByType[inv.type] || 0) + current;
    });

    const totalReturns = totalCurrentValue - totalInvested;
    const returnPct    = totalInvested > 0
      ? parseFloat(((totalReturns / totalInvested) * 100).toFixed(2))
      : 0;

    // ── Loan calculations ─────────────────────────────────────────────────────
    const loans = user.loans || [];
    let totalLiabilities = 0, totalMonthlyEMI = 0;
    loans.forEach(l => {
      totalLiabilities += parseFloat(l.outstandingAmount) || 0;
      totalMonthlyEMI  += parseFloat(l.emi)               || 0;
    });

    const totalAssets = totalCurrentValue;
    const netWorth    = totalAssets - totalLiabilities;

    // ✅ FIX: null-safe access to income — user.income can be null for legacy rows
    //         formatUser() always sets it, but we guard defensively anyway.
    const incomeObj      = user.income || {};
    const monthlyIncome  = (incomeObj.monthly || 0) + (incomeObj.additionalMonthly || 0);
    const expenses       = user.expenses || [];
    const totalExpenses  = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const monthlySavings = monthlyIncome - totalExpenses - totalMonthlyEMI;
    const savingsRate    = monthlyIncome > 0
      ? Math.round((monthlySavings / monthlyIncome) * 100)
      : 0;

    // ── Goals with progress ───────────────────────────────────────────────────
    const goalsProgress = (user.goals || []).map(g => {
      const target    = parseFloat(g.targetAmount)   || 0;
      const current   = parseFloat(g.currentSavings) || 0;
      const progress  = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
      const yearsLeft = g.targetDate
        ? Math.max(0, (new Date(g.targetDate) - Date.now()) / (365.25 * 24 * 60 * 60 * 1000))
        : 0;
      const monthlyNeeded = yearsLeft > 0
        ? Math.round((target - current) / (yearsLeft * 12))
        : 0;
      return { ...g, progress, monthlyNeeded };
    });

    // ── Smart insights ────────────────────────────────────────────────────────
    const insights = [];
    if (monthlyIncome > 0) {
      if (savingsRate < 20)
        insights.push({
          type:    "warning",
          message: `Savings rate is ${savingsRate}% — below the 20% benchmark.`,
          action:  `Save ₹${Math.round(monthlyIncome * 0.2 - monthlySavings).toLocaleString("en-IN")} more/month to reach 20%.`,
        });
      else
        insights.push({ type: "success", message: `Savings rate is ${savingsRate}% — great work!` });
    }
    if (totalLiabilities > totalAssets * 0.4 && totalAssets > 0)
      insights.push({
        type:    "warning",
        message: "Debt-to-asset ratio is high. Focus on reducing liabilities.",
        action:  "Pay down high-interest debt first (credit cards, personal loans).",
      });
    if (netWorth > 0)
      insights.push({ type: "success", message: `Net worth is ₹${netWorth.toLocaleString("en-IN")} — positive and growing.` });
    if (totalInvested === 0 && monthlyIncome > 0)
      insights.push({
        type:    "info",
        message: "You have no investments yet.",
        action:  "Start a SIP with as little as ₹500/month to begin wealth creation.",
      });

    return ok(res, {
      netWorth, totalAssets, totalLiabilities,
      totalInvested, totalCurrentValue, totalReturns, returnPct,
      monthlyIncome, totalExpenses, totalMonthlyEMI, monthlySavings, savingsRate,
      investmentsByType, goalsProgress,
      expenseBreakdown: expenses,
      activeLoans:      loans.length,
      insights,
      riskProfile:      user.riskProfile || {},
    });
  } catch (err) {
    console.error("getDashboardSummary:", err);
    return fail(res, "Failed to compute summary.", 500);
  }
};

module.exports = { onboarding, getProfile, updateProfile, changePassword, getDashboardSummary };