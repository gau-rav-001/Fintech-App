// Frontend/src/app/pages/Signup.tsx
// ✅ FIX: After registerUser() succeeds, the backend has sent an OTP email.
//         We now navigate to /login?verify=1&email=... so the Login page's
//         OTP step picks up and the user verifies before being admitted.
// ✅ ADDED: "Continue with Google" button using loginWithGoogle()
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, Lock, User, Phone, ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { registerUser, validateEmail, validatePassword, loginWithGoogle } from "../auth/authService";

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

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters",     pass: password.length >= 8 },
    { label: "Uppercase letter",  pass: /[A-Z]/.test(password) },
    { label: "Number",            pass: /\d/.test(password) },
    { label: "Special character", pass: /[^A-Za-z0-9]/.test(password) },
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
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{labels[score] || "Too weak"}</span>
        <div className="flex gap-3">
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

export function Signup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "", email: "", phone: "", password: "", confirmPassword: "",
  });
  const [showPw,  setShowPw]  = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [agreed,  setAgreed]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const [errs, setErrs] = useState<Record<string, string | null>>({});

  const set = (field: string, value: string) => {
    setFormData((p) => ({ ...p, [field]: value }));
    setErrs((p) => ({ ...p, [field]: null }));
    setError(null);
  };

  function validate(): boolean {
    const next: Record<string, string | null> = {};
    if (!formData.fullName.trim())      next.fullName = "Full name is required.";
    next.email    = validateEmail(formData.email);
    next.password = validatePassword(formData.password);
    if (!formData.phone.trim())         next.phone = "Phone number is required.";
    else if (!/^[+\d][\d\s\-()]{7,}$/.test(formData.phone))
                                        next.phone = "Enter a valid phone number.";
    if (formData.password !== formData.confirmPassword)
      next.confirmPassword = "Passwords do not match.";
    if (!agreed)                        next.agree = "You must accept the terms to continue.";
    setErrs(next);
    return !Object.values(next).some(Boolean);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError(null);
    try {
      const result = await registerUser(
        formData.fullName,
        formData.email,
        formData.phone,
        formData.password,
      );

      if (!result.success) {
        setError(result.error ?? "Registration failed. Please try again.");
        return;
      }

      // ✅ backend sent an OTP email — redirect to login OTP step.
      navigate(
        `/login?verify=1&email=${encodeURIComponent(formData.email)}`,
        { replace: true }
      );
    } finally {
      setLoading(false);
    }
  }

  const inputCls = (field: string) =>
    `w-full pl-12 pr-4 py-3 border ${
      errs[field] ? "border-red-400 focus:ring-red-300" : "border-border focus:ring-primary"
    } rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all bg-card text-foreground`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">

        {/* ── Left — Form ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-card rounded-3xl shadow-2xl p-8 md:p-12"
        >
          <div className="lg:hidden mb-8">
            <Link to="/" className="inline-flex items-center space-x-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-[#3FAF7D] flex items-center justify-center">
                <span className="text-white font-bold text-xl">SF</span>
              </div>
              <span className="font-bold text-xl text-foreground">SmartFinance</span>
            </Link>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div key="err"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-3 mb-6 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40"
              >
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <h2 className="text-3xl font-bold text-foreground mb-2">Create Account</h2>
          <p className="text-muted-foreground mb-6">Start your financial journey today</p>

          {/* ── Google sign-up ── */}
          <button
            type="button"
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 py-3 border border-border rounded-xl text-sm font-medium text-foreground/80 hover:bg-muted transition-all mb-4"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="relative flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground/70 font-medium">or sign up with email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input type="text" value={formData.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  className={inputCls("fullName")} placeholder="Rahul Sharma" autoComplete="name" />
              </div>
              {errs.fullName && <p className="mt-1.5 text-xs text-red-500">{errs.fullName}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input type="email" value={formData.email}
                  onChange={(e) => set("email", e.target.value)}
                  className={inputCls("email")} placeholder="you@example.com" autoComplete="email" />
              </div>
              {errs.email && <p className="mt-1.5 text-xs text-red-500">{errs.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input type="tel" value={formData.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className={inputCls("phone")} placeholder="+91 98765 43210" autoComplete="tel" />
              </div>
              {errs.phone && <p className="mt-1.5 text-xs text-red-500">{errs.phone}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input type={showPw ? "text" : "password"} value={formData.password}
                  onChange={(e) => set("password", e.target.value)}
                  className={`${inputCls("password")} pr-12`} placeholder="••••••••" autoComplete="new-password" />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errs.password && <p className="mt-1.5 text-xs text-red-500">{errs.password}</p>}
              <PasswordStrength password={formData.password} />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input type={showCPw ? "text" : "password"} value={formData.confirmPassword}
                  onChange={(e) => set("confirmPassword", e.target.value)}
                  className={`${inputCls("confirmPassword")} pr-12`} placeholder="••••••••" autoComplete="new-password" />
                <button type="button" onClick={() => setShowCPw((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                  {showCPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errs.confirmPassword && <p className="mt-1.5 text-xs text-red-500">{errs.confirmPassword}</p>}
            </div>

            {/* Terms */}
            <div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={agreed}
                  onChange={(e) => { setAgreed(e.target.checked); setErrs((p) => ({ ...p, agree: null })); }}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary mt-1" />
                <span className="text-sm text-muted-foreground">
                  I agree to the{" "}
                  <span className="text-primary underline cursor-default">Terms of Service</span>
                  {" "}and{" "}
                  <span className="text-primary underline cursor-default">Privacy Policy</span>
                </span>
              </label>
              {errs.agree && <p className="mt-1.5 text-xs text-red-500">{errs.agree}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary to-[#2D7A4E] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100">
              {loading
                ? <><Spinner /> Creating account…</>
                : <>Create Account <ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        </motion.div>

        {/* ── Right — Branding (intentional permanent brand panel) ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="hidden lg:block"
        >
          <Link to="/" className="inline-flex items-center space-x-2 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-[#3FAF7D] flex items-center justify-center">
              <span className="text-white font-bold text-xl">SF</span>
            </div>
            <span className="font-bold text-2xl text-foreground">SmartFinance</span>
          </Link>

          <h1 className="text-5xl font-bold text-foreground mb-6">Start Your Financial Journey</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of users who trust SmartFinance for their financial planning
          </p>

          <div className="bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] rounded-3xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-6">Why Choose Us?</h3>
            <div className="space-y-4">
              {[
                "Expert financial advisors",
                "Personalized investment strategies",
                "Advanced portfolio analytics",
                "24/7 customer support",
                "Secure and transparent platform",
              ].map((t) => (
                <div key={t} className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}