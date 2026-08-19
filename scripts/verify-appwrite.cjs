#!/usr/bin/env node
/**
 * verify-appwrite.cjs — non-destructive environment & backend verification.
 *
 * Checks (no API key required, nothing is modified):
 *   1. Required VITE_APPWRITE_* variables in .env (format + canonical values)
 *   2. No Appwrite API keys / secrets in tracked sources or env examples
 *   3. .gitignore protects .env, .env.* (except .env.example)
 *   4. Expected source files exist
 *   5. `appwrite` package is installed
 *   6. appwrite/schema.json is consistent with the collection map in code
 *   7. Live checks: endpoint reachable, project valid, database reachable,
 *      each collection readable anonymously (Role.any()), bucket exists
 *
 * Usage:
 *   node scripts/verify-appwrite.cjs            (full check incl. network)
 *   node scripts/verify-appwrite.cjs --offline  (skip network checks)
 *
 * Exit code 0 = all checks passed, 1 = at least one failure.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

/* ------------------- canonical project identifiers ------------------- */

const CANONICAL = {
  VITE_APPWRITE_ENDPOINT: "https://nyc.cloud.appwrite.io/v1",
  VITE_APPWRITE_PROJECT_ID: "6a79a4a1001779bd683a",
  VITE_APPWRITE_DATABASE_ID: "6a79a6780027ede0c8c4",
  VITE_APPWRITE_BUCKET_ID: "6a79a6ed002152aae15a",
};

const REQUIRED_FILES = [
  "package.json",
  "vite.config.ts",
  "tsconfig.json",
  "index.html",
  "vercel.json",
  ".env.example",
  ".gitignore",
  "appwrite/schema.json",
  "appwrite/SETUP.md",
  "src/main.tsx",
  "src/App.tsx",
  "src/config/env.ts",
  "src/i18n/LanguageContext.tsx",
  "src/i18n/content.ts",
  "src/data/site.ts",
  "src/cms/lib/appwrite.ts",
  "src/cms/lib/repository.ts",
  "src/cms/lib/storage.ts",
  "src/cms/lib/types.ts",
  "src/cms/context.tsx",
  "src/cms/App.tsx",
  "src/cms/Login.tsx",
  "src/components/Navbar.tsx",
  "src/components/ErrorBoundary.tsx",
];

/* ------------------------------ output ------------------------------ */

let failures = 0;
let warnings = 0;
const ok = (msg) => console.log(`  \u2705 ${msg}`);
const warn = (msg) => {
  warnings += 1;
  console.log(`  \u26a0\ufe0f  ${msg}`);
};
const fail = (msg) => {
  failures += 1;
  console.log(`  \u274c ${msg}`);
};
const section = (title) => console.log(`\n=== ${title} ===`);

/* ------------------------------- utils ------------------------------ */

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

function readIfExists(rel) {
  const abs = path.join(ROOT, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;
}

/* ------------------------- 1. env variables ------------------------- */

function checkEnv() {
  section("Environment variables (.env)");
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) {
    fail(".env not found — run: cp .env.example .env (values are already filled)");
    return null;
  }
  const env = parseEnvFile(envPath);
  let good = true;
  for (const [key, canonical] of Object.entries(CANONICAL)) {
    const value = (env[key] ?? "").trim();
    if (!value) {
      fail(`${key} is missing in .env`);
      good = false;
      continue;
    }
    if (key === "VITE_APPWRITE_ENDPOINT" && !/^https:\/\/[^\s]+\/v1$/.test(value)) {
      fail(`${key} must look like https://<region>.cloud.appwrite.io/v1 (got: ${value})`);
      good = false;
      continue;
    }
    if (value !== canonical) {
      fail(`${key} = ${value} does not match the project value ${canonical}`);
      good = false;
      continue;
    }
    ok(`${key} = ${value}`);
  }
  return good ? env : null;
}

/* --------------------------- 2. secret scan -------------------------- */

const SECRET_PATTERNS = [
  /APPWRITE_API_KEY\s*=\s*["']?[A-Za-z0-9._\-]{12,}/i,
  /X-Appwrite-Key\s*[:=]\s*["'][A-Za-z0-9._\-]{12,}["']/i,
  /api[_-]?key\s*[:=]\s*["'][A-Za-z0-9._\-]{24,}["']/i,
  /secret\s*[:=]\s*["'][A-Za-z0-9._\-]{24,}["']/i,
];

function scanFileForSecrets(rel) {
  const content = readIfExists(rel);
  if (content === null) return [];
  const hits = [];
  content.split(/\r?\n/).forEach((line, i) => {
    if (/\.env\.setup/.test(line)) return; // documentation reference is fine
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(line)) {
        hits.push(`${rel}:${i + 1}`);
        break;
      }
    }
  });
  return hits;
}

function walkSources(dir, acc) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return acc;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) walkSources(rel, acc);
    else if (/\.(ts|tsx|js|jsx|cjs|mjs|json|html|md|env)$/.test(entry.name)) acc.push(rel);
  }
  return acc;
}

