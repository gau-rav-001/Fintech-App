import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  User, Mail, Phone, Calendar, Briefcase, MapPin,
  DollarSign, TrendingUp, Target, CreditCard, ShieldCheck,
  LogOut, Camera, Save, AlertCircle, CheckCircle,
  ChevronDown, ChevronRight, Plus, Trash2, Lock, Eye, EyeOff,
  ArrowLeft, Settings as SettingsIcon, PieChart,
  Building2, CheckCircle2, XCircle, Check, AlertTriangle, X, RefreshCw, UserCheck,
  Sun, Moon, Monitor,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useTheme, type ThemePreference } from "../ThemeContext";

import {
  type UserProfile, type ExpenseEntry, type FinancialGoalEntry,
  type InvestmentEntry, type LoanEntry,
  getUserProfile, saveUserProfile, emptyProfile,
} from "../data/userProfile";
import { syncProfileToFinancialData } from "../data/syncProfile";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import {
  userAdvisorAPI,
  type ActiveAdvisorRelationship,
  type UserAdvisorRequest,
} from "../services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import { Skeleton } from "../components/ui/skeleton";

// ── Shared input styles ───────────────────────────────────────────────────────
// Swapped hardcoded colors (border-gray-200, bg-white, etc.) for the existing
// theme tokens already defined in theme.css (--border, --card, ...) so this
// page actually responds to the dark-mode class instead of staying light always.

const INPUT = "w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all bg-card text-foreground";
const LABEL = "block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide";
const SELECT = `${INPUT} appearance-none`;

