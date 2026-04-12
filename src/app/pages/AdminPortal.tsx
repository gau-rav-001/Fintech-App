import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  BarChart3, Users, Video, Newspaper, Play, LogOut, Plus, Trash2, Edit2,
  Shield, Eye, Search, X, CheckCircle, AlertCircle, Save, TrendingUp,
  Activity, Calendar, ExternalLink, ChevronRight, Bell, Settings,
  ArrowUpRight, Zap, Globe, BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAdminAuth } from "../auth/AuthContext";
import { adminAPI } from "../services/api";
import {
  getAdminContent, saveAdminContent, getAllFinancialProfiles,
  type Webinar, type NewsUpdate, type VideoResource,
} from "../data/mockData";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(0)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}
function uid() { return `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }
function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

type Tab = "overview" | "users" | "webinars" | "news" | "videos";

// ─── Main Admin Portal ────────────────────────────────────────────────────────
export function AdminPortal() {
  const navigate = useNavigate();
  const { adminUser, adminLogout } = useAdminAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function handleLogout() { adminLogout(); navigate("/admin/login", { replace: true }); }

  const [users, setUsers]     = useState<any[]>([]);
  const profiles              = useMemo(() => getAllFinancialProfiles(), []);
  const [content, setContent] = useState(() => getAdminContent());

  useEffect(() => {
    adminAPI.getUsers().then((res: any) => {
      setUsers(res.data?.users ?? []);
    }).catch(() => setUsers([]));
  }, []);

  async function persist(updated: typeof content) {
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    saveAdminContent(updated);
    setContent(updated);
    setSaving(false);
    showToast("Changes saved successfully.");
  }

  const sideItems: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "overview", label: "Overview",       icon: <BarChart3 className="w-[18px] h-[18px]" /> },
    { id: "users",    label: "Users",           icon: <Users className="w-[18px] h-[18px]" />,    count: users.length },
    { id: "webinars", label: "Webinars",        icon: <Video className="w-[18px] h-[18px]" />,    count: content.webinars.length },
    { id: "news",     label: "News & Updates",  icon: <Newspaper className="w-[18px] h-[18px]" />, count: content.newsUpdates.length },
    { id: "videos",   label: "Video Library",   icon: <Play className="w-[18px] h-[18px]" />,     count: content.videos.length },
  ];

  const initials = (adminUser?.fullName ?? "A")
    .split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex" style={{ background: "#F7F9FB", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            className="fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold"
            style={{
              background: toast.ok
                ? "linear-gradient(135deg, #1A5F3D, #2D7A4E)"
                : "linear-gradient(135deg, #dc2626, #ef4444)",
              color: "#fff",
              boxShadow: toast.ok
                ? "0 8px 32px rgba(26,95,61,0.35)"
                : "0 8px 32px rgba(220,38,38,0.35)",
            }}
          >
            {toast.ok
              ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col h-screen sticky top-0 transition-all duration-300 z-40"
        style={{
          width: sidebarCollapsed ? 72 : 240,
          background: "linear-gradient(180deg, #050a07 0%, #0b1a12 40%, #0f2419 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #1A5F3D, #3FAF7D)", color: "#D8F46B" }}>
            SF
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <p className="text-white font-bold text-[15px] tracking-[-0.02em] leading-none">SmartFinance</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Admin Console</p>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-2.5 space-y-0.5 overflow-y-auto">
          {sideItems.map((item, i) => {
            const active = tab === item.id;
            return (
              <motion.button
                key={item.id}
                onClick={() => setTab(item.id)}
                whileHover={{ x: active ? 0 : 2 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative"
                style={{
                  background: active
                    ? "linear-gradient(135deg, rgba(26,95,61,0.9), rgba(45,122,78,0.7))"
                    : "transparent",
                  color: active ? "#fff" : "rgba(255,255,255,0.5)",
                  boxShadow: active ? "0 4px 16px rgba(26,95,61,0.4), inset 0 1px 0 rgba(255,255,255,0.1)" : "none",
                  border: active ? "1px solid rgba(184,233,134,0.15)" : "1px solid transparent",
                }}
              >
                <span style={{ color: active ? "#B8E986" : "inherit" }}>{item.icon}</span>
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {item.count !== undefined && (
                      <span className="text-xs px-1.5 py-0.5 rounded-md font-bold"
                        style={{
                          background: active ? "rgba(184,233,134,0.2)" : "rgba(255,255,255,0.07)",
                          color: active ? "#B8E986" : "rgba(255,255,255,0.35)",
                        }}>
                        {item.count}
                      </span>
                    )}
                  </>
                )}
                {active && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-l-full"
                    style={{ background: "#B8E986" }} />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-2.5 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Admin avatar */}
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl mb-1"
              style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                style={{ background: "linear-gradient(135deg, #1A5F3D, #3FAF7D)", color: "#fff" }}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{adminUser?.fullName ?? "Admin"}</p>
                <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{adminUser?.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ color: "rgba(248,113,113,0.8)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(220,38,38,0.12)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {!sidebarCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Top header */}
        <header className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between"
          style={{
            background: "rgba(247,249,251,0.85)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
          }}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarCollapsed(p => !p)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ background: "rgba(26,95,61,0.08)", color: "#1A5F3D" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(26,95,61,0.15)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(26,95,61,0.08)")}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <div>
              <h1 className="font-bold text-gray-900 text-base leading-none">
                {tab === "overview" ? "Dashboard Overview"
                  : sideItems.find(s => s.id === tab)?.label}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saving && (
              <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full"
                style={{ background: "rgba(26,95,61,0.08)", color: "#1A5F3D" }}>
                <Spinner /> Saving…
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "rgba(26,95,61,0.08)", color: "#1A5F3D" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#3FAF7D] animate-pulse" />
              Admin: {adminUser?.fullName?.split(" ")[0]}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >

              {/* ════ OVERVIEW ════════════════════════════════════════════ */}
              {tab === "overview" && (
                <div className="space-y-6">

                  {/* Hero welcome banner */}
                  <div className="relative rounded-2xl overflow-hidden p-7"
                    style={{
                      background: "linear-gradient(135deg, #050a07 0%, #0f2419 50%, #1A5F3D 100%)",
                      boxShadow: "0 8px 32px rgba(26,95,61,0.25)",
                    }}>
                    <div className="absolute inset-0"
                      style={{
                        backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)",
                        backgroundSize: "40px 40px",
                      }} />
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full opacity-10"
                      style={{ background: "radial-gradient(circle, #B8E986, transparent)" }} />
                    <div className="relative z-10 flex items-center justify-between">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-3"
                          style={{ background: "rgba(184,233,134,0.15)", color: "#B8E986", border: "1px solid rgba(184,233,134,0.2)" }}>
                          <div className="w-1.5 h-1.5 rounded-full bg-[#B8E986] animate-pulse" />
                          Platform Active
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-1">
                          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {adminUser?.fullName?.split(" ")[0] ?? "Admin"} 👋
                        </h2>
                        <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                          Here's what's happening with SmartFinance today.
                        </p>
                      </div>
                      <div className="hidden md:flex items-center gap-3">
                        <div className="text-center px-5 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <p className="text-2xl font-bold text-white">{users.length}</p>
                          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>Total Users</p>
                        </div>
                        <div className="text-center px-5 py-3 rounded-xl" style={{ background: "rgba(184,233,134,0.1)", border: "1px solid rgba(184,233,134,0.15)" }}>
                          <p className="text-2xl font-bold" style={{ color: "#B8E986" }}>
                            {content.webinars.filter(w => w.status === "upcoming").length}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "rgba(184,233,134,0.6)" }}>Live Events</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stat cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: "Total Users",     value: users.length, sub: "registered accounts", icon: <Users className="w-5 h-5" />,    gradient: "from-[#1A5F3D] to-[#3FAF7D]", accent: "#B8E986" },
                      { label: "Active Webinars", value: content.webinars.filter(w => w.status === "upcoming").length, sub: "upcoming sessions", icon: <Video className="w-5 h-5" />, gradient: "from-blue-600 to-blue-400", accent: "#93c5fd" },
                      { label: "News Articles",   value: content.newsUpdates.length, sub: "published updates", icon: <Newspaper className="w-5 h-5" />, gradient: "from-amber-600 to-amber-400", accent: "#fcd34d" },
                      { label: "Video Resources", value: content.videos.length, sub: "in library", icon: <Play className="w-5 h-5" />, gradient: "from-purple-600 to-purple-400", accent: "#c4b5fd" },
                    ].map((c, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="bg-white rounded-2xl p-5 relative overflow-hidden"
                        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}
                      >
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center text-white mb-4`}>
                          {c.icon}
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{c.value}</p>
                        <p className="text-sm font-medium text-gray-700 mt-0.5">{c.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
                        <div className="absolute -right-3 -bottom-3 w-16 h-16 rounded-full opacity-6"
                          style={{ background: c.accent, filter: "blur(16px)" }} />
                      </motion.div>
                    ))}
                  </div>

                  {/* Recent users + Quick actions */}
                  <div className="grid lg:grid-cols-3 gap-5">
                    {/* Recent users table */}
                    <div className="lg:col-span-2 bg-white rounded-2xl overflow-hidden"
                      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
                      <div className="flex items-center justify-between px-5 py-4"
                        style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#1A5F3D]" />
                          <h3 className="font-bold text-gray-900 text-sm">Recent Users</h3>
                        </div>
                        <button onClick={() => setTab("users")}
                          className="flex items-center gap-1 text-xs font-semibold text-[#1A5F3D] hover:text-[#2D7A4E] transition-colors">
                          View all <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {users.slice(0, 6).map((u, i) => {
                          const fp = profiles[u.id];
                          const initials = (u.fullName ?? "").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                          return (
                            <motion.div
                              key={u.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04 }}
                              className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
                              onClick={() => setTab("users")}
                            >
                              <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                                style={{ background: "linear-gradient(135deg, #1A5F3D, #3FAF7D)" }}>
                                {initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{u.fullName}</p>
                                <p className="text-xs text-gray-400 truncate">{u.email}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {fp && <span className="text-xs font-semibold text-[#1A5F3D] bg-green-50 px-2 py-0.5 rounded-full">{fmt(fp.monthlyIncome)}/mo</span>}
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.provider === "google" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                                  {u.provider}
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                        {users.length === 0 && (
                          <div className="px-5 py-10 text-center">
                            <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                            <p className="text-sm text-gray-400">No users yet</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="bg-white rounded-2xl p-5"
                      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
                      <div className="flex items-center gap-2 mb-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", paddingBottom: "1rem" }}>
                        <Zap className="w-4 h-4 text-[#1A5F3D]" />
                        <h3 className="font-bold text-gray-900 text-sm">Quick Actions</h3>
                      </div>
                      <div className="space-y-2">
                        {[
                          { label: "Add Webinar", tab: "webinars" as Tab, icon: <Video className="w-4 h-4" />, color: "#1A5F3D", bg: "rgba(26,95,61,0.08)" },
                          { label: "Post News Update", tab: "news" as Tab, icon: <Newspaper className="w-4 h-4" />, color: "#d97706", bg: "rgba(217,119,6,0.08)" },
                          { label: "Add Video", tab: "videos" as Tab, icon: <Play className="w-4 h-4" />, color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
                          { label: "View All Users", tab: "users" as Tab, icon: <Users className="w-4 h-4" />, color: "#2563eb", bg: "rgba(37,99,235,0.08)" },
                        ].map(a => (
                          <button key={a.label} onClick={() => setTab(a.tab)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left"
                            style={{ background: a.bg, color: a.color }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
                            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                          >
                            {a.icon}
                            {a.label}
                            <ArrowUpRight className="w-3.5 h-3.5 ml-auto opacity-60" />
                          </button>
                        ))}
                      </div>

                      {/* Content summary */}
                      <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Content Summary</p>
                        {[
                          { label: "Webinars", value: content.webinars.length, color: "#1A5F3D" },
                          { label: "News",     value: content.newsUpdates.length, color: "#d97706" },
                          { label: "Videos",   value: content.videos.length, color: "#7c3aed" },
                        ].map(item => (
                          <div key={item.label} className="flex items-center justify-between py-1.5">
                            <span className="text-xs text-gray-500">{item.label}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full rounded-full transition-all"
                                  style={{ width: `${Math.min(100, (item.value / 10) * 100)}%`, background: item.color }} />
                              </div>
                              <span className="text-xs font-bold text-gray-700 w-4 text-right">{item.value}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ════ USERS ═══════════════════════════════════════════════ */}
              {tab === "users" && (
                <UsersTab users={users} profiles={profiles} />
              )}

              {/* ════ WEBINARS ════════════════════════════════════════════ */}
              {tab === "webinars" && (
                <WebinarsTab
                  webinars={content.webinars}
                  adminId={adminUser?.id ?? "admin_001"}
                  onSave={updated => persist({ ...content, webinars: updated })}
                />
              )}

              {/* ════ NEWS ════════════════════════════════════════════════ */}
              {tab === "news" && (
                <NewsTab
                  news={content.newsUpdates}
                  adminId={adminUser?.id ?? "admin_001"}
                  onSave={updated => persist({ ...content, newsUpdates: updated })}
                />
              )}

              {/* ════ VIDEOS ══════════════════════════════════════════════ */}
              {tab === "videos" && (
                <VideosTab
                  videos={content.videos}
                  adminId={adminUser?.id ?? "admin_001"}
                  onSave={updated => persist({ ...content, videos: updated })}
                />
              )}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// ─── Shared form input styles ─────────────────────────────────────────────────
const inputCls = "w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none transition-all focus:border-[#1A5F3D] focus:bg-white focus:ring-2 focus:ring-[#1A5F3D]/10 placeholder:text-gray-400";
const selectCls = "w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none transition-all focus:border-[#1A5F3D] focus:bg-white";
const textareaCls = "w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none transition-all focus:border-[#1A5F3D] focus:bg-white resize-none";

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
      style={{
        background: "linear-gradient(135deg, #1A5F3D, #2D7A4E)",
        boxShadow: "0 4px 16px rgba(26,95,61,0.3)",
      }}>
      <Plus className="w-4 h-4" />
      {label}
    </button>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab({ users, profiles }: { users: any[]; profiles: Record<string, any> }) {
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = users.filter(u =>
    (u.fullName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const selectedUser    = users.find(u => u.id === selected);
  const selectedProfile = selected ? profiles[selected] : null;

  function fmt(n: number) {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000)   return `₹${(n / 100000).toFixed(0)}L`;
    return `₹${n.toLocaleString("en-IN")}`;
  }

  return (
    <div>
      <SectionHeader title="User Management" subtitle={`${users.length} registered accounts`} />
      <div className="grid lg:grid-cols-5 gap-5">
        {/* User list */}
        <div className="lg:col-span-2 bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
          <div className="p-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search users…"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:border-[#1A5F3D] focus:ring-2 focus:ring-[#1A5F3D]/10 transition-all"
              />
            </div>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
            {filtered.length === 0 && (
              <div className="py-12 text-center">
                <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No users found</p>
              </div>
            )}
            {filtered.map((u, i) => {
              const fp = profiles[u.id];
              const initials = (u.fullName ?? "").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
              const active = selected === u.id;
              return (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelected(u.id)}
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all"
                  style={{
                    borderBottom: "1px solid rgba(0,0,0,0.04)",
                    background: active ? "rgba(26,95,61,0.04)" : "transparent",
                    borderLeft: active ? "3px solid #1A5F3D" : "3px solid transparent",
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(0,0,0,0.02)"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #1A5F3D, #3FAF7D)" }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{u.fullName}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-[#1A5F3D]">{fp ? fmt(fp.monthlyIncome) : "—"}</p>
                    <p className="text-xs text-gray-400">/mo</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-3 bg-white rounded-2xl overflow-hidden"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full py-24 px-8 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "rgba(26,95,61,0.06)" }}>
                <Eye className="w-7 h-7 text-[#1A5F3D] opacity-50" />
              </div>
              <p className="font-semibold text-gray-600 mb-1">Select a user</p>
              <p className="text-sm text-gray-400">Click any user from the list to view their financial profile</p>
            </div>
          ) : (
            <div>
              {/* User header */}
              <div className="relative p-6" style={{
                background: "linear-gradient(135deg, #050a07, #0f2419)",
                borderBottom: "1px solid rgba(0,0,0,0.06)",
              }}>
                <div className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.06) 1px,transparent 1px)",
                    backgroundSize: "32px 32px",
                  }} />
                <div className="relative flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #1A5F3D, #3FAF7D)", boxShadow: "0 4px 16px rgba(26,95,61,0.4)" }}>
                    {selectedUser?.fullName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-lg">{selectedUser?.fullName}</p>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{selectedUser?.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${selectedUser?.provider === "google" ? "bg-blue-500/20 text-blue-300" : "bg-white/10 text-white/60"}`}>
                        {selectedUser?.provider}
                      </span>
                      {selectedUser?.isEmailVerified && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-500/20 text-green-300">
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                    style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-5">
                {selectedProfile ? (
                  <div className="space-y-5">
                    {/* Financial stats grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Monthly Income",    value: fmt(selectedProfile.monthlyIncome), color: "#1A5F3D" },
                        { label: "Monthly Expenses",  value: fmt(selectedProfile.monthlyExpenses), color: "#d97706" },
                        { label: "Total Assets",      value: fmt(selectedProfile.savingsAccount + selectedProfile.mutualFunds + selectedProfile.stocks + selectedProfile.realEstate + selectedProfile.gold + selectedProfile.ppf), color: "#2563eb" },
                        { label: "Total Liabilities", value: fmt(selectedProfile.homeLoan + selectedProfile.carLoan + selectedProfile.personalLoan + selectedProfile.creditCardDebt), color: "#dc2626" },
                      ].map(item => (
                        <div key={item.label} className="rounded-xl p-3.5"
                          style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.05)" }}>
                          <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                          <p className="text-base font-bold" style={{ color: item.color }}>{item.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Insurance */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Life Insurance",   value: fmt(selectedProfile.lifeInsuranceCover) },
                        { label: "Health Insurance", value: fmt(selectedProfile.healthInsuranceCover) },
                      ].map(item => (
                        <div key={item.label} className="rounded-xl p-3.5"
                          style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.05)" }}>
                          <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                          <p className="text-base font-bold text-gray-700">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Goals progress */}
                    {selectedProfile.goals?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Financial Goals</p>
                        <div className="space-y-3">
                          {selectedProfile.goals.map((g: any) => {
                            const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
                            return (
                              <div key={g.id} className="flex items-center gap-3">
                                <span className="text-lg">{g.icon}</span>
                                <div className="flex-1">
                                  <div className="flex justify-between text-xs mb-1.5">
                                    <span className="font-medium text-gray-700">{g.name}</span>
                                    <span className="font-bold text-[#1A5F3D]">{pct}%</span>
                                  </div>
                                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(26,95,61,0.08)" }}>
                                    <div className="h-full rounded-full transition-all"
                                      style={{ width: `${pct}%`, background: "linear-gradient(90deg, #1A5F3D, #3FAF7D)" }} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <Activity className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No financial profile data available</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shared form card ─────────────────────────────────────────────────────────
function FormCard({ title, children, onSave, onCancel }: {
  title: string; children: React.ReactNode; onSave: () => void; onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white rounded-2xl overflow-hidden mb-5"
      style={{ boxShadow: "0 4px 24px rgba(26,95,61,0.12), 0 1px 3px rgba(0,0,0,0.06)", border: "1px solid rgba(26,95,61,0.12)" }}
    >
      <div className="flex items-center justify-between px-5 py-4"
        style={{ background: "linear-gradient(135deg, #050a07, #0f2419)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <h3 className="font-bold text-white text-sm">{title}</h3>
        <button onClick={onCancel} className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5">
        {children}
        <div className="flex gap-3 mt-5 pt-5" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <button onClick={onSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: "linear-gradient(135deg, #1A5F3D, #2D7A4E)", boxShadow: "0 4px 16px rgba(26,95,61,0.3)" }}>
            <Save className="w-4 h-4" /> Save Changes
          </button>
          <button onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Webinars Tab ─────────────────────────────────────────────────────────────
function WebinarsTab({ webinars, adminId, onSave }: { webinars: Webinar[]; adminId: string; onSave: (w: Webinar[]) => void }) {
  const blank: Omit<Webinar, "id" | "createdBy" | "createdAt"> = { title: "", speaker: "", date: "", time: "", duration: "", description: "", link: "", status: "upcoming" };
  const [editing, setEditing]   = useState<Webinar | null>(null);
  const [form, setForm]         = useState(blank);
  const [showForm, setShowForm] = useState(false);

  function startNew() { setEditing(null); setForm(blank); setShowForm(true); }
  function startEdit(w: Webinar) { setEditing(w); setForm({ title: w.title, speaker: w.speaker, date: w.date, time: w.time, duration: w.duration, description: w.description, link: w.link, status: w.status }); setShowForm(true); }
  function save() {
    if (!form.title.trim()) return;
    const updated = editing
      ? webinars.map(w => w.id === editing.id ? { ...editing, ...form } : w)
      : [...webinars, { ...form, id: uid(), createdBy: adminId, createdAt: new Date().toISOString() }];
    onSave(updated); setShowForm(false);
  }
  function del(id: string) { onSave(webinars.filter(w => w.id !== id)); }

  const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
    live:     { bg: "rgba(220,38,38,0.1)",  color: "#dc2626", label: "LIVE" },
    upcoming: { bg: "rgba(26,95,61,0.08)",  color: "#1A5F3D", label: "UPCOMING" },
    past:     { bg: "rgba(0,0,0,0.04)",     color: "#9ca3af", label: "PAST" },
  };

  return (
    <div>
      <SectionHeader
        title="Webinar Management"
        subtitle={`${webinars.length} sessions · ${webinars.filter(w => w.status === "upcoming").length} upcoming`}
        action={<AddButton onClick={startNew} label="Add Webinar" />}
      />
      <AnimatePresence>
        {showForm && (
          <FormCard
            title={editing ? "Edit Webinar" : "New Webinar"}
            onSave={save}
            onCancel={() => setShowForm(false)}
          >
            <div className="grid sm:grid-cols-2 gap-3">
              {([
                ["title", "Title *", true],
                ["speaker", "Speaker *", false],
                ["date", "Date (e.g. April 10, 2026)", false],
                ["time", "Time (e.g. 6:00 PM IST)", false],
                ["duration", "Duration (e.g. 60 min)", false],
                ["link", "Registration Link (optional)", true],
              ] as [keyof typeof form, string, boolean][]).map(([k, l, full]) => (
                <div key={k} className={full ? "sm:col-span-2" : ""}>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">{l}</label>
                  <input value={form[k] as string} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} className={inputCls} />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} className={textareaCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as Webinar["status"] }))} className={selectCls}>
                  <option value="upcoming">Upcoming</option>
                  <option value="live">Live</option>
                  <option value="past">Past</option>
                </select>
              </div>
            </div>
          </FormCard>
        )}
      </AnimatePresence>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {webinars.map((w, i) => {
          const s = statusStyle[w.status] ?? statusStyle.past;
          return (
            <motion.div key={w.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl overflow-hidden group"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
              {/* Card top strip */}
              <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, #1A5F3D, #3FAF7D)` }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold tracking-wide"
                    style={{ background: s.bg, color: s.color }}>
                    {s.label}
                  </span>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(w)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: "rgba(26,95,61,0.08)", color: "#1A5F3D" }}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => del(w.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="font-bold text-gray-900 text-sm leading-snug mb-1">{w.title}</p>
                <p className="text-xs text-gray-500 mb-3">by <span className="font-medium text-gray-700">{w.speaker}</span></p>
                <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                  {w.date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{w.date}</span>}
                  {w.time && <span>{w.time}</span>}
                  {w.duration && <span>· {w.duration}</span>}
                </div>
                {w.description && <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">{w.description}</p>}
                {w.link && (
                  <a href={w.link} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#1A5F3D] mt-3 hover:underline">
                    <ExternalLink className="w-3 h-3" /> Register
                  </a>
                )}
              </div>
            </motion.div>
          );
        })}
        {webinars.length === 0 && (
          <div className="sm:col-span-2 xl:col-span-3 py-16 text-center bg-white rounded-2xl"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <Video className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-400">No webinars yet</p>
            <p className="text-sm text-gray-300 mt-1">Click "Add Webinar" to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── News Tab ─────────────────────────────────────────────────────────────────
function NewsTab({ news, adminId, onSave }: { news: NewsUpdate[]; adminId: string; onSave: (n: NewsUpdate[]) => void }) {
  const blank = { title: "", summary: "", category: "general" as NewsUpdate["category"], source: "", urgent: false };
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<NewsUpdate | null>(null);
  const [form, setForm]         = useState(blank);

  function startNew() { setEditing(null); setForm(blank); setShowForm(true); }
  function startEdit(n: NewsUpdate) { setEditing(n); setForm({ title: n.title, summary: n.summary, category: n.category, source: n.source, urgent: n.urgent }); setShowForm(true); }
  function save() {
    if (!form.title.trim()) return;
    const updated = editing
      ? news.map(n => n.id === editing.id ? { ...editing, ...form } : n)
      : [...news, { ...form, id: uid(), publishedAt: new Date().toISOString(), createdBy: adminId }];
    onSave(updated); setShowForm(false);
  }
  function del(id: string) { onSave(news.filter(n => n.id !== id)); }

  const catStyle: Record<string, { bg: string; color: string }> = {
    market:    { bg: "rgba(37,99,235,0.08)",   color: "#2563eb" },
    tax:       { bg: "rgba(217,119,6,0.08)",   color: "#d97706" },
    insurance: { bg: "rgba(26,95,61,0.08)",    color: "#1A5F3D" },
    general:   { bg: "rgba(0,0,0,0.04)",       color: "#6b7280" },
    planning:  { bg: "rgba(124,58,237,0.08)",  color: "#7c3aed" },
  };

  return (
    <div>
      <SectionHeader
        title="News & Updates"
        subtitle={`${news.length} articles · ${news.filter(n => n.urgent).length} urgent`}
        action={<AddButton onClick={startNew} label="Post Update" />}
      />
      <AnimatePresence>
        {showForm && (
          <FormCard
            title={editing ? "Edit News Article" : "New News Update"}
            onSave={save}
            onCancel={() => setShowForm(false)}
          >
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Title *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputCls} placeholder="News headline…" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Summary</label>
                <textarea value={form.summary} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} rows={3} className={textareaCls} placeholder="Brief description…" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as NewsUpdate["category"] }))} className={selectCls}>
                  <option value="market">Market</option>
                  <option value="tax">Tax</option>
                  <option value="insurance">Insurance</option>
                  <option value="planning">Planning</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Source</label>
                <input value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))} className={inputCls} placeholder="e.g. SEBI, RBI, ET…" />
              </div>
              <div className="sm:col-span-2 flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: form.urgent ? "rgba(220,38,38,0.05)" : "rgba(0,0,0,0.02)", border: `1px solid ${form.urgent ? "rgba(220,38,38,0.15)" : "rgba(0,0,0,0.06)"}` }}>
                <input type="checkbox" id="urgent" checked={form.urgent} onChange={e => setForm(p => ({ ...p, urgent: e.target.checked }))}
                  className="w-4 h-4 cursor-pointer accent-red-500" />
                <div>
                  <label htmlFor="urgent" className="text-sm font-semibold text-gray-700 cursor-pointer">Mark as Urgent</label>
                  <p className="text-xs text-gray-400">Highlights this update with an urgent badge</p>
                </div>
              </div>
            </div>
          </FormCard>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {news.map((n, i) => {
          const cs = catStyle[n.category] ?? catStyle.general;
          return (
            <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-white rounded-2xl p-5 flex items-start gap-4 group"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
              {/* Category icon */}
              <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
                style={{ background: cs.bg }}>
                <BookOpen className="w-4 h-4" style={{ color: cs.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold tracking-wide"
                    style={{ background: cs.bg, color: cs.color }}>
                    {n.category.toUpperCase()}
                  </span>
                  {n.urgent && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold tracking-wide bg-red-50 text-red-600">
                      ⚡ URGENT
                    </span>
                  )}
                  {n.source && <span className="text-xs text-gray-400">· {n.source}</span>}
                </div>
                <p className="font-bold text-gray-900 text-sm leading-snug">{n.title}</p>
                {n.summary && <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{n.summary}</p>}
              </div>
              <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(n)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(26,95,61,0.08)", color: "#1A5F3D" }}>
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => del(n.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
        {news.length === 0 && (
          <div className="py-16 text-center bg-white rounded-2xl"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <Newspaper className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-400">No news articles yet</p>
            <p className="text-sm text-gray-300 mt-1">Click "Post Update" to add the first article</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Videos Tab ───────────────────────────────────────────────────────────────
function VideosTab({ videos, adminId, onSave }: { videos: VideoResource[]; adminId: string; onSave: (v: VideoResource[]) => void }) {
  const blank = { title: "", youtubeUrl: "", thumbnail: "", description: "", category: "general" as VideoResource["category"] };
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<VideoResource | null>(null);
  const [form, setForm]         = useState(blank);

  function startNew() { setEditing(null); setForm(blank); setShowForm(true); }
  function startEdit(v: VideoResource) { setEditing(v); setForm({ title: v.title, youtubeUrl: v.youtubeUrl, thumbnail: v.thumbnail, description: v.description, category: v.category }); setShowForm(true); }
  function save() {
    if (!form.title.trim() || !form.youtubeUrl.trim()) return;
    const updated = editing
      ? videos.map(v => v.id === editing.id ? { ...editing, ...form } : v)
      : [...videos, { ...form, id: uid(), createdBy: adminId, createdAt: new Date().toISOString() }];
    onSave(updated); setShowForm(false);
  }
  function del(id: string) { onSave(videos.filter(v => v.id !== id)); }
  function getYTId(url: string) {
    const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  return (
    <div>
      <SectionHeader
        title="Video Library"
        subtitle={`${videos.length} resources across all categories`}
        action={<AddButton onClick={startNew} label="Add Video" />}
      />
      <AnimatePresence>
        {showForm && (
          <FormCard
            title={editing ? "Edit Video" : "Add Video"}
            onSave={save}
            onCancel={() => setShowForm(false)}
          >
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Title *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputCls} placeholder="Video title…" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">YouTube URL *</label>
                <input value={form.youtubeUrl} onChange={e => setForm(p => ({ ...p, youtubeUrl: e.target.value }))} className={inputCls} placeholder="https://youtube.com/watch?v=…" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className={textareaCls} placeholder="Brief description…" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as VideoResource["category"] }))} className={selectCls}>
                  {["investment", "tax", "insurance", "planning", "general"].map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
          </FormCard>
        )}
      </AnimatePresence>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {videos.map((v, i) => {
          const ytId = getYTId(v.youtubeUrl);
          return (
            <motion.div key={v.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl overflow-hidden group"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)" }}>
              {/* Thumbnail */}
              <div className="relative overflow-hidden" style={{ height: 148 }}>
                {ytId ? (
                  <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={v.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #050a07, #0f2419)" }}>
                    <Play className="w-10 h-10" style={{ color: "rgba(184,233,134,0.5)" }} />
                  </div>
                )}
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "rgba(5,10,7,0.5)" }}>
                  <a href={v.youtubeUrl} target="_blank" rel="noreferrer"
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(184,233,134,0.9)" }}>
                    <Play className="w-5 h-5 text-[#0f2419] ml-0.5" />
                  </a>
                </div>
                {/* Category badge */}
                <span className="absolute bottom-2 left-2 text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: "rgba(5,10,7,0.75)", color: "#B8E986", backdropFilter: "blur(4px)" }}>
                  {v.category}
                </span>
              </div>
              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 flex-1">{v.title}</p>
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(v)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(26,95,61,0.08)", color: "#1A5F3D" }}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => del(v.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: "rgba(220,38,38,0.08)", color: "#dc2626" }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {v.description && <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">{v.description}</p>}
              </div>
            </motion.div>
          );
        })}
        {videos.length === 0 && (
          <div className="sm:col-span-2 xl:col-span-3 py-16 text-center bg-white rounded-2xl"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <Play className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-400">No videos yet</p>
            <p className="text-sm text-gray-300 mt-1">Click "Add Video" to build your library</p>
          </div>
        )}
      </div>
    </div>
  );
}