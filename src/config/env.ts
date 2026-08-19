/** Appwrite browser configuration. No API keys or server secrets belong here. */
const endpoint = String(import.meta.env.VITE_APPWRITE_ENDPOINT ?? "").trim();
const projectId = String(import.meta.env.VITE_APPWRITE_PROJECT_ID ?? "").trim();
const databaseId = String(import.meta.env.VITE_APPWRITE_DATABASE_ID ?? "").trim();
const bucketId = String(import.meta.env.VITE_APPWRITE_BUCKET_ID ?? "").trim();

export const APPWRITE_ENDPOINT = endpoint.replace(/\/$/, "");
export const APPWRITE_PROJECT_ID = projectId;
export const APPWRITE_DATABASE_ID = databaseId;
export const APPWRITE_BUCKET_ID = bucketId;

export const isAppwriteConfigured = Boolean(
  APPWRITE_ENDPOINT.startsWith("https://") &&
    APPWRITE_PROJECT_ID &&
    APPWRITE_DATABASE_ID &&
    APPWRITE_BUCKET_ID,
);

export const appwriteConfigError = isAppwriteConfigured
  ? null
  : "Missing Appwrite environment variables";
