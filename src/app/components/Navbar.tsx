import { Link, useLocation, useNavigate } from "react-router";
import { Menu, X, ChevronDown, Globe, LayoutDashboard, Settings, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../LanguageContext";
import { useAuth } from "../auth/AuthContext";
import { getUserProfile } from "../data/userProfile";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [calculatorsOpen, setCalculatorsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const { language, setLanguage, t, languageOptions } =
    useLanguage();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const location = useLocation();
  const calculatorsRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Get profile avatar
  const up = user ? getUserProfile(user.id) : null;
  const avatarUrl = up?.personal.avatarDataUrl || user?.avatar;
  const displayName = up?.personal.fullName || user?.name || "Account";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const selectedLanguageLabel =
    languageOptions.find((item) => item.code === language)
      ?.label ?? "English";

  const isActive = (path: string) => location.pathname === path;
  const calculatorsActive =
    isActive("/calculator/sip") ||
    isActive("/calculator/lumpsum");

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }

  useEffect(() => {
    setMobileMenuOpen(false);
    setCalculatorsOpen(false);
    setLanguageOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calculatorsRef.current &&
        !calculatorsRef.current.contains(event.target as Node)
      ) {
        setCalculatorsOpen(false);
      }

      if (
        languageRef.current &&
        !languageRef.current.contains(event.target as Node)
      ) {
        setLanguageOpen(false);
      }

      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
  }, []);

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 24);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () =>
      window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Desktop Floating Glass Navbar */}
      <div className="hidden md:block fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <nav
          className={`rounded-full border backdrop-blur-2xl transition-all duration-300 ${
            isScrolled
              ? "border-white/25 bg-[#0f172a]/72 shadow-[0_14px_44px_rgba(0,0,0,0.34)]"
              : "border-white/20 bg-[#0f172a]/55 shadow-[0_12px_40px_rgba(0,0,0,0.28)]"
          }`}
        >
          <div className="flex items-center gap-2 px-3 py-2">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 rounded-full px-2 py-1"
            >
              <div className="relative w-6 h-6">
                <span className="absolute left-0 top-0 h-1 w-6 rounded-full bg-[#B8E55C]" />
                <span className="absolute left-1 top-2 h-1 w-4 rounded-full bg-[#8EDB63]" />
                <span className="absolute left-2 top-4 h-1 w-3 rounded-full bg-[#52C56B]" />
                <span className="absolute left-0 top-2 h-1 w-1 rounded-full bg-[#8EDB63]" />
                <span className="absolute left-0 top-4 h-1 w-1 rounded-full bg-[#52C56B]" />
                <span className="absolute left-0 top-6 h-1 w-1 rounded-full bg-[#2FAE5F]" />
              </div>

              <span className="text-[20px] font-semibold tracking-[-0.02em] leading-none">
                <span className="text-white">Fin</span>
                <span className="text-[#9DDB63]">Tech</span>
              </span>
            </Link>

            {/* Desktop Menu */}
            <div className="flex items-center gap-1">
              <NavLink to="/" active={isActive("/")}>
                {t.navbar.home}
              </NavLink>

              <NavLink
                to="/services"
                active={isActive("/services")}
              >
                {t.navbar.services}
              </NavLink>

              {/* Calculators Dropdown */}
              <div className="relative" ref={calculatorsRef}>
                <button
                  type="button"
                  onClick={() =>
                    setCalculatorsOpen((prev) => !prev)
                  }
                  className={`px-4 py-2 rounded-full transition-all flex items-center gap-1 text-sm ${
                    calculatorsActive
                      ? "text-white bg-white/12"
                      : "text-white/75 hover:text-white hover:bg-white/8"
                  }`}
                >
                  <span>{t.navbar.calculators}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      calculatorsOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {calculatorsOpen && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        y: -8,
                        scale: 0.98,
                      }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                      className="absolute z-[100] top-full left-1/2 -translate-x-1/2 mt-3 w-52 rounded-2xl border border-[#1d3b30] bg-[#0f172a]/96 backdrop-blur-2xl shadow-[0_18px_45px_rgba(0,0,0,0.38)] overflow-hidden"
                    >
                      <Link
                        to="/calculator/sip"
                        className="block px-5 py-3.5 text-[15px] font-medium text-white/90 hover:text-white hover:bg-white/8 transition-colors"
                        onClick={() =>
                          setCalculatorsOpen(false)
                        }
                      >
                        {t.navbar.sipCalculator}
                      </Link>
                      <Link
                        to="/calculator/lumpsum"
                        className="block px-5 py-3.5 text-[15px] font-medium text-white/90 hover:text-white hover:bg-white/8 transition-colors"
                        onClick={() =>
                          setCalculatorsOpen(false)
                        }
                      >
                        {t.navbar.lumpsumCalculator}
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <NavLink
                to="/planner"
                active={isActive("/planner")}
              >
                {t.navbar.planner}
              </NavLink>

              <NavLink
                to="/webinars"
                active={isActive("/webinars")}
              >
                {t.navbar.webinars}
              </NavLink>
            </div>

            {/* Desktop CTA + Language */}
            <div className="flex items-center gap-2 ml-1">
              <div className="relative" ref={languageRef}>
                <button
                  type="button"
                  onClick={() =>
                    setLanguageOpen((prev) => !prev)
                  }
                  className="inline-flex min-w-[124px] items-center justify-between gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/8 text-sm text-white/90 hover:text-white hover:bg-white/12 transition-all backdrop-blur"
                >
                  <span className="inline-flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>{selectedLanguageLabel}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      languageOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {languageOpen && (
                    <motion.div
                      initial={{
                        opacity: 0,
                        y: -8,
                        scale: 0.98,
                      }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                      className="absolute z-[100] top-full right-0 mt-3 w-52 rounded-2xl border border-[#1d3b30] bg-[#0f172a]/96 backdrop-blur-2xl shadow-[0_18px_45px_rgba(0,0,0,0.38)] overflow-hidden"
                    >
                      {languageOptions.map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            setLanguage(lang.code);
                            setLanguageOpen(false);
                          }}
                          className={`w-full text-left px-5 py-3.5 text-[15px] font-medium transition-colors ${
                            language === lang.code
                              ? "text-white bg-white/10"
                              : "text-white/90 hover:text-white hover:bg-white/8"
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {isAuthenticated ? (
                /* ── Logged-in: avatar dropdown ── */
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(v => !v)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-white/10 transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center text-white text-xs font-bold overflow-hidden border-2 border-white/20">
                      {avatarUrl
                        ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                        : initials}
                    </div>
                    <span className="text-sm text-white/80 max-w-[80px] truncate hidden lg:block">{displayName.split(" ")[0]}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-white/50 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                      >
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-xs font-semibold text-gray-800 truncate">{displayName}</p>
                          <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                        </div>
                        <div className="py-1">
                          <Link to="/dashboard" onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <LayoutDashboard className="w-4 h-4 text-[#1A5F3D]" /> Dashboard
                          </Link>
                          <Link to="/settings" onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <Settings className="w-4 h-4 text-[#1A5F3D]" /> Settings
                          </Link>
                          <button onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                            <LogOut className="w-4 h-4" /> Logout
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                /* ── Guest: login + signup ── */
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 rounded-full text-sm text-white/75 hover:text-white hover:bg-white/8 transition-all"
                  >
                    {t.navbar.login}
                  </Link>
                  <Link
                    to="/signup"
                    className="px-5 py-2 rounded-full bg-[#D8F46B] text-black text-sm font-semibold shadow-[0_8px_25px_rgba(184,233,134,0.35)] hover:scale-[1.03] transition-all"
                  >
                    {t.navbar.getStarted}
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      </div>

      {/* Mobile Navbar */}
      <nav
        className={`md:hidden sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl transition-all duration-300 ${
          isScrolled ? "bg-[#0f172a]/95" : "bg-[#0f172a]/90"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link
              to="/"
              className="flex items-center gap-2"
            >
              <div className="relative w-6 h-6">
                <span className="absolute left-0 top-0 h-1 w-6 rounded-full bg-[#B8E55C]" />
                <span className="absolute left-1 top-2 h-1 w-4 rounded-full bg-[#8EDB63]" />
                <span className="absolute left-2 top-4 h-1 w-3 rounded-full bg-[#52C56B]" />
                <span className="absolute left-0 top-2 h-1 w-1 rounded-full bg-[#8EDB63]" />
                <span className="absolute left-0 top-4 h-1 w-1 rounded-full bg-[#52C56B]" />
                <span className="absolute left-0 top-6 h-1 w-1 rounded-full bg-[#2FAE5F]" />
              </div>
              <span className="text-[20px] font-semibold tracking-[-0.02em] leading-none">
                <span className="text-white">Fin</span>
                <span className="text-[#9DDB63]">Tech</span>
              </span>
            </Link>

            <button
              className="p-2 text-white"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              type="button"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-white/10 bg-[#0f172a]/95 backdrop-blur-xl overflow-hidden"
            >
              <div className="px-4 py-4 space-y-2">
                <MobileNavLink
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.navbar.home}
                </MobileNavLink>

                <MobileNavLink
                  to="/services"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.navbar.services}
                </MobileNavLink>

                <MobileNavLink
                  to="/calculator/sip"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.navbar.sipCalculator}
                </MobileNavLink>

                <MobileNavLink
                  to="/calculator/lumpsum"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.navbar.lumpsumCalculator}
                </MobileNavLink>

                <MobileNavLink
                  to="/planner"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.navbar.planner}
                </MobileNavLink>

                <MobileNavLink
                  to="/webinars"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.navbar.webinars}
                </MobileNavLink>

                {/* Mobile Language */}
                <div className="pt-3">
                  <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                    {t.navbar.language}
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    {languageOptions.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setLanguage(lang.code)}
                        className={`px-4 py-3 rounded-xl text-sm transition-all ${
                          language === lang.code
                            ? "bg-white/12 text-white border border-white/15"
                            : "bg-white/5 text-white/80 border border-white/10"
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  {isAuthenticated ? (
                    <>
                      {/* Logged-in user info */}
                      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/8 border border-white/10 mb-2">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                          {avatarUrl
                            ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                            : initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                          <p className="text-xs text-white/50 truncate">{user?.email}</p>
                        </div>
                      </div>
                      <Link to="/dashboard"
                        className="flex items-center gap-3 w-full px-4 py-3 border border-white/15 text-white rounded-xl bg-white/5"
                        onClick={() => setMobileMenuOpen(false)}>
                        <LayoutDashboard className="w-4 h-4 text-[#B8E986]" /> Dashboard
                      </Link>
                      <Link to="/settings"
                        className="flex items-center gap-3 w-full px-4 py-3 border border-white/15 text-white rounded-xl bg-white/5"
                        onClick={() => setMobileMenuOpen(false)}>
                        <Settings className="w-4 h-4 text-[#B8E986]" /> Settings
                      </Link>
                      <button onClick={handleLogout}
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-red-500/15 border border-red-400/30 text-red-400 rounded-xl font-semibold">
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        className="block w-full px-4 py-3 text-center border border-white/15 text-white rounded-xl bg-white/5"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {t.navbar.login}
                      </Link>
                      <Link
                        to="/signup"
                        className="block w-full px-4 py-3 text-center bg-[#D8F46B] text-black rounded-xl font-semibold"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {t.navbar.getStarted}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}

function NavLink({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-full text-sm transition-all ${
        active
          ? "text-white bg-white/12"
          : "text-white/75 hover:text-white hover:bg-white/8"
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  to,
  onClick,
  children,
}: {
  to: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="block px-4 py-3 rounded-xl text-white/85 hover:text-white hover:bg-white/8 transition-colors"
      onClick={onClick}
    >
      {children}
    </Link>
  );
}