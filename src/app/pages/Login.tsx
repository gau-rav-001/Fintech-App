// Frontend/src/app/pages/Login.tsx
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import {
  Mail, Lock, ArrowRight, Eye, EyeOff,
  RefreshCw, ShieldCheck, AlertCircle, CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../auth/AuthContext";
import {
  loginWithCredentials,
  verifyOTP,
  resendOTP,
  loginWithGoogle,
  validateEmail,
  validatePassword,
  validateOTP,
  type AuthSession,
} from "../auth/authService";
import { hasCompletedOnboarding } from "../data/userProfile";

type LoginPhase = "credentials" | "otp" | "success";

export function Login() {
  const navigate      = useNavigate();
  const location      = useLocation();
  const [searchParams] = useSearchParams();        // ✅ FIX: read post-signup params
  const { setSession } = useAuth();

  const from = (location.state as { from?: string })?.from ?? "/dashboard";

  const [email,     setEmail]    = useState("");
  const [password,  setPassword] = useState("");
  const [showPw,    setShowPw]   = useState(false);
  const [remember,  setRemember] = useState(false);
  const [otp,       setOTP]      = useState(["", "", "", "", "", ""]);

  const [phase,      setPhase]      = useState<LoginPhase>("credentials");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [success,    setSuccess]    = useState<string | null>(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [otpError,   setOtpError]   = useState<string | null>(null);

  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [pwErr,    setPwErr]    = useState<string | null>(null);

  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpInputRefs  = useRef<(HTMLInputElement | null)[]>([]);

  // ✅ FIX: if coming from Signup page after registration, jump straight to OTP step
  useEffect(() => {
    const preEmail = searchParams.get("email");
    const verify   = searchParams.get("verify");
    if (verify === "1" && preEmail) {
      setEmail(preEmail);
      setSuccess(`Account created! OTP sent to ${preEmail}. Check your inbox.`);
      setTimeout(() => { setSuccess(null); setPhase("otp"); }, 2000);
    }
  }, []);

  useEffect(() => {
    if (phase === "otp") {
      setTimeout(() => otpInputRefs.current[0]?.focus(), 80);
      startCooldown();
    }
  }, [phase]);

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  function startCooldown() {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  function handleSessionReady(session: AuthSession) {
    setSession(session, remember);
    setPhase("success");
    const destination = hasCompletedOnboarding(session.user.id)
      ? (from === "/login" ? "/dashboard" : from)
      : "/onboarding";
    setTimeout(() => navigate(destination, { replace: true }), 1000);
  }

  // ── Step 1: Credentials ───────────────────────────────────────────────────
  async function handleCredentialSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailErr(eErr);
    setPwErr(pErr);
    if (eErr || pErr) return;

    setLoading(true);
    try {
      const result = await loginWithCredentials(email, password);
      if (!result.success) {
        setError(result.error ?? "Login failed. Please try again.");
      } else {
        setSuccess(`OTP sent to ${email}. Check your inbox.`);
        setTimeout(() => { setSuccess(null); setPhase("otp"); }, 2000);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: OTP ───────────────────────────────────────────────────────────
  function handleOTPChange(index: number, val: string) {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[index] = val.slice(-1);
    setOTP(next);
    setOtpError(null);
    if (val && index < 5) otpInputRefs.current[index + 1]?.focus();
  }

  function handleOTPKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0)
      otpInputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowLeft"  && index > 0) otpInputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) otpInputRefs.current[index + 1]?.focus();
  }

  function handleOTPPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) { setOTP(pasted.split("")); otpInputRefs.current[5]?.focus(); }
  }

  async function handleOTPSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join("");
    const err  = validateOTP(code);
    if (err) { setOtpError(err); return; }
    setLoading(true);
    setOtpError(null);
    try {
      const result = await verifyOTP(email, code, remember);
      if (!result.success) {
        setOtpError(result.error ?? "Incorrect OTP.");
        setOTP(["", "", "", "", "", ""]);
        otpInputRefs.current[0]?.focus();
      } else if (result.session) {
        handleSessionReady(result.session);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOTP() {
    if (resendCooldown > 0) return;
    setLoading(true);
    setOtpError(null);
    try {
      await resendOTP(email);
      setSuccess("New OTP sent! Check your email inbox.");
      setTimeout(() => setSuccess(null), 3000);
      startCooldown();
    } finally {
      setLoading(false);
    }
  }

  // ── Google Sign-In ────────────────────────────────────────────────────────
  // ✅ FIX: loginWithGoogle() now does window.location.href redirect — it
  //         does NOT return a value. Removed the old await + result pattern
  //         that was crashing with "Cannot read properties of undefined".
  function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    loginWithGoogle(); // redirects browser — page navigation takes over
    // setLoading(false) is intentionally omitted: page will navigate away
  }

  const inputCls = (hasError: boolean) =>
    `w-full pl-12 pr-4 py-3 border ${
      hasError ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-[#1A5F3D]"
    } rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F9FB] via-white to-[#F7F9FB] flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">

        {/* ── Left — Branding ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }} className="hidden lg:block"
        >
          <Link to="/" className="inline-flex items-center space-x-2 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center">
              <span className="text-white font-bold text-xl">SF</span>
            </div>
            <span className="font-bold text-2xl text-gray-900">SmartFinance</span>
          </Link>

          <h1 className="text-5xl font-bold text-gray-900 mb-6">Welcome Back!</h1>
          <p className="text-xl text-gray-600 mb-8">Continue your journey towards financial freedom</p>

          <div className="space-y-4">
            <FeatureItem text="Track your investments in real-time" />
            <FeatureItem text="Access personalized recommendations" />
            <FeatureItem text="Manage your portfolio efficiently" />
          </div>

          <div className="mt-10 p-4 rounded-2xl border border-[#d7eadf] bg-[#f3faf6]">
            <p className="text-xs font-semibold text-[#1A5F3D] mb-1">🔑 Demo Account</p>
            <p className="text-xs text-gray-600">Email: <span className="font-mono font-semibold">demo@smartfinance.in</span></p>
            <p className="text-xs text-gray-600">Password: <span className="font-mono font-semibold">demo1234</span></p>
            <p className="text-xs text-gray-500 mt-1">OTP will be sent to your registered email</p>
          </div>
        </motion.div>

        {/* ── Right — Auth Card ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-3xl shadow-2xl p-8 md:p-12"
        >
          <div className="lg:hidden mb-8">
            <Link to="/" className="inline-flex items-center space-x-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center">
                <span className="text-white font-bold text-xl">SF</span>
              </div>
              <span className="font-bold text-xl text-gray-900">SmartFinance</span>
            </Link>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div key="err"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="flex items-start gap-3 mb-6 p-3 rounded-xl bg-red-50 border border-red-200"
              >
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </motion.div>
            )}
            {success && (
              <motion.div key="ok"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="flex items-start gap-3 mb-6 p-3 rounded-xl bg-green-50 border border-green-200"
              >
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-700">{success}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {/* ── Phase: Credentials ── */}
            {phase === "credentials" && (
              <motion.div key="creds"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
              >
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h2>
                <p className="text-gray-600 mb-8">Enter your credentials to access your account</p>

                <button type="button" onClick={handleGoogleLogin} disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all mb-6 disabled:opacity-60"
                >
                  <GoogleIcon />
                  {loading ? "Connecting…" : "Continue with Google"}
                </button>

                <div className="relative flex items-center gap-3 mb-6">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">or sign in with email</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <form onSubmit={handleCredentialSubmit} className="space-y-6" noValidate>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input type="email" value={email}
                        onChange={(e) => { setEmail(e.target.value); setEmailErr(null); setError(null); }}
                        onBlur={() => setEmailErr(validateEmail(email))}
                        className={inputCls(!!emailErr)} placeholder="you@example.com" autoComplete="email" />
                    </div>
                    {emailErr && <p className="mt-1.5 text-xs text-red-500">{emailErr}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input type={showPw ? "text" : "password"} value={password}
                        onChange={(e) => { setPassword(e.target.value); setPwErr(null); setError(null); }}
                        onBlur={() => setPwErr(validatePassword(password))}
                        className={`${inputCls(!!pwErr)} pr-12`} placeholder="••••••••" autoComplete="current-password" />
                      <button type="button" onClick={() => setShowPw((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" tabIndex={-1}>
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {pwErr && <p className="mt-1.5 text-xs text-red-500">{pwErr}</p>}
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                        className="w-4 h-4 text-[#1A5F3D] border-gray-300 rounded focus:ring-[#1A5F3D]" />
                      <span className="text-sm text-gray-600">Remember me</span>
                    </label>
                    <button type="button" onClick={() => setForgotMode(v => !v)}
                      className="text-sm text-[#1A5F3D] hover:underline">
                      Forgot password?
                    </button>
                  </div>

                  {forgotMode && (
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800">
                      <p className="font-semibold mb-1">Reset your password</p>
                      <p>Contact <span className="font-mono font-semibold">support@smartfinance.in</span> with your registered email and we'll send a reset link within 24 hours.</p>
                      <button type="button" onClick={() => setForgotMode(false)}
                        className="mt-2 text-xs text-blue-600 hover:underline">Close</button>
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100">
                    {loading ? <><Spinner /> Verifying…</> : <>Send OTP <ArrowRight className="w-5 h-5" /></>}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-gray-600">
                    Don't have an account?{" "}
                    <Link to="/signup" className="text-[#1A5F3D] font-semibold hover:underline">Sign up</Link>
                  </p>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-200">
                  <p className="text-center text-sm text-gray-500">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── Phase: OTP ── */}
            {phase === "otp" && (
              <motion.div key="otp"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
              >
                <div className="flex items-center justify-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center shadow-lg">
                    <ShieldCheck className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">Verify Your Identity</h2>
                <p className="text-gray-600 mb-2 text-center">We've sent a 6-digit OTP to</p>
                <p className="text-center font-semibold text-[#1A5F3D] mb-8">{email}</p>

                <form onSubmit={handleOTPSubmit} className="space-y-6">
                  <div>
                    <div className="flex gap-3 justify-center" onPaste={handleOTPPaste}>
                      {otp.map((digit, i) => (
                        <input key={i}
                          ref={(el) => { otpInputRefs.current[i] = el; }}
                          type="text" inputMode="numeric" maxLength={1} value={digit}
                          onChange={(e) => handleOTPChange(i, e.target.value)}
                          onKeyDown={(e) => handleOTPKeyDown(i, e)}
                          className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all ${
                            otpError
                              ? "border-red-400 bg-red-50 text-red-700"
                              : digit
                              ? "border-[#1A5F3D] bg-[#f0faf4] text-[#1A5F3D]"
                              : "border-gray-300 hover:border-gray-400 focus:border-[#1A5F3D] focus:ring-2 focus:ring-[#1A5F3D]/20"
                          }`}
                        />
                      ))}
                    </div>
                    {otpError && (
                      <p className="mt-3 text-center text-sm text-red-500 flex items-center justify-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" /> {otpError}
                      </p>
                    )}
                  </div>

                  <p className="text-center text-xs text-gray-400">OTP expires in 5 minutes</p>

                  <button type="submit" disabled={loading || otp.join("").length < 6}
                    className="w-full py-3 bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100">
                    {loading ? <><Spinner /> Verifying…</> : <><ShieldCheck className="w-5 h-5" /> Verify &amp; Sign In</>}
                  </button>

                  <div className="flex items-center justify-center">
                    <button type="button" onClick={handleResendOTP}
                      disabled={loading || resendCooldown > 0}
                      className="flex items-center gap-1.5 text-sm text-[#1A5F3D] hover:underline disabled:text-gray-400 disabled:no-underline transition-colors">
                      <RefreshCw className="w-3.5 h-3.5" />
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                    </button>
                  </div>

                  <button type="button"
                    onClick={() => { setPhase("credentials"); setOTP(["","","","","",""]); setOtpError(null); }}
                    className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors">
                    ← Back to login
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Phase: Success ── */}
            {phase === "success" && (
              <motion.div key="success"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">You're in!</h2>
                <p className="text-gray-600">Redirecting to your dashboard…</p>
                <div className="mt-6 flex justify-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-[#1A5F3D] animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center space-x-3">
      <div className="w-6 h-6 rounded-full bg-[#1A5F3D]/10 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-[#1A5F3D]" />
      </div>
      <span className="text-gray-700">{text}</span>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}