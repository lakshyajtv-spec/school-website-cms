import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { type Content, type Lang } from "@/i18n/content";
import { defaultSiteData, type SiteData } from "@/cms/lib/types";
import {
  fetchSiteDataStrict,
  publishSiteData,
} from "@/cms/lib/repository";
import { appwriteClient, ALL_COLLECTIONS, APPWRITE_IDS } from "@/cms/lib/appwrite";
import { isAppwriteConfigured } from "@/config/env";

type LanguageValue = {
  lang: Lang;
  t: Content;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  /** Full editable site data — loaded from Appwrite. */
  siteData: SiteData;
  /** True once fresh data has been fetched from Appwrite. */
  dataReady: boolean;
  dataError: string | null;
  /** Publish draft to Appwrite. Returns success flag. */
  saveSiteData: (d: SiteData) => Promise<void>;
  /** Re-fetch the latest content from Appwrite. */
  refreshSiteData: () => Promise<void>;
};

const LanguageContext = createContext<LanguageValue | null>(null);

const STORAGE_KEY = "gbhss-lang";

function readInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "hi" || stored === "en" ? stored : "en";
  } catch {
    return "en";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitialLang);
  const [siteData, setSiteData] = useState<SiteData>(() => defaultSiteData());
  const [dataReady, setDataReady] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Load fresh content from Appwrite on mount (website + admin both use this).
  // Public rendering waits for Appwrite before showing CMS content.
  // fetch. A backend failure cannot blank the public site.
  useEffect(() => {
    // Frontend-only/local development mode: render the bundled bilingual data.
    // Appwrite wiring is configured separately and does not block this UI task.
    if (!isAppwriteConfigured) {
      setDataReady(true);
      setDataError(null);
      return;
    }
    let cancelled = false;
    fetchSiteDataStrict()
      .then((d) => {
        if (!cancelled) {
          setSiteData(d);
          setDataError(null);
          setDataReady(true);
        }
      })
      .catch((err) => {
        console.error("[LanguageProvider] Content load failed:", err);
        if (!cancelled) {
          setDataError(err instanceof Error ? err.message : String(err));
          setDataReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      document.title =
        lang === "hi"
          ? "शा. बालक उ. मा. विद्यालय कैंट, गुना | सर्व शिक्षा (EFA) शासकीय विद्यालय"
          : "Govt. Boys H. S. School Cantt, Guna | EFA Government School";
    } catch {
      /* document.title assignment can throw in sandboxed iframes */
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage unavailable — ignore */
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggleLang = useCallback(
    () => setLangState((l) => (l === "en" ? "hi" : "en")),
    [],
  );

  /** Publish to Appwrite; on success the whole site updates instantly. */
  const saveSiteData = useCallback(async (d: SiteData): Promise<void> => {
    const res = await publishSiteData(d);
    if (!res.ok) throw new Error(res.error || "Appwrite publish failed");
    setSiteData(d);
    setDataError(null);
    setDataReady(true);
  }, []);

  const refreshSiteData = useCallback(async () => {
    try {
      const d = await fetchSiteDataStrict();
      setSiteData(d);
      setDataError(null);
    } catch (error) {
      console.error("[LanguageProvider] Refresh failed:", error);
      setDataError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  // Appwrite Realtime synchronization across all CMS collections.
  useEffect(() => {
    const client = appwriteClient;
    if (!client) return;
    let timer: number | undefined;
    const scheduleRefresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        fetchSiteDataStrict()
          .then(setSiteData)
          .catch((error) =>
            console.error("[LanguageProvider] Realtime refresh failed:", error),
          );
      }, 250);
    };

    const channels = ALL_COLLECTIONS.map(
      (collection) =>
        `databases.${APPWRITE_IDS.database}.collections.${collection}.documents`,
    );
    const unsubscribe = client.subscribe(channels, scheduleRefresh);

    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const value = useMemo<LanguageValue>(
    () => ({
      lang,
      t: siteData[lang] as Content,
      setLang,
      toggleLang,
      siteData,
      dataReady,
      dataError,
      saveSiteData,
      refreshSiteData,
    }),
    [lang, siteData, dataReady, dataError, setLang, toggleLang, saveSiteData, refreshSiteData],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside <LanguageProvider>");
  }
  return ctx;
}

/** Shorthand for components that only need the translated content tree. */
export function useT(): Content {
  return useLanguage().t;
}
