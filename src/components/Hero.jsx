import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Award, Users, ChevronDown, ArrowRight } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";

// Government-themed hero gradients (fallback if no custom banners are set)
const DEFAULT_BANNERS = [
  "linear-gradient(135deg, rgba(8,22,44,.85), rgba(22,59,115,.8)), url('https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80')",
  "linear-gradient(135deg, rgba(8,22,44,.85), rgba(156,120,35,.55)), url('https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1600&q=80')",
  "linear-gradient(135deg, rgba(8,22,44,.85), rgba(19,136,8,.55)), url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1600&q=80')",
];

export default function Hero() {
  const { schoolInfo, lang, notices } = useApp();
  const [slide, setSlide] = useState(0);

  // Carousel auto-rotate
  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % DEFAULT_BANNERS.length), 5500);
    return () => clearInterval(id);
  }, []);

  const name = schoolInfo?.[lang === "hi" ? "school_name" : "school_name"] || (lang === "hi" ? "शा. बालक उ. मा. विद्यालय" : "Govt. Boys H. S. School");
  const place = schoolInfo?.school_place || "Cantt, Guna (M.P.)";
  const tagline = schoolInfo?.school_tagline || "Education For All (EFA) Government School";
  const pinned = notices.filter((n) => n.is_pinned).slice(0, 3);

  return (
    <section id="home" className="relative pt-24 md:pt-32">
      {/* Hero banner */}
      <div className="relative overflow-hidden">
        <div className="relative h-[72vh] min-h-[520px] w-full">
          {DEFAULT_BANNERS.map((bg, i) => (
            <div
              key={i}
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
              style={{ backgroundImage: bg, opacity: i === slide ? 1 : 0 }}
            />
          ))}
          {/* Tricolor overlay sliver at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-1.5">
            <div className="tricolor-stripe h-full" />
          </div>
          {/* Ashoka chakra watermark */}
          <div className="pointer-events-none absolute top-1/3 right-[5%] hidden opacity-10 md:block">
            <svg viewBox="0 0 100 100" className="h-80 w-80 animate-slow-spin text-white">
              <circle cx="50" cy="50" r="10" fill="currentColor" />
              {Array.from({ length: 24 }).map((_, i) => (
                <rect key={i} x="49" y="10" width="2" height="18" fill="currentColor" transform={`rotate(${i * 15} 50 50)`} />
              ))}
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>

          <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center text-white">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold-300/40 bg-white/10 px-4 py-1.5 font-heading text-xs font-semibold tracking-widest text-gold-200 backdrop-blur-md uppercase"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-gold-300" />
              {lang === "hi" ? "मध्यप्रदेश शासन · जिला गुना" : "Government of Madhya Pradesh · District Guna"}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-display text-3xl font-black leading-tight drop-shadow-lg sm:text-5xl md:text-6xl"
            >
              {name}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-3 font-heading text-base font-medium tracking-wide text-gold-200 sm:text-lg"
            >
              {place}
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-5 max-w-2xl font-body text-sm text-white/85 sm:text-base"
            >
              {tagline}
              {schoolInfo?.classes && ` · ${schoolInfo.classes}`}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              <a href="#notices" className="group inline-flex items-center gap-2 rounded-full bg-gold-400 px-6 py-3 font-heading text-sm font-bold text-gov-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-gold-300">
                {lang === "hi" ? "सूचनाएँ देखें" : "View Notices"}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </a>
              <a href="#about" className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 font-heading text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20">
                {lang === "hi" ? "विद्यालय के बारे में" : "About Our School"}
              </a>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-10 grid w-full max-w-3xl grid-cols-3 gap-3 sm:gap-6"
            >
              {[
                { icon: Users,    k: lang === "hi" ? "छात्र" : "Students",     v: "700+" },
                { icon: BookOpen, k: lang === "hi" ? "कक्षाएँ" : "Classes",    v: "1 – 12" },
                { icon: Award,    k: lang === "hi" ? "स्थापना" : "Est.",       v: schoolInfo?.establishment_year || "1965" },
              ].map(({ icon: Icon, k, v }) => (
                <div key={k} className="glass-dark rounded-2xl px-4 py-3 text-center backdrop-blur-md">
                  <Icon className="mx-auto h-5 w-5 text-gold-300" />
                  <p className="mt-1 font-display text-xl font-bold text-white sm:text-2xl">{v}</p>
                  <p className="font-heading text-[0.65rem] font-semibold tracking-wider text-white/70 uppercase sm:text-xs">{k}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Carousel dots */}
          <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {DEFAULT_BANNERS.map((_, i) => (
              <button
                key={i}
                aria-label={`Slide ${i+1}`}
                onClick={() => setSlide(i)}
                className={`h-1.5 rounded-full transition-all ${i === slide ? "w-8 bg-gold-300" : "w-2 bg-white/40"}`}
              />
            ))}
          </div>

          {/* Scroll indicator */}
          <a href="#about" className="absolute bottom-3 left-1/2 z-20 hidden -translate-x-1/2 flex-col items-center text-white/70 transition hover:text-gold-300 md:flex">
            <span className="font-heading text-[0.65rem] tracking-[0.3em] uppercase">Scroll</span>
            <ChevronDown className="h-5 w-5 animate-bounce" />
          </a>
        </div>
      </div>
    </section>
  );
}
