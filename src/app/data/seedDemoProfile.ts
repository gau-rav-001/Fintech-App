// ── seedDemoProfile.ts ─────────────────────────────────────────────────────────
// Seeds a complete UserProfile for the demo account (demo_001) so it bypasses
// the onboarding wizard on first load. Called once from main.tsx.

import { getUserProfile, saveUserProfile, type UserProfile } from "./userProfile";
import { syncProfileToFinancialData } from "./syncProfile";

export function seedDemoProfile() {
  const existing = getUserProfile("demo_001");
  if (existing?.onboardedAt) return; // already seeded

  const demo: UserProfile = {
    userId: "demo_001",
    personal: {
      fullName:      "Rajesh Kumar",
      email:         "demo@smartfinance.in",
      mobile:        "+91 98765 43210",
      dob:           "1990-05-15",
      gender:        "male",
      occupation:    "Software Engineer",
      maritalStatus: "married",
      dependents:    2,
      city:          "Mumbai",
      state:         "Maharashtra",
      country:       "India",
    },
    income: {
      monthlyIncome:    75000,
      incomeSource:     "salaried",
      additionalIncome: 5000,
      salaryGrowthPct:  10,
    },
    expenses: [
      { id: "e1", category: "Housing / Rent", amount: 18000, icon: "🏠", color: "#1A5F3D" },
      { id: "e2", category: "Food & Dining",  amount: 9000,  icon: "🍽️", color: "#2D7A4E" },
      { id: "e3", category: "Transport",      amount: 6000,  icon: "🚗", color: "#3FAF7D" },
      { id: "e4", category: "Utilities",      amount: 3500,  icon: "⚡", color: "#B8E986" },
      { id: "e5", category: "Healthcare",     amount: 2500,  icon: "🏥", color: "#8BC34A" },
      { id: "e6", category: "Entertainment",  amount: 4000,  icon: "🎬", color: "#66BB6A" },
      { id: "e7", category: "Education",      amount: 4500,  icon: "📚", color: "#4CAF50" },
      { id: "e8", category: "Miscellaneous",  amount: 4500,  icon: "📦", color: "#A5D6A7" },
    ],
    goals: [
      { id: "g1", name: "Retirement Corpus", targetAmount: 30000000, targetDate: "2050-01-01", priority: "high",   currentSavings: 6230000, category: "retirement", icon: "🏖️" },
      { id: "g2", name: "Child's Education", targetAmount: 2500000,  targetDate: "2035-06-01", priority: "high",   currentSavings: 450000,  category: "education",  icon: "🎓" },
      { id: "g3", name: "Emergency Fund",    targetAmount: 300000,   targetDate: "2026-12-31", priority: "high",   currentSavings: 180000,  category: "emergency",  icon: "🛡️" },
      { id: "g4", name: "Dream Vacation",    targetAmount: 500000,   targetDate: "2027-03-01", priority: "medium", currentSavings: 120000,  category: "other",      icon: "✈️" },
    ],
    investments: [
      { id: "i1", type: "mutual_fund", name: "HDFC Equity Fund",   investedAmount: 350000,  currentValue: 420000,  durationMonths: 36, expectedReturn: 14.2 },
      { id: "i2", type: "mutual_fund", name: "Axis Bluechip Fund", investedAmount: 280000,  currentValue: 340000,  durationMonths: 24, expectedReturn: 12.8 },
      { id: "i3", type: "stocks",      name: "Stock Portfolio",    investedAmount: 280000,  currentValue: 320000,  durationMonths: 24, expectedReturn: 15.0 },
      { id: "i4", type: "real_estate", name: "Apartment (Mumbai)", investedAmount: 3500000, currentValue: 4500000, durationMonths: 84, expectedReturn: 8.0  },
      { id: "i5", type: "gold",        name: "Gold Holdings",      investedAmount: 120000,  currentValue: 150000,  durationMonths: 60, expectedReturn: 6.5  },
      { id: "i6", type: "ppf",         name: "PPF Account",        investedAmount: 200000,  currentValue: 220000,  durationMonths: 84, expectedReturn: 7.1  },
    ],
    riskProfile: {
      tolerance:        "medium",
      experience:       "intermediate",
      timeHorizonYears: 20,
      investmentStyle:  "balanced",
    },
    loans: [
      { id: "l1", type: "home",        lenderName: "HDFC Bank",  loanAmount: 3500000, outstandingAmount: 2800000, emi: 28000, interestRate: 8.5, remainingMonths: 180 },
      { id: "l2", type: "car",         lenderName: "ICICI Bank", loanAmount: 600000,  outstandingAmount: 350000,  emi: 12000, interestRate: 9.2, remainingMonths: 36  },
      { id: "l3", type: "credit_card", lenderName: "SBI Card",   loanAmount: 50000,   outstandingAmount: 45000,   emi: 5000,  interestRate: 36,  remainingMonths: 10  },
    ],
    onboardedAt: new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
  };

  saveUserProfile(demo);
  syncProfileToFinancialData(demo); // populate the dashboard chart data
}