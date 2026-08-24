import { FileText, Pin, Calendar, Download, ExternalLink } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";

export default function NoticeBoard() {
  const { notices, lang, dataReady } = useApp();

  return (
    <section id="notices" className="section-pad relative">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <span className="eyebrow !mx-auto justify-center">{lang === "hi" ? "सूचना पट्ट" : "Notice Board"}</span>
          <h2 className="mt-3 text-3xl font-black text-gov-900 sm:text-4xl md:text-5xl">
            {lang === "hi" ? "विद्यालय सूचना" : "School"} <span className="text-gradient-blue">{lang === "hi" ? "पट्ट" : "Notice Board"}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-body text-base text-gov-800/70">
            {lang === "hi"
              ? "परीक्षाओं, अवकाश, प्रवेश और विद्यालय गतिविधियों से संबंधित नवीनतम सूचनाएँ।"
              : "Latest announcements regarding examinations, holidays, admissions and school activities."}
          </p>
        </div>

        {/* Notice board frame */}
        <div className="mt-10 overflow-hidden rounded-3xl border-8 border-[#8B6914] bg-[#f5e6b3] shadow-2xl sm:border-[12px]">
          {/* Wooden header strip */}
          <div className="flex items-center justify-between bg-[#6b4f10] px-6 py-3 text-white">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-gold-300" />
              <h3 className="font-display text-lg font-bold tracking-wide">
                {lang === "hi" ? "सूचना पट्ट" : "SCHOOL NOTICE BOARD"}
              </h3>
            </div>
            <span className="hidden font-heading text-xs tracking-widest text-gold-200 uppercase sm:inline">
              {lang === "hi" ? "अद्यतन" : "Updated"} · {new Date().toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN")}
            </span>
          </div>

          <div className="divide-y divide-[#d4b670]/40 p-4 sm:p-6">
            {!dataReady ? (
              <div className="flex justify-center py-10"><div className="spinner" /></div>
            ) : notices.length === 0 ? (
              <p className="py-10 text-center font-heading text-[#6b4f10]">
                {lang === "hi" ? "वर्तमान में कोई सूचना उपलब्ध नहीं है।" : "No notices at this time."}
              </p>
            ) : (
              notices.map((n) => (
                <article key={n.id} className={`group relative flex gap-4 py-4 transition ${n.is_pinned ? "bg-white/60" : ""}`}>
                  <div className="shrink-0">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${n.is_pinned ? "bg-saffron text-white" : "bg-gov-700 text-white"}`}>
                      {n.is_pinned ? <Pin className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {n.is_pinned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-saffron/20 px-2 py-0.5 font-heading text-[0.65rem] font-bold tracking-wider text-[#a84f0c] uppercase">
                          <Pin className="h-3 w-3" /> {lang === "hi" ? "महत्वपूर्ण" : "Pinned"}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 font-heading text-xs text-gov-700/70">
                        <Calendar className="h-3 w-3" /> {n.date}
                      </span>
                    </div>
                    <h4 className="mt-1.5 font-display text-base font-bold text-gov-900 sm:text-lg">{n.title}</h4>
                    <p className="mt-1 font-body text-sm leading-relaxed text-gov-800/80">{n.description}</p>
                    {n.pdfPreview && (
                      <a
                        href={n.pdfPreview}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gov-300 bg-white px-3 py-1.5 font-heading text-xs font-semibold text-gov-700 transition hover:bg-gov-50"
                      >
                        <Download className="h-3.5 w-3.5" /> {lang === "hi" ? "संलग्न PDF देखें" : "View attached PDF"}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
