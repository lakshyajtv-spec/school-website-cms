/**
 * src/lib/appwrite.js
 * -----------------------------------------------------------------------------
 * Clean helper layer over the Appwrite Web SDK (v14+ / v26) for the
 * Government School Website CMS.
 *
 * Exports:
 *   - Singleton client, account, databases, storage
 *   - Fetch helpers:   getNotices, getTeachers, getGallery, getSchoolInfo
 *   - Auth helpers:    login, logout, getCurrentUser
 *   - File helpers:    uploadFile, deleteFile, getFilePreviewUrl, getFileViewUrl
 *   - Admin CRUD:      createNotice / updateNotice / deleteNotice / togglePinNotice
 *                      createTeacher / updateTeacher / deleteTeacher
 *                      createGalleryItem / updateGalleryItem / deleteGalleryItem
 *                      setSchoolInfo
 *   - APPWRITE_CONFIG  object (endpoint, project, database, bucket)
 *   - COLLECTIONS      map of collection IDs
 *   - defaultSchoolInfo() for fallback UI
 *
 * Collections (created by `node setup-appwrite.js`):
 *   notices, teachers, gallery, school_info
 * Bucket: school_assets
 * -----------------------------------------------------------------------------
 */
import { Client, Account, Databases, Storage, ID, Query } from "appwrite";

// ── Read config from Vite env (VITE_* are safe to ship to browser) ────────────
const ENDPOINT    = (import.meta.env.VITE_APPWRITE_ENDPOINT    || "https://fra.cloud.appwrite.io/v1").replace(/\/$/, "");
const PROJECT_ID  = import.meta.env.VITE_APPWRITE_PROJECT_ID   || "6a8bb200003e1fcd3d26";
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID  || "school_db";
const BUCKET_ID   = import.meta.env.VITE_APPWRITE_BUCKET_ID    || "school_assets";

export const APPWRITE_CONFIG = { ENDPOINT, PROJECT_ID, DATABASE_ID, BUCKET_ID };
export const COLLECTIONS = {
  notices:     "notices",
  teachers:    "teachers",
  gallery:     "gallery",
  school_info: "school_info",
};
export const BUCKET = BUCKET_ID;

export const isConfigured = Boolean(
  ENDPOINT.startsWith("https://") && PROJECT_ID && DATABASE_ID && BUCKET_ID
);

// ── SDK singletons ───────────────────────────────────────────────────────────
export const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID);

export const account   = new Account(client);
export const databases = new Databases(client);
export const storage   = new Storage(client);

// ── Auth ─────────────────────────────────────────────────────────────────────
export async function login(email, password) {
  await account.createEmailPasswordSession(email, password);
  return account.get();
}

export async function logout() {
  try { await account.deleteSession("current"); } catch (_) { /* already logged out */ }
}

export async function getCurrentUser() {
  try { return await account.get(); } catch { return null; }
}

// ── File helpers ─────────────────────────────────────────────────────────────
/** Upload a File/Blob to school_assets. Returns Appwrite file ID. */
export async function uploadFile(file) {
  if (!isConfigured) throw new Error("Appwrite is not configured");
  const res = await storage.createFile(BUCKET_ID, ID.unique(), file);
  return res.$id;
}

export async function deleteFile(fileId) {
  if (!fileId) return;
  try { await storage.deleteFile(BUCKET_ID, fileId); }
  catch (e) { console.warn("[appwrite] deleteFile failed:", e); }
}

/** Public preview URL (uses Appwrite's image resizing endpoint). */
export function getFilePreviewUrl(fileId, { width, height, quality } = {}) {
  if (!fileId) return "";
  try {
    return storage.getFilePreview(BUCKET_ID, fileId, width, height);
  } catch {
    // Fallback: build URL manually if SDK version mismatches
    const params = new URLSearchParams({ project: PROJECT_ID });
    if (width)   params.set("width", width);
    if (height)  params.set("height", height);
    if (quality) params.set("quality", quality);
    return `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${encodeURIComponent(fileId)}/preview?${params}`;
  }
}

