// src/app/pages/AdvisorInviteClaim.tsx
// ── SmartFinance Client Advisor Invitation Claim ──────────────────────────────
// Actor: USER (Authenticated SmartFinance Client)
// Endpoint: POST /api/user/advisor/claim-invite
// Public landing page for /advisor/invite?token=...

import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import {
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  UserCheck,
  Building2,
  Calendar,
  Sparkles,
  LogIn,
  UserPlus,
} from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../auth/AuthContext";
import { userAdvisorAPI } from "../services/api";

interface ClaimedAdvisorData {
  fullName: string;
  firmName: string;
  specializations: string[];
  profilePicture?: string;
  connectedSince?: string;
}

type ClaimState =
  | "INITIAL_LOADING"
  | "NO_TOKEN"
  | "LOGIN_REQUIRED"
  | "CLAIMING"
  | "SUCCESS"
  | "ERROR";

export function AdvisorInviteClaim() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isUserAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [claimState, setClaimState] = useState<ClaimState>("INITIAL_LOADING");
  const [claimedAdvisor, setClaimedAdvisor] = useState<ClaimedAdvisorData | null>(null);
  const [errorDetails, setErrorDetails] = useState<{
    code?: string;
    title: string;
    message: string;
    actionText?: string;
    actionPath?: string;
  } | null>(null);

  const tokenProcessedRef = useRef(false);

  // Extract token transiently from query parameter
  const rawToken = searchParams.get("token")?.trim() || "";

  useEffect(() => {
    // Wait for user session restoration on mount
    if (isAuthLoading) return;

    // Check token presence
    if (!rawToken) {
      setClaimState("NO_TOKEN");
      return;
    }

    // Case B: User is NOT authenticated -> Show login required state
    if (!isUserAuthenticated) {
      setClaimState("LOGIN_REQUIRED");
      return;
    }

    // Case A: User is authenticated -> execute claim once
    if (!tokenProcessedRef.current) {
      tokenProcessedRef.current = true;
      executeClaim(rawToken);
    }
  }, [isAuthLoading, isUserAuthenticated, rawToken]);

  async function executeClaim(token: string) {
    setClaimState("CLAIMING");
    setErrorDetails(null);

    try {
      const res = await userAdvisorAPI.claimInvite(token);
      const adv = res.data?.advisor;

      setClaimedAdvisor({
        fullName: adv?.fullName || "Your Financial Advisor",
        firmName: adv?.firmName || "Registered Advisory Firm",
        specializations: adv?.specializations || [],
        profilePicture: adv?.profilePicture || "",
        connectedSince: res.data?.connectedSince || new Date().toISOString(),
      });

      setClaimState("SUCCESS");

      // Strip token from browser address bar & history without unmounting
      try {
        window.history.replaceState(null, "", "/advisor/invite");
      } catch {
        // Fallback: non-critical URL replacement
      }
    } catch (err: any) {
      const code = err.data?.errors?.code || err.data?.code || "CLAIM_FAILED";
      const serverMsg = err.data?.message || err.message || "Failed to accept invitation.";

      mapError(code, serverMsg);
      setClaimState("ERROR");
    }
  }

  function mapError(code: string, serverMsg: string) {
    switch (code) {
      case "INVITE_INVALID":
        setErrorDetails({
          code,
          title: "Invalid or Expired Invitation",
          message:
            "This invitation link is invalid or has expired. Advisory invitations are valid for 7 days. Please ask your advisor to issue a new invitation.",
          actionText: "Go to Dashboard",
          actionPath: "/dashboard",
        });
        break;
      case "INVITE_ALREADY_CLAIMED":
        setErrorDetails({
          code,
          title: "Invitation Already Claimed",
          message:
            "This invitation has already been accepted and connected to a SmartFinance account. If this was you, your advisory relationship is active.",
          actionText: "View Dashboard",
          actionPath: "/dashboard",
        });
        break;
      case "EMAIL_MISMATCH":
        setErrorDetails({
          code,
          title: "Account Email Mismatch",
          message: `This invitation was issued to a different email address than your signed-in account (${user?.email || "current account"}). Please sign in with the email address where you received the invitation.`,
          actionText: "Sign In with Different Account",
          actionPath: "/login",
        });
        break;
      case "USER_ALREADY_HAS_ADVISOR":
        setErrorDetails({
          code,
          title: "Active Advisor Already Connected",
          message:
            "You already have an active financial advisor connected to your SmartFinance account. Platform policy allows one active advisor relationship at a time. To switch advisors, disconnect your current advisor in Settings first.",
          actionText: "Go to Settings",
          actionPath: "/settings",
        });
        break;
      case "ADVISOR_NOT_ELIGIBLE":
        setErrorDetails({
          code,
          title: "Advisor Unavailable",
          message:
            "The financial advisor associated with this invitation is currently not eligible or active on the SmartFinance platform.",
          actionText: "Return to Dashboard",
          actionPath: "/dashboard",
        });
        break;
      default:
        setErrorDetails({
          code,
          title: "Unable to Connect",
          message: serverMsg || "A system error occurred while processing your invitation. Please try again later.",
          actionText: "Return to Dashboard",
          actionPath: "/dashboard",
        });
    }
  }

  const returnLocation = location.pathname + location.search;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B2317] via-[#103824] to-[#1A5F3D] flex items-center justify-center p-4 sm:p-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <div className="bg-white rounded-3xl shadow-2xl p-7 sm:p-10 border border-emerald-900/10 text-center">
          {/* ── 1. Initial Loading State ────────────────────────────────────────── */}
          {claimState === "INITIAL_LOADING" && (
            <div className="py-12 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center shadow-lg mx-auto text-white">
                <Briefcase className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-gray-900">Loading Invitation...</h2>
                <p className="text-xs text-gray-500">Verifying security parameters</p>
              </div>
              <div className="flex justify-center gap-1.5 pt-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#1A5F3D] animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── 2. No Token Found ───────────────────────────────────────────────── */}
          {claimState === "NO_TOKEN" && (
            <div className="py-6 space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-gray-900">Invalid Invitation Link</h2>
                <p className="text-sm text-gray-600 leading-relaxed max-w-sm mx-auto">
                  This invitation link is missing an authorization token. Please click the original connection link provided in your advisor invitation email.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/"
                  className="w-full py-3 bg-[#1A5F3D] hover:bg-[#154d31] text-white rounded-xl font-semibold transition-all inline-flex items-center justify-center gap-2 text-sm shadow-md"
                >
                  Go to SmartFinance Home <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {/* ── 3. Login Required State (Unauthenticated User) ──────────────────── */}
          {claimState === "LOGIN_REQUIRED" && (
            <div className="py-4 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center shadow-lg mx-auto text-white">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-[#1A5F3D]">
                  <Sparkles className="w-3.5 h-3.5" />
                  Advisor Connection Request
                </div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  Sign In to Connect
                </h1>
                <p className="text-sm text-gray-600 leading-relaxed max-w-sm mx-auto">
                  You have been invited to connect with your financial advisor on SmartFinance. Please sign in or create an account to activate advisory services.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate("/login", {
                      state: { from: returnLocation },
                    })
                  }
                  className="w-full py-3.5 bg-[#1A5F3D] hover:bg-[#154d31] text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In to Accept Invitation
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/signup", {
                      state: { from: returnLocation },
                    })
                  }
                  className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  Create a SmartFinance Account
                </button>
              </div>

              <p className="text-xs text-gray-400 pt-1">
                Your connection will be automatically finalized once you sign in.
              </p>
            </div>
          )}

          {/* ── 4. Claiming in Progress ─────────────────────────────────────────── */}
          {claimState === "CLAIMING" && (
            <div className="py-12 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center shadow-lg mx-auto text-white animate-pulse">
                <Briefcase className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-gray-900">Connecting Your Advisor...</h2>
                <p className="text-xs text-gray-500">Establishing encrypted advisory relationship</p>
              </div>
              <div className="flex justify-center gap-1.5 pt-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#1A5F3D] animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── 5. Success State ────────────────────────────────────────────────── */}
          {claimState === "SUCCESS" && claimedAdvisor && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="py-2 space-y-6 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#1A5F3D] flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-[#1A5F3D]">
                  <UserCheck className="w-3.5 h-3.5" />
                  Advisor Connected Successfully
                </div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  You're Now Connected
                </h1>
                <p className="text-xs text-gray-500">
                  Your financial advisor is now authorized to assist with your portfolio and goals.
                </p>
              </div>

              {/* Advisor Card */}
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-5 text-left space-y-3">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[#1A5F3D] text-white font-bold flex items-center justify-center text-lg shrink-0 shadow-md">
                    {claimedAdvisor.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold text-gray-900 truncate">
                      {claimedAdvisor.fullName}
                    </h2>
                    <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{claimedAdvisor.firmName}</span>
                    </div>
                  </div>
                </div>

                {claimedAdvisor.specializations.length > 0 && (
                  <div className="pt-1 border-t border-emerald-200/60">
                    <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                      Advisory Expertise
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {claimedAdvisor.specializations.map((spec) => (
                        <span
                          key={spec}
                          className="px-2.5 py-0.5 rounded-md bg-white border border-emerald-200 text-[11px] font-medium text-[#1A5F3D]"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-1 border-t border-emerald-200/60 flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>
                    Connected on{" "}
                    {new Date(claimedAdvisor.connectedSince || Date.now()).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <Link
                  to="/dashboard"
                  className="w-full py-3.5 bg-[#1A5F3D] hover:bg-[#154d31] text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
                >
                  Go to Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/settings"
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all block text-xs"
                >
                  View Advisor Relationship in Settings
                </Link>
              </div>
            </motion.div>
          )}

          {/* ── 6. Error State ──────────────────────────────────────────────────── */}
          {claimState === "ERROR" && errorDetails && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="py-4 space-y-5 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-gray-900">{errorDetails.title}</h2>
                <p className="text-sm text-gray-600 leading-relaxed max-w-sm mx-auto">
                  {errorDetails.message}
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to={errorDetails.actionPath || "/dashboard"}
                  className="w-full py-3.5 bg-[#1A5F3D] hover:bg-[#154d31] text-white rounded-xl font-semibold transition-all inline-flex items-center justify-center gap-2 text-sm shadow-md"
                >
                  {errorDetails.actionText || "Go to Dashboard"}{" "}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
