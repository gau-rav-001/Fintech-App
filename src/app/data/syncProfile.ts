// ── syncProfile.ts ─────────────────────────────────────────────────────────────
// Bridge: converts UserProfile → FinancialProfile (mockData format).
// Lives in its own file to avoid circular imports:
//   userProfile.ts  ← has no deps on mockData
//   mockData.ts     ← has no deps on userProfile
//   syncProfile.ts  ← imports BOTH, no circle

import { type UserProfile } from "./userProfile";
import { type FinancialProfile, saveFinancialProfile } from "./mockData";

export function syncProfileToFinancialData(profile: UserProfile): void {
  // ── Investment buckets ──────────────────────────────────────────────────────
  const mf      = profile.investments.filter(i => i.type === "mutual_fund").reduce((s, i) => s + i.currentValue, 0);
  const stocks  = profile.investments.filter(i => i.type === "stocks"     ).reduce((s, i) => s + i.currentValue, 0);
  const re      = profile.investments.filter(i => i.type === "real_estate").reduce((s, i) => s + i.currentValue, 0);
  const gold    = profile.investments.filter(i => i.type === "gold"       ).reduce((s, i) => s + i.currentValue, 0);
  const ppf     = profile.investments.filter(i => i.type === "ppf"        ).reduce((s, i) => s + i.currentValue, 0);
  const other   = profile.investments
    .filter(i => !["mutual_fund","stocks","real_estate","gold","ppf"].includes(i.type))
    .reduce((s, i) => s + i.currentValue, 0);

  // ── Loan buckets ────────────────────────────────────────────────────────────
  const homeLoan  = profile.loans.filter(l => l.type === "home"        ).reduce((s, l) => s + l.outstandingAmount, 0);
  const carLoan   = profile.loans.filter(l => l.type === "car"         ).reduce((s, l) => s + l.outstandingAmount, 0);
  const persLoan  = profile.loans.filter(l => l.type === "personal"    ).reduce((s, l) => s + l.outstandingAmount, 0);
  const ccDebt    = profile.loans.filter(l => l.type === "credit_card" ).reduce((s, l) => s + l.outstandingAmount, 0);
  const otherLoan = profile.loans
    .filter(l => !["home","car","personal","credit_card"].includes(l.type))
    .reduce((s, l) => s + l.outstandingAmount, 0);

  // ── Expenses ────────────────────────────────────────────────────────────────
  const expBreakdown = profile.expenses.map(e => ({
    name: e.category, amount: e.amount, color: e.color, icon: e.icon,
  }));
  const totalExpenses = profile.expenses.reduce((s, e) => s + e.amount, 0);

  // ── Goals ───────────────────────────────────────────────────────────────────
  const goals: FinancialProfile["goals"] = profile.goals.map(g => ({
    id: g.id,
    name: g.name,
    targetAmount: g.targetAmount,
    currentAmount: g.currentSavings,
    targetYear: g.targetDate
      ? new Date(g.targetDate).getFullYear() || new Date().getFullYear() + 5
      : new Date().getFullYear() + 5,
    category: g.category,
    icon: g.icon,
  }));

  // ── SIP funds from mutual fund investments ──────────────────────────────────
  const sipFunds: FinancialProfile["sipFunds"] = profile.investments
    .filter(i => i.type === "mutual_fund")
    .map(i => ({
      name:    i.name,
      amount:  Math.round(i.investedAmount / Math.max(1, i.durationMonths)),
      returns: i.expectedReturn,
      type:    "equity" as const,
    }));
  const monthlySIP = sipFunds.reduce((s, f) => s + f.amount, 0);

  // ── Assemble FinancialProfile ───────────────────────────────────────────────
  const fp: FinancialProfile = {
    userId:           profile.userId,
    dob:              profile.personal.dob,
    maritalStatus:    profile.personal.maritalStatus as "single" | "married",
    dependents:       profile.personal.dependents,
    employmentType:   profile.income.incomeSource === "salaried" ? "salaried"
                    : profile.income.incomeSource === "business"  ? "business"
                    : "self_employed",
    cityTier:         "tier1",
    monthlyIncome:    profile.income.monthlyIncome + profile.income.additionalIncome,
    monthlyExpenses:  totalExpenses > 0 ? totalExpenses : profile.income.monthlyIncome * 0.6,
    savingsAccount:   0,
    mutualFunds:      mf,
    stocks,
    realEstate:       re,
    gold,
    ppf,
    otherAssets:      other,
    homeLoan,
    carLoan,
    personalLoan:     persLoan,
    creditCardDebt:   ccDebt,
    otherLiabilities: otherLoan,
    lifeInsuranceCover:   profile.income.monthlyIncome * 12 * 10,
    healthInsuranceCover: 500000,
    vehicleInsurance:     profile.loans.some(l => l.type === "car"),
    homeInsurance:        false,
    monthlysSIP:      monthlySIP,
    sipFunds,
    goals,
    investmentHistory: [],
    expenseBreakdown:  expBreakdown,
    updatedAt:         new Date().toISOString(),
  };

  saveFinancialProfile(fp);
}