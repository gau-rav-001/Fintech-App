import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  BarChart3, Users, Video, Newspaper, Play, LogOut, Plus, Trash2, Edit2,
  Shield, TrendingUp, Eye, Search, X, CheckCircle, AlertCircle, Save,
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
  if (n >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n/100000).toFixed(0)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}
function uid() { return `id_${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }
function Spinner() {
  return <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>;
}

type Tab = "overview" | "users" | "webinars" | "news" | "videos";

// ─── Main Admin Portal ────────────────────────────────────────────────────────
export function AdminPortal() {
  const navigate  = useNavigate();
  const { adminUser, adminLogout } = useAdminAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function handleLogout() { adminLogout(); navigate("/admin/login", { replace: true }); }

  const users     = useMemo(() => getAllUsers(), []);
  const profiles  = useMemo(() => getAllFinancialProfiles(), []);
  const [content, setContent] = useState(() => getAdminContent());

  async function persist(updated: typeof content) {
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    saveAdminContent(updated);
    setContent(updated);
    setSaving(false);
    showToast("Changes saved successfully.");
  }

  const sideItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview",    icon: <BarChart3 className="w-4 h-4" /> },
    { id: "users",    label: "Users",       icon: <Users className="w-4 h-4" /> },
    { id: "webinars", label: "Webinars",    icon: <Video className="w-4 h-4" /> },
    { id: "news",     label: "News & Updates", icon: <Newspaper className="w-4 h-4" /> },
    { id: "videos",   label: "Videos",      icon: <Play className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex text-white">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium ${toast.ok ? "bg-green-600" : "bg-red-600"}`}>
            {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sidebar ── */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col h-screen sticky top-0">
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-600 to-gray-500 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm">Admin Panel</span>
          </div>
          <p className="text-xs text-gray-400 truncate">{adminUser?.email}</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {sideItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === item.id ? "bg-[#1A5F3D] text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-900/30 transition-all">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-x-hidden">
        <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <h1 className="font-bold text-base capitalize">{tab === "overview" ? "Dashboard Overview" : sideItems.find(s=>s.id===tab)?.label}</h1>
          <div className="flex items-center gap-3">
            {saving && <div className="flex items-center gap-2 text-xs text-gray-400"><Spinner /> Saving…</div>}
            <span className="text-xs text-gray-400">Admin: {adminUser?.name}</span>
          </div>
        </header>

        <main className="p-6">

          {/* ════ OVERVIEW ════ */}
          {tab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Users",   value: users.length,                      icon: <Users className="w-5 h-5" />,   color: "from-blue-600 to-blue-500" },
                  { label: "Active Webinars",value: content.webinars.filter(w=>w.status==="upcoming").length, icon: <Video className="w-5 h-5" />, color: "from-[#1A5F3D] to-[#3FAF7D]" },
                  { label: "News Articles", value: content.newsUpdates.length,         icon: <Newspaper className="w-5 h-5" />, color: "from-amber-600 to-amber-500" },
                  { label: "Video Resources",value: content.videos.length,             icon: <Play className="w-5 h-5" />,    color: "from-red-600 to-red-500" },
                ].map((c, i) => (
                  <div key={i} className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center mb-3`}>
                      {c.icon}
                    </div>
                    <p className="text-2xl font-bold">{c.value}</p>
                    <p className="text-xs text-gray-400">{c.label}</p>
                  </div>
                ))}
              </div>

              {/* Users table preview */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm">Recent Users</h3>
                  <button onClick={() => setTab("users")} className="text-xs text-[#3FAF7D] hover:underline">View all</button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-800">
                      <th className="text-left pb-2">Name</th>
                      <th className="text-left pb-2 hidden sm:table-cell">Email</th>
                      <th className="text-left pb-2 hidden md:table-cell">Income</th>
                      <th className="text-left pb-2">Provider</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 5).map(u => {
                      const fp = profiles[u.id];
                      return (
                        <tr key={u.id} className="border-b border-gray-800 last:border-0">
                          <td className="py-2.5 text-xs font-medium">{u.name}</td>
                          <td className="py-2.5 text-xs text-gray-400 hidden sm:table-cell">{u.email}</td>
                          <td className="py-2.5 text-xs text-gray-400 hidden md:table-cell">{fp ? fmt(fp.monthlyIncome)+"/mo" : "—"}</td>
                          <td className="py-2.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${u.provider === "google" ? "bg-blue-900 text-blue-300" : "bg-gray-800 text-gray-300"}`}>
                              {u.provider}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════ USERS ════ */}
          {tab === "users" && (
            <UsersTab users={users} profiles={profiles} />
          )}

          {/* ════ WEBINARS ════ */}
          {tab === "webinars" && (
            <WebinarsTab webinars={content.webinars} adminId={adminUser?.id ?? "admin_001"}
              onSave={updated => persist({ ...content, webinars: updated })} />
          )}

          {/* ════ NEWS ════ */}
          {tab === "news" && (
            <NewsTab news={content.newsUpdates} adminId={adminUser?.id ?? "admin_001"}
              onSave={updated => persist({ ...content, newsUpdates: updated })} />
          )}

          {/* ════ VIDEOS ════ */}
          {tab === "videos" && (
            <VideosTab videos={content.videos} adminId={adminUser?.id ?? "admin_001"}
              onSave={updated => persist({ ...content, videos: updated })} />
          )}

        </main>
      </div>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab({ users, profiles }: { users: ReturnType<typeof getAllUsers>; profiles: ReturnType<typeof getAllFinancialProfiles> }) {
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<string | null>(null);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );
  const selectedUser    = users.find(u => u.id === selected);
  const selectedProfile = selected ? profiles[selected] : null;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* List */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
              className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-500 outline-none focus:border-[#3FAF7D]" />
          </div>
        </div>
        <div className="overflow-y-auto max-h-[500px]">
          {filtered.map(u => {
            const fp = profiles[u.id];
            return (
              <div key={u.id} onClick={() => setSelected(u.id)}
                className={`flex items-center gap-3 p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800 transition-all ${selected === u.id ? "bg-gray-800 border-l-2 border-l-[#3FAF7D]" : ""}`}>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {u.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.name}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-[#3FAF7D] font-semibold">{fp ? fmt(fp.monthlyIncome) : "—"}</p>
                  <p className="text-xs text-gray-500">/mo</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <Eye className="w-10 h-10 text-gray-600 mb-3" />
            <p className="text-gray-500 text-sm">Select a user to view their financial details</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center font-bold">
                {selectedUser?.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
              </div>
              <div>
                <p className="font-bold">{selectedUser?.name}</p>
                <p className="text-xs text-gray-400">{selectedUser?.email}</p>
              </div>
              <button onClick={() => setSelected(null)} className="ml-auto text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedProfile ? (
              <div className="space-y-3">
                {[
                  ["Monthly Income",   fmt(selectedProfile.monthlyIncome)],
                  ["Monthly Expenses", fmt(selectedProfile.monthlyExpenses)],
                  ["Total Assets",     fmt(selectedProfile.savingsAccount+selectedProfile.mutualFunds+selectedProfile.stocks+selectedProfile.realEstate+selectedProfile.gold+selectedProfile.ppf)],
                  ["Total Liabilities",fmt(selectedProfile.homeLoan+selectedProfile.carLoan+selectedProfile.personalLoan+selectedProfile.creditCardDebt)],
                  ["Life Insurance",   fmt(selectedProfile.lifeInsuranceCover)],
                  ["Health Insurance", fmt(selectedProfile.healthInsuranceCover)],
                  ["Active SIPs",      selectedProfile.sipFunds.length + " funds"],
                  ["Financial Goals",  selectedProfile.goals.length + " goals"],
                ].map(([k,v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-gray-800 last:border-0">
                    <span className="text-xs text-gray-500">{k}</span>
                    <span className="text-xs font-semibold text-[#3FAF7D]">{v}</span>
                  </div>
                ))}
                <div className="pt-2">
                  <p className="text-xs text-gray-500 mb-2">Goals</p>
                  {selectedProfile.goals.map(g => {
                    const pct = Math.round((g.currentAmount/g.targetAmount)*100);
                    return (
                      <div key={g.id} className="flex items-center gap-2 mb-2">
                        <span className="text-xs">{g.icon}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400">{g.name}</span>
                            <span className="text-[#3FAF7D] font-semibold">{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#1A5F3D] to-[#3FAF7D] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center py-8">No financial profile data available for this user.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Webinars Tab ─────────────────────────────────────────────────────────────
function WebinarsTab({ webinars, adminId, onSave }: { webinars: Webinar[]; adminId: string; onSave: (w: Webinar[]) => void }) {
  const blank: Omit<Webinar,"id"|"createdBy"|"createdAt"> = { title:"", speaker:"", date:"", time:"", duration:"", description:"", link:"", status:"upcoming" };
  const [editing, setEditing] = useState<Webinar | null>(null);
  const [form,    setForm]    = useState(blank);
  const [showForm, setShowForm] = useState(false);

  function startNew() { setEditing(null); setForm(blank); setShowForm(true); }
  function startEdit(w: Webinar) { setEditing(w); setForm({title:w.title,speaker:w.speaker,date:w.date,time:w.time,duration:w.duration,description:w.description,link:w.link,status:w.status}); setShowForm(true); }

  function save() {
    if (!form.title.trim()) return;
    let updated: Webinar[];
    if (editing) {
      updated = webinars.map(w => w.id === editing.id ? { ...editing, ...form } : w);
    } else {
      updated = [...webinars, { ...form, id: uid(), createdBy: adminId, createdAt: new Date().toISOString() }];
    }
    onSave(updated); setShowForm(false);
  }

  function del(id: string) { onSave(webinars.filter(w => w.id !== id)); }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={startNew} className="flex items-center gap-2 px-4 py-2 bg-[#1A5F3D] hover:bg-[#2D7A4E] text-white rounded-xl text-sm font-semibold transition-all">
          <Plus className="w-4 h-4" /> Add Webinar
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
            <h3 className="font-bold text-sm mb-4">{editing ? "Edit Webinar" : "New Webinar"}</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {([["title","Title"],["speaker","Speaker"],["date","Date (e.g. April 10, 2026)"],["time","Time"],["duration","Duration"],["link","Registration Link (optional)"]] as [keyof typeof form, string][]).map(([k,l]) => (
                <div key={k} className={k==="title"||k==="link" ? "sm:col-span-2":""}>
                  <label className="text-xs text-gray-400 mb-1 block">{l}</label>
                  <input value={form[k] as string} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white outline-none focus:border-[#3FAF7D]" />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Description</label>
                <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white outline-none focus:border-[#3FAF7D] resize-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Status</label>
                <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value as Webinar["status"]}))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white outline-none focus:border-[#3FAF7D]">
                  <option value="upcoming">Upcoming</option>
                  <option value="live">Live</option>
                  <option value="past">Past</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={save} className="flex items-center gap-2 px-4 py-2 bg-[#1A5F3D] text-white rounded-xl text-sm font-semibold">
                <Save className="w-4 h-4" /> Save
              </button>
              <button onClick={()=>setShowForm(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid sm:grid-cols-2 gap-4">
        {webinars.map(w => (
          <div key={w.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${w.status==="live"?"bg-red-900 text-red-300":w.status==="upcoming"?"bg-green-900 text-green-300":"bg-gray-700 text-gray-400"}`}>
                {w.status.toUpperCase()}
              </span>
              <div className="flex gap-1 shrink-0">
                <button onClick={()=>startEdit(w)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all"><Edit2 className="w-3 h-3 text-gray-400" /></button>
                <button onClick={()=>del(w.id)} className="p-1.5 rounded-lg bg-red-900/50 hover:bg-red-900 transition-all"><Trash2 className="w-3 h-3 text-red-400" /></button>
              </div>
            </div>
            <p className="font-semibold text-sm mb-1">{w.title}</p>
            <p className="text-xs text-gray-400">by {w.speaker}</p>
            <p className="text-xs text-gray-500 mt-1">{w.date} · {w.time} · {w.duration}</p>
            {w.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{w.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── News Tab ─────────────────────────────────────────────────────────────────
function NewsTab({ news, adminId, onSave }: { news: NewsUpdate[]; adminId: string; onSave: (n: NewsUpdate[]) => void }) {
  const blank = { title:"", summary:"", category:"general" as NewsUpdate["category"], source:"", urgent: false };
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<NewsUpdate | null>(null);
  const [form,     setForm]     = useState(blank);

  function startNew() { setEditing(null); setForm(blank); setShowForm(true); }
  function startEdit(n: NewsUpdate) { setEditing(n); setForm({title:n.title,summary:n.summary,category:n.category,source:n.source,urgent:n.urgent}); setShowForm(true); }

  function save() {
    if (!form.title.trim()) return;
    let updated: NewsUpdate[];
    if (editing) {
      updated = news.map(n => n.id === editing.id ? { ...editing, ...form } : n);
    } else {
      updated = [...news, { ...form, id: uid(), publishedAt: new Date().toISOString(), createdBy: adminId }];
    }
    onSave(updated); setShowForm(false);
  }

  function del(id: string) { onSave(news.filter(n => n.id !== id)); }

  const catColor: Record<string, string> = {
    market: "bg-blue-900 text-blue-300", tax: "bg-amber-900 text-amber-300",
    insurance: "bg-green-900 text-green-300", general: "bg-gray-700 text-gray-300",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={startNew} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold transition-all">
          <Plus className="w-4 h-4" /> Add Update
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
            <h3 className="font-bold text-sm mb-4">{editing ? "Edit News" : "New News Update"}</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Title</label>
                <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white outline-none focus:border-amber-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Summary</label>
                <textarea value={form.summary} onChange={e=>setForm(p=>({...p,summary:e.target.value}))} rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white outline-none focus:border-amber-500 resize-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Category</label>
                <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value as NewsUpdate["category"]}))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white outline-none">
                  <option value="market">Market</option>
                  <option value="tax">Tax</option>
                  <option value="insurance">Insurance</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Source</label>
                <input value={form.source} onChange={e=>setForm(p=>({...p,source:e.target.value}))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white outline-none focus:border-amber-500" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="urgent" checked={form.urgent} onChange={e=>setForm(p=>({...p,urgent:e.target.checked}))}
                  className="w-4 h-4 accent-amber-500 cursor-pointer" />
                <label htmlFor="urgent" className="text-xs text-gray-400 cursor-pointer">Mark as urgent</label>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={save} className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold"><Save className="w-4 h-4" /> Save</button>
              <button onClick={()=>setShowForm(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {news.map(n => (
          <div key={n.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${catColor[n.category]}`}>{n.category.toUpperCase()}</span>
                {n.urgent && <span className="text-xs px-2 py-0.5 rounded-full bg-red-900 text-red-300 font-semibold">URGENT</span>}
              </div>
              <p className="font-semibold text-sm">{n.title}</p>
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{n.summary}</p>
              <p className="text-xs text-gray-600 mt-1">Source: {n.source}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={()=>startEdit(n)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700"><Edit2 className="w-3 h-3 text-gray-400" /></button>
              <button onClick={()=>del(n.id)} className="p-1.5 rounded-lg bg-red-900/50 hover:bg-red-900"><Trash2 className="w-3 h-3 text-red-400" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Videos Tab ───────────────────────────────────────────────────────────────
function VideosTab({ videos, adminId, onSave }: { videos: VideoResource[]; adminId: string; onSave: (v: VideoResource[]) => void }) {
  const blank = { title:"", youtubeUrl:"", thumbnail:"", description:"", category:"general" as VideoResource["category"] };
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<VideoResource | null>(null);
  const [form,     setForm]     = useState(blank);

  function startNew() { setEditing(null); setForm(blank); setShowForm(true); }
  function startEdit(v: VideoResource) { setEditing(v); setForm({title:v.title,youtubeUrl:v.youtubeUrl,thumbnail:v.thumbnail,description:v.description,category:v.category}); setShowForm(true); }

  function save() {
    if (!form.title.trim() || !form.youtubeUrl.trim()) return;
    let updated: VideoResource[];
    if (editing) {
      updated = videos.map(v => v.id === editing.id ? { ...editing, ...form } : v);
    } else {
      updated = [...videos, { ...form, id: uid(), createdBy: adminId, createdAt: new Date().toISOString() }];
    }
    onSave(updated); setShowForm(false);
  }

  function del(id: string) { onSave(videos.filter(v => v.id !== id)); }

  function getYTId(url: string) {
    const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={startNew} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition-all">
          <Plus className="w-4 h-4" /> Add Video
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
            <h3 className="font-bold text-sm mb-4">{editing ? "Edit Video" : "Add Video"}</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {([["title","Title"],["youtubeUrl","YouTube URL"],["description","Description"]] as [keyof typeof form, string][]).map(([k,l]) => (
                <div key={k} className={k==="youtubeUrl"||k==="title"||k==="description" ? "sm:col-span-2":""}>
                  <label className="text-xs text-gray-400 mb-1 block">{l}</label>
                  {k==="description"
                    ? <textarea value={form[k] as string} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} rows={2}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white outline-none resize-none" />
                    : <input value={form[k] as string} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white outline-none" />
                  }
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Category</label>
                <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value as VideoResource["category"]}))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white outline-none">
                  {["investment","tax","insurance","planning","general"].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={save} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold"><Save className="w-4 h-4" /> Save</button>
              <button onClick={()=>setShowForm(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map(v => {
          const ytId = getYTId(v.youtubeUrl);
          return (
            <div key={v.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              {ytId ? (
                <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={v.title}
                  className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full h-36 bg-gray-800 flex items-center justify-center">
                  <Play className="w-8 h-8 text-gray-600" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm line-clamp-2">{v.title}</p>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={()=>startEdit(v)} className="p-1 rounded-lg bg-gray-800 hover:bg-gray-700"><Edit2 className="w-3 h-3 text-gray-400" /></button>
                    <button onClick={()=>del(v.id)} className="p-1 rounded-lg bg-red-900/50 hover:bg-red-900"><Trash2 className="w-3 h-3 text-red-400" /></button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{v.description}</p>
                <span className="text-xs text-gray-600 capitalize mt-2 inline-block">{v.category}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}