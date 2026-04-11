import { Link } from "react-router";
import {
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { useLanguage } from "../LanguageContext";

export function Footer() {
  const { t } = useLanguage();
  const footer = t.footer;

  return (
    <footer className="relative z-20 bg-[#0f172a] text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Company Info */}
          <div>
            <Link
              to="/"
              className="flex items-center space-x-3 mb-4"
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

            <p className="text-sm text-gray-400 mb-5 leading-6">
              {footer.description}
            </p>

            <div className="flex space-x-3">
              <SocialIcon
                href="https://www.facebook.com/"
                label="Facebook"
                icon={<Facebook className="w-5 h-5" />}
              />
              <SocialIcon
                href="https://x.com/"
                label="Twitter"
                icon={<Twitter className="w-5 h-5" />}
              />
              <SocialIcon
                href="https://www.linkedin.com/"
                label="LinkedIn"
                icon={<Linkedin className="w-5 h-5" />}
              />
              <SocialIcon
                href="https://www.instagram.com/?hl=en"
                label="Instagram"
                icon={<Instagram className="w-5 h-5" />}
              />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">
              {footer.quickLinks}
            </h3>
            <ul className="space-y-3">
              <FooterLink to="/">{footer.home}</FooterLink>
              <FooterLink to="/services">
                {footer.services}
              </FooterLink>
              <FooterLink to="/planner">
                {footer.planner}
              </FooterLink>
              <FooterLink to="/webinars">
                {footer.webinars}
              </FooterLink>
            </ul>
          </div>

          {/* Calculators */}
          <div>
            <h3 className="font-semibold text-white mb-4">
              {footer.calculators}
            </h3>
            <ul className="space-y-3">
              <FooterLink to="/calculator/sip">
                {footer.sip}
              </FooterLink>
              <FooterLink to="/calculator/lumpsum">
                {footer.lumpsum}
              </FooterLink>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold text-white mb-4">
              {footer.contact}
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3 text-sm">
                <Mail className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#3FAF7D]" />
                <a
                  href="mailto:magadumsandip@gmail.com"
                  className="hover:text-white transition-colors"
                >
                  magadumsandip@gmail.com
                </a>
              </li>

              <li className="flex items-start space-x-3 text-sm">
                <Phone className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#3FAF7D]" />
                <a
                  href="tel:+918975290538"
                  className="hover:text-white transition-colors"
                >
                  +91 8975290538
                </a>
              </li>

              <li className="flex items-start space-x-3 text-sm">
                <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#3FAF7D]" />
                <a
                  href="https://www.google.com/maps/place/Annasaheb+Dange+College+of+Engineering+and+Technology,+Ashta/@16.9397989,74.4144778,762m/data=!3m1!1e3!4m10!1m2!2m1!1sAnnasaheb+dange+college!3m6!1s0x3bc111c2d044fb39:0x88bc2b178525ba1e!8m2!3d16.9403781!4d74.4163838!15sChdBbm5hc2FoZWIgZGFuZ2UgY29sbGVnZZIBEmVuZ2luZWVyaW5nX3NjaG9vbOABAA!16s%2Fm%2F0gwyyby?entry=ttu&g_ep=EgoyMDI2MDMxOC4xIKXMDSoASAFQAw%3D%3D"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Annasaheb Dange College of Engineering and
                  Technology, Ashta
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 text-center text-sm text-gray-400">
          <p>{footer.copyright}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        to={to}
        className="text-sm text-gray-300 hover:text-[#3FAF7D] transition-colors"
      >
        {children}
      </Link>
    </li>
  );
}

function SocialIcon({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#1A5F3D] hover:text-white transition-all"
    >
      {icon}
    </a>
  );
}
