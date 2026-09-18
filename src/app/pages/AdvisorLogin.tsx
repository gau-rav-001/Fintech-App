// src/app/pages/AdvisorLogin.tsx
// ── SmartFinance Advisor Portal Login ─────────────────────────────────────────
// Step 1: Email & Password verification
// Step 2: 2-Step Email Verification (MFA OTP)

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  Briefcase,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAdvisorAuth } from "../auth/AdvisorAuthContext";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "../components/ui/input-otp";

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function AdvisorLogin() {
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

  const inputClass =
    "w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1A5F3D]/30 focus:border-[#1A5F3D] outline-none transition-all bg-white text-gray-900";

  // Step 1: Submit email & password
  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Email address is required.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    setLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const data = await loginWithCredentials(cleanEmail, password);
      if (data?.requiresOTP) {
        setStep(2);
      }
    } catch (err: any) {
      const serverMsg = err.data?.message || err.message || "Failed to log in.";
      const code = err.data?.errors?.code || err.data?.code || null;
      setError(serverMsg);
      setErrorCode(code);
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Submit 6-digit 2FA OTP
  async function handleOTPSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      await verifyLoginOTP(email.trim(), otp);
      // Determine safe redirect destination
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
    <div className="min-h-screen bg-gradient-to-br from-[#0B2317] via-[#103824] to-[#1A5F3D] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-2xl p-7 sm:p-9 border border-emerald-900/10">
          {/* Brand & Mode Header */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center shadow-lg shadow-emerald-950/20 text-white">
              {step === 1 ? (
                <Briefcase className="w-8 h-8" />
              ) : (
                <KeyRound className="w-8 h-8" />
              )}
            </div>
          </div>

          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-[#1A5F3D] mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              SmartFinance Advisor Portal
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {step === 1 ? "Advisor Sign In" : "Security Verification"}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {step === 1
                ? "Access your registered wealth practice & client roster"
                : `Enter the 6-digit code sent to ${email}`}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex gap-2 mb-6" aria-label="Step progress">
            <div
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                step >= 1 ? "bg-[#1A5F3D]" : "bg-gray-200"
              }`}
            />
            <div
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                step >= 2 ? "bg-[#1A5F3D]" : "bg-gray-200"
              }`}
            />
          </div>

          {/* Error Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <div className="text-xs leading-relaxed">
                <p className="font-semibold">{error}</p>
                {errorCode === "EMAIL_NOT_VERIFIED" && (
                  <p className="mt-1 text-red-700">
                    Need to verify your email? Check your registration confirmation email or contact support.
                  </p>
                )}
                {errorCode === "ADVISOR_PENDING" && (
                  <p className="mt-1 text-red-700">
                    Your credentials (SEBI/AMFI) are currently being reviewed by compliance. You will receive an email once approved.
                  </p>
                )}
                {errorCode === "ADVISOR_SUSPENDED" && (
                  <p className="mt-1 text-red-700">
                    Please contact platform compliance to resolve the account restriction.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 1: Credentials Form */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleCredentialsSubmit}
                className="space-y-4"
                noValidate
              >
                <div>
                  <label
                    htmlFor="advisor-email"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5"
                  >
                    Professional Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="advisor-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                      className={inputClass}
                      placeholder="advisor@advisoryfirm.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="advisor-password"
                      className="block text-xs font-semibold uppercase tracking-wider text-gray-700"
                    >
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="advisor-password"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null);
                      }}
                      className={`${inputClass} pr-12`}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#1A5F3D] hover:bg-[#154d31] text-white rounded-xl font-semibold shadow-md shadow-emerald-900/10 hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Spinner /> Verifying Credentials...
                    </>
                  ) : (
                    <>
                      Continue <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.form>
            )}

            {/* Step 2: 2FA OTP Form */}
            {step === 2 && (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 14 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleOTPSubmit}
                className="space-y-5"
                noValidate
              >
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-xs text-[#1A5F3D]">
                  <div className="flex items-center gap-1.5 font-semibold mb-1">
                    <CheckCircle2 className="w-4 h-4 text-[#1A5F3D]" />
                    Two-Factor Code Dispatched
                  </div>
                  <p className="text-gray-600">
                    A secure 6-digit sign-in code has been sent to your registered inbox. Valid for 10 minutes.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center gap-2">
                  <label
                    htmlFor="advisor-otp"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-700 text-center"
                  >
                    Enter 6-Digit Authentication Code
                  </label>
                  <div className="py-2">
                    <InputOTP
                      id="advisor-otp"
                      maxLength={6}
                      value={otp}
                      onChange={(val) => {
                        setOtp(val.replace(/\D/g, ""));
                        setError(null);
                      }}
                      autoFocus
                    >
                      <InputOTPGroup className="gap-2">
                        <InputOTPSlot index={0} className="w-11 h-12 text-base font-semibold border-gray-300" />
                        <InputOTPSlot index={1} className="w-11 h-12 text-base font-semibold border-gray-300" />
                        <InputOTPSlot index={2} className="w-11 h-12 text-base font-semibold border-gray-300" />
                        <InputOTPSlot index={3} className="w-11 h-12 text-base font-semibold border-gray-300" />
                        <InputOTPSlot index={4} className="w-11 h-12 text-base font-semibold border-gray-300" />
                        <InputOTPSlot index={5} className="w-11 h-12 text-base font-semibold border-gray-300" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full py-3.5 bg-[#1A5F3D] hover:bg-[#154d31] text-white rounded-xl font-semibold shadow-md shadow-emerald-900/10 hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Spinner /> Authenticating Session...
                    </>
                  ) : (
                    <>
                      Verify & Sign In <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setOtp("");
                    setError(null);
                  }}
                  className="w-full text-xs text-gray-500 hover:text-gray-800 py-1 font-medium transition-colors text-center block"
                >
                  ← Use different email or password
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Registration Link */}
          <div className="mt-6 pt-5 border-t border-gray-100 text-center space-y-2">
            <p className="text-xs text-gray-500">
              New financial advisor?{" "}
              <Link
                to="/advisor/register"
                className="text-[#1A5F3D] font-semibold hover:underline"
              >
                Apply for an Advisor Account
              </Link>
            </p>
            <div>
              <Link
                to="/login"
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Back to SmartFinance Client Login
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
