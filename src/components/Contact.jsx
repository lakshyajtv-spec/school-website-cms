import { useState } from "react";
import toast from "react-hot-toast";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2 } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";

export default function Contact() {
  const { schoolInfo, lang } = useApp();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });

  const address = schoolInfo?.address || "Cantt Area, Guna, Madhya Pradesh";
  const phone = schoolInfo?.phone || "+91-00000-00000";
  const email = schoolInfo?.email || "principal@school.local";
  const mapSrc = schoolInfo?.map_embed || "https://www.google.com/maps?q=Guna,Madhya+Pradesh&output=embed";

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error(lang === "hi" ? "कृपया आवश्यक फ़ील्ड भरें।" : "Please fill in the required fields.");
      return;
    }
    setSubmitting(true);
    // NOTE: since we don't provision a contact-messages collection in this setup,
    // we simulate a successful submission (and open the user's mail client as a
    // fallback so the inquiry still reaches the school).
    await new Promise((r) => setTimeout(r, 900));
    setSubmitting(false);
    setDone(true);
    toast.success(lang === "hi" ? "आपका संदेश भेज दिया गया है।" : "Your inquiry has been submitted.");
    setTimeout(() => setDone(false), 5000);
    // Fallback: open mail client
    try {
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(form.subject || "Inquiry")}&body=${encodeURIComponent(`From: ${form.name} <${form.email}> (${form.phone})\n\n${form.message}`)}`;
    } catch {}
    setForm({ name: "", email: "", phone: "", subject: "", message: "" });
  };

  const field = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <section id="contact" className="section-pad relative bg-gradient-to-b from-gov-50 to-white">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <span className="eyebrow !mx-auto justify-center">{lang === "hi" ? "संपर्क करें" : "Get In Touch"}</span>
          <h2 className="mt-3 text-3xl font-black text-gov-900 sm:text-4xl md:text-5xl">
            {lang === "hi" ? "हमसे संपर्क" : "Contact"} <span className="text-gradient-blue">{lang === "hi" ? "करें" : "Us"}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl font-body text-base text-gov-800/70">
            {lang === "hi"
              ? "विद्यालय से संबंधित किसी भी जानकारी, प्रवेश या शिकायत के लिए कृपया हमसे संपर्क करें।"
              : "For any information regarding the school, admissions or grievances, please feel free to reach out."}
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-5">
          {/* Contact info */}
          <div className="space-y-4 lg:col-span-2">
            {[
              { icon: MapPin, title: lang==="hi"?"पता":"Address",      value: address, color: "bg-saffron" },
              { icon: Phone,  title: lang==="hi"?"दूरभाष":"Phone",      value: phone,   color: "bg-india-green" },
              { icon: Mail,   title: lang==="hi"?"ईमेल":"Email",        value: email,   color: "bg-gov-700" },
              { icon: Clock,  title: lang==="hi"?"कार्य समय":"Office Hours", value: lang==="hi"?"सोमवार – शनिवार, प्रातः 9:00 – अपराह्न 4:00":"Monday – Saturday, 9:00 AM – 4:00 PM", color: "bg-gold-400" },
            ].map(({ icon: Icon, title, value, color }, i) => (
              <div key={i} className="gov-card flex items-start gap-4 rounded-2xl border border-gov-100 bg-white p-5">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-display text-sm font-bold uppercase tracking-wider text-gov-700">{title}</h4>
                  <p className="mt-1 break-words font-body text-sm text-gov-900">{value}</p>
                </div>
              </div>
            ))}

            {/* Map */}
            <div className="overflow-hidden rounded-2xl border border-gov-100 bg-white shadow-card">
              <iframe
                title="School Location"
                src={mapSrc}
                className="h-64 w-full"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>

          {/* Inquiry form */}
          <div className="lg:col-span-3">
            <form onSubmit={onSubmit} className="rounded-3xl border border-gov-100 bg-white p-6 shadow-soft sm:p-8">
              <h3 className="font-display text-xl font-bold text-gov-900">
                {lang === "hi" ? "जानकारी / शिकायत फॉर्म" : "Inquiry / Grievance Form"}
              </h3>
              <p className="mt-1 font-body text-sm text-gov-700/70">
                {lang === "hi" ? "हम शीघ्र ही आपसे संपर्क करेंगे।" : "We will get back to you shortly."}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label={lang==="hi"?"नाम *":"Full Name *"} value={form.name} onChange={(v)=>field("name",v)} />
                <Field label={lang==="hi"?"ईमेल *":"Email *"} type="email" value={form.email} onChange={(v)=>field("email",v)} />
                <Field label={lang==="hi"?"दूरभाष":"Phone"} value={form.phone} onChange={(v)=>field("phone",v)} />
                <Field label={lang==="hi"?"विषय":"Subject"} value={form.subject} onChange={(v)=>field("subject",v)} />
              </div>
              <label className="mt-4 block">
                <span className="mb-1.5 block font-heading text-xs font-semibold tracking-wide text-gov-700 uppercase">
                  {lang === "hi" ? "संदेश *" : "Message *"}
                </span>
                <textarea
                  rows={5}
                  value={form.message}
                  onChange={(e) => field("message", e.target.value)}
                  className="w-full resize-none rounded-xl border border-gov-200 bg-gov-50/60 px-4 py-3 font-body text-sm text-gov-900 outline-none transition focus:border-gov-500 focus:bg-white focus:ring-4 focus:ring-gov-200"
                  placeholder={lang === "hi" ? "अपना संदेश यहाँ लिखें…" : "Write your message here…"}
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gov-800 to-gov-700 px-6 py-3.5 font-heading font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-70 sm:w-auto sm:px-8"
              >
                {submitting ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />{lang==="hi"?"भेजा जा रहा है…":"Sending…"}</>
                ) : done ? (
                  <><CheckCircle2 className="h-5 w-5 text-green-300" />{lang==="hi"?"भेज दिया गया":"Submitted"}</>
                ) : (
                  <><Send className="h-4 w-4" />{lang==="hi"?"संदेश भेजें":"Send Message"}</>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-heading text-xs font-semibold tracking-wide text-gov-700 uppercase">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gov-200 bg-gov-50/60 px-4 py-3 font-body text-sm text-gov-900 outline-none transition focus:border-gov-500 focus:bg-white focus:ring-4 focus:ring-gov-200"
      />
    </label>
  );
}
