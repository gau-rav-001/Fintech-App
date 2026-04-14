import { Link } from "react-router";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { useAuth } from "../auth/AuthContext";
import { ServiceCarousel, type ServiceItem } from "../components/ServiceCarousel";
import Testimonials from "./Testimonials";
import {
  TrendingUp,
  Shield,
  Target,
  PieChart,
  Calculator,
  Users,
  Video,
  MessageCircle,
  ArrowRight,
  CheckCircle,
  BarChart3,
  ShieldCheck,
  Briefcase,
} from "lucide-react";
import { motion } from "motion/react";
import { useLanguage } from "../LanguageContext";

export function Home() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const ctaTarget = isAuthenticated ? "/dashboard" : "/signup";
  const home = t.home;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 md:pb-32">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#050505_0%,#0b0f0d_22%,#0f241a_42%,#dfe9e4_78%,#ffffff_100%)]" />

        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-[38%] h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2D7A4E]/30 blur-[140px]" />
          <div className="absolute left-[58%] top-[34%] h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#B8E986]/20 blur-[100px]" />
          <div className="absolute left-[32%] top-[30%] h-[220px] w-[220px] rounded-full bg-[#1A5F3D]/20 blur-[90px]" />
        </div>

        <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:52px_52px]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/70 via-white/30 to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-14 items-center min-h-[720px]">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65 }}
              className="pt-6"
            >
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur mb-6">
                <span className="mr-2 h-2 w-2 rounded-full bg-[#B8E986]" />
                {home.heroBadge}
              </div>

              <h1 className="text-5xl md:text-6xl xl:text-7xl font-bold tracking-tight text-white leading-[1.05] mb-6 max-w-3xl">
                {home.heroTitleStart}{" "}
                <span className="bg-gradient-to-r from-[#B8E986] via-[#DDF8A8] to-white bg-clip-text text-transparent">
                  {home.heroTitleHighlight}
                </span>
              </h1>

              <p className="text-lg md:text-xl text-white/72 max-w-2xl leading-8 mb-8">
                {home.heroDescription}
              </p>

              <div className="flex flex-wrap gap-4 mb-10">
                <Link
                  to={ctaTarget}
                  className="inline-flex items-center px-8 py-4 rounded-full bg-[#D8F46B] text-black font-semibold hover:scale-[1.02] hover:shadow-xl transition-all"
                >
                  {isAuthenticated ? "Go to Dashboard" : home.heroPrimaryCta}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>

                <Link
                  to="/calculator/sip"
                  className="inline-flex items-center px-8 py-4 rounded-full border border-white/15 bg-white/5 text-white font-semibold backdrop-blur hover:bg-white/10 transition-all"
                >
                  {home.heroSecondaryCta}
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-6 max-w-xl mt-2 md:mt-4">
                <StatCardDark number="10K+" label={home.statUsers} />
                <StatCardDark number="₹500Cr+" label={home.statAssets} />
                <StatCardDark number="98%" label={home.statSatisfaction} />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.65, delay: 0.15 }}
              className="relative"
            >
              <div className="relative rounded-[32px] border border-white/10 bg-white/8 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.35)] overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(184,233,134,0.12),transparent_35%)]" />

                <div className="p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-sm text-white/65">
                        {home.portfolioValue}
                      </p>
                      <p className="text-3xl font-bold text-white">
                        ₹12,45,000
                      </p>
                    </div>

                    <div className="flex items-center rounded-full bg-[#D8F46B]/15 border border-[#D8F46B]/20 px-4 py-2 text-[#D8F46B]">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      <span className="font-semibold">+12.5%</span>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-white/25 bg-[linear-gradient(135deg,rgba(10,24,18,0.98),rgba(20,78,48,0.94),rgba(120,160,140,0.10))] p-6 min-h-[360px] relative overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                    <div className="absolute inset-0 opacity-[0.10] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:34px_34px]" />
                    <div className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 bg-gradient-to-br from-transparent via-[#0f2f22]/40 to-[#0b1f17]/70 blur-2xl" />

                    <div className="relative z-10 flex items-start justify-between">
                      <div>
                        <p className="text-white/70 text-sm mb-2">
                          {home.wealthOverview}
                        </p>
                        <h3 className="text-white text-2xl font-bold mb-3">
                          {home.stableGrowth}
                        </h3>
                        <p className="text-white/65 text-sm max-w-xs leading-6">
                          {home.stableGrowthDesc}
                        </p>
                      </div>

                      <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.18)]">
                        <BarChart3 className="w-7 h-7 text-white/80" />
                      </div>
                    </div>

                    <div className="relative z-10 mt-8 grid grid-cols-2 gap-4">
                      <MetricGlassCard
                        label={home.monthlySip}
                        value="₹15,000"
                      />
                      <MetricGlassCard
                        label={home.yearlyGrowth}
                        value="+18.2%"
                      />
                    </div>

                    <div className="relative z-10 mt-4 grid grid-cols-2 gap-4">
                      <MetricGlassCard
                        label={home.retirementGoal}
                        value="₹1.2Cr"
                      />
                      <MetricGlassCard
                        label={home.emergencyFund}
                        value="₹3.5L"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-6 -left-6 hidden md:block rounded-2xl border border-[#D1FADF] bg-white shadow-xl p-4">
                <p className="text-xs text-gray-500 mb-1">
                  {home.monthlySip}
                </p>
                <p className="text-xl font-bold text-gray-900">
                  ₹15,000
                </p>
              </div>

              <div className="absolute -top-6 right-6 hidden md:flex items-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur px-4 py-3 text-white shadow-lg">
                <CheckCircle className="w-5 h-5 text-[#D8F46B] mr-2" />
                {home.secureGuided}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="relative py-24 overflow-hidden bg-[radial-gradient(circle_at_top,rgba(63,175,125,0.10),transparent_30%),linear-gradient(to_bottom,#f8fbf9,#eef5f1_45%,#ffffff_100%)]">
        <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(26,95,61,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(26,95,61,0.05)_1px,transparent_1px)] [background-size:36px_36px]" />
        <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-[#B8E986]/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-[#3FAF7D]/10 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center rounded-full border border-[#d7eadf] bg-white/70 backdrop-blur px-4 py-2 text-sm font-medium text-[#1A5F3D] mb-5">
              {home.servicesBadge}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-[-0.03em]">
              {home.servicesTitle}
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-8">
              {home.servicesDescription}
            </p>
          </div>
        </div>

        {/* ── Full-bleed carousel (no max-w constraint) ── */}
        <ServiceCarousel
          speed={0.5}
          services={[
            {
              slug: "investment-planning",
              icon: <Target className="w-7 h-7" />,
              title: home.serviceInvestmentPlanning,
              description: home.serviceInvestmentPlanningDesc,
              link: "/services",
              cta: home.learnMore,
            },
            {
              slug: "risk-management",
              icon: <Shield className="w-7 h-7" />,
              title: home.serviceRiskManagement,
              description: home.serviceRiskManagementDesc,
              link: "/services",
              cta: home.learnMore,
            },
            {
              slug: "portfolio-management",
              icon: <PieChart className="w-7 h-7" />,
              title: home.servicePortfolioManagement,
              description: home.servicePortfolioManagementDesc,
              link: "/services",
              cta: home.learnMore,
            },
            {
              slug: "wealth-growth",
              icon: <TrendingUp className="w-7 h-7" />,
              title: home.serviceWealthGrowth,
              description: home.serviceWealthGrowthDesc,
              link: "/services",
              cta: home.learnMore,
            },
            {
              slug: "tax-planning",
              icon: <Calculator className="w-7 h-7" />,
              title: home.serviceTaxPlanning,
              description: home.serviceTaxPlanningDesc,
              link: "/services",
              cta: home.learnMore,
            },
            {
              slug: "expert-guidance",
              icon: <Users className="w-7 h-7" />,
              title: home.serviceExpertGuidance,
              description: home.serviceExpertGuidanceDesc,
              link: "/services",
              cta: home.learnMore,
            },
            {
              slug: "retirement-planning",
              icon: <Briefcase className="w-7 h-7" />,
              title: "Retirement Planning",
              description: "Secure your golden years with personalised corpus plans, pension strategy, and healthcare coverage.",
              link: "/services",
              cta: home.learnMore,
            },
            {
              slug: "insurance",
              icon: <ShieldCheck className="w-7 h-7" />,
              title: "Insurance",
              description: "Health, life, vehicle, home and business — comprehensive coverage starting at ₹299/month.",
              link: "/insurance",
              cta: home.learnMore,
            },
          ] satisfies ServiceItem[]}
        />

        {/* View all link */}
        <div className="flex justify-center mt-10">
          <Link
            to="/services"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-[#1A5F3D] text-[#1A5F3D] font-semibold hover:bg-[#1A5F3D] hover:text-white transition-all"
          >
            View All Services
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Calculator Preview */}
      <section className="relative py-24 overflow-hidden bg-[radial-gradient(circle_at_top,rgba(63,175,125,0.10),transparent_28%),linear-gradient(to_bottom,#f8fbf9,#eef5f1_45%,#ffffff_100%)]">
        <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(26,95,61,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(26,95,61,0.05)_1px,transparent_1px)] [background-size:36px_36px]" />
        <div className="absolute top-0 right-1/4 h-72 w-72 rounded-full bg-[#B8E986]/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-[#3FAF7D]/10 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center rounded-full border border-[#d7eadf] bg-white/70 backdrop-blur px-4 py-2 text-sm font-medium text-[#1A5F3D] mb-5">
              {home.calculatorsBadge}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-[-0.03em]">
              {home.calculatorsTitle}
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-8">
              {home.calculatorsDescription}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <CalculatorPreview
              title={home.sipCalculator}
              description={home.sipCalculatorDesc}
              link="/calculator/sip"
              cta={home.tryNow}
            />
            <CalculatorPreview
              title={home.lumpsumCalculator}
              description={home.lumpsumCalculatorDesc}
              link="/calculator/lumpsum"
              cta={home.tryNow}
            />
          </div>
        </div>
      </section>

      {/* Financial Planning Preview */}
      <section className="relative py-24 overflow-hidden bg-[linear-gradient(to_bottom,#ffffff_0%,#f4faf7_30%,#eaf5ef_60%,#ffffff_100%)]">
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-[40%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3FAF7D]/15 blur-[120px]" />
          <div className="absolute left-[30%] top-[30%] h-[220px] w-[220px] rounded-full bg-[#1A5F3D]/10 blur-[90px]" />
          <div className="absolute right-[25%] bottom-[20%] h-[240px] w-[240px] rounded-full bg-[#B8E986]/20 blur-[100px]" />
        </div>

        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(26,95,61,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(26,95,61,0.3)_1px,transparent_1px)] [background-size:40px_40px]" />
        <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-[#B8E986]/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-[#3FAF7D]/10 blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center rounded-full border border-[#d7eadf] bg-[#f6fbf8] px-4 py-2 text-sm font-medium text-[#1A5F3D] mb-5">
                {home.planningBadge}
              </div>

              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-[-0.03em]">
                {home.planningTitle}
              </h2>

              <p className="text-lg md:text-xl text-gray-600 mb-8 leading-8">
                {home.planningDescription}
              </p>

              <div className="space-y-4 mb-8">
                <Feature text={home.planningFeature1} />
                <Feature text={home.planningFeature2} />
                <Feature text={home.planningFeature3} />
                <Feature text={home.planningFeature4} />
              </div>

              <Link
                to="/planner"
                className="inline-flex items-center px-7 py-3.5 bg-gradient-to-r from-[#1A5F3D] to-[#2D7A4E] text-white rounded-full font-semibold hover:shadow-[0_12px_30px_rgba(26,95,61,0.25)] transition-all"
              >
                {home.startPlanning}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>

            <div className="relative overflow-hidden rounded-[32px] border border-white/60 bg-[linear-gradient(135deg,#1A5F3D,#2D7A4E,#3FAF7D)] p-10 text-white shadow-[0_20px_60px_rgba(26,95,61,0.18)]">
              <div className="absolute inset-0 opacity-[0.15] [background-image:linear-gradient(rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.25)_1px,transparent_1px)] [background-size:34px_34px]" />
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-[#B8E986]/20 blur-3xl" />

              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-6">
                  {home.whatYoullGet}
                </h3>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <CheckCircle className="w-6 h-6 mr-3 flex-shrink-0 mt-1 text-[#D8F46B]" />
                    <span>{home.planningBenefit1}</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-6 h-6 mr-3 flex-shrink-0 mt-1 text-[#D8F46B]" />
                    <span>{home.planningBenefit2}</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-6 h-6 mr-3 flex-shrink-0 mt-1 text-[#D8F46B]" />
                    <span>{home.planningBenefit3}</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-6 h-6 mr-3 flex-shrink-0 mt-1 text-[#D8F46B]" />
                    <span>{home.planningBenefit4}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Webinars Highlight */}
      <section className="relative py-24 overflow-hidden bg-[linear-gradient(to_bottom,#ffffff_0%,#f4faf7_30%,#eaf5ef_60%,#ffffff_100%)]">
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-[35%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3FAF7D]/15 blur-[120px]" />
          <div className="absolute left-[25%] top-[25%] h-[200px] w-[200px] rounded-full bg-[#1A5F3D]/10 blur-[90px]" />
          <div className="absolute right-[20%] bottom-[20%] h-[240px] w-[240px] rounded-full bg-[#B8E986]/20 blur-[100px]" />
        </div>

        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(26,95,61,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(26,95,61,0.3)_1px,transparent_1px)] [background-size:40px_40px]" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {home.webinarsTitle}
            </h2>
            <p className="text-xl text-gray-600">
              {home.webinarsDescription}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <WebinarCard
              title={home.webinar1Title}
              date={home.webinar1Date}
              speaker={home.webinarSpeaker1}
              byLabel={home.webinarSpeakerBy}
            />
            <WebinarCard
              title={home.webinar2Title}
              date={home.webinar2Date}
              speaker={home.webinarSpeaker2}
              byLabel={home.webinarSpeakerBy}
            />
            <WebinarCard
              title={home.webinar3Title}
              date={home.webinar3Date}
              speaker={home.webinarSpeaker3}
              byLabel={home.webinarSpeakerBy}
            />
          </div>

          <div className="text-center mt-12">
            <Link
              to="/webinars"
              className="inline-flex items-center px-6 py-3 border-2 border-[#1A5F3D] text-[#1A5F3D] rounded-xl font-semibold hover:bg-[#1A5F3D] hover:text-white transition-all"
            >
              {home.viewAllWebinars}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
        <Testimonials />      

      {/* WhatsApp CTA */}
      <section className="relative py-16 overflow-hidden bg-[linear-gradient(135deg,#0c1f17_0%,#123d2a_40%,#1A5F3D_70%,#2D7A4E_100%)]">
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-[45%] h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3FAF7D]/15 blur-[100px]" />
        </div>

        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.25)_1px,transparent_1px)] [background-size:40px_40px]" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-block rounded-[28px] border border-white/15 bg-white/10 backdrop-blur-xl px-8 py-8 shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
            <MessageCircle className="w-12 h-12 text-white mx-auto mb-4" />

            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-[-0.03em]">
              {home.whatsappTitle}
            </h2>

            <p className="text-base md:text-lg text-white/80 mb-6 max-w-xl mx-auto leading-7">
              {home.whatsappDescription}
            </p>

            <a
              href="https://wa.me/1234567890"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-7 py-3 rounded-full bg-[#D8F46B] text-black font-semibold shadow-[0_10px_30px_rgba(184,233,134,0.35)] hover:scale-105 hover:shadow-[0_15px_40px_rgba(184,233,134,0.45)] transition-all"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              {home.whatsappCta}
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function StatCardDark({
  number,
  label,
}: {
  number: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/20 bg-black/20 backdrop-blur-md px-5 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
      <p className="text-2xl font-bold text-white">{number}</p>
      <p className="text-sm text-white/80">{label}</p>
    </div>
  );
}

function MetricGlassCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/[0.06] backdrop-blur-md p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:bg-white/[0.08] transition-all duration-300">
      <p className="text-sm text-white/70 mb-1">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function CalculatorPreview({
  title,
  description,
  link,
  cta,
}: {
  title: string;
  description: string;
  link: string;
  cta: string;
}) {
  return (
    <Link to={link} className="block">
      <motion.div
        whileHover={{ y: -8 }}
        transition={{ duration: 0.3 }}
        className="group relative overflow-hidden rounded-[28px] border border-white/60 bg-white/55 backdrop-blur-xl p-8 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all duration-500 hover:border-[#d8f46b]/70 hover:shadow-[0_20px_60px_rgba(26,95,61,0.14)]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/75 to-transparent opacity-80" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#B8E986]/20 blur-3xl opacity-0 transition duration-500 group-hover:opacity-100" />
        <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/50" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#1A5F3D]/[0.03] via-transparent to-[#B8E986]/[0.10] opacity-0 transition duration-500 group-hover:opacity-100" />

        <div className="relative z-10">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] text-white shadow-[0_10px_25px_rgba(26,95,61,0.28)] transition duration-500 group-hover:scale-110 group-hover:rotate-[-3deg]">
            <Calculator className="w-8 h-8" />
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-[-0.02em]">
            {title}
          </h3>

          <p className="text-base leading-7 text-gray-600 mb-6">
            {description}
          </p>

          <span className="inline-flex items-center gap-2 rounded-full bg-[#eef8f2] px-4 py-2 text-sm font-semibold text-[#1A5F3D] transition-all duration-300 group-hover:bg-[#1A5F3D] group-hover:text-white">
            {cta}
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center">
      <CheckCircle className="w-6 h-6 text-[#1A5F3D] mr-3" />
      <span className="text-gray-700">{text}</span>
    </div>
  );
}

function WebinarCard({
  title,
  date,
  speaker,
  byLabel,
}: {
  title: string;
  date: string;
  speaker: string;
  byLabel: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -8 }}
      className="group relative overflow-hidden rounded-[28px] border border-white/60 bg-white/50 backdrop-blur-xl shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-all duration-500 hover:shadow-[0_20px_60px_rgba(26,95,61,0.15)]"
    >
      <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-[#B8E986]/20 blur-3xl opacity-0 group-hover:opacity-100 transition duration-500" />

      <div className="relative h-48 bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-[0.2] [background-image:linear-gradient(rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.25)_1px,transparent_1px)] [background-size:30px_30px]" />
        <Video className="w-16 h-16 text-white/50 relative z-10 group-hover:scale-110 transition" />
      </div>

      <div className="p-6">
        <h3 className="font-bold text-gray-900 mb-2 text-lg">
          {title}
        </h3>
        <p className="text-sm text-gray-600 mb-1">{date}</p>
        <p className="text-sm text-gray-600">
          {byLabel} {speaker}
        </p>
      </div>
    </motion.div>
  );
}