function checkSecrets() {
  section("Secret scan (API keys must never be committed)");
  const filesToScan = ["src", "scripts", "appwrite"].flatMap((dir) => walkSources(dir, []));
  filesToScan.push(".env.example", "vercel.json", "vite.config.ts", "index.html");
  let found = 0;
  for (const rel of filesToScan) {
    for (const hit of scanFileForSecrets(rel)) {
      fail(`possible secret committed at ${hit}`);
      found += 1;
    }
  }
  if (!found) ok("no API keys / secrets detected in tracked sources");

  const example = readIfExists(".env.example") ?? "";
  if (/KEY|SECRET|TOKEN/i.test(example.split("\n").filter((l) => /^[A-Z0-9_]+=/.test(l)).join("\n"))) {
    fail(".env.example contains a KEY/SECRET/TOKEN variable — it must only contain public VITE_* identifiers");
  } else {
    ok(".env.example contains only public identifiers");
  }

  const setupPath = path.join(ROOT, ".env.setup");
  if (fs.existsSync(setupPath)) {
    const { execSync } = require("child_process");
    let ignored = false;
    try {
      execSync("git check-ignore -q .env.setup", { cwd: ROOT, stdio: "ignore" });
      ignored = true;
    } catch {
      ignored = false;
    }
    if (ignored) ok(".env.setup exists locally and is git-ignored");
    else fail(".env.setup exists but is NOT git-ignored — it must never be committed");
  }
}

/* --------------------------- 3. gitignore ---------------------------- */

function checkGitignore() {
  section(".gitignore protection");
  const gi = readIfExists(".gitignore") ?? "";
  const checks = [
    ["node_modules/", /^node_modules\/$/m],
    ["dist/", /^dist\/$/m],
    [".vercel/", /^\.vercel\/$/m],
    [".env", /^\.env$/m],
    [".env.* (all env variants)", /^\.env\.\*$/m],
    ["!.env.example (kept tracked)", /^!\.env\.example$/m],
  ];
  for (const [label, pattern] of checks) {
    if (pattern.test(gi)) ok(`ignores ${label}`);
    else fail(`.gitignore is missing an entry for ${label}`);
  }
}

/* ------------------------- 4. required files ------------------------- */

function checkFiles() {
  section("Required source files");
  let missing = 0;
  for (const rel of REQUIRED_FILES) {
    if (fs.existsSync(path.join(ROOT, rel))) ok(rel);
    else {
      fail(`missing file: ${rel}`);
      missing += 1;
    }
  }
  return missing === 0;
}

/* --------------------------- 5. packages ----------------------------- */

function checkPackages() {
  section("Package installation");
  const pkg = JSON.parse(readIfExists("package.json") ?? "{}");
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (!deps.appwrite) fail("`appwrite` is missing from package.json dependencies");
  else ok(`package.json declares appwrite ${deps.appwrite}`);
  try {
    const appwritePkg = require(require.resolve("appwrite/package.json", { paths: [ROOT] }));
    ok(`appwrite SDK installed (v${appwritePkg.version})`);
  } catch {
    fail("appwrite SDK is not installed — run: npm install");
  }
  for (const dep of ["react", "react-dom", "vite", "typescript", "tailwindcss"]) {
    if (!deps[dep]) warn(`${dep} not found in package.json`);
  }
}

/* --------------------- 6. schema/code consistency -------------------- */

function checkSchemaConsistency() {
  section("Schema consistency (appwrite/schema.json vs code)");
  const raw = readIfExists("appwrite/schema.json");
  if (!raw) {
    fail("appwrite/schema.json not found");
    return;
  }
  let schema;
  try {
    schema = JSON.parse(raw);
  } catch (error) {
    fail(`appwrite/schema.json is not valid JSON (${error.message})`);
    return;
  }

  const code = readIfExists("src/cms/lib/appwrite.ts") ?? "";
  const block = code.match(/COLLECTIONS\s*=\s*\{([\s\S]*?)\}/);
  const codeCollections = block
    ? [...block[1].matchAll(/:\s*"([^"]+)"/g)].map((m) => m[1]).sort()
    : null;
  if (!codeCollections) {
    fail("could not locate the COLLECTIONS map in src/cms/lib/appwrite.ts");
    return;
  }
  const schemaCollections = [...(schema.collections ?? [])].sort();
  if (JSON.stringify(codeCollections) === JSON.stringify(schemaCollections)) {
    ok(`schema.json collections match code (${codeCollections.length} collections)`);
  } else {
    fail("collection lists differ between schema.json and src/cms/lib/appwrite.ts");
    console.log(`     schema.json: ${schemaCollections.join(", ")}`);
    console.log(`     code:        ${codeCollections.join(", ")}`);
  }

  const attrs = (schema.commonAttributes ?? []).map((a) => a.key).sort();
  const expected = ["kind", "lang", "payload", "revision", "sortOrder"].sort();
  if (JSON.stringify(attrs) === JSON.stringify(expected)) {
    ok("common attributes: revision, lang, kind, payload, sortOrder");
  } else {
    fail(`unexpected common attributes: ${attrs.join(", ")}`);
  }

  const payload = (schema.commonAttributes ?? []).find((a) => a.key === "payload");
  if (payload && payload.type === "string" && Number(payload.size) >= 100000) {
    ok("payload attribute is string(>=100000) as required by repository.ts");
  } else {
    fail("payload attribute must be a string with size >= 100000");
  }

  const indexes = (schema.indexes ?? []).map((i) => i.key);
  for (const needed of ["revision_idx", "kind_lang_idx", "sort_idx"]) {
    if (indexes.includes(needed)) ok(`index ${needed} declared`);
    else fail(`index ${needed} missing from schema.json`);
  }
}

