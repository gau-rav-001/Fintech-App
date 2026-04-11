// src/app/auth/authService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real auth service — all operations call the backend API.
// No more mock DB, fake tokens, or plaintext passwords in localStorage.
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
  // Financial profile (populated after onboarding)
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
  accessToken: string;   // real JWT from backend
  expiresAt:   number;   // client-side expiry hint (from JWT exp claim)
  role:        UserRole;
}

export interface AuthSession {
  user:  AuthUser;
  token: AuthToken;
}

// ── Storage keys ──────────────────────────────────────────────────────────────
// ✅ FIX: unified key — authService and api.ts both use "sf_jwt"
const STORAGE_KEY = "sf_session";
const ADMIN_KEY   = "sf_admin_session";

// ── Session persistence ───────────────────────────────────────────────────────
export function storeSession(session: AuthSession, _remember: boolean) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  tokenStore.set(session.token.accessToken);
}

export function storeAdminSession(session: AuthSession, remember: boolean) {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(ADMIN_KEY, JSON.stringify(session));
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
    await authAPI.logout(); // tells server to revoke the token
  } catch { /* ignore — clear client session regardless */ }
  clearSession();
}
export function adminLogout() { clearAdminSession(); }

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse the `exp` claim from a real JWT to get a JS timestamp. */
function parseJWTExpiry(jwt: string): number {
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1]));
    return (payload.exp || 0) * 1000; // JWT exp is in seconds
  } catch {
    return Date.now() + 30 * 24 * 60 * 60 * 1000; // fallback: 30 days
  }
}

function buildSession(token: string, user: AuthUser): AuthSession {
  return {
    user,
    token: {
      accessToken: token,
      expiresAt:   parseJWTExpiry(token),
      role:        user.role,
    },
  };
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

// ── User Auth — all calls go to the real backend ──────────────────────────────

/**
 * Step 1 of login: validate credentials, backend sends OTP to email.
 * ✅ FIX: no fake token, no plaintext password, no console.info(otp)
 */
export async function loginWithCredentials(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    await authAPI.login({ email, password });
    // Backend returns { requiresOTP: true } — OTP was emailed, not logged here
    return { success: true, requiresOTP: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Login failed." };
  }
}

/**
 * Step 2 of login: submit OTP. Backend returns real JWT on success.
 * ✅ FIX: real JWT stored, not a fake "mock_sig" token
 */
export async function verifyOTP(
  email: string,
  otp: string,
  remember: boolean
): Promise<LoginResult> {
  try {
    const res = await authAPI.verifyOTP({ email, otp }) as any;
    const { token, user } = res.data;
    const session = buildSession(token, user as AuthUser);
    storeSession(session, remember);
    return { success: true, session };
  } catch (err: any) {
    return { success: false, error: err.message || "OTP verification failed." };
  }
}

/** Resend OTP — backend generates and emails a fresh code. */
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

/**
 * Google OAuth — redirects the browser to the backend OAuth flow.
 * The backend redirects back to /auth/callback with a real JWT in the URL.
 */
export function loginWithGoogle(): void {
  window.location.href = authAPI.googleLoginURL();
}

/**
 * Register a new user account.
 * Backend creates the user and sends an OTP email automatically.
 */
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
    const session = buildSession(token, { ...admin, role: "admin" } as AuthUser);
    storeAdminSession(session, true);
    return { success: true, session };
  } catch (err: any) {
    return { success: false, error: err.message || "Admin login failed." };
  }
}