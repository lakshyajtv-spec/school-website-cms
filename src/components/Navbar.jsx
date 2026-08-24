import { useEffect, useState } from "react";
import { Menu, X, Contrast, Globe, LogIn, Home, Users, Image as ImageIcon, FileText, Phone, Info, GraduationCap } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { Link } from "./Link.jsx";

const NAV_LINKS = [
  { href: "#home",     label: { en: "Home",     hi: "मुख्य पृष्ठ" }, icon: Home },
  { href: "#about",    label: { en: "About",    hi: "परिचय" },      icon: Info },
  { href: "#staff",    label: { en: "Staff",    hi: "शिक्षक" },     icon: Users },
  { href: "#gallery",  label: { en: "Gallery",  hi: "दीर्घा" },     icon: ImageIcon },
  { href: "#notices",  label: { en: "Notices",  hi: "सूचनाएँ" },    icon: FileText },
  { href: "#contact",  label: { en: "Contact",  hi: "संपर्क" },     icon: Phone },
];

export default function Navbar() {
  const { highContrast, toggleContrast, lang, setLang } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const t = (obj) => obj[lang] || obj.en;

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Top saffron stripe */}
      <div className="tricolor-stripe" />
      {/* Gov.in style thin top bar */}
      <div className="hidden bg-gov-900 text-white/90 md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-xs">
          <div className="flex items-center gap-3 font-heading tracking-wide">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gold-300/60 text-gold-300">
              <GraduationCap className="h-3 w-3" />
            </span>
            <span>भारत सरकार · Government of India · शिक्षा विभाग</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleContrast} className="inline-flex items-center gap-1.5 text-white/80 transition hover:text-gold-300" aria-label="Toggle high contrast">
              <Contrast className="h-3.5 w-3.5" /> {highContrast ? "Normal" : "High Contrast"}
            </button>
            <button onClick={() => setLang(lang === "en" ? "hi" : "en")} className="inline-flex items-center gap-1.5 text-white/80 transition hover:text-gold-300">
              <Globe className="h-3.5 w-3.5" /> {lang === "en" ? "हिन्दी" : "English"}
            </button>
            <a href="#/admin" className="inline-flex items-center gap-1.5 rounded bg-gold-400/90 px-2.5 py-0.5 font-semibold text-gov-900 transition hover:bg-gold-300">
              <LogIn className="h-3 w-3" /> Admin
            </a>
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <nav className={`transition-all duration-300 ${scrolled ? "bg-white/90 shadow-lg backdrop-blur-md" : "bg-white/80 backdrop-blur-sm"}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="#home" className="flex items-center gap-3">
            <div className="seal-ring flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-gov-700 to-gov-900 text-gold-300">
              {/* Ashoka Chakra simplified */}
              <svg viewBox="0 0 24 24" className="h-7 w-7 animate-slow-spin" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="12" r="2" fill="#d4af37" />
                {Array.from({ length: 24 }).map((_, i) => (
                  <rect key={i} x="11.75" y="3" width="0.5" height="4" fill="#d4af37" transform={`rotate(${i * 15} 12 12)`} />
                ))}
                <circle cx="12" cy="12" r="9" fill="none" stroke="#d4af37" strokeWidth="0.4" />
              </svg>
            </div>
            <div className="leading-tight">
              <p className="font-display text-base font-extrabold text-gov-900 sm:text-lg">
                {lang === "hi" ? "शा. बालक उ. मा. विद्यालय" : "Govt. Boys H. S. School"}
              </p>
              <p className="font-heading text-[0.65rem] font-semibold tracking-wider text-gov-600 uppercase">
                {lang === "hi" ? "कैंट, गुना (म.प्र.)" : "Cantt, Guna (M.P.)"}
              </p>
            </div>
          </Link>

          {/* Desktop nav */}
          <ul className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((l) => {
              const Icon = l.icon;
              return (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-heading text-sm font-medium text-gov-800 transition hover:bg-gov-50 hover:text-gov-700"
                  >
                    <Icon className="h-4 w-4" /> {t(l.label)}
                  </a>
                </li>
              );
            })}
            <li>
              <a href="#/admin" className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-gov-700 px-4 py-2 font-heading text-sm font-semibold text-white shadow-md transition hover:bg-gov-800">
                <LogIn className="h-4 w-4" /> {lang === "hi" ? "एडमिन लॉगिन" : "Admin Login"}
              </a>
            </li>
          </ul>

          {/* Mobile controls */}
          <div className="flex items-center gap-2 lg:hidden">
            <button onClick={toggleContrast} className="rounded-lg p-2 text-gov-700 hover:bg-gov-50" aria-label="High contrast">
              <Contrast className="h-5 w-5" />
            </button>
            <button onClick={() => setLang(lang === "en" ? "hi" : "en")} className="rounded-lg p-2 text-gov-700 hover:bg-gov-50" aria-label="Language">
              <Globe className="h-5 w-5" />
            </button>
            <button onClick={() => setOpen((v) => !v)} className="rounded-lg p-2 text-gov-700 hover:bg-gov-50" aria-label="Menu">
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="border-t border-gov-100 bg-white lg:hidden">
            <ul className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
              {NAV_LINKS.map((l) => {
                const Icon = l.icon;
                return (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-heading text-sm font-medium text-gov-800 transition hover:bg-gov-50"
                    >
                      <Icon className="h-5 w-5 text-gov-600" /> {t(l.label)}
                    </a>
                  </li>
                );
              })}
              <li>
                <a href="#/admin" onClick={() => setOpen(false)} className="mt-2 flex items-center gap-3 rounded-lg bg-gov-700 px-3 py-2.5 font-heading text-sm font-semibold text-white">
                  <LogIn className="h-5 w-5" /> {lang === "hi" ? "एडमिन लॉगिन" : "Admin Login"}
                </a>
              </li>
            </ul>
          </div>
        )}
      </nav>
    </header>
  );
}
