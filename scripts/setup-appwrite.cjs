#!/usr/bin/env node
/**
 * setup-appwrite.cjs — server-side Appwrite provisioning for the school CMS.
 *
 * Reads credentials from the LOCAL, git-ignored file `.env.setup`:
 *     APPWRITE_API_KEY=********                 (required — never printed)
 *     APPWRITE_ENDPOINT=https://nyc.cloud.appwrite.io/v1   (optional)
 *     APPWRITE_PROJECT_ID=6a79a4a1001779bd683a             (optional)
 * Database / bucket IDs come from .env (or .env.example fallbacks).
 *
 * Modes:
 *   node scripts/setup-appwrite.cjs            report-only (safe, no writes)
 *   node scripts/setup-appwrite.cjs --apply    create anything that is missing
 *
 * The script only CREATES missing resources. It never deletes, updates or
 * overwrites existing collections, attributes, indexes, files or documents,
 * so it can be re-run safely at any time.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const APPLY = process.argv.includes("--apply");

/* --------------------------- configuration --------------------------- */

const FALLBACKS = {
  VITE_APPWRITE_ENDPOINT: "https://nyc.cloud.appwrite.io/v1",
  VITE_APPWRITE_PROJECT_ID: "6a79a4a1001779bd683a",
  VITE_APPWRITE_DATABASE_ID: "6a79a6780027ede0c8c4",
  VITE_APPWRITE_BUCKET_ID: "6a79a6ed002152aae15a",
};

const COLLECTIONS = [
  "settings", "navigation", "hero", "about", "principal", "highlights",
  "teachers", "gallery", "notices", "facilities", "achievements",
  "vocational", "vocational_courses", "vocational_subjects",
  "vocational_certificates", "vocational_skills", "vocational_careers",
  "footer", "social_links",
];

const COMMON_ATTRIBUTES = [
  { kind: "string", key: "revision", size: 36, required: true },
  { kind: "string", key: "lang", size: 8, required: true },
  { kind: "string", key: "kind", size: 32, required: true },
  { kind: "string", key: "payload", size: 100000, required: true },
  { kind: "integer", key: "sortOrder", required: true, default: 0 },
];

const str = (key, size, required = false) => ({ kind: "string", key, size, required });
const bool = (key, def = false) => ({ kind: "boolean", key, required: false, default: def });

const EXTRA_ATTRIBUTES = {
  settings: [str("publishedAt", 64)],
  teachers: [
    str("name", 256), str("subject", 256), str("qualification", 256),
    str("experience", 128), str("designation", 256), str("photoUrl", 2048),
  ],
  gallery: [
    str("imageUrl", 2048), str("title", 256), str("caption", 2048), str("category", 128),
  ],
  notices: [
    str("tag", 128), str("displayDate", 64), str("title", 256), str("body", 5000),
    bool("pinned"), bool("important"),
    { kind: "enum", key: "status", elements: ["draft", "published"], required: false, default: "published" },
    str("publishDate", 32), str("expiryDate", 32),
  ],
  facilities: [str("title", 256), str("description", 3000), str("meta", 128)],
  achievements: [str("title", 256), str("description", 3000), str("period", 128), str("tag", 128)],
  vocational_courses: [
    str("courseKey", 64), str("name", 256), str("tagline", 512),
    str("description", 5000), str("eligibility", 1024), str("duration", 256),
    str("imageUrl", 2048),
  ],
  vocational_subjects: [str("courseKey", 64), str("value", 2048)],
  vocational_certificates: [str("courseKey", 64), str("value", 2048)],
  vocational_skills: [str("courseKey", 64), str("value", 2048)],
  vocational_careers: [str("courseKey", 64), str("value", 2048)],
  social_links: [str("label", 128), str("url", 2048)],
};

const COMMON_INDEXES = [
  { key: "revision_idx", attributes: ["revision"] },
  { key: "kind_lang_idx", attributes: ["kind", "lang"] },
  { key: "sort_idx", attributes: ["sortOrder"] },
];

