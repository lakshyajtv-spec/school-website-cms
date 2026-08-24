import { UserCircle } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";

export default function Teachers() {
  const { teachers, lang, dataReady } = useApp();

  return (
    <section id="staff" className="section-pad relative">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <span className="eyebrow !mx-auto justify-center">{lang === "hi" ? "हमारे शिक्षक" : "Our Faculty"}</span>
          <h2 className="mt-3 text-3xl font-black text-gov-900 sm:text-4xl md:text-5xl">
            {lang === "hi" ? "हमारे शिक्षक" : "Our Teaching"} <span className="text-gradient-blue">{lang === "hi" ? "स्टाफ" : "Staff"}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-body text-base text-gov-800/70">
            {lang === "hi"
              ? "हमारे अनुभवी और समर्पित शिक्षकगण छात्रों के सर्वांगीण विकास के लिए प्रतिबद्ध हैं।"
              : "Our experienced and dedicated faculty members are committed to the holistic development of every student."}
          </p>
        </div>

        {!dataReady ? (
          <div className="mt-12 flex justify-center">
            <div className="spinner" />
          </div>
        ) : teachers.length === 0 ? (
          <p className="mt-12 text-center font-body text-gov-700/70">
            {lang === "hi" ? "शीघ्र ही शिक्षक विवरण अपडेट किया जाएगा।" : "Teacher information will be updated soon."}
          </p>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {teachers.map((t) => (
              <article
                key={t.id}
                className="gov-card group overflow-hidden rounded-2xl border border-gov-100 bg-white"
              >
                <div className="relative h-56 overflow-hidden bg-gradient-to-br from-gov-100 to-gov-200">
                  {t.image ? (
                    <img
                      src={t.image}
                      alt={t.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <UserCircle className="h-28 w-28 text-gov-400" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gov-900/80 via-gov-900/30 to-transparent p-4 pt-10">
                    <span className="inline-block rounded-full bg-gold-400 px-2.5 py-0.5 font-heading text-[0.65rem] font-bold tracking-wider text-gov-900 uppercase">
                      {t.designation}
                    </span>
                  </div>
                  {/* Tricolor accent on top-left */}
                  <div className="absolute top-3 left-3 h-1 w-12 rounded">
                    <div className="tricolor-stripe h-full rounded" />
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-lg font-bold text-gov-900">{t.name || "—"}</h3>
                  <p className="mt-1 font-heading text-sm font-semibold text-gov-700">{t.subject}</p>
                  {t.qualification && (
                    <p className="mt-2 font-body text-xs text-gov-700/65">
                      <span className="font-semibold text-gov-600">
                        {lang === "hi" ? "योग्यता: " : "Qualification: "}
                      </span>
                      {t.qualification}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
