import { useEffect, useState } from "react";
import { ArrowUp, ExternalLink, Mail, MapPin, Phone, Globe, Link as LinkIcon } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";

const GOV_LINKS = [
  { label: "Education Portal",  href: "https://www.education.gov.in/" },
  { label: "MP Board",          href: "http://mpbse.nic.in/" },
  { label: "MP Education",      href: "http://www.educationportal.mp.gov.in/" },
  { label: "NCERT",             href: "https://ncert.nic.in/" },
  { label: "India.gov.in",      href: "https://www.india.gov.in/" },
];

export default function Footer() {
  const { schoolInfo, lang } = useApp();
  const [visitors, setVisitors] = useState(0);

  // Simple visitor counter stub (localStorage-based demo).
  // Replace with a real counter / analytics in production.
  useEffect(() => {
    try {
      const key = "hs-visits";
      const v = parseInt(localStorage.getItem(key) || "1247", 10) + 1;
      localStorage.setItem(key, String(v));
      setVisitors(v);
    } catch {
      setVisitors(1247);
    }
  }, []);

  const year = new Date().getFullYear();
  const address = schoolInfo?.address || "Cantt Area, Guna, Madhya Pradesh";
  const phone = schoolInfo?.phone || "+91-00000-00000";
  const email = schoolInfo?.email || "principal@school.local";

  return (
    <footer className="relative bg-gov-950 pt-16 text-white">
      {/* Tricolor top stripe */}
      <div className="tricolor-stripe absolute inset-x-0 top-0 h-1" />

      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-10 md:grid-cols-2 lg:grid-cols-4">
        {/* About */}
        <div>
          <div className="flex items-center gap-3">
            <div className="seal-ring flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-gov-700 to-gov-900 text-gold-300">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
                <circle cx="12" cy="12" r="2" fill="#d4af37" />
                {Array.from({ length: 24 }).map((_, i) => (
                  <rect key={i} x="11.75" y="3" width="0.5" height="4" fill="#d4af37" transform={`rotate(${i*15} 12 12)`} />
                ))}
              </svg>
            </div>
            <div>
              <p className="font-display text-sm font-bold leading-tight">
                {lang === "hi" ? "शा. बालक उ. मा. विद्यालय" : "Govt. Boys H. S. School"}
              </p>
              <p className="font-heading text-[0.65rem] tracking-widest text-gold-300 uppercase">
                {lang === "hi" ? "कैंट, गुना" : "Cantt, Guna"}
              </p>
            </div>
          </div>
          <p className="mt-4 font-body text-sm leading-relaxed text-white/65">
            {lang === "hi"
              ? "सर्व शिक्षा अभियान के अंतर्गत कक्षा 1 से 12 तक गुणवत्तापूर्ण शासकीय शिक्षा प्रदान करने वाला प्रतिष्ठित विद्यालय।"
              : "A reputed government school providing quality education from Classes 1 to 12 under the Education For All initiative."}
          </p>
          <div className="mt-5 flex gap-2">
            <a href="#" aria-label="Website" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition hover:bg-gold-400 hover:text-gov-950">
              <Globe className="h-4 w-4" />
            </a>
            <a href="#" aria-label="Social Links" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition hover:bg-gold-400 hover:text-gov-950">
              <LinkIcon className="h-4 w-4" />
            </a>
            <a href={`mailto:${email}`} aria-label="Email" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition hover:bg-gold-400 hover:text-gov-950">
              <Mail className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-display text-base font-bold text-gold-300">
            {lang === "hi" ? "त्वरित लिंक" : "Quick Links"}
          </h4>
          <ul className="mt-4 space-y-2 font-body text-sm">
            {[
              { h: "#home",    e: "Home",     hi: "मुख्य पृष्ठ" },
              { h: "#about",   e: "About Us", hi: "हमारे बारे में" },
              { h: "#staff",   e: "Staff",    hi: "शिक्षकगण" },
              { h: "#gallery", e: "Gallery",  hi: "चित्र दीर्घा" },
              { h: "#notices", e: "Notices",  hi: "सूचनाएँ" },
              { h: "#contact", e: "Contact",  hi: "संपर्क" },
            ].map((l) => (
              <li key={l.e}>
                <a href={l.h} className="text-white/70 transition hover:text-gold-300">{lang === "hi" ? l.hi : l.e}</a>
              </li>
            ))}
          </ul>
        </div>

        {/* Government links */}
        <div>
          <h4 className="font-display text-base font-bold text-gold-300">
            {lang === "hi" ? "सरकारी लिंक" : "Government Links"}
          </h4>
          <ul className="mt-4 space-y-2 font-body text-sm">
            {GOV_LINKS.map((l) => (
              <li key={l.label}>
                <a href={l.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-white/70 transition hover:text-gold-300">
                  {l.label} <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-display text-base font-bold text-gold-300">
            {lang === "hi" ? "संपर्क विवरण" : "Reach Us"}
          </h4>
          <ul className="mt-4 space-y-3 font-body text-sm text-white/75">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
              <span>{address}</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="h-4 w-4 shrink-0 text-gold-300" />
              <a href={`tel:${phone}`} className="hover:text-gold-300">{phone}</a>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="h-4 w-4 shrink-0 text-gold-300" />
              <a href={`mailto:${email}`} className="hover:text-gold-300 break-all">{email}</a>
            </li>
          </ul>

          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="font-heading text-[0.65rem] tracking-widest text-gold-300 uppercase">
              {lang === "hi" ? "आगंतुक गणना" : "Visitor Count"}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-white">
              {visitors.toLocaleString()}
            </p>
            <p className="font-body text-[0.7rem] text-white/50">
              {lang === "hi" ? "(स्टब — काउंटर कार्यान्वयन)" : "(stub — counter integration)"}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 bg-black/30">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row">
          <p className="text-center font-body text-xs text-white/55 sm:text-left">
            © {year} {lang === "hi" ? "शा. बालक उ. मा. विद्यालय, कैंट, गुना" : "Govt. Boys H. S. School, Cantt, Guna"}. {lang === "hi" ? "सर्वाधिकार सुरक्षित।" : "All rights reserved."}
          </p>
          <p className="font-body text-[0.7rem] text-white/45">
            {lang === "hi" ? "यह वेबसाइट सरकारी शिक्षा हेतु सार्वजनिक सेवा के रूप में विकसित की गई है।" : "This website is developed as a public service for government education."}
          </p>
          <a href="#home" className="inline-flex items-center gap-1 rounded-full bg-gold-400 px-4 py-2 font-heading text-xs font-bold text-gov-950 shadow-md transition hover:bg-gold-300">
            <ArrowUp className="h-3.5 w-3.5" /> {lang === "hi" ? "ऊपर जाएँ" : "Back to Top"}
          </a>
        </div>
      </div>
    </footer>
  );
}
