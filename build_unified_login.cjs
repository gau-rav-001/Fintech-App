const fs = require('fs');

const content = `import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import {
  Mail, Lock, ArrowRight, Eye, EyeOff,
  RefreshCw, ShieldCheck, AlertCircle, CheckCircle,
  Briefcase, KeyRound, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../auth/AuthContext";
import { useAdvisorAuth } from "../auth/AdvisorAuthContext";
import { authAPI } from "../services/api";
import {
  loginWithCredentials as userLogin,
  verifyOTP as userVerifyOTP,
  resendOTP as userResendOTP,
  loginWithGoogle,
  validateEmail,
  validatePassword,
  validateOTP,
} from "../auth/authService";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "../components/ui/input-otp";

type LoginPhase = "credentials" | "otp" | "success";
type ForgotPhase = "idle" | "enter-email" | "sent";
type RoleTab = "client" | "advisor";

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 text-current" fill="none" viewBox="0 0 24 24">
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

// ── Unified Login Page ──────────────────────────────────────────────────────────
export function Login() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const { isUserAuthenticated, isLoading: userLoading } = useAuth();
  const { isAdvisorAuthenticated, isLoading: advLoading } = useAdvisorAuth();

  const roleParam = searchParams.get("role") as RoleTab | null;
  const activeTab: RoleTab = roleParam === "advisor" ? "advisor" : "client";

  function setRole(role: RoleTab) {
    const newParams = new URLSearchParams(searchParams);
    if (role === "advisor") {
      newParams.set("role", "advisor");
    } else {
      newParams.delete("role");
    }
    setSearchParams(newParams);
  }

  // Route guarding logic natively inside the component
  useEffect(() => {
    if (userLoading || advLoading) return;

    if (activeTab === "client" && isUserAuthenticated) {
      navigate("/dashboard", { replace: true });
    } else if (activeTab === "advisor" && isAdvisorAuthenticated) {
      const from = (location.state as { from?: string })?.from;
      const destination = from && from.startsWith("/advisor") ? from : "/advisor/portal";
      navigate(destination, { replace: true });
    }
  }, [activeTab, isUserAuthenticated, isAdvisorAuthenticated, userLoading, advLoading, navigate, location.state]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0faf4] via-background to-[#e8f5ee] dark:from-background dark:via-background dark:to-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1A5F3D] to-[#0d3b25] flex-col justify-center items-center p-16 text-white transition-colors duration-500">
        <div className="max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-8">
            <span className="text-3xl font-bold">SF</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">
            {activeTab === "client" ? "Welcome back" : "Advisor Portal"}
          </h1>
          <p className="text-white/70 text-lg mb-12">
            {activeTab === "client" 
              ? "Sign in to manage your finances and track your goals."
              : "Access your registered wealth practice & client roster."}
          </p>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
              <span className="text-white/80">Secure OTP-based login</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
              <span className="text-white/80">Your data, always private</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Tab Switcher */}
          <div className="flex p-1 bg-muted/50 rounded-xl mb-8">
            <button 
              onClick={() => setRole("client")} 
              className={\`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all \${activeTab === "client" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}\`}
            >
              Personal / Client
            </button>
            <button 
              onClick={() => setRole("advisor")} 
              className={\`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all \${activeTab === "advisor" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}\`}
            >
              Financial Advisor
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "client" ? (
              <motion.div key="client" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <ClientLoginForm />
              </motion.div>
            ) : (
              <motion.div key="advisor" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <AdvisorLoginForm />
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </div>
  );
}

// ── Client Login Form ──────────────────────────────────────────────────────────
function ClientLoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuth();
  const from = (location.state as { from?: string })?.from ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [otp, setOTP] = useState(["", "", "", "", "", ""]);

  const [phase, setPhase] = useState<LoginPhase>("credentials");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [forgotPhase, setForgotPhase] = useState<ForgotPhase>("idle");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailErr, setForgotEmailErr] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const preEmail = searchParams.get("email");
    const verify = searchParams.get("verify");
    if (verify === "1" && preEmail) {
      setEmail(preEmail);
      setSuccess(\`Account created! OTP sent to \${preEmail}. Check your inbox.\`);
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
      const result = await userLogin(email, password);
      if (!result.success) {
        setError(result.error ?? "Login failed. Please try again.");
      } else {
        setSuccess(\`OTP sent to \${email}. Check your inbox.\`);
        setTimeout(() => { setSuccess(null); setPhase("otp"); }, 1500);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleOTPChange(index: number, val: string) {
    if (!/^\\d*$/.test(val)) return;
    const next = [...otp];
    next[index] = val.slice(-1);
    setOTP(next);
    setOtpError(null);
    if (val && index < 5) otpInputRefs.current[index + 1]?.focus();
  }

  function handleOTPKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0)
      otpInputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowLeft" && index > 0) otpInputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) otpInputRefs.current[index + 1]?.focus();
  }

  function handleOTPPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOTP(pasted.split(""));
      otpInputRefs.current[5]?.focus();
    }
  }

  async function handleOTPSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join("");
    const err = validateOTP(code);
    if (err) { setOtpError(err); return; }

    setLoading(true);
    setOtpError(null);
    try {
      const result = await userVerifyOTP(email, code);
      if (!result.success) {
        setOtpError(result.error ?? "Incorrect OTP.");
        setOTP(["", "", "", "", "", ""]);
        otpInputRefs.current[0]?.focus();
      } else if (result.user) {
        setUser(result.user);
        setPhase("success");
        const destination = result.user.isProfileComplete
          ? (from === "/login" ? "/dashboard" : from)
          : "/onboarding";
        setTimeout(() => navigate(destination, { replace: true }), 1000);
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
      await userResendOTP(email);
      setSuccess("New OTP sent!");
      setTimeout(() => setSuccess(null), 3000);
      startCooldown();
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSubmit() {
    const err = validateEmail(forgotEmail);
    if (err) { setForgotEmailErr(err); return; }
    setForgotLoading(true);
    setForgotError(null);
    try {
      await authAPI.forgotPassword(forgotEmail);
      setForgotPhase("sent");
    } catch (err: any) {
      setForgotError(err.message || "Something went wrong. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  }

  function closeForgot() {
    setForgotPhase("idle");
    setForgotEmail("");
    setForgotEmailErr(null);
    setForgotError(null);
  }

  const inputCls = (hasErr: boolean) =>
    \`w-full pl-12 pr-4 py-3 border rounded-xl text-sm outline-none transition-all bg-card text-foreground \${
      hasErr ? "border-red-400 focus:ring-2 focus:ring-red-300" : "border-border focus:ring-2 focus:ring-primary/30 focus:border-primary"
    }\`;

  return (
    <div>
      {success && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 mb-4 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/40 rounded-xl text-sm text-green-700 dark:text-green-400">
          <CheckCircle className="w-4 h-4 shrink-0" /> {success}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {phase === "credentials" && (
          <motion.div key="credentials" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
            <h2 className="text-3xl font-bold text-foreground mb-2">Sign in</h2>
            <p className="text-muted-foreground mb-8">New here? <Link to="/signup" className="text-primary font-semibold hover:underline">Create an account</Link></p>
            {error && (
              <div className="flex items-start gap-2 mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}
            <button onClick={loginWithGoogle} className="w-full flex items-center justify-center gap-3 py-3 border border-border rounded-xl text-sm font-medium text-foreground/80 hover:bg-muted transition-all mb-6">
              <GoogleIcon /> Continue with Google
            </button>
            <div className="relative flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground/70 font-medium">or sign in with email</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <form onSubmit={handleCredentialSubmit} className="space-y-5" noValidate>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailErr(null); setError(null); }} onBlur={() => setEmailErr(validateEmail(email))} className={inputCls(!!emailErr)} placeholder="you@example.com" autoComplete="email" />
                </div>
                {emailErr && <p className="mt-1.5 text-xs text-red-500">{emailErr}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input type={showPw ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setPwErr(null); setError(null); }} onBlur={() => setPwErr(validatePassword(password))} className={\`\${inputCls(!!pwErr)} pr-12\`} placeholder="••••••••" autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPw((v) => !v)} tabIndex={-1} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {pwErr && <p className="mt-1.5 text-xs text-red-500">{pwErr}</p>}
              </div>
              <div className="flex items-center justify-between">
                <span />
                <button type="button" onClick={() => { setForgotPhase("enter-email"); setForgotEmail(email); }} className="text-sm text-primary hover:underline">Forgot password?</button>
              </div>
              <AnimatePresence>
                {forgotPhase !== "idle" && (
                  <motion.div key="forgot-panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                    <div className="p-4 rounded-xl bg-[#f0faf4] dark:bg-primary/10 border border-primary/20">
                      {forgotPhase === "enter-email" && (
                        <div>
                          <p className="text-sm font-semibold text-foreground/90 mb-1">Reset your password</p>
                          <p className="text-xs text-muted-foreground mb-3">Enter your email and we'll send a secure reset link valid for 15 minutes.</p>
                          {forgotError && (
                            <div className="flex items-center gap-2 mb-3 p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg">
                              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              <p className="text-xs text-red-600 dark:text-red-400">{forgotError}</p>
                            </div>
                          )}
                          <div className="relative mb-2">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input type="email" value={forgotEmail} onChange={(e) => { setForgotEmail(e.target.value); setForgotEmailErr(null); }} onBlur={() => setForgotEmailErr(validateEmail(forgotEmail))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleForgotSubmit(); } }} placeholder="your@email.com" className={\`w-full pl-9 pr-3 py-2 text-sm border rounded-lg outline-none transition-all bg-card text-foreground \${forgotEmailErr ? "border-red-400 focus:ring-1 focus:ring-red-300" : "border-border focus:ring-1 focus:ring-primary/40 focus:border-primary"}\`} autoComplete="email" />
                          </div>
                          {forgotEmailErr && <p className="mb-2 text-xs text-red-500">{forgotEmailErr}</p>}
                          <div className="flex gap-2 mt-3">
                            <button type="button" onClick={handleForgotSubmit} disabled={forgotLoading} className="flex-1 py-2 bg-gradient-to-r from-primary to-[#2D7A4E] text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-70 transition-all hover:shadow-md">
                              {forgotLoading ? <><Spinner /><span className="ml-1 text-white">Sending...</span></> : <>Send Reset Link <ArrowRight className="w-3.5 h-3.5" /></>}
                            </button>
                            <button type="button" onClick={closeForgot} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg bg-card transition-colors">Cancel</button>
                          </div>
                        </div>
                      )}
                      {forgotPhase === "sent" && (
                        <div className="text-center py-2">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                            <CheckCircle className="w-5 h-5 text-primary" />
                          </div>
                          <p className="text-sm font-semibold text-foreground/90 mb-1">Check your inbox</p>
                          <p className="text-xs text-muted-foreground mb-3">If <span className="font-medium text-foreground/80">{forgotEmail}</span> is registered, you'll receive a reset link shortly.</p>
                          <button type="button" onClick={closeForgot} className="text-xs text-primary hover:underline">Back to sign in</button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-primary to-[#2D7A4E] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100">
                {loading ? <><Spinner /><span className="ml-2 text-white">Sending OTP...</span></> : <>Send OTP <ArrowRight className="w-5 h-5" /></>}
              </button>
            </form>
          </motion.div>
        )}
        {phase === "otp" && (
          <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-[#3FAF7D] flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-2 text-center">Verify Your Identity</h2>
            <p className="text-muted-foreground mb-1 text-center">We've sent a 6-digit code to</p>
            <p className="text-center font-semibold text-primary mb-8">{email}</p>
            <form onSubmit={handleOTPSubmit} className="space-y-6">
              <div>
                <div className="flex gap-3 justify-center" onPaste={handleOTPPaste}>
                  {otp.map((digit, i) => (
                    <input key={i} ref={(el) => { otpInputRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleOTPChange(i, e.target.value)} onKeyDown={(e) => handleOTPKeyDown(i, e)} className={\`w-12 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all \${otpError ? "border-red-400 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400" : digit ? "border-primary bg-[#f0faf4] dark:bg-primary/10 text-primary" : "border-border hover:border-muted-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/20 bg-card text-foreground"}\`} />
                  ))}
                </div>
                {otpError && (
                  <p className="mt-3 text-center text-sm text-red-500 flex items-center justify-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> {otpError}</p>
                )}
              </div>
              <p className="text-center text-xs text-muted-foreground/70">Code expires in 5 minutes</p>
              <button type="submit" disabled={loading || otp.join("").length < 6} className="w-full py-3 bg-gradient-to-r from-primary to-[#2D7A4E] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100">
                {loading ? <><Spinner /><span className="text-white ml-2">Verifying...</span></> : <><ShieldCheck className="w-5 h-5" /> Verify &amp; Sign In</>}
              </button>
              <div className="flex items-center justify-center">
                <button type="button" onClick={handleResendOTP} disabled={loading || resendCooldown > 0} className="flex items-center gap-1.5 text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />
                  {resendCooldown > 0 ? \`Resend in \${resendCooldown}s\` : "Resend OTP"}
                </button>
              </div>
              <button type="button" onClick={() => { setPhase("credentials"); setOTP(["","","","","",""]); setOtpError(null); }} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">← Back to login</button>
            </form>
          </motion.div>
        )}
        {phase === "success" && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-[#3FAF7D] flex items-center justify-center mx-auto mb-6 shadow-xl">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-2">You're in!</h2>
            <p className="text-muted-foreground">Redirecting to your dashboard...</p>
            <div className="mt-6 flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: \`\${i * 0.15}s\` }} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Advisor Login Form ─────────────────────────────────────────────────────────
function AdvisorLoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithCredentials, verifyLoginOTP } = useAdvisorAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const inputClass = "w-full pl-12 pr-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all bg-card text-foreground border-border";

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) { setError("Email address is required."); return; }
    if (!password) { setError("Password is required."); return; }

    setLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      const data = await loginWithCredentials(cleanEmail, password);
      if (data?.requiresOTP) { setStep(2); }
    } catch (err: any) {
      const serverMsg = err.data?.message || err.message || "Failed to log in.";
      const code = err.data?.errors?.code || err.data?.code || null;
      setError(serverMsg);
      setErrorCode(code);
    } finally {
      setLoading(false);
    }
  }

  async function handleOTPSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) { setError("Please enter the complete 6-digit verification code."); return; }

    setLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      await verifyLoginOTP(email.trim(), otp);
      const from = (location.state as { from?: string })?.from;
      const destination = from && from.startsWith("/advisor") ? from : "/advisor/portal";
      navigate(destination, { replace: true });
    } catch (err: any) {
      const serverMsg = err.data?.message || err.message || "Verification failed.";
      const code = err.data?.errors?.code || err.data?.code || null;
      setError(serverMsg);
      setErrorCode(code);
      setOtp("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-foreground mb-2">Advisor Sign In</h2>
        <p className="text-muted-foreground mb-4">
          Access your registered wealth practice & client roster
        </p>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2.5 mb-5 p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl text-red-800 dark:text-red-400">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div className="text-xs leading-relaxed">
            <p className="font-semibold">{error}</p>
            {errorCode === "EMAIL_NOT_VERIFIED" && (
              <p className="mt-1 text-red-700 dark:text-red-400">Need to verify your email? Check your registration confirmation email or contact support.</p>
            )}
            {errorCode === "ADVISOR_PENDING" && (
              <p className="mt-1 text-red-700 dark:text-red-400">Your credentials (SEBI/AMFI) are currently being reviewed by compliance. You will receive an email once approved.</p>
            )}
            {errorCode === "ADVISOR_SUSPENDED" && (
              <p className="mt-1 text-red-700 dark:text-red-400">Please contact platform compliance to resolve the account restriction.</p>
            )}
          </div>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.form key="step1" initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.2 }} onSubmit={handleCredentialsSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Professional Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} className={inputClass} placeholder="advisor@advisoryfirm.com" autoComplete="email" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input type={showPw ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} className={\`\${inputClass} pr-12\`} placeholder="••••••••" autoComplete="current-password" required />
                <button type="button" onClick={() => setShowPw((v) => !v)} tabIndex={-1} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-primary to-[#2D7A4E] text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 mt-4">
              {loading ? <><Spinner /><span className="text-white ml-2">Verifying Credentials...</span></> : <>Continue <ArrowRight className="w-4 h-4" /></>}
            </button>
          </motion.form>
        )}
        {step === 2 && (
          <motion.form key="step2" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14 }} transition={{ duration: 0.2 }} onSubmit={handleOTPSubmit} className="space-y-5" noValidate>
            <div className="p-3.5 rounded-xl bg-green-50/70 dark:bg-green-950/30 border border-green-200/70 text-xs text-primary">
              <div className="flex items-center gap-1.5 font-semibold mb-1">
                <CheckCircle2 className="w-4 h-4" /> Two-Factor Code Dispatched
              </div>
              <p className="text-muted-foreground">A secure 6-digit sign-in code has been sent to your registered inbox. Valid for 10 minutes.</p>
            </div>
            <div className="flex flex-col items-center justify-center gap-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Enter 6-Digit Authentication Code</label>
              <div className="py-2">
                <InputOTP maxLength={6} value={otp} onChange={(val) => { setOtp(val.replace(/\\D/g, "")); setError(null); }} autoFocus>
                  <InputOTPGroup className="gap-2">
                    <InputOTPSlot index={0} className="w-11 h-12 text-base font-semibold border-border bg-card text-foreground" />
                    <InputOTPSlot index={1} className="w-11 h-12 text-base font-semibold border-border bg-card text-foreground" />
                    <InputOTPSlot index={2} className="w-11 h-12 text-base font-semibold border-border bg-card text-foreground" />
                    <InputOTPSlot index={3} className="w-11 h-12 text-base font-semibold border-border bg-card text-foreground" />
                    <InputOTPSlot index={4} className="w-11 h-12 text-base font-semibold border-border bg-card text-foreground" />
                    <InputOTPSlot index={5} className="w-11 h-12 text-base font-semibold border-border bg-card text-foreground" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            <button type="submit" disabled={loading || otp.length < 6} className="w-full py-3.5 bg-gradient-to-r from-primary to-[#2D7A4E] text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-4">
              {loading ? <><Spinner /><span className="text-white ml-2">Authenticating Session...</span></> : <>Verify &amp; Sign In <ArrowRight className="w-4 h-4" /></>}
            </button>
            <button type="button" onClick={() => { setStep(1); setOtp(""); setError(null); }} className="w-full text-xs text-muted-foreground hover:text-foreground py-1 font-medium transition-colors text-center block mt-2">← Use different email or password</button>
          </motion.form>
        )}
      </AnimatePresence>
      <div className="mt-6 pt-5 border-t border-border text-center space-y-2">
        <p className="text-xs text-muted-foreground">
          New financial advisor?{" "}
          <Link to="/advisor/register" className="text-primary font-semibold hover:underline">Apply for an Advisor Account</Link>
        </p>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/app/pages/Login.tsx', content);
