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

function getProfileDB(): Record<string, UserProfile> {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_DB_KEY) || "{}") ?? {};
  } catch { return {}; }
}

function setProfileDB(db: Record<string, UserProfile>) {
  localStorage.setItem(PROFILE_DB_KEY, JSON.stringify(db));
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export function getUserProfile(userId: string): UserProfile | null {
  const db = getProfileDB();
  return db[userId] ?? null;
}

export function saveUserProfile(profile: UserProfile): void {
  const db = getProfileDB();
  db[profile.userId] = { ...profile, updatedAt: new Date().toISOString() };
  setProfileDB(db);
}

export function updateUserProfile(userId: string, patch: Partial<UserProfile>): void {
  const db = getProfileDB();
  const existing = db[userId];
  if (!existing) return;
  db[userId] = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  setProfileDB(db);
}

export function hasCompletedOnboarding(userId: string): boolean {
  const db = getProfileDB();
  return !!db[userId]?.onboardedAt;
}

export function markOnboardingDone(userId: string): void {
  const db = getProfileDB();
  if (db[userId]) {
    db[userId].onboardedAt = new Date().toISOString();
    setProfileDB(db);
  }
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