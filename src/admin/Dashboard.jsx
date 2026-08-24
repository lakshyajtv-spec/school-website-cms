import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { LogOut, LayoutDashboard, FileText, Users, Image as ImageIcon, Settings, Menu, X, ArrowLeft, RefreshCw } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import Login from "./Login.jsx";
import NoticesManager from "./NoticesManager.jsx";
import TeachersManager from "./TeachersManager.jsx";
import GalleryManager from "./GalleryManager.jsx";
import SettingsManager from "./SettingsManager.jsx";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "notices",  label: "Notices",  icon: FileText },
  { id: "teachers", label: "Teachers", icon: Users },
  { id: "gallery",  label: "Gallery",  icon: ImageIcon },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function AdminDashboard() {
  const { user, authLoading, logout, refreshData, notices, teachers, gallery, dataReady } = useApp();
  const [tab, setTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Lock body scroll on mobile when sidebar open
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gov-950">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Login />;

  const gotoTab = (id) => { setTab(id); setSidebarOpen(false); };

  return (
    <div className="flex min-h-screen bg-gov-50 text-gov-900">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 transform bg-gov-900 text-white transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="tricolor-stripe" />
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-400 text-gov-900">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-sm font-bold leading-tight">Admin Panel</p>
              <p className="font-heading text-[0.6rem] tracking-widest text-gold-300 uppercase">School CMS</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-4 space-y-1 px-3">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => gotoTab(id)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left font-heading text-sm font-semibold transition ${
                tab === id ? "bg-gold-400 text-gov-900 shadow-lg" : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4.5 w-4.5" /> {label}
            </button>
          ))}
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 p-4">
          <div className="mb-3 rounded-xl bg-white/5 p-3">
            <p className="font-heading text-xs text-white/60">Signed in as</p>
            <p className="truncate font-body text-sm font-semibold text-white">{user.email}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <a href="#home" className="flex items-center justify-center gap-1.5 rounded-xl border border-white/20 px-3 py-2 font-heading text-xs font-semibold text-white/85 transition hover:bg-white/10">
              <ArrowLeft className="h-3.5 w-3.5" /> Visit Site
            </a>
            <button onClick={async () => { await logout(); toast.success("Logged out"); }} className="flex items-center justify-center gap-1.5 rounded-xl bg-red-500 px-3 py-2 font-heading text-xs font-semibold text-white transition hover:bg-red-600">
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <main className="flex min-h-screen flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-gov-200 bg-white/90 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-gov-700 hover:bg-gov-100 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-display text-lg font-bold text-gov-900 capitalize">{tab}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refreshData} className="inline-flex items-center gap-1.5 rounded-lg border border-gov-200 px-3 py-1.5 font-heading text-xs font-semibold text-gov-700 transition hover:bg-gov-50">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <div className="hidden items-center gap-2 rounded-full bg-gov-100 px-3 py-1.5 sm:inline-flex">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="font-heading text-xs font-semibold text-gov-700">Connected to Appwrite</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {tab === "overview" && <Overview notices={notices} teachers={teachers} gallery={gallery} dataReady={dataReady} gotoTab={gotoTab} />}
          {tab === "notices"  && <NoticesManager />}
          {tab === "teachers" && <TeachersManager />}
          {tab === "gallery"  && <GalleryManager />}
          {tab === "settings" && <SettingsManager />}
        </div>
      </main>
    </div>
  );
}

function Overview({ notices, teachers, gallery, dataReady, gotoTab }) {
  const stats = [
    { label: "Active Notices", value: notices.length, color: "from-saffron to-[#c06b14]", icon: FileText, tab: "notices" },
    { label: "Faculty Members", value: teachers.length, color: "from-gov-700 to-gov-900", icon: Users, tab: "teachers" },
    { label: "Gallery Photos", value: gallery.length, color: "from-india-green to-[#0b5806]", icon: ImageIcon, tab: "gallery" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gov-800 via-gov-700 to-gov-900 p-8 text-white shadow-soft">
        <div className="tricolor-stripe absolute inset-x-0 top-0" />
        <h2 className="mt-2 font-display text-2xl font-black sm:text-3xl">Welcome back, Admin!</h2>
        <p className="mt-2 max-w-xl font-body text-sm text-white/80">
          Manage school notices, faculty details, gallery photos and general settings from this dashboard. Changes you make are reflected on the public website instantly.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={() => gotoTab("notices")} className="rounded-xl bg-gold-400 px-4 py-2 font-heading text-xs font-bold text-gov-900 transition hover:bg-gold-300">+ New Notice</button>
          <button onClick={() => gotoTab("teachers")} className="rounded-xl bg-white/10 px-4 py-2 font-heading text-xs font-bold text-white transition hover:bg-white/20">+ Add Teacher</button>
          <button onClick={() => gotoTab("gallery")} className="rounded-xl bg-white/10 px-4 py-2 font-heading text-xs font-bold text-white transition hover:bg-white/20">+ Upload Photos</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.label} onClick={() => gotoTab(s.tab)} className="gov-card relative overflow-hidden rounded-2xl border border-gov-100 bg-white p-6 text-left">
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-white`}>
                <Icon className="h-6 w-6" />
              </div>
              <p className="mt-4 font-heading text-xs font-semibold tracking-widest text-gov-600 uppercase">{s.label}</p>
              <p className="mt-1 font-display text-3xl font-black text-gov-900">
                {dataReady ? s.value : "…"}
              </p>
              <p className="mt-1 font-body text-xs text-gov-600">Click to manage →</p>
            </button>
          );
        })}
      </div>

      {/* Recent notices */}
      <div className="rounded-3xl border border-gov-100 bg-white p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-gov-900">Recent Notices</h3>
          <button onClick={() => gotoTab("notices")} className="font-heading text-xs font-bold text-gov-700 hover:text-gov-900">View all →</button>
        </div>
        <ul className="mt-4 divide-y divide-gov-100">
          {notices.slice(0, 5).map((n) => (
            <li key={n.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-heading text-sm font-semibold text-gov-900">
                  {n.is_pinned && <span className="rounded bg-saffron/20 px-1.5 py-0.5 text-[0.6rem] font-bold text-[#a84f0c]">PINNED</span>}
                  {n.title}
                </p>
                <p className="truncate font-body text-xs text-gov-600">{n.description}</p>
              </div>
              <span className="shrink-0 font-heading text-xs text-gov-500">{n.date}</span>
            </li>
          ))}
          {notices.length === 0 && (
            <li className="py-6 text-center font-body text-sm text-gov-500">No notices yet. Create your first notice.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
