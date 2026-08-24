import { Target, Eye, BookOpen, Award, Shield, GraduationCap } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";

export default function About() {
  const { schoolInfo, lang } = useApp();
  if (!schoolInfo) return null;

  const mission = schoolInfo.mission || "";
  const vision  = schoolInfo.vision  || "";
  const classes = schoolInfo.classes || "";
  const affiliation = schoolInfo.affiliation || "";
  const est = schoolInfo.establishment_year || "";

  return (
    <section id="about" className="section-pad relative">
      <div className="absolute inset-0 grid-pattern opacity-60" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left: content */}
          <div>
            <span className="eyebrow">{lang === "hi" ? "हमारे बारे में" : "Who We Are"}</span>
            <h2 className="mt-3 text-3xl font-black text-gov-900 sm:text-4xl md:text-5xl">
              {lang === "hi" ? "हमारे विद्यालय के" : "About Our"} <span className="text-gradient-blue">{lang === "hi" ? "बारे में" : "School"}</span>
            </h2>
            <p className="mt-5 font-body text-base leading-relaxed text-gov-800/80">
              {lang === "hi"
                ? `हमारा विद्यालय ${schoolInfo.school_place} में स्थित एक प्रतिष्ठित शासकीय विद्यालय है, जो ${classes} तक गुणवत्तापूर्ण शिक्षा प्रदान करता है। हम ${affiliation} से संबद्ध हैं और ${est} से शिक्षा के क्षेत्र में कार्यरत हैं।`
                : `Our school is a reputed government institution located in ${schoolInfo.school_place}, providing quality education for ${classes}. Affiliated to ${affiliation}, we have been serving the cause of education since ${est}.`
              }
            </p>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {/* Vision */}
              <div className="gov-card rounded-2xl border border-gov-100 bg-white p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FF9933]/15 text-[#c26d10]">
                  <Eye className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-gov-900">
                  {lang === "hi" ? "हमारा दृष्टिकोण" : "Our Vision"}
                </h3>
                <p className="mt-2 font-body text-sm leading-relaxed text-gov-800/75">{vision}</p>
              </div>

              {/* Mission */}
              <div className="gov-card rounded-2xl border border-gov-100 bg-white p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#138808]/15 text-[#0e6b07]">
                  <Target className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-gov-900">
                  {lang === "hi" ? "हमारा उद्देश्य" : "Our Mission"}
                </h3>
                <p className="mt-2 font-body text-sm leading-relaxed text-gov-800/75">{mission}</p>
              </div>
            </div>
          </div>

          {/* Right: highlights */}
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: GraduationCap, color: "bg-gov-700",      title: lang==="hi"?"मान्यता प्राप्त":"Recognised",         desc: affiliation },
              { icon: BookOpen,      color: "bg-saffron",      title: lang==="hi"?"कक्षाएँ":"Classes",                   desc: classes },
              { icon: Award,         color: "bg-india-green", title: lang==="hi"?"स्थापना वर्ष":"Established",          desc: est },
              { icon: Shield,        color: "bg-gold-400",    title: lang==="hi"?"सरकारी विद्यालय":"Government School", desc: lang==="hi"?"सरकार द्वारा संचालित":"Run by the Government" },
            ].map(({ icon: Icon, color, title, desc }, i) => (
              <div key={i} className="gov-card flex items-start gap-4 rounded-2xl border border-gov-100 bg-white p-5">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-display text-base font-bold text-gov-900">{title}</h4>
                  <p className="mt-1 font-body text-sm text-gov-800/75">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
