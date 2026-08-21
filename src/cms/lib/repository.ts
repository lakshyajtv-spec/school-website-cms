import { ID, Query, type Models } from "appwrite";
import { databases, APPWRITE_IDS, COLLECTIONS, ALL_COLLECTIONS } from "@/cms/lib/appwrite";
import type { Content } from "@/i18n/content";
import type {
  GalleryRecord,
  NoticeRecord,
  SiteData,
  SiteSettings,
  TeacherRecord,
} from "@/cms/lib/types";
import { defaultSiteData } from "@/cms/lib/types";

export interface PublishResult {
  ok: boolean;
  error?: string;
  /** Appwrite HTTP error code (e.g. 401 for an expired session), when known. */
  code?: number;
}

type Doc = Models.Document & Record<string, any>;
type DraftDoc = { id: string; data: Record<string, unknown> };

export function safeClone<T>(value: T): T {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}

function mergeObject<T>(base: T, loaded: T): T {
  if (
    base &&
    loaded &&
    typeof base === "object" &&
    typeof loaded === "object" &&
    !Array.isArray(base) &&
    !Array.isArray(loaded)
  ) {
    return { ...(base as object), ...(loaded as object) } as T;
  }
  return loaded ?? base;
}

function parsePayload<T>(doc: Doc, operation: string): T {
  try {
    return JSON.parse(String(doc.payload ?? "{}")) as T;
  } catch (error) {
    throw new Error(`${operation}: invalid JSON (${String(error)})`);
  }
}

