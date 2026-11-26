import { userAPI } from "../services/api";
import type { AuthUser } from "../auth/authService";
// ─── Extended User Profile — Onboarding & Settings Data Layer ─────────────────
// All data stored in localStorage under "sf_user_profile_db"
// Replace the getDB/setDB calls with real API calls when connecting a backend.

export const PROFILE_DB_KEY = "sf_user_profile_db";
export const ONBOARDING_FLAG_KEY = "sf_onboarding_done"; // per-user flag

// ── Sub-types ─────────────────────────────────────────────────────────────────

export interface PersonalInfo {
  fullName:       string;
  email:          string;
  mobile:         string;
  avatarDataUrl?: string; // base64 data-URL of profile picture
  dob:            string; // YYYY-MM-DD
  gender:         "male" | "female" | "other" | "prefer_not_to_say";
  occupation:     string;
  maritalStatus:  "single" | "married" | "divorced" | "widowed";
  dependents:     number;
  city:           string;
  state:          string;
  country:        string;
}

export interface IncomeInfo {
  monthlyIncome:    number;
  incomeSource:     "salaried" | "self_employed" | "business" | "freelance" | "other";
  additionalIncome: number;   // monthly
  salaryGrowthPct:  number;   // annual %
}

export interface ExpenseEntry {
  id:       string;
  category: string;
  amount:   number;
  icon:     string;
  color:    string;
}

export interface FinancialGoalEntry {
  id:             string;
  name:           string;
  targetAmount:   number;
  targetDate:     string;   // YYYY-MM-DD
  priority:       "high" | "medium" | "low";
  currentSavings: number;
  category:       "retirement" | "home" | "education" | "wealth" | "emergency" | "other";
  icon:           string;
}

export interface InvestmentEntry {
  id:             string;
  type:           "mutual_fund" | "stocks" | "fd" | "ppf" | "nps" | "real_estate" | "gold" | "crypto" | "bonds" | "other";
  name:           string;
  investedAmount: number;
  currentValue:   number;
  durationMonths: number;
  expectedReturn: number; // annual %
}

export interface RiskProfile {
  tolerance:         "low" | "medium" | "high";
  experience:        "beginner" | "intermediate" | "expert";
  timeHorizonYears:  number;
  investmentStyle:   "conservative" | "balanced" | "aggressive";
}

export interface LoanEntry {
  id:               string;
  type:             "home" | "car" | "personal" | "education" | "credit_card" | "other";
  lenderName:       string;
  loanAmount:       number;
  outstandingAmount: number;
  emi:              number;
  interestRate:     number;  // annual %
  remainingMonths:  number;
}

// ── Master profile type ───────────────────────────────────────────────────────

export interface UserProfile {
  userId:      string;
  personal:    PersonalInfo;
  income:      IncomeInfo;
  expenses:    ExpenseEntry[];
  goals:       FinancialGoalEntry[];
  investments: InvestmentEntry[];
  riskProfile: RiskProfile;
  loans:       LoanEntry[];
  onboardedAt: string;
  updatedAt:   string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Financial records stay in memory only for the active session.
let current: UserProfile | null = null;
export function getUserProfile(userId: string) {
  return current?.userId === userId ? current : null;
}

type StoredUser = AuthUser & Partial<PersonalInfo> & Partial<Pick<UserProfile, "goals" | "expenses" | "loans" | "investments" | "updatedAt" | "onboardedAt">> & { location?: Partial<PersonalInfo> };
export function receiveProfile(user: StoredUser | null) {
  current = null;
  if (!user) return;
  const profile = emptyProfile(user.id, { name: user.fullName, email: user.email, mobile: user.mobile });
  for (const key of ["gender", "occupation", "maritalStatus", "dependents", "city", "state", "country"] as const) {
    const value = user[key] ?? user.location?.[key];
    if (value != null) Object.assign(profile.personal, { [key]: value });
  }
  profile.personal.dob = user.dob?.slice(0, 10) ?? "";
  profile.personal.avatarDataUrl = user.profilePicture;
  if (user.income) profile.income = {
    monthlyIncome: user.income.monthly, incomeSource: (user.income.source || "other") as IncomeInfo["incomeSource"],
    additionalIncome: user.income.additionalMonthly, salaryGrowthPct: user.income.annualGrowthPct,
  };
  if (user.riskProfile) Object.assign(profile.riskProfile, user.riskProfile);
  for (const key of ["expenses", "loans", "investments", "goals"] as const) Object.assign(profile, { [key]: user[key] ?? [] });
  profile.updatedAt = user.updatedAt ?? "";
  profile.onboardedAt = user.onboardedAt ?? "";
  current = profile;
}

export async function persistProfile(profile: UserProfile, onboarding = false) {
  if (current?.userId !== profile.userId) throw Error("Your session changed. Sign in again.");
  const { personal, income, riskProfile, expenses, investments, loans, goals } = profile;
  const { email, avatarDataUrl, dob, ...identity } = personal;
  const payload = { ...identity, ...(dob && { dob }), ...(avatarDataUrl && { profilePicture: avatarDataUrl }),
    income: { monthly: income.monthlyIncome, source: income.incomeSource, additionalMonthly: income.additionalIncome, annualGrowthPct: income.salaryGrowthPct },
    riskProfile, expenses, investments, loans, goals };
  const result = await (onboarding ? userAPI.onboarding(payload) : userAPI.updateProfile(payload));
  if (current?.userId !== profile.userId) throw Error("Your session changed.");
  const { user } = result.data as {user: StoredUser};
  receiveProfile(user);
  return user;
}

// ── Default empty profile skeleton ───────────────────────────────────────────

export function emptyProfile(userId: string, prefill?: {
  name?: string; email?: string; mobile?: string;
}): UserProfile {
  return {
    userId,
    personal: {
      fullName:     prefill?.name   ?? "",
      email:        prefill?.email  ?? "",
      mobile:       prefill?.mobile ?? "",
      dob:          "",
      gender:       "prefer_not_to_say",
      occupation:   "",
      maritalStatus: "single",
      dependents:   0,
      city:         "",
      state:        "",
      country:      "India",
    },
    income: {
      monthlyIncome:    0,
      incomeSource:     "salaried",
      additionalIncome: 0,
      salaryGrowthPct:  8,
    },
    expenses: [
      { id: "e1", category: "Housing / Rent", amount: 0, icon: "🏠", color: "#1A5F3D" },
      { id: "e2", category: "Food & Dining",  amount: 0, icon: "🍽️", color: "#2D7A4E" },
      { id: "e3", category: "Transport",      amount: 0, icon: "🚗", color: "#3FAF7D" },
      { id: "e4", category: "Utilities",      amount: 0, icon: "⚡", color: "#B8E986" },
      { id: "e5", category: "Healthcare",     amount: 0, icon: "🏥", color: "#8BC34A" },
      { id: "e6", category: "Entertainment",  amount: 0, icon: "🎬", color: "#66BB6A" },
    ],
    goals:       [],
    investments: [],
    riskProfile: {
      tolerance:        "medium",
      experience:       "beginner",
      timeHorizonYears: 10,
      investmentStyle:  "balanced",
    },
    loans: [],
    onboardedAt: "",
    updatedAt:   new Date().toISOString(),
  };
}