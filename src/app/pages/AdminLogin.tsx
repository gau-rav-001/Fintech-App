import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, Shield, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAdminAuth } from "../auth/AuthContext";
import { adminLoginStep1, adminVerifyOTP, validateEmail, validateOTP } from "../auth/authService";

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function AdminLogin() {
  const navigate = useNavigate();
  const { setAdminUser } = useAdminAuth();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [step,     setStep]     = useState(1);
  const [otp,      setOtp]      = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const inp = "w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1A5F3D]/30 focus:border-[#1A5F3D] outline-none transition-all bg-white";

  async function handleCredentials(e) {
    e.preventDefault();
    const emailErr = validateEmail(email);
    if (emailErr)  { setError(emailErr); return; }
    if (!password) { setError("Password is required."); return; }
    setLoading(true); setError(null);
    try {
      const result = await adminLoginStep1(email, password);
      if (!result.success) { setError(result.error ?? "Invalid credentials."); }
      else { setStep(2); }
    } finally { setLoading(false); }
  }

  async function handleOTP(e) {
    e.preventDefault();
    const otpErr = validateOTP(otp);
    if (otpErr) { setError(otpErr); return; }
    setLoading(true); setError(null);
    try {
      const result = await adminVerifyOTP(email, otp);
      if (!result.success) { setError(result.error ?? "OTP verification failed."); setOtp(""); }
      else if (result.user) { setAdminUser(result.user); navigate("/admin/portal", { replace: true }); }
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#0f2a1d] to-[#1A5F3D] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">

          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-600 flex items-center justify-center shadow-xl">
              {step === 1 ? <Shield className="w-8 h-8 text-white" /> : <KeyRound className="w-8 h-8 text-white" />}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 text-center mb-1">
            {step === 1 ? "Admin Portal" : "Verify Identity"}
          </h2>
          <p className="text-gray-500 text-center text-sm mb-6">
            {step === 1 ? "Restricted access — authorised personnel only" : `Check ${email} for your 6-digit code`}
          </p>

          <div className="flex gap-2 mb-6">
            <div className={`flex-1 h-1.5 rounded-full transition-colors ${step >= 1 ? "bg-[#1A5F3D]" : "bg-gray-200"}`} />
            <div className={`flex-1 h-1.5 rounded-full transition-colors ${step >= 2 ? "bg-[#1A5F3D]" : "bg-gray-200"}`} />
          </div>

          {error && (
            <div className="flex items-start gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form key="step1" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }} onSubmit={handleCredentials} className="space-y-4" noValidate>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Admin Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="email" value={email} className={inp} onChange={e => { setEmail(e.target.value); setError(null); }} placeholder="admin@example.com" autoComplete="email" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type={showPw ? "text" : "password"} value={password} onChange={e => { setPassword(e.target.value); setError(null); }} className={`${inp} pr-12`} placeholder="••••••••" autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70">
                  {loading ? <><Spinner /> Verifying…</> : <>Continue <ArrowRight className="w-4 h-4" /></>}
                </button>
              </motion.form>
            )}

            {step === 2 && (
              <motion.form key="step2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }} onSubmit={handleOTP} className="space-y-4" noValidate>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700">
                  <p className="font-semibold mb-0.5">Where's my OTP?</p>
                  <p>Development: check your <strong>terminal console</strong> — printed there instantly.</p>
                  <p>Production: check <strong>{email}</strong>.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">6-digit code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" inputMode="numeric" maxLength={6} value={otp} placeholder="000000" onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setError(null); }} className={`${inp} tracking-[0.4em] text-center font-mono text-lg`} autoComplete="one-time-code" autoFocus />
                  </div>
                </div>
                <button type="submit" disabled={loading || otp.length < 6} className="w-full py-3 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70">
                  {loading ? <><Spinner /> Verifying…</> : <>Access Admin Portal <ArrowRight className="w-4 h-4" /></>}
                </button>
                <button type="button" onClick={() => { setStep(1); setOtp(""); setError(null); }} className="w-full text-sm text-gray-500 hover:text-gray-700 py-1 transition-colors">
                  ← Use different credentials
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <Link to="/login" className="text-sm text-[#1A5F3D] hover:underline">← Back to User Login</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}