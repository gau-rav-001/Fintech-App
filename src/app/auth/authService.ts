// ─── Auth Service ─────────────────────────────────────────────────────────────

export type UserRole = "user" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  provider: "email" | "google";
  role: UserRole;
  createdAt: string;
  monthlyIncome?: number;
  cityTier?: string;
  riskProfile?: string;
}

export interface AuthToken {
  accessToken: string;
  expiresAt: number;
  role: UserRole;
}

export interface AuthSession {
  user: AuthUser;
  token: AuthToken;
}

// ── Storage keys ──────────────────────────────────────────────────────────────
const STORAGE_KEY   = "sf_session";
const ADMIN_KEY     = "sf_admin_session";
const OTP_KEY       = "sf_otp_store";
const USERS_DB_KEY  = "sf_users_db";
const ADMIN_DB_KEY  = "sf_admin_db";

// ── Helpers ───────────────────────────────────────────────────────────────────
function b64(obj: unknown): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}

function makeToken(userId: string, role: UserRole, remember: boolean): AuthToken {
  const expiresAt   = Date.now() + (remember ? 30 : 1) * 24 * 60 * 60 * 1000;
  const payload     = { sub: userId, role, iat: Date.now(), exp: expiresAt };
  const accessToken = `sfj.${b64({ alg: "HS256" })}.${b64(payload)}.mock_sig`;
  return { accessToken, expiresAt, role };
}

// ── Users DB ──────────────────────────────────────────────────────────────────
type UserRecord = AuthUser & { passwordHash: string };

function usersDB(): Record<string, UserRecord> {
  try { return JSON.parse(localStorage.getItem(USERS_DB_KEY) || "{}"); }
  catch { return {}; }
}
function saveUserRecord(u: UserRecord) {
  const db = usersDB(); db[u.email] = u;
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(db));
}

// ── Admin DB ──────────────────────────────────────────────────────────────────
type AdminRecord = AuthUser & { passwordHash: string };

function adminDB(): Record<string, AdminRecord> {
  try { return JSON.parse(localStorage.getItem(ADMIN_DB_KEY) || "{}"); }
  catch { return {}; }
}
function saveAdminRecord(a: AdminRecord) {
  const db = adminDB(); db[a.email] = a;
  localStorage.setItem(ADMIN_DB_KEY, JSON.stringify(db));
}

// ── Seed accounts ─────────────────────────────────────────────────────────────
(function seed() {
  // Demo user
  const ub = usersDB();
  if (!ub["demo@smartfinance.in"]) {
    saveUserRecord({
      id: "demo_001", name: "Rajesh Kumar", email: "demo@smartfinance.in",
      phone: "+91 98765 43210", provider: "email", role: "user",
      createdAt: new Date().toISOString(),
      monthlyIncome: 75000, cityTier: "tier1", riskProfile: "Moderate",
      passwordHash: "demo1234",
    });
  }
  // Admin
  const ab = adminDB();
  if (!ab["admin@smartfinance.in"]) {
    saveAdminRecord({
      id: "admin_001", name: "Admin User", email: "admin@smartfinance.in",
      phone: "+91 99999 00000", provider: "email", role: "admin",
      createdAt: new Date().toISOString(),
      passwordHash: "admin2024",
    });
  }
})();

// ── Session helpers ───────────────────────────────────────────────────────────
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
export function storeSession(session: AuthSession, remember: boolean) {
  (remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(session));
}
export function storeAdminSession(session: AuthSession, remember: boolean) {
  (remember ? localStorage : sessionStorage).setItem(ADMIN_KEY, JSON.stringify(session));
}
export function clearSession() {
  localStorage.removeItem(STORAGE_KEY); sessionStorage.removeItem(STORAGE_KEY);
}
export function clearAdminSession() {
  localStorage.removeItem(ADMIN_KEY); sessionStorage.removeItem(ADMIN_KEY);
}
export function logout() { clearSession(); }
export function adminLogout() { clearAdminSession(); }

// ── OTP ───────────────────────────────────────────────────────────────────────
interface OTPRecord { code: string; email: string; expiresAt: number; attempts: number; }

