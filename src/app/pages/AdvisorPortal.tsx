// src/app/pages/AdvisorPortal.tsx
// ── SmartFinance Real Advisor Portal ──────────────────────────────────────────
// Actor: ADVISOR (Authenticated via sf_advisor_token)
// Features: Overview Stats, Client Roster, Real-Time Search & Pagination,
//           Client Detail Drawer (Deep Financials), Invitations & Requests,
//           Read-Only Advisor Profile, Secure Logout & 401 Session Expiry.

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  BarChart3,
  Users,
  Mail,
  Send,
  UserCheck,
  LogOut,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Briefcase,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  ExternalLink,
  DollarSign,
  PieChart as PieIcon,
  Target,
  CreditCard,
  Menu,
  X,
  RefreshCw,
  Eye,
  BadgeCheck,
  Sparkles,
  MapPin,
  Calendar,
  Phone,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAdvisorAuth } from "../auth/AdvisorAuthContext";
import {
  advisorAPI,
  type AdvisorDashboardStats,
  type AdvisorClient,
  type AdvisorClientDetail,
} from "../services/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../components/ui/sheet";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { NotificationBell } from "../components/NotificationBell";

// ── Financial INR Formatters ──────────────────────────────────────────────────
function formatINR(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "₹0";
  return `₹${Math.round(val).toLocaleString("en-IN")}`;
}

function formatCompactINR(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "₹0";
  const num = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (num >= 10000000) {
    return `${sign}₹${(num / 10000000).toFixed(2)}Cr`;
  }
  if (num >= 100000) {
    return `${sign}₹${(num / 100000).toFixed(1)}L`;
  }
  if (num >= 1000) {
    return `${sign}₹${(num / 1000).toFixed(0)}K`;
  }
  return `${sign}₹${num.toLocaleString("en-IN")}`;
}

type PortalTab = "overview" | "clients" | "invitations" | "requests" | "profile";