/** Public view/download URL (original file — used for PDFs etc.). */
export function getFileViewUrl(fileId) {
  if (!fileId) return "";
  try {
    return storage.getFileView(BUCKET_ID, fileId);
  } catch {
    return `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${encodeURIComponent(fileId)}/view?project=${PROJECT_ID}`;
  }
}

// ── Public fetch helpers ─────────────────────────────────────────────────────
export async function getNotices() {
  if (!isConfigured) return [];
  try {
    const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.notices, [
      Query.orderDesc("date"),
      Query.limit(100),
    ]);
    // Client-side pin sort (pinned first) because boolean order varies
    return res.documents.map(mapNotice).sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned));
  } catch (e) {
    console.error("[appwrite] getNotices failed:", e);
    return [];
  }
}

export async function getTeachers() {
  if (!isConfigured) return [];
  try {
    const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.teachers, [
      Query.orderAsc("order"),
      Query.limit(100),
    ]);
    return res.documents.map(mapTeacher);
  } catch (e) {
    console.error("[appwrite] getTeachers failed:", e);
    return [];
  }
}

export async function getGallery(category) {
  if (!isConfigured) return [];
  try {
    const queries = [Query.orderDesc("created_at"), Query.limit(200)];
    if (category && category !== "All") queries.unshift(Query.equal("category", category));
    const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.gallery, queries);
    return res.documents.map(mapGalleryItem);
  } catch (e) {
    console.error("[appwrite] getGallery failed:", e);
    return [];
  }
}

/** Fetch the school_info key/value store → plain object. */
export async function getSchoolInfo() {
  const info = defaultSchoolInfo();
  if (!isConfigured) return info;
  try {
    const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.school_info, [Query.limit(500)]);
    for (const doc of res.documents) {
      if (doc.key) info[doc.key] = String(doc.value ?? "");
    }
  } catch (e) {
    console.error("[appwrite] getSchoolInfo failed:", e);
  }
  return info;
}

// ── Admin CRUD: Notices ──────────────────────────────────────────────────────
export async function createNotice(data) {
  return databases.createDocument(
    DATABASE_ID, COLLECTIONS.notices, ID.unique(), normalizeNotice(data)
  );
}
export async function updateNotice(id, data) {
  return databases.updateDocument(
    DATABASE_ID, COLLECTIONS.notices, id, normalizeNotice(data)
  );
}
export async function deleteNotice(id) {
  return databases.deleteDocument(DATABASE_ID, COLLECTIONS.notices, id);
}
export async function togglePinNotice(id, pinned) {
  return databases.updateDocument(DATABASE_ID, COLLECTIONS.notices, id, { is_pinned: !!pinned });
}

// ── Admin CRUD: Teachers ─────────────────────────────────────────────────────
export async function createTeacher(data) {
  return databases.createDocument(
    DATABASE_ID, COLLECTIONS.teachers, ID.unique(), normalizeTeacher(data)
  );
}
export async function updateTeacher(id, data) {
  return databases.updateDocument(
    DATABASE_ID, COLLECTIONS.teachers, id, normalizeTeacher(data)
  );
}
export async function deleteTeacher(id) {
  return databases.deleteDocument(DATABASE_ID, COLLECTIONS.teachers, id);
}

// ── Admin CRUD: Gallery ──────────────────────────────────────────────────────
export async function createGalleryItem(data) {
  return databases.createDocument(
    DATABASE_ID, COLLECTIONS.gallery, ID.unique(), normalizeGallery(data)
  );
}
export async function updateGalleryItem(id, data) {
  return databases.updateDocument(
    DATABASE_ID, COLLECTIONS.gallery, id, normalizeGallery(data)
  );
}
export async function deleteGalleryItem(id) {
  return databases.deleteDocument(DATABASE_ID, COLLECTIONS.gallery, id);
}

