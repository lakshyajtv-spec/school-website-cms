import { Account, Client, Databases, Storage } from "appwrite";
import {
  APPWRITE_BUCKET_ID,
  APPWRITE_DATABASE_ID,
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  isAppwriteConfigured,
} from "@/config/env";

export const appwriteClient = isAppwriteConfigured
  ? new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID)
  : null;

export const account = appwriteClient ? new Account(appwriteClient) : null;
export const databases = appwriteClient ? new Databases(appwriteClient) : null;
export const storage = appwriteClient ? new Storage(appwriteClient) : null;

export const APPWRITE_IDS = {
  database: APPWRITE_DATABASE_ID,
  bucket: APPWRITE_BUCKET_ID,
} as const;

/** Stable collection IDs configured in Appwrite Cloud. */
export const COLLECTIONS = {
  settings: "settings",
  navigation: "navigation",
  hero: "hero",
  about: "about",
  principal: "principal",
  highlights: "highlights",
  teachers: "teachers",
  gallery: "gallery",
  notices: "notices",
  facilities: "facilities",
  achievements: "achievements",
  vocational: "vocational",
  vocationalCourses: "vocational_courses",
  vocationalSubjects: "vocational_subjects",
  vocationalCertificates: "vocational_certificates",
  vocationalSkills: "vocational_skills",
  vocationalCareers: "vocational_careers",
  footer: "footer",
  socialLinks: "social_links",
} as const;

export const ALL_COLLECTIONS = Object.values(COLLECTIONS);

export { isAppwriteConfigured };