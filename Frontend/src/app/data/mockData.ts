// ─── Mock Database Layer ──────────────────────────────────────────────────────
// All data stored in localStorage. Swap these functions for real API calls
// (fetch / axios) when connecting to Node.js + MongoDB backend.

// ── Keys ──────────────────────────────────────────────────────────────────────
export const KEYS = {
  FINANCIAL_DATA: "sf_financial_db",
  ADMIN_CONTENT:  "sf_admin_content",
};

// ── Financial Profile ─────────────────────────────────────────────────────────

export interface FinancialProfile {
  userId: string;
  // Personal extras (beyond AuthUser)
  dob:            string;
  maritalStatus:  "single" | "married";
  dependents:     number;
  employmentType: "salaried" | "self_employed" | "business";
  cityTier:       "tier1" | "tier2" | "tier3";
  // Income & Expenses
  monthlyIncome:   number;
  monthlyExpenses: number;
  // Assets
  savingsAccount:  number;
  mutualFunds:     number;
  stocks:          number;
  realEstate:      number;
  gold:            number;
  ppf:             number;
  otherAssets:     number;
  // Liabilities
  homeLoan:        number;
  carLoan:         number;
  personalLoan:    number;
  creditCardDebt:  number;
  otherLiabilities: number;
  // Insurance
  lifeInsuranceCover:   number;
  healthInsuranceCover: number;
  vehicleInsurance:     boolean;
  homeInsurance:        boolean;
  // Goals
  goals: FinancialGoal[];
  // Investments history (last 12 months)
  investmentHistory: MonthlySnapshot[];
  // Expense breakdown
  expenseBreakdown: ExpenseCategory[];
  // SIP details
  monthlysSIP: number;
  sipFunds: SIPFund[];
  // Updated at
  updatedAt: string;
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetYear: number;
  category: "retirement" | "home" | "education" | "wealth" | "emergency" | "other";
  icon: string;
}

export interface MonthlySnapshot {
  month: string;
  invested: number;
  value: number;
  returns: number;
}

export interface ExpenseCategory {
  name: string;
  amount: number;
  color: string;
  icon: string;
}

export interface SIPFund {
  name: string;
  amount: number;
  returns: number;
  type: "equity" | "debt" | "hybrid" | "gold";
}

// ── Admin Content ─────────────────────────────────────────────────────────────

export interface AdminContent {
  webinars:      Webinar[];
  newsUpdates:   NewsUpdate[];
  videos:        VideoResource[];
  lastUpdated:   string;
}

export interface Webinar {
  id:          string;
  title:       string;
  speaker:     string;
  date:        string;
  time:        string;
  duration:    string;
  description: string;
  link:        string;
  status:      "upcoming" | "live" | "past";
  createdBy:   string;
  createdAt:   string;
}

export interface NewsUpdate {
  id:          string;
  title:       string;
  summary:     string;
  category:    "market" | "tax" | "insurance" | "general";
  source:      string;
  publishedAt: string;
  createdBy:   string;
  urgent:      boolean;
}

export interface VideoResource {
  id:          string;
  title:       string;
  youtubeUrl:  string;
  thumbnail:   string;
  description: string;
  category:    "investment" | "tax" | "insurance" | "planning" | "general";
  createdBy:   string;
  createdAt:   string;
}

// ── DB helpers ────────────────────────────────────────────────────────────────

function getDB<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
}

function setDB<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Financial Data CRUD ───────────────────────────────────────────────────────

export function getFinancialProfile(userId: string): FinancialProfile | null {
  const db = getDB<Record<string, FinancialProfile>>(KEYS.FINANCIAL_DATA, {});
  return db[userId] ?? null;
}

export function saveFinancialProfile(profile: FinancialProfile) {
  const db = getDB<Record<string, FinancialProfile>>(KEYS.FINANCIAL_DATA, {});
  db[profile.userId] = { ...profile, updatedAt: new Date().toISOString() };
  setDB(KEYS.FINANCIAL_DATA, db);
}

export function getAllFinancialProfiles(): Record<string, FinancialProfile> {
  return getDB<Record<string, FinancialProfile>>(KEYS.FINANCIAL_DATA, {});
}

// ── Admin Content CRUD ────────────────────────────────────────────────────────

export function getAdminContent(): AdminContent {
  return getDB<AdminContent>(KEYS.ADMIN_CONTENT, defaultAdminContent());
}

export function saveAdminContent(content: AdminContent) {
  setDB(KEYS.ADMIN_CONTENT, { ...content, lastUpdated: new Date().toISOString() });
}

// ── Seed demo financial data ──────────────────────────────────────────────────

