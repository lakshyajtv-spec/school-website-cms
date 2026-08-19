import { ID, Permission, Role } from "appwrite";
import { storage, APPWRITE_IDS } from "@/cms/lib/appwrite";

export const STORAGE_BUCKET = APPWRITE_IDS.bucket;
const PENDING_KEY = "appwrite-pending-media";

function pendingUrls(): string[] {
  try {
    const value = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function savePending(urls: string[]) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(urls));
  } catch {
    /* temporary registry unavailable */
  }
}

export async function uploadImage(
  file: File,
  _folder: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  if (!storage || !STORAGE_BUCKET) throw new Error("Appwrite Storage is not configured");
  if (!file.type.startsWith("image/")) throw new Error("Only image files are allowed");
  if (file.size > 10 * 1024 * 1024) throw new Error("Image must be smaller than 10 MB");

  const created = await storage.createFile({
    bucketId: STORAGE_BUCKET,
    fileId: ID.unique(),
    file,
    permissions: [
      Permission.read(Role.any()),
      Permission.update(Role.users()),
      Permission.delete(Role.users()),
    ],
    onProgress: (event) => onProgress?.(event.progress),
  });
  const url = storage.getFileView({ bucketId: STORAGE_BUCKET, fileId: created.$id });
  savePending([...new Set([...pendingUrls(), url])]);
  return url;
}

export function fileIdFromUrl(url: string): string | null {
  try {
    const match = new URL(url).pathname.match(
      /\/storage\/buckets\/[^/]+\/files\/([^/]+)\/view/,
    );
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export async function deleteImageByUrl(url: string): Promise<void> {
  if (!storage || !STORAGE_BUCKET || !url) return;
  const fileId = fileIdFromUrl(url);
  if (!fileId) return;
  await storage.deleteFile({ bucketId: STORAGE_BUCKET, fileId });
  savePending(pendingUrls().filter((item) => item !== url));
}

/** Finalize referenced uploads and remove temporary files excluded from publish. */
export async function finalizePendingImages(publishedUrls: Set<string>) {
  const pending = pendingUrls();
  const orphaned = pending.filter((url) => !publishedUrls.has(url));
  const results = await Promise.allSettled(orphaned.map(deleteImageByUrl));
  savePending(pending.filter((url) => publishedUrls.has(url)));
  // Referenced files are no longer temporary.
  savePending([]);
  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length) {
    throw new Error(`${failed.length} temporary media file(s) could not be deleted`);
  }
}