import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, Shield } from "lucide-react";
import { motion } from "motion/react";
import { useAdminAuth } from "../auth/AuthContext";
import { adminLogin, validateEmail } from "../auth/authService";

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
  const { setAdminSession } = useAdminAuth();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const emailErr = validateEmail(email);
    if (emailErr || !password) { setError(emailErr ?? "Password is required."); return; }

    setLoading(true); setError(null);
    try {
      const result = await adminLogin(email, password);
      if (!result.success) { setError(result.error ?? "Login failed."); return; }
      if (result.session) {
        setAdminSession(result.session, true);
        navigate("/admin/portal", { replace: true });
      }
    } finally { setLoading(false); }
  }

  const inp = `w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#1A5F3D]/30 focus:border-[#1A5F3D] outline-none transition-all bg-white`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#0f2a1d] to-[#1A5F3D] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
          {/* Shield icon */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-600 flex items-center justify-center shadow-xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 text-center mb-1">Admin Portal</h2>
          <p className="text-gray-500 text-center text-sm mb-6">Restricted access — authorised personnel only</p>

          {/* Demo hint */}
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 mb-6">
            <p className="text-xs text-gray-500 mb-1 font-semibold">Demo credentials</p>
            <p className="text-xs text-gray-600">Email: <span className="font-mono font-semibold">admin@smartfinance.in</span></p>
            <p className="text-xs text-gray-600">Password: <span className="font-mono font-semibold">Admin2024!</span></p>
          </div>

          {error && (
            <div className="flex items-start gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" value={email} className={inp}
                  onChange={e => { setEmail(e.target.value); setError(null); }}
                  placeholder="admin@smartfinance.in" autoComplete="email" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type={showPw ? "text" : "password"} value={password}
                  onChange={e => { setPassword(e.target.value); setError(null); }}
                  className={`${inp} pr-12`} placeholder="••••••••" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-gray-800 to-gray-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-2">
              {loading ? <><Spinner /> Authenticating…</> : <>Access Admin Portal <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <Link to="/login" className="text-sm text-[#1A5F3D] hover:underline">← Back to User Login</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}