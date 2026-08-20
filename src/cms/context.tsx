/**
 * CMS Context — authentication, draft state, publish and activity log.
 *
 * Data engine: TanStack Query loads the live site from the repository;
 * the draft is initialized once and synced only when the fetched data
 * reference changes (no effect loops → no React Error #310).
 * Publish writes to Appwrite and pushes the
 * result into LanguageContext so the public website updates instantly.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  fetchSiteDataStrict,
  resetAllData,
  safeClone,
} from "@/cms/lib/repository";
import type { SiteData } from "@/cms/lib/types";
import { defaultSiteData, uid } from "@/cms/lib/types";
import { account } from "@/cms/lib/appwrite";
import {
  deleteImageByUrl,
  fileIdFromUrl,
  finalizePendingImages,
} from "@/cms/lib/storage";

/* ------------------------------ activity ------------------------------ */

let activityLog: { id: string; text: string; time: string }[] = [];

export function getActivity(): { id: string; text: string; time: string }[] {
  return activityLog;
}

export function logActivity(text: string) {
  activityLog = [
    {
      id: uid(),
      text,
      time: new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
    ...activityLog,
  ].slice(0, 15);
}

/* ------------------------------ context ------------------------------ */

interface CmsCtx {
  authed: boolean;
  authLoading: boolean;
  /** Returns null on success, or the exact Appwrite error message on failure. */
  login: (email: string, pass: string) => Promise<string | null>;
  logout: () => Promise<void>;
  /** Fetched live site data (TanStack Query). */
  siteData: SiteData | undefined;
  loading: boolean;
  loadError: string | null;
  /** Editable working copy. */
  draft: SiteData | undefined;
  setDraft: React.Dispatch<React.SetStateAction<SiteData | undefined>>;
  dirty: boolean;
  publishing: boolean;
  publish: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Import a backup into the draft (not yet published). */
  applyImport: (d: SiteData) => void;
  /** Reset everything (DB + local) and publish defaults. */
  resetAll: () => Promise<void>;
  initialize: () => Promise<void>;
}

const CmsContext = createContext<CmsCtx | null>(null);

function courseImages(lang: { vocational: { subjects: unknown } }): string[] {
  const subjects = lang.vocational.subjects as Array<{ image?: string }> | undefined;
  return (subjects ?? []).map((c) => c.image ?? "");
}

function storageUrls(data: SiteData): Set<string> {
  const candidates = [
    data.settings.logo,
    data.settings.favicon,
    data.settings.principalPhoto,
    data.images.hero,
    data.images.heroCard,
    data.images.aboutA,
    data.images.aboutB,
    ...data.teachers.map((t) => t.photo),
    ...data.gallery.map((g) => g.src),
    ...courseImages(data.en),
    ...courseImages(data.hi),
  ];
  return new Set(candidates.filter((url) => url && fileIdFromUrl(url)));
}

/** True when an Appwrite request failed because the session is gone/expired. */
function isSessionExpiredError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      Number((error as { code?: unknown }).code) === 401,
  );
}

