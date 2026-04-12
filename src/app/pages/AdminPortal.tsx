import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  BarChart3, Users, Video, Newspaper, Play, LogOut, Plus, Trash2, Edit2,
  Shield, TrendingUp, Eye, Search, X, CheckCircle, AlertCircle, Save,
  ChevronRight, ChevronDown, Wallet, Target, CreditCard, PieChart,
  ArrowUpRight, ArrowDownRight, Activity, Bell, Filter, RefreshCw,
  Calendar, Clock, Link2, Tag, Zap, UserCheck, TrendingDown,
  BookOpen, Star, MoreVertical,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAdminAuth } from "../auth/AuthContext";
import { getAllUsers } from "../auth/authService";
import {
  getAdminContent, saveAdminContent, getAllFinancialProfiles,
  type Webinar, type NewsUpdate, type VideoResource,
} from "../data/mockData";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1000)       return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}
function uid() { return `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }
function initials(name: string) { return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(); }
function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

type Tab = "overview" | "users" | "webinars" | "news" | "videos";

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, trend, color }: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; trend?: { val: string; up: boolean }; color: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-[#0F1923] rounded-2xl p-5 border border-white/5 relative overflow-hidden group"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity`} />
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-xs text-[#8BA3B8] mt-0.5 font-medium">{label}</p>
      {sub && <p className="text-xs text-[#8BA3B8]/70 mt-1">{sub}</p>}
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${trend.up ? "text-[#3FAF7D]" : "text-red-400"}`}>
          {trend.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend.val}
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Admin Portal ────────────────────────────────────────────────────────
export function AdminPortal() {
  const navigate = useNavigate();
  const { adminUser, adminLogout } = useAdminAuth();
  const [tab, setTab]       = useState<Tab>("overview");
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState<{ msg: string; ok: boolean } | null>(null);
  const [sideCollapsed, setSideCollapsed] = useState(false);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }
  function handleLogout() { adminLogout(); navigate("/admin/login", { replace: true }); }

  const users    = useMemo(() => getAllUsers(), []);
  const profiles = useMemo(() => getAllFinancialProfiles(), []);
  const [content, setContent] = useState(() => getAdminContent());

  async function persist(updated: typeof content) {
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    saveAdminContent(updated);
    setContent(updated);
    setSaving(false);
    showToast("Changes saved successfully.");
  }

  const sideItems: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "overview", label: "Overview",      icon: <BarChart3 className="w-4 h-4" /> },
    { id: "users",    label: "Users",         icon: <Users className="w-4 h-4" />,    badge: users.length },
    { id: "webinars", label: "Webinars",      icon: <Video className="w-4 h-4" /> },
    { id: "news",     label: "News",          icon: <Newspaper className="w-4 h-4" /> },
    { id: "videos",   label: "Videos",        icon: <Play className="w-4 h-4" /> },
  ];

  // Global stats for overview
  const profilesArr  = Object.values(profiles);
  const totalAssets  = profilesArr.reduce((s, p) => s + p.savingsAccount + p.mutualFunds + p.stocks + p.realEstate + p.gold + p.ppf, 0);
  const totalLoans   = profilesArr.reduce((s, p) => s + p.homeLoan + p.carLoan + p.personalLoan + p.creditCardDebt, 0);
  const avgIncome    = profilesArr.length ? Math.round(profilesArr.reduce((s, p) => s + p.monthlyIncome, 0) / profilesArr.length) : 0;

  return (
    <div className="min-h-screen flex" style={{ background: "#080E14", color: "#E8F1F8", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,   scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            className={`fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl text-sm font-semibold border ${
              toast.ok
                ? "bg-[#0F2A1E] border-[#3FAF7D]/30 text-[#3FAF7D]"
                : "bg-[#2A1010] border-red-500/30 text-red-400"
            }`}
          >
            {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <motion.aside
        animate={{ width: sideCollapsed ? 64 : 220 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="bg-[#0A1420] border-r border-white/5 flex flex-col h-screen sticky top-0 overflow-hidden z-40"
      >
        {/* Logo */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#3FAF7D]/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            {!sideCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
                <p className="font-bold text-sm text-white leading-none">SmartFinance</p>
                <p className="text-[10px] text-[#3FAF7D] mt-0.5">Admin Panel</p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2.5 space-y-0.5">
          {sideItems.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              title={sideCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative group ${
                tab === item.id
                  ? "bg-gradient-to-r from-[#1A5F3D]/60 to-[#1A5F3D]/20 text-white border border-[#3FAF7D]/20"
                  : "text-[#8BA3B8] hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className={`flex-shrink-0 ${tab === item.id ? "text-[#3FAF7D]" : ""}`}>{item.icon}</span>
              {!sideCollapsed && <span className="truncate">{item.label}</span>}
              {!sideCollapsed && item.badge !== undefined && (
                <span className="ml-auto text-[10px] bg-[#1A5F3D]/40 text-[#3FAF7D] px-1.5 py-0.5 rounded-full font-bold">
                  {item.badge}
                </span>
              )}
              {tab === item.id && <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#3FAF7D] rounded-full" />}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-2.5 border-t border-white/5 space-y-0.5">
          <button
            onClick={() => setSideCollapsed(v => !v)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#8BA3B8] hover:bg-white/5 hover:text-white transition-all"
          >
            <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform ${sideCollapsed ? "" : "rotate-180"}`} />
            {!sideCollapsed && <span>Collapse</span>}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!sideCollapsed && <span>Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* ── Main ── */}
      <div className="flex-1 min-w-0 overflow-x-hidden">

        {/* Header */}
        <header className="bg-[#0A1420]/80 backdrop-blur-md border-b border-white/5 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="font-bold text-base text-white capitalize">
              {tab === "overview" ? "Dashboard" : sideItems.find(s => s.id === tab)?.label}
            </h1>
            <p className="text-xs text-[#8BA3B8]">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {saving && (
              <div className="flex items-center gap-2 text-xs text-[#8BA3B8]">
                <Spinner /> <span>Saving…</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center text-[10px] font-bold text-white">
                {adminUser?.name ? initials(adminUser.name) : "A"}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-white leading-none">{adminUser?.name}</p>
                <p className="text-[10px] text-[#8BA3B8]">Super Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-5 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >

              {/* ══ OVERVIEW ══ */}
              {tab === "overview" && (
                <OverviewTab
                  users={users} profiles={profiles} content={content}
                  totalAssets={totalAssets} totalLoans={totalLoans} avgIncome={avgIncome}
                  onTabChange={setTab}
                />
              )}

              {/* ══ USERS ══ */}
              {tab === "users" && (
                <UsersTab users={users} profiles={profiles} />
              )}

              {/* ══ WEBINARS ══ */}
              {tab === "webinars" && (
                <WebinarsTab
                  webinars={content.webinars}
                  adminId={adminUser?.id ?? "admin_001"}
                  onSave={updated => persist({ ...content, webinars: updated })}
                  showToast={showToast}
                />
              )}

              {/* ══ NEWS ══ */}
              {tab === "news" && (
                <NewsTab
                  news={content.newsUpdates}
                  adminId={adminUser?.id ?? "admin_001"}
                  onSave={updated => persist({ ...content, newsUpdates: updated })}
                  showToast={showToast}
                />
              )}

              {/* ══ VIDEOS ══ */}
              {tab === "videos" && (
                <VideosTab
                  videos={content.videos}
                  adminId={adminUser?.id ?? "admin_001"}
                  onSave={updated => persist({ ...content, videos: updated })}
                  showToast={showToast}
                />
              )}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ users, profiles, content, totalAssets, totalLoans, avgIncome, onTabChange }: {
  users: ReturnType<typeof getAllUsers>;
  profiles: ReturnType<typeof getAllFinancialProfiles>;
  content: ReturnType<typeof getAdminContent>;
  totalAssets: number; totalLoans: number; avgIncome: number;
  onTabChange: (t: Tab) => void;
}) {
  const profilesArr = Object.values(profiles);

  return (
    <div className="space-y-6">

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-white" />}
          label="Total Users" value={users.length}
          sub={`${users.filter(u => u.provider === "google").length} via Google`}
          color="from-blue-600 to-blue-400"
          trend={{ val: "Active platform", up: true }}
        />
        <StatCard
          icon={<Wallet className="w-5 h-5 text-white" />}
          label="Avg Monthly Income" value={fmt(avgIncome)}
          sub="across profiled users"
          color="from-[#1A5F3D] to-[#3FAF7D]"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-white" />}
          label="Total User Assets" value={fmt(totalAssets)}
          color="from-violet-600 to-violet-400"
        />
        <StatCard
          icon={<CreditCard className="w-5 h-5 text-white" />}
          label="Total User Loans" value={fmt(totalLoans)}
          color="from-rose-600 to-rose-400"
          trend={{ val: "Liabilities", up: false }}
        />
      </div>

      {/* Content stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Webinars",      value: content.webinars.length,      live: content.webinars.filter(w=>w.status==="live").length,     icon: <Video className="w-4 h-4" />,     color: "text-[#3FAF7D]", tab: "webinars" as Tab },
          { label: "News Articles", value: content.newsUpdates.length,   live: content.newsUpdates.filter(n=>n.urgent).length,            icon: <Newspaper className="w-4 h-4" />, color: "text-amber-400", tab: "news" as Tab },
          { label: "Videos",        value: content.videos.length,         live: 0,                                                        icon: <Play className="w-4 h-4" />,      color: "text-red-400",   tab: "videos" as Tab },
        ].map(c => (
          <button key={c.label} onClick={() => onTabChange(c.tab)}
            className="bg-[#0F1923] rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all group text-left">
            <div className="flex items-center justify-between mb-2">
              <span className={`${c.color}`}>{c.icon}</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#8BA3B8] group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-xl font-bold text-white">{c.value}</p>
            <p className="text-xs text-[#8BA3B8]">{c.label}</p>
            {c.live > 0 && (
              <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" /> {c.live} urgent/live
              </p>
            )}
          </button>
        ))}
      </div>

      {/* Two-column: recent users + investment breakdown */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* Recent users */}
        <div className="bg-[#0F1923] rounded-2xl border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#3FAF7D]" /> Recent Users
            </h3>
            <button onClick={() => onTabChange("users")} className="text-xs text-[#3FAF7D] hover:text-[#5FCFA0] flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div>
            {users.slice(0, 6).map((u, i) => {
              const fp = profiles[u.id];
              return (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 px-5 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-all"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                    {initials(u.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                    <p className="text-xs text-[#8BA3B8] truncate">{u.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {fp ? (
                      <>
                        <p className="text-xs font-bold text-[#3FAF7D]">{fmt(fp.monthlyIncome)}</p>
                        <p className="text-[10px] text-[#8BA3B8]">/month</p>
                      </>
                    ) : (
                      <span className="text-xs text-[#8BA3B8]">—</span>
                    )}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                    u.provider === "google" ? "bg-blue-900/50 text-blue-400" : "bg-[#1A5F3D]/30 text-[#3FAF7D]"
                  }`}>
                    {u.provider}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Platform health */}
        <div className="bg-[#0F1923] rounded-2xl border border-white/5 p-5">
          <h3 className="font-bold text-sm text-white flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-violet-400" /> Platform Health
          </h3>
          <div className="space-y-3">
            {[
              { label: "Users with full profile", val: profilesArr.length, total: users.length, color: "#3FAF7D" },
              { label: "Users with investments",  val: profilesArr.filter(p=>p.mutualFunds+p.stocks>0).length, total: users.length, color: "#60A5FA" },
              { label: "Users with active goals", val: profilesArr.filter(p=>p.goals.length>0).length, total: users.length, color: "#A78BFA" },
              { label: "Users with loans",        val: profilesArr.filter(p=>p.homeLoan+p.carLoan+p.personalLoan>0).length, total: users.length, color: "#F87171" },
            ].map(item => {
              const pct = item.total > 0 ? Math.round((item.val / item.total) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#8BA3B8]">{item.label}</span>
                    <span className="font-semibold text-white">{item.val} <span className="text-[#8BA3B8] font-normal">/ {item.total}</span></span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-white/5">
            <h4 className="text-xs font-semibold text-[#8BA3B8] mb-3 uppercase tracking-wider">Asset Distribution</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Mutual Funds", val: profilesArr.reduce((s,p)=>s+p.mutualFunds,0), color: "#3FAF7D" },
                { label: "Stocks",       val: profilesArr.reduce((s,p)=>s+p.stocks,0),      color: "#60A5FA" },
                { label: "Real Estate",  val: profilesArr.reduce((s,p)=>s+p.realEstate,0),  color: "#F59E0B" },
              ].map(a => (
                <div key={a.label} className="bg-white/[0.03] rounded-xl p-2.5 text-center">
                  <div className="w-2 h-2 rounded-full mx-auto mb-1.5" style={{ background: a.color }} />
                  <p className="text-xs font-bold text-white">{fmt(a.val)}</p>
                  <p className="text-[10px] text-[#8BA3B8]">{a.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent content */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Latest news */}
        <div className="bg-[#0F1923] rounded-2xl border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-amber-400" /> Latest News
            </h3>
            <button onClick={() => onTabChange("news")} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
              Manage <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {content.newsUpdates.slice(0, 3).map(n => (
              <div key={n.id} className="px-5 py-3">
                <div className="flex items-start gap-2">
                  {n.urgent && <Zap className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white line-clamp-1">{n.title}</p>
                    <p className="text-xs text-[#8BA3B8] line-clamp-1 mt-0.5">{n.summary}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming webinars */}
        <div className="bg-[#0F1923] rounded-2xl border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Video className="w-4 h-4 text-[#3FAF7D]" /> Upcoming Webinars
            </h3>
            <button onClick={() => onTabChange("webinars")} className="text-xs text-[#3FAF7D] hover:text-[#5FCFA0] flex items-center gap-1">
              Manage <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {content.webinars.filter(w => w.status === "upcoming").slice(0, 3).map(w => (
              <div key={w.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1A5F3D]/30 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-[#3FAF7D]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white line-clamp-1">{w.title}</p>
                  <p className="text-xs text-[#8BA3B8]">{w.date} · {w.time}</p>
                </div>
              </div>
            ))}
            {content.webinars.filter(w => w.status === "upcoming").length === 0 && (
              <p className="text-xs text-[#8BA3B8] px-5 py-4">No upcoming webinars.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab({ users, profiles }: {
  users: ReturnType<typeof getAllUsers>;
  profiles: ReturnType<typeof getAllFinancialProfiles>;
}) {
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<string | null>(null);
  const [filterProv, setFilterProv] = useState<"all" | "email" | "google">("all");
  const [expandedSection, setExpandedSection] = useState<string | null>("financial");

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                        u.email.toLowerCase().includes(search.toLowerCase());
    const matchProv = filterProv === "all" || u.provider === filterProv;
    return matchSearch && matchProv;
  });

  const selectedUser    = users.find(u => u.id === selected);
  const fp              = selected ? profiles[selected] : null;
  const netWorth        = fp ? (fp.savingsAccount + fp.mutualFunds + fp.stocks + fp.realEstate + fp.gold + fp.ppf)
                              - (fp.homeLoan + fp.carLoan + fp.personalLoan + fp.creditCardDebt) : 0;
  const totalAssets     = fp ? fp.savingsAccount + fp.mutualFunds + fp.stocks + fp.realEstate + fp.gold + fp.ppf : 0;
  const totalLiabilities = fp ? fp.homeLoan + fp.carLoan + fp.personalLoan + fp.creditCardDebt : 0;

  function toggleSection(s: string) { setExpandedSection(prev => prev === s ? null : s); }

  return (
    <div className="flex gap-5 h-[calc(100vh-130px)]">

      {/* Left: User list */}
      <div className="w-80 flex-shrink-0 flex flex-col bg-[#0F1923] rounded-2xl border border-white/5 overflow-hidden">
        {/* Search + filter */}
        <div className="p-3 border-b border-white/5 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8BA3B8]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users…"
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-[#8BA3B8] outline-none focus:border-[#3FAF7D]/50 transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8BA3B8] hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
            {(["all", "email", "google"] as const).map(p => (
              <button
                key={p}
                onClick={() => setFilterProv(p)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  filterProv === p ? "bg-[#1A5F3D] text-white" : "bg-white/5 text-[#8BA3B8] hover:bg-white/10"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#8BA3B8] px-1">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <Search className="w-8 h-8 text-white/10 mb-2" />
              <p className="text-xs text-[#8BA3B8]">No users found</p>
            </div>
          )}
          {filtered.map(u => {
            const p = profiles[u.id];
            const isSelected = selected === u.id;
            return (
              <motion.button
                key={u.id}
                whileHover={{ x: 2 }}
                onClick={() => setSelected(u.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-white/5 transition-all text-left ${
                  isSelected
                    ? "bg-gradient-to-r from-[#1A5F3D]/30 to-transparent border-l-2 border-l-[#3FAF7D]"
                    : "hover:bg-white/[0.02]"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold text-white ${
                  isSelected ? "bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D]" : "bg-white/10"
                }`}>
                  {initials(u.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                  <p className="text-xs text-[#8BA3B8] truncate">{u.email}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {p ? (
                    <p className="text-xs font-bold text-[#3FAF7D]">{fmt(p.monthlyIncome)}</p>
                  ) : (
                    <span className="text-[10px] text-[#8BA3B8] bg-white/5 px-1.5 py-0.5 rounded">No profile</span>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold block mt-0.5 ${
                    u.provider === "google" ? "text-blue-400" : "text-[#3FAF7D]"
                  }`}>
                    {u.provider}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Right: User detail panel */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          {!selected ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-center bg-[#0F1923] rounded-2xl border border-white/5"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-white/20" />
              </div>
              <p className="text-sm font-semibold text-white/40">Select a user</p>
              <p className="text-xs text-[#8BA3B8]/50 mt-1">Click any user to view their full profile</p>
            </motion.div>
          ) : (
            <motion.div
              key={selected}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              {/* User header card */}
              <div className="bg-[#0F1923] rounded-2xl border border-white/5 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-[#3FAF7D]/20">
                      {initials(selectedUser?.name ?? "")}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">{selectedUser?.name}</h2>
                      <p className="text-sm text-[#8BA3B8]">{selectedUser?.email}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          selectedUser?.provider === "google" ? "bg-blue-900/40 text-blue-400" : "bg-[#1A5F3D]/40 text-[#3FAF7D]"
                        }`}>{selectedUser?.provider}</span>
                        {fp && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-900/40 text-violet-400 font-semibold capitalize">{fp.employmentType?.replace("_", " ")}</span>}
                        {fp && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400 font-semibold capitalize">{fp.cityTier}</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-[#8BA3B8] hover:text-white p-1.5 rounded-lg hover:bg-white/5">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {fp && (
                  <div className="grid grid-cols-4 gap-3 mt-5">
                    {[
                      { label: "Net Worth",  value: fmt(netWorth),        color: netWorth >= 0 ? "text-[#3FAF7D]" : "text-red-400" },
                      { label: "Total Assets",      value: fmt(totalAssets),     color: "text-blue-400" },
                      { label: "Total Liabilities", value: fmt(totalLiabilities), color: "text-rose-400" },
                      { label: "Monthly SIP",       value: fmt(fp.monthlysSIP),  color: "text-violet-400" },
                    ].map(s => (
                      <div key={s.label} className="bg-white/[0.03] rounded-xl p-3 text-center">
                        <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] text-[#8BA3B8] mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {fp ? (
                <>
                  {/* Collapsible sections */}

                  {/* Financial Overview */}
                  <CollapsibleSection
                    id="financial" title="Financial Overview" icon={<PieChart className="w-4 h-4 text-[#3FAF7D]" />}
                    expanded={expandedSection === "financial"} onToggle={toggleSection}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: "Monthly Income",   val: fmt(fp.monthlyIncome),   color: "#3FAF7D" },
                        { label: "Monthly Expenses",  val: fmt(fp.monthlyExpenses), color: "#F87171" },
                        { label: "Monthly Savings",   val: fmt(fp.monthlyIncome - fp.monthlyExpenses), color: "#60A5FA" },
                        { label: "Savings Account",   val: fmt(fp.savingsAccount),  color: "#A78BFA" },
                        { label: "Mutual Funds",      val: fmt(fp.mutualFunds),     color: "#34D399" },
                        { label: "Stocks",            val: fmt(fp.stocks),          color: "#FCD34D" },
                        { label: "Real Estate",       val: fmt(fp.realEstate),      color: "#FB923C" },
                        { label: "Gold",              val: fmt(fp.gold),            color: "#F59E0B" },
                        { label: "PPF",               val: fmt(fp.ppf),             color: "#6EE7B7" },
                      ].map(item => (
                        <div key={item.label} className="bg-white/[0.03] rounded-xl p-3">
                          <p className="text-sm font-bold" style={{ color: item.color }}>{item.val}</p>
                          <p className="text-xs text-[#8BA3B8] mt-0.5">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>

                  {/* Loans & Liabilities */}
                  <CollapsibleSection
                    id="loans" title="Loans & Liabilities" icon={<CreditCard className="w-4 h-4 text-rose-400" />}
                    expanded={expandedSection === "loans"} onToggle={toggleSection}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Home Loan",      val: fp.homeLoan },
                        { label: "Car Loan",       val: fp.carLoan },
                        { label: "Personal Loan",  val: fp.personalLoan },
                        { label: "Credit Card",    val: fp.creditCardDebt },
                      ].map(item => (
                        <div key={item.label} className={`bg-white/[0.03] rounded-xl p-3 ${item.val === 0 ? "opacity-40" : ""}`}>
                          <p className={`text-sm font-bold ${item.val > 0 ? "text-rose-400" : "text-[#8BA3B8]"}`}>
                            {item.val > 0 ? fmt(item.val) : "None"}
                          </p>
                          <p className="text-xs text-[#8BA3B8] mt-0.5">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </CollapsibleSection>

                  {/* Insurance */}
                  <CollapsibleSection
                    id="insurance" title="Insurance Coverage" icon={<Shield className="w-4 h-4 text-blue-400" />}
                    expanded={expandedSection === "insurance"} onToggle={toggleSection}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/[0.03] rounded-xl p-3">
                        <p className="text-sm font-bold text-blue-400">{fmt(fp.lifeInsuranceCover)}</p>
                        <p className="text-xs text-[#8BA3B8] mt-0.5">Life Insurance Cover</p>
                      </div>
                      <div className="bg-white/[0.03] rounded-xl p-3">
                        <p className="text-sm font-bold text-green-400">{fmt(fp.healthInsuranceCover)}</p>
                        <p className="text-xs text-[#8BA3B8] mt-0.5">Health Insurance Cover</p>
                      </div>
                      <div className={`bg-white/[0.03] rounded-xl p-3 flex items-center gap-2 ${!fp.vehicleInsurance ? "opacity-40" : ""}`}>
                        {fp.vehicleInsurance ? <CheckCircle className="w-4 h-4 text-green-400" /> : <X className="w-4 h-4 text-[#8BA3B8]" />}
                        <p className="text-xs text-[#8BA3B8]">Vehicle Insurance</p>
                      </div>
                      <div className={`bg-white/[0.03] rounded-xl p-3 flex items-center gap-2 ${!fp.homeInsurance ? "opacity-40" : ""}`}>
                        {fp.homeInsurance ? <CheckCircle className="w-4 h-4 text-green-400" /> : <X className="w-4 h-4 text-[#8BA3B8]" />}
                        <p className="text-xs text-[#8BA3B8]">Home Insurance</p>
                      </div>
                    </div>
                  </CollapsibleSection>

                  {/* Goals */}
                  {fp.goals.length > 0 && (
                    <CollapsibleSection
                      id="goals" title={`Financial Goals (${fp.goals.length})`} icon={<Target className="w-4 h-4 text-violet-400" />}
                      expanded={expandedSection === "goals"} onToggle={toggleSection}
                    >
                      <div className="space-y-3">
                        {fp.goals.map(g => {
                          const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
                          return (
                            <div key={g.id} className="bg-white/[0.03] rounded-xl p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{g.icon}</span>
                                  <span className="text-sm font-semibold text-white">{g.name}</span>
                                </div>
                                <span className="text-xs font-bold text-violet-400">{pct}%</span>
                              </div>
                              <div className="flex justify-between text-xs text-[#8BA3B8] mb-1.5">
                                <span>{fmt(g.currentAmount)} saved</span>
                                <span>Target: {fmt(g.targetAmount)} by {g.targetYear}</span>
                              </div>
                              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.8 }}
                                  className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleSection>
                  )}

                  {/* SIP Funds */}
                  {fp.sipFunds.length > 0 && (
                    <CollapsibleSection
                      id="sip" title={`SIP Funds (${fp.sipFunds.length} active)`} icon={<TrendingUp className="w-4 h-4 text-amber-400" />}
                      expanded={expandedSection === "sip"} onToggle={toggleSection}
                    >
                      <div className="space-y-2">
                        {fp.sipFunds.map((fund, i) => (
                          <div key={i} className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                              fund.type === "equity" ? "bg-green-900/40 text-green-400" :
                              fund.type === "debt"   ? "bg-blue-900/40 text-blue-400" :
                              fund.type === "gold"   ? "bg-amber-900/40 text-amber-400" :
                              "bg-violet-900/40 text-violet-400"
                            }`}>
                              {fund.type[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{fund.name}</p>
                              <p className="text-xs text-[#8BA3B8] capitalize">{fund.type}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-white">{fmt(fund.amount)}</p>
                              <p className="text-xs text-green-400">+{fund.returns}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleSection>
                  )}

                  {/* Expense breakdown */}
                  {fp.expenseBreakdown.length > 0 && (
                    <CollapsibleSection
                      id="expenses" title="Expense Breakdown" icon={<BarChart3 className="w-4 h-4 text-red-400" />}
                      expanded={expandedSection === "expenses"} onToggle={toggleSection}
                    >
                      <div className="space-y-2">
                        {fp.expenseBreakdown.map(e => {
                          const pct = fp.monthlyExpenses > 0 ? Math.round((e.amount / fp.monthlyExpenses) * 100) : 0;
                          return (
                            <div key={e.name} className="flex items-center gap-3">
                              <span className="text-lg w-6 flex-shrink-0">{e.icon}</span>
                              <div className="flex-1">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-[#8BA3B8]">{e.name}</span>
                                  <span className="text-white font-semibold">{fmt(e.amount)} <span className="text-[#8BA3B8]">({pct}%)</span></span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: e.color }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleSection>
                  )}
                </>
              ) : (
                <div className="bg-[#0F1923] rounded-2xl border border-white/5 p-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="w-6 h-6 text-white/20" />
                  </div>
                  <p className="text-sm font-semibold text-white/40">No financial profile</p>
                  <p className="text-xs text-[#8BA3B8]/50 mt-1">This user hasn't completed onboarding yet.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Collapsible section helper ─────────────────────────────────────────────────
function CollapsibleSection({ id, title, icon, expanded, onToggle, children }: {
  id: string; title: string; icon: React.ReactNode;
  expanded: boolean; onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0F1923] rounded-2xl border border-white/5 overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/[0.02] transition-all"
      >
        {icon}
        <span className="font-semibold text-sm text-white flex-1 text-left">{title}</span>
        <ChevronDown className={`w-4 h-4 text-[#8BA3B8] transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-5 border-t border-white/5 pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Shared form input helpers ────────────────────────────────────────────────
function FieldInput({ label, value, onChange, placeholder, type = "text", className = "" }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs text-[#8BA3B8] mb-1.5 block font-medium">{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/20 outline-none focus:border-[#3FAF7D]/50 transition-all"
      />
    </div>
  );
}
function FieldTextarea({ label, value, onChange, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <div>
      <label className="text-xs text-[#8BA3B8] mb-1.5 block font-medium">{label}</label>
      <textarea
        value={value} onChange={e => onChange(e.target.value)} rows={rows}
        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-[#3FAF7D]/50 transition-all resize-none"
      />
    </div>
  );
}
function FieldSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-xs text-[#8BA3B8] mb-1.5 block font-medium">{label}</label>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 bg-[#0A1420] border border-white/10 rounded-xl text-sm text-white outline-none focus:border-[#3FAF7D]/50 transition-all"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Webinars Tab ─────────────────────────────────────────────────────────────
function WebinarsTab({ webinars, adminId, onSave, showToast }: {
  webinars: Webinar[]; adminId: string;
  onSave: (w: Webinar[]) => void;
  showToast: (msg: string, ok?: boolean) => void;
}) {
  const blank: Omit<Webinar, "id" | "createdBy" | "createdAt"> = {
    title: "", speaker: "", date: "", time: "", duration: "", description: "", link: "", status: "upcoming",
  };
  const [editing,  setEditing]  = useState<Webinar | null>(null);
  const [form,     setForm]     = useState(blank);
  const [showForm, setShowForm] = useState(false);
  const [filter,   setFilter]   = useState<"all" | Webinar["status"]>("all");

  function startNew()        { setEditing(null); setForm(blank); setShowForm(true); }
  function startEdit(w: Webinar) { setEditing(w); setForm({ title:w.title,speaker:w.speaker,date:w.date,time:w.time,duration:w.duration,description:w.description,link:w.link,status:w.status }); setShowForm(true); }
  function cancel()          { setShowForm(false); }

  function save() {
    if (!form.title.trim()) return;
    const updated = editing
      ? webinars.map(w => w.id === editing.id ? { ...editing, ...form } : w)
      : [...webinars, { ...form, id: uid(), createdBy: adminId, createdAt: new Date().toISOString() }];
    onSave(updated);
    setShowForm(false);
    showToast(editing ? "Webinar updated." : "Webinar added.");
  }
  function del(id: string) { onSave(webinars.filter(w => w.id !== id)); showToast("Webinar deleted."); }

  const displayed = filter === "all" ? webinars : webinars.filter(w => w.status === filter);
  const statusBadge = (s: Webinar["status"]) =>
    s === "live"     ? "bg-red-900/40 text-red-400 border border-red-500/20" :
    s === "upcoming" ? "bg-[#1A5F3D]/40 text-[#3FAF7D] border border-[#3FAF7D]/20" :
                       "bg-white/5 text-[#8BA3B8] border border-white/10";

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["all", "upcoming", "live", "past"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                filter === f ? "bg-[#1A5F3D] text-white" : "bg-white/5 text-[#8BA3B8] hover:bg-white/10"
              }`}>
              {f} {f !== "all" && <span className="opacity-60">({webinars.filter(w=>w.status===f).length})</span>}
            </button>
          ))}
        </div>
        <button onClick={startNew}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] hover:from-[#2D7A4E] hover:to-[#3FAF7D] text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-[#1A5F3D]/20">
          <Plus className="w-4 h-4" /> Add Webinar
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-[#0F1923] border border-[#3FAF7D]/20 rounded-2xl p-5 shadow-xl">
            <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
              <Video className="w-4 h-4 text-[#3FAF7D]" />
              {editing ? "Edit Webinar" : "New Webinar"}
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <FieldInput label="Title" value={form.title} onChange={v=>setForm(p=>({...p,title:v}))} className="sm:col-span-2" />
              <FieldInput label="Speaker" value={form.speaker} onChange={v=>setForm(p=>({...p,speaker:v}))} />
              <FieldSelect label="Status" value={form.status} onChange={v=>setForm(p=>({...p,status:v as Webinar["status"]}))}
                options={[{value:"upcoming",label:"Upcoming"},{value:"live",label:"🔴 Live"},{value:"past",label:"Past"}]} />
              <FieldInput label="Date" value={form.date} onChange={v=>setForm(p=>({...p,date:v}))} placeholder="e.g. April 10, 2026" />
              <FieldInput label="Time" value={form.time} onChange={v=>setForm(p=>({...p,time:v}))} placeholder="e.g. 6:00 PM IST" />
              <FieldInput label="Duration" value={form.duration} onChange={v=>setForm(p=>({...p,duration:v}))} placeholder="e.g. 60 mins" />
              <FieldInput label="Registration Link (optional)" value={form.link} onChange={v=>setForm(p=>({...p,link:v}))} className="sm:col-span-2" />
              <div className="sm:col-span-2"><FieldTextarea label="Description" value={form.description} onChange={v=>setForm(p=>({...p,description:v}))} rows={2} /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={save}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] text-white rounded-xl text-sm font-semibold">
                <Save className="w-4 h-4" /> Save
              </button>
              <button onClick={cancel} className="px-4 py-2 bg-white/5 text-[#8BA3B8] rounded-xl text-sm hover:bg-white/10">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayed.map(w => (
          <motion.div key={w.id} whileHover={{ y: -2 }}
            className="bg-[#0F1923] border border-white/5 rounded-2xl p-4 group hover:border-white/10 transition-all">
            <div className="flex items-start justify-between gap-2 mb-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${statusBadge(w.status)}`}>
                {w.status === "live" && "● "}{w.status.toUpperCase()}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(w)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all"><Edit2 className="w-3 h-3 text-[#8BA3B8]" /></button>
                <button onClick={() => del(w.id)} className="p-1.5 rounded-lg bg-red-900/20 hover:bg-red-900/50 transition-all"><Trash2 className="w-3 h-3 text-red-400" /></button>
              </div>
            </div>
            <p className="font-bold text-sm text-white mb-1 line-clamp-2">{w.title}</p>
            <p className="text-xs text-[#8BA3B8] mb-2">by {w.speaker}</p>
            <div className="flex flex-wrap gap-3 text-xs text-[#8BA3B8]">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{w.date}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{w.time}</span>
            </div>
            {w.duration && <p className="text-xs text-[#8BA3B8] mt-1">⏱ {w.duration}</p>}
            {w.description && <p className="text-xs text-[#8BA3B8]/60 mt-2 line-clamp-2">{w.description}</p>}
            {w.link && (
              <a href={w.link} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 mt-2 text-xs text-[#3FAF7D] hover:underline">
                <Link2 className="w-3 h-3" /> Register
              </a>
            )}
          </motion.div>
        ))}
        {displayed.length === 0 && (
          <div className="col-span-3 py-16 text-center">
            <Video className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-[#8BA3B8]">No webinars in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── News Tab ─────────────────────────────────────────────────────────────────
function NewsTab({ news, adminId, onSave, showToast }: {
  news: NewsUpdate[]; adminId: string;
  onSave: (n: NewsUpdate[]) => void;
  showToast: (msg: string, ok?: boolean) => void;
}) {
  const blank = { title: "", summary: "", category: "general" as NewsUpdate["category"], source: "", urgent: false };
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<NewsUpdate | null>(null);
  const [form,     setForm]     = useState(blank);
  const [filter,   setFilter]   = useState<"all" | NewsUpdate["category"]>("all");

  function startNew()           { setEditing(null); setForm(blank); setShowForm(true); }
  function startEdit(n: NewsUpdate) { setEditing(n); setForm({title:n.title,summary:n.summary,category:n.category,source:n.source,urgent:n.urgent}); setShowForm(true); }

  function save() {
    if (!form.title.trim()) return;
    const updated = editing
      ? news.map(n => n.id === editing.id ? { ...editing, ...form } : n)
      : [...news, { ...form, id: uid(), publishedAt: new Date().toISOString(), createdBy: adminId }];
    onSave(updated); setShowForm(false);
    showToast(editing ? "Article updated." : "Article published.");
  }
  function del(id: string) { onSave(news.filter(n => n.id !== id)); showToast("Article deleted."); }

  const catMeta: Record<string, { label: string; cls: string }> = {
    market:    { label: "Market",    cls: "bg-blue-900/40 text-blue-400 border border-blue-500/20" },
    tax:       { label: "Tax",       cls: "bg-amber-900/40 text-amber-400 border border-amber-500/20" },
    insurance: { label: "Insurance", cls: "bg-[#1A5F3D]/40 text-[#3FAF7D] border border-[#3FAF7D]/20" },
    general:   { label: "General",   cls: "bg-white/5 text-[#8BA3B8] border border-white/10" },
  };

  const displayed = filter === "all" ? news : news.filter(n => n.category === filter);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {(["all", "market", "tax", "insurance", "general"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                filter === f ? "bg-amber-600 text-white" : "bg-white/5 text-[#8BA3B8] hover:bg-white/10"
              }`}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={startNew}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-amber-700/20">
          <Plus className="w-4 h-4" /> New Article
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-[#0F1923] border border-amber-500/20 rounded-2xl p-5">
            <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-amber-400" />
              {editing ? "Edit Article" : "New Article"}
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <FieldInput label="Title" value={form.title} onChange={v=>setForm(p=>({...p,title:v}))} className="sm:col-span-2" />
              <div className="sm:col-span-2"><FieldTextarea label="Summary" value={form.summary} onChange={v=>setForm(p=>({...p,summary:v}))} /></div>
              <FieldSelect label="Category" value={form.category} onChange={v=>setForm(p=>({...p,category:v as NewsUpdate["category"]}))}
                options={[{value:"market",label:"Market"},{value:"tax",label:"Tax"},{value:"insurance",label:"Insurance"},{value:"general",label:"General"}]} />
              <FieldInput label="Source" value={form.source} onChange={v=>setForm(p=>({...p,source:v}))} placeholder="e.g. RBI Official" />
              <div className="flex items-center gap-2.5 col-span-2">
                <input type="checkbox" id="urgent" checked={form.urgent} onChange={e=>setForm(p=>({...p,urgent:e.target.checked}))}
                  className="w-4 h-4 rounded accent-amber-500 cursor-pointer" />
                <label htmlFor="urgent" className="text-sm text-[#8BA3B8] cursor-pointer flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Mark as urgent — will be highlighted for users
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={save} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold">
                <Save className="w-4 h-4" /> Publish
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-white/5 text-[#8BA3B8] rounded-xl text-sm hover:bg-white/10">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {displayed.map(n => (
          <motion.div key={n.id} whileHover={{ x: 2 }}
            className="bg-[#0F1923] border border-white/5 rounded-2xl p-4 flex items-start gap-4 group hover:border-white/10 transition-all">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${catMeta[n.category]?.cls}`}>
                  {catMeta[n.category]?.label}
                </span>
                {n.urgent && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-400 border border-red-500/20 font-bold flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" /> URGENT
                  </span>
                )}
              </div>
              <p className="font-bold text-sm text-white">{n.title}</p>
              <p className="text-xs text-[#8BA3B8] mt-1 line-clamp-2">{n.summary}</p>
              <p className="text-xs text-[#8BA3B8]/50 mt-2 flex items-center gap-1.5">
                <Tag className="w-3 h-3" /> {n.source}
                <span className="mx-1">·</span>
                <Clock className="w-3 h-3" /> {timeAgo(n.publishedAt)}
              </p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button onClick={() => startEdit(n)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10"><Edit2 className="w-3 h-3 text-[#8BA3B8]" /></button>
              <button onClick={() => del(n.id)} className="p-1.5 rounded-lg bg-red-900/20 hover:bg-red-900/50"><Trash2 className="w-3 h-3 text-red-400" /></button>
            </div>
          </motion.div>
        ))}
        {displayed.length === 0 && (
          <div className="py-16 text-center">
            <Newspaper className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-[#8BA3B8]">No articles in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Videos Tab ───────────────────────────────────────────────────────────────
function VideosTab({ videos, adminId, onSave, showToast }: {
  videos: VideoResource[]; adminId: string;
  onSave: (v: VideoResource[]) => void;
  showToast: (msg: string, ok?: boolean) => void;
}) {
  const blank = { title: "", youtubeUrl: "", thumbnail: "", description: "", category: "general" as VideoResource["category"] };
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<VideoResource | null>(null);
  const [form,     setForm]     = useState(blank);
  const [filter,   setFilter]   = useState<"all" | VideoResource["category"]>("all");

  function startNew()              { setEditing(null); setForm(blank); setShowForm(true); }
  function startEdit(v: VideoResource) { setEditing(v); setForm({title:v.title,youtubeUrl:v.youtubeUrl,thumbnail:v.thumbnail,description:v.description,category:v.category}); setShowForm(true); }

  function save() {
    if (!form.title.trim() || !form.youtubeUrl.trim()) return;
    const updated = editing
      ? videos.map(v => v.id === editing.id ? { ...editing, ...form } : v)
      : [...videos, { ...form, id: uid(), createdBy: adminId, createdAt: new Date().toISOString() }];
    onSave(updated); setShowForm(false);
    showToast(editing ? "Video updated." : "Video added.");
  }
  function del(id: string) { onSave(videos.filter(v => v.id !== id)); showToast("Video removed."); }

  function getYTId(url: string) {
    const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  const cats = ["investment", "tax", "insurance", "planning", "general"] as const;
  const catColors: Record<string, string> = {
    investment: "bg-green-900/40 text-green-400", tax: "bg-amber-900/40 text-amber-400",
    insurance: "bg-blue-900/40 text-blue-400", planning: "bg-violet-900/40 text-violet-400",
    general: "bg-white/5 text-[#8BA3B8]",
  };

  const displayed = filter === "all" ? videos : videos.filter(v => v.category === filter);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {(["all", ...cats] as const).map(f => (
            <button key={f} onClick={() => setFilter(f as typeof filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                filter === f ? "bg-red-600 text-white" : "bg-white/5 text-[#8BA3B8] hover:bg-white/10"
              }`}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={startNew}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-red-700/20">
          <Plus className="w-4 h-4" /> Add Video
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-[#0F1923] border border-red-500/20 rounded-2xl p-5">
            <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
              <Play className="w-4 h-4 text-red-400" />
              {editing ? "Edit Video" : "Add Video"}
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <FieldInput label="Title" value={form.title} onChange={v=>setForm(p=>({...p,title:v}))} className="sm:col-span-2" />
              <FieldInput label="YouTube URL" value={form.youtubeUrl} onChange={v=>setForm(p=>({...p,youtubeUrl:v}))} placeholder="https://youtube.com/watch?v=..." className="sm:col-span-2" />
              {form.youtubeUrl && getYTId(form.youtubeUrl) && (
                <div className="sm:col-span-2">
                  <img src={`https://img.youtube.com/vi/${getYTId(form.youtubeUrl)}/mqdefault.jpg`}
                    alt="Preview" className="w-full max-w-xs h-28 object-cover rounded-xl" />
                  <p className="text-xs text-[#3FAF7D] mt-1">✓ Thumbnail auto-detected</p>
                </div>
              )}
              <FieldSelect label="Category" value={form.category} onChange={v=>setForm(p=>({...p,category:v as VideoResource["category"]}))}
                options={cats.map(c=>({value:c,label:c.charAt(0).toUpperCase()+c.slice(1)}))} />
              <div className="sm:col-span-2"><FieldTextarea label="Description" value={form.description} onChange={v=>setForm(p=>({...p,description:v}))} rows={2} /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={save} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold">
                <Save className="w-4 h-4" /> Save
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-white/5 text-[#8BA3B8] rounded-xl text-sm hover:bg-white/10">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayed.map(v => {
          const ytId = getYTId(v.youtubeUrl);
          return (
            <motion.div key={v.id} whileHover={{ y: -2 }}
              className="bg-[#0F1923] border border-white/5 rounded-2xl overflow-hidden group hover:border-white/10 transition-all">
              <div className="relative">
                {ytId ? (
                  <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={v.title}
                    className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-white/5 flex items-center justify-center">
                    <Play className="w-8 h-8 text-white/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => startEdit(v)} className="p-2 rounded-xl bg-white/10 backdrop-blur hover:bg-white/20 transition-all"><Edit2 className="w-4 h-4 text-white" /></button>
                  <button onClick={() => del(v.id)} className="p-2 rounded-xl bg-red-900/50 backdrop-blur hover:bg-red-900/80 transition-all"><Trash2 className="w-4 h-4 text-red-300" /></button>
                  {ytId && (
                    <a href={v.youtubeUrl} target="_blank" rel="noreferrer"
                      className="p-2 rounded-xl bg-white/10 backdrop-blur hover:bg-white/20 transition-all">
                      <Link2 className="w-4 h-4 text-white" />
                    </a>
                  )}
                </div>
                <span className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-bold backdrop-blur ${catColors[v.category]}`}>
                  {v.category}
                </span>
              </div>
              <div className="p-4">
                <p className="font-bold text-sm text-white line-clamp-2">{v.title}</p>
                {v.description && <p className="text-xs text-[#8BA3B8] mt-1.5 line-clamp-2">{v.description}</p>}
              </div>
            </motion.div>
          );
        })}
        {displayed.length === 0 && (
          <div className="col-span-3 py-16 text-center">
            <Play className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-[#8BA3B8]">No videos in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}