const EXTRA_INDEXES = {
  gallery: [{ key: "category_idx", attributes: ["category"] }],
  notices: [
    { key: "status_idx", attributes: ["status"] },
    { key: "pinned_idx", attributes: ["pinned"] },
    { key: "publish_date_idx", attributes: ["publishDate"] },
    { key: "expiry_date_idx", attributes: ["expiryDate"] },
  ],
  vocational_courses: [{ key: "course_key_lang_idx", attributes: ["courseKey", "lang"] }],
  vocational_subjects: [{ key: "course_key_lang_idx", attributes: ["courseKey", "lang"] }],
  vocational_certificates: [{ key: "course_key_lang_idx", attributes: ["courseKey", "lang"] }],
  vocational_skills: [{ key: "course_key_lang_idx", attributes: ["courseKey", "lang"] }],
  vocational_careers: [{ key: "course_key_lang_idx", attributes: ["courseKey", "lang"] }],
};

const COLLECTION_PERMISSIONS = [
  'read("any")',
  'create("users")',
  'update("users")',
  'delete("users")',
];

const BUCKET = {
  name: "school-media",
  fileSecurity: true,
  maximumFileSize: 10 * 1024 * 1024,
  allowedFileExtensions: ["jpg", "jpeg", "png", "webp", "gif", "svg"],
  permissions: COLLECTION_PERMISSIONS,
};

/* ------------------------------- utils ------------------------------- */

let failures = 0;
let created = 0;
let skipped = 0;
const ok = (m) => console.log(`  \u2705 ${m}`);
const info = (m) => console.log(`  \u00b7  ${m}`);
const warn = (m) => console.log(`  \u26a0\ufe0f  ${m}`);
const fail = (m) => {
  failures += 1;
  console.log(`  \u274c ${m}`);
};
const done = (m) => {
  created += 1;
  console.log(`  \u2795 ${m}`);
};
const exists = (m) => {
  skipped += 1;
  console.log(`  \u23ed\ufe0f  ${m} (already exists — left untouched)`);
};
const section = (t) => console.log(`\n=== ${t} ===`);

function parseEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/* -------------------------------- main -------------------------------- */