function uid() { return `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }
function fmt(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(0)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

type TabId = "account" | "advisor" | "profile" | "income" | "expenses" | "goals" | "investments" | "risk" | "loans" | "security";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "account", label: "Account", icon: <User className="w-4 h-4" /> },
  { id: "advisor", label: "Financial Advisor", icon: <Briefcase className="w-4 h-4" /> },
  { id: "profile", label: "Profile", icon: <MapPin className="w-4 h-4" /> },
  { id: "income", label: "Income", icon: <DollarSign className="w-4 h-4" /> },
  { id: "expenses", label: "Expenses", icon: <PieChart className="w-4 h-4" /> },
  { id: "goals", label: "Goals", icon: <Target className="w-4 h-4" /> },
  { id: "investments", label: "Investments", icon: <TrendingUp className="w-4 h-4" /> },
  { id: "risk", label: "Risk Profile", icon: <ShieldCheck className="w-4 h-4" /> },
  { id: "loans", label: "Loans", icon: <CreditCard className="w-4 h-4" /> },
  { id: "security", label: "Security", icon: <Lock className="w-4 h-4" /> },
];

// ── Main Component ────────────────────────────────────────────────────────────

export function Settings() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const requestedTab = searchParams.get("tab") as TabId;
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    return TABS.some(t => t.id === requestedTab) ? requestedTab : "account";
  });

  useEffect(() => {
    const tabParam = searchParams.get("tab") as TabId;
    if (tabParam && TABS.some(t => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = getUserProfile(user?.id ?? "");
    return saved ?? emptyProfile(user?.id ?? "", {
      name: user?.name, email: user?.email, mobile: user?.phone,
    });
  });

  const avatarRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function handleSave() {
    saveUserProfile(profile);
    syncProfileToFinancialData(profile);
    updateUser({
      name: profile.personal.fullName || user?.name,
      phone: profile.personal.mobile,
      avatar: profile.personal.avatarDataUrl,
    });
    showToast("Changes saved successfully!");
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      setProfile(p => ({ ...p, personal: { ...p.personal, avatarDataUrl: url } }));
    };
    reader.readAsDataURL(file);
  }

  const patchPersonal = useCallback((k: string, v: string | number) =>
    setProfile(p => ({ ...p, personal: { ...p.personal, [k]: v } })), []);

  const patchIncome = useCallback((k: string, v: string | number) =>
    setProfile(p => ({ ...p, income: { ...p.income, [k]: v } })), []);

  const patchRisk = useCallback((k: string, v: string | number) =>
    setProfile(p => ({ ...p, riskProfile: { ...p.riskProfile, [k]: v } })), []);

  const initials = (user?.name ?? "U").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  // ── Tab content ───────────────────────────────────────────────────────────

  const tabContent: Record<TabId, React.ReactNode> = {

    account: (
      <Section title="Account Information" icon={<User className="w-5 h-5" />}>
        {/* Avatar */}
        <div className="flex items-center gap-5 mb-6">
          <div
            className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-[#3FAF7D] flex items-center justify-center text-white text-2xl font-bold cursor-pointer overflow-hidden border-4 border-card shadow-lg flex-shrink-0"
            onClick={() => avatarRef.current?.click()}
          >
            {profile.personal.avatarDataUrl
              ? <img src={profile.personal.avatarDataUrl} alt="avatar" className="w-full h-full object-cover" />
              : initials}
          </div>
          <div>
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-all"
            >
              <Camera className="w-4 h-4" /> Change Photo
            </button>
            <p className="text-xs text-muted-foreground mt-1.5">JPG or PNG, max 2MB</p>
          </div>
          <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input className={`${INPUT} pl-10`} value={profile.personal.fullName}
                onChange={e => patchPersonal("fullName", e.target.value)} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input className={`${INPUT} pl-10`} type="email" value={profile.personal.email}
                onChange={e => patchPersonal("email", e.target.value)} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Mobile Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input className={`${INPUT} pl-10`} type="tel" value={profile.personal.mobile}
                onChange={e => patchPersonal("mobile", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Appearance / theme picker */}
        <div className="mt-6 pt-6 border-t border-border">
          <label className={LABEL}>Appearance</label>
          <ThemePicker />
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </Section>
    ),

    advisor: (
      <AdvisorSettingsSection showToast={showToast} />
    ),

    profile: (
      <Section title="Personal Details" icon={<MapPin className="w-5 h-5" />}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Date of Birth</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input className={`${INPUT} pl-10`} type="date" value={profile.personal.dob}
                onChange={e => patchPersonal("dob", e.target.value)} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Gender</label>
            <div className="relative">
              <select className={SELECT} value={profile.personal.gender}
                onChange={e => patchPersonal("gender", e.target.value)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={LABEL}>Occupation</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input className={`${INPUT} pl-10`} value={profile.personal.occupation}
                onChange={e => patchPersonal("occupation", e.target.value)} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Marital Status</label>
            <div className="relative">
              <select className={SELECT} value={profile.personal.maritalStatus}
                onChange={e => patchPersonal("maritalStatus", e.target.value)}>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={LABEL}>Dependents</label>
            <input className={INPUT} type="number" min="0" max="20"
              value={profile.personal.dependents || ""}
              onChange={e => patchPersonal("dependents", parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <label className={LABEL}>City</label>
            <input className={INPUT} value={profile.personal.city}
              onChange={e => patchPersonal("city", e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>State</label>
            <input className={INPUT} value={profile.personal.state}
              onChange={e => patchPersonal("state", e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>Country</label>
            <input className={INPUT} value={profile.personal.country}
              onChange={e => patchPersonal("country", e.target.value)} />
          </div>
        </div>
      </Section>
    ),

    income: (
      <Section title="Income Details" icon={<DollarSign className="w-5 h-5" />}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Monthly Income (₹)</label>
            <input className={INPUT} type="number"
              value={profile.income.monthlyIncome || ""}
              onChange={e => patchIncome("monthlyIncome", parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className={LABEL}>Income Source</label>
            <div className="relative">
              <select className={SELECT} value={profile.income.incomeSource}
                onChange={e => patchIncome("incomeSource", e.target.value)}>
                <option value="salaried">Salaried</option>
                <option value="self_employed">Self Employed</option>
                <option value="business">Business Owner</option>
                <option value="freelance">Freelancer</option>
                <option value="other">Other</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={LABEL}>Additional Monthly Income (₹)</label>
            <input className={INPUT} type="number"
              value={profile.income.additionalIncome || ""}
              onChange={e => patchIncome("additionalIncome", parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className={LABEL}>Annual Salary Growth (%)</label>
            <input className={INPUT} type="number"
              value={profile.income.salaryGrowthPct || ""}
              onChange={e => patchIncome("salaryGrowthPct", parseFloat(e.target.value) || 0)} />
          </div>
        </div>
        {profile.income.monthlyIncome > 0 && (
          <div className="mt-4 bg-green-50 dark:bg-green-950/30 rounded-xl p-4">
            <p className="text-sm text-green-800 dark:text-green-300">
              Total monthly: <strong>{fmt(profile.income.monthlyIncome + profile.income.additionalIncome)}</strong> |
              Annual: <strong>{fmt((profile.income.monthlyIncome + profile.income.additionalIncome) * 12)}</strong>
            </p>
          </div>
        )}
      </Section>
    ),

    expenses: (
      <Section title="Monthly Expenses" icon={<PieChart className="w-5 h-5" />}>
        <div className="space-y-2.5">
          {profile.expenses.map((exp, i) => (
            <div key={exp.id} className="flex items-center gap-3 bg-muted rounded-xl px-3 py-2.5">
              <span className="text-xl w-7">{exp.icon}</span>
              <input
                className="flex-1 bg-transparent border-b border-border focus:border-primary focus:outline-none text-sm py-0.5 text-foreground"
                value={exp.category}
                onChange={e => {
                  const u = [...profile.expenses]; u[i] = { ...exp, category: e.target.value };
                  setProfile(p => ({ ...p, expenses: u }));
                }}
              />
              <span className="text-xs text-muted-foreground">₹</span>
              <input
                className="w-28 border border-border rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary/40 bg-card text-foreground"
                type="number"
                value={exp.amount || ""}
                onChange={e => {
                  const u = [...profile.expenses]; u[i] = { ...exp, amount: parseFloat(e.target.value) || 0 };
                  setProfile(p => ({ ...p, expenses: u }));
                }}
              />
              <button type="button" onClick={() => setProfile(p => ({ ...p, expenses: p.expenses.filter(x => x.id !== exp.id) }))}
                className="p-1 text-muted-foreground/60 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
        <button type="button"
          onClick={() => setProfile(p => ({ ...p, expenses: [...p.expenses, { id: uid(), category: "Other", amount: 0, icon: "📦", color: "#8BC34A" }] }))}
          className="mt-3 flex items-center gap-2 text-sm text-primary font-semibold hover:underline"
        ><Plus className="w-4 h-4" /> Add category</button>
        {profile.expenses.length > 0 && (
          <div className="mt-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Total: <strong>{fmt(profile.expenses.reduce((s, e) => s + e.amount, 0))}/month</strong>
            </p>
          </div>
        )}
      </Section>
    ),

    goals: (
      <Section title="Financial Goals" icon={<Target className="w-5 h-5" />}>
        <div className="space-y-3">
          {profile.goals.map((g, i) => (
            <div key={g.id} className="bg-muted rounded-xl p-4 border border-border">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{g.icon}</span>
                  <input className="font-semibold text-sm bg-transparent border-b border-border focus:border-primary focus:outline-none px-1 text-foreground"
                    value={g.name}
                    onChange={e => { const u = [...profile.goals]; u[i] = { ...g, name: e.target.value }; setProfile(p => ({ ...p, goals: u })); }}
                  />
                </div>
                <button type="button" onClick={() => setProfile(p => ({ ...p, goals: p.goals.filter(x => x.id !== g.id) }))} className="text-muted-foreground/60 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground block mb-1">Target (₹)</label>
                  <input className={INPUT} type="number" value={g.targetAmount || ""}
                    onChange={e => { const u = [...profile.goals]; u[i] = { ...g, targetAmount: parseFloat(e.target.value) || 0 }; setProfile(p => ({ ...p, goals: u })); }} />
                </div>
                <div><label className="text-xs text-muted-foreground block mb-1">Current Savings (₹)</label>
                  <input className={INPUT} type="number" value={g.currentSavings || ""}
                    onChange={e => { const u = [...profile.goals]; u[i] = { ...g, currentSavings: parseFloat(e.target.value) || 0 }; setProfile(p => ({ ...p, goals: u })); }} />
                </div>
                <div><label className="text-xs text-muted-foreground block mb-1">Target Date</label>
                  <input className={INPUT} type="date" value={g.targetDate}
                    onChange={e => { const u = [...profile.goals]; u[i] = { ...g, targetDate: e.target.value }; setProfile(p => ({ ...p, goals: u })); }} />
                </div>
                <div><label className="text-xs text-muted-foreground block mb-1">Priority</label>
                  <div className="relative">
                    <select className={SELECT} value={g.priority}
                      onChange={e => { const u = [...profile.goals]; u[i] = { ...g, priority: e.target.value as FinancialGoalEntry["priority"] }; setProfile(p => ({ ...p, goals: u })); }}>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button"
          onClick={() => setProfile(p => ({ ...p, goals: [...p.goals, { id: uid(), name: "New Goal", targetAmount: 0, targetDate: "", priority: "medium", currentSavings: 0, category: "other", icon: "⭐" }] }))}
          className="mt-3 flex items-center gap-2 text-sm text-primary font-semibold hover:underline"
        ><Plus className="w-4 h-4" /> Add goal</button>
      </Section>
    ),

    investments: (
      <Section title="Investment Portfolio" icon={<TrendingUp className="w-5 h-5" />}>
        <div className="space-y-3">
          {profile.investments.map((inv, i) => (
            <div key={inv.id} className="bg-muted rounded-xl p-4 border border-border">
              <div className="flex justify-between items-center mb-3">
                <input className="font-semibold text-sm bg-transparent border-b border-border focus:border-primary focus:outline-none px-1 flex-1 mr-3 text-foreground"
                  value={inv.name}
                  onChange={e => { const u = [...profile.investments]; u[i] = { ...inv, name: e.target.value }; setProfile(p => ({ ...p, investments: u })); }}
                />
                <button type="button" onClick={() => setProfile(p => ({ ...p, investments: p.investments.filter(x => x.id !== inv.id) }))} className="text-muted-foreground/60 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground block mb-1">Type</label>
                  <div className="relative">
                    <select className={SELECT} value={inv.type}
                      onChange={e => { const u = [...profile.investments]; u[i] = { ...inv, type: e.target.value as InvestmentEntry["type"] }; setProfile(p => ({ ...p, investments: u })); }}>
                      <option value="mutual_fund">Mutual Fund</option>
                      <option value="stocks">Stocks</option>
                      <option value="fd">Fixed Deposit</option>
                      <option value="ppf">PPF</option>
                      <option value="nps">NPS</option>
                      <option value="real_estate">Real Estate</option>
                      <option value="gold">Gold</option>
                      <option value="crypto">Crypto</option>
                      <option value="bonds">Bonds</option>
                      <option value="other">Other</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div><label className="text-xs text-muted-foreground block mb-1">Expected Return (%)</label>
                  <input className={INPUT} type="number" value={inv.expectedReturn || ""}
                    onChange={e => { const u = [...profile.investments]; u[i] = { ...inv, expectedReturn: parseFloat(e.target.value) || 0 }; setProfile(p => ({ ...p, investments: u })); }} />
                </div>
                <div><label className="text-xs text-muted-foreground block mb-1">Invested (₹)</label>
                  <input className={INPUT} type="number" value={inv.investedAmount || ""}
                    onChange={e => { const u = [...profile.investments]; u[i] = { ...inv, investedAmount: parseFloat(e.target.value) || 0 }; setProfile(p => ({ ...p, investments: u })); }} />
                </div>
                <div><label className="text-xs text-muted-foreground block mb-1">Current Value (₹)</label>
                  <input className={INPUT} type="number" value={inv.currentValue || ""}
                    onChange={e => { const u = [...profile.investments]; u[i] = { ...inv, currentValue: parseFloat(e.target.value) || 0 }; setProfile(p => ({ ...p, investments: u })); }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button"
          onClick={() => setProfile(p => ({ ...p, investments: [...p.investments, { id: uid(), type: "mutual_fund", name: "New Investment", investedAmount: 0, currentValue: 0, durationMonths: 12, expectedReturn: 12 }] }))}
          className="mt-3 flex items-center gap-2 text-sm text-primary font-semibold hover:underline"
        ><Plus className="w-4 h-4" /> Add investment</button>
      </Section>
    ),

    risk: (
      <Section title="Risk Profile" icon={<ShieldCheck className="w-5 h-5" />}>
        <div className="space-y-6">
          <div>
            <label className={LABEL}>Risk Tolerance</label>
            <div className="grid grid-cols-3 gap-3">
              {(["low", "medium", "high"] as const).map(l => (
                <button key={l} type="button"
                  onClick={() => patchRisk("tolerance", l)}
                  className={`py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${profile.riskProfile.tolerance === l ? "border-primary bg-green-50 dark:bg-green-950/30 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/40"}`}
                >{l === "low" ? "🛡️" : l === "medium" ? "⚖️" : "🚀"} {l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className={LABEL}>Investment Experience</label>
            <div className="grid grid-cols-3 gap-3">
              {(["beginner", "intermediate", "expert"] as const).map(l => (
                <button key={l} type="button"
                  onClick={() => patchRisk("experience", l)}
                  className={`py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${profile.riskProfile.experience === l ? "border-primary bg-green-50 dark:bg-green-950/30 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/40"}`}
                >{l === "beginner" ? "🌱" : l === "intermediate" ? "📈" : "🏆"} {l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className={LABEL}>Time Horizon: {profile.riskProfile.timeHorizonYears} years</label>
            <input type="range" min="1" max="40" step="1"
              value={profile.riskProfile.timeHorizonYears}
              onChange={e => patchRisk("timeHorizonYears", parseInt(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1 year</span><span>40 years</span>
            </div>
          </div>
          <div>
            <label className={LABEL}>Investment Style</label>
            <div className="grid grid-cols-3 gap-3">
              {(["conservative", "balanced", "aggressive"] as const).map(s => (
                <button key={s} type="button"
                  onClick={() => patchRisk("investmentStyle", s)}
                  className={`py-3 rounded-xl border-2 text-xs font-semibold capitalize transition-all ${profile.riskProfile.investmentStyle === s ? "border-primary bg-green-50 dark:bg-green-950/30 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/40"}`}
                >{s === "conservative" ? "🏦" : s === "balanced" ? "⚖️" : "📊"}<br />{s}</button>
              ))}
            </div>
          </div>
        </div>
      </Section>
    ),

    loans: (
      <Section title="Loans & Liabilities" icon={<CreditCard className="w-5 h-5" />}>
        <div className="space-y-3">
          {profile.loans.map((ln, i) => (
            <div key={ln.id} className="bg-muted rounded-xl p-4 border border-border">
              <div className="flex justify-between items-center mb-3">
                <input className="font-semibold text-sm bg-transparent border-b border-border focus:border-primary focus:outline-none px-1 flex-1 mr-3 text-foreground"
                  value={ln.lenderName} placeholder="Lender name"
                  onChange={e => { const u = [...profile.loans]; u[i] = { ...ln, lenderName: e.target.value }; setProfile(p => ({ ...p, loans: u })); }}
                />
                <button type="button" onClick={() => setProfile(p => ({ ...p, loans: p.loans.filter(x => x.id !== ln.id) }))} className="text-muted-foreground/60 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground block mb-1">Type</label>
                  <div className="relative">
                    <select className={SELECT} value={ln.type}
                      onChange={e => { const u = [...profile.loans]; u[i] = { ...ln, type: e.target.value as LoanEntry["type"] }; setProfile(p => ({ ...p, loans: u })); }}>
                      <option value="home">Home Loan</option>
                      <option value="car">Car Loan</option>
                      <option value="personal">Personal Loan</option>
                      <option value="education">Education Loan</option>
                      <option value="credit_card">Credit Card</option>
                      <option value="other">Other</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div><label className="text-xs text-muted-foreground block mb-1">Interest Rate (%)</label>
                  <input className={INPUT} type="number" value={ln.interestRate || ""}
                    onChange={e => { const u = [...profile.loans]; u[i] = { ...ln, interestRate: parseFloat(e.target.value) || 0 }; setProfile(p => ({ ...p, loans: u })); }} />
                </div>
                <div><label className="text-xs text-muted-foreground block mb-1">Outstanding (₹)</label>
                  <input className={INPUT} type="number" value={ln.outstandingAmount || ""}
                    onChange={e => { const u = [...profile.loans]; u[i] = { ...ln, outstandingAmount: parseFloat(e.target.value) || 0 }; setProfile(p => ({ ...p, loans: u })); }} />
                </div>
                <div><label className="text-xs text-muted-foreground block mb-1">Monthly EMI (₹)</label>
                  <input className={INPUT} type="number" value={ln.emi || ""}
                    onChange={e => { const u = [...profile.loans]; u[i] = { ...ln, emi: parseFloat(e.target.value) || 0 }; setProfile(p => ({ ...p, loans: u })); }} />
                </div>
                <div><label className="text-xs text-muted-foreground block mb-1">Remaining Months</label>
                  <input className={INPUT} type="number" value={ln.remainingMonths || ""}
                    onChange={e => { const u = [...profile.loans]; u[i] = { ...ln, remainingMonths: parseInt(e.target.value) || 0 }; setProfile(p => ({ ...p, loans: u })); }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button"
          onClick={() => setProfile(p => ({ ...p, loans: [...p.loans, { id: uid(), type: "home", lenderName: "", loanAmount: 0, outstandingAmount: 0, emi: 0, interestRate: 0, remainingMonths: 0 }] }))}
          className="mt-3 flex items-center gap-2 text-sm text-primary font-semibold hover:underline"
        ><Plus className="w-4 h-4" /> Add loan</button>
      </Section>
    ),

    security: (
      <Section title="Security" icon={<Lock className="w-5 h-5" />}>
        <SecuritySection showToast={showToast} userId={user?.id ?? ""} />
      </Section>
    ),
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 pt-24 pb-16">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <SettingsIcon className="w-6 h-6 text-primary" /> Settings
              </h1>
              <p className="text-sm text-muted-foreground">Manage your profile and financial data</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-[#2D7A4E] text-white rounded-xl text-sm font-semibold hover:shadow-md hover:scale-105 transition-all"
          >
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="hidden md:block w-52 flex-shrink-0">
            <nav className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden sticky top-24">
              {TABS.map(tab => (
                <button key={tab.id} type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all ${activeTab === tab.id
                    ? "bg-gradient-to-r from-primary to-[#2D7A4E] text-white"
                    : "text-muted-foreground hover:bg-muted"
                    }`}
                >
                  {tab.icon}{tab.label}
                  {activeTab !== tab.id && <ChevronRight className="w-3.5 h-3.5 ml-auto text-muted-foreground/50" />}
                </button>
              ))}

              {/* Logout in sidebar */}
              <button type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all border-t border-border mt-2"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </nav>
          </aside>

          {/* Mobile tab picker */}
          <div className="md:hidden mb-4 w-full">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {TABS.map(tab => (
                <button key={tab.id} type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all ${activeTab === tab.id ? "bg-primary text-white" : "bg-card border border-border text-muted-foreground"
                    }`}
                >{tab.icon}{tab.label}</button>
              ))}
            </div>
          </div>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-card rounded-2xl border border-border shadow-sm p-6"
              >
                {tabContent[activeTab]}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-semibold ${toast.ok ? "bg-primary" : "bg-red-500"}`}
          >
            {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}

// ── Theme picker ───────────────────────────────────────────────────────────────
// Three-way control: System (default, follows OS), Light, Dark. Persists via
// ThemeContext (localStorage) and applies instantly across the whole app.
function ThemePicker() {
  const { preference, setPreference } = useTheme();

  const OPTIONS: { id: ThemePreference; label: string; icon: React.ReactNode }[] = [
    { id: "system", label: "System", icon: <Monitor className="w-4 h-4" /> },
    { id: "light", label: "Light", icon: <Sun className="w-4 h-4" /> },
    { id: "dark", label: "Dark", icon: <Moon className="w-4 h-4" /> },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 max-w-sm">
      {OPTIONS.map(opt => (
        <button key={opt.id} type="button"
          onClick={() => setPreference(opt.id)}
          className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${preference === opt.id
            ? "border-primary bg-green-50 dark:bg-green-950/30 text-primary"
            : "border-border text-muted-foreground hover:border-muted-foreground/40"
            }`}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-950/40 flex items-center justify-center text-primary">
          {icon}
        </div>
        <h2 className="font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Password change section ───────────────────────────────────────────────────

function SecuritySection({ showToast, userId }: { showToast: (m: string, ok?: boolean) => void; userId: string }) {
  const [curr, setCurr] = useState("");
  const [next, setNext] = useState("");
  const [conf, setConf] = useState("");
  const [showCurr, setSC] = useState(false);
  const [showNext, setSN] = useState(false);

  function handleChange() {
    if (!curr) { showToast("Enter your current password", false); return; }
    if (next.length < 8) { showToast("New password must be at least 8 characters", false); return; }
    if (next !== conf) { showToast("Passwords do not match", false); return; }

    // Update in the localStorage users DB
    try {
      const db = JSON.parse(localStorage.getItem("sf_users_db") || "{}");
      const userEntry = Object.values(db).find((u: any) => u.id === userId) as any;
      if (!userEntry) { showToast("User not found", false); return; }
      if (userEntry.passwordHash !== curr) { showToast("Current password is incorrect", false); return; }
      db[userEntry.email].passwordHash = next;
      localStorage.setItem("sf_users_db", JSON.stringify(db));
      showToast("Password changed successfully!");
      setCurr(""); setNext(""); setConf("");
    } catch { showToast("Error updating password", false); }
  }

  return (
    <div className="max-w-sm space-y-4">
      <div>
        <label className={LABEL}>Current Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className={`${INPUT} pl-10 pr-10`} type={showCurr ? "text" : "password"}
            value={curr} onChange={e => setCurr(e.target.value)} placeholder="••••••••" />
          <button type="button" onClick={() => setSC(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {showCurr ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className={LABEL}>New Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className={`${INPUT} pl-10 pr-10`} type={showNext ? "text" : "password"}
            value={next} onChange={e => setNext(e.target.value)} placeholder="Min 8 characters" />
          <button type="button" onClick={() => setSN(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className={LABEL}>Confirm New Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className={`${INPUT} pl-10`} type="password"
            value={conf} onChange={e => setConf(e.target.value)} placeholder="Re-enter new password" />
        </div>
      </div>
      <button type="button" onClick={handleChange}
        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-[#2D7A4E] text-white rounded-xl text-sm font-semibold hover:shadow-md transition-all"
      >
        <Save className="w-4 h-4" /> Update Password
      </button>
    </div>
  );
}

// ── Financial Advisor Section (Phase 7.1 Step 7) ──────────────────────────────

function AdvisorSettingsSection({ showToast }: { showToast: (m: string, ok?: boolean) => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRel, setActiveRel] = useState<ActiveAdvisorRelationship | null>(null);
  const [pendingRequests, setPendingRequests] = useState<UserAdvisorRequest[]>([]);

  // Mutation states
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
  const [disconnectReason, setDisconnectReason] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);

  // Authoritative load function with race-condition prevention
  const activeReqRef = useRef(0);
  const loadAdvisorState = useCallback(async () => {
    const reqId = ++activeReqRef.current;
    setLoading(true);
    setError(null);

    try {
      const [activeRes, requestsRes] = await Promise.all([
        userAdvisorAPI.getActiveAdvisor(),
        userAdvisorAPI.getRequests(),
      ]);

      if (reqId !== activeReqRef.current) return;

      if (activeRes.data?.hasActiveAdvisor && activeRes.data.relationship) {
        setActiveRel(activeRes.data.relationship);
      } else {
        setActiveRel(null);
      }

      setPendingRequests(requestsRes.data?.requests || []);
    } catch (err: any) {
      if (reqId !== activeReqRef.current) return;
      setError(err.message || "Failed to load advisor relationship state.");
    } finally {
      if (reqId === activeReqRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadAdvisorState();
  }, [loadAdvisorState]);

  async function handleAccept(requestId: string) {
    setAcceptingId(requestId);
    try {
      await userAdvisorAPI.acceptRequest(requestId);
      showToast("Financial advisor connection accepted!");
      await loadAdvisorState();
    } catch (err: any) {
      const code = err.data?.errors?.code || err.data?.code;
      if (code === "USER_ALREADY_HAS_ADVISOR") {
        showToast("You already have an active financial advisor.", false);
      } else if (code === "REQUEST_NOT_PENDING") {
        showToast("This connection request is no longer pending.", false);
      } else if (code === "ADVISOR_NOT_ELIGIBLE") {
        showToast("This advisor is no longer eligible or active.", false);
      } else {
        showToast(err.message || "Failed to accept advisor request.", false);
      }
      await loadAdvisorState();
    } finally {
      setAcceptingId(null);
    }
  }

  async function handleReject(requestId: string) {
    setRejectingId(requestId);
    try {
      await userAdvisorAPI.rejectRequest(requestId);
      showToast("Connection request declined.");
      await loadAdvisorState();
    } catch (err: any) {
      showToast(err.message || "Failed to decline advisor request.", false);
      await loadAdvisorState();
    } finally {
      setRejectingId(null);
    }
  }

  async function handleConfirmDisconnect() {
    setDisconnecting(true);
    try {
      await userAdvisorAPI.terminateAdvisor(disconnectReason.trim() || undefined);
      showToast("Financial advisor relationship disconnected.");
      setDisconnectModalOpen(false);
      setDisconnectReason("");
      setActiveRel(null);
      await loadAdvisorState();
    } catch (err: any) {
      const code = err.data?.errors?.code || err.data?.code;
      if (code === "NO_ACTIVE_ADVISOR") {
        showToast("No active advisor relationship found.", false);
        setActiveRel(null);
        setDisconnectModalOpen(false);
      } else {
        showToast(err.message || "Failed to disconnect advisor.", false);
      }
      await loadAdvisorState();
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <Section title="Financial Advisor Management" icon={<Briefcase className="w-5 h-5" />}>
      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : error ? (
        <div className="p-5 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between text-xs text-red-800">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadAdvisorState}
            className="px-3 py-1.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Advisor Section */}
          {activeRel ? (
            <div className="bg-emerald-50/50 border border-emerald-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-emerald-200/60">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#1A5F3D] text-white font-bold text-xl flex items-center justify-center shadow-md shrink-0">
                    {activeRel.advisor.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {activeRel.advisor.fullName}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#1A5F3D] text-xs font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Active Advisor
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      {activeRel.advisor.firmName}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDisconnectModalOpen(true)}
                  className="px-4 py-2 border border-red-200 bg-white hover:bg-red-50 text-red-600 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 self-start sm:self-center shadow-xs cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  Disconnect Advisor
                </button>
              </div>

              {/* Advisor Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {activeRel.advisor.licenseNumber && (
                  <div className="p-3.5 rounded-xl bg-white border border-emerald-200/60 space-y-0.5">
                    <span className="text-gray-400 block text-[11px]">SEBI / Registration #</span>
                    <span className="font-semibold text-gray-800 font-mono">
                      {activeRel.advisor.licenseNumber}
                    </span>
                  </div>
                )}

                {activeRel.advisor.email && (
                  <div className="p-3.5 rounded-xl bg-white border border-emerald-200/60 space-y-0.5">
                    <span className="text-gray-400 block text-[11px]">Advisor Email</span>
                    <span className="font-semibold text-gray-800 font-mono">
                      {activeRel.advisor.email}
                    </span>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-white border border-emerald-200/60 space-y-0.5">
                  <span className="text-gray-400 block text-[11px]">Connected Since</span>
                  <span className="font-semibold text-gray-800">
                    {new Date(activeRel.connectedSince).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-emerald-200/60 space-y-0.5">
                  <span className="text-gray-400 block text-[11px]">Relationship Status</span>
                  <span className="font-semibold text-emerald-700 capitalize">
                    {activeRel.status} (Authorized)
                  </span>
                </div>
              </div>

              {/* Specializations */}
              {activeRel.advisor.specializations.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Advisor Specializations
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {activeRel.advisor.specializations.map((spec) => (
                      <span
                        key={spec}
                        className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-[#1A5F3D] text-xs font-medium"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500 bg-white/70 p-3 rounded-xl border border-emerald-200/50 leading-relaxed">
                Your advisor has authorized read-only visibility into your SmartFinance portfolio to help optimize
                your investments and track your wealth goals. You can disconnect this relationship at any time.
              </p>
            </div>
          ) : (
            /* No Active Advisor View */
            <div className="bg-gray-50/70 border border-gray-200 rounded-3xl p-6 sm:p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-[#1A5F3D] flex items-center justify-center mx-auto shadow-inner">
                <Briefcase className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-bold text-gray-900">
                  Connect with a Financial Advisor
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Collaborate with a certified wealth advisor to get tailored advice on your investments,
                  loans, tax efficiency, and long-term financial goals.
                </p>
              </div>

              <div className="max-w-md mx-auto p-4 rounded-2xl bg-white border border-gray-200/80 text-left text-xs text-gray-600 space-y-1">
                <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-[#1A5F3D]" />
                  Have an Advisor Invitation Link?
                </div>
                <p className="text-gray-500 text-[11px] leading-relaxed">
                  If an advisor issued you an invitation, open the secure connection link provided in your invitation email to link your account.
                </p>
              </div>
            </div>
          )}

          {/* Pending Connection Requests Section */}
          {pendingRequests.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#1A5F3D]" />
                  Pending Connection Requests
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#1A5F3D] text-xs font-semibold">
                    {pendingRequests.length}
                  </span>
                </h3>
              </div>

              <div className="space-y-3">
                {pendingRequests.map((req) => {
                  const isAccepting = acceptingId === req.requestId;
                  const isRejecting = rejectingId === req.requestId;
                  const isBusy = isAccepting || isRejecting;

                  return (
                    <div
                      key={req.requestId}
                      className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#1A5F3D] font-bold flex items-center justify-center text-sm shrink-0">
                            {req.advisor.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-gray-900 truncate">
                              {req.advisor.fullName}
                            </h4>
                            <p className="text-xs text-gray-500 truncate">
                              {req.advisor.firmName}
                            </p>
                          </div>
                        </div>

                        {req.notes && (
                          <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100 italic">
                            "{req.notes}"
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
                          <span>
                            Requested on{" "}
                            {new Date(req.requestedAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          {req.advisor.specializations.length > 0 && (
                            <span>• {req.advisor.specializations.join(", ")}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleReject(req.requestId)}
                          className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isRejecting ? "Declining..." : "Decline"}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleAccept(req.requestId)}
                          className="px-4 py-2 bg-[#1A5F3D] hover:bg-[#154d31] text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          {isAccepting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Accept Request
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Disconnect Confirmation Dialog */}
          <Dialog open={disconnectModalOpen} onOpenChange={setDisconnectModalOpen}>
            <DialogContent className="max-w-md bg-white rounded-3xl p-6 sm:p-8 space-y-4">
              <DialogHeader>
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-2">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <DialogTitle className="text-center text-lg font-bold text-gray-900">
                  Disconnect Financial Advisor?
                </DialogTitle>
                <DialogDescription className="text-center text-xs text-gray-500 leading-relaxed">
                  Disconnecting will immediately end your active advisor relationship. Your advisor will
                  no longer have access to your financial data, portfolio, or goals. Your financial data
                  remains securely in your SmartFinance account.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-semibold text-gray-700">
                  Reason for disconnecting <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Switching investment strategy, moving to self-directed portfolios..."
                  value={disconnectReason}
                  onChange={(e) => setDisconnectReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all resize-none"
                />
              </div>

              <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  disabled={disconnecting}
                  onClick={() => setDisconnectModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Keep Advisor
                </button>
                <button
                  type="button"
                  disabled={disconnecting}
                  onClick={handleConfirmDisconnect}
                  className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {disconnecting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    "Confirm Disconnection"
                  )}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </Section>
  );
}