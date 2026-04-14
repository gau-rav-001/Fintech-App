// src/app/auth/authService.ts
import { authAPI, adminAPI } from "../services/api";

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

// ── Session restoration ───────────────────────────────────────────────────────
// Tokens live in HttpOnly cookies — call /auth/me to check validity
export async function restoreSession(): Promise<AuthUser | null> {
  try {
    const res = await (authAPI.me() as any);
    return (res.data?.user as AuthUser) ?? null;
  } catch { return null; }
}

export async function restoreAdminSession(): Promise<AuthUser | null> {
  try {
    const res = await (adminAPI.me() as any);
    return (res.data?.admin as AuthUser) ?? null;
  } catch { return null; }
}

// ── Logout ────────────────────────────────────────────────────────────────────
export async function logout(): Promise<void> {
  try { await authAPI.logout(); } catch { /* server clears cookie anyway */ }
}

export async function adminLogout(): Promise<void> {
  try { await adminAPI.logout(); } catch { /* server clears cookie anyway */ }
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
  user?:        AuthUser;
}

// ── User auth ─────────────────────────────────────────────────────────────────
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

// Fix: only 2 params — cookie is set by server, we get user back in body
export async function verifyOTP(
  email: string,
  otp: string
): Promise<LoginResult> {
  try {
    const res  = await authAPI.verifyOTP({ email, otp }) as any;
    const user = res.data?.user as AuthUser;
    return { success: true, user };
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

// ── Google OAuth callback ─────────────────────────────────────────────────────
// Cookie is already set by the server before redirecting here.
// Just call /auth/me to get the user profile.
export async function fetchUserAfterGoogleAuth(): Promise<AuthUser | null> {
  try {
    const res  = await (authAPI.me() as any);
    return (res.data?.user as AuthUser) ?? null;
  } catch { return null; }
}

// ── Admin auth (two-step) ─────────────────────────────────────────────────────
export async function adminLoginStep1(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    await adminAPI.login({ email, password });
    return { success: true, requiresOTP: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Admin login failed." };
  }
}

export async function adminVerifyOTP(
  email: string,
  otp: string
): Promise<LoginResult> {
  try {
    const res  = await adminAPI.verifyOTP({ email, otp }) as any;
    const user = res.data?.admin as AuthUser;
    return { success: true, user };
  } catch (err: any) {
    return { success: false, error: err.message || "OTP verification failed." };
  }
}