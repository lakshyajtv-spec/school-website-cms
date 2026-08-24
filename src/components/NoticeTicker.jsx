import { Bell, Megaphone, ChevronRight } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";

/**
 * Marquee-style scrolling notice bar below the hero (Government site style).
 */
export default function NoticeTicker() {
  const { notices, lang } = useApp();
  const pinned = notices.filter((n) => n.is_pinned).slice(0, 6);
  const active = pinned.length ? pinned : notices.slice(0, 6);

  if (active.length === 0) return null;

  return (
    <div className="relative border-y border-gov-700/10 bg-gradient-to-r from-gov-800 via-gov-700 to-gov-800 text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-stretch">
        <div className="flex shrink-0 items-center gap-2 bg-saffron px-4 py-2.5 font-heading text-xs font-bold tracking-wider text-white uppercase sm:px-5">
          <Megaphone className="h-4 w-4" />
          <span className="hidden sm:inline">{lang === "hi" ? "ताज़ा सूचनाएँ" : "Latest Notices"}</span>
          <span className="sm:hidden">{lang === "hi" ? "सूचना" : "News"}</span>
        </div>
        <div className="relative flex-1 overflow-hidden py-2.5">
          <div className="flex animate-marquee whitespace-nowrap">
            {/* Duplicate list for seamless loop */}
            {[...active, ...active].map((n, i) => (
              <a
                key={`${n.id}-${i}`}
                href="#notices"
                className="mx-6 inline-flex items-center gap-2 font-heading text-sm text-white/95 transition hover:text-gold-300"
              >
                <Bell className="h-3.5 w-3.5 text-gold-300" />
                <span className="font-semibold text-gold-300">{n.date}:</span>
                <span>{n.title}</span>
                <ChevronRight className="h-3.5 w-3.5 text-white/60" />
              </a>
            ))}
          </div>
          {/* Edge fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-gov-700 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-gov-700 to-transparent" />
        </div>
        <a href="#notices" className="hidden shrink-0 items-center gap-1 border-l border-white/10 px-4 font-heading text-xs font-semibold text-gold-300 transition hover:bg-white/5 sm:inline-flex">
          {lang === "hi" ? "सभी देखें" : "View All"} <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