async function list(collectionId: string) {
  if (!databases) throw new Error("Appwrite is not configured");
  try {
    return await databases.listDocuments({
      databaseId: APPWRITE_IDS.database,
      collectionId,
      queries: [Query.limit(5000)],
      total: true,
    });
  } catch (error) {
    console.error(`[appwrite/repository] list ${collectionId} failed:`, error);
    throw new Error(
      `Load ${collectionId} failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

const byKind = (docs: Doc[], kind: string) =>
  docs.filter((doc) => doc.kind === kind);

function sectionByLang<T>(docs: Doc[], lang: "en" | "hi", label: string): T {
  const doc = docs.find((item) => item.kind === "section" && item.lang === lang);
  if (!doc) throw new Error(`${label}: missing ${lang} section document`);
  return parsePayload<T>(doc, `${label}/${lang}`);
}

export async function fetchSiteData(): Promise<SiteData> {
  if (!databases) throw new Error("Appwrite environment variables are missing");
  const results = await Promise.all(
    ALL_COLLECTIONS.map(async (id) => [id, await list(id)] as const),
  );
  const map = new Map<string, Doc[]>(
    results.map(([id, result]) => [id, result.documents as Doc[]]),
  );
  const docs = (id: string): Doc[] => map.get(id) ?? [];

  const main = docs(COLLECTIONS.settings).find((doc) => doc.kind === "main");
  if (!main) throw new Error("Website content is not initialized");

  const d = defaultSiteData();
  const global = parsePayload<{
    settings: SiteSettings;
    images: SiteData["images"];
    metaEn: Content["meta"];
    metaHi: Content["meta"];
  }>(main, "settings/main");
  d.settings = mergeObject(d.settings, global.settings);
  d.images = mergeObject(d.images, global.images);
  (d.en as unknown as Record<string, unknown>).meta = mergeObject(
    d.en.meta,
    global.metaEn,
  );
  (d.hi as unknown as Record<string, unknown>).meta = mergeObject(
    d.hi.meta,
    global.metaHi,
  );
  d.publishedAt = String(main.publishedAt ?? "") || null;

  for (const [collection, key] of [
    [COLLECTIONS.navigation, "nav"],
    [COLLECTIONS.hero, "hero"],
    [COLLECTIONS.about, "about"],
    [COLLECTIONS.principal, "principal"],
    [COLLECTIONS.highlights, "highlights"],
    [COLLECTIONS.footer, "footer"],
  ] as const) {
    const collectionDocs = docs(collection);
    const enLoaded = sectionByLang<unknown>(collectionDocs, "en", collection);
    const hiLoaded = sectionByLang<unknown>(collectionDocs, "hi", collection);
    const enTree = d.en as unknown as Record<string, unknown>;
    const hiTree = d.hi as unknown as Record<string, unknown>;
    enTree[key] = mergeObject(enTree[key], enLoaded);
    hiTree[key] = mergeObject(hiTree[key], hiLoaded);
  }

  for (const [collection, key] of [
    [COLLECTIONS.teachers, "teachers"],
    [COLLECTIONS.gallery, "gallery"],
    [COLLECTIONS.notices, "notices"],
    [COLLECTIONS.facilities, "facilities"],
    [COLLECTIONS.achievements, "achievements"],
  ] as const) {
    const collectionDocs = docs(collection);
    const enTree = d.en as unknown as Record<string, unknown>;
    const hiTree = d.hi as unknown as Record<string, unknown>;
    enTree[key] = mergeObject(
      enTree[key],
      sectionByLang<unknown>(collectionDocs, "en", collection),
    );
    hiTree[key] = mergeObject(
      hiTree[key],
      sectionByLang<unknown>(collectionDocs, "hi", collection),
    );
  }

  d.teachers = byKind(docs(COLLECTIONS.teachers), "item")
    .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
    .map<TeacherRecord>((doc) => ({
      id: doc.$id,
      name: String(doc.name ?? ""),
      subject: String(doc.subject ?? ""),
      qualification: String(doc.qualification ?? ""),
      experience: String(doc.experience ?? ""),
      designation: String(doc.designation ?? ""),
      photo: String(doc.photoUrl ?? ""),
    }));

  d.gallery = byKind(docs(COLLECTIONS.gallery), "item")
    .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
    .map<GalleryRecord>((doc) => ({
      id: doc.$id,
      src: String(doc.imageUrl ?? ""),
      title: String(doc.title ?? ""),
      caption: String(doc.caption ?? ""),
      category: String(doc.category ?? ""),
    }));

  d.notices = byKind(docs(COLLECTIONS.notices), "item")
    .sort((a, b) => Number(b.pinned) - Number(a.pinned))
    .map<NoticeRecord>((doc) => ({
      id: doc.$id,
      tag: String(doc.tag ?? ""),
      date: String(doc.displayDate ?? ""),
      title: String(doc.title ?? ""),
      body: String(doc.body ?? ""),
      pinned: Boolean(doc.pinned),
      important: Boolean(doc.important),
      status: doc.status === "draft" ? "draft" : "published",
      publishDate: String(doc.publishDate ?? ""),
      expiryDate: String(doc.expiryDate ?? ""),
    }));

  for (const lang of ["en", "hi"] as const) {
    const facilities = byKind(docs(COLLECTIONS.facilities), "item")
      .filter((doc) => doc.lang === lang)
      .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
      .map((doc) => ({
        title: String(doc.title ?? ""),
        desc: String(doc.description ?? ""),
        meta: String(doc.meta ?? ""),
      }));
    const achievements = byKind(docs(COLLECTIONS.achievements), "item")
      .filter((doc) => doc.lang === lang)
      .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
      .map((doc) => ({
        period: String(doc.period ?? ""),
        tag: String(doc.tag ?? ""),
        title: String(doc.title ?? ""),
        body: String(doc.description ?? ""),
      }));
    (d[lang] as unknown as Record<string, unknown>).facilities = {
      ...d[lang].facilities,
      items: facilities,
    };
    (d[lang] as unknown as Record<string, unknown>).achievements = {
      ...d[lang].achievements,
      items: achievements,
    };
  }

  for (const lang of ["en", "hi"] as const) {
    const base = sectionByLang<Record<string, unknown>>(
      docs(COLLECTIONS.vocational),
      lang,
      COLLECTIONS.vocational,
    );
    const courses = docs(COLLECTIONS.vocationalCourses)
      .filter((doc) => doc.lang === lang)
      .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
      .map((course) => {
        const child = (collection: string) =>
          docs(collection)
            .filter((doc) => doc.lang === lang && doc.courseKey === course.courseKey)
            .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
            .map((doc) => String(doc.value ?? ""));
        return {
          name: String(course.name ?? ""),
          tagline: String(course.tagline ?? ""),
          intro: String(course.description ?? ""),
          eligibility: String(course.eligibility ?? ""),
          duration: String(course.duration ?? ""),
          image: String(course.imageUrl ?? ""),
          objectives: child(COLLECTIONS.vocationalSubjects),
          certificates: child(COLLECTIONS.vocationalCertificates),
          skills: child(COLLECTIONS.vocationalSkills),
          careers: child(COLLECTIONS.vocationalCareers),
        };
      });
    (d[lang] as unknown as Record<string, unknown>).vocational = {
      ...mergeObject(
        d[lang].vocational as unknown as Record<string, unknown>,
        base,
      ),
      subjects: courses,
    };
  }

  d.settings.socialLinks = docs(COLLECTIONS.socialLinks)
    .filter((doc) => doc.kind === "item")
    .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder))
    .map((doc) => ({ label: String(doc.label ?? ""), url: String(doc.url ?? "") }));

  return d;
}

export const fetchSiteDataStrict = fetchSiteData;

const strip = (value: Record<string, unknown>, key: string) => {
  const copy = { ...value };
  delete copy[key];
  return copy;
};

function sectionDocs(en: unknown, hi: unknown, revision: string): DraftDoc[] {
  return [
    {
      id: ID.unique(),
      data: {
        revision,
        lang: "en",
        kind: "section",
        payload: JSON.stringify(en),
        sortOrder: 0,
      },
    },
    {
      id: ID.unique(),
      data: {
        revision,
        lang: "hi",
        kind: "section",
        payload: JSON.stringify(hi),
        sortOrder: 1,
      },
    },
  ];
}

function buildPlan(data: SiteData, revision: string) {
  const plan = new Map<string, DraftDoc[]>();
  const add = (collection: string, docs: DraftDoc[]) => plan.set(collection, docs);

  add(COLLECTIONS.settings, [
    {
      id: "main",
      data: {
        revision,
        lang: "global",
        kind: "main",
        payload: JSON.stringify({
          settings: { ...data.settings, socialLinks: [] },
          images: data.images,
          metaEn: data.en.meta,
          metaHi: data.hi.meta,
        }),
        publishedAt: data.publishedAt ?? new Date().toISOString(),
        sortOrder: 0,
      },
    },
  ]);

  for (const [collection, en, hi] of [
    [COLLECTIONS.navigation, data.en.nav, data.hi.nav],
    [COLLECTIONS.hero, data.en.hero, data.hi.hero],
    [COLLECTIONS.about, data.en.about, data.hi.about],
    [COLLECTIONS.principal, data.en.principal, data.hi.principal],
    [COLLECTIONS.highlights, data.en.highlights, data.hi.highlights],
    [COLLECTIONS.footer, data.en.footer, data.hi.footer],
  ] as const) {
    add(collection, sectionDocs(en, hi, revision));
  }

  add(COLLECTIONS.teachers, [
    ...sectionDocs(
      strip(data.en.teachers as unknown as Record<string, unknown>, "list"),
      strip(data.hi.teachers as unknown as Record<string, unknown>, "list"),
      revision,
    ),
    ...data.teachers.map((item, index) => ({
      id: item.id,
      data: {
        revision,
        lang: "global",
        kind: "item",
        payload: "{}",
        name: item.name,
        subject: item.subject,
        qualification: item.qualification,
        experience: item.experience,
        designation: item.designation,
        photoUrl: item.photo,
        sortOrder: index,
      },
    })),
  ]);

  add(COLLECTIONS.gallery, [
    ...sectionDocs(data.en.gallery, data.hi.gallery, revision),
    ...data.gallery.map((item, index) => ({
      id: item.id,
      data: {
        revision,
        lang: "global",
        kind: "item",
        payload: "{}",
        imageUrl: item.src,
        title: item.title,
        caption: item.caption,
        category: item.category,
        sortOrder: index,
      },
    })),
  ]);

  add(COLLECTIONS.notices, [
    ...sectionDocs(
      strip(data.en.notices as unknown as Record<string, unknown>, "items"),
      strip(data.hi.notices as unknown as Record<string, unknown>, "items"),
      revision,
    ),
    ...data.notices.map((item, index) => ({
      id: item.id,
      data: {
        revision,
        lang: "global",
        kind: "item",
        payload: "{}",
        tag: item.tag,
        displayDate: item.date,
        title: item.title,
        body: item.body,
        pinned: item.pinned,
        important: item.important,
        status: item.status,
        publishDate: item.publishDate,
        expiryDate: item.expiryDate,
        sortOrder: index,
      },
    })),
  ]);

  const addLocalizedItems = (
    collection: string,
    enSection: Record<string, unknown>,
    hiSection: Record<string, unknown>,
    mapper: (item: Record<string, unknown>) => Record<string, unknown>,
  ) => {
    const documents = sectionDocs(
      strip(enSection, "items"),
      strip(hiSection, "items"),
      revision,
    );
    for (const [lang, section] of [
      ["en", enSection],
      ["hi", hiSection],
    ] as const) {
      const items = (section.items as Record<string, unknown>[]) ?? [];
      items.forEach((item, index) =>
        documents.push({
          id: ID.unique(),
          data: {
            revision,
            lang,
            kind: "item",
            payload: "{}",
            ...mapper(item),
            sortOrder: index,
          },
        }),
      );
    }
    add(collection, documents);
  };

  addLocalizedItems(
    COLLECTIONS.facilities,
    data.en.facilities as unknown as Record<string, unknown>,
    data.hi.facilities as unknown as Record<string, unknown>,
    (item) => ({
      title: item.title,
      description: item.desc,
      meta: item.meta,
    }),
  );
  addLocalizedItems(
    COLLECTIONS.achievements,
    data.en.achievements as unknown as Record<string, unknown>,
    data.hi.achievements as unknown as Record<string, unknown>,
    (item) => ({
      title: item.title,
      description: item.body,
      period: item.period,
      tag: item.tag,
    }),
  );

  const vocational: DraftDoc[] = [];
  const courses: DraftDoc[] = [];
  const children = new Map<string, DraftDoc[]>([
    [COLLECTIONS.vocationalSubjects, []],
    [COLLECTIONS.vocationalCertificates, []],
    [COLLECTIONS.vocationalSkills, []],
    [COLLECTIONS.vocationalCareers, []],
  ]);
  for (const lang of ["en", "hi"] as const) {
    const section = data[lang].vocational as unknown as Record<string, unknown>;
    vocational.push(
      ...sectionDocs(strip(section, "subjects"), strip(section, "subjects"), revision).filter(
        (doc) => doc.data.lang === lang,
      ),
    );
    const courseList = (section.subjects as Record<string, unknown>[]) ?? [];
    courseList.forEach((course, courseIndex) => {
      const courseKey = `${lang}-${courseIndex}`;
      courses.push({
        id: ID.unique(),
        data: {
          revision,
          lang,
          kind: "item",
          payload: "{}",
          courseKey,
          name: String(course.name ?? ""),
          tagline: String(course.tagline ?? ""),
          description: String(course.intro ?? ""),
          eligibility: String(course.eligibility ?? ""),
          duration: String(course.duration ?? ""),
          imageUrl: String(course.image ?? ""),
          sortOrder: courseIndex,
        },
      });
      for (const [collection, key] of [
        [COLLECTIONS.vocationalSubjects, "objectives"],
        [COLLECTIONS.vocationalCertificates, "certificates"],
        [COLLECTIONS.vocationalSkills, "skills"],
        [COLLECTIONS.vocationalCareers, "careers"],
      ] as const) {
        ((course[key] as string[] | undefined) ?? []).forEach((value, index) =>
          children.get(collection)?.push({
            id: ID.unique(),
            data: {
              revision,
              lang,
              kind: "item",
              payload: "{}",
              courseKey,
              value,
              sortOrder: index,
            },
          }),
        );
      }
    });
  }
  add(COLLECTIONS.vocational, vocational);
  add(COLLECTIONS.vocationalCourses, courses);
  for (const [collection, documents] of children) add(collection, documents);

  add(
    COLLECTIONS.socialLinks,
    data.settings.socialLinks.map((item, index) => ({
      id: ID.unique(),
      data: {
        revision,
        lang: "global",
        kind: "item",
        payload: "{}",
        label: item.label,
        url: item.url,
        sortOrder: index,
      },
    })),
  );
  return plan;
}

type Mutation =
  | { kind: "delete"; collectionId: string; documentId: string }
  | { kind: "upsert"; collectionId: string; documentId: string; data: Record<string, unknown> };

const MAX_TRANSACTION_OPERATIONS = 100;
const TRANSACTION_BATCH_SIZE = 90;

async function applyMutationBatch(mutations: Mutation[]): Promise<void> {
  if (!databases || mutations.length === 0) return;
  if (mutations.length > MAX_TRANSACTION_OPERATIONS) {
    throw new Error(
      `Internal error: mutation batch contains ${mutations.length} operations; maximum is ${MAX_TRANSACTION_OPERATIONS}`,
    );
  }

  let transactionId: string | null = null;
  let operation = "create transaction";
  try {
    const transaction = await databases.createTransaction({ ttl: 120 });
    transactionId = transaction.$id;

    for (const mutation of mutations) {
      operation = `${mutation.kind} ${mutation.collectionId}/${mutation.documentId}`;
      if (mutation.kind === "delete") {
        await databases.deleteDocument({
          databaseId: APPWRITE_IDS.database,
          collectionId: mutation.collectionId,
          documentId: mutation.documentId,
          transactionId,
        });
      } else {
        await databases.upsertDocument({
          databaseId: APPWRITE_IDS.database,
          collectionId: mutation.collectionId,
          documentId: mutation.documentId,
          data: mutation.data,
          transactionId,
        });
      }
    }

    operation = "commit transaction";
    await databases.updateTransaction({ transactionId, commit: true });
  } catch (error) {
    console.error(`[appwrite/repository] ${operation} failed:`, error);
    if (transactionId) {
      try {
        await databases.updateTransaction({ transactionId, rollback: true });
      } catch (rollbackError) {
        console.error("[appwrite/repository] rollback failed:", rollbackError);
      }
    }
    throw error;
  }
}

export async function publishSiteData(data: SiteData): Promise<PublishResult> {
  if (!databases) return { ok: false, error: "Appwrite is not configured" };
  const plan = buildPlan(data, ID.unique());
  const mutations: Mutation[] = [];

  try {
    // Build the complete mutation list first, then execute it in separate
    // committed transactions. Appwrite rejects transaction #101, so keeping
    // each transaction below the hard 100-operation limit is required.
    for (const collection of ALL_COLLECTIONS) {
      const existing = await list(collection);
      const planned = plan.get(collection) ?? [];
      const wanted = new Set(planned.map((doc) => doc.id));

      for (const doc of existing.documents.filter((doc) => !wanted.has(doc.$id))) {
        mutations.push({
          kind: "delete",
          collectionId: collection,
          documentId: doc.$id,
        });
      }

      for (const doc of planned) {
        mutations.push({
          kind: "upsert",
          collectionId: collection,
          documentId: doc.id,
          data: doc.data,
        });
      }
    }

    for (let offset = 0; offset < mutations.length; offset += TRANSACTION_BATCH_SIZE) {
      await applyMutationBatch(
        mutations.slice(offset, offset + TRANSACTION_BATCH_SIZE),
      );
    }

    return { ok: true };
  } catch (error) {
    console.error("[appwrite/repository] publish failed:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      code:
        error && typeof error === "object" && "code" in error
          ? Number((error as { code: unknown }).code)
          : undefined,
    };
  }
}

export async function resetAllData() {
  return defaultSiteData();
}
