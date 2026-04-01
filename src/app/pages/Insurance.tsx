import { useState } from "react";
import { Link } from "react-router";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import {
  Heart,
  Car,
  Home,
  Briefcase,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  ArrowRight,
  PhoneCall,
  Star,
  IndianRupee,
  Clock,
  Users,
  FileText,
  Shield,
  Stethoscope,
  Activity,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// ─── Insurance type data ────────────────────────────────────────────────────

const insuranceTypes = [
  {
    id: "health",
    icon: <Stethoscope className="w-7 h-7" />,
    title: "Health Insurance",
    subtitle: "Medical coverage for you & your family",
    tagline: "Stay protected against rising medical costs",
    accent: "from-rose-600 to-pink-500",
    softBg: "from-rose-50 to-pink-50",
    borderColor: "border-rose-200",
    badgeColor: "bg-rose-100 text-rose-700",
    glowColor: "bg-rose-300/20",
    startingPremium: "₹399/mo",
    coverAmount: "Up to ₹1 Crore",
    rating: 4.8,
    reviews: "12,400+",
    keyFeatures: [
      "Cashless hospitalisation at 10,000+ hospitals",
      "Pre & post hospitalisation coverage (30 / 60 days)",
      "Day care procedures covered",
      "Annual health check-up included",
      "No claim bonus up to 50%",
      "Mental health & wellness coverage",
    ],
    plans: [
      { name: "Individual", cover: "₹5L", premium: "₹399/mo" },
      { name: "Family Floater", cover: "₹10L", premium: "₹899/mo" },
      { name: "Senior Citizen", cover: "₹5L", premium: "₹1,499/mo" },
    ],
    highlight: "Most Popular",
  },
  {
    id: "life",
    icon: <Heart className="w-7 h-7" />,
    title: "Life Insurance",
    subtitle: "Term & Whole Life plans",
    tagline: "Secure your family's future no matter what",
    accent: "from-emerald-700 to-teal-500",
    softBg: "from-emerald-50 to-teal-50",
    borderColor: "border-emerald-200",
    badgeColor: "bg-emerald-100 text-emerald-700",
    glowColor: "bg-emerald-300/20",
    startingPremium: "₹499/mo",
    coverAmount: "Up to ₹5 Crore",
    rating: 4.9,
    reviews: "18,200+",
    keyFeatures: [
      "Term Life – pure protection at lowest cost",
      "Whole Life – lifelong coverage + savings component",
      "Critical illness rider available",
      "Accidental death benefit rider",
      "Return of premium option",
      "Tax benefit under Sec 80C & 10(10D)",
    ],
    plans: [
      { name: "Term Plan (1 Cr)", cover: "₹1 Cr", premium: "₹499/mo" },
      { name: "Term Plan (2 Cr)", cover: "₹2 Cr", premium: "₹899/mo" },
      { name: "Whole Life", cover: "₹50L", premium: "₹2,299/mo" },
    ],
    highlight: "Best Value",
  },
  {
    id: "vehicle",
    icon: <Car className="w-7 h-7" />,
    title: "Vehicle Insurance",
    subtitle: "Car, Bike & Commercial vehicle",
    tagline: "Drive worry-free on every road",
    accent: "from-blue-700 to-sky-500",
    softBg: "from-blue-50 to-sky-50",
    borderColor: "border-blue-200",
    badgeColor: "bg-blue-100 text-blue-700",
    glowColor: "bg-blue-300/20",
    startingPremium: "₹2,094/yr",
    coverAmount: "Bumper-to-Bumper",
    rating: 4.7,
    reviews: "9,800+",
    keyFeatures: [
      "Third-party liability (mandatory by law)",
      "Own damage cover for accidents & theft",
      "Zero depreciation add-on",
      "Roadside assistance 24×7",
      "Engine protection cover",
      "No claim bonus up to 50% discount",
    ],
    plans: [
      { name: "Third-party", cover: "Liability", premium: "₹2,094/yr" },
      { name: "Comprehensive", cover: "Full cover", premium: "₹7,500/yr" },
      { name: "Zero Dep", cover: "Full + Zero Dep", premium: "₹11,200/yr" },
    ],
    highlight: "Mandatory",
  },
  {
    id: "home",
    icon: <Home className="w-7 h-7" />,
    title: "Property / Home Insurance",
    subtitle: "Structure & contents protection",
    tagline: "Protect your biggest investment",
    accent: "from-amber-600 to-orange-500",
    softBg: "from-amber-50 to-orange-50",
    borderColor: "border-amber-200",
    badgeColor: "bg-amber-100 text-amber-700",
    glowColor: "bg-amber-300/20",
    startingPremium: "₹299/mo",
    coverAmount: "Up to ₹5 Crore",
    rating: 4.6,
    reviews: "4,300+",
    keyFeatures: [
      "Building structure damage (fire, flood, earthquake)",
      "Home contents & valuables coverage",
      "Burglary & theft protection",
      "Temporary accommodation expenses",
      "Liability for injury on property",
      "Rent loss cover for landlords",
    ],
    plans: [
      { name: "Structure Only", cover: "₹50L", premium: "₹299/mo" },
      { name: "Structure + Contents", cover: "₹75L", premium: "₹549/mo" },
      { name: "Premium Home", cover: "₹2 Cr", premium: "₹1,299/mo" },
    ],
    highlight: "Underrated",
  },
  {
    id: "business",
    icon: <Briefcase className="w-7 h-7" />,
    title: "Business Insurance",
    subtitle: "SME, startup & enterprise plans",
    tagline: "Keep your business running, always",
    accent: "from-violet-700 to-purple-500",
    softBg: "from-violet-50 to-purple-50",
    borderColor: "border-violet-200",
    badgeColor: "bg-violet-100 text-violet-700",
    glowColor: "bg-violet-300/20",
    startingPremium: "₹1,499/mo",
    coverAmount: "Custom Coverage",
    rating: 4.8,
    reviews: "3,100+",
    keyFeatures: [
      "Commercial property & equipment coverage",
      "Public liability & professional indemnity",
      "Employee group health insurance",
      "Business interruption coverage",
      "Cyber liability & data breach protection",
      "Directors & officers (D&O) liability",
    ],
    plans: [
      { name: "SME Starter", cover: "₹25L", premium: "₹1,499/mo" },
      { name: "SME Growth", cover: "₹1 Cr", premium: "₹3,999/mo" },
      { name: "Enterprise", cover: "Custom", premium: "Custom" },
    ],
    highlight: "For Businesses",
  },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Insurance() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#0f2a1d_0%,#1A5F3D_45%,#2D7A4E_75%,#4aa06f_100%)] text-white py-16 md:py-24">
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#B8E986]/15 blur-3xl" />
          <div className="absolute left-[12%] top-[20%] h-[180px] w-[180px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute right-[10%] bottom-[10%] h-[220px] w-[220px] rounded-full bg-[#3FAF7D]/15 blur-3xl" />
        </div>
        <div className="absolute inset-0 opacity-[0.10] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/85 backdrop-blur mb-5">
              <span className="mr-2 h-2 w-2 rounded-full bg-[#B8E986]" />
              Comprehensive Insurance Solutions
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-5 tracking-[-0.03em] leading-[1.08]">
              Insurance{" "}
              <span className="bg-gradient-to-r from-[#B8E986] via-[#DDF8A8] to-white bg-clip-text text-transparent">
                Coverage
              </span>{" "}
              for Every Need
            </h1>

            <p className="text-lg md:text-xl text-white/80 leading-8 mb-10 max-w-2xl mx-auto">
              Explore plans that protect what matters most — your health, family,
              vehicle, home, and business.
            </p>

            {/* Stats strip */}
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { icon: <Users className="w-4 h-4" />, label: "50,000+ insured" },
                { icon: <ShieldCheck className="w-4 h-4" />, label: "5 insurance types" },
                { icon: <Clock className="w-4 h-4" />, label: "Quick 10-min onboarding" },
                { icon: <FileText className="w-4 h-4" />, label: "Paperless claims" },
              ].map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur"
                >
                  {s.icon}
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Insurance Cards ── */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-[radial-gradient(circle_at_top,rgba(63,175,125,0.08),transparent_30%),linear-gradient(to_bottom,#f8fbf9,#ffffff)]">
        <div className="absolute inset-0 opacity-[0.30] [background-image:linear-gradient(rgba(26,95,61,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(26,95,61,0.04)_1px,transparent_1px)] [background-size:36px_36px]" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <div className="text-center mb-12">
            <div className="inline-flex items-center rounded-full border border-[#d7eadf] bg-white/70 backdrop-blur px-4 py-2 text-sm font-medium text-[#1A5F3D] mb-4">
              Tap any card to explore plans
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-[-0.03em]">
              Choose Your Coverage
            </h2>
            <p className="text-gray-500 mt-3 text-base max-w-xl mx-auto leading-7">
              Compare plans, features, and premiums across all insurance categories in one place.
            </p>
          </div>

          {insuranceTypes.map((ins, index) => (
            <InsuranceCard
              key={ins.id}
              ins={ins}
              index={index}
              expanded={expandedId === ins.id}
              onToggle={() => toggle(ins.id)}
            />
          ))}
        </div>
      </section>

      {/* ── Why choose us ── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-[-0.02em]">
              Why Buy Insurance With Us?
            </h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto leading-7">
              Unbiased advice. Zero paperwork. Instant issuance.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Star className="w-6 h-6" />,
                title: "100% Unbiased",
                desc: "We compare plans from 30+ insurers to find you the best deal.",
                color: "from-amber-500 to-orange-400",
              },
              {
                icon: <Clock className="w-6 h-6" />,
                title: "Instant Policy",
                desc: "Get your policy document in your inbox in under 5 minutes.",
                color: "from-sky-600 to-blue-500",
              },
              {
                icon: <PhoneCall className="w-6 h-6" />,
                title: "Claims Support",
                desc: "Dedicated claims advisor available 24×7 to guide you through.",
                color: "from-emerald-600 to-teal-500",
              },
              {
                icon: <IndianRupee className="w-6 h-6" />,
                title: "Best Price",
                desc: "Get the same plan at lower premium. Price-match guaranteed.",
                color: "from-violet-600 to-purple-500",
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white mb-4 shadow-md`}
                >
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-base">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-6">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-20 overflow-hidden bg-[linear-gradient(135deg,#0c1f17_0%,#123d2a_40%,#1A5F3D_70%,#2D7A4E_100%)] text-white">
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-[45%] h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3FAF7D]/15 blur-[100px]" />
        </div>
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.25)_1px,transparent_1px)] [background-size:40px_40px]" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-block rounded-[28px] border border-white/15 bg-white/10 backdrop-blur-xl px-8 py-10 shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-[-0.02em]">
              Not sure which plan fits you?
            </h2>
            <p className="text-lg mb-8 text-white/80 leading-8">
              Talk to our insurance advisor — free consultation, no obligations.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/planner"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#D8F46B] text-black font-semibold shadow-[0_10px_30px_rgba(184,233,134,0.35)] hover:scale-105 transition-all"
              >
                Get Free Advice
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/services"
                className="px-8 py-4 rounded-full border border-white/20 bg-white/10 text-white font-semibold hover:bg-white hover:text-[#1A5F3D] transition-all"
              >
                All Services
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// ─── Insurance Expandable Card Component ─────────────────────────────────────

function InsuranceCard({
  ins,
  index,
  expanded,
  onToggle,
}: {
  ins: (typeof insuranceTypes)[0];
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      className={`rounded-2xl border bg-white shadow-sm transition-all duration-300 overflow-hidden
        ${expanded ? "shadow-lg ring-2 ring-[#1A5F3D]/20" : "hover:shadow-md"}
        ${ins.borderColor}`}
    >
      {/* ── Card Header ── */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between px-6 py-5 md:px-7 md:py-6">
          {/* Left: icon + text */}
          <div className="flex items-center gap-5">
            <div
              className={`flex-shrink-0 w-13 h-13 w-[52px] h-[52px] rounded-xl bg-gradient-to-br ${ins.accent} flex items-center justify-center text-white shadow-md`}
            >
              {ins.icon}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                  {ins.title}
                </h3>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${ins.badgeColor}`}
                >
                  {ins.highlight}
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-5">{ins.subtitle}</p>
            </div>
          </div>

          {/* Right: premium + toggle */}
          <div className="flex items-center gap-5 shrink-0 ml-4">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-gray-400 mb-0.5">Starting from</p>
              <p className="text-base font-bold text-gray-900">
                {ins.startingPremium}
              </p>
              <p className="text-xs text-gray-400">{ins.coverAmount}</p>
            </div>

            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0
                ${expanded ? "bg-[#1A5F3D] text-white" : "bg-gray-100 text-gray-500"}`}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </div>
        </div>
      </button>

      {/* ── Expanded Content ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div
              className={`mx-5 md:mx-6 mb-6 rounded-xl bg-gradient-to-br ${ins.softBg} p-5 border ${ins.borderColor}`}
            >
              {/* Tagline */}
              <p className="text-sm font-semibold text-gray-700 mb-5 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#1A5F3D] flex-shrink-0" />
                {ins.tagline}
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Key Features */}
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                    What's Covered
                  </h4>
                  <div className="space-y-2.5">
                    {ins.keyFeatures.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <CheckCircle className="w-4 h-4 text-[#1A5F3D] mt-0.5 shrink-0" />
                        <span className="text-sm text-gray-700 leading-5">
                          {feat}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plans */}
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                    Available Plans
                  </h4>
                  <div className="space-y-2">
                    {ins.plans.map((plan, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl bg-white/80 border border-white px-4 py-3 shadow-sm"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-800 leading-tight">
                            {plan.name}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Cover: {plan.cover}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-[#1A5F3D]">
                          {plan.premium}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Rating */}
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= Math.floor(ins.rating)
                              ? "text-amber-400 fill-amber-400"
                              : "text-gray-200 fill-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      {ins.rating}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({ins.reviews} reviews)
                    </span>
                  </div>

                  {/* CTA */}
                  <div className="mt-4 flex gap-3">
                    <Link
                      to="/signup"
                      onClick={(e) => e.stopPropagation()}
                      className={`flex-1 text-center py-2.5 rounded-xl bg-gradient-to-br ${ins.accent} text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-all`}
                    >
                      Get Quote
                    </Link>
                    <Link
                      to="/planner"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-center py-2.5 rounded-xl border-2 border-[#1A5F3D] text-[#1A5F3D] text-sm font-semibold hover:bg-[#1A5F3D] hover:text-white transition-all"
                    >
                      Talk to Advisor
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}