import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  getCurrentUser,
  login as appwriteLogin,
  logout as appwriteLogout,
  getSchoolInfo,
  getNotices,
  getTeachers,
  getGallery,
} from "../lib/appwrite.js";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [schoolInfo, setSchoolInfo] = useState(null);
  const [notices, setNotices] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [dataReady, setDataReady] = useState(false);

  const [highContrast, setHighContrast] = useState(() => {
    try { return localStorage.getItem("hs-contrast") === "1"; } catch { return false; }
  });
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("hs-lang") || "en"; } catch { return "en"; }
  });

  // Apply high-contrast mode on <html>
  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", highContrast);
    try { localStorage.setItem("hs-contrast", highContrast ? "1" : "0"); } catch {}
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem("hs-lang", lang); } catch {}
  }, [lang]);

  const toggleContrast = useCallback(() => setHighContrast((v) => !v), []);

  // Check for existing session on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await getCurrentUser();
      if (!cancelled) { setUser(u); setAuthLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load public site data once on mount.
  const refreshData = useCallback(async () => {
    setDataReady(false);
    const [info, ns, ts, gs] = await Promise.all([
      getSchoolInfo(), getNotices(), getTeachers(), getGallery(),
    ]);
    setSchoolInfo(info);
    setNotices(ns);
    setTeachers(ts);
    setGallery(gs);
    setDataReady(true);
  }, []);

  useEffect(() => {
    refreshData();
    // Lightweight polling every 60s so the notice board stays fresh.
    const id = setInterval(refreshData, 60000);
    return () => clearInterval(id);
  }, [refreshData]);

  const login = useCallback(async (email, password) => {
    const u = await appwriteLogin(email, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await appwriteLogout();
    setUser(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        user, authLoading, login, logout,
        schoolInfo, notices, teachers, gallery, dataReady, refreshData,
        highContrast, toggleContrast,
        lang, setLang,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
