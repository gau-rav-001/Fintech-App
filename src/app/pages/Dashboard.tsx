import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Home, TrendingUp, Calculator, FileText, Video, Settings, LogOut,
  Menu, X, Wallet, ArrowUpRight, ArrowDownRight, User, Bell,
  Shield, Target, AlertTriangle, CheckCircle, Info, ChevronRight,
  Newspaper, Play, Sparkles, Zap,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../auth/AuthContext";
import { getFinancialProfile, getAdminContent } from "../data/mockData";
import { getUserProfile } from "../data/userProfile";
import { AIAssistant } from "../components/AIAssistant";
import { NotificationBell } from "../components/NotificationBell";

// ─── Sidebar link ─────────────────────────────────────────────────────────────
function SidebarLink({ icon, label, active, to, onClick }: {
  icon: React.ReactNode; label: string; active?: boolean; to?: string; onClick?: () => void;
}) {
  const cls = `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all cursor-pointer text-sm font-medium ${
    active ? "bg-gradient-to-r from-primary to-[#2D7A4E] text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
  }`;
  const content = <div className={cls} onClick={onClick}>{icon}<span>{label}</span></div>;
  return to ? <Link to={to}>{content}</Link> : content;
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ title, value, change, positive, icon, sub }: {
  title: string; value: string; change?: string; positive?: boolean; icon: React.ReactNode; sub?: string;
}) {
  return (
    <motion.div whileHover={{ y: -3 }}
      className="bg-card rounded-2xl p-5 shadow-sm border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center text-white">
          {icon}
        </div>
        {change && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            positive === false ? "bg-red-50 text-red-600"
            : positive ? "bg-green-50 text-green-600"
            : "bg-blue-50 text-blue-600"
          }`}>{change}</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-0.5">{title}</p>
      <p className="text-xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </motion.div>
  );
}

// ─── Insight card ─────────────────────────────────────────────────────────────
function InsightCard({ type, message, action }: {
  type: "warning" | "success" | "info"; message: string; action?: string;
}) {
  const cfg = {
    warning: { bg: "bg-amber-50 border-amber-200", icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, text: "text-amber-800" },
    success: { bg: "bg-green-50 border-green-200",  icon: <CheckCircle className="w-4 h-4 text-green-500" />,  text: "text-green-800" },
    info:    { bg: "bg-blue-50 border-blue-200",    icon: <Info className="w-4 h-4 text-blue-500" />,          text: "text-blue-800" },
  }[type];
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${cfg.bg}`}>
      <div className="mt-0.5 flex-shrink-0">{cfg.icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs leading-5 ${cfg.text}`}>{message}</p>
        {action && <p className={`text-xs font-semibold mt-1 ${cfg.text}`}>{action}</p>}
      </div>
    </div>
  );
}

// ─── Goal progress ────────────────────────────────────────────────────────────
function GoalBar({ name, icon, current, target, year }: {
  name: string; icon: string; current: number; target: number; year: number;
}) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  const fmt = (n: number) => n >= 10000000 ? `₹${(n/10000000).toFixed(1)}Cr`
    : n >= 100000 ? `₹${(n/100000).toFixed(0)}L` : `₹${n.toLocaleString("en-IN")}`;
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-medium text-foreground">{name}</span>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-foreground">{pct}%</span>
          <span className="text-xs text-muted-foreground ml-1">by {year}</span>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-[#1A5F3D] to-[#3FAF7D] rounded-full"
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{fmt(current)}</span>
        <span>{fmt(target)}</span>
      </div>

    </div>
  );
}

const COLORS = ["#1A5F3D","#2D7A4E","#3FAF7D","#B8E986","#8BC34A","#66BB6A","#4CAF50","#A5D6A7"];

function fmt(n: number) {
  if (n >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n/100000).toFixed(0)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab]     = useState<"overview"|"profile"|"goals"|"insights"|"ai-chat">("overview");
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const fp   = getFinancialProfile(user?.id ?? "demo_001");
  const cms  = getAdminContent();
  const up   = getUserProfile(user?.id ?? "");

  async function handleLogout() { await logout(); navigate("/login", { replace: true }); }

  const displayName  = up?.personal.fullName || user?.name  || "User";
  const displayEmail = up?.personal.email    || user?.email || "";
  const avatarUrl    = up?.personal.avatarDataUrl || user?.avatar;
  const initials     = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  // ── Computed financials ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!fp) return null;
    const totalAssets = fp.savingsAccount + fp.mutualFunds + fp.stocks +
      fp.realEstate + fp.gold + fp.ppf + fp.otherAssets;
    const totalLiabilities = fp.homeLoan + fp.carLoan + fp.personalLoan +
      fp.creditCardDebt + fp.otherLiabilities;
    const netWorth        = totalAssets - totalLiabilities;
    const monthlySavings  = fp.monthlyIncome - fp.monthlyExpenses;
    const savingsRate     = Math.round((monthlySavings / fp.monthlyIncome) * 100);
    const debtRatio       = Math.round((totalLiabilities / totalAssets) * 100);
    const investedTotal   = fp.mutualFunds + fp.stocks + fp.ppf + fp.gold;
    return { totalAssets, totalLiabilities, netWorth, monthlySavings, savingsRate, debtRatio, investedTotal };
  }, [fp]);

  // ── Smart insights ──────────────────────────────────────────────────────
  const insights = useMemo(() => {
    if (!fp || !stats) return [];
    const list: { type: "warning"|"success"|"info"; message: string; action?: string }[] = [];
    // Savings rate
    if (stats.savingsRate < 20) {
      list.push({ type: "warning", message: `Your savings rate is ${stats.savingsRate}% — below the recommended 20%.`, action: `Reduce expenses by ₹${Math.round(fp.monthlyIncome * 0.2 - stats.monthlySavings).toLocaleString("en-IN")} to hit 20%.` });
    } else {
      list.push({ type: "success", message: `Great! Your savings rate is ${stats.savingsRate}% — above the 20% benchmark.` });
    }
    // Emergency fund
    const efTarget = fp.monthlyExpenses * 6;
    const efGoal = fp.goals.find(g => g.category === "emergency");
    const efCurrent = efGoal?.currentAmount ?? fp.savingsAccount;
    if (efCurrent < efTarget) {
      list.push({ type: "warning", message: `Emergency fund gap: ${fmt(efTarget - efCurrent)} short of 6-month target.`, action: "Prioritise building your emergency fund before aggressive investing." });
    }
    // Insurance
    const recommendedLife = fp.monthlyIncome * 12 * 12;
    if (fp.lifeInsuranceCover < recommendedLife) {
      list.push({ type: "warning", message: `You are underinsured. Life cover ${fmt(fp.lifeInsuranceCover)} vs recommended ${fmt(recommendedLife)}.`, action: "Increase term life cover to protect your dependents." });
    }
    if (!fp.homeInsurance) {
      list.push({ type: "info", message: "You don't have home insurance. Your property worth " + fmt(fp.realEstate) + " is unprotected.", action: "Consider a home insurance plan starting at ₹299/month." });
    }
    // Debt ratio
    if (stats.debtRatio > 40) {
      list.push({ type: "warning", message: `High debt-to-asset ratio: ${stats.debtRatio}%. Aim to keep it below 40%.`, action: "Focus on paying down high-interest credit card debt first." });
    }
    // SIP suggestion
    const sipTarget = Math.round(fp.monthlyIncome * 0.15);
    if (fp.monthlysSIP < sipTarget) {
      list.push({ type: "info", message: `Consider increasing your monthly SIP from ${fmt(fp.monthlysSIP)} to ${fmt(sipTarget)} (15% of income).`, action: `Increase SIP by ₹${(sipTarget - fp.monthlysSIP).toLocaleString("en-IN")} to accelerate wealth creation.` });
    }
    // Net worth positive
    if (stats.netWorth > 0) {
      list.push({ type: "success", message: `Your net worth is positive at ${fmt(stats.netWorth)} — you're building real wealth!` });
    }
    return list;
  }, [fp, stats]);

  // ── Allocation data for pie ──────────────────────────────────────────────
  const allocationData = fp ? [
    { name: "Mutual Funds", value: fp.mutualFunds, color: "#1A5F3D" },
    { name: "Stocks",       value: fp.stocks,      color: "#2D7A4E" },
    { name: "Real Estate",  value: fp.realEstate,  color: "#3FAF7D" },
    { name: "Gold",         value: fp.gold,        color: "#B8E986" },
    { name: "PPF",          value: fp.ppf,         color: "#8BC34A" },
    { name: "Savings A/c",  value: fp.savingsAccount, color: "#66BB6A" },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* ── Sidebar ── */}
      <AnimatePresence>
        {(sidebarOpen || (typeof window !== "undefined" && window.innerWidth >= 768)) && (
          <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
            transition={{ type: "spring", damping: 22 }}
            className="fixed md:sticky top-0 left-0 h-screen w-60 bg-card border-r border-border z-50 flex flex-col"
          >
            <div className="p-5 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <Link to="/" className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center">
                    <span className="text-white font-bold text-sm">SF</span>
                  </div>
                  <span className="font-bold text-foreground">SmartFinance</span>
                </Link>
                <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* User badge */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border mb-5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    : initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                </div>
              </div>

              <nav className="space-y-1">
                <SidebarLink icon={<Home className="w-4 h-4" />} label="Overview"
                  active={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
                <SidebarLink icon={<Sparkles className="w-4 h-4 text-emerald-400" />} label="AI Advisor"
                  active={activeTab === "ai-chat"} onClick={() => setActiveTab("ai-chat")} />
                <SidebarLink icon={<User className="w-4 h-4" />} label="My Profile"
                  active={activeTab === "profile"} onClick={() => setActiveTab("profile")} />
                <SidebarLink icon={<Target className="w-4 h-4" />} label="Goals"
                  active={activeTab === "goals"} onClick={() => setActiveTab("goals")} />
                <SidebarLink icon={<Bell className="w-4 h-4" />} label="Insights"
                  active={activeTab === "insights"} onClick={() => setActiveTab("insights")} />
                <div className="h-px bg-border my-2" />
                <SidebarLink icon={<TrendingUp className="w-4 h-4" />} label="Investments" to="/services" />
                <SidebarLink icon={<Calculator className="w-4 h-4" />} label="Calculators" to="/calculator/sip" />
                <SidebarLink icon={<FileText className="w-4 h-4" />} label="Planner" to="/planner" />
                <SidebarLink icon={<Video className="w-4 h-4" />} label="Webinars" to="/webinars" />
                <SidebarLink icon={<Shield className="w-4 h-4" />} label="Insurance" to="/insurance" />
              </nav>
            </div>

            <div className="p-5 border-t border-border">
              <SidebarLink icon={<Settings className="w-4 h-4" />} label="Settings" to="/settings" />
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all mt-1">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main ── */}
      <div className="flex-1 overflow-x-hidden">
        {/* Top bar */}
        <header className="bg-card border-b border-border sticky top-0 z-40">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(s => !s)} className="md:hidden p-2">
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  {activeTab === "overview" ? "Dashboard" : activeTab === "ai-chat" ? "AI Wealth Advisor" : activeTab === "profile" ? "My Profile" : activeTab === "goals" ? "Financial Goals" : "Smart Insights"}
                </h1>
                <p className="text-xs text-muted-foreground">Welcome back, {displayName.split(" ")[0]}!</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell actorType="user" />
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold text-foreground">{displayName}</p>
                <p className="text-xs text-muted-foreground">{displayEmail}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center text-white text-xs font-bold cursor-pointer overflow-hidden"
                onClick={() => setActiveTab("profile")}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  : initials}
              </div>
            </div>
          </div>
          {/* Tab bar */}
          <div className="flex gap-0 border-t border-border px-4 sm:px-6 overflow-x-auto">
            {(["overview", "ai-chat", "profile", "goals", "insights"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}>
                {t === "ai-chat" && <Sparkles className="w-3 h-3 text-emerald-500 inline mr-1" />}
                {t === "ai-chat" ? "AI Advisor" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </header>

        <main className="p-4 sm:p-6">
          {/* ════ TAB: OVERVIEW ════ */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* KPI row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Net Worth" value={stats ? fmt(stats.netWorth) : "—"}
                  change={stats?.netWorth > 0 ? "Positive" : "Negative"}
                  positive={stats?.netWorth > 0}
                  icon={<Wallet className="w-5 h-5" />} />
                <StatCard title="Total Assets" value={stats ? fmt(stats.totalAssets) : "—"}
                  icon={<TrendingUp className="w-5 h-5" />} />
                <StatCard title="Monthly Savings" value={stats ? fmt(stats.monthlySavings) : "—"}
                  change={stats ? `${stats.savingsRate}% rate` : undefined}
                  positive={stats ? stats.savingsRate >= 20 : undefined}
                  icon={<ArrowUpRight className="w-5 h-5" />} />
                <StatCard title="Monthly SIP" value={fp ? fmt(fp.monthlysSIP) : "—"}
                  change="Active" icon={<Calculator className="w-5 h-5" />} />
              </div>

              {/* Charts row */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Portfolio growth */}
                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                  <h3 className="font-bold text-foreground mb-4 text-sm">Portfolio Growth</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={fp?.investmentHistory ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }}
                        tickFormatter={v => v >= 100000 ? `₹${(v/100000).toFixed(0)}L` : `₹${v}`} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Line type="monotone" dataKey="value" stroke="#1A5F3D" strokeWidth={2.5}
                        dot={{ fill: "#1A5F3D", r: 3 }} activeDot={{ r: 5 }} name="Portfolio Value" />
                      <Line type="monotone" dataKey="invested" stroke="#B8E986" strokeWidth={2}
                        dot={false} name="Invested" strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Asset allocation */}
                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                  <h3 className="font-bold text-foreground mb-4 text-sm">Asset Allocation</h3>
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="55%" height={200}>
                      <PieChart>
                        <Pie data={allocationData} cx="50%" cy="50%"
                          innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={2}>
                          {allocationData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5">
                      {allocationData.map((d, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-xs text-muted-foreground">{d.name}</span>
                          </div>
                          <span className="text-xs font-semibold text-foreground">{fmt(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Wealth Assistant – inline chat */}
              <AIAssistant inline />

              {/* Expense breakdown + Insights */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Expense breakdown */}
                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                  <h3 className="font-bold text-foreground mb-4 text-sm">Monthly Expense Breakdown</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={fp?.expenseBreakdown ?? []} layout="vertical" margin={{ left: 12 }}>
                      <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 10 }}
                        tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                      <YAxis type="category" dataKey="name" stroke="#9ca3af" tick={{ fontSize: 10 }} width={80} />
                      <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                      <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                        {fp?.expenseBreakdown.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Smart insights preview */}
                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-foreground text-sm">Smart Insights</h3>
                    <button onClick={() => setActiveTab("insights")}
                      className="text-xs text-[#1A5F3D] font-semibold flex items-center gap-1 hover:underline">
                      View all <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {insights.slice(0, 3).map((ins, i) => (
                      <InsightCard key={i} {...ins} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Admin CMS content */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* News updates */}
                {cms.newsUpdates.length > 0 && (
                  <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Newspaper className="w-4 h-4 text-[#1A5F3D]" />
                      <h3 className="font-bold text-foreground text-sm">Financial Updates</h3>
                    </div>
                    <div className="space-y-3">
                      {cms.newsUpdates.slice(0, 2).map(n => (
                        <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                          {n.urgent && <span className="text-xs font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded shrink-0">URGENT</span>}
                          <div>
                            <p className="text-xs font-semibold text-foreground">{n.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-4">{n.summary}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Upcoming webinars */}
                {cms.webinars.length > 0 && (
                  <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Video className="w-4 h-4 text-[#1A5F3D]" />
                      <h3 className="font-bold text-foreground text-sm">Upcoming Webinars</h3>
                    </div>
                    <div className="space-y-3">
                      {cms.webinars.filter(w => w.status === "upcoming").slice(0, 2).map(w => (
                        <div key={w.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted border border-border">
                          <div className="w-8 h-8 rounded-lg bg-[#1A5F3D] flex items-center justify-center shrink-0">
                            <Play className="w-3 h-3 text-white" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{w.title}</p>
                            <p className="text-xs text-muted-foreground">{w.date} · {w.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Learning videos from admin */}
                {cms.videos.length > 0 && (
                  <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Play className="w-4 h-4 text-[#1A5F3D]" />
                      <h3 className="font-bold text-foreground text-sm">Learning Resources</h3>
                    </div>
                    <div className="space-y-3">
                      {cms.videos.slice(0, 2).map(v => (
                        <a key={v.id} href={v.youtubeUrl || "#"} target="_blank" rel="noopener noreferrer"
                          className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                          <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center shrink-0">
                            <Play className="w-3 h-3 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{v.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{v.description}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════ TAB: AI ADVISOR ════ */}
          {activeTab === "ai-chat" && (
            <div className="space-y-4 max-w-6xl mx-auto">
              <div className="bg-card rounded-2xl p-5 border border-border shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    SmartFinance AI Wealth Advisor
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ask anything: real-time stock prices (SBI, Reliance, Nifty), reverse SIP math, tax regime recommendations, or net worth analytics.
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                    🟢 Live Market Feeds & Offline Brain
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
                <AIAssistant inline />
              </div>
            </div>
          )}

          {/* ════ TAB: PROFILE ════ */}
          {activeTab === "profile" && fp && (
            <div className="space-y-6 max-w-4xl">
              {/* Header */}
              <div className="bg-gradient-to-br from-[#1A5F3D] to-[#2D7A4E] rounded-2xl p-6 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold overflow-hidden">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover rounded-2xl" />
                      : initials}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{displayName}</h2>
                    <p className="text-white/75 text-sm">{displayEmail}</p>
                    <p className="text-white/75 text-sm">{up?.personal.mobile || user?.phone || ""}</p>
                    <span className="inline-block mt-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">
                      {up?.personal.occupation || (fp.employmentType === "salaried" ? "Salaried" : fp.employmentType === "business" ? "Business Owner" : "Self-Employed")}
                      {up?.personal.city ? ` · ${up.personal.city}` : ""}
                    </span>
                  </div>
                  <div className="ml-auto">
                    <Link to="/settings"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-semibold transition-all">
                      <Settings className="w-3.5 h-3.5" /> Edit Profile
                    </Link>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Personal info */}
                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                  <h3 className="font-bold text-foreground mb-4 text-sm flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Personal Information
                  </h3>
                  {[
                    ["Full Name",       up?.personal.fullName || displayName],
                    ["Date of Birth",   up?.personal.dob ? new Date(up.personal.dob).toLocaleDateString("en-IN") : fp.dob ? new Date(fp.dob).toLocaleDateString("en-IN") : "—"],
                    ["Gender",          up?.personal.gender ? up.personal.gender.replace(/_/g, " ") : "—"],
                    ["Marital Status",  up?.personal.maritalStatus || fp.maritalStatus],
                    ["Dependents",      String(up?.personal.dependents ?? fp.dependents)],
                    ["Occupation",      up?.personal.occupation || "—"],
                    ["Location",        up ? `${up.personal.city}, ${up.personal.state}`.replace(/^, |, $/, "") : "—"],
                    ["Risk Tolerance",  up?.riskProfile.tolerance || user?.riskProfile || "Moderate"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-2 border-b border-border last:border-0">
                      <span className="text-xs text-muted-foreground">{k}</span>
                      <span className="text-xs font-semibold text-foreground capitalize">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Income & expenses */}
                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                  <h3 className="font-bold text-foreground mb-4 text-sm flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-primary" /> Income & Expenses
                  </h3>
                  {[
                    ["Monthly Income",   fmt(fp.monthlyIncome)],
                    ["Monthly Expenses", fmt(fp.monthlyExpenses)],
                    ["Monthly Savings",  fmt(stats?.monthlySavings ?? 0)],
                    ["Savings Rate",     `${stats?.savingsRate ?? 0}%`],
                    ["Monthly SIP",      fmt(fp.monthlysSIP)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-2 border-b border-border last:border-0">
                      <span className="text-xs text-muted-foreground">{k}</span>
                      <span className="text-xs font-semibold text-foreground">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Assets */}
                <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                  <h3 className="font-bold text-foreground mb-4 text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" /> Assets
                  </h3>
                  {[
                    ["Savings Account", fmt(fp.savingsAccount)],
                    ["Mutual Funds",    fmt(fp.mutualFunds)],
                    ["Stocks",          fmt(fp.stocks)],
                    ["Real Estate",     fmt(fp.realEstate)],
                    ["Gold",            fmt(fp.gold)],
                    ["PPF",             fmt(fp.ppf)],
                    ["Total Assets",    fmt(stats?.totalAssets ?? 0)],
                  ].map(([k, v], i) => (
                    <div key={k} className={`flex justify-between py-2 border-b border-border last:border-0 ${i === 6 ? "font-bold" : ""}`}>
                      <span className={`text-xs ${i === 6 ? "text-primary font-semibold" : "text-muted-foreground"}`}>{k}</span>
                      <span className={`text-xs font-semibold ${i === 6 ? "text-primary" : "text-foreground"}`}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Liabilities + Insurance */}
                <div className="space-y-4">
                  <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                    <h3 className="font-bold text-foreground mb-4 text-sm flex items-center gap-2">
                      <ArrowDownRight className="w-4 h-4 text-red-500" /> Loans & Liabilities
                    </h3>
                    {up?.loans && up.loans.length > 0 ? (
                      <div className="space-y-3">
                        {up.loans.map((loan) => (
                          <div key={loan.id} className="p-3 rounded-xl bg-red-50 border border-red-100">
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-xs font-semibold text-foreground capitalize">{loan.lenderName || loan.type.replace("_"," ")}</p>
                              <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium capitalize">{loan.type.replace("_"," ")}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs mt-1.5">
                              <div><p className="text-muted-foreground">Outstanding</p><p className="font-bold text-red-600">{fmt(loan.outstandingAmount)}</p></div>
                              <div><p className="text-muted-foreground">EMI/mo</p><p className="font-semibold text-foreground">{fmt(loan.emi)}</p></div>
                              <div><p className="text-muted-foreground">Rate</p><p className="font-semibold text-foreground">{loan.interestRate}%</p></div>
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-between py-2 border-t border-border mt-1">
                          <span className="text-xs text-red-500 font-semibold">Total Liabilities</span>
                          <span className="text-xs font-bold text-red-500">{fmt(stats?.totalLiabilities ?? 0)}</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {[
                          ["Home Loan",        fmt(fp.homeLoan)],
                          ["Car Loan",         fmt(fp.carLoan)],
                          ["Credit Card Debt", fmt(fp.creditCardDebt)],
                          ["Total Liabilities",fmt(stats?.totalLiabilities ?? 0)],
                        ].map(([k, v], i) => (
                          <div key={k} className="flex justify-between py-2 border-b border-border last:border-0">
                            <span className={`text-xs ${i === 3 ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>{k}</span>
                            <span className={`text-xs font-semibold ${i === 3 ? "text-red-500" : "text-foreground"}`}>{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                    <h3 className="font-bold text-foreground mb-4 text-sm flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" /> Insurance Coverage
                    </h3>
                    {[
                      ["Life Insurance",    fmt(fp.lifeInsuranceCover)],
                      ["Health Insurance",  fmt(fp.healthInsuranceCover)],
                      ["Vehicle Insurance", fp.vehicleInsurance ? "✅ Active" : "❌ None"],
                      ["Home Insurance",    fp.homeInsurance ? "✅ Active" : "❌ None"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between py-2 border-b border-border last:border-0">
                        <span className="text-xs text-muted-foreground">{k}</span>
                        <span className="text-xs font-semibold text-foreground">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* SIP Funds */}
              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                <h3 className="font-bold text-foreground mb-4 text-sm">Active SIP Funds</h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  {fp.sipFunds.map((fund, i) => (
                    <div key={i} className="p-4 rounded-xl bg-muted border border-border">
                      <p className="text-xs font-semibold text-foreground mb-1">{fund.name}</p>
                      <p className="text-lg font-bold text-primary">{fmt(fund.amount)}<span className="text-xs text-muted-foreground font-normal">/mo</span></p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground capitalize">{fund.type}</span>
                        <span className="text-xs font-semibold text-green-600">+{fund.returns}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════ TAB: GOALS ════ */}
          {activeTab === "goals" && (
            <div className="space-y-6 max-w-3xl">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Financial Goals</h2>
                <Link to="/settings" state={{ tab: "goals" }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                  <Settings className="w-3.5 h-3.5" /> Edit Goals
                </Link>
              </div>

              {(!fp?.goals || fp.goals.length === 0) ? (
                <div className="bg-card rounded-2xl p-10 border border-dashed border-border text-center">
                  <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium mb-1">No goals set yet</p>
                  <p className="text-sm text-muted-foreground mb-4">Add financial goals to track your progress</p>
                  <Link to="/settings" state={{ tab: "goals" }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition">
                    <Target className="w-4 h-4" /> Add Your First Goal
                  </Link>
                </div>
              ) : (
              <>
              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                <h3 className="font-bold text-foreground mb-6 text-sm">Goal Progress Tracker</h3>
                {fp?.goals.map((g) => (
                  <GoalBar key={g.id} name={g.name} icon={g.icon}
                    current={g.currentAmount} target={g.targetAmount} year={g.targetYear} />
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {fp?.goals.map((g) => {
                  const pct = Math.round((g.currentAmount / g.targetAmount) * 100);
                  const remaining = g.targetAmount - g.currentAmount;
                  const years = g.targetYear - new Date().getFullYear();
                  const monthlyNeeded = years > 0 ? Math.round(remaining / (years * 12)) : 0;
                  return (
                    <div key={g.id} className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{g.icon}</span>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{g.name}</p>
                          <p className="text-xs text-muted-foreground">Target: {g.targetYear}</p>
                        </div>
                        <div className="ml-auto text-right">
                          <p className="text-lg font-bold text-primary">{pct}%</p>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Achieved</span>
                          <span className="font-semibold text-foreground">{fmt(g.currentAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Target</span>
                          <span className="font-semibold text-foreground">{fmt(g.targetAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Remaining</span>
                          <span className="font-semibold text-amber-600">{fmt(remaining)}</span>
                        </div>
                        {monthlyNeeded > 0 && (
                          <div className="flex justify-between pt-1 border-t border-border">
                            <span className="text-muted-foreground">Monthly needed</span>
                            <span className="font-bold text-primary">{fmt(monthlyNeeded)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              </> /* end else (has goals) */
              )}
            </div>
          )}

          {/* ════ TAB: INSIGHTS ════ */}
          {activeTab === "insights" && (
            <div className="space-y-4 max-w-2xl">
              <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                <h3 className="font-bold text-foreground mb-5 text-sm">
                  🧠 Personalised Financial Insights
                </h3>
                <div className="space-y-3">
                  {insights.map((ins, i) => (
                    <InsightCard key={i} {...ins} />
                  ))}
                </div>
              </div>

              {/* Net worth summary card */}
              {stats && (
                <div className="bg-gradient-to-br from-[#0f2a1d] to-[#1A5F3D] rounded-2xl p-5 text-white">
                  <p className="text-xs text-white/65 mb-1">Your Net Worth</p>
                  <p className="text-4xl font-bold mb-4">{fmt(stats.netWorth)}</p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-white/65">Total Assets</p>
                      <p className="text-sm font-bold">{fmt(stats.totalAssets)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/65">Liabilities</p>
                      <p className="text-sm font-bold">{fmt(stats.totalLiabilities)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/65">Debt Ratio</p>
                      <p className={`text-sm font-bold ${stats.debtRatio > 40 ? "text-amber-300" : "text-[#D8F46B]"}`}>
                        {stats.debtRatio}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      {/* Floating AI assistant available on all dashboard tabs */}
      <AIAssistant />
    </div>
  );
}
