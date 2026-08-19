import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Highlights from "@/components/Highlights";
import Facilities from "@/components/Facilities";
import PrincipalMessage from "@/components/PrincipalMessage";
import Teachers from "@/components/Teachers";
import VocationalEducation from "@/components/VocationalEducation";
import CampusGallery from "@/components/CampusGallery";
import Achievements from "@/components/Achievements";
import NoticeBoard from "@/components/NoticeBoard";
import Footer from "@/components/Footer";
import CmsApp from "@/cms/App";
import { LanguageProvider } from "@/i18n/LanguageContext";

/**
 * Tiny hash router:
 *   #/admin-lakshya  → Admin panel
 *   anything else (or empty) → public website
 */
function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return hash;
}

function PublicSite() {
  const { t, siteData, dataReady, dataError, refreshSiteData } = useLanguage();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 26,
    restDelta: 0.001,
  });

  // Apply admin branding (theme color + favicon) to the live website
  useEffect(() => {
    const root = document.documentElement;
    const base = siteData.settings.themeColor || "#0F4C81";
    const shade = (hex: string, f: number) => {
      const n = parseInt(hex.slice(1), 16);
      const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
      const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
      const b = Math.min(255, Math.round((n & 255) * f));
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
    };
    root.style.setProperty("--color-royal-700", base);
    root.style.setProperty("--color-royal-800", shade(base, 0.82));
    root.style.setProperty("--color-royal-900", shade(base, 0.68));
    root.style.setProperty("--color-royal-950", shade(base, 0.5));
  }, [siteData.settings.themeColor]);

  useEffect(() => {
    if (siteData.settings.favicon) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = siteData.settings.favicon;
    }
  }, [siteData.settings.favicon]);

  if (!dataReady) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-royal-950">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-gold-300/30 border-t-gold-300" />
        <p className="font-body text-sm text-royal-100/70">{t.common.loading}</p>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-royal-950 via-royal-900 to-royal-800 px-4 text-center">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-[0.1]" />
        <div className="glass-dark relative max-w-lg rounded-[2rem] p-8">
          <h1 className="font-display text-2xl text-white">
            {t.common.unavailableTitle}
          </h1>
          <p className="mt-3 font-body text-sm leading-relaxed text-royal-100/75">
            {t.common.unavailableDesc}
          </p>
          <button
            type="button"
            onClick={refreshSiteData}
            className="mt-6 rounded-full bg-gradient-to-r from-gold-400 to-gold-300 px-6 py-3 font-heading text-sm font-semibold text-royal-900"
          >
            {t.common.retry}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#f6f9fd]">
      <motion.div
        style={{ scaleX: progress }}
        className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-[3px] origin-left bg-gradient-to-r from-royal-700 via-gold-400 to-royal-500"
      />

      <Navbar />
      <main>
        <Hero />
        <About />
        <PrincipalMessage />
        <Highlights />
        <Facilities />
        <VocationalEducation />
        <Teachers />
        <CampusGallery />
        <Achievements />
        <NoticeBoard />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  const hash = useHashRoute();

  return (
    <LanguageProvider>
      {/* Error boundary: runtime errors show a useful page, never a white screen */}
      <ErrorBoundary label={hash.startsWith("#/admin-lakshya") ? "Admin Panel" : "Website"}>
        {hash.startsWith("#/admin-lakshya") ? <CmsApp /> : <PublicSite />}
      </ErrorBoundary>
    </LanguageProvider>
  );
}
