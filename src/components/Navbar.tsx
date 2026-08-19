import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Languages, Menu, X } from "lucide-react";
import { NAV_LINKS } from "@/data/site";
import { Logo } from "@/components/ui/Logo";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/utils/cn";

function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { lang, toggleLang, t } = useLanguage();
  return (
    <button
      type="button"
      onClick={toggleLang}
      aria-label={lang === "en" ? t.common.viewHindi : t.common.viewEnglish}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-heading font-semibold transition-all duration-300 hover:-translate-y-0.5",
        compact
          ? "w-full justify-center border-royal-100 bg-royal-50 px-4 py-3 text-sm text-royal-800"
          : "border-royal-100 bg-white/80 px-3.5 py-2 text-xs text-royal-700 shadow-sm hover:bg-royal-50 sm:text-sm",
      )}
    >
      <Languages className="h-4 w-4 text-gold-500" />
      {t.topbar.langLabel}
    </button>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("#home");
  const { t } = useLanguage();

  // Visual navbar state only. Active-section detection is handled by
  // IntersectionObserver below, not by a scroll-position loop.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        setScrolled(window.scrollY > 24);
        frame = 0;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Observe one unique section per nav item. A narrow viewport band below the
  // sticky header makes the section occupying the reading area authoritative.
  useEffect(() => {
    const sections = NAV_LINKS.map(({ href }) =>
      document.getElementById(href.slice(1)),
    ).filter((section): section is HTMLElement => Boolean(section));

    if (!sections.length || !("IntersectionObserver" in window)) return;

    const visible = new Map<string, IntersectionObserverEntry>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry);
          else visible.delete(entry.target.id);
        }

        const candidates = [...visible.values()].sort((a, b) => {
          const aDistance = Math.abs(a.boundingClientRect.top - 88);
          const bDistance = Math.abs(b.boundingClientRect.top - 88);
          return aDistance - bDistance || b.intersectionRatio - a.intersectionRatio;
        });
        if (candidates[0]) setActive(`#${candidates[0].target.id}`);
      },
      {
        rootMargin: "-80px 0px -62% 0px",
        threshold: [0, 0.01, 0.25, 0.5, 0.75],
      },
    );

    sections.forEach((section) => observer.observe(section));

    const initialHash = window.location.hash;
    if (NAV_LINKS.some(({ href }) => href === initialHash)) {
      setActive(initialHash);
      window.requestAnimationFrame(() => {
        document
          .getElementById(initialHash.slice(1))
          ?.scrollIntoView({ behavior: "auto", block: "start" });
      });
    }
    return () => observer.disconnect();
  }, []);

  // Lock body scroll only while mobile drawer is open, and cleanly unlock on unmount/close
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Robust smooth scroll handler that works across mobile Safari, Android Chrome, Edge & desktop
  const handleNavClick = useCallback((
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    e.preventDefault();

    // 1. Immediately unlock body scroll so browser is ready to scroll
    document.body.style.overflow = "";
    setOpen(false);

    const targetId = href.replace(/^#/, "");
    const targetElement =
      document.getElementById(targetId) || document.querySelector(href);

    if (targetElement) {
      setActive(href);
      window.requestAnimationFrame(() => {
        targetElement.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "start",
        });
      });

      // 3. Update URL hash without causing a jump
      try {
        window.history.replaceState(null, "", href);
      } catch {
        // Fallback for sandboxed iframe environments
      }
    }
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-500",
        scrolled
          ? "border-b border-white/60 bg-white/85 shadow-[0_10px_40px_-24px_rgba(8,43,73,.55)] backdrop-blur-xl"
          : "bg-white/60 backdrop-blur-md",
      )}
    >
      <nav
        aria-label={t.common.mainNavigation}
        className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:py-4"
      >
        <a
          href="#home"
          onClick={(e) => handleNavClick(e, "#home")}
          className="group flex min-w-0 flex-1 items-center gap-2 sm:gap-3 min-[1400px]:flex-none"
        >
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-2xl bg-gold-300/40 opacity-0 blur transition duration-500 group-hover:opacity-100" />
            <Logo className="relative h-10 w-10 transition-transform duration-500 group-hover:scale-105 lg:h-12 lg:w-12" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate font-display text-[0.74rem] font-extrabold tracking-tight text-royal-800 sm:text-sm lg:text-[0.95rem]">
              {t.meta.schoolNameCaps}
            </p>
            <p className="truncate font-heading text-[0.6rem] font-semibold tracking-[0.24em] text-gold-500 uppercase sm:text-[0.66rem]">
              {t.meta.schoolPlace}
            </p>
          </div>
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-0.5 min-[1400px]:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              aria-current={active === link.href ? "page" : undefined}
              className={cn(
                "relative rounded-full px-2.5 py-2 font-heading text-[0.76rem] font-medium whitespace-nowrap transition-colors duration-300",
                active === link.href
                  ? "text-royal-800"
                  : "text-slate-600 hover:text-royal-700",
              )}
            >
              {active === link.href && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-royal-50 ring-1 ring-royal-100"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative">{t.nav[link.key]}</span>
            </a>
          ))}
        </div>

        {/* Action button & Mobile toggle */}
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden sm:block">
            <LanguageSwitch />
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={t.nav.menu}
            aria-expanded={open}
            aria-controls="mobile-nav-drawer"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-royal-100 bg-white/80 text-royal-700 shadow-sm transition hover:bg-royal-50 min-[1400px]:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-nav-drawer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-royal-100/70 bg-white/95 backdrop-blur-xl min-[1400px]:hidden"
          >
            <div className="mx-auto max-h-[75vh] max-w-7xl space-y-1 overflow-y-auto px-4 py-4 sm:px-6">
              {NAV_LINKS.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.03 * i }}
                  className="flex items-center justify-between rounded-2xl px-4 py-3.5 font-heading text-[0.95rem] font-medium text-slate-700 transition active:bg-royal-100 hover:bg-royal-50 hover:text-royal-800"
                >
                  <span>{t.nav[link.key]}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
                </motion.a>
              ))}
              <div className="grid gap-2 pt-3 sm:hidden">
                <LanguageSwitch compact />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
