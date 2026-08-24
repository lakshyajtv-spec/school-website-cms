import { useState } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowLeft } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";

export default function AdminLogin() {
  const { login } = useApp();
  const [email, setEmail] = useState("admin@school.local");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErr(false);
    if (!email.trim() || !pass) { setErr(true); return; }
    setLoading(true);
    try {
      await login(email.trim(), pass);
      toast.success("Welcome, Admin!");
    } catch (e) {
      console.error(e);
      setErr(true);
      toast.error(e?.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-gov-950 via-gov-900 to-gov-800 px-4">
      <div className="pointer-events-none absolute inset-0 grid-pattern opacity-[0.12]" />
      <div className="pointer-events-none absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-gov-500/25 blur-[120px]" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-[26rem] w-[26rem] rounded-full bg-gold-400/20 blur-[130px]" />

      <a href="#home" className="absolute top-6 left-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 font-heading text-xs font-semibold text-white/80 backdrop-blur-sm transition hover:bg-white/10">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Website
      </a>

      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="glass-dark relative w-full max-w-md rounded-[2rem] p-7 shadow-[0_50px_100px_-40px_rgba(0,0,0,.8)] sm:p-9"
      >
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="absolute -inset-2 rounded-3xl bg-gold-300/25 blur-xl" />
            <div className="seal-ring relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gov-700 to-gov-900 text-gold-300">
              <ShieldCheck className="h-8 w-8" />
            </div>
          </div>
          <p className="mt-4 font-display text-base font-extrabold text-white">Admin Panel</p>
          <p className="font-heading text-[0.65rem] tracking-[0.28em] text-gold-300 uppercase">
            Govt. School CMS
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block font-heading text-xs font-semibold tracking-wide text-gov-100/80 uppercase">Admin Email</span>
            <div className="relative">
              <Mail className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gov-100/40" />
              <input
                type="email"
                value={email}
                autoComplete="username"
                onChange={(e) => { setEmail(e.target.value); setErr(false); }}
                placeholder="admin@school.local"
                className="w-full rounded-xl border border-white/15 bg-white/10 py-3 pr-4 pl-10 font-body text-sm text-white placeholder-gov-100/40 outline-none transition focus:border-gold-300/60 focus:ring-4 focus:ring-gold-300/20"
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block font-heading text-xs font-semibold tracking-wide text-gov-100/80 uppercase">Password</span>
            <div className="relative">
              <Lock className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gov-100/40" />
              <input
                type={show ? "text" : "password"}
                value={pass}
                autoComplete="current-password"
                onChange={(e) => { setPass(e.target.value); setErr(false); }}
                placeholder="Enter password"
                className="w-full rounded-xl border border-white/15 bg-white/10 py-3 pr-12 pl-10 font-body text-sm text-white placeholder-gov-100/40 outline-none transition focus:border-gold-300/60 focus:ring-4 focus:ring-gold-300/20"
              />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} className="absolute top-1/2 right-3 -translate-y-1/2 text-gov-100/50 transition hover:text-gold-300">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {err && (
            <motion.p initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="font-body text-xs text-red-300">
              Invalid email or password. Please try again.
            </motion.p>
          )}

          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-400 to-gold-300 px-5 py-3.5 font-heading font-semibold text-gov-900 shadow-[0_18px_45px_-16px_rgba(212,175,55,.85)] transition-all duration-300 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-70"
          >
            {loading ? (
              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-gov-900/30 border-t-gov-900" />Verifying…</>
            ) : (
              <><ShieldCheck className="h-4 w-4" /> Login to Dashboard</>
            )}
          </motion.button>

          <p className="text-center font-body text-[0.7rem] text-gov-100/45">
            Authorized personnel only · Session secured by Appwrite
          </p>
        </div>
      </motion.form>
    </div>
  );
}
