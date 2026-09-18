// src/app/pages/AdvisorRegister.tsx
// ── SmartFinance Advisor Registration & Verification ───────────────────────────
// Step 1: Practice & Credential Registration
// Step 2: Email OTP Verification (marks email verified, status stays pending)
// Step 3: Pending Administrator Approval Confirmation

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  Briefcase,
  Lock,
  Mail,
  User,
  Phone,
  Building2,
  FileCheck2,
  Calendar,
  MapPin,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAdvisorAuth } from "../auth/AdvisorAuthContext";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "../components/ui/input-otp";

const SPECIALIZATION_OPTIONS = [
  "Mutual Funds",
  "Equity & Stocks",
  "Retirement Planning",
  "Tax Advisory",
  "Wealth Management",
  "Fixed Income & Bonds",
  "Insurance Planning",
  "Estate Planning",
];

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
    { label: "8+ characters", pass: password.length >= 8 },
    { label: "Uppercase letter", pass: /[A-Z]/.test(password) },
    { label: "Number", pass: /[0-9]/.test(password) },
    { label: "Special symbol", pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const colors = ["", "bg-red-400", "bg-amber-400", "bg-blue-400", "bg-[#1A5F3D]"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];

  if (!password) return null;

  return (
    <div className="mt-2 text-xs">
      <div className="flex gap-1 mb-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? colors[score] : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-500 font-medium">{labels[score] || "Too weak"}</span>
        <div className="flex gap-2.5">
          {checks.map((c) => (
            <span
              key={c.label}
              className={`text-[11px] ${c.pass ? "text-[#1A5F3D] font-semibold" : "text-gray-400"}`}
            >
              {c.pass ? "✓" : "·"} {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdvisorRegister() {
  const { registerAdvisor, verifyRegistrationOTP, resendRegistrationOTP } = useAdvisorAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firmName, setFirmName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [experienceYears, setExperienceYears] = useState<number>(5);
  const [specializations, setSpecializations] = useState<string[]>([
    "Mutual Funds",
    "Wealth Management",
  ]);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country] = useState("India");
  const [bio, setBio] = useState("");

  const [showPw, setShowPw] = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // OTP State
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  function startCooldown() {
    setResendCooldown(60);
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function toggleSpecialization(spec: string) {
    setSpecializations((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  }

  // Step 1: Submit Registration Form
  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validations
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("A valid professional email address is required.");
      return;
    }
    if (!firmName.trim()) {
      setError("Firm / Company / Practice name is required.");
      return;
    }
    if (!licenseNumber.trim()) {
      setError("License / Registration number (SEBI / AMFI / ARN / RIA) is required.");
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      setError("Password must meet complexity requirements (8+ chars, uppercase, number, symbol).");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreed) {
      setError("You must acknowledge regulatory compliance and terms of service.");
      return;
    }

    setLoading(true);

    try {
      await registerAdvisor({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        firmName: firmName.trim(),
        licenseNumber: licenseNumber.trim(),
        mobile: mobile.trim() || undefined,
        experienceYears: Number(experienceYears) || 0,
        specializations,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        country: country || "India",
        bio: bio.trim() || undefined,
      });

      // Advance to Email Verification OTP
      setStep(2);
      startCooldown();
    } catch (err: any) {
      setError(err.data?.message || err.message || "Registration failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Submit Registration OTP
  async function handleOTPSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await verifyRegistrationOTP(email.trim().toLowerCase(), otp);
      // Advance to Step 3: Pending Administrator Approval Confirmation
      setStep(3);
    } catch (err: any) {
      setError(err.data?.message || err.message || "OTP verification failed.");
      setOtp("");
    } finally {
      setLoading(false);
    }
  }

  // Resend Registration OTP
  async function handleResendOTP() {
    if (resendCooldown > 0) return;
    setError(null);
    setResendSuccess(null);

    try {
      await resendRegistrationOTP(email.trim().toLowerCase());
      setResendSuccess("A new verification code has been dispatched to your email.");
      startCooldown();
    } catch (err: any) {
      setError(err.data?.message || err.message || "Failed to resend verification code.");
    }
  }

  const inputClass =
    "w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1A5F3D]/30 focus:border-[#1A5F3D] outline-none transition-all bg-white text-gray-900";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B2317] via-[#103824] to-[#1A5F3D] flex items-center justify-center p-4 sm:p-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl"
      >
        <div className="bg-white rounded-3xl shadow-2xl p-7 sm:p-10 border border-emerald-900/10">
          {/* Header */}
          <div className="flex items-center justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center shadow-lg shadow-emerald-950/20 text-white">
              {step === 1 && <Briefcase className="w-7 h-7" />}
              {step === 2 && <Mail className="w-7 h-7" />}
              {step === 3 && <Clock className="w-7 h-7" />}
            </div>
          </div>

          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-[#1A5F3D] mb-2">
              Advisor Onboarding Program
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {step === 1 && "Apply for an Advisor Account"}
              {step === 2 && "Verify Professional Email"}
              {step === 3 && "Application Under Review"}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {step === 1 && "Partner with SmartFinance to manage clients and deliver fiduciary wealth guidance"}
              {step === 2 && `Enter the 6-digit verification code sent to ${email}`}
              {step === 3 && "Your email has been verified. Our compliance team is reviewing your credentials."}
            </p>
          </div>

          {/* Stepper Dots */}
          <div className="flex gap-2 mb-6" aria-label="Registration progress">
            <div className={`flex-1 h-1.5 rounded-full transition-colors ${step >= 1 ? "bg-[#1A5F3D]" : "bg-gray-200"}`} />
            <div className={`flex-1 h-1.5 rounded-full transition-colors ${step >= 2 ? "bg-[#1A5F3D]" : "bg-gray-200"}`} />
            <div className={`flex-1 h-1.5 rounded-full transition-colors ${step >= 3 ? "bg-[#1A5F3D]" : "bg-gray-200"}`} />
          </div>

          {/* Error Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs leading-relaxed"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="font-semibold">{error}</p>
            </motion.div>
          )}

          {/* Resend Success Banner */}
          {resendSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs leading-relaxed"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <p className="font-semibold">{resendSuccess}</p>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* STEP 1: Registration Form */}
            {step === 1 && (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleRegisterSubmit}
                className="space-y-4 text-left"
                noValidate
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                      Full Legal Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={inputClass}
                        placeholder="e.g. Ramesh Kulkarni"
                        required
                      />
                    </div>
                  </div>

                  {/* Professional Email */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                      Professional Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputClass}
                        placeholder="advisor@firm.com"
                        required
                      />
                    </div>
                  </div>

                  {/* Firm / Company */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                      Firm / Practice Name *
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={firmName}
                        onChange={(e) => setFirmName(e.target.value)}
                        className={inputClass}
                        placeholder="e.g. Kulkarni Wealth Advisory"
                        required
                      />
                    </div>
                  </div>

                  {/* License / Registration Number */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                      Regulatory License / ARN / RIA *
                    </label>
                    <div className="relative">
                      <FileCheck2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        className={inputClass}
                        placeholder="e.g. INA000012345 / ARN-88990"
                        required
                      />
                    </div>
                  </div>

                  {/* Mobile Phone */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                      Mobile Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        className={inputClass}
                        placeholder="+91 9876543210"
                      />
                    </div>
                  </div>

                  {/* Years of Experience */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                      Experience (Years)
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min={0}
                        max={70}
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                      City
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className={inputClass}
                        placeholder="e.g. Mumbai"
                      />
                    </div>
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                      State
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className={inputClass}
                        placeholder="e.g. Maharashtra"
                      />
                    </div>
                  </div>
                </div>

                {/* Specializations Multi-Select */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
                    Advisory Specializations
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SPECIALIZATION_OPTIONS.map((spec) => {
                      const active = specializations.includes(spec);
                      return (
                        <button
                          key={spec}
                          type="button"
                          onClick={() => toggleSpecialization(spec)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                            active
                              ? "bg-[#1A5F3D] text-white shadow-sm"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {active && <Check className="w-3 h-3" />}
                          {spec}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Practice Bio */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                    Practice Profile & Summary
                  </label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={2000}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1A5F3D]/30 focus:border-[#1A5F3D] outline-none transition-all bg-white text-gray-900"
                    placeholder="Brief description of your investment philosophy and typical client engagements..."
                  />
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${inputClass} pr-10`}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        tabIndex={-1}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <PasswordStrength password={password} />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showCPw ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`${inputClass} pr-10`}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCPw((v) => !v)}
                        tabIndex={-1}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Agreement Checkbox */}
                <label className="flex items-start gap-2.5 pt-1 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 rounded border-gray-300 text-[#1A5F3D] focus:ring-[#1A5F3D]"
                  />
                  <span>
                    I certify that the regulatory credentials provided are valid and active. I agree to uphold fiduciary standards and adhere to SmartFinance Advisor Terms of Service.
                  </span>
                </label>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#1A5F3D] hover:bg-[#154d31] text-white rounded-xl font-semibold shadow-md shadow-emerald-900/10 hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <>
                      <Spinner /> Submitting Advisor Application...
                    </>
                  ) : (
                    <>
                      Submit Application <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.form>
            )}

            {/* STEP 2: Email Verification OTP Form */}
            {step === 2 && (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 14 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleOTPSubmit}
                className="space-y-5 text-center"
                noValidate
              >
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-xs text-[#1A5F3D] text-left">
                  <div className="flex items-center gap-1.5 font-semibold mb-1">
                    <CheckCircle2 className="w-4 h-4 text-[#1A5F3D]" />
                    Verification Code Sent
                  </div>
                  <p className="text-gray-600">
                    We sent a 6-digit confirmation code to <strong>{email}</strong>. Please enter the code below to verify your professional email address.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center gap-2 py-2">
                  <label
                    htmlFor="registration-otp"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-700"
                  >
                    6-Digit Verification Code
                  </label>
                  <InputOTP
                    id="registration-otp"
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

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full py-3.5 bg-[#1A5F3D] hover:bg-[#154d31] text-white rounded-xl font-semibold shadow-md shadow-emerald-900/10 hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Spinner /> Verifying Email...
                    </>
                  ) : (
                    <>
                      Verify Email Address <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Resend OTP button with cooldown */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={resendCooldown > 0 || loading}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1A5F3D] hover:text-[#154d31] disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend verification code"}
                  </button>
                </div>
              </motion.form>
            )}

            {/* STEP 3: Pending Administrator Approval Screen */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center py-4 space-y-6"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#1A5F3D] flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-gray-900">
                    Email Verified Successfully
                  </h2>
                  <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
                    Your advisor account application is now undergoing regulatory and compliance review.
                  </p>
                </div>

                <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 text-xs text-left text-amber-900 space-y-2">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-950">
                    <Clock className="w-4 h-4 text-amber-700" />
                    What happens next?
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-amber-900/90 leading-relaxed">
                    <li>Our compliance desk reviews your regulatory license (<strong>{licenseNumber}</strong>).</li>
                    <li>Verification typically concludes within 1–2 business days.</li>
                    <li>You will receive an official approval notification at <strong>{email}</strong> once your portal access is enabled.</li>
                  </ul>
                </div>

                <div className="pt-2">
                  <Link
                    to="/advisor/login"
                    className="w-full py-3.5 bg-[#1A5F3D] hover:bg-[#154d31] text-white rounded-xl font-semibold shadow-md shadow-emerald-900/10 hover:shadow-lg transition-all inline-flex items-center justify-center gap-2 text-sm"
                  >
                    Go to Advisor Login <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          {step !== 3 && (
            <div className="mt-6 pt-5 border-t border-gray-100 text-center space-y-2">
              <p className="text-xs text-gray-500">
                Already have an advisor account?{" "}
                <Link to="/advisor/login" className="text-[#1A5F3D] font-semibold hover:underline">
                  Sign in here
                </Link>
              </p>
              <div>
                <Link to="/login" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                  ← Back to SmartFinance Client Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
