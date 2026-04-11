// ── SmartFinance API client ────────────────────────────────────────────────────
// Place at:  src/app/services/api.ts
// Add to frontend .env:  VITE_API_URL=http://localhost:5000/api

const BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:5000/api";

// ── Token storage ─────────────────────────────────────────────────────────────
export const tokenStore = {
  get:   () => sessionStorage.getItem("sf_jwt"),
  set:   (t: string, _remember = true) => sessionStorage.setItem("sf_jwt", t),
  clear: () => sessionStorage.removeItem("sf_jwt"),
};
// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; message: string; data: T }> {
  const token   = tokenStore.get();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res  = await fetch(`${BASE}${path}`, { ...options, headers });
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

  me:     () => apiFetch("/auth/me"),
  logout: () => apiFetch("/auth/logout", { method: "POST" }),

  /** Redirect browser to this URL to start Google OAuth */
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
  getAll: (type?: "webinar" | "news" | "video") =>
    apiFetch(`/content${type ? `?type=${type}` : ""}`),
};

// ── Admin API ─────────────────────────────────────────────────────────────────
export const adminAPI = {
  login: (body: { email: string; password: string }) =>
    apiFetch("/admin/login", { method: "POST", body: JSON.stringify(body) }),

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
  getContent:    ()           => apiFetch("/admin/content"),

  createContent: (data: Record<string, unknown>) =>
    apiFetch("/admin/content", { method: "POST", body: JSON.stringify(data) }),

  updateContent: (id: string, data: Record<string, unknown>) =>
    apiFetch(`/admin/content/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteContent: (id: string) =>
    apiFetch(`/admin/content/${id}`, { method: "DELETE" }),
};