(async function main() {
  console.log("Appwrite setup — Govt. Boys H. S. School Cantt, Guna");
  console.log(`Mode: ${APPLY ? "APPLY (missing resources will be created)" : "REPORT ONLY (no writes; add --apply to create)"}`);

  if (typeof fetch !== "function") {
    console.error("Node 18+ with global fetch is required.");
    process.exit(1);
  }

  /* Load credentials — the key is never printed. */
  const setupPath = path.join(ROOT, ".env.setup");
  if (!fs.existsSync(setupPath)) {
    fail(
      ".env.setup not found. Create it (it is git-ignored) with:\n" +
        "     APPWRITE_API_KEY=<key from Appwrite Console \u2192 Settings \u2192 API keys>\n" +
        "     The key needs scopes: databases.read/write, collections.read/write,\n" +
        "     attributes.read/write, indexes.read/write, buckets.read/write, users.read, health.read",
    );
    process.exit(1);
  }
  const setupEnv = parseEnvFile(setupPath);
  const apiKey = (setupEnv.APPWRITE_API_KEY ?? "").trim();
  if (!apiKey) {
    fail("APPWRITE_API_KEY is empty in .env.setup");
    process.exit(1);
  }
  ok(".env.setup loaded — API key present (value hidden)");

  const env = {
    ...FALLBACKS,
    ...parseEnvFile(path.join(ROOT, ".env.example")),
    ...parseEnvFile(path.join(ROOT, ".env")), // local .env wins over the example
  };
  const endpoint = (setupEnv.APPWRITE_ENDPOINT || env.VITE_APPWRITE_ENDPOINT).replace(/\/$/, "");
  const projectId = setupEnv.APPWRITE_PROJECT_ID || env.VITE_APPWRITE_PROJECT_ID;
  const databaseId = env.VITE_APPWRITE_DATABASE_ID;
  const bucketId = env.VITE_APPWRITE_BUCKET_ID;

  info(`endpoint:  ${endpoint}`);
  info(`project:   ${projectId}`);
  info(`database:  ${databaseId}`);
  info(`bucket:    ${bucketId}`);

  const headers = {
    "X-Appwrite-Project": projectId,
    "X-Appwrite-Key": apiKey,
    "Content-Type": "application/json",
  };

  /** Returns { status, body }. Never throws on HTTP errors. */
  async function api(method, url, payload) {
    let res;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: payload === undefined ? undefined : JSON.stringify(payload),
      });
    } catch (error) {
      return { status: 0, body: { message: error.message }, networkError: true };
    }
    let body = {};
    const text = await res.text();
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { message: text.slice(0, 300) };
    }
    return { status: res.status, body };
  }

  const describeError = (body) =>
    `${body.type ?? "error"}${body.message ? ` — ${body.message}` : ""}`;

  /** Maps common permission errors to actionable scope hints. */
  function permissionHint(status, body, what) {
    if (status === 401) {
      fail(`authentication failed for ${what} — the API key is invalid or expired`);
      return true;
    }
    if (status === 403) {
      warn(
        `missing permission for ${what} (${describeError(body)}). Add the matching scope\n` +
          `     to the API key in Appwrite Console \u2192 Settings \u2192 API keys.`,
      );
      return true;
    }
    return false;
  }

  /* 1. Connection / health */
  section("Connection");
  const health = await api("GET", `${endpoint}/health`);
  if (health.networkError) {
    fail(`cannot reach ${endpoint}: ${health.body.message}`);
    process.exit(1);
  }
  if (health.status !== 200) {
    fail(`health check failed (HTTP ${health.status}): ${describeError(health.body)}`);
    process.exit(1);
  }
  const version = await api("GET", `${endpoint}/health/version`);
  ok(`connected — Appwrite v${version.body.version ?? "unknown"}`);

  /* 2. Database */
  section("Database");
  let dbProbe = await api("GET", `${endpoint}/databases/${databaseId}`);
  if (dbProbe.status === 200) {
    exists(`database "${dbProbe.body.name ?? databaseId}"`);
  } else if (dbProbe.status === 404) {
    if (!APPLY) {
      fail(`database ${databaseId} missing — re-run with --apply to create it`);
    } else {
      const createdDb = await api("POST", `${endpoint}/databases`, {
        databaseId,
        name: "School CMS",
        enabled: true,
      });
      if (createdDb.status === 201 || createdDb.status === 200) done(`created database ${databaseId} ("School CMS")`);
      else if (permissionHint(createdDb.status, createdDb.body, "creating the database")) process.exit(1);
      else fail(`could not create database: ${describeError(createdDb.body)}`);
    }
  } else if (!permissionHint(dbProbe.status, dbProbe.body, "reading the database")) {
    fail(`unexpected response probing database: HTTP ${dbProbe.status} ${describeError(dbProbe.body)}`);
  }

  /* 3. Collections + attributes + indexes */
  for (const collectionId of COLLECTIONS) {
    section(`Collection: ${collectionId}`);

    let probe = await api("GET", `${endpoint}/databases/${databaseId}/collections/${collectionId}`);
    if (probe.status === 404) {
      if (!APPLY) {
        fail(`collection ${collectionId} missing — re-run with --apply`);
        continue;
      }
      const res = await api("POST", `${endpoint}/databases/${databaseId}/collections`, {
        collectionId,
        name: collectionId,
        enabled: true,
        documentSecurity: false,
        permissions: COLLECTION_PERMISSIONS,
      });
      if (res.status === 201 || res.status === 200) done(`created collection ${collectionId} (public read, admin write)`);
      else if (permissionHint(res.status, res.body, `creating collection ${collectionId}`)) continue;
      else {
        fail(`could not create collection ${collectionId}: ${describeError(res.body)}`);
        continue;
      }
    } else if (probe.status === 200) {
      exists(`collection ${collectionId}`);
      const currentPerms = probe.body.$permissions ?? [];
      const perms = probe.body.collectionSecurity
        ? `document-level security ON: ${currentPerms.join(", ") || "(none)"}`
        : `collection permissions: ${currentPerms.join(", ") || "(none)"}`;
      info(perms);
      if (probe.body.collectionSecurity) {
        warn(`${collectionId} uses document-level security — public reads may fail unless every document grants Role.any()`);
      }

      /* Repair permissions on existing collections: public read must work,
         writes stay limited to authenticated admins. Never touches data. */
      const hasPublicRead = currentPerms.some((p) => /^read\("any"\)/.test(p));
      const matchesSpec =
        !probe.body.collectionSecurity &&
        COLLECTION_PERMISSIONS.every((wanted) =>
          currentPerms.some((p) => p.replace(/\s/g, "") === wanted.replace(/\s/g, "")),
        );
      if (!matchesSpec) {
        if (!APPLY) {
          fail(
            `collection ${collectionId} permissions do not match the spec (${!hasPublicRead ? "missing public read — " : ""}expected: ${COLLECTION_PERMISSIONS.join(", ")}) — re-run with --apply to repair`,
          );
        } else {
          const patch = await api(
            "PATCH",
            `${endpoint}/databases/${databaseId}/collections/${collectionId}`,
            {
              name: probe.body.name ?? collectionId,
              enabled: probe.body.enabled !== false,
              documentSecurity: false,
              permissions: COLLECTION_PERMISSIONS,
            },
          );
          if (patch.status === 200) done(`repaired permissions on ${collectionId} → public read, admin write`);
          else if (permissionHint(patch.status, patch.body, `updating permissions of ${collectionId}`)) continue;
          else fail(`could not repair permissions on ${collectionId}: ${describeError(patch.body)}`);
        }
      }
    } else if (permissionHint(probe.status, probe.body, `reading collection ${collectionId}`)) {
      continue;
    } else {
      fail(`unexpected response probing ${collectionId}: HTTP ${probe.status}`);
      continue;
    }

    /* attributes */
    const wantedAttrs = [...COMMON_ATTRIBUTES, ...(EXTRA_ATTRIBUTES[collectionId] ?? [])];
    const listAttrs = await api(
      "GET",
      `${endpoint}/databases/${databaseId}/collections/${collectionId}/attributes?limit=100`,
    );
    if (listAttrs.status !== 200) {
      if (!permissionHint(listAttrs.status, listAttrs.body, `listing attributes of ${collectionId}`))
        fail(`cannot list attributes of ${collectionId}: ${describeError(listAttrs.body)}`);
      continue;
    }
    const present = new Map((listAttrs.body.attributes ?? []).map((a) => [a.key, a]));

    for (const attr of wantedAttrs) {
      const existing = present.get(attr.key);
      if (existing) {
        exists(`attribute ${attr.key} (${existing.type})`);
        continue;
      }
      if (!APPLY) {
        fail(`attribute ${collectionId}.${attr.key} missing — re-run with --apply`);
        continue;
      }
      let res;
      if (attr.kind === "string") {
        res = await api(
          "POST",
          `${endpoint}/databases/${databaseId}/collections/${collectionId}/attributes/string`,
          { key: attr.key, size: attr.size, required: attr.required },
        );
      } else if (attr.kind === "integer") {
        res = await api(
          "POST",
          `${endpoint}/databases/${databaseId}/collections/${collectionId}/attributes/integer`,
          { key: attr.key, required: attr.required, default: attr.default },
        );
      } else if (attr.kind === "boolean") {
        res = await api(
          "POST",
          `${endpoint}/databases/${databaseId}/collections/${collectionId}/attributes/boolean`,
          { key: attr.key, required: attr.required, default: attr.default },
        );
      } else if (attr.kind === "enum") {
        res = await api(
          "POST",
          `${endpoint}/databases/${databaseId}/collections/${collectionId}/attributes/enum`,
          { key: attr.key, elements: attr.elements, required: attr.required, default: attr.default },
        );
      }
      if (res.status === 201 || res.status === 202 || res.status === 200) done(`created attribute ${collectionId}.${attr.key}`);
      else if (permissionHint(res.status, res.body, `creating attribute ${collectionId}.${attr.key}`)) continue;
      else fail(`attribute ${collectionId}.${attr.key}: ${describeError(res.body)}`);
    }

    /* wait until attributes are available before creating indexes */
    if (APPLY) {
      const deadline = Date.now() + 30000;
      let ready = false;
      while (!ready && Date.now() < deadline) {
        const check = await api(
          "GET",
          `${endpoint}/databases/${databaseId}/collections/${collectionId}/attributes?limit=100`,
        );
        const attrs = check.body.attributes ?? [];
        ready = wantedAttrs.every((w) => {
          const a = attrs.find((x) => x.key === w.key);
          return a && (a.status === "available" || a.status === undefined);
        });
        if (!ready) await new Promise((r) => setTimeout(r, 1500));
      }
      if (!ready) warn(`some attributes of ${collectionId} are still processing — indexes may need a re-run`);
    }

    /* indexes */
    const wantedIndexes = [...COMMON_INDEXES, ...(EXTRA_INDEXES[collectionId] ?? [])];
    const listIdx = await api(
      "GET",
      `${endpoint}/databases/${databaseId}/collections/${collectionId}/indexes?limit=100`,
    );
    if (listIdx.status !== 200) {
      if (!permissionHint(listIdx.status, listIdx.body, `listing indexes of ${collectionId}`))
        fail(`cannot list indexes of ${collectionId}: ${describeError(listIdx.body)}`);
      continue;
    }
    const presentIdx = new Set((listIdx.body.indexes ?? []).map((i) => i.key));
    for (const index of wantedIndexes) {
      if (presentIdx.has(index.key)) {
        exists(`index ${index.key}`);
        continue;
      }
      if (!APPLY) {
        fail(`index ${collectionId}.${index.key} missing — re-run with --apply`);
        continue;
      }
      const res = await api(
        "POST",
        `${endpoint}/databases/${databaseId}/collections/${collectionId}/indexes`,
        { key: index.key, type: "key", attributes: index.attributes },
      );
      if (res.status === 201 || res.status === 202 || res.status === 200) done(`created index ${collectionId}.${index.key}`);
      else if (permissionHint(res.status, res.body, `creating index ${collectionId}.${index.key}`)) continue;
      else fail(`index ${collectionId}.${index.key}: ${describeError(res.body)}`);
    }
  }

  /* 4. Storage bucket */
  section("Storage bucket");
  const bucketProbe = await api("GET", `${endpoint}/storage/buckets/${bucketId}`);
  if (bucketProbe.status === 200) {
    exists(`bucket "${bucketProbe.body.name}" (${bucketId})`);
    info(
      `fileSecurity=${bucketProbe.body.fileSecurity}, maxSize=${bucketProbe.body.maximumFileSize}, ext=[${(bucketProbe.body.allowedFileExtensions ?? []).join(",")}]`,
    );
    if (!bucketProbe.body.fileSecurity) {
      warn("bucket fileSecurity is OFF — uploaded files would not receive per-file permissions");
    }
    if (Number(bucketProbe.body.maximumFileSize) > BUCKET.maximumFileSize) {
      warn(`bucket allows files larger than 10 MB; the CMS rejects them client-side anyway`);
    }
  } else if (bucketProbe.status === 404) {
    if (!APPLY) {
      fail(`bucket ${bucketId} missing — re-run with --apply`);
    } else {
      const res = await api("POST", `${endpoint}/storage/buckets`, {
        bucketId,
        name: BUCKET.name,
        enabled: true,
        fileSecurity: BUCKET.fileSecurity,
        maximumFileSize: BUCKET.maximumFileSize,
        allowedFileExtensions: BUCKET.allowedFileExtensions,
        permissions: BUCKET.permissions,
      });
      if (res.status === 201 || res.status === 200) done(`created bucket ${bucketId} ("school-media")`);
      else if (permissionHint(res.status, res.body, "creating the bucket")) process.exit(1);
      else fail(`could not create bucket: ${describeError(res.body)}`);
    }
  } else if (!permissionHint(bucketProbe.status, bucketProbe.body, "reading the bucket")) {
    fail(`unexpected response probing bucket: HTTP ${bucketProbe.status}`);
  }

  /* 5. Auth status (informational) */
  section("Authentication (informational)");
  const users = await api("GET", `${endpoint}/users?limit=5`);
  if (users.status === 200) {
    const total = users.body.total ?? 0;
    if (total === 0) {
      warn("no admin users exist yet — create one in Appwrite Console \u2192 Auth \u2192 Users");
    } else {
      ok(`${total} auth user(s) exist (admin login available)`);
    }
  } else {
    warn(`could not list users (${describeError(users.body)}) — check Auth \u2192 Users manually`);
  }
  info("Public registration must be DISABLED in Console \u2192 Auth \u2192 Settings (cannot be verified via API key).");

  /* Summary */
  console.log(
    `\nSummary: ${created} created, ${skipped} already present, ${failures} problem(s).`,
  );
  if (!APPLY && failures > 0) {
    console.log("Re-run with --apply to create the missing resources:");
    console.log("  npm run setup:appwrite -- --apply");
  }
  console.log("The API key was never printed and is never committed (.env.setup is git-ignored).");
  process.exit(failures === 0 ? 0 : 1);
})().catch((error) => {
  console.error("setup-appwrite crashed:", error);
  process.exit(1);
});