export function AdvisorPortal() {
  const navigate = useNavigate();
  const { advisor, advisorLogout, setAdvisor } = useAdvisorAuth();

  // Active section
  const [activeTab, setActiveTab] = useState<PortalTab>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );

  // Toast notifications
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 1024);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── 401 Session Expiry Handler ──────────────────────────────────────────────
  const handle401 = useCallback(() => {
    setAdvisor(null);
    navigate("/login?role=advisor", { replace: true });
  }, [navigate, setAdvisor]);

  // ── Logout ──────────────────────────────────────────────────────────────────
  async function handleLogout() {
    try {
      await advisorLogout();
    } finally {
      navigate("/login?role=advisor", { replace: true });
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 1. DASHBOARD STATS
  // ════════════════════════════════════════════════════════════════════════════
  const [stats, setStats] = useState<AdvisorDashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await advisorAPI.getDashboardStats();
      if (res.data) {
        setStats(res.data);
      }
    } catch (err: any) {
      if (err.status === 401) {
        handle401();
        return;
      }
      setStatsError(err.message || "Failed to load dashboard metrics.");
    } finally {
      setStatsLoading(false);
    }
  }, [handle401]);

  useEffect(() => {
    if (activeTab === "overview") {
      fetchStats();
    }
  }, [activeTab, fetchStats]);

  // ════════════════════════════════════════════════════════════════════════════
  // 2. CLIENT ROSTER & SEARCH
  // ════════════════════════════════════════════════════════════════════════════
  const [clients, setClients] = useState<AdvisorClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });

  // Debounce search input (~350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1); // Reset to page 1 on new search
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchClients = useCallback(async (p: number, q: string) => {
    setClientsLoading(true);
    setClientsError(null);
    try {
      const res = await advisorAPI.getClients({ page: p, limit: 20, search: q });
      if (res.data) {
        setClients(res.data.clients || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err: any) {
      if (err.status === 401) {
        handle401();
        return;
      }
      setClientsError(err.message || "Failed to load client directory.");
    } finally {
      setClientsLoading(false);
    }
  }, [handle401]);

  useEffect(() => {
    if (activeTab === "clients") {
      fetchClients(page, debouncedSearch);
    }
  }, [activeTab, page, debouncedSearch, fetchClients]);

  // ════════════════════════════════════════════════════════════════════════════
  // 3. CLIENT DETAIL SHEET & SECURITY (403 HANDLING)
  // ════════════════════════════════════════════════════════════════════════════
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [clientDetail, setClientDetail] = useState<AdvisorClientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Prevent race conditions when rapidly selecting different clients
  const activeDetailReqRef = useRef(0);

  async function openClientDetail(clientId: string | null) {
    if (!clientId) {
      showToast("Client record does not have a linked user account.", false);
      return;
    }

    // Immediately clear stale financial data
    setClientDetail(null);
    setDetailError(null);
    setSelectedClientId(clientId);
    setIsDetailOpen(true);
    setDetailLoading(true);

    const reqId = ++activeDetailReqRef.current;

    try {
      const res = await advisorAPI.getClient(clientId);

      // Stale response check
      if (reqId !== activeDetailReqRef.current) return;

      if (res.data) {
        setClientDetail(res.data);
      }
    } catch (err: any) {
      if (reqId !== activeDetailReqRef.current) return;

      if (err.status === 401) {
        handle401();
        return;
      }

      // Security check: 403 ADVISOR_CLIENT_ACCESS_DENIED
      const errCode = err.data?.errors?.code || err.data?.code;
      if (err.status === 403 || errCode === "ADVISOR_CLIENT_ACCESS_DENIED") {
        // 1. Stop displaying financial information
        // 2. Clear selected client
        // 3. Close sheet
        setClientDetail(null);
        setIsDetailOpen(false);
        // 4. Show friendly message
        showToast("Client relationship is no longer active.", false);
        // 5. Refresh client list
        fetchClients(page, debouncedSearch);
        return;
      }

      setDetailError(err.message || "Failed to load client financial profile.");
    } finally {
      if (reqId === activeDetailReqRef.current) {
        setDetailLoading(false);
      }
    }
  }

  function closeDetailSheet() {
    setIsDetailOpen(false);
    setSelectedClientId(null);
    setClientDetail(null);
    setDetailError(null);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 4. INVITATIONS (Prospective Clients)
  // ════════════════════════════════════════════════════════════════════════════
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteNotes, setInviteNotes] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<{
    email: string;
    expiresAt: string;
  } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  async function handleSendInvitation(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = inviteEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setInviteError("Please enter a valid email address.");
      return;
    }

    setInviteSubmitting(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const res = await advisorAPI.sendInvitation({
        clientEmail: cleanEmail,
        clientName: inviteName.trim() || undefined,
        notes: inviteNotes.trim() || undefined,
      });

      setInviteSuccess({
        email: cleanEmail,
        expiresAt: res.data?.expiresAt || new Date(Date.now() + 7 * 86400000).toISOString(),
      });
      setInviteEmail("");
      setInviteName("");
      setInviteNotes("");
      showToast("Invitation email sent successfully!");
    } catch (err: any) {
      if (err.status === 401) {
        handle401();
        return;
      }
      const code = err.data?.errors?.code || err.data?.code;
      if (code === "USER_ALREADY_HAS_ADVISOR") {
        setInviteError("This client already has an active financial advisor.");
      } else if (code === "EXISTING_USER_REQUEST_REQUIRED") {
        setInviteError(
          "This user already has a SmartFinance account. Please switch to the 'Requests' tab to send a direct connection request."
        );
      } else if (code === "INVITATION_ALREADY_PENDING") {
        setInviteError("An active invitation is already pending for this email address.");
      } else {
        setInviteError(err.message || "Failed to send client invitation.");
      }
    } finally {
      setInviteSubmitting(false);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 5. CONNECTION REQUESTS (Existing Users)
  // ════════════════════════════════════════════════════════════════════════════
  const [requestEmail, setRequestEmail] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<{
    email: string;
    requestedAt: string;
  } | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  async function handleSendRequest(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = requestEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setRequestError("Please enter a valid email address.");
      return;
    }

    setRequestSubmitting(true);
    setRequestError(null);
    setRequestSuccess(null);

    try {
      const res = await advisorAPI.sendConnectionRequest({
        userEmail: cleanEmail,
        notes: requestNotes.trim() || undefined,
      });

      setRequestSuccess({
        email: cleanEmail,
        requestedAt: res.data?.requestedAt || new Date().toISOString(),
      });
      setRequestEmail("");
      setRequestNotes("");
      showToast("Connection request sent to user successfully!");
    } catch (err: any) {
      if (err.status === 401) {
        handle401();
        return;
      }
      const code = err.data?.errors?.code || err.data?.code;
      if (code === "SELF_REQUEST_FORBIDDEN") {
        setRequestError("You cannot send a connection request to your own email address.");
      } else if (code === "USER_NOT_FOUND") {
        setRequestError(
          "No SmartFinance account was found with this email. Use the 'Invitations' tab to invite prospective clients."
        );
      } else if (code === "USER_ALREADY_HAS_ADVISOR") {
        setRequestError("This user already has an active financial advisor.");
      } else if (code === "REQUEST_ALREADY_PENDING") {
        setRequestError("A connection request is already pending for this user.");
      } else {
        setRequestError(err.message || "Failed to send connection request.");
      }
    } finally {
      setRequestSubmitting(false);
    }
  }

  // ── Navigation Items ────────────────────────────────────────────────────────
  const navItems = [
    { id: "overview", label: "Overview", icon: <BarChart3 className="w-5 h-5" /> },
    {
      id: "clients",
      label: "Clients",
      icon: <Users className="w-5 h-5" />,
      badge: stats ? stats.totalActiveClients : undefined,
    },
    { id: "invitations", label: "Invitations", icon: <Mail className="w-5 h-5" /> },
    {
      id: "requests",
      label: "Requests",
      icon: <Send className="w-5 h-5" />,
      badge: stats?.pendingClientRequests ? stats.pendingClientRequests : undefined,
    },
    { id: "profile", label: "Advisor Profile", icon: <UserCheck className="w-5 h-5" /> },
  ];

  const advisorInitials = useMemo(() => {
    const name = advisor?.fullName || "A";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [advisor]);

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row bg-[#F7F9FB]"
      style={{
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ── Toast Notification ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold text-white ${
              toast.ok
                ? "bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] shadow-emerald-900/30"
                : "bg-gradient-to-r from-red-600 to-rose-600 shadow-red-900/30"
            }`}
          >
            {toast.ok ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Desktop Sidebar (>=1024px) ──────────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col w-64 h-screen sticky top-0 z-30 shrink-0 border-r border-emerald-950/20 text-white"
        style={{
          background: "linear-gradient(180deg, #050E09 0%, #0A1F14 45%, #0F2D1E 100%)",
        }}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center font-bold text-white shadow-md">
            SF
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">SmartFinance</h2>
            <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
              Advisor Portal
            </p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as PortalTab)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] text-white shadow-md"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? "text-emerald-300" : "text-gray-400"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      isActive ? "bg-white/20 text-white" : "bg-emerald-900/60 text-emerald-300"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Advisor Mini Card & Logout */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-800 text-emerald-100 font-bold flex items-center justify-center text-xs shadow-inner">
              {advisorInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">
                {advisor?.fullName || "Financial Advisor"}
              </p>
              <p className="text-[11px] text-emerald-400/80 truncate">
                {advisor?.firmName || "Registered Firm"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-red-300 hover:text-red-100 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Advisor</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Top Header (<1024px) ─────────────────────────────────────── */}
      <header className="lg:hidden sticky top-0 z-40 bg-[#0A1F14] text-white px-4 py-3.5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#1A5F3D] flex items-center justify-center font-bold text-xs text-white">
              SF
            </div>
            <span className="text-sm font-bold text-white tracking-wide">Advisor Portal</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isMobile && <NotificationBell actorType="advisor" />}
          <div className="w-7 h-7 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center text-[10px]">
            {advisorInitials}
          </div>
        </div>
      </header>

      {/* ── Mobile Off-Canvas Navigation Sheet ──────────────────────────────── */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="p-0 border-r border-white/10 text-white w-72"
          style={{
            background: "linear-gradient(180deg, #050E09 0%, #0A1F14 100%)",
          }}
        >
          <SheetHeader className="p-6 border-b border-white/10 text-left">
            <SheetTitle className="text-base font-bold text-white flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#1A5F3D] flex items-center justify-center text-xs font-bold text-white">
                SF
              </div>
              SmartFinance Advisor
            </SheetTitle>
            <SheetDescription className="text-xs text-emerald-400">
              {advisor?.firmName || "Financial Advisory Network"}
            </SheetDescription>
          </SheetHeader>

          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id as PortalTab);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] text-white"
                      : "text-gray-300 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? "text-emerald-300" : "text-gray-400"}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="p-4 mt-auto border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/10 rounded-xl"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Main Portal Workspace ───────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar for Desktop */}
        <div className="hidden lg:flex items-center justify-between px-8 py-4 bg-white border-b border-gray-200">
          <div>
            <h1 className="text-lg font-bold text-gray-900 capitalize">
              {activeTab === "overview" && "Practice Overview"}
              {activeTab === "clients" && "Client Directory"}
              {activeTab === "invitations" && "Invite Prospective Clients"}
              {activeTab === "requests" && "User Connection Requests"}
              {activeTab === "profile" && "Advisor Credential Profile"}
            </h1>
            <p className="text-xs text-gray-500">
              Logged in as {advisor?.fullName} • {advisor?.email}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {!isMobile && <NotificationBell actorType="advisor" />}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-[#1A5F3D]">
              <BadgeCheck className="w-4 h-4 text-[#1A5F3D]" />
              SEBI / Registered Advisor
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 1: OVERVIEW                                                */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-[#0F2D1E] via-[#1A5F3D] to-[#2D7A4E] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
                <div className="max-w-2xl relative z-10 space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-emerald-200 backdrop-blur-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                    Advisor Practice Intelligence
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    Welcome back, {advisor?.fullName || "Advisor"}
                  </h2>
                  <p className="text-sm text-emerald-100/80 leading-relaxed">
                    Here is the live performance and client portfolio health overview for{" "}
                    {advisor?.firmName || "your financial firm"}.
                  </p>
                </div>
              </div>

              {/* Stats Error / Retry */}
              {statsError && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between text-sm text-red-800">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <span>{statsError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={fetchStats}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                </div>
              )}

              {/* 4 Main Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Active Clients */}
                <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#1A5F3D] flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    {stats && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Total Active Clients</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900">
                      {stats ? stats.totalActiveClients : 0}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">
                    {stats ? `+${stats.totalClientsAddedThisMonth} added this month` : "—"}
                  </p>
                </div>

                {/* 2. Client AUM / Investments */}
                <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#1A5F3D] flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    {stats && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                        Current Value
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    Client Portfolio Value
                  </p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-28" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900">
                      {stats ? formatCompactINR(stats.totalInvestmentsCurrentValue) : "₹0"}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-500 mt-1">
                    Invested: {stats ? formatCompactINR(stats.totalInvestmentsAmount) : "₹0"}
                  </p>
                </div>

                {/* 3. Outstanding Loans */}
                <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                      Liabilities
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Total Outstanding Loans</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-28" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900">
                      {stats ? formatCompactINR(stats.totalOutstandingLoans) : "₹0"}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">Across active client portfolios</p>
                </div>

                {/* 4. Client Goals */}
                <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Target className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">
                      Milestones
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Client Financial Goals</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900">
                      {stats ? stats.totalClientGoals : 0}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">Active tracked wealth goals</p>
                </div>
              </div>

              {/* Growth & Activity Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Monthly Client Growth */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#1A5F3D]" />
                    Practice Growth
                  </h3>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-sm py-2 border-b border-gray-100">
                      <span className="text-gray-600">Growth Rate</span>
                      <span className="font-bold text-[#1A5F3D]">
                        {stats
                          ? `${stats.clientGrowthPercentage > 0 ? "+" : ""}${stats.clientGrowthPercentage.toFixed(1)}%`
                          : "0.0%"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm py-2 border-b border-gray-100">
                      <span className="text-gray-600">Clients Added This Month</span>
                      <span className="font-bold text-gray-900">
                        {stats ? stats.totalClientsAddedThisMonth : 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm py-2">
                      <span className="text-gray-600">Clients Added Last Month</span>
                      <span className="font-bold text-gray-900">
                        {stats ? stats.totalClientsAddedLastMonth : 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Connection Pipeline */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#1A5F3D]" />
                    Pending Pipeline
                  </h3>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-sm py-2 border-b border-gray-100">
                      <span className="text-gray-600">Pending User Requests</span>
                      <span className="font-bold text-amber-600">
                        {stats ? stats.pendingClientRequests : 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm py-2 border-b border-gray-100">
                      <span className="text-gray-600">Licensing Status</span>
                      <span className="font-bold text-emerald-700">Active / Valid</span>
                    </div>
                    <div className="flex items-center justify-between text-sm py-2">
                      <span className="text-gray-600">Firm Affiliation</span>
                      <span className="font-bold text-gray-900 truncate max-w-[140px]">
                        {advisor?.firmName || "Independent"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fast Action Shortcuts */}
                <div className="bg-emerald-50/70 rounded-2xl p-6 border border-emerald-200/80 shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#1A5F3D] mb-1">Quick Actions</h3>
                    <p className="text-xs text-gray-600">
                      Expand your advisory network with invitation links and direct requests.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("invitations")}
                      className="w-full py-2.5 px-4 bg-[#1A5F3D] hover:bg-[#154d31] text-white rounded-xl text-xs font-semibold shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Mail className="w-4 h-4" />
                      Invite Prospective Client
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("requests")}
                      className="w-full py-2.5 px-4 bg-white hover:bg-gray-100 text-gray-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4 text-[#1A5F3D]" />
                      Connect Registered User
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 2: CLIENT ROSTER & SEARCH                                  */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "clients" && (
            <div className="space-y-4">
              {/* Top Search & Filter Bar */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#1A5F3D]/20 focus:border-[#1A5F3D] transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <span className="text-xs text-gray-500">
                    Showing{" "}
                    <strong className="text-gray-900">{clients.length}</strong> of{" "}
                    <strong className="text-gray-900">{pagination.total}</strong> active clients
                  </span>
                  <button
                    type="button"
                    onClick={() => fetchClients(page, debouncedSearch)}
                    disabled={clientsLoading}
                    className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                    title="Refresh Clients"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${clientsLoading ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>
              </div>

              {/* Clients Error */}
              {clientsError && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between text-sm text-red-800">
                  <span>{clientsError}</span>
                  <button
                    type="button"
                    onClick={() => fetchClients(page, debouncedSearch)}
                    className="text-xs font-semibold text-red-700 underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Clients Table Card */}
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-600">
                    <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3.5 px-4">Client</th>
                        <th className="py-3.5 px-4">Email</th>
                        <th className="py-3.5 px-4">Location</th>
                        <th className="py-3.5 px-4">Connected Since</th>
                        <th className="py-3.5 px-4">Portfolio Value</th>
                        <th className="py-3.5 px-4">Loans</th>
                        <th className="py-3.5 px-4 text-center">Goals</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {clientsLoading ? (
                        [...Array(5)].map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="py-4 px-4">
                              <Skeleton className="h-4 w-32" />
                            </td>
                            <td className="py-4 px-4">
                              <Skeleton className="h-4 w-36" />
                            </td>
                            <td className="py-4 px-4">
                              <Skeleton className="h-4 w-20" />
                            </td>
                            <td className="py-4 px-4">
                              <Skeleton className="h-4 w-24" />
                            </td>
                            <td className="py-4 px-4">
                              <Skeleton className="h-4 w-24" />
                            </td>
                            <td className="py-4 px-4">
                              <Skeleton className="h-4 w-20" />
                            </td>
                            <td className="py-4 px-4 text-center">
                              <Skeleton className="h-4 w-8 mx-auto" />
                            </td>
                            <td className="py-4 px-4 text-right">
                              <Skeleton className="h-7 w-20 ml-auto" />
                            </td>
                          </tr>
                        ))
                      ) : clients.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center">
                            <div className="max-w-xs mx-auto space-y-3">
                              <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                                <Users className="w-6 h-6" />
                              </div>
                              <p className="text-sm font-semibold text-gray-800">
                                {debouncedSearch
                                  ? `No clients found matching "${debouncedSearch}"`
                                  : "No active clients yet."}
                              </p>
                              <p className="text-xs text-gray-500">
                                {debouncedSearch
                                  ? "Try searching by a different term or clear the filter."
                                  : "Send client invitations or connection requests to build your advisory network."}
                              </p>
                              {!debouncedSearch && (
                                <div className="pt-2">
                                  <button
                                    type="button"
                                    onClick={() => setActiveTab("invitations")}
                                    className="px-4 py-2 bg-[#1A5F3D] hover:bg-[#154d31] text-white rounded-xl text-xs font-semibold shadow transition-all cursor-pointer"
                                  >
                                    Send First Invitation
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        clients.map((c) => (
                          <tr
                            key={c.relationshipId}
                            className="hover:bg-emerald-50/30 transition-colors"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#1A5F3D] font-bold flex items-center justify-center text-xs shrink-0">
                                  {c.fullName ? c.fullName.charAt(0).toUpperCase() : "C"}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-gray-900 truncate">
                                    {c.fullName || "SmartFinance User"}
                                  </p>
                                  {c.mobile && (
                                    <p className="text-[11px] text-gray-400">{c.mobile}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-gray-700">{c.email}</td>
                            <td className="py-3.5 px-4 text-gray-600">
                              {c.city || c.state ? `${c.city || ""}${c.state ? `, ${c.state}` : ""}` : "India"}
                            </td>
                            <td className="py-3.5 px-4 text-gray-500">
                              {c.connectedSince
                                ? new Date(c.connectedSince).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "—"}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-gray-900">
                              {formatINR(c.totalInvestments)}
                            </td>
                            <td className="py-3.5 px-4 text-amber-700 font-medium">
                              {formatINR(c.totalLoans)}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold text-[11px]">
                                {c.goalsCount}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => openClientDetail(c.clientId)}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-[#1A5F3D] text-[#1A5F3D] hover:text-white rounded-lg font-semibold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View Profile
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {pagination.pages > 1 && (
                  <div className="px-6 py-3.5 bg-gray-50/80 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
                    <span>
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={pagination.page <= 1 || clientsLoading}
                        className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                        disabled={pagination.page >= pagination.pages || clientsLoading}
                        className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 3: INVITATIONS (Prospective Clients)                       */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "invitations" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-[#1A5F3D] mb-2">
                    <Mail className="w-3.5 h-3.5" />
                    Prospective Clients
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Send Invitation to New Client
                  </h2>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Invite clients who do not yet have a SmartFinance account. An encrypted
                    invitation email with an active 7-day connection link will be sent.
                  </p>
                </div>

                {inviteSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3"
                  >
                    <div className="flex items-center gap-2 text-sm font-bold text-[#1A5F3D]">
                      <CheckCircle2 className="w-5 h-5" />
                      Invitation Sent Successfully
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      An invitation has been dispatched to{" "}
                      <strong className="text-gray-900">{inviteSuccess.email}</strong>. It will
                      remain valid until{" "}
                      <strong>
                        {new Date(inviteSuccess.expiresAt).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </strong>
                      . Once the client registers and claims the link, their portfolio will appear
                      in your roster.
                    </p>
                    <button
                      type="button"
                      onClick={() => setInviteSuccess(null)}
                      className="text-xs font-semibold text-[#1A5F3D] hover:underline"
                    >
                      Send Another Invitation
                    </button>
                  </motion.div>
                )}

                {inviteError && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="flex-1">{inviteError}</div>
                  </div>
                )}

                <form onSubmit={handleSendInvitation} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Client Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="client@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#1A5F3D]/20 focus:border-[#1A5F3D] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Client Full Name <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#1A5F3D]/20 focus:border-[#1A5F3D] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Private Notes <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Private notes for your internal advisory reference..."
                      value={inviteNotes}
                      onChange={(e) => setInviteNotes(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#1A5F3D]/20 focus:border-[#1A5F3D] transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={inviteSubmitting}
                    className="w-full py-3.5 bg-[#1A5F3D] hover:bg-[#154d31] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {inviteSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Sending Encrypted Invitation...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Invitation Email
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 4: CONNECTION REQUESTS (Existing Users)                    */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "requests" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 mb-2">
                    <UserCheck className="w-3.5 h-3.5" />
                    Existing Platform Clients
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Connect with Registered User
                  </h2>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Request advisory access to an existing SmartFinance user. The user will receive
                    a notification to accept your advisory connection.
                  </p>
                </div>

                {requestSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-5 rounded-2xl bg-blue-50 border border-blue-200 space-y-3"
                  >
                    <div className="flex items-center gap-2 text-sm font-bold text-blue-800">
                      <CheckCircle2 className="w-5 h-5" />
                      Connection Request Dispatched
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      A connection request has been sent to{" "}
                      <strong className="text-gray-900">{requestSuccess.email}</strong>. Once the
                      user approves the request in their portal, their portfolio will be securely
                      accessible.
                    </p>
                    <button
                      type="button"
                      onClick={() => setRequestSuccess(null)}
                      className="text-xs font-semibold text-blue-700 hover:underline"
                    >
                      Send Another Request
                    </button>
                  </motion.div>
                )}

                {requestError && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="flex-1">{requestError}</div>
                  </div>
                )}

                <form onSubmit={handleSendRequest} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Registered SmartFinance User Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="user@example.com"
                      value={requestEmail}
                      onChange={(e) => setRequestEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#1A5F3D]/20 focus:border-[#1A5F3D] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Introductory Pitch / Notes{" "}
                      <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Brief note to the client outlining your advisory support..."
                      value={requestNotes}
                      onChange={(e) => setRequestNotes(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#1A5F3D]/20 focus:border-[#1A5F3D] transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={requestSubmitting}
                    className="w-full py-3.5 bg-[#1A5F3D] hover:bg-[#154d31] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {requestSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Sending Request...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Direct Request
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* SECTION 5: ADVISOR PROFILE (Read-Only)                             */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "profile" && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-6">
                {/* Header Profile Summary */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-gray-100">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] text-white font-bold flex items-center justify-center text-xl shadow-md shrink-0">
                    {advisorInitials}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-900">
                        {advisor?.fullName || "Financial Advisor"}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-[#1A5F3D]" />
                        {advisor?.approvalStatus === "approved" ? "Approved Advisor" : "Pending"}
                      </span>
                      {advisor?.isEmailVerified && (
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          Email Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-medium">
                      {advisor?.firmName} • License #{advisor?.licenseNumber}
                    </p>
                  </div>
                </div>

                {/* Profile Information Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                    <p className="text-gray-400 font-medium">Registered Email</p>
                    <p className="font-semibold text-gray-900 font-mono">{advisor?.email}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                    <p className="text-gray-400 font-medium">Contact Mobile</p>
                    <p className="font-semibold text-gray-900">{advisor?.mobile || "Not specified"}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                    <p className="text-gray-400 font-medium">Advisory Firm</p>
                    <p className="font-semibold text-gray-900">{advisor?.firmName}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                    <p className="text-gray-400 font-medium">Years of Experience</p>
                    <p className="font-semibold text-gray-900">
                      {advisor?.experienceYears ? `${advisor.experienceYears} Years` : "—"}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                    <p className="text-gray-400 font-medium">License / Registration Number</p>
                    <p className="font-semibold text-gray-900 font-mono">{advisor?.licenseNumber}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                    <p className="text-gray-400 font-medium">Practice Location</p>
                    <p className="font-semibold text-gray-900">
                      {advisor?.location?.city || advisor?.location?.state
                        ? `${advisor?.location?.city || ""}${advisor?.location?.state ? `, ${advisor.location.state}` : ""}`
                        : "India"}
                    </p>
                  </div>
                </div>

                {/* Specializations */}
                {advisor?.specializations && advisor.specializations.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-semibold text-gray-700">Areas of Specialization</p>
                    <div className="flex flex-wrap gap-2">
                      {advisor.specializations.map((spec) => (
                        <span
                          key={spec}
                          className="px-3 py-1 bg-emerald-50 text-[#1A5F3D] border border-emerald-200 rounded-lg text-xs font-medium"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bio */}
                {advisor?.bio && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-semibold text-gray-700">Professional Bio</p>
                    <p className="text-xs text-gray-600 leading-relaxed p-4 rounded-xl bg-gray-50 border border-gray-100">
                      {advisor.bio}
                    </p>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-3 text-xs text-amber-800">
                  <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                  <div className="leading-relaxed">
                    Advisor profile information is officially registered and verified by platform
                    compliance administrators. To modify your credentials, licensing, or practice
                    affiliation, submit a support request.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* 6. CLIENT DETAIL DRAWER (SHEET)                                          */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      <Sheet open={isDetailOpen} onOpenChange={(open) => !open && closeDetailSheet()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 overflow-y-auto bg-[#F7F9FB] border-l border-gray-200"
        >
          {/* Header */}
          <div className="bg-white p-6 border-b border-gray-200 sticky top-0 z-20">
            <div className="flex items-center justify-between pr-8">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {detailLoading
                    ? "Loading Profile..."
                    : clientDetail?.client.fullName || "Client Details"}
                </h3>
                <p className="text-xs text-gray-500">
                  {clientDetail?.client.email || "Active Advisory Relationship"}
                </p>
              </div>
              {clientDetail?.relationship.status && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold uppercase tracking-wider">
                  {clientDetail.relationship.status}
                </span>
              )}
            </div>
          </div>

          {/* Drawer Body */}
          <div className="p-6 space-y-6">
            {detailLoading ? (
              <div className="space-y-4 py-4">
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-36 w-full rounded-2xl" />
                <Skeleton className="h-44 w-full rounded-2xl" />
              </div>
            ) : detailError ? (
              <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
                <p className="text-sm font-bold text-red-900">{detailError}</p>
                <button
                  type="button"
                  onClick={() => openClientDetail(selectedClientId)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold"
                >
                  Retry Loading
                </button>
              </div>
            ) : clientDetail ? (
              <>
                {/* Client Quick Demographics Banner */}
                <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[11px]">Mobile</span>
                      <span className="font-semibold text-gray-800">
                        {clientDetail.client.mobile || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Occupation</span>
                      <span className="font-semibold text-gray-800">
                        {clientDetail.client.occupation || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Location</span>
                      <span className="font-semibold text-gray-800">
                        {clientDetail.client.location?.city ||
                        clientDetail.client.location?.state
                          ? `${clientDetail.client.location.city || ""}${clientDetail.client.location.state ? `, ${clientDetail.client.location.state}` : ""}`
                          : "India"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">Connected</span>
                      <span className="font-semibold text-gray-800">
                        {clientDetail.relationship.connectedSince
                          ? new Date(
                              clientDetail.relationship.connectedSince
                            ).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tabbed Financial Drilldown */}
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="w-full grid grid-cols-4 bg-gray-100 p-1 rounded-xl">
                    <TabsTrigger value="overview" className="text-xs">
                      Income & Risk
                    </TabsTrigger>
                    <TabsTrigger value="investments" className="text-xs">
                      Investments
                    </TabsTrigger>
                    <TabsTrigger value="loans" className="text-xs">
                      Loans
                    </TabsTrigger>
                    <TabsTrigger value="goals" className="text-xs">
                      Goals
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab 1: Income & Risk */}
                  <TabsContent value="overview" className="space-y-4 pt-3">
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-[#1A5F3D]" />
                        Income Profile
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-gray-500">Monthly Primary Income</p>
                          <p className="text-base font-bold text-gray-900 mt-1">
                            {formatINR(clientDetail.client.income?.monthly)}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            Source: {clientDetail.client.income?.source || "Primary"}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-gray-500">Additional Monthly</p>
                          <p className="text-base font-bold text-gray-900 mt-1">
                            {formatINR(clientDetail.client.income?.additionalMonthly)}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            Growth: {clientDetail.client.income?.annualGrowthPct || 0}% / yr
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-3">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#1A5F3D]" />
                        Risk & Investment Profile
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <span className="text-gray-400 block text-[11px]">Risk Tolerance</span>
                          <span className="font-semibold text-gray-800 capitalize">
                            {clientDetail.client.riskProfile?.tolerance || "Not Assessed"}
                          </span>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <span className="text-gray-400 block text-[11px]">Experience</span>
                          <span className="font-semibold text-gray-800 capitalize">
                            {clientDetail.client.riskProfile?.experience || "Moderate"}
                          </span>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <span className="text-gray-400 block text-[11px]">Time Horizon</span>
                          <span className="font-semibold text-gray-800">
                            {clientDetail.client.riskProfile?.timeHorizonYears
                              ? `${clientDetail.client.riskProfile.timeHorizonYears} Years`
                              : "5+ Years"}
                          </span>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <span className="text-gray-400 block text-[11px]">Investment Style</span>
                          <span className="font-semibold text-gray-800 capitalize">
                            {clientDetail.client.riskProfile?.investmentStyle || "Balanced Growth"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expenses Summary */}
                    {clientDetail.client.expenses && clientDetail.client.expenses.length > 0 && (
                      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-3">
                        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                          Recurring Expenses
                        </h4>
                        <div className="divide-y divide-gray-100 text-xs">
                          {clientDetail.client.expenses.map((exp, idx) => (
                            <div key={idx} className="py-2 flex items-center justify-between">
                              <span className="text-gray-700">{exp.category}</span>
                              <span className="font-semibold text-gray-900">
                                {formatINR(exp.amount)} / {exp.frequency || "mo"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab 2: Investments */}
                  <TabsContent value="investments" className="space-y-3 pt-3">
                    {clientDetail.client.investments &&
                    clientDetail.client.investments.length > 0 ? (
                      <div className="space-y-3">
                        {clientDetail.client.investments.map((inv, idx) => (
                          <div
                            key={idx}
                            className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center justify-between text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900">{inv.name}</span>
                                <span className="px-2 py-0.5 rounded bg-emerald-50 text-[#1A5F3D] font-medium text-[10px]">
                                  {inv.type}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-400">
                                Invested: {formatINR(inv.investedAmount)}
                              </p>
                            </div>
                            <div className="text-right space-y-0.5">
                              <p className="font-bold text-gray-900">
                                {formatINR(inv.currentValue)}
                              </p>
                              {inv.returnPct !== undefined && (
                                <p
                                  className={`text-[11px] font-semibold ${
                                    inv.returnPct >= 0 ? "text-emerald-700" : "text-red-600"
                                  }`}
                                >
                                  {inv.returnPct >= 0 ? "+" : ""}
                                  {inv.returnPct.toFixed(1)}%
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 text-xs text-gray-500">
                        No investment records logged for this client yet.
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab 3: Loans */}
                  <TabsContent value="loans" className="space-y-3 pt-3">
                    {clientDetail.client.loans && clientDetail.client.loans.length > 0 ? (
                      <div className="space-y-3">
                        {clientDetail.client.loans.map((loan, idx) => (
                          <div
                            key={idx}
                            className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-gray-900">{loan.type}</div>
                              <span className="font-bold text-amber-700">
                                {formatINR(loan.outstandingAmount)}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-500 pt-1 border-t border-gray-100">
                              <div>Lender: {loan.lender || "Bank"}</div>
                              <div>EMI: {formatINR(loan.emi)}/mo</div>
                              <div>Rate: {loan.interestRate}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 text-xs text-gray-500">
                        No active loans or debt liabilities recorded.
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab 4: Goals */}
                  <TabsContent value="goals" className="space-y-3 pt-3">
                    {clientDetail.client.goals && clientDetail.client.goals.length > 0 ? (
                      <div className="space-y-3">
                        {clientDetail.client.goals.map((goal, idx) => {
                          const pct =
                            goal.targetAmount > 0
                              ? Math.min(
                                  100,
                                  Math.round((goal.currentSavings / goal.targetAmount) * 100)
                                )
                              : 0;
                          return (
                            <div
                              key={idx}
                              className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-2 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-bold text-gray-900">{goal.name}</span>
                                  <span className="ml-2 px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-medium">
                                    {goal.category}
                                  </span>
                                </div>
                                <span className="font-bold text-gray-900">{pct}%</span>
                              </div>

                              {/* Progress bar */}
                              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-[#1A5F3D] to-[#3FAF7D] h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-gray-500">
                                <span>Saved: {formatINR(goal.currentSavings)}</span>
                                <span>Target: {formatINR(goal.targetAmount)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 text-xs text-gray-500">
                        No financial goals registered yet.
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