// ── Admin: school_info upsert ────────────────────────────────────────────────
export async function setSchoolInfo(key, value) {
  // Find existing doc with this key
  const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.school_info, [
    Query.equal("key", key), Query.limit(1),
  ]);
  const existing = res.documents[0];
  if (existing) {
    return databases.updateDocument(DATABASE_ID, COLLECTIONS.school_info, existing.$id, {
      key, value: String(value ?? ""),
    });
  }
  return databases.createDocument(DATABASE_ID, COLLECTIONS.school_info, ID.unique(), {
    key, value: String(value ?? ""),
  });
}

// ── Document mappers ─────────────────────────────────────────────────────────
function mapNotice(d) {
  return {
    id:          d.$id,
    title:       d.title       || "",
    description: d.description || "",
    date:        d.date        || "",
    pdf_url:     d.pdf_url     || "",
    pdfPreview:  d.pdf_url ? getFileViewUrl(d.pdf_url) : "",
    is_pinned:   !!d.is_pinned,
  };
}

function mapTeacher(d) {
  return {
    id:            d.$id,
    name:          d.name          || "",
    designation:   d.designation   || "",
    subject:       d.subject       || "",
    qualification: d.qualification || "",
    image_id:      d.image_id      || "",
    image:         d.image_id ? getFilePreviewUrl(d.image_id, { width: 400, height: 400 }) : "",
    order:         Number(d.order  || 0),
  };
}

function mapGalleryItem(d) {
  return {
    id:         d.$id,
    title:      d.title     || "",
    image_id:   d.image_id  || "",
    image:      d.image_id ? getFilePreviewUrl(d.image_id, { width: 800 }) : "",
    category:   d.category  || "Campus",
    created_at: d.created_at || "",
  };
}

// ── Normalizers (keep DB payload clean) ──────────────────────────────────────
function normalizeNotice(d) {
  return {
    title:       String(d.title       || ""),
    description: String(d.description || ""),
    date:        String(d.date        || new Date().toISOString().slice(0, 10)),
    pdf_url:     String(d.pdf_url     || ""),
    is_pinned:   !!d.is_pinned,
  };
}
function normalizeTeacher(d) {
  return {
    name:          String(d.name          || ""),
    designation:   String(d.designation   || ""),
    subject:       String(d.subject       || ""),
    qualification: String(d.qualification || ""),
    image_id:      String(d.image_id      || ""),
    order:         Number(d.order         || 0),
  };
}
function normalizeGallery(d) {
  return {
    title:      String(d.title      || ""),
    image_id:   String(d.image_id   || ""),
    category:   String(d.category   || "Campus"),
    created_at: d.created_at || new Date().toISOString(),
  };
}

// ── Fallback defaults (before Appwrite returns live data) ────────────────────
export function defaultSchoolInfo() {
  return {
    school_name:        "Government Boys Higher Secondary School",
    school_place:       "Cantt, Guna, Madhya Pradesh",
    school_tagline:     "Education For All (EFA) Government School",
    affiliation:        "M.P. Board of Secondary Education (MPBSE)",
    classes:            "Class 1 to Class 12",
    establishment_year: "1965",
    address:            "Cantt Area, Guna, Madhya Pradesh – 473001",
    phone:              "+91-00000-00000",
    email:              "principal@school.local",
    principal_name:     "Principal",
    principal_message:  "Welcome to our school. We are committed to providing quality education to every child in a safe and inclusive environment.",
    vision:             "To provide quality government education that empowers every student with knowledge, values, discipline and practical skills for life.",
    mission:            "Quality government education for every child, backed by experienced teachers, modern facilities, and a commitment to excellence.",
    map_embed:          "https://www.google.com/maps?q=Guna,Madhya+Pradesh&output=embed",
    hero_banner_1:      "",
    hero_banner_2:      "",
    hero_banner_3:      "",
    logo_url:           "",
    principal_photo:    "",
  };
}
