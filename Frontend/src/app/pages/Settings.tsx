import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  User, Mail, Phone, Calendar, Briefcase, MapPin,
  DollarSign, TrendingUp, Target, CreditCard, ShieldCheck,
  LogOut, Camera, Save, AlertCircle, CheckCircle,
  ChevronDown, ChevronRight, Plus, Trash2, Lock, Eye, EyeOff,
  ArrowLeft, Settings as SettingsIcon, PieChart,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import {
  type UserProfile, type ExpenseEntry, type FinancialGoalEntry,
  type InvestmentEntry, type LoanEntry,
  getUserProfile, saveUserProfile, emptyProfile,
} from "../data/userProfile";
import { syncProfileToFinancialData } from "../data/syncProfile";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

// ── Shared input styles ───────────────────────────────────────────────────────

const INPUT  = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A5F3D]/30 focus:border-[#1A5F3D] transition-all bg-white";
const LABEL  = "block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide";
const SELECT = `${INPUT} appearance-none`;

function uid() { return `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }
function fmt(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(0)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

type TabId = "account" | "profile" | "income" | "expenses" | "goals" | "investments" | "risk" | "loans" | "security";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "account",     label: "Account",      icon: <User       className="w-4 h-4" /> },
  { id: "profile",     label: "Profile",      icon: <MapPin     className="w-4 h-4" /> },
  { id: "income",      label: "Income",       icon: <DollarSign className="w-4 h-4" /> },
  { id: "expenses",    label: "Expenses",     icon: <PieChart   className="w-4 h-4" /> },
  { id: "goals",       label: "Goals",        icon: <Target     className="w-4 h-4" /> },
  { id: "investments", label: "Investments",  icon: <TrendingUp className="w-4 h-4" /> },
  { id: "risk",        label: "Risk Profile", icon: <ShieldCheck className="w-4 h-4" /> },
  { id: "loans",       label: "Loans",        icon: <CreditCard className="w-4 h-4" /> },
  { id: "security",    label: "Security",     icon: <Lock       className="w-4 h-4" /> },
];

// ── Main Component ────────────────────────────────────────────────────────────

export function Settings() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabId>("account");
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
      name:   profile.personal.fullName || user?.name,
      phone:  profile.personal.mobile,
      avatar: profile.personal.avatarDataUrl,
    });
    showToast("Changes saved successfully!");
  }

  function handleLogout() {
    logout();
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
            className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center text-white text-2xl font-bold cursor-pointer overflow-hidden border-4 border-white shadow-lg flex-shrink-0"
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
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
            >
              <Camera className="w-4 h-4" /> Change Photo
            </button>
            <p className="text-xs text-gray-400 mt-1.5">JPG or PNG, max 2MB</p>
          </div>
          <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className={`${INPUT} pl-10`} value={profile.personal.fullName}
                onChange={e => patchPersonal("fullName", e.target.value)} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className={`${INPUT} pl-10`} type="email" value={profile.personal.email}
                onChange={e => patchPersonal("email", e.target.value)} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Mobile Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className={`${INPUT} pl-10`} type="tel" value={profile.personal.mobile}
                onChange={e => patchPersonal("mobile", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </Section>
    ),

    profile: (
      <Section title="Personal Details" icon={<MapPin className="w-5 h-5" />}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Date of Birth</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className={LABEL}>Occupation</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
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
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
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
          <div className="mt-4 bg-green-50 rounded-xl p-4">
            <p className="text-sm text-green-800">
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
            <div key={exp.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
              <span className="text-xl w-7">{exp.icon}</span>
              <input
                className="flex-1 bg-transparent border-b border-gray-200 focus:border-[#1A5F3D] focus:outline-none text-sm py-0.5"
                value={exp.category}
                onChange={e => {
                  const u = [...profile.expenses]; u[i] = { ...exp, category: e.target.value };
                  setProfile(p => ({ ...p, expenses: u }));
                }}
              />
              <span className="text-xs text-gray-400">₹</span>
              <input
                className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-[#1A5F3D]/40"
                type="number"
                value={exp.amount || ""}
                onChange={e => {
                  const u = [...profile.expenses]; u[i] = { ...exp, amount: parseFloat(e.target.value) || 0 };
                  setProfile(p => ({ ...p, expenses: u }));
                }}
              />
              <button type="button" onClick={() => setProfile(p => ({ ...p, expenses: p.expenses.filter(x => x.id !== exp.id) }))}
                className="p-1 text-gray-300 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
        <button type="button"
          onClick={() => setProfile(p => ({ ...p, expenses: [...p.expenses, { id: uid(), category: "Other", amount: 0, icon: "📦", color: "#8BC34A" }] }))}
          className="mt-3 flex items-center gap-2 text-sm text-[#1A5F3D] font-semibold hover:underline"
        ><Plus className="w-4 h-4" /> Add category</button>
        {profile.expenses.length > 0 && (
          <div className="mt-4 bg-blue-50 rounded-xl p-3">
            <p className="text-sm text-blue-800">
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
            <div key={g.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{g.icon}</span>
                  <input className="font-semibold text-sm bg-transparent border-b border-gray-300 focus:border-[#1A5F3D] focus:outline-none px-1"
                    value={g.name}
                    onChange={e => { const u = [...profile.goals]; u[i] = { ...g, name: e.target.value }; setProfile(p => ({ ...p, goals: u })); }}
                  />
                </div>
                <button type="button" onClick={() => setProfile(p => ({ ...p, goals: p.goals.filter(x => x.id !== g.id) }))} className="text-gray-300 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 block mb-1">Target (₹)</label>
                  <input className={INPUT} type="number" value={g.targetAmount || ""}
                    onChange={e => { const u = [...profile.goals]; u[i] = { ...g, targetAmount: parseFloat(e.target.value) || 0 }; setProfile(p => ({ ...p, goals: u })); }} />
                </div>
                <div><label className="text-xs text-gray-500 block mb-1">Current Savings (₹)</label>
                  <input className={INPUT} type="number" value={g.currentSavings || ""}
                    onChange={e => { const u = [...profile.goals]; u[i] = { ...g, currentSavings: parseFloat(e.target.value) || 0 }; setProfile(p => ({ ...p, goals: u })); }} />
                </div>
                <div><label className="text-xs text-gray-500 block mb-1">Target Date</label>
                  <input className={INPUT} type="date" value={g.targetDate}
                    onChange={e => { const u = [...profile.goals]; u[i] = { ...g, targetDate: e.target.value }; setProfile(p => ({ ...p, goals: u })); }} />
                </div>
                <div><label className="text-xs text-gray-500 block mb-1">Priority</label>
                  <div className="relative">
                    <select className={SELECT} value={g.priority}
                      onChange={e => { const u = [...profile.goals]; u[i] = { ...g, priority: e.target.value as FinancialGoalEntry["priority"] }; setProfile(p => ({ ...p, goals: u })); }}>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button"
          onClick={() => setProfile(p => ({ ...p, goals: [...p.goals, { id: uid(), name: "New Goal", targetAmount: 0, targetDate: "", priority: "medium", currentSavings: 0, category: "other", icon: "⭐" }] }))}
          className="mt-3 flex items-center gap-2 text-sm text-[#1A5F3D] font-semibold hover:underline"
        ><Plus className="w-4 h-4" /> Add goal</button>
      </Section>
    ),

    investments: (
      <Section title="Investment Portfolio" icon={<TrendingUp className="w-5 h-5" />}>
        <div className="space-y-3">
          {profile.investments.map((inv, i) => (
            <div key={inv.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <input className="font-semibold text-sm bg-transparent border-b border-gray-300 focus:border-[#1A5F3D] focus:outline-none px-1 flex-1 mr-3"
                  value={inv.name}
                  onChange={e => { const u = [...profile.investments]; u[i] = { ...inv, name: e.target.value }; setProfile(p => ({ ...p, investments: u })); }}
                />
                <button type="button" onClick={() => setProfile(p => ({ ...p, investments: p.investments.filter(x => x.id !== inv.id) }))} className="text-gray-300 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 block mb-1">Type</label>
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
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div><label className="text-xs text-gray-500 block mb-1">Expected Return (%)</label>
                  <input className={INPUT} type="number" value={inv.expectedReturn || ""}
                    onChange={e => { const u = [...profile.investments]; u[i] = { ...inv, expectedReturn: parseFloat(e.target.value) || 0 }; setProfile(p => ({ ...p, investments: u })); }} />
                </div>
                <div><label className="text-xs text-gray-500 block mb-1">Invested (₹)</label>
                  <input className={INPUT} type="number" value={inv.investedAmount || ""}
                    onChange={e => { const u = [...profile.investments]; u[i] = { ...inv, investedAmount: parseFloat(e.target.value) || 0 }; setProfile(p => ({ ...p, investments: u })); }} />
                </div>
                <div><label className="text-xs text-gray-500 block mb-1">Current Value (₹)</label>
                  <input className={INPUT} type="number" value={inv.currentValue || ""}
                    onChange={e => { const u = [...profile.investments]; u[i] = { ...inv, currentValue: parseFloat(e.target.value) || 0 }; setProfile(p => ({ ...p, investments: u })); }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button"
          onClick={() => setProfile(p => ({ ...p, investments: [...p.investments, { id: uid(), type: "mutual_fund", name: "New Investment", investedAmount: 0, currentValue: 0, durationMonths: 12, expectedReturn: 12 }] }))}
          className="mt-3 flex items-center gap-2 text-sm text-[#1A5F3D] font-semibold hover:underline"
        ><Plus className="w-4 h-4" /> Add investment</button>
      </Section>
    ),

    risk: (
      <Section title="Risk Profile" icon={<ShieldCheck className="w-5 h-5" />}>
        <div className="space-y-6">
          <div>
            <label className={LABEL}>Risk Tolerance</label>
            <div className="grid grid-cols-3 gap-3">
              {(["low","medium","high"] as const).map(l => (
                <button key={l} type="button"
                  onClick={() => patchRisk("tolerance", l)}
                  className={`py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${profile.riskProfile.tolerance === l ? "border-[#1A5F3D] bg-green-50 text-[#1A5F3D]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                >{l === "low" ? "🛡️" : l === "medium" ? "⚖️" : "🚀"} {l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className={LABEL}>Investment Experience</label>
            <div className="grid grid-cols-3 gap-3">
              {(["beginner","intermediate","expert"] as const).map(l => (
                <button key={l} type="button"
                  onClick={() => patchRisk("experience", l)}
                  className={`py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${profile.riskProfile.experience === l ? "border-[#1A5F3D] bg-green-50 text-[#1A5F3D]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                >{l === "beginner" ? "🌱" : l === "intermediate" ? "📈" : "🏆"} {l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className={LABEL}>Time Horizon: {profile.riskProfile.timeHorizonYears} years</label>
            <input type="range" min="1" max="40" step="1"
              value={profile.riskProfile.timeHorizonYears}
              onChange={e => patchRisk("timeHorizonYears", parseInt(e.target.value))}
              className="w-full accent-[#1A5F3D]"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 year</span><span>40 years</span>
            </div>
          </div>
          <div>
            <label className={LABEL}>Investment Style</label>
            <div className="grid grid-cols-3 gap-3">
              {(["conservative","balanced","aggressive"] as const).map(s => (
                <button key={s} type="button"
                  onClick={() => patchRisk("investmentStyle", s)}
                  className={`py-3 rounded-xl border-2 text-xs font-semibold capitalize transition-all ${profile.riskProfile.investmentStyle === s ? "border-[#1A5F3D] bg-green-50 text-[#1A5F3D]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
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
            <div key={ln.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <input className="font-semibold text-sm bg-transparent border-b border-gray-300 focus:border-[#1A5F3D] focus:outline-none px-1 flex-1 mr-3"
                  value={ln.lenderName} placeholder="Lender name"
                  onChange={e => { const u = [...profile.loans]; u[i] = { ...ln, lenderName: e.target.value }; setProfile(p => ({ ...p, loans: u })); }}
                />
                <button type="button" onClick={() => setProfile(p => ({ ...p, loans: p.loans.filter(x => x.id !== ln.id) }))} className="text-gray-300 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 block mb-1">Type</label>
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
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div><label className="text-xs text-gray-500 block mb-1">Interest Rate (%)</label>
                  <input className={INPUT} type="number" value={ln.interestRate || ""}
                    onChange={e => { const u = [...profile.loans]; u[i] = { ...ln, interestRate: parseFloat(e.target.value) || 0 }; setProfile(p => ({ ...p, loans: u })); }} />
                </div>
                <div><label className="text-xs text-gray-500 block mb-1">Outstanding (₹)</label>
                  <input className={INPUT} type="number" value={ln.outstandingAmount || ""}
                    onChange={e => { const u = [...profile.loans]; u[i] = { ...ln, outstandingAmount: parseFloat(e.target.value) || 0 }; setProfile(p => ({ ...p, loans: u })); }} />
                </div>
                <div><label className="text-xs text-gray-500 block mb-1">Monthly EMI (₹)</label>
                  <input className={INPUT} type="number" value={ln.emi || ""}
                    onChange={e => { const u = [...profile.loans]; u[i] = { ...ln, emi: parseFloat(e.target.value) || 0 }; setProfile(p => ({ ...p, loans: u })); }} />
                </div>
                <div><label className="text-xs text-gray-500 block mb-1">Remaining Months</label>
                  <input className={INPUT} type="number" value={ln.remainingMonths || ""}
                    onChange={e => { const u = [...profile.loans]; u[i] = { ...ln, remainingMonths: parseInt(e.target.value) || 0 }; setProfile(p => ({ ...p, loans: u })); }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button"
          onClick={() => setProfile(p => ({ ...p, loans: [...p.loans, { id: uid(), type: "home", lenderName: "", loanAmount: 0, outstandingAmount: 0, emi: 0, interestRate: 0, remainingMonths: 0 }] }))}
          className="mt-3 flex items-center gap-2 text-sm text-[#1A5F3D] font-semibold hover:underline"
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
    <div className="min-h-screen bg-[#F7F9FB]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 pt-24 pb-16">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="p-2 rounded-xl hover:bg-gray-200 transition-colors text-gray-500">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <SettingsIcon className="w-6 h-6 text-[#1A5F3D]" /> Settings
              </h1>
              <p className="text-sm text-gray-500">Manage your profile and financial data</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] text-white rounded-xl text-sm font-semibold hover:shadow-md hover:scale-105 transition-all"
          >
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="hidden md:block w-52 flex-shrink-0">
            <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-24">
              {TABS.map(tab => (
                <button key={tab.id} type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {tab.icon}{tab.label}
                  {activeTab !== tab.id && <ChevronRight className="w-3.5 h-3.5 ml-auto text-gray-300" />}
                </button>
              ))}

              {/* Logout in sidebar */}
              <button type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-all border-t border-gray-100 mt-2"
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all ${
                    activeTab === tab.id ? "bg-[#1A5F3D] text-white" : "bg-white border border-gray-200 text-gray-600"
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
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
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
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-semibold ${toast.ok ? "bg-[#1A5F3D]" : "bg-red-500"}`}
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

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-[#1A5F3D]">
          {icon}
        </div>
        <h2 className="font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Password change section ───────────────────────────────────────────────────

function SecuritySection({ showToast, userId }: { showToast: (m: string, ok?: boolean) => void; userId: string }) {
  const [curr, setCurr]   = useState("");
  const [next, setNext]   = useState("");
  const [conf, setConf]   = useState("");
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
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className={`${INPUT} pl-10 pr-10`} type={showCurr ? "text" : "password"}
            value={curr} onChange={e => setCurr(e.target.value)} placeholder="••••••••" />
          <button type="button" onClick={() => setSC(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showCurr ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className={LABEL}>New Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className={`${INPUT} pl-10 pr-10`} type={showNext ? "text" : "password"}
            value={next} onChange={e => setNext(e.target.value)} placeholder="Min 8 characters" />
          <button type="button" onClick={() => setSN(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className={LABEL}>Confirm New Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className={`${INPUT} pl-10`} type="password"
            value={conf} onChange={e => setConf(e.target.value)} placeholder="Re-enter new password" />
        </div>
      </div>
      <button type="button" onClick={handleChange}
        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] text-white rounded-xl text-sm font-semibold hover:shadow-md transition-all"
      >
        <Save className="w-4 h-4" /> Update Password
      </button>
    </div>
  );
}