// src/app/pages/ResetPassword.tsx
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { validatePassword } from "../auth/authService";
import { authAPI } from "../services/api";

type ResetPhase = "form" | "success";

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters",    pass: password.length >= 8 },
    { label: "Uppercase letter", pass: /[A-Z]/.test(password) },
    { label: "Number",           pass: /\d/.test(password) },
    { label: "Special char",     pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score  = checks.filter((c) => c.pass).length;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "bg-red-400", "bg-amber-400", "bg-blue-400", "bg-primary"];

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? colors[score] : "bg-muted"}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between flex-wrap gap-1">
        <span className="text-xs text-muted-foreground">{labels[score] || "Too weak"}</span>
        <div className="flex gap-2 flex-wrap">
          {checks.map((c) => (
            <span key={c.label} className={`text-xs ${c.pass ? "text-primary" : "text-muted-foreground/70"}`}>
              {c.pass ? "✓" : "·"} {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const token          = searchParams.get("token");

  const [password,   setPassword]   = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [showPw,     setShowPw]     = useState(false);
  const [showCPw,    setShowCPw]    = useState(false);
  const [pwErr,      setPwErr]      = useState<string | null>(null);
  const [confirmErr, setConfirmErr] = useState<string | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [phase,      setPhase]      = useState<ResetPhase>("form");

  // No token — show error immediately
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0faf4] via-background to-[#e8f5ee] dark:from-background dark:via-background dark:to-background flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Invalid Reset Link</h2>
          <p className="text-muted-foreground mb-6">
            This password reset link is invalid or has already been used.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 py-3 px-6 bg-gradient-to-r from-primary to-[#2D7A4E] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const pErr = validatePassword(password);
    setPwErr(pErr);
    if (pErr) return;

    if (password !== confirmPw) {
      setConfirmErr("Passwords do not match.");
      return;
    }
    setConfirmErr(null);

    setLoading(true);
    try {
      await authAPI.resetPassword(token, password);
      setPhase("success");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = (hasErr: boolean) =>
    `w-full pl-12 pr-12 py-3 border rounded-xl text-sm outline-none transition-all bg-card text-foreground ${
      hasErr
        ? "border-red-400 focus:ring-2 focus:ring-red-300"
        : "border-border focus:ring-2 focus:ring-primary/30 focus:border-primary"
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0faf4] via-background to-[#e8f5ee] dark:from-background dark:via-background dark:to-background flex">

      {/* Left panel — intentional permanent dark-green brand panel (split-screen
          marketing design), stays as literal colors regardless of theme. */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1A5F3D] to-[#0d3b25] flex-col justify-center items-center p-16 text-white">
        <div className="max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-8">
            <span className="text-3xl font-bold">SF</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">Set a new password</h1>
          <p className="text-white/70 text-lg mb-12">Choose a strong password to keep your account secure.</p>
          <div className="space-y-4">
            {["Minimum 8 characters", "One uppercase letter", "One number", "One special character"].map(t => (
              <div key={t} className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <span className="text-white/80">{t}</span>
              </div>
            ))}
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
          <AnimatePresence mode="wait">

            {/* ── Phase: Form ── */}
            {phase === "form" && (
              <motion.div key="form"
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}
              >
                <div className="flex items-center justify-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-[#3FAF7D] flex items-center justify-center shadow-lg">
                    <ShieldCheck className="w-8 h-8 text-white" />
                  </div>
                </div>

                <h2 className="text-3xl font-bold text-foreground mb-2 text-center">Reset Password</h2>
                <p className="text-muted-foreground mb-8 text-center">Enter your new password below.</p>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 mb-5 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl"
                  >
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setPwErr(null); setError(null); }}
                        onBlur={() => setPwErr(validatePassword(password))}
                        className={inputCls(!!pwErr)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowPw((v) => !v)} tabIndex={-1}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {pwErr && <p className="mt-1.5 text-xs text-red-500">{pwErr}</p>}
                    <PasswordStrength password={password} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground/80 mb-2">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type={showCPw ? "text" : "password"}
                        value={confirmPw}
                        onChange={(e) => { setConfirmPw(e.target.value); setConfirmErr(null); }}
                        onBlur={() => {
                          if (confirmPw && confirmPw !== password)
                            setConfirmErr("Passwords do not match.");
                        }}
                        className={inputCls(!!confirmErr)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowCPw((v) => !v)} tabIndex={-1}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showCPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmErr && <p className="mt-1.5 text-xs text-red-500">{confirmErr}</p>}
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-primary to-[#2D7A4E] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100">
                    {loading ? <><Spinner /> Resetting…</> : <>Reset Password <ArrowRight className="w-5 h-5" /></>}
                  </button>

                  <div className="text-center">
                    <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      ← Back to sign in
                    </Link>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ── Phase: Success ── */}
            {phase === "success" && (
              <motion.div key="success"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-[#3FAF7D] flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-3">Password Reset!</h2>
                <p className="text-muted-foreground mb-8">
                  Your password has been updated. You can now sign in with your new password.
                </p>
                <button
                  onClick={() => navigate("/login", { replace: true })}
                  className="inline-flex items-center gap-2 py-3 px-8 bg-gradient-to-r from-primary to-[#2D7A4E] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.01] transition-all"
                >
                  Sign In <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}