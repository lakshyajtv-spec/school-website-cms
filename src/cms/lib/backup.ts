/**
 * Backup helpers — export/import the complete site data as one JSON file.
 */
import type { SiteData } from "@/cms/lib/types";
import { uid } from "@/cms/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function downloadSiteData(d: SiteData) {
  const blob = new Blob([JSON.stringify(d, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gbhss-content-backup.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function parseSiteData(text: string): SiteData | null {
  try {
    const d: unknown = JSON.parse(text);
    if (!d || typeof d !== "object") return null;
    const o = d as Record<string, unknown>;
    if (
      !o.en ||
      !o.hi ||
      !o.images ||
      !Array.isArray(o.teachers) ||
      !Array.isArray(o.notices) ||
      !Array.isArray(o.gallery) ||
      !o.settings
    ) {
      return null;
    }
    const site = d as SiteData;
    // Old backups used arbitrary text IDs. Normalize them before the atomic
    // RPC sends values to UUID database columns.
    site.teachers = site.teachers.map((item) => ({
      ...item,
      id: UUID_RE.test(item.id) ? item.id : uid(),
    }));
    site.notices = site.notices.map((item) => ({
      ...item,
      id: UUID_RE.test(item.id) ? item.id : uid(),
      status: item.status === "draft" ? "draft" : "published",
    }));
    site.gallery = site.gallery.map((item) => ({
      ...item,
      id: UUID_RE.test(item.id) ? item.id : uid(),
    }));
    return site;
  } catch {
    return null;
  }
}

export function siteDataSizeKB(d: SiteData): number {
  try {
    return Math.round(JSON.stringify(d).length / 1024);
  } catch {
    return 0;
  }
}