export function CmsProvider({ children }: { children: ReactNode }) {
  const { saveSiteData } = useLanguage();
  const queryClient = useQueryClient();

  const [authed, setAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [draft, setDraft] = useState<SiteData | undefined>(undefined);
  const [publishing, setPublishing] = useState(false);

  // Appwrite Account session is the source of truth for dashboard access.
  useEffect(() => {
    let mounted = true;
    if (!account) {
      setAuthLoading(false);
      return;
    }
    account
      .get()
      .then(() => {
        if (mounted) {
          setAuthed(true);
          setAuthLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setAuthed(false);
          setAuthLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Live data from Appwrite (react-query).
  const query = useQuery({
    queryKey: ["cms-site"],
    queryFn: fetchSiteDataStrict,
    enabled: authed,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const siteData = query.data;

  // Initialize draft once; sync only when fetched data reference changes.
  const lastRef = useRef<SiteData | undefined>(undefined);
  useEffect(() => {
    if (siteData && lastRef.current !== siteData) {
      lastRef.current = siteData;
      setDraft((prev) => (prev === undefined ? safeClone(siteData) : prev));
    }
  }, [siteData]);

  const dirty = useMemo(() => {
    if (!draft || !siteData) return false;
    try {
      return JSON.stringify(draft) !== JSON.stringify(siteData);
    } catch {
      return false;
    }
  }, [draft, siteData]);

  const login = useCallback(async (email: string, pass: string) => {
    if (!account) {
      return "Appwrite is not configured — check the VITE_APPWRITE_* environment variables";
    }
    try {
      await account.createEmailPasswordSession({
        email,
        password: pass,
      });
      await account.get();
      setAuthed(true);
      logActivity("Admin logged in");
      return null;
    } catch (error) {
      console.error("[cms/auth] Login failed:", error);
      const message = error instanceof Error ? error.message : String(error ?? "");
      return (
        message.trim() ||
        "Could not create a session. Check the email, password and Appwrite project configuration."
      );
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (account) await account.deleteSession({ sessionId: "current" });
      setAuthed(false);
      toast.success("Logged out");
    } catch (error) {
      console.error("[cms/auth] Logout failed:", error);
      toast.error("Logout failed");
    }
  }, []);

  const publish = useCallback(async () => {
    if (!draft) return;
    if (publishing) return;
    setPublishing(true);
    const tId = toast.loading("Publishing changes…");
    try {
      const stamped = { ...safeClone(draft), publishedAt: new Date().toISOString() };
      setDraft(stamped);
      await saveSiteData(safeClone(stamped));
      // Delete only URLs removed by a successful publish. This preserves the
      // currently-live assets when a draft is discarded or publish fails.
      if (siteData) {
        const nextUrls = storageUrls(stamped);
        const removed = [...storageUrls(siteData)].filter(
          (url) => !nextUrls.has(url),
        );
        const cleanup = await Promise.allSettled(removed.map(deleteImageByUrl));
        const failed = cleanup.filter((result) => result.status === "rejected");
        if (failed.length) {
          console.error("[cms] Published, but media cleanup failed:", failed);
          toast.error(
            `Content published, but ${failed.length} old media file(s) could not be deleted`,
            { id: tId },
          );
        } else {
          toast.success("Published — website updated instantly", { id: tId });
        }
        await finalizePendingImages(nextUrls);
      }
      logActivity("Published website content");
      await queryClient.invalidateQueries({ queryKey: ["cms-site"] });
    } catch (err) {
      console.error("[cms] Publish error:", err);
      if (isSessionExpiredError(err)) {
        setAuthed(false);
        toast.error("Session expired — please sign in again", { id: tId });
      } else {
        toast.error(
          `Publish failed — ${err instanceof Error ? err.message : String(err)}`,
          { id: tId },
        );
      }
    } finally {
      setPublishing(false);
    }
  }, [draft, siteData, publishing, saveSiteData, queryClient]);

  const refresh = useCallback(async () => {
    const tId = toast.loading("Refreshing…");
    try {
      await queryClient.refetchQueries({ queryKey: ["cms-site"] });
      toast.success("Content refreshed", { id: tId });
    } catch (err) {
      console.error("[cms] Refresh error:", err);
      toast.error("Refresh failed", { id: tId });
    }
  }, [queryClient]);

  const applyImport = useCallback((d: SiteData) => {
    setDraft(safeClone(d));
    toast.success("Backup loaded into draft — press Publish to apply");
  }, []);

  const resetAll = useCallback(async () => {
    const tId = toast.loading("Resetting content…");
    try {
      const fresh = await resetAllData();
      const stamped = { ...fresh, publishedAt: new Date().toISOString() };
      setDraft(stamped);
      await saveSiteData(safeClone(stamped));
      await queryClient.invalidateQueries({ queryKey: ["cms-site"] });
      toast.success("Content reset to defaults", { id: tId });
      logActivity("Reset all content");
    } catch (err) {
      console.error("[cms] Reset error:", err);
      if (isSessionExpiredError(err)) {
        setAuthed(false);
        toast.error("Session expired — please sign in again", { id: tId });
      } else {
        toast.error(
          `Reset failed — ${err instanceof Error ? err.message : String(err)}`,
          { id: tId },
        );
      }
    }
  }, [saveSiteData, queryClient]);

  const initialize = useCallback(async () => {
    const tId = toast.loading("Initializing website content…");
    try {
      const initial = {
        ...defaultSiteData(),
        publishedAt: new Date().toISOString(),
      };
      await saveSiteData(initial);
      setDraft(initial);
      await queryClient.resetQueries({ queryKey: ["cms-site"] });
      toast.success("Website initialized in Appwrite", { id: tId });
      logActivity("Initialized website content");
    } catch (error) {
      console.error("[cms] Initialization failed:", error);
      if (isSessionExpiredError(error)) {
        setAuthed(false);
        toast.error("Session expired — please sign in again", { id: tId });
      } else {
        toast.error(
          error instanceof Error ? error.message : "Initialization failed",
          { id: tId },
        );
      }
    }
  }, [saveSiteData, queryClient]);

  const value = useMemo<CmsCtx>(
    () => ({
      authed,
      authLoading,
      login,
      logout,
      siteData,
      loading: query.isLoading && !draft,
      loadError: query.error
        ? query.error instanceof Error
          ? query.error.message
          : String(query.error)
        : null,
      draft,
      setDraft,
      dirty,
      publishing,
      publish,
      refresh,
      applyImport,
      resetAll,
      initialize,
    }),
    [authed, authLoading, login, logout, siteData, query.isLoading, query.error, draft, dirty, publishing, publish, refresh, applyImport, resetAll, initialize],
  );

  return <CmsContext.Provider value={value}>{children}</CmsContext.Provider>;
}

export function useCms(): CmsCtx {
  const ctx = useContext(CmsContext);
  if (!ctx) throw new Error("useCms must be used inside <CmsProvider>");
  return ctx;
}
