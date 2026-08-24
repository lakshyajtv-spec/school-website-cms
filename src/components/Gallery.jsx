import { useMemo, useState } from "react";
import { ImageIcon, X } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";

const DEFAULT_CATEGORIES = ["All", "Campus", "Events", "Sports", "Annual Day"];

export default function Gallery() {
  const { gallery, lang, dataReady } = useApp();
  const [category, setCategory] = useState("All");
  const [lightbox, setLightbox] = useState(null);

  const categories = useMemo(() => {
    const set = new Set(DEFAULT_CATEGORIES);
    gallery.forEach((g) => g.category && set.add(g.category));
    return Array.from(set);
  }, [gallery]);

  const filtered = useMemo(() => {
    if (category === "All") return gallery;
    return gallery.filter((g) => g.category === category);
  }, [gallery, category]);

  return (
    <section id="gallery" className="section-pad relative bg-gradient-to-b from-white to-gov-50">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <span className="eyebrow !mx-auto justify-center">{lang === "hi" ? "चित्र दीर्घा" : "Campus Gallery"}</span>
          <h2 className="mt-3 text-3xl font-black text-gov-900 sm:text-4xl md:text-5xl">
            {lang === "hi" ? "हमारे परिसर की" : "A Glimpse of"} <span className="text-gradient-blue">{lang === "hi" ? "एक झलक" : "Our Campus"}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-body text-base text-gov-800/70">
            {lang === "hi"
              ? "हमारे विद्यालय परिसर, कक्षाओं, कार्यक्रमों और गतिविधियों की कुछ चुनिंदा तस्वीरें।"
              : "Selected photographs from our campus, classrooms, events and school activities."}
          </p>
        </div>

        {/* Category filters */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full border px-4 py-1.5 font-heading text-xs font-semibold tracking-wide transition ${
                category === c
                  ? "border-gov-700 bg-gov-700 text-white shadow-md"
                  : "border-gov-200 bg-white text-gov-700 hover:border-gov-400 hover:bg-gov-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {!dataReady ? (
          <div className="mt-12 flex justify-center"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-gov-200 bg-white py-20 text-gov-500">
            <ImageIcon className="h-12 w-12" />
            <p className="font-heading text-sm">
              {lang === "hi" ? "इस श्रेणी में कोई चित्र नहीं है।" : "No photos in this category yet."}
            </p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((g, idx) => (
              <button
                key={g.id}
                onClick={() => g.image && setLightbox(g)}
                className={`group relative overflow-hidden rounded-2xl bg-gov-100 shadow-card ${
                  idx % 5 === 0 ? "sm:row-span-2 sm:h-[420px]" : "h-48 sm:h-56"
                }`}
              >
                {g.image ? (
                  <img src={g.image} alt={g.title} loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gov-400">
                    <ImageIcon className="h-12 w-12" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gov-900/85 via-gov-900/20 to-transparent opacity-0 transition group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 translate-y-2 p-4 text-left opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                  {g.category && (
                    <span className="mb-1 inline-block rounded-full bg-gold-400 px-2 py-0.5 font-heading text-[0.6rem] font-bold tracking-wider text-gov-900 uppercase">
                      {g.category}
                    </span>
                  )}
                  <p className="font-display text-sm font-bold text-white">{g.title}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          <img src={lightbox.image} alt={lightbox.title} className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 font-heading text-sm text-white/80">
            {lightbox.title}
          </p>
        </div>
      )}
    </section>
  );
}