function saveOTP(email: string, code: string) {
  sessionStorage.setItem(OTP_KEY, JSON.stringify({
    code, email, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0,
  } as OTPRecord));
}
function getOTPRecord(): OTPRecord | null {
  try { const r = sessionStorage.getItem(OTP_KEY); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function clearOTP() { sessionStorage.removeItem(OTP_KEY); }

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

// ── User Auth ─────────────────────────────────────────────────────────────────
export interface LoginResult {
  success: boolean; error?: string; requiresOTP?: boolean; session?: AuthSession;
}

export async function loginWithCredentials(email: string, password: string): Promise<LoginResult> {
  await delay(800);
  const db = usersDB(); const user = db[email.toLowerCase()];
  if (!user) return { success: false, error: "No account found with this email address." };
  if (user.passwordHash !== password) return { success: false, error: "Incorrect password. Please try again." };
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  saveOTP(email.toLowerCase(), otp);
  console.info(`[SmartFinance] OTP for ${email}: ${otp}`);
  return { success: true, requiresOTP: true };
}

export async function verifyOTP(email: string, otp: string, remember: boolean): Promise<LoginResult> {
  await delay(600);
  const record = getOTPRecord();
  if (!record) return { success: false, error: "OTP expired. Please request a new one." };
  if (record.email !== email.toLowerCase()) return { success: false, error: "OTP mismatch." };
  if (record.expiresAt < Date.now()) { clearOTP(); return { success: false, error: "OTP has expired." }; }
  if (record.attempts >= 3) { clearOTP(); return { success: false, error: "Too many wrong attempts. Request a new OTP." }; }
  record.attempts += 1;
  sessionStorage.setItem(OTP_KEY, JSON.stringify(record));
  if (record.code !== otp.trim()) return { success: false, error: `Incorrect OTP. ${3 - record.attempts} attempt(s) remaining.` };
  clearOTP();
  const db = usersDB(); const user = db[email.toLowerCase()];
  const { passwordHash: _, ...safeUser } = user;
  const token = makeToken(safeUser.id, "user", remember);
  const session: AuthSession = { user: safeUser, token };
  storeSession(session, remember);
  return { success: true, session };
}

export async function resendOTP(email: string): Promise<{ success: boolean; error?: string }> {
  await delay(500);
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  saveOTP(email.toLowerCase(), otp);
  console.info(`[SmartFinance] Resent OTP for ${email}: ${otp}`);
  return { success: true };
}

export async function loginWithGoogle(): Promise<LoginResult> {
  await delay(1200);
  const googleUser: AuthUser = {
    id: `g_${Date.now()}`, name: "Google User", email: "google.user@gmail.com",
    avatar: "", provider: "google", role: "user",
    createdAt: new Date().toISOString(), riskProfile: "Moderate", cityTier: "tier1",
  };
  const db = usersDB();
  if (!db[googleUser.email]) saveUserRecord({ ...googleUser, passwordHash: "" });
  const token = makeToken(googleUser.id, "user", true);
  const session: AuthSession = { user: googleUser, token };
  storeSession(session, true);
  return { success: true, session };
}

export async function registerUser(name: string, email: string, phone: string, password: string): Promise<{ success: boolean; error?: string }> {
  await delay(900);
  const db = usersDB();
  if (db[email.toLowerCase()]) return { success: false, error: "An account with this email already exists." };
  saveUserRecord({
    id: `usr_${Date.now()}`, name, email: email.toLowerCase(), phone, provider: "email",
    role: "user", createdAt: new Date().toISOString(), passwordHash: password,
  });
  return { success: true };
}

// ── Admin Auth ────────────────────────────────────────────────────────────────
export async function adminLogin(email: string, password: string): Promise<LoginResult> {
  await delay(700);
  const db = adminDB(); const admin = db[email.toLowerCase()];
  if (!admin) return { success: false, error: "Invalid admin credentials." };
  if (admin.passwordHash !== password) return { success: false, error: "Incorrect password." };
  const { passwordHash: _, ...safeAdmin } = admin;
  const token = makeToken(safeAdmin.id, "admin", true);
  const session: AuthSession = { user: safeAdmin, token };
  storeAdminSession(session, true);
  return { success: true, session };
}

// ── All users (admin use) ─────────────────────────────────────────────────────
export function getAllUsers(): Omit<UserRecord, "passwordHash">[] {
  const db = usersDB();
  return Object.values(db).map(({ passwordHash: _, ...u }) => u);
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }