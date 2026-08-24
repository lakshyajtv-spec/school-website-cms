import { Quote, UserCircle } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";

export default function PrincipalDesk() {
  const { schoolInfo, lang } = useApp();
  if (!schoolInfo) return null;

  const name = schoolInfo.principal_name || (lang === "hi" ? "प्राचार्य" : "Principal");
  const message = schoolInfo.principal_message || "";

  return (
    <section id="principal" className="section-pad relative bg-gradient-to-b from-gov-50 to-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="overflow-hidden rounded-3xl border border-gov-100 bg-white shadow-soft">
          <div className="grid lg:grid-cols-5">
            {/* Left panel */}
            <div className="relative bg-gradient-to-br from-gov-800 via-gov-700 to-gov-900 p-8 text-white lg:col-span-2 lg:p-10">
              <div className="tricolor-stripe absolute inset-x-0 top-0" />
              <div className="mt-2">
                <span className="inline-block rounded-full bg-gold-400/20 px-3 py-1 font-heading text-[0.7rem] font-semibold tracking-widest text-gold-300 uppercase">
                  {lang === "hi" ? "प्राचार्य की कलम से" : "From the Principal's Desk"}
                </span>
                <div className="mt-6 flex items-center gap-4">
                  <div className="seal-ring flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
                    <UserCircle className="h-14 w-14 text-gold-300" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold">{name}</h3>
                    <p className="mt-1 font-heading text-sm text-gold-200">
                      {lang === "hi" ? "प्राचार्य" : "Principal"}
                    </p>
                    <p className="font-heading text-xs text-white/70">{schoolInfo.school_place}</p>
                  </div>
                </div>
                <div className="mt-8 grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white/10 p-3 text-center">
                    <p className="font-display text-lg font-bold text-gold-300">{schoolInfo.establishment_year || "—"}</p>
                    <p className="font-heading text-[0.6rem] tracking-wider text-white/70 uppercase">{lang === "hi" ? "स्थापित" : "Est."}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3 text-center">
                    <p className="font-display text-lg font-bold text-gold-300">700+</p>
                    <p className="font-heading text-[0.6rem] tracking-wider text-white/70 uppercase">{lang === "hi" ? "छात्र" : "Students"}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3 text-center">
                    <p className="font-display text-lg font-bold text-gold-300">25+</p>
                    <p className="font-heading text-[0.6rem] tracking-wider text-white/70 uppercase">{lang === "hi" ? "शिक्षक" : "Teachers"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right panel: message */}
            <div className="relative p-8 lg:col-span-3 lg:p-12">
              <Quote className="absolute right-6 top-6 h-16 w-16 text-gov-100" aria-hidden="true" />
              <h2 className="relative font-display text-2xl font-black text-gov-900 sm:text-3xl">
                {lang === "hi" ? "प्राचार्य का संदेश" : "Principal's Message"}
              </h2>
              <div className="mt-5 h-1 w-16 bg-gradient-to-r from-saffron via-white to-india-green" />
              <p className="relative mt-6 font-body text-base leading-[1.9] text-gov-800/85">
                {message}
              </p>
              <p className="relative mt-6 font-body text-sm italic leading-relaxed text-gov-700">
                {lang === "hi"
                  ? `"शिक्षा वह सबसे शक्तिशाली उपकरण है जिसे आप दुनिया को बदलने के लिए उपयोग कर सकते हैं।"`
                  : `"Education is the most powerful weapon which you can use to change the world."`}
              </p>
              <p className="relative mt-2 font-heading text-xs font-semibold tracking-wider text-gov-600">— {lang === "hi" ? "बाबासाहेब भीमराव अंबेडकर" : "Dr. B. R. Ambedkar"}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
