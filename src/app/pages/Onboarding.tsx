import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  User, Mail, Phone, Calendar, Briefcase, MapPin, Heart,
  TrendingUp, DollarSign, Target, PieChart, ShieldCheck,
  CreditCard, Plus, Trash2, ArrowRight, ArrowLeft,
  CheckCircle, Camera, ChevronDown,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import {
  type UserProfile, type ExpenseEntry, type FinancialGoalEntry,
  type InvestmentEntry, type LoanEntry,
  emptyProfile, saveUserProfile,
} from "../data/userProfile";
import { syncProfileToFinancialData } from "../data/syncProfile";
import { userAPI } from "../services/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

function fmt(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(0)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

const INPUT = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A5F3D]/30 focus:border-[#1A5F3D] transition-all bg-white";
const LABEL = "block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide";
const SELECT = `${INPUT} appearance-none`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  );
}

// ── Step definitions ──────────────────────────────────────────────────────────

const STEPS = [
  { id: "auth",    label: "Account",    icon: <User className="w-4 h-4" />,       color: "from-[#1A5F3D] to-[#2D7A4E]" },
  { id: "profile", label: "Profile",    icon: <Heart className="w-4 h-4" />,      color: "from-[#1A5F3D] to-[#2D7A4E]" },
  { id: "income",  label: "Income",     icon: <DollarSign className="w-4 h-4" />, color: "from-[#1A5F3D] to-[#2D7A4E]" },
  { id: "expense", label: "Expenses",   icon: <PieChart className="w-4 h-4" />,   color: "from-[#1A5F3D] to-[#2D7A4E]" },
  { id: "goals",   label: "Goals",      icon: <Target className="w-4 h-4" />,     color: "from-[#1A5F3D] to-[#2D7A4E]" },
  { id: "invest",  label: "Investments",icon: <TrendingUp className="w-4 h-4" />, color: "from-[#1A5F3D] to-[#2D7A4E]" },
  { id: "risk",    label: "Risk",       icon: <ShieldCheck className="w-4 h-4" />,color: "from-[#1A5F3D] to-[#2D7A4E]" },
  { id: "loans",   label: "Loans",      icon: <CreditCard className="w-4 h-4" />, color: "from-[#1A5F3D] to-[#2D7A4E]" },
] as const;

// ── Main Component ────────────────────────────────────────────────────────────

