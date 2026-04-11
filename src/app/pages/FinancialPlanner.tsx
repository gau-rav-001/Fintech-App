import { useMemo, useState, useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import {
  ChevronRight,
  ChevronLeft,
  Download,
  Target,
  User,
  Briefcase,
  MapPin,
  Heart,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Info,
  ShieldCheck,
  IndianRupee,
  Clock,
  Star,
  Home,
  Key,
  Users,
  Building2,
  Laptop,
  Store,
  Activity,
  BookOpen,
  BarChart2,
  Zap,
  GraduationCap,
  PiggyBank,
  Shield,
  Cigarette,
  Stethoscope,
  Landmark,
  Globe,
  TreePine,
  Minus,
  Baby,
  UserPlus,
  UserCheck,
  CircleDot,
  Sun,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
import { useAuth } from "../auth/AuthContext";
import { getUserProfile, saveUserProfile } from "../data/userProfile";
import { syncProfileToFinancialData } from "../data/syncProfile";

const STEPS = [
  { id: "basic",      label: "Basic Details",   icon: <User className="w-4 h-4" /> },
  { id: "employment", label: "Employment",       icon: <Briefcase className="w-4 h-4" /> },
  { id: "lifestyle",  label: "Lifestyle",        icon: <MapPin className="w-4 h-4" /> },
  { id: "health",     label: "Health",           icon: <Heart className="w-4 h-4" /> },
  { id: "goals",      label: "Goals",            icon: <Target className="w-4 h-4" /> },
  { id: "results",    label: "Your Plan",        icon: <Star className="w-4 h-4" /> },
];

type FormData = {
  name: string; dob: string; maritalStatus: string; dependents: string;
  employmentType: string; incomeStability: string; monthlyIncome: string;
  cityTier: string; livingStatus: string; financialKnowledge: string;
  smoking: string; medicalConditions: string;
  goalType: string; goalAmount: string; yearsToGoal: string;
  currentSavings: string; monthlyExpenses: string;
};

const INITIAL: FormData = {
  name: "", dob: "", maritalStatus: "", dependents: "",
  employmentType: "", incomeStability: "", monthlyIncome: "",
  cityTier: "", livingStatus: "", financialKnowledge: "",
  smoking: "", medicalConditions: "",
  goalType: "", goalAmount: "", yearsToGoal: "", currentSavings: "", monthlyExpenses: "",
};

function calcAge(dob: string): number | null {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function calcLifeStage(age: number | null): string {
  if (age === null) return "—";
  if (age < 30) return "Early Career";
  if (age <= 50) return "Mid Career";
  return "Late Career";
}

function calcRiskScore(f: FormData, age: number | null): number {
  let score = 50;
  if (age !== null) {
    if (age < 25) score += 20;
    else if (age < 35) score += 12;
    else if (age < 45) score += 4;
    else if (age < 55) score -= 6;
    else score -= 15;
  }
  const deps = parseInt(f.dependents || "0");
  score -= deps * 5;
  if (f.employmentType === "salaried") score += 8;
  if (f.employmentType === "business") score -= 5;
  if (f.incomeStability === "stable") score += 10;
  if (f.incomeStability === "moderate") score += 2;
  if (f.incomeStability === "uncertain") score -= 12;
  if (f.financialKnowledge === "advanced") score += 10;
  if (f.financialKnowledge === "intermediate") score += 3;
  if (f.financialKnowledge === "beginner") score -= 8;
  if (f.maritalStatus === "married") score -= 3;
  return Math.max(5, Math.min(95, score));
}

function riskProfile(score: number) {
  if (score >= 70) return { label: "Aggressive", color: "#1A5F3D", accent: "#D8F46B" };
  if (score >= 45) return { label: "Moderate",   color: "#2563EB", accent: "#93C5FD" };
  return                 { label: "Conservative", color: "#B45309", accent: "#FDE68A" };
}

function calcAllocation(score: number) {
  if (score >= 70) return [
    { name: "Equity Funds",   value: 65, color: "#1A5F3D" },
    { name: "Debt Funds",     value: 20, color: "#2D7A4E" },
    { name: "Gold",           value: 10, color: "#3FAF7D" },
    { name: "Emergency Fund", value:  5, color: "#B8E986" },
  ];
  if (score >= 45) return [
    { name: "Equity Funds",   value: 50, color: "#1A5F3D" },
    { name: "Debt Funds",     value: 30, color: "#2D7A4E" },
    { name: "Gold",           value: 12, color: "#3FAF7D" },
    { name: "Emergency Fund", value:  8, color: "#B8E986" },
  ];
  return [
    { name: "Equity Funds",   value: 30, color: "#1A5F3D" },
    { name: "Debt Funds",     value: 45, color: "#2D7A4E" },
    { name: "Gold",           value: 15, color: "#3FAF7D" },
    { name: "Emergency Fund", value: 10, color: "#B8E986" },
  ];
}

function calcSIP(goalAmount: string, years: string, score: number): number {
  const G = parseFloat(goalAmount) || 0;
  const n = (parseFloat(years) || 10) * 12;
  const annualRate = score >= 70 ? 0.12 : score >= 45 ? 0.10 : 0.08;
  const r = annualRate / 12;
  if (r === 0) return Math.round(G / n);
  const fv = ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  return Math.round(G / fv);
}

function calcInsuranceCover(f: FormData) {
  const income = (parseFloat(f.monthlyIncome) || 50000) * 12;
  const deps = parseInt(f.dependents || "0");
  const multiplier = deps >= 3 ? 15 : deps === 2 ? 13 : deps === 1 ? 12 : 10;
  const lifeCover = income * multiplier;
  const healthBase = f.cityTier === "tier1" ? 1000000 : f.cityTier === "tier2" ? 750000 : 500000;
  let riskFlag: string | null = null;
  if (f.smoking === "yes") riskFlag = "Smoker premium loading may apply (+15–25%). Getting covered early locks in better rates.";
  else if (f.medicalConditions === "yes") riskFlag = "Pre-existing conditions may lead to waiting periods or exclusions. Riders and comprehensive plans recommended.";
  const fmt = (n: number) =>
    n >= 10000000 ? `₹${(n / 10000000).toFixed(1)} Cr`
    : n >= 100000  ? `₹${(n / 100000).toFixed(0)} L`
    : `₹${n.toLocaleString("en-IN")}`;
  return { life: fmt(lifeCover), health: fmt(healthBase), riskFlag };
}

function calcEmergencyFund(monthlyExpenses: string): string {
  const exp = parseFloat(monthlyExpenses) || 0;
  const fund = exp * 6;
  if (fund >= 10000000) return `₹${(fund / 10000000).toFixed(1)} Cr`;
  if (fund >= 100000) return `₹${(fund / 100000).toFixed(1)} L`;
  return `₹${fund.toLocaleString("en-IN")}`;
}

function buildRecommendations(f: FormData, profile: string, lifeStage: string): string[] {
  const recs: string[] = [];
  if (profile === "Aggressive") {
    recs.push("Allocate 65% to diversified equity mutual funds — large-cap (60%) + mid-cap (40%) mix.");
    recs.push("Use monthly SIP in Nifty 50 index funds for the core equity allocation.");
  } else if (profile === "Moderate") {
    recs.push("Split equity between large-cap funds (70%) and mid-cap (30%) for balanced growth.");
    recs.push("Hybrid mutual funds help reduce volatility while maintaining growth potential.");
  } else {
    recs.push("Focus on debt mutual funds, PPF, and FDs for capital preservation with steady returns.");
    recs.push("Limit equity to 30% — consider balanced advantage funds for automatic rebalancing.");
  }
  if (f.employmentType === "salaried")
    recs.push("Maximise EPFO (VPF) and NPS Tier-1 contributions for tax efficiency under 80C & 80CCD.");
  else if (f.employmentType === "business" || f.employmentType === "self_employed")
    recs.push("Set aside 20% of gross income into a dedicated investment account every month — discipline replaces the payroll deduction you don't have.");
  if (lifeStage === "Early Career")
    recs.push("Start SIP today — ₹5,000/mo at 12% CAGR grows to ₹1 Cr+ in 25 years. Time is your biggest asset.");
  else if (lifeStage === "Mid Career")
    recs.push("Review your term life coverage — it should be 10–15× your annual income as responsibilities have grown.");
  else
    recs.push("Begin shifting to capital-protection instruments 5–7 years before retirement to protect corpus.");
  if (f.livingStatus === "rented")
    recs.push("Maintain a separate home down-payment fund in liquid assets — don't mix it with long-term investments.");
  recs.push("Keep 6 months of expenses in a liquid fund or high-yield savings account as an untouchable emergency buffer.");
  recs.push("Review and rebalance your portfolio annually — or when any asset class drifts more than 10% from target.");
  return recs.slice(0, 6);
}

function OptionCard({ label, desc, icon, selected, onClick }: {
  label: string; desc?: string; icon?: React.ReactNode; selected: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
        selected
          ? "border-[#1A5F3D] bg-[#f0faf4] shadow-[0_0_0_3px_rgba(26,95,61,0.08)]"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <span className={`flex-shrink-0 ${selected ? "text-[#1A5F3D]" : "text-gray-400"}`}>
            {icon}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${selected ? "text-[#1A5F3D]" : "text-gray-800"}`}>{label}</p>
          {desc && <p className="text-xs text-gray-500 mt-0.5 leading-4">{desc}</p>}
        </div>
        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
          selected ? "border-[#1A5F3D] bg-[#1A5F3D]" : "border-gray-300"
        }`}>
          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </div>
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <label className="text-sm font-semibold text-gray-700">{label}</label>
        {hint && (
          <div className="group relative">
            <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 w-52 bg-gray-800 text-white text-xs rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {hint}
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function AutoBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#f0faf4] border border-[#c6e8d5]">
      <CheckCircle className="w-3.5 h-3.5 text-[#1A5F3D] flex-shrink-0" />
      <span className="text-xs text-gray-500">{label}:</span>
      <span className="text-xs font-bold text-[#1A5F3D]">{value}</span>
    </div>
  );
}

function InsuranceRecoCard({ type, cover, icon, desc, color }: {
  type: string; cover: string; icon: React.ReactNode; desc: string; color: string;
}) {
  return (
    <div className={`rounded-xl bg-gradient-to-br ${color} p-4 text-white`}>
      <p className="text-xs text-white/70 flex items-center gap-1.5">{icon} {type}</p>
      <p className="text-2xl font-bold mt-0.5">{cover}</p>
      <p className="text-xs text-white/70 mt-1 leading-4">{desc}</p>
    </div>
  );
}

function StepCard({ title, icon, desc, children }: {
  title: string; icon: React.ReactNode; desc: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50 bg-gradient-to-r from-[#f7fdf9] to-white">
        <div className="flex items-center gap-3">
          <span className="text-[#1A5F3D]">{icon}</span>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-0.5 leading-5">{desc}</p>
          </div>
        </div>
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}

const inputCls = "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1A5F3D]/30 focus:border-[#1A5F3D] outline-none transition-all bg-white placeholder:text-gray-400";

export function FinancialPlanner() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [saved, setSaved] = useState(false);

  // Pre-fill from saved UserProfile
  const [form, setForm] = useState<FormData>(() => {
    const up = user ? getUserProfile(user.id) : null;
    if (!up) return INITIAL;
    return {
      name:             up.personal.fullName || "",
      dob:              up.personal.dob || "",
      maritalStatus:    up.personal.maritalStatus || "",
      dependents:       String(up.personal.dependents ?? ""),
      employmentType:   up.income.incomeSource === "salaried" ? "salaried"
                      : up.income.incomeSource === "business"  ? "business"
                      : up.income.incomeSource === "self_employed" ? "self_employed" : "",
      incomeStability:  up.income.incomeSource === "salaried" ? "stable" : "moderate",
      monthlyIncome:    String(up.income.monthlyIncome || ""),
      cityTier:         up.personal.city ? "tier1" : "",
      livingStatus:     up.personal.maritalStatus === "married" ? "family" : "single",
      financialKnowledge: up.riskProfile.experience === "expert" ? "advanced"
                        : up.riskProfile.experience === "intermediate" ? "intermediate" : "beginner",
      smoking:          "",
      medicalConditions:"",
      goalType:         up.goals[0]?.category || "",
      goalAmount:       String(up.goals[0]?.targetAmount || ""),
      yearsToGoal:      up.goals[0]?.targetDate
                          ? String(Math.max(1, new Date(up.goals[0].targetDate).getFullYear() - new Date().getFullYear()))
                          : "",
      currentSavings:   String(up.goals[0]?.currentSavings || ""),
      monthlyExpenses:  String(up.expenses.reduce((s, e) => s + e.amount, 0) || ""),
    };
  });

  const set = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const next = () => {
    setDir(1);
    setStep((s) => {
      const next = Math.min(s + 1, STEPS.length - 1);
      // When arriving at results step, save back to UserProfile
      if (next === STEPS.length - 1 && user) {
        const up = getUserProfile(user.id);
        if (up) {
          const monthlyInc = parseFloat(form.monthlyIncome) || up.income.monthlyIncome;
          const goalAmt    = parseFloat(form.goalAmount) || 0;
          const goalYears  = parseInt(form.yearsToGoal)  || 5;
          const savings    = parseFloat(form.currentSavings) || 0;
          const expenses   = parseFloat(form.monthlyExpenses) || up.expenses.reduce((s, e) => s + e.amount, 0);

          // Update personal fields if planner has newer data
          const updated = {
            ...up,
            personal: {
              ...up.personal,
              fullName:      form.name || up.personal.fullName,
              dob:           form.dob  || up.personal.dob,
              maritalStatus: (form.maritalStatus as any) || up.personal.maritalStatus,
              dependents:    parseInt(form.dependents) || up.personal.dependents,
            },
            income: {
              ...up.income,
              monthlyIncome:  monthlyInc,
              incomeSource:   (form.employmentType as any) || up.income.incomeSource,
            },
            riskProfile: {
              ...up.riskProfile,
              experience:  (form.financialKnowledge === "advanced" ? "expert"
                          : form.financialKnowledge === "intermediate" ? "intermediate"
                          : "beginner") as any,
            },
            // Add/update first goal from planner data
            goals: goalAmt > 0 ? [
              {
                ...( up.goals[0] ?? {
                  id: `g_plan_${Date.now()}`,
                  name: form.goalType || "Financial Goal",
                  category: (form.goalType as any) || "other",
                  icon: "🎯",
                  priority: "high" as const,
                }),
                targetAmount:  goalAmt,
                currentSavings: savings,
                targetDate: new Date(new Date().getFullYear() + goalYears, 0, 1).toISOString().slice(0, 10),
              },
              ...up.goals.slice(1),
            ] : up.goals,
            updatedAt: new Date().toISOString(),
          };
          saveUserProfile(updated);
          syncProfileToFinancialData(updated);
          setSaved(true);
        }
      }
      return next;
    });
  };
  const prev = () => { setDir(-1); setStep((s) => Math.max(s - 1, 0)); };

  const age        = useMemo(() => calcAge(form.dob),              [form.dob]);
  const lifeStage  = useMemo(() => calcLifeStage(age),             [age]);
  const riskScore  = useMemo(() => calcRiskScore(form, age),       [form, age]);
  const profile    = useMemo(() => riskProfile(riskScore),         [riskScore]);
  const allocation = useMemo(() => calcAllocation(riskScore),      [riskScore]);
  const monthlySIP = useMemo(() => calcSIP(form.goalAmount, form.yearsToGoal, riskScore), [form.goalAmount, form.yearsToGoal, riskScore]);
  const insurance  = useMemo(() => calcInsuranceCover(form),       [form]);
  const emergency  = useMemo(() => calcEmergencyFund(form.monthlyExpenses), [form.monthlyExpenses]);

  const radarData = [
    { subject: "Risk Capacity",    value: riskScore },
    { subject: "Income Stability", value: form.incomeStability === "stable" ? 85 : form.incomeStability === "moderate" ? 55 : 25 },
    { subject: "Fin. Knowledge",   value: form.financialKnowledge === "advanced" ? 90 : form.financialKnowledge === "intermediate" ? 55 : 25 },
    { subject: "Goal Clarity",     value: form.goalType ? 75 : 20 },
    { subject: "Health Coverage",  value: form.medicalConditions === "yes" || form.smoking === "yes" ? 40 : 80 },
  ];

  const variants = {
    enter:  (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#0f2a1d_0%,#1A5F3D_50%,#2D7A4E_80%,#3FAF7D_100%)] text-white py-14 md:py-20">
        <div className="absolute inset-0 opacity-[0.10] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#B8E986]/15 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs text-white/85 backdrop-blur mb-4">
              <span className="mr-2 h-2 w-2 rounded-full bg-[#B8E986]" />
              AI-Powered Financial Planning
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-[-0.03em] mb-3">
              Your Personalised<br />
              <span className="bg-gradient-to-r from-[#B8E986] to-white bg-clip-text text-transparent">Financial Roadmap</span>
            </h1>
            <p className="text-lg text-white/80 max-w-xl leading-7">
              Fill in your profile once — get a tailored plan covering investments, insurance, risk assessment, and retirement strategy.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Sticky Step Bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => { if (i < step) { setDir(-1); setStep(i); } }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    i === step ? "bg-[#1A5F3D] text-white shadow"
                    : i < step  ? "bg-[#e6f4ec] text-[#1A5F3D] cursor-pointer hover:bg-[#d0ecda]"
                    :              "bg-gray-100 text-gray-400 cursor-default"
                  }`}
                >
                  {i < step
                    ? <CheckCircle className="w-3.5 h-3.5" />
                    : <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full border border-current text-[9px] font-bold">{i + 1}</span>
                  }
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`w-4 h-0.5 flex-shrink-0 rounded-full ${i < step ? "bg-[#1A5F3D]" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2">
            <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#1A5F3D] to-[#3FAF7D] rounded-full transition-all duration-500"
                style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Form Area */}
      <section className="py-10 md:py-14">
        <div className="max-w-3xl mx-auto px-4">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={step} custom={dir} variants={variants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.28, ease: "easeInOut" }}
            >

              {/* Step 0: Basic Details */}
              {step === 0 && (
                <StepCard title="Basic Details" icon={<User className="w-6 h-6" />}
                  desc="Tell us about yourself. Age and life stage are auto-calculated from your date of birth.">
                  <Field label="Full Name">
                    <input className={inputCls} placeholder="e.g. Rahul Sharma"
                      value={form.name} onChange={(e) => set("name", e.target.value)} />
                  </Field>
                  <Field label="Date of Birth" hint="Used to auto-calculate your age and life stage">
                    <input type="date" className={inputCls} value={form.dob}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={(e) => set("dob", e.target.value)} />
                  </Field>
                  {age !== null && (
                    <div className="flex flex-wrap gap-2">
                      <AutoBadge label="Age" value={`${age} years`} />
                      <AutoBadge label="Life Stage" value={lifeStage} />
                    </div>
                  )}
                  <Field label="Marital Status">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { v: "single",  l: "Single",  icon: <User className="w-5 h-5" />,  d: "No partner" },
                        { v: "married", l: "Married", icon: <Users className="w-5 h-5" />, d: "With partner" },
                      ].map(({ v, l, icon, d }) => (
                        <OptionCard key={v} icon={icon} label={l} desc={d}
                          selected={form.maritalStatus === v} onClick={() => set("maritalStatus", v)} />
                      ))}
                    </div>
                  </Field>
                  <Field label="Number of Dependents" hint="Children, parents or anyone financially dependent on you">
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { v: "0", l: "None", icon: <Minus className="w-4 h-4" /> },
                        { v: "1", l: "1",    icon: <Baby className="w-4 h-4" /> },
                        { v: "2", l: "2",    icon: <UserPlus className="w-4 h-4" /> },
                        { v: "3", l: "3+",   icon: <Users className="w-4 h-4" /> },
                      ].map(({ v, l, icon }) => (
                        <OptionCard key={v} icon={icon} label={l}
                          selected={form.dependents === v} onClick={() => set("dependents", v)} />
                      ))}
                    </div>
                  </Field>
                </StepCard>
              )}

              {/* Step 1: Employment */}
              {step === 1 && (
                <StepCard title="Employment & Income" icon={<Briefcase className="w-6 h-6" />}
                  desc="Employment type and income stability help determine your investment capacity and risk profile.">
                  <Field label="Employment Type">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { v: "salaried",      l: "Salaried",     icon: <Building2 className="w-5 h-5" />, d: "Fixed monthly pay" },
                        { v: "self_employed", l: "Self-employed", icon: <Laptop className="w-5 h-5" />,   d: "Freelance / consulting" },
                        { v: "business",      l: "Business",      icon: <Store className="w-5 h-5" />,    d: "Own business / firm" },
                      ].map(({ v, l, icon, d }) => (
                        <OptionCard key={v} icon={icon} label={l} desc={d}
                          selected={form.employmentType === v} onClick={() => set("employmentType", v)} />
                      ))}
                    </div>
                  </Field>
                  <Field label="Income Stability" hint="How predictable is your monthly income?">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { v: "stable",    l: "Stable",    icon: <CheckCircle className="w-5 h-5" />,  d: "Consistent every month" },
                        { v: "moderate",  l: "Moderate",  icon: <Activity className="w-5 h-5" />,     d: "Some fluctuations" },
                        { v: "uncertain", l: "Uncertain", icon: <AlertCircle className="w-5 h-5" />,  d: "Highly variable" },
                      ].map(({ v, l, icon, d }) => (
                        <OptionCard key={v} icon={icon} label={l} desc={d}
                          selected={form.incomeStability === v} onClick={() => set("incomeStability", v)} />
                      ))}
                    </div>
                  </Field>
                  <Field label="Monthly Take-home Income (₹)" hint="After taxes and deductions">
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="number" className={`${inputCls} pl-9`} placeholder="e.g. 75000"
                        value={form.monthlyIncome} onChange={(e) => set("monthlyIncome", e.target.value)} />
                    </div>
                  </Field>
                </StepCard>
              )}

              {/* Step 2: Lifestyle */}
              {step === 2 && (
                <StepCard title="Lifestyle" icon={<MapPin className="w-6 h-6" />}
                  desc="Lifestyle context personalises insurance recommendations and living cost estimates.">
                  <Field label="City Tier" hint="Tier 1 = Mumbai, Delhi, Bengaluru, Chennai, Hyderabad, Kolkata, Pune">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { v: "tier1", l: "Tier 1", icon: <Landmark className="w-5 h-5" />,  d: "Metro city" },
                        { v: "tier2", l: "Tier 2", icon: <Globe className="w-5 h-5" />,     d: "Mid-sized city" },
                        { v: "tier3", l: "Tier 3", icon: <TreePine className="w-5 h-5" />,  d: "Town / rural" },
                      ].map(({ v, l, icon, d }) => (
                        <OptionCard key={v} icon={icon} label={l} desc={d}
                          selected={form.cityTier === v} onClick={() => set("cityTier", v)} />
                      ))}
                    </div>
                  </Field>
                  <Field label="Living Status">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { v: "owned",       l: "Own Home",    icon: <Home className="w-5 h-5" />,       d: "No rent burden" },
                        { v: "rented",      l: "Rented",      icon: <Key className="w-5 h-5" />,        d: "Paying monthly rent" },
                        { v: "with_family", l: "With Family", icon: <UserCheck className="w-5 h-5" />,  d: "Shared household" },
                      ].map(({ v, l, icon, d }) => (
                        <OptionCard key={v} icon={icon} label={l} desc={d}
                          selected={form.livingStatus === v} onClick={() => set("livingStatus", v)} />
                      ))}
                    </div>
                  </Field>
                  <Field label="Financial Knowledge" hint="How comfortable are you with investing concepts?">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { v: "beginner",     l: "Beginner",     icon: <BookOpen className="w-5 h-5" />,  d: "Just starting out" },
                        { v: "intermediate", l: "Intermediate", icon: <BarChart2 className="w-5 h-5" />, d: "Know the basics" },
                        { v: "advanced",     l: "Advanced",     icon: <Zap className="w-5 h-5" />,       d: "Active investor" },
                      ].map(({ v, l, icon, d }) => (
                        <OptionCard key={v} icon={icon} label={l} desc={d}
                          selected={form.financialKnowledge === v} onClick={() => set("financialKnowledge", v)} />
                      ))}
                    </div>
                  </Field>
                </StepCard>
              )}

              {/* Step 3: Health */}
              {step === 3 && (
                <StepCard title="Health Profile" icon={<Heart className="w-6 h-6" />}
                  desc="Your health details help us calculate accurate insurance coverage recommendations.">
                  <Field label="Do you smoke or use tobacco?" hint="Affects life and health insurance premium calculation">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { v: "no",  l: "Non-smoker", icon: <CheckCircle className="w-5 h-5" />, d: "No tobacco use" },
                        { v: "yes", l: "Smoker",     icon: <Cigarette className="w-5 h-5" />,   d: "Use tobacco / cigarettes" },
                      ].map(({ v, l, icon, d }) => (
                        <OptionCard key={v} icon={icon} label={l} desc={d}
                          selected={form.smoking === v} onClick={() => set("smoking", v)} />
                      ))}
                    </div>
                  </Field>
                  <Field label="Any pre-existing medical conditions?" hint="e.g. diabetes, hypertension, heart disease">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { v: "no",  l: "None",      icon: <Shield className="w-5 h-5" />,      d: "Generally healthy" },
                        { v: "yes", l: "Yes, I do", icon: <Stethoscope className="w-5 h-5" />, d: "Have medical history" },
                      ].map(({ v, l, icon, d }) => (
                        <OptionCard key={v} icon={icon} label={l} desc={d}
                          selected={form.medicalConditions === v} onClick={() => set("medicalConditions", v)} />
                      ))}
                    </div>
                  </Field>
                  {(form.smoking === "yes" || form.medicalConditions === "yes") && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-amber-700 leading-5">
                        {form.smoking === "yes"
                          ? "Smokers typically pay 15–25% higher premiums. Getting insured early locks in better rates before conditions develop."
                          : "Pre-existing conditions may cause waiting periods or exclusions. Comprehensive plans with riders are strongly recommended."}
                      </p>
                    </motion.div>
                  )}
                </StepCard>
              )}

              {/* Step 4: Goals */}
              {step === 4 && (
                <StepCard title="Financial Goals" icon={<Target className="w-6 h-6" />}
                  desc="Define what you want to achieve. We'll calculate the exact monthly SIP needed to get there.">
                  <Field label="Primary Financial Goal">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { v: "retirement", l: "Retirement",      icon: <Sun className="w-5 h-5" /> },
                        { v: "home",       l: "Buy a Home",      icon: <Home className="w-5 h-5" /> },
                        { v: "education",  l: "Child Education", icon: <GraduationCap className="w-5 h-5" /> },
                        { v: "wealth",     l: "Wealth Creation", icon: <TrendingUp className="w-5 h-5" /> },
                        { v: "emergency",  l: "Emergency Fund",  icon: <Shield className="w-5 h-5" /> },
                        { v: "other",      l: "Other",           icon: <CircleDot className="w-5 h-5" /> },
                      ].map(({ v, l, icon }) => (
                        <OptionCard key={v} icon={icon} label={l}
                          selected={form.goalType === v} onClick={() => set("goalType", v)} />
                      ))}
                    </div>
                  </Field>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Target Amount (₹)">
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="number" className={`${inputCls} pl-9`} placeholder="e.g. 10000000"
                          value={form.goalAmount} onChange={(e) => set("goalAmount", e.target.value)} />
                      </div>
                    </Field>
                    <Field label="Time Horizon (Years)">
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="number" min="1" max="40" className={`${inputCls} pl-9`} placeholder="e.g. 15"
                          value={form.yearsToGoal} onChange={(e) => set("yearsToGoal", e.target.value)} />
                      </div>
                    </Field>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Current Savings / Investments (₹)">
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="number" className={`${inputCls} pl-9`} placeholder="e.g. 200000"
                          value={form.currentSavings} onChange={(e) => set("currentSavings", e.target.value)} />
                      </div>
                    </Field>
                    <Field label="Monthly Expenses (₹)">
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="number" className={`${inputCls} pl-9`} placeholder="e.g. 40000"
                          value={form.monthlyExpenses} onChange={(e) => set("monthlyExpenses", e.target.value)} />
                      </div>
                    </Field>
                  </div>
                  {form.goalAmount && form.yearsToGoal && (
                    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                      className="p-5 rounded-2xl bg-gradient-to-br from-[#1A5F3D] to-[#2D7A4E] text-white">
                      <p className="text-xs text-white/70 mb-1">Estimated Monthly SIP Needed</p>
                      <p className="text-3xl font-bold">₹{monthlySIP.toLocaleString("en-IN")}</p>
                      <p className="text-xs text-white/70 mt-1">
                        {profile.label} profile · {form.yearsToGoal} yr horizon · assumed {riskScore >= 70 ? "12" : riskScore >= 45 ? "10" : "8"}% CAGR
                      </p>
                    </motion.div>
                  )}
                </StepCard>
              )}

              {/* Step 5: Results */}
              {step === 5 && (
                <div className="space-y-6">

                  {/* Saved banner */}
                  {saved && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <p className="text-sm text-green-800 font-medium">
                        Plan saved to your profile — your dashboard is now updated.
                      </p>
                    </div>
                  )}

                  {/* Profile header */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Plan prepared for</p>
                        <h2 className="text-2xl font-bold text-gray-900">{form.name || "Your"} Financial Plan</h2>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {age !== null && <AutoBadge label="Age" value={`${age} yrs`} />}
                          <AutoBadge label="Life Stage" value={lifeStage} />
                          <AutoBadge label="Risk Profile" value={profile.label} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400 mb-1">Risk Score</p>
                        <p className="text-5xl font-bold" style={{ color: profile.color }}>
                          {Math.round(riskScore)}
                          <span className="text-lg font-normal text-gray-400">/100</span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Conservative</span><span>Moderate</span><span>Aggressive</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-gradient-to-r from-amber-200 via-blue-300 to-green-400 relative">
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-md transition-all duration-700"
                          style={{ left: `calc(${riskScore}% - 10px)`, backgroundColor: profile.color }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* SIP + Emergency */}
                  <div className="bg-gradient-to-br from-[#0f2a1d] via-[#1A5F3D] to-[#2D7A4E] rounded-2xl p-6 text-white">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-xs text-white/65 mb-1">Recommended Monthly SIP</p>
                        <p className="text-4xl font-bold">
                          {monthlySIP > 0 ? `₹${monthlySIP.toLocaleString("en-IN")}` : "—"}
                        </p>
                        {form.goalAmount && form.yearsToGoal && (
                          <p className="text-sm text-white/65 mt-1">
                            To reach ₹{parseInt(form.goalAmount).toLocaleString("en-IN")} in {form.yearsToGoal} years
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-white/65 mb-1">Emergency Fund Target</p>
                        <p className="text-2xl font-bold">{emergency}</p>
                        <p className="text-xs text-white/65 mt-0.5">6 months of expenses</p>
                      </div>
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <h3 className="font-bold text-gray-900 mb-1">Recommended Allocation</h3>
                      <p className="text-xs text-gray-400 mb-4">{profile.label} risk profile</p>
                      <ResponsiveContainer width="100%" height={190}>
                        <PieChart>
                          <Pie data={allocation} cx="50%" cy="50%"
                            innerRadius={50} outerRadius={78} dataKey="value" paddingAngle={2}>
                            {allocation.map((e, i) => <Cell key={i} fill={e.color} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => `${v}%`} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 mt-1">
                        {allocation.map((item, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-sm text-gray-600">{item.name}</span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">{item.value}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <h3 className="font-bold text-gray-900 mb-1">Financial Health Radar</h3>
                      <p className="text-xs text-gray-400 mb-4">Based on your profile inputs</p>
                      <ResponsiveContainer width="100%" height={230}>
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="#e5e7eb" />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#6b7280" }} />
                          <Radar name="Score" dataKey="value"
                            stroke="#1A5F3D" fill="#1A5F3D" fillOpacity={0.18} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Insurance */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[#1A5F3D]" />
                      Insurance Recommendations
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <InsuranceRecoCard type="Life Insurance" cover={insurance.life}
                        icon={<Heart className="w-3.5 h-3.5" />}
                        desc="Term plan to secure your family's future" color="from-emerald-600 to-teal-500" />
                      <InsuranceRecoCard type="Health Insurance" cover={insurance.health}
                        icon={<Stethoscope className="w-3.5 h-3.5" />}
                        desc="Based on your city tier and health profile" color="from-rose-600 to-pink-500" />
                    </div>
                    {insurance.riskFlag && (
                      <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-700">{insurance.riskFlag}</p>
                      </div>
                    )}
                  </div>

                  {/* Strategy */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-[#1A5F3D]" />
                      Investment Strategy
                    </h3>
                    <div className="space-y-3">
                      {buildRecommendations(form, profile.label, lifeStage).map((r, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-[#f7fdf9] border border-[#dff0e6] rounded-xl">
                          <CheckCircle className="w-4 h-4 text-[#1A5F3D] mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-700 leading-5">{r}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button className="w-full py-4 bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] text-white rounded-2xl font-bold text-base hover:shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2">
                    <Download className="w-5 h-5" />
                    Download Full Financial Plan (PDF)
                  </button>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* Nav buttons */}
          <div className="flex justify-between items-center mt-8">
            {step > 0 ? (
              <button onClick={prev}
                className="flex items-center gap-2 px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-all text-sm">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}
            {step < STEPS.length - 1 && (
              <button onClick={next}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all text-sm ml-auto">
                {step === STEPS.length - 2 ? "Generate My Plan" : "Continue"}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}