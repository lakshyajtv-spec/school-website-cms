#!/usr/bin/env node
/**
 * setup-appwrite.js
 * -----------------------------------------------------------------------------
 * One-shot provisioning script for the Government School Website CMS.
 *
 *   node setup-appwrite.js            -> report only (no writes, safe)
 *   node setup-appwrite.js --apply    -> create missing resources + seed data
 *
 * What it does (idempotent — safe to re-run):
 *   1. Creates the "school_db" database.
 *   2. Creates four collections: notices, teachers, gallery, school_info,
 *      with all required attributes.
 *   3. Creates the "school_assets" storage bucket (public read; accepts
 *      jpg/jpeg/png/webp/gif/pdf up to 20 MB).
 *   4. Creates a default admin user (admin@school.local / Admin@12345) when
 *      the project has no users yet. (Public registration should remain OFF
 *      in Appwrite Console -> Auth -> Settings.)
 *   5. Seeds the collections with sample notices, principal message,
 *      teachers, default settings, and gallery categories.
 *
 * Credentials are read from .env.local (or .env) in the project root.
 * The API key is NEVER logged or printed.
 *
 * The Appwrite Server SDK uses ESM imports — this script is written with
 * `import` to work with the project's `"type": "module"` package.json.
 * -----------------------------------------------------------------------------
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as aw from "node-appwrite";

// ── 0. Bootstrap ─────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = __dirname;
const APPLY      = process.argv.includes("--apply");

// Load .env.local / .env manually so we don't need `dotenv`.
function loadEnv(...files) {
  const out = {};
  for (const f of files) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq <= 0) continue;
      out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    }
  }
  return out;
}

const env = loadEnv(".env.local", ".env");

const ENDPOINT    = (env.APPWRITE_ENDPOINT    || env.VITE_APPWRITE_ENDPOINT    || "https://fra.cloud.appwrite.io/v1").replace(/\/$/, "");
const PROJECT_ID  = env.APPWRITE_PROJECT_ID   || env.VITE_APPWRITE_PROJECT_ID  || "6a8bb200003e1fcd3d26";
const API_KEY     = env.APPWRITE_API_KEY  || "";
const DATABASE_ID = env.VITE_APPWRITE_DATABASE_ID || "school_db";
const BUCKET_ID   = env.VITE_APPWRITE_BUCKET_ID   || "school_assets";
const ADMIN_EMAIL = env.ADMIN_EMAIL    || "admin@school.local";
const ADMIN_PASS  = env.ADMIN_PASSWORD || "Admin@12345";
const ADMIN_NAME  = "School Admin";

if (!API_KEY) {
  console.error("\n❌ APPWRITE_API_KEY is missing. Add it to .env.local (see .env.example).\n");
  process.exit(1);
}

// ── Pretty helpers ───────────────────────────────────────────────────────────
let created = 0, skipped = 0, failed = 0;
const ok    = (m) => console.log(`  ✅ ${m}`);
const info  = (m) => console.log(`  ·  ${m}`);
const done  = (m) => { created++; console.log(`  ➕ ${m}`); };
const exist = (m) => { skipped++; console.log(`  ⏭️  ${m} (already exists)`); };
const warn  = (m) => console.log(`  ⚠️  ${m}`);
const fail  = (m) => { failed++; console.log(`  ❌ ${m}`); };
const section = (t) => console.log(`\n=== ${t} ===`);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// Retry helper for Appwrite's "attribute not yet ready" race condition.
async function retry(fn, { tries = 8, wait = 2000, label = "operation" } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      const msg = e && e.message ? e.message : String(e);
      if (/not yet ready|not available|attribute.*not found|not found/i.test(msg)) {
        await delay(wait);
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

// ── Init SDK ─────────────────────────────────────────────────────────────────
const client = new aw.Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY)
  .setSelfSigned(false);

const databases = new aw.Databases(client);
const storage   = new aw.Storage(client);
const users     = new aw.Users(client);

// Public-read / admin-write permissions
const PUBLIC_PERMS = [
  aw.Permission.read(aw.Role.any()),
  aw.Permission.create(aw.Role.users()),
  aw.Permission.update(aw.Role.users()),
  aw.Permission.delete(aw.Role.users()),
];

// ── Schema definitions ───────────────────────────────────────────────────────
const COLLECTIONS_DEF = [
  {
    id: "notices", name: "Notices",
    attributes: [
      { kind: "string",  key: "title",       size: 500,  required: true  },
      { kind: "string",  key: "description", size: 10000, required: true  },
      { kind: "string",  key: "date",        size: 64,   required: true  },
      { kind: "string",  key: "pdf_url",     size: 2048, required: false, default: "" },
      { kind: "boolean", key: "is_pinned",   required: false, default: false },
    ],
  },
  {
    id: "teachers", name: "Teachers / Faculty",
    attributes: [
      { kind: "string",  key: "name",          size: 256,  required: true  },
      { kind: "string",  key: "designation",   size: 256,  required: true  },
      { kind: "string",  key: "subject",       size: 256,  required: true  },
      { kind: "string",  key: "qualification", size: 500,  required: false, default: "" },
      { kind: "string",  key: "image_id",      size: 512,  required: false, default: "" },
      { kind: "integer", key: "order",         required: true,  default: 0 },
    ],
  },
  {
    id: "gallery", name: "Photo Gallery",
    attributes: [
      { kind: "string",   key: "title",      size: 500, required: true  },
      { kind: "string",   key: "image_id",   size: 512, required: true  },
      { kind: "string",   key: "category",   size: 128, required: true  },
      { kind: "datetime", key: "created_at", required: false },
    ],
  },
  {
    id: "school_info", name: "School Information (key-value)",
    attributes: [
      { kind: "string", key: "key",   size: 256,   required: true },
      { kind: "string", key: "value", size: 20000, required: true },
    ],
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────
(async function main() {
  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log("║     Government School Website — Appwrite Provisioning Script    ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝");
  console.log(`Mode     : ${APPLY ? "APPLY (missing resources will be created)" : "REPORT-ONLY (no writes — re-run with --apply)"}`);
  console.log(`Endpoint : ${ENDPOINT}`);
  console.log(`Project  : ${PROJECT_ID}`);
  console.log(`Database : ${DATABASE_ID}`);
  console.log(`Bucket   : ${BUCKET_ID}`);

  // ── 1. Connection / health ────────────────────────────────────────────────
  section("1. Connection");
  try {
    // Health service is no longer exported in recent node-appwrite; instead
    // we use Locale.get() as a simple authenticated GET that returns 200
    // when the endpoint + project + API key are all valid.
    const locale = new aw.Locale(client);
    await locale.get();
    ok(`connected to Appwrite at ${ENDPOINT}`);
  } catch (e) {
    fail(`cannot reach Appwrite at ${ENDPOINT}: ${e.message || e}`);
    process.exit(1);
  }

  // ── 2. Database ───────────────────────────────────────────────────────────
  section("2. Database");
  try {
    const db = await databases.get(DATABASE_ID);
    exist(`database "${db.name}" (${DATABASE_ID})`);
  } catch (e) {
    if (e && (e.code === 404 || /not found/i.test(String(e.message)))) {
      if (!APPLY) {
        fail(`database "${DATABASE_ID}" missing — re-run with --apply`);
      } else {
        try {
          const db = await databases.create(DATABASE_ID, "school_db", true);
          done(`created database "${db.name}" (${db.$id})`);
        } catch (ce) {
          fail(`could not create database: ${ce.message || ce}`);
        }
      }
    } else {
      fail(`database probe failed: ${e.message || e}`);
    }
  }

  // ── 3. Collections & attributes ──────────────────────────────────────────
  for (const def of COLLECTIONS_DEF) {
    section(`Collection: ${def.id}`);

    // Create/fetch collection
    let collection;
    try {
      collection = await databases.getCollection(DATABASE_ID, def.id);
      exist(`collection "${def.name}" (${def.id})`);
    } catch (e) {
      if (e && (e.code === 404 || /not found/i.test(String(e.message)))) {
        if (!APPLY) { fail(`collection ${def.id} missing — re-run with --apply`); continue; }
        try {
          collection = await databases.createCollection(
            DATABASE_ID, def.id, def.name, PUBLIC_PERMS, undefined, true
          );
          done(`created collection "${def.name}" (${def.id})`);
        } catch (ce) {
          fail(`could not create collection ${def.id}: ${ce.message || ce}`);
          continue;
        }
      } else {
        fail(`collection probe failed for ${def.id}: ${e.message || e}`);
        continue;
      }
    }

    // Ensure public-read permissions on existing collections
    if (APPLY && collection) {
      try {
        await databases.updateCollection(
          DATABASE_ID, def.id, def.name, PUBLIC_PERMS, undefined, true
        );
      } catch (_) { /* some permission updates may fail; not fatal */ }
    }

    // List existing attributes
    let existingAttrs = [];
    try {
      const list = await databases.listAttributes(DATABASE_ID, def.id, [], 100);
      existingAttrs = (list && list.attributes) ? list.attributes : [];
      if (!Array.isArray(existingAttrs)) existingAttrs = [];
    } catch (e) {
      warn(`could not list attributes of ${def.id}: ${e.message || e}`);
      existingAttrs = [];
    }
    const existingKeys = new Set(existingAttrs.map((a) => a.key).filter(Boolean));

    for (const attr of def.attributes) {
      if (existingKeys.has(attr.key)) {
        exist(`attribute ${attr.key} (${attr.kind})`);
        continue;
      }
      if (!APPLY) { fail(`attribute ${def.id}.${attr.key} missing — re-run with --apply`); continue; }
      try {
        await retry(async () => {
          switch (attr.kind) {
            case "string":
              return databases.createStringAttribute(
                DATABASE_ID, def.id, attr.key, attr.size,
                !!attr.required, attr.default ?? undefined, false
              );
            case "integer":
              return databases.createIntegerAttribute(
                DATABASE_ID, def.id, attr.key,
                !!attr.required, undefined, undefined, attr.default ?? 0, false
              );
            case "boolean":
              return databases.createBooleanAttribute(
                DATABASE_ID, def.id, attr.key, !!attr.required, attr.default ?? false, false
              );
            case "datetime":
              return databases.createDatetimeAttribute(
                DATABASE_ID, def.id, attr.key, !!attr.required, undefined, undefined, false
              );
            case "float":
              return databases.createFloatAttribute(
                DATABASE_ID, def.id, attr.key,
                !!attr.required, undefined, undefined, attr.default, false
              );
            default:
              throw new Error(`Unknown attribute kind: ${attr.kind}`);
          }
        }, { label: `create attribute ${def.id}.${attr.key}` });
        done(`created attribute ${def.id}.${attr.key} (${attr.kind})`);
      } catch (ae) {
        fail(`attribute ${def.id}.${attr.key}: ${ae.message || ae}`);
      }
    }
  }

  // ── 4. Storage bucket ────────────────────────────────────────────────────
  section("4. Storage Bucket");
  try {
    const bkt = await storage.getBucket(BUCKET_ID);
    exist(`bucket "${bkt.name}" (${BUCKET_ID})`);
    info(`maxFileSize=${bkt.maximumFileSize}, allowed=${(bkt.allowedFileExtensions || []).join(",")}`);
    if (APPLY) {
      try {
        await storage.updateBucket(
          BUCKET_ID, "school_assets", PUBLIC_PERMS, false, true,
          20 * 1024 * 1024,
          ["jpg", "jpeg", "png", "webp", "gif", "pdf"]
        );
      } catch (_) { /* best-effort */ }
    }
  } catch (e) {
    if (e && (e.code === 404 || /not found/i.test(String(e.message)))) {
      if (!APPLY) { fail(`bucket ${BUCKET_ID} missing — re-run with --apply`); }
      else {
        try {
          await storage.createBucket(
            BUCKET_ID, "school_assets", PUBLIC_PERMS,
            false, // fileSecurity = false (bucket-level public read)
            true,  // enabled
            20 * 1024 * 1024,
            ["jpg", "jpeg", "png", "webp", "gif", "pdf"]
          );
          done(`created bucket "school_assets" (${BUCKET_ID}) — public read, images+PDF allowed`);
        } catch (be) {
          fail(`could not create bucket: ${be.message || be}`);
        }
      }
    } else {
      fail(`bucket probe failed: ${e.message || e}`);
    }
  }

  // ── 5. Admin user ────────────────────────────────────────────────────────
  section("5. Admin User");
  let adminExists = false;
  try {
    const list = await users.list([], 1);
    if (list && list.total > 0) {
      ok(`${list.total} user(s) already exist — leaving them untouched`);
      adminExists = true;
    } else {
      warn("No users exist yet.");
    }
  } catch (e) {
    warn(`cannot list users (${e.message || e}) — continuing.`);
  }
  if (!adminExists && APPLY) {
    try {
      // createBcryptUser is the safe, server-side way to seed a password
      // without requiring email confirmation.
      await users.createBcryptUser(
        aw.ID.unique(), ADMIN_EMAIL, ADMIN_PASS, ADMIN_NAME
      );
      done(`created admin user ${ADMIN_EMAIL}  (password: ${ADMIN_PASS}) — PLEASE CHANGE AFTER FIRST LOGIN`);
    } catch (e) {
      try {
        // Fallback to regular create (Argon) if bcrypt isn't enabled.
        await users.create(aw.ID.unique(), ADMIN_EMAIL, undefined, ADMIN_PASS, ADMIN_NAME);
        done(`created admin user ${ADMIN_EMAIL}  (password: ${ADMIN_PASS}) — PLEASE CHANGE AFTER FIRST LOGIN`);
      } catch (e2) {
        fail(`could not create admin user: ${e2.message || e2}`);
      }
    }
  } else if (!adminExists && !APPLY) {
    fail(`no admin users — re-run with --apply to create ${ADMIN_EMAIL}`);
  }

  // ── 6. Seed data ─────────────────────────────────────────────────────────
  section("6. Seed Data");
  if (APPLY) { info("waiting for attributes to become available before seeding…"); await delay(4000); }

  async function docExists(coll, id) {
    try { await databases.getDocument(DATABASE_ID, coll, id); return true; }
    catch { return false; }
  }
  async function ensureDoc(coll, id, data) {
    if (await docExists(coll, id)) { exist(`${coll}/${id}`); return; }
    if (!APPLY) { fail(`${coll}/${id} missing — re-run with --apply`); return; }
    try {
      await databases.createDocument(DATABASE_ID, coll, id, data, PUBLIC_PERMS);
      done(`seeded ${coll}/${id}`);
    } catch (e) {
      fail(`seed ${coll}/${id} failed: ${e.message || e}`);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  // Notices
  await ensureDoc("notices", "notice-welcome", {
    title:       "Welcome to the New Academic Session",
    description: "Dear students and parents, we are pleased to welcome all students back for the new academic session. Regular classes will commence as per the school calendar. Parents are requested to ensure regular attendance and check the notice board for updates.",
    date:        today,
    pdf_url:     "",
    is_pinned:   true,
  });
  await ensureDoc("notices", "notice-pta", {
    title:       "Parent–Teacher Meeting",
    description: "A Parent–Teacher Meeting is scheduled on the second Saturday of every month between 10:00 AM and 1:00 PM. All parents are requested to attend and discuss their ward's progress with the class teachers.",
    date:        today,
    pdf_url:     "",
    is_pinned:   true,
  });
  await ensureDoc("notices", "notice-holidays", {
    title:       "Government Holiday Calendar",
    description: "The school follows the holiday calendar issued by the State School Education Department. The complete list of gazetted holidays for the current academic year is available from the school office.",
    date:        today,
    pdf_url:     "",
    is_pinned:   false,
  });
  await ensureDoc("notices", "notice-admission", {
    title:       "Admission Information",
    description: "Admissions for Class 1 to Class 12 are open as per government rules and RTE guidelines. Please visit the school office between 10:00 AM and 2:00 PM on working days with the required documents.",
    date:        today,
    pdf_url:     "",
    is_pinned:   false,
  });

  // Teachers
  const seedTeachers = [
    { id: "t1", name: "Dr. Rajesh Kumar",    designation: "Principal",             subject: "School Administration",     qualification: "M.Sc., B.Ed., Ph.D.", order: 1 },
    { id: "t2", name: "Smt. Anita Sharma",   designation: "Vice Principal",        subject: "Mathematics",               qualification: "M.Sc., B.Ed.",       order: 2 },
    { id: "t3", name: "Shri Sunil Verma",    designation: "PGT",                   subject: "Physics",                   qualification: "M.Sc., B.Ed.",       order: 3 },
    { id: "t4", name: "Smt. Meena Gupta",    designation: "PGT",                   subject: "Chemistry",                 qualification: "M.Sc., B.Ed.",       order: 4 },
    { id: "t5", name: "Shri Arjun Singh",    designation: "PGT",                   subject: "Biology",                   qualification: "M.Sc., B.Ed.",       order: 5 },
    { id: "t6", name: "Smt. Priya Deshmukh", designation: "TGT",                   subject: "English",                   qualification: "M.A., B.Ed.",        order: 6 },
    { id: "t7", name: "Shri Rakesh Yadav",   designation: "TGT",                   subject: "Hindi & Sanskrit",          qualification: "M.A., B.Ed.",        order: 7 },
    { id: "t8", name: "Shri Manoj Tiwari",   designation: "TGT",                   subject: "Social Science",            qualification: "M.A., B.Ed.",        order: 8 },
    { id: "t9", name: "Ku. Neha Patel",      designation: "Vocational Trainer",    subject: "Computer / IT / ITES",      qualification: "BCA, PGDCA",         order: 9 },
    { id: "t10", name: "Shri Deepak Joshi",  designation: "Vocational Trainer",    subject: "Electronics & Hardware",    qualification: "Diploma (ECE)",      order: 10 },
  ];
  for (const t of seedTeachers) {
    await ensureDoc("teachers", t.id, {
      name: t.name,
      designation: t.designation,
      subject: t.subject,
      qualification: t.qualification,
      image_id: "",
      order: t.order,
    });
  }

  // Gallery placeholders (images uploaded via admin panel)
  const seedGallery = [
    { id: "g1", title: "School Building",  category: "Campus" },
    { id: "g2", title: "Classroom",        category: "Campus" },
    { id: "g3", title: "Computer Lab",     category: "Campus" },
    { id: "g4", title: "Science Lab",      category: "Campus" },
    { id: "g5", title: "Annual Sports Day", category: "Sports" },
    { id: "g6", title: "Independence Day", category: "Events" },
    { id: "g7", title: "Annual Function",  category: "Annual Day" },
    { id: "g8", title: "Library",          category: "Campus" },
  ];
  for (const g of seedGallery) {
    await ensureDoc("gallery", g.id, {
      title:      g.title,
      image_id:   "",
      category:   g.category,
      created_at: new Date().toISOString(),
    });
  }

  // School info (key-value)
  const seedInfo = [
    { key: "school_name",        value: "Government Boys Higher Secondary School" },
    { key: "school_place",       value: "Cantt, Guna, Madhya Pradesh" },
    { key: "school_tagline",     value: "Education For All (EFA) Government School" },
    { key: "affiliation",        value: "M.P. Board of Secondary Education (MPBSE)" },
    { key: "classes",            value: "Class 1 to Class 12" },
    { key: "establishment_year", value: "1965" },
    { key: "address",            value: "Cantt Area, Guna, Madhya Pradesh – 473001" },
    { key: "phone",              value: "+91-00000-00000" },
    { key: "email",              value: "principal@school.local" },
    { key: "principal_name",     value: "Dr. Rajesh Kumar" },
    { key: "principal_message",  value: "Dear students and parents, our school works with a simple aim — that every student who joins us should leave with knowledge, discipline and a skill they can use. As an Education For All government school, we welcome learners from every background from Class 1 to Class 12. Alongside regular studies, our vocational programmes in IT/ITES and Electronics & Hardware (starting from Class 9) give students practical training for the world of work. I request all parents to stay in touch with the school and support their child's regular attendance." },
    { key: "vision",             value: "To provide quality government education from Class 1 to 12 that empowers every student with knowledge, values, discipline and practical skills for life." },
    { key: "mission",            value: "Quality government education for every child, backed by experienced teachers, modern facilities, and vocational skills training under the NSQF scheme from Class 9 onwards." },
    { key: "map_embed",          value: "https://www.google.com/maps?q=Guna,Madhya+Pradesh&output=embed" },
    { key: "hero_banner_1",      value: "" },
    { key: "hero_banner_2",      value: "" },
    { key: "hero_banner_3",      value: "" },
    { key: "logo_url",           value: "" },
    { key: "principal_photo",    value: "" },
  ];
  for (const inf of seedInfo) {
    await ensureDoc("school_info", "info-" + inf.key, { key: inf.key, value: inf.value });
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log(`Summary: ${created} created, ${skipped} already present, ${failed} problem(s).`);
  if (!APPLY && failed > 0) {
    console.log("\nRun with --apply to create missing resources:\n");
    console.log("    node setup-appwrite.js --apply\n");
  } else if (APPLY && failed === 0) {
    console.log("\n✅  Appwrite is ready. Start the dev server:\n");
    console.log("    npm run dev");
    console.log("\n    Admin login:");
    console.log(`      Email    : ${ADMIN_EMAIL}`);
    console.log(`      Password : ${ADMIN_PASS}   (change this in Appwrite Console → Auth → Users)`);
    console.log("");
  }
  process.exit(failed === 0 ? 0 : 1);
})().catch((err) => {
  console.error("\n💥 setup-appwrite crashed:", err);
  process.exit(1);
});