export function Onboarding() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const DRAFT_KEY = `sf_onboard_draft_${user?.id ?? "anon"}`;

  const [step, setStep] = useState(() => {
    try { return parseInt(localStorage.getItem(DRAFT_KEY + "_step") || "0") || 0; } catch { return 0; }
  });
  const [dir, setDir]   = useState(1); // 1 = forward, -1 = back
  const [profile, setProfile] = useState<UserProfile>(() => {
    // Try to restore draft first
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) return JSON.parse(draft) as UserProfile;
    } catch { /* ignore */ }
    return emptyProfile(user?.id ?? "demo_001", {
      name:  user?.name,
      email: user?.email,
      mobile: user?.phone,
    });
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const avatarRef = useRef<HTMLInputElement>(null);

  // ── Auto-save draft on every profile change ──────────────────────────────
  const patch = useCallback(<K extends keyof UserProfile>(
    key: K, value: UserProfile[K]
  ) => {
    setProfile(p => {
      const updated = { ...p, [key]: value };
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
    setErrors(e => ({ ...e, [key]: "" }));
  }, []);

  const patchPersonal = useCallback((k: string, v: string | number) => {
    setProfile(p => ({ ...p, personal: { ...p.personal, [k]: v } }));
    setErrors(e => ({ ...e, [k]: "" }));
  }, []);

  const patchIncome = useCallback((k: string, v: string | number) => {
    setProfile(p => ({ ...p, income: { ...p.income, [k]: v } }));
  }, []);

  // ── Avatar upload ─────────────────────────────────────────────────────────

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      patchPersonal("avatarDataUrl", dataUrl);
      updateUser({ avatar: dataUrl });
    };
    reader.readAsDataURL(file);
  }

  // ── Validation per step ────────────────────────────────────────────────────

  function validateStep(): boolean {
    const errs: Record<string, string> = {};
    const s = STEPS[step].id;
    if (s === "auth") {
      if (!profile.personal.fullName.trim())     errs.fullName = "Full name is required";
      if (!profile.personal.email.trim())         errs.email    = "Email is required";
      if (!/^\+?[\d\s-]{10,}$/.test(profile.personal.mobile)) errs.mobile = "Enter a valid mobile number";
    }
    if (s === "profile") {
      if (!profile.personal.dob)               errs.dob        = "Date of birth is required";
      if (!profile.personal.occupation.trim()) errs.occupation = "Occupation is required";
      if (!profile.personal.city.trim())       errs.city       = "City is required";
    }
    if (s === "income") {
      if (!profile.income.monthlyIncome)       errs.monthlyIncome = "Monthly income is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function next() {
    if (!validateStep()) return;
    if (step < STEPS.length - 1) {
      setDir(1);
      setStep(s => {
        const n = s + 1;
        try { localStorage.setItem(DRAFT_KEY + "_step", String(n)); } catch { /* ignore */ }
        return n;
      });
    } else {
      handleFinish();
    }
  }

  function back() {
    setDir(-1);
    setStep(s => {
      const n = Math.max(0, s - 1);
      try { localStorage.setItem(DRAFT_KEY + "_step", String(n)); } catch { /* ignore */ }
      return n;
    });
  }

  async function handleFinish() {
  if (!validateStep()) return;
  setSaving(true);

  const final: UserProfile = {
    ...profile,
    onboardedAt: new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
  };

  try {
    // ✅ Send data to the backend first
    await userAPI.onboarding({
      dob:           final.personal.dob,
      gender:        final.personal.gender,
      occupation:    final.personal.occupation,
      maritalStatus: final.personal.maritalStatus,
      dependents:    final.personal.dependents,
      city:          final.personal.city,
      state:         final.personal.state,
      country:       final.personal.country,
      mobile:        final.personal.mobile,
      income: {
        monthly:           final.income.monthlyIncome,
        source:            final.income.incomeSource,
        additionalMonthly: final.income.additionalIncome,
        annualGrowthPct:   final.income.salaryGrowthPct,
      },
      riskProfile: {
        tolerance:        final.riskProfile.tolerance,
        experience:       final.riskProfile.experience,
        timeHorizonYears: final.riskProfile.timeHorizonYears,
        investmentStyle:  final.riskProfile.investmentStyle,
      },
      expenses:    final.expenses,
      investments: final.investments,
      goals:       final.goals,
      loans:       final.loans,
    });

    // ✅ Update the auth context so ProtectedRoute sees isProfileComplete = true
    updateUser({ isProfileComplete: true });

    // Save locally too (for offline access / speed)
    saveUserProfile(final);
    syncProfileToFinancialData(final);

    // Clear draft
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(DRAFT_KEY + "_step");

    updateUser({
      isProfileComplete: true,
      profilePicture: final.personal.avatarDataUrl,
    });

    navigate("/dashboard", { replace: true });

  } catch (err: any) {
    alert(err.message || "Failed to save profile. Please try again.");
  } finally {
    setSaving(false);
  }
}

  // ── Step content ──────────────────────────────────────────────────────────

  const stepContent: Record<string, React.ReactNode> = {

    // ── STEP 0: Auth / Account ──────────────────────────────────────────────
    auth: (
      <div className="space-y-5">
        <StepHeader
          icon={<User className="w-6 h-6 text-white" />}
          title="Your Account"
          desc="Let's start with your basic info"
        />

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 pb-2">
          <div
            className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center text-white text-2xl font-bold cursor-pointer overflow-hidden border-4 border-white shadow-lg"
            onClick={() => avatarRef.current?.click()}
          >
            {profile.personal.avatarDataUrl ? (
              <img src={profile.personal.avatarDataUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              profile.personal.fullName ? profile.personal.fullName[0].toUpperCase() : <Camera className="w-7 h-7" />
            )}
          </div>
          <button
            type="button"
            onClick={() => avatarRef.current?.click()}
            className="text-xs text-[#1A5F3D] font-semibold hover:underline flex items-center gap-1"
          >
            <Camera className="w-3 h-3" /> Upload photo (optional)
          </button>
          <input
            ref={avatarRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        <Field label="Full Name *">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className={`${INPUT} pl-10`} placeholder="Rajesh Kumar"
              value={profile.personal.fullName}
              onChange={e => patchPersonal("fullName", e.target.value)}
            />
          </div>
          {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
        </Field>

        <Field label="Email ID *">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className={`${INPUT} pl-10`} type="email" placeholder="you@example.com"
              value={profile.personal.email}
              onChange={e => patchPersonal("email", e.target.value)}
            />
          </div>
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </Field>

        <Field label="Mobile Number *">
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className={`${INPUT} pl-10`} type="tel" placeholder="+91 98765 43210"
              value={profile.personal.mobile}
              onChange={e => patchPersonal("mobile", e.target.value)}
            />
          </div>
          {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>}
        </Field>
      </div>
    ),

    // ── STEP 1: Personal Profile ────────────────────────────────────────────
    profile: (
      <div className="space-y-5">
        <StepHeader icon={<Heart className="w-6 h-6 text-white" />} title="Personal Profile" desc="Help us understand you better" />

        <div className="grid grid-cols-2 gap-4">
          <Field label="Date of Birth *">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className={`${INPUT} pl-10`} type="date"
                value={profile.personal.dob}
                onChange={e => patchPersonal("dob", e.target.value)}
              />
            </div>
            {errors.dob && <p className="text-red-500 text-xs mt-1">{errors.dob}</p>}
          </Field>

          <Field label="Gender">
            <div className="relative">
              <select className={SELECT}
                value={profile.personal.gender}
                onChange={e => patchPersonal("gender", e.target.value)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </Field>
        </div>

        <Field label="Occupation *">
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className={`${INPUT} pl-10`} placeholder="Software Engineer"
              value={profile.personal.occupation}
              onChange={e => patchPersonal("occupation", e.target.value)}
            />
          </div>
          {errors.occupation && <p className="text-red-500 text-xs mt-1">{errors.occupation}</p>}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Marital Status">
            <div className="relative">
              <select className={SELECT}
                value={profile.personal.maritalStatus}
                onChange={e => patchPersonal("maritalStatus", e.target.value)}
              >
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </Field>
          <Field label="Dependents">
            <input className={INPUT} type="number" min="0" max="20" placeholder="0"
              value={profile.personal.dependents || ""}
              onChange={e => patchPersonal("dependents", parseInt(e.target.value) || 0)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="City *">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className={`${INPUT} pl-9`} placeholder="Mumbai"
                value={profile.personal.city}
                onChange={e => patchPersonal("city", e.target.value)}
              />
            </div>
            {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
          </Field>
          <Field label="State">
            <input className={INPUT} placeholder="Maharashtra"
              value={profile.personal.state}
              onChange={e => patchPersonal("state", e.target.value)}
            />
          </Field>
          <Field label="Country">
            <input className={INPUT} placeholder="India"
              value={profile.personal.country}
              onChange={e => patchPersonal("country", e.target.value)}
            />
          </Field>
        </div>
      </div>
    ),

    // ── STEP 2: Income ──────────────────────────────────────────────────────
    income: (
      <div className="space-y-5">
        <StepHeader icon={<DollarSign className="w-6 h-6 text-white" />} title="Income Details" desc="Your earnings and growth" />

        <Field label="Monthly Income (₹) *">
          <input className={INPUT} type="number" placeholder="75000"
            value={profile.income.monthlyIncome || ""}
            onChange={e => patchIncome("monthlyIncome", parseFloat(e.target.value) || 0)}
          />
          {errors.monthlyIncome && <p className="text-red-500 text-xs mt-1">{errors.monthlyIncome}</p>}
        </Field>

        <Field label="Income Source">
          <div className="relative">
            <select className={SELECT}
              value={profile.income.incomeSource}
              onChange={e => patchIncome("incomeSource", e.target.value)}
            >
              <option value="salaried">Salaried</option>
              <option value="self_employed">Self Employed</option>
              <option value="business">Business Owner</option>
              <option value="freelance">Freelancer</option>
              <option value="other">Other</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Additional Monthly Income (₹)">
            <input className={INPUT} type="number" placeholder="10000"
              value={profile.income.additionalIncome || ""}
              onChange={e => patchIncome("additionalIncome", parseFloat(e.target.value) || 0)}
            />
          </Field>
          <Field label="Annual Salary Growth (%)">
            <input className={INPUT} type="number" placeholder="8" min="0" max="50"
              value={profile.income.salaryGrowthPct || ""}
              onChange={e => patchIncome("salaryGrowthPct", parseFloat(e.target.value) || 0)}
            />
          </Field>
        </div>

        {profile.income.monthlyIncome > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-2">
            <p className="text-xs font-semibold text-green-700 mb-1">Income Summary</p>
            <p className="text-sm text-green-800">
              Total monthly: <strong>{fmt((profile.income.monthlyIncome + profile.income.additionalIncome))}</strong>
              {" "}| Annual: <strong>{fmt((profile.income.monthlyIncome + profile.income.additionalIncome) * 12)}</strong>
            </p>
          </div>
        )}
      </div>
    ),

    // ── STEP 3: Expenses ────────────────────────────────────────────────────
    expense: (
      <div className="space-y-4">
        <StepHeader icon={<PieChart className="w-6 h-6 text-white" />} title="Monthly Expenses" desc="Track where your money goes" />

        <div className="space-y-2.5">
          {profile.expenses.map((exp, i) => (
            <div key={exp.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
              <span className="text-xl w-7 flex-shrink-0">{exp.icon}</span>
              <span className="text-sm text-gray-700 flex-1">{exp.category}</span>
              <div className="flex items-center gap-1 text-xs text-gray-500">₹</div>
              <input
                className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-[#1A5F3D]/40 focus:border-[#1A5F3D]"
                type="number"
                placeholder="0"
                value={exp.amount || ""}
                onChange={e => {
                  const updated = [...profile.expenses];
                  updated[i] = { ...exp, amount: parseFloat(e.target.value) || 0 };
                  patch("expenses", updated);
                }}
              />
              <button
                type="button"
                onClick={() => patch("expenses", profile.expenses.filter(x => x.id !== exp.id))}
                className="p-1 text-gray-300 hover:text-red-400 transition-colors"
              ><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            const cats = ["Education","Clothing","Insurance","Savings","Other"];
            const colors = ["#4CAF50","#66BB6A","#A5D6A7","#2D7A4E","#8BC34A"];
            const icons  = ["📚","👗","🛡️","💰","📦"];
            const n = profile.expenses.length % cats.length;
            patch("expenses", [...profile.expenses, {
              id: uid(), category: cats[n], amount: 0, icon: icons[n], color: colors[n],
            }]);
          }}
          className="flex items-center gap-2 text-sm text-[#1A5F3D] font-semibold hover:underline"
        ><Plus className="w-4 h-4" /> Add category</button>

        {profile.expenses.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mt-2">
            <p className="text-xs text-blue-700">
              Total expenses: <strong>{fmt(profile.expenses.reduce((s, e) => s + e.amount, 0))}/month</strong>
              {profile.income.monthlyIncome > 0 && (
                <> — savings: <strong>{fmt(profile.income.monthlyIncome - profile.expenses.reduce((s, e) => s + e.amount, 0))}/month</strong></>
              )}
            </p>
          </div>
        )}
      </div>
    ),

    // ── STEP 4: Goals ───────────────────────────────────────────────────────
    goals: (
      <div className="space-y-4">
        <StepHeader icon={<Target className="w-6 h-6 text-white" />} title="Financial Goals" desc="What are you saving towards?" />

        {profile.goals.length === 0 && (
          <div className="text-center py-6 text-gray-400 text-sm">
            No goals yet — add your first financial goal below
          </div>
        )}

        <div className="space-y-3">
          {profile.goals.map((g, i) => (
            <div key={g.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{g.icon}</span>
                  <input
                    className="font-semibold text-sm bg-transparent border-b border-gray-300 focus:border-[#1A5F3D] focus:outline-none px-1"
                    value={g.name}
                    placeholder="Goal name"
                    onChange={e => {
                      const updated = [...profile.goals];
                      updated[i] = { ...g, name: e.target.value };
                      patch("goals", updated);
                    }}
                  />
                </div>
                <button type="button" onClick={() => patch("goals", profile.goals.filter(x => x.id !== g.id))} className="text-gray-300 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Target (₹)</label>
                  <input className={INPUT} type="number" placeholder="500000"
                    value={g.targetAmount || ""}
                    onChange={e => { const u=[...profile.goals]; u[i]={...g,targetAmount:parseFloat(e.target.value)||0}; patch("goals",u); }}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Current Savings (₹)</label>
                  <input className={INPUT} type="number" placeholder="50000"
                    value={g.currentSavings || ""}
                    onChange={e => { const u=[...profile.goals]; u[i]={...g,currentSavings:parseFloat(e.target.value)||0}; patch("goals",u); }}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Target Date</label>
                  <input className={INPUT} type="date"
                    value={g.targetDate}
                    onChange={e => { const u=[...profile.goals]; u[i]={...g,targetDate:e.target.value}; patch("goals",u); }}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Priority</label>
                  <div className="relative">
                    <select className={SELECT}
                      value={g.priority}
                      onChange={e => { const u=[...profile.goals]; u[i]={...g,priority:e.target.value as FinancialGoalEntry["priority"]}; patch("goals",u); }}
                    >
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

        <div className="grid grid-cols-3 gap-2">
          {[
            { name: "Retirement", icon: "🏖️", category: "retirement" as const },
            { name: "Education",  icon: "🎓", category: "education"  as const },
            { name: "Home",       icon: "🏠", category: "home"       as const },
            { name: "Emergency",  icon: "🛡️", category: "emergency"  as const },
            { name: "Travel",     icon: "✈️", category: "other"      as const },
            { name: "Custom",     icon: "⭐", category: "wealth"     as const },
          ].map(t => (
            <button key={t.name} type="button"
              onClick={() => patch("goals", [...profile.goals, {
                id: uid(), name: t.name, targetAmount: 0, targetDate: "", priority: "medium",
                currentSavings: 0, category: t.category, icon: t.icon,
              }])}
              className="flex flex-col items-center gap-1 p-3 border border-gray-200 rounded-xl hover:border-[#1A5F3D] hover:bg-green-50 transition-all text-xs font-medium text-gray-600"
            >
              <span className="text-lg">{t.icon}</span>{t.name}
            </button>
          ))}
        </div>
      </div>
    ),

    // ── STEP 5: Investments ─────────────────────────────────────────────────
    invest: (
      <div className="space-y-4">
        <StepHeader icon={<TrendingUp className="w-6 h-6 text-white" />} title="Investments" desc="Your current portfolio" />

        {profile.investments.length === 0 && (
          <div className="text-center py-4 text-gray-400 text-sm">No investments added yet</div>
        )}

        <div className="space-y-3">
          {profile.investments.map((inv, i) => (
            <div key={inv.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <input
                  className="font-semibold text-sm bg-transparent border-b border-gray-300 focus:border-[#1A5F3D] focus:outline-none px-1 flex-1 mr-3"
                  value={inv.name} placeholder="Investment name"
                  onChange={e => { const u=[...profile.investments]; u[i]={...inv,name:e.target.value}; patch("investments",u); }}
                />
                <button type="button" onClick={() => patch("investments", profile.investments.filter(x => x.id !== inv.id))} className="text-gray-300 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Type</label>
                  <div className="relative">
                    <select className={SELECT} value={inv.type}
                      onChange={e => { const u=[...profile.investments]; u[i]={...inv,type:e.target.value as InvestmentEntry["type"]}; patch("investments",u); }}
                    >
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
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Expected Return (%)</label>
                  <input className={INPUT} type="number" placeholder="12"
                    value={inv.expectedReturn || ""}
                    onChange={e => { const u=[...profile.investments]; u[i]={...inv,expectedReturn:parseFloat(e.target.value)||0}; patch("investments",u); }}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Invested (₹)</label>
                  <input className={INPUT} type="number" placeholder="100000"
                    value={inv.investedAmount || ""}
                    onChange={e => { const u=[...profile.investments]; u[i]={...inv,investedAmount:parseFloat(e.target.value)||0}; patch("investments",u); }}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Current Value (₹)</label>
                  <input className={INPUT} type="number" placeholder="120000"
                    value={inv.currentValue || ""}
                    onChange={e => { const u=[...profile.investments]; u[i]={...inv,currentValue:parseFloat(e.target.value)||0}; patch("investments",u); }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button type="button"
          onClick={() => patch("investments", [...profile.investments, {
            id: uid(), type: "mutual_fund", name: "New Investment",
            investedAmount: 0, currentValue: 0, durationMonths: 12, expectedReturn: 12,
          }])}
          className="flex items-center gap-2 text-sm text-[#1A5F3D] font-semibold hover:underline"
        ><Plus className="w-4 h-4" /> Add investment</button>
      </div>
    ),

    // ── STEP 6: Risk Profile ────────────────────────────────────────────────
    risk: (
      <div className="space-y-5">
        <StepHeader icon={<ShieldCheck className="w-6 h-6 text-white" />} title="Risk Profile" desc="Understand your investment personality" />

        <Field label="Risk Tolerance">
          <div className="grid grid-cols-3 gap-3">
            {(["low","medium","high"] as const).map(level => (
              <button key={level} type="button"
                onClick={() => patch("riskProfile", { ...profile.riskProfile, tolerance: level })}
                className={`py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                  profile.riskProfile.tolerance === level
                    ? "border-[#1A5F3D] bg-green-50 text-[#1A5F3D]"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {level === "low" ? "🛡️" : level === "medium" ? "⚖️" : "🚀"} {level}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Investment Experience">
          <div className="grid grid-cols-3 gap-3">
            {(["beginner","intermediate","expert"] as const).map(level => (
              <button key={level} type="button"
                onClick={() => patch("riskProfile", { ...profile.riskProfile, experience: level })}
                className={`py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                  profile.riskProfile.experience === level
                    ? "border-[#1A5F3D] bg-green-50 text-[#1A5F3D]"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {level === "beginner" ? "🌱" : level === "intermediate" ? "📈" : "🏆"} {level}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Investment Time Horizon (years)">
          <div className="flex items-center gap-4">
            <input
              type="range" min="1" max="40" step="1"
              value={profile.riskProfile.timeHorizonYears}
              onChange={e => patch("riskProfile", { ...profile.riskProfile, timeHorizonYears: parseInt(e.target.value) })}
              className="flex-1 accent-[#1A5F3D]"
            />
            <span className="text-lg font-bold text-[#1A5F3D] w-12 text-center">
              {profile.riskProfile.timeHorizonYears}y
            </span>
          </div>
        </Field>

        <Field label="Investment Style">
          <div className="grid grid-cols-3 gap-3">
            {(["conservative","balanced","aggressive"] as const).map(style => (
              <button key={style} type="button"
                onClick={() => patch("riskProfile", { ...profile.riskProfile, investmentStyle: style })}
                className={`py-3 rounded-xl border-2 text-xs font-semibold capitalize transition-all ${
                  profile.riskProfile.investmentStyle === style
                    ? "border-[#1A5F3D] bg-green-50 text-[#1A5F3D]"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {style === "conservative" ? "🏦" : style === "balanced" ? "⚖️" : "📊"}<br/>{style}
              </button>
            ))}
          </div>
        </Field>
      </div>
    ),

    // ── STEP 7: Loans ───────────────────────────────────────────────────────
    loans: (
      <div className="space-y-4">
        <StepHeader icon={<CreditCard className="w-6 h-6 text-white" />} title="Loans & Liabilities" desc="Outstanding debts (if any)" />
        <p className="text-xs text-gray-500">Skip this step if you have no loans.</p>

        <div className="space-y-3">
          {profile.loans.map((ln, i) => (
            <div key={ln.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <input
                  className="font-semibold text-sm bg-transparent border-b border-gray-300 focus:border-[#1A5F3D] focus:outline-none px-1 flex-1 mr-3"
                  value={ln.lenderName} placeholder="Lender name"
                  onChange={e => { const u=[...profile.loans]; u[i]={...ln,lenderName:e.target.value}; patch("loans",u); }}
                />
                <button type="button" onClick={() => patch("loans", profile.loans.filter(x => x.id !== ln.id))} className="text-gray-300 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Loan Type</label>
                  <div className="relative">
                    <select className={SELECT} value={ln.type}
                      onChange={e => { const u=[...profile.loans]; u[i]={...ln,type:e.target.value as LoanEntry["type"]}; patch("loans",u); }}
                    >
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
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Interest Rate (%)</label>
                  <input className={INPUT} type="number" placeholder="8.5"
                    value={ln.interestRate || ""}
                    onChange={e => { const u=[...profile.loans]; u[i]={...ln,interestRate:parseFloat(e.target.value)||0}; patch("loans",u); }}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Outstanding (₹)</label>
                  <input className={INPUT} type="number" placeholder="2500000"
                    value={ln.outstandingAmount || ""}
                    onChange={e => { const u=[...profile.loans]; u[i]={...ln,outstandingAmount:parseFloat(e.target.value)||0}; patch("loans",u); }}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Monthly EMI (₹)</label>
                  <input className={INPUT} type="number" placeholder="25000"
                    value={ln.emi || ""}
                    onChange={e => { const u=[...profile.loans]; u[i]={...ln,emi:parseFloat(e.target.value)||0}; patch("loans",u); }}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Remaining Months</label>
                  <input className={INPUT} type="number" placeholder="240"
                    value={ln.remainingMonths || ""}
                    onChange={e => { const u=[...profile.loans]; u[i]={...ln,remainingMonths:parseInt(e.target.value)||0}; patch("loans",u); }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button type="button"
          onClick={() => patch("loans", [...profile.loans, {
            id: uid(), type: "home", lenderName: "", loanAmount: 0,
            outstandingAmount: 0, emi: 0, interestRate: 0, remainingMonths: 0,
          }])}
          className="flex items-center gap-2 text-sm text-[#1A5F3D] font-semibold hover:underline"
        ><Plus className="w-4 h-4" /> Add loan</button>

        {step === STEPS.length - 1 && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-green-800 mb-1">🎉 Almost done!</p>
            <p className="text-xs text-green-700">Click "Finish" to save your profile and go to your personalised dashboard.</p>
          </div>
        )}
      </div>
    ),
  };

  const pct = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FB] via-white to-[#F7F9FB] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center">
            <span className="text-white font-bold text-lg">SF</span>
          </div>
          <span className="font-bold text-xl text-gray-900">SmartFinance</span>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Setup Progress
            </span>
            <span className="text-xs font-bold text-[#1A5F3D]">{pct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#1A5F3D] to-[#3FAF7D] rounded-full"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          {/* Step pills */}
          <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
            {STEPS.map((s, i) => (
              <div key={s.id}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 transition-all ${
                  i < step  ? "bg-green-100 text-green-700"
                : i === step ? "bg-[#1A5F3D] text-white"
                : "bg-gray-100 text-gray-400"
                }`}
              >
                {i < step ? <CheckCircle className="w-3 h-3" /> : s.icon}
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-6 md:p-8">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                initial={{ opacity: 0, x: dir * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -40 }}
                transition={{ duration: 0.25 }}
              >
                {stepContent[STEPS[step].id]}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer nav */}
          <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between gap-3 bg-gray-50">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <span className="text-xs text-gray-400">{step + 1} / {STEPS.length}</span>

            <button
              type="button"
              onClick={next}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] text-white hover:shadow-md hover:scale-105 transition-all disabled:opacity-60"
            >
              {saving ? (
                <><Spinner /> Saving…</>
              ) : step === STEPS.length - 1 ? (
                <><CheckCircle className="w-4 h-4" /> Finish</>
              ) : (
                <>Next <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Your data is stored securely and used only to personalise your experience.
        </p>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepHeader({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 mb-2 pb-4 border-b border-gray-100">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="font-bold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}