// src/app/auth/authService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real auth service — all operations call the backend API.
// ─────────────────────────────────────────────────────────────────────────────

import { authAPI, adminAPI, tokenStore } from "../services/api";

// ── Types ─────────────────────────────────────────────────────────────────────
export type UserRole = "user" | "admin";

export interface AuthUser {
  id:                string;
  fullName:          string;
  email:             string;
  mobile?:           string;
  profilePicture?:   string;
  provider:          "email" | "google";
  role:              UserRole;
  isEmailVerified:   boolean;
  isProfileComplete: boolean;
  createdAt:         string;
  income?: {
    monthly:           number;
    source?:           string;
    additionalMonthly: number;
    annualGrowthPct:   number;
  };
  riskProfile?: {
    tolerance?:        string;
    experience?:       string;
    timeHorizonYears?: number;
    investmentStyle?:  string;
  };
}

export interface AuthToken {
  accessToken: string;
  expiresAt:   number;
  role:        UserRole;
}

export interface AuthSession {
  user:     AuthUser;
  token:    AuthToken;
  remember: boolean; // FIX: persisted so updateUser can re-use it
}

// ── Storage keys ──────────────────────────────────────────────────────────────
const STORAGE_KEY = "sf_session";
const ADMIN_KEY   = "sf_admin_session";

// ── Session persistence ───────────────────────────────────────────────────────

// FIX: honour the remember flag — write to localStorage when true, sessionStorage when false.
//      Previously this always wrote to sessionStorage regardless of the flag.
export function storeSession(session: AuthSession, remember: boolean) {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...session, remember }));
  tokenStore.set(session.token.accessToken, remember);
}

export function storeAdminSession(session: AuthSession, remember: boolean) {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(ADMIN_KEY, JSON.stringify({ ...session, remember }));
  tokenStore.set(session.token.accessToken, remember);
}

export function getStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s: AuthSession = JSON.parse(raw);
    if (s.token.expiresAt < Date.now()) { clearSession(); return null; }
    return s;
  } catch { return null; }
}

export function getStoredAdminSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(ADMIN_KEY) || sessionStorage.getItem(ADMIN_KEY);
    if (!raw) return null;
    const s: AuthSession = JSON.parse(raw);
    if (s.token.expiresAt < Date.now()) { clearAdminSession(); return null; }
    return s;
  } catch { return null; }
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  tokenStore.clear();
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_KEY);
  sessionStorage.removeItem(ADMIN_KEY);
}

export async function logout(): Promise<void> {
  try {
    await authAPI.logout();
  } catch { /* ignore — clear client session regardless */ }
  clearSession();
}
export function adminLogout() { clearAdminSession(); }

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse the `exp` claim from a real JWT to get a JS timestamp. */
export function parseJWTExpiry(jwt: string): number {
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1]));
    return (payload.exp || 0) * 1000;
  } catch {
    return Date.now() + 30 * 24 * 60 * 60 * 1000; // fallback: 30 days
  }
}

function buildSession(token: string, user: AuthUser, remember: boolean): AuthSession {
  return {
    user,
    remember,
    token: {
      accessToken: token,
      expiresAt:   parseJWTExpiry(token), // FIX: always derive from real JWT — not hardcoded
      role:        user.role,
    },
  };
}

/**
 * FIX: Helper used by AuthCallback after exchanging a Google OAuth code for a JWT.
 * Fetches /auth/me to get the user profile, then builds a proper session object.
 */
export async function buildSessionFromToken(token: string): Promise<AuthSession> {
  tokenStore.set(token, false); // temporary — storeSession will persist correctly later
  const res  = await (authAPI.me() as any);
  const user = res.data?.user as AuthUser;
  if (!user) throw new Error("No user returned from /auth/me");
  return buildSession(token, user, false);
}

// ── Validation ────────────────────────────────────────────────────────────────
export function validateEmail(email: string): string | null {
  if (!email) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  return null;
}
export function validatePassword(pw: string): string | null {
  if (!pw) return "Password is required.";
  if (pw.length < 8) return "Password must be at least 8 characters.";
  return null;
}
export function validateOTP(otp: string): string | null {
  if (!otp) return "OTP is required.";
  if (!/^\d{6}$/.test(otp)) return "OTP must be exactly 6 digits.";
  return null;
}

// ── Result types ──────────────────────────────────────────────────────────────
export interface LoginResult {
  success:      boolean;
  error?:       string;
  requiresOTP?: boolean;
  session?:     AuthSession;
}

// ── User Auth ─────────────────────────────────────────────────────────────────

export async function loginWithCredentials(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    await authAPI.login({ email, password });
    return { success: true, requiresOTP: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Login failed." };
  }
}

export async function verifyOTP(
  email: string,
  otp: string,
  remember: boolean
): Promise<LoginResult> {
  try {
    const res = await authAPI.verifyOTP({ email, otp }) as any;
    const { token, user } = res.data;
    const session = buildSession(token, user as AuthUser, remember);
    storeSession(session, remember);
    return { success: true, session };
  } catch (err: any) {
    return { success: false, error: err.message || "OTP verification failed." };
  }
}

export async function resendOTP(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await authAPI.resendOTP(email);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to resend OTP." };
  }
}

export function loginWithGoogle(): void {
  window.location.href = authAPI.googleLoginURL();
}

export async function registerUser(
  fullName: string,
  email: string,
  mobile: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await authAPI.signup({ fullName, email, mobile, password });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Registration failed." };
  }
}

// ── Admin Auth ────────────────────────────────────────────────────────────────
export async function adminLogin(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    const res = await adminAPI.login({ email, password }) as any;
    const { token, admin } = res.data;
    const session = buildSession(token, { ...admin, role: "admin" } as AuthUser, true);
    storeAdminSession(session, true);
    return { success: true, session };
  } catch (err: any) {
    return { success: false, error: err.message || "Admin login failed." };
  }
}