export function seedDemoFinancialData() {
  const existing = getFinancialProfile("demo_001");
  if (existing) return;

  const demo: FinancialProfile = {
    userId: "demo_001",
    dob: "1990-05-15",
    maritalStatus: "married",
    dependents: 2,
    employmentType: "salaried",
    cityTier: "tier1",
    monthlyIncome: 75000,
    monthlyExpenses: 52000,
    savingsAccount: 180000,
    mutualFunds:    780000,
    stocks:         320000,
    realEstate:     4500000,
    gold:           150000,
    ppf:            220000,
    otherAssets:    80000,
    homeLoan:       2800000,
    carLoan:        350000,
    personalLoan:   0,
    creditCardDebt: 45000,
    otherLiabilities: 0,
    lifeInsuranceCover:   5000000,
    healthInsuranceCover: 500000,
    vehicleInsurance:     true,
    homeInsurance:        false,
    monthlysSIP: 15000,
    sipFunds: [
      { name: "HDFC Equity Fund",    amount: 5000,  returns: 14.2, type: "equity" },
      { name: "Axis Bluechip Fund",  amount: 7000,  returns: 12.8, type: "equity" },
      { name: "SBI Debt Fund",       amount: 3000,  returns: 7.4,  type: "debt" },
    ],
    goals: [
      { id: "g1", name: "Retirement Corpus",  targetAmount: 30000000, currentAmount: 6230000, targetYear: 2050, category: "retirement",  icon: "🏖️" },
      { id: "g2", name: "Child's Education",  targetAmount: 2500000,  currentAmount: 450000,  targetYear: 2035, category: "education",   icon: "🎓" },
      { id: "g3", name: "Emergency Fund",     targetAmount: 300000,   currentAmount: 180000,  targetYear: 2026, category: "emergency",   icon: "🛡️" },
      { id: "g4", name: "Dream Vacation",     targetAmount: 500000,   currentAmount: 120000,  targetYear: 2027, category: "other",       icon: "✈️" },
    ],
    investmentHistory: [
      { month: "Jul", invested: 5780000, value: 5980000,  returns: 200000 },
      { month: "Aug", invested: 5900000, value: 6100000,  returns: 200000 },
      { month: "Sep", invested: 5930000, value: 6050000,  returns: 120000 },
      { month: "Oct", invested: 5960000, value: 6220000,  returns: 260000 },
      { month: "Nov", invested: 5990000, value: 6310000,  returns: 320000 },
      { month: "Dec", invested: 6020000, value: 6480000,  returns: 460000 },
      { month: "Jan", invested: 6050000, value: 6530000,  returns: 480000 },
      { month: "Feb", invested: 6080000, value: 6620000,  returns: 540000 },
      { month: "Mar", invested: 6110000, value: 6230000,  returns: 120000 },
    ],
    expenseBreakdown: [
      { name: "Housing / Rent",  amount: 18000, color: "#1A5F3D", icon: "🏠" },
      { name: "Food & Dining",   amount: 9000,  color: "#2D7A4E", icon: "🍽️" },
      { name: "Transport",       amount: 6000,  color: "#3FAF7D", icon: "🚗" },
      { name: "Utilities",       amount: 3500,  color: "#B8E986", icon: "⚡" },
      { name: "Entertainment",   amount: 4000,  color: "#8BC34A", icon: "🎬" },
      { name: "Healthcare",      amount: 2500,  color: "#4CAF50", icon: "🏥" },
      { name: "Education",       amount: 4500,  color: "#66BB6A", icon: "📚" },
      { name: "Miscellaneous",   amount: 4500,  color: "#A5D6A7", icon: "📦" },
    ],
    updatedAt: new Date().toISOString(),
  };

  saveFinancialProfile(demo);
}

function defaultAdminContent(): AdminContent {
  return {
    webinars: [
      {
        id: "w1", title: "Building Wealth in Your 30s", speaker: "Rajesh Kumar",
        date: "April 10, 2026", time: "6:00 PM IST", duration: "60 mins",
        description: "Learn effective wealth building strategies for young professionals",
        link: "", status: "upcoming", createdBy: "admin_001",
        createdAt: new Date().toISOString(),
      },
      {
        id: "w2", title: "Tax-Saving Strategies 2026", speaker: "Priya Sharma",
        date: "April 15, 2026", time: "7:00 PM IST", duration: "90 mins",
        description: "Maximize your tax savings with expert tips and planning",
        link: "", status: "upcoming", createdBy: "admin_001",
        createdAt: new Date().toISOString(),
      },
    ],
    newsUpdates: [
      {
        id: "n1", title: "RBI Keeps Repo Rate Unchanged at 6.5%",
        summary: "The Reserve Bank of India maintained the repo rate at 6.5% in its latest policy meeting, providing stability for debt fund investors.",
        category: "market", source: "RBI Official", publishedAt: new Date().toISOString(),
        createdBy: "admin_001", urgent: false,
      },
      {
        id: "n2", title: "New Tax Regime: Key Changes for FY 2026-27",
        summary: "The government has announced enhanced tax rebates under the new tax regime. Individuals earning up to ₹12L will pay zero income tax.",
        category: "tax", source: "Finance Ministry", publishedAt: new Date().toISOString(),
        createdBy: "admin_001", urgent: true,
      },
    ],
    videos: [
      {
        id: "v1", title: "Mutual Funds for Beginners", youtubeUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ",
        thumbnail: "", description: "Complete guide to mutual fund investing for beginners.",
        category: "investment", createdBy: "admin_001", createdAt: new Date().toISOString(),
      },
    ],
    lastUpdated: new Date().toISOString(),
  };
}

// ── Auto-seed on import ───────────────────────────────────────────────────────
seedDemoFinancialData();