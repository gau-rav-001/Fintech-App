// src/app/services/api.ts
// ── SmartFinance API client ────────────────────────────────────────────────────
// Fix #5: tokens are now stored in HttpOnly cookies by the server.
// The frontend no longer stores or sends JWT tokens — credentials:include
// automatically attaches cookies on every request.

const BASE = (import.meta as any).env?.VITE_API_URL || "/api";

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; message: string; data: T }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const res  = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  const json = await res.json();

  if (!res.ok) {
    const err: any = new Error(json.message || "Request failed");
    err.status = res.status;
    err.data   = json;
    throw err;
  }
  return json;
}

// ── Auth API ──────────────────────────────────────────────────────────────────
export const authAPI = {
  signup: (body: { fullName: string; email: string; mobile: string; password: string }) =>
    apiFetch("/auth/signup", { method: "POST", body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    apiFetch("/auth/login", { method: "POST", body: JSON.stringify(body) }),

  verifyOTP: (body: { email: string; otp: string }) =>
    apiFetch("/auth/verify-otp", { method: "POST", body: JSON.stringify(body) }),

  resendOTP: (email: string) =>
    apiFetch("/auth/resend-otp", { method: "POST", body: JSON.stringify({ email }) }),

  exchangeCode: (code: string) =>
    apiFetch("/auth/exchange-code", { method: "POST", body: JSON.stringify({ code }) }),

  // ── Password reset ──────────────────────────────────────────────────────────
  forgotPassword: (email: string) =>
    apiFetch("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),

  resetPassword: (token: string, password: string) =>
    apiFetch("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }),

  me:     () => apiFetch("/auth/me"),
  logout: () => apiFetch("/auth/logout", { method: "POST" }),

  googleLoginURL: () => `${BASE}/auth/google`,
};

// ── User API ──────────────────────────────────────────────────────────────────
export const userAPI = {
  onboarding: (data: Record<string, unknown>) =>
    apiFetch("/user/onboarding", { method: "POST", body: JSON.stringify(data) }),

  getProfile: () => apiFetch("/user/profile"),

  updateProfile: (data: Record<string, unknown>) =>
    apiFetch("/user/update", { method: "PUT", body: JSON.stringify(data) }),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    apiFetch("/user/change-password", { method: "POST", body: JSON.stringify(body) }),

  getDashboard: () => apiFetch("/user/dashboard/summary"),
};

// ── Content API (public) ──────────────────────────────────────────────────────
export const contentAPI = {
  getAll: (type?: "webinar" | "news" | "video", page = 1) =>
    apiFetch(`/content?page=${page}${type ? `&type=${type}` : ""}`),
};

// ── Admin API ─────────────────────────────────────────────────────────────────
export const adminAPI = {
  login: (body: { email: string; password: string }) =>
    apiFetch("/admin/login", { method: "POST", body: JSON.stringify(body) }),

  verifyOTP: (body: { email: string; otp: string }) =>
    apiFetch("/admin/verify-otp", { method: "POST", body: JSON.stringify(body) }),

  logout: () => apiFetch("/admin/logout", { method: "POST" }),

  me:       () => apiFetch("/admin/me"),
  getStats: () => apiFetch("/admin/stats"),

  getUsers: (params?: { page?: number; limit?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.page)   q.set("page",   String(params.page));
    if (params?.limit)  q.set("limit",  String(params.limit));
    if (params?.search) q.set("search", params.search);
    return apiFetch(`/admin/users?${q}`);
  },

  getUserById:   (id: string) => apiFetch(`/admin/users/${id}`),
  getContent:    (page = 1)   => apiFetch(`/admin/content?page=${page}`),

  createContent: (data: Record<string, unknown>) =>
    apiFetch("/admin/content", { method: "POST", body: JSON.stringify(data) }),

  updateContent: (id: string, data: Record<string, unknown>) =>
    apiFetch(`/admin/content/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteContent: (id: string) =>
    apiFetch(`/admin/content/${id}`, { method: "DELETE" }),
};

// ── Advisor Types ─────────────────────────────────────────────────────────────

export interface AdvisorProfile {
  id: string;
  fullName: string;
  email: string;
  mobile?: string;
  profilePicture?: string;
  isEmailVerified: boolean;
  firmName: string;
  licenseNumber: string;
  specializations: string[];
  experienceYears: number;
  bio?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  approvalStatus: "pending" | "approved" | "rejected" | "suspended";
  rejectionReason?: string;
  suspensionReason?: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdvisorRegistrationData {
  fullName: string;
  email: string;
  password: string;
  firmName: string;
  licenseNumber: string;
  mobile?: string;
  specializations?: string[];
  experienceYears?: number;
  bio?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface AdvisorDashboardStats {
  totalActiveClients: number;
  pendingClientRequests: number;
  totalInvestmentsCurrentValue: number;
  totalInvestmentsAmount: number;
  totalOutstandingLoans: number;
  totalClientGoals: number;
  totalClientsAddedThisMonth: number;
  totalClientsAddedLastMonth: number;
  clientGrowthPercentage: number;
}

export interface AdvisorClient {
  relationshipId: string;
  clientId: string | null;
  fullName: string;
  email: string;
  mobile?: string;
  profilePicture?: string;
  isProfileComplete?: boolean;
  city?: string;
  state?: string;
  country?: string;
  onboardedAt?: string | null;
  connectedSince?: string;
  status: string;
  totalInvestments: number;
  totalLoans: number;
  goalsCount: number;
}

export interface AdvisorClientListResponse {
  clients: AdvisorClient[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ClientExpenseItem {
  id: string | null;
  category: string;
  amount: number;
  frequency: string;
  isRecurring: boolean;
}

export interface ClientInvestmentItem {
  id: string | null;
  type: string;
  name: string;
  investedAmount: number;
  currentValue: number;
  returnPct: number;
}

export interface ClientGoalItem {
  id: string | null;
  name: string;
  category: string;
  targetAmount: number;
  currentSavings: number;
  targetDate?: string | null;
  priority: string;
}

export interface ClientLoanItem {
  id: string | null;
  type: string;
  lender: string;
  outstandingAmount: number;
  emi: number;
  interestRate: number;
  tenureMonths: number;
}

export interface AdvisorClientDetail {
  client: {
    id: string;
    fullName: string;
    profilePicture?: string;
    email: string;
    mobile?: string;
    dob?: string | null;
    gender?: string | null;
    occupation?: string;
    maritalStatus?: string | null;
    dependents?: number;
    location?: {
      city?: string;
      state?: string;
      country?: string;
    };
    income?: {
      monthly: number;
      source: string;
      additionalMonthly: number;
      annualGrowthPct: number;
    };
    riskProfile?: {
      tolerance?: string | null;
      experience?: string | null;
      timeHorizonYears?: number | null;
      investmentStyle?: string | null;
    };
    expenses: ClientExpenseItem[];
    investments: ClientInvestmentItem[];
    goals: ClientGoalItem[];
    loans: ClientLoanItem[];
  };
  relationship: {
    relationshipId: string;
    status: string;
    connectedSince?: string;
  };
}

export interface AdvisorRelationship {
  id: string;
  advisorId: string;
  userId?: string | null;
  clientEmail: string;
  status: "invited" | "pending_user_acceptance" | "active" | "rejected" | "suspended" | "terminated" | "reassigned";
  initiatedBy?: "advisor" | "user" | "admin";
  notes?: string;
  rejectionReason?: string;
  terminationReason?: string;
  acceptedAt?: string | null;
  terminatedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdvisorInvitation {
  relationshipId: string;
  clientEmail: string;
  status: "invited";
  expiresAt: string;
}

export interface AdvisorConnectionRequest {
  relationshipId: string;
  userId: string;
  status: "pending_user_acceptance";
  requestedAt: string;
}

export interface UserAdvisorRequest {
  requestId: string;
  advisor: {
    id: string;
    fullName: string;
    firmName: string;
    licenseNumber: string;
    profilePicture?: string;
    specializations: string[];
  };
  status: string;
  notes?: string;
  requestedAt: string;
}

// ── Advisor Auth API ──────────────────────────────────────────────────────────
export const advisorAuthAPI = {
  registerAdvisor: (data: AdvisorRegistrationData) =>
    apiFetch<{ advisorId: string; email: string; approvalStatus: string; isEmailVerified: boolean }>(
      "/advisor/auth/register",
      { method: "POST", body: JSON.stringify(data) }
    ),

  verifyRegistrationOTP: (email: string, otp: string) =>
    apiFetch<{ advisorId: string; email: string; isEmailVerified: boolean; approvalStatus: string }>(
      "/advisor/auth/verify-otp",
      { method: "POST", body: JSON.stringify({ email, otp }) }
    ),

  resendRegistrationOTP: (email: string) =>
    apiFetch<Record<string, never>>("/advisor/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  login: (email: string, password: string) =>
    apiFetch<{ email: string; requiresOTP: boolean }>("/advisor/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  verifyLoginOTP: (email: string, otp: string) =>
    apiFetch<{ advisor: AdvisorProfile; isProfileComplete: boolean }>(
      "/advisor/auth/verify-login-otp",
      { method: "POST", body: JSON.stringify({ email, otp }) }
    ),

  me: () => apiFetch<{ advisor: AdvisorProfile }>("/advisor/auth/me"),

  logout: () => apiFetch<Record<string, never>>("/advisor/auth/logout", { method: "POST" }),
};

// ── Advisor Portal API ────────────────────────────────────────────────────────
export const advisorAPI = {
  getDashboardStats: () =>
    apiFetch<AdvisorDashboardStats>("/advisor/dashboard/stats"),

  getClients: (params?: { page?: number; limit?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.search?.trim()) q.set("search", params.search.trim());
    const qs = q.toString();
    return apiFetch<AdvisorClientListResponse>(`/advisor/clients${qs ? `?${qs}` : ""}`);
  },

  getClient: (clientId: string) =>
    apiFetch<AdvisorClientDetail>(`/advisor/clients/${encodeURIComponent(clientId)}`),

  sendInvitation: (data: { clientEmail: string; clientName?: string; notes?: string }) =>
    apiFetch<AdvisorInvitation>("/advisor/invitations", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  sendConnectionRequest: (data: { userEmail: string; notes?: string }) =>
    apiFetch<AdvisorConnectionRequest>("/advisor/requests", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export interface ActiveAdvisorRelationship {
  relationshipId: string;
  status: string;
  connectedSince: string;
  notes?: string;
  advisor: {
    id: string;
    fullName: string;
    firmName: string;
    licenseNumber?: string;
    specializations: string[];
    profilePicture?: string;
    email?: string;
  };
}

// ── User Advisor Management API ───────────────────────────────────────────────
export const userAdvisorAPI = {
  getActiveAdvisor: () =>
    apiFetch<{
      hasActiveAdvisor: boolean;
      relationship: ActiveAdvisorRelationship | null;
    }>("/user/advisor/active"),

  claimInvite: (token: string) =>
    apiFetch<{
      relationshipId: string;
      advisor: {
        id: string;
        fullName: string;
        firmName: string;
        specializations: string[];
        profilePicture?: string;
      };
      status: string;
      connectedSince: string;
    }>("/user/advisor/claim-invite", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  getRequests: () =>
    apiFetch<{ requests: UserAdvisorRequest[]; count: number }>("/user/advisor/requests"),

  acceptRequest: (requestId: string) =>
    apiFetch<{
      relationshipId: string;
      advisor: {
        id: string;
        fullName: string;
        firmName: string;
        specializations: string[];
        profilePicture?: string;
      };
      status: string;
      connectedSince: string;
    }>(`/user/advisor/requests/${encodeURIComponent(requestId)}/accept`, {
      method: "POST",
    }),

  rejectRequest: (requestId: string, rejectionReason?: string) =>
    apiFetch<{
      relationshipId: string;
      status: string;
      rejectedAt: string;
    }>(`/user/advisor/requests/${encodeURIComponent(requestId)}/reject`, {
      method: "POST",
      body: JSON.stringify(rejectionReason ? { rejectionReason } : {}),
    }),

  terminateAdvisor: (reason?: string) =>
    apiFetch<{
      relationshipId: string;
      advisor: {
        id: string;
        fullName: string;
        firmName: string;
      };
      status: string;
      terminatedAt: string;
    }>("/user/advisor/terminate", {
      method: "POST",
      body: JSON.stringify(reason ? { reason } : {}),
    }),
};

// ── Notification API ──────────────────────────────────────────────────────────
export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  readAt?: string | null;
  expiresAt?: string;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: AppNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount: number;
}

export const notificationAPI = {
  getAll: (params?: { page?: number; limit?: number; unreadOnly?: boolean }, signal?: AbortSignal) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.unreadOnly) q.set("unreadOnly", "true");
    const qs = q.toString();
    return apiFetch<NotificationListResponse>(`/notifications${qs ? `?${qs}` : ""}`, { signal });
  },

  getUnreadCount: (signal?: AbortSignal) =>
    apiFetch<{ count: number }>("/notifications/unread-count", { signal }),

  markAsRead: (notificationId: string) =>
    apiFetch<{ success: boolean }>(`/notifications/${encodeURIComponent(notificationId)}/read`, { method: "PATCH" }),

  markAllAsRead: () =>
    apiFetch<{ success: boolean; markedCount: number }>("/notifications/read-all", { method: "PATCH" }),
};