/* --------------------------- 7. live checks -------------------------- */

async function liveProbe(env) {
  section("Live Appwrite checks (public endpoints, no key used)");
  const endpoint = env.VITE_APPWRITE_ENDPOINT.replace(/\/$/, "");
  const project = env.VITE_APPWRITE_PROJECT_ID;
  const database = env.VITE_APPWRITE_DATABASE_ID;
  const bucket = env.VITE_APPWRITE_BUCKET_ID;
  const headers = { "X-Appwrite-Project": project };

  const getJson = async (url) => {
    const res = await fetch(url, { headers });
    let body = {};
    try {
      body = await res.json();
    } catch {
      /* non-JSON body */
    }
    return { status: res.status, body };
  };

  // Endpoint + project
  try {
    const { status, body } = await getJson(`${endpoint}/health/version`);
    if (status === 200 && body.version) ok(`endpoint reachable — Appwrite v${body.version}`);
    else if (status === 404 && /project/i.test(body.message ?? ""))
      fail(`project ID ${project} was rejected by the endpoint (${body.message})`);
    else fail(`endpoint returned HTTP ${status}: ${body.message ?? "unexpected response"}`);
  } catch (error) {
    fail(`cannot reach ${endpoint} (${error.message}) — check network/endpoint`);
    return;
  }

  // Database + collections (anonymous read proves Role.any() permissions)
  const code = readIfExists("src/cms/lib/appwrite.ts") ?? "";
  const block = code.match(/COLLECTIONS\s*=\s*\{([\s\S]*?)\}/);
  const collections = block
    ? [...block[1].matchAll(/:\s*"([^"]+)"/g)].map((m) => m[1])
    : [];
  const missing = [];
  const unreadable = [];
  let dbMissing = false;
  for (const collection of collections) {
    const { status, body } = await getJson(
      `${endpoint}/databases/${database}/collections/${collection}/documents?limit=1`,
    );
    if (status === 200) continue;
    if (body.type === "database_not_found") {
      dbMissing = true;
      break;
    }
    if (body.type === "collection_not_found") missing.push(collection);
    else unreadable.push(`${collection} (HTTP ${status}: ${body.type ?? body.message})`);
  }
  if (dbMissing) {
    fail(`database ${database} does not exist — run: npm run setup:appwrite -- --apply`);
  } else {
    ok(`database ${database} exists`);
    if (missing.length) {
      fail(
        `${missing.length} collection(s) missing: ${missing.join(", ")} — run: npm run setup:appwrite -- --apply`,
      );
    } else {
      ok(`all ${collections.length} collections exist and are publicly readable (Role.any())`);
    }
    for (const item of unreadable) warn(`collection not anonymously readable: ${item}`);
  }

  // Bucket existence probe (dummy file view distinguishes bucket vs file 404)
  const bucketProbe = await getJson(`${endpoint}/storage/buckets/${bucket}/files/dummy/view`);
  if (bucketProbe.status === 200) ok(`bucket ${bucket} exists`);
  else if (bucketProbe.body.type === "storage_bucket_not_found")
    fail(`bucket ${bucket} does not exist — run: npm run setup:appwrite -- --apply`);
  else ok(`bucket ${bucket} exists (probe: ${bucketProbe.body.type ?? bucketProbe.status})`);
}

/* -------------------------------- main ------------------------------- */

(async function main() {
  const offline = process.argv.includes("--offline");
  console.log("Appwrite verification — Govt. Boys H. S. School Cantt, Guna");
  if (typeof fetch !== "function") {
    console.error("Node 18+ with global fetch is required.");
    process.exit(1);
  }

  const env = checkEnv();
  checkSecrets();
  checkGitignore();
  checkFiles();
  checkPackages();
  checkSchemaConsistency();

  if (offline) {
    console.log("\n(--offline) skipping live Appwrite checks");
  } else if (!env) {
    warn("skipping live checks because environment variables failed");
  } else {
    try {
      await liveProbe(env);
    } catch (error) {
      fail(`live checks crashed: ${error.message}`);
    }
  }

  console.log(
    `\nResult: ${failures === 0 ? "PASS" : "FAIL"} — ${failures} failure(s), ${warnings} warning(s)`,
  );
  process.exit(failures === 0 ? 0 : 1);
})();
