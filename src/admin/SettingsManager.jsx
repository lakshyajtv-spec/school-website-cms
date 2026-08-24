import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Save, Upload, X, Image as ImageIcon } from "lucide-react";
import { databases, uploadFile, deleteFile, getFilePreviewUrl, APPWRITE_CONFIG } from "../lib/appwrite.js";
import { useApp } from "../context/AppContext.jsx";
import { ID } from "appwrite";

const COLLECTION = "school_info";

// Map of keys to labels (and optional help text) for the settings form.
const FIELDS = [
  { key: "school_name",      label: "School Name",        type: "text",   required: true },
  { key: "school_place",     label: "Place / Location",   type: "text",   required: true },
  { key: "school_tagline",   label: "Tagline / Subtitle", type: "text" },
  { key: "affiliation",      label: "Affiliation",        type: "text" },
  { key: "classes",          label: "Classes Offered",    type: "text" },
  { key: "establishment_year", label: "Establishment Year", type: "text" },
  { key: "address",          label: "Full Address",       type: "textarea" },
  { key: "phone",            label: "Contact Phone",      type: "tel" },
  { key: "email",            label: "Contact Email",      type: "email" },
  { key: "principal_name",   label: "Principal Name",     type: "text" },
  { key: "principal_message",label: "Principal Message",  type: "textarea" },
  { key: "vision",           label: "Vision",             type: "textarea" },
  { key: "mission",          label: "Mission",            type: "textarea" },
  { key: "map_embed",        label: "Google Map Embed URL", type: "url" },
];

const IMAGE_KEYS = [
  { key: "logo_url", label: "School Logo (recommended 512×512, PNG)" },
  { key: "hero_banner_1", label: "Hero Banner 1" },
  { key: "hero_banner_2", label: "Hero Banner 2" },
  { key: "hero_banner_3", label: "Hero Banner 3" },
  { key: "principal_photo", label: "Principal Photo" },
];

export default function SettingsManager() {
  const { schoolInfo, refreshData } = useApp();
  const [data, setData] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState(null);

  // Build an internal map key -> documentId so we can update (not duplicate) rows.
  const [keyToDocId, setKeyToDocId] = useState({});

  useEffect(() => {
    if (schoolInfo) setData({ ...schoolInfo });
    // Fetch raw docs to map keys -> doc $id
    (async () => {
      try {
        const res = await databases.listDocuments(APPWRITE_CONFIG.DATABASE_ID, COLLECTION, [/* all */]);
        const map = {};
        res.documents.forEach((d) => { if (d.key) map[d.key] = d.$id; });
        setKeyToDocId(map);
      } catch (e) { console.warn("Could not map school_info docs:", e); }
    })();
  }, [schoolInfo]);

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Upsert each field individually. Missing keys are created with unique IDs;
      // existing keys are updated in place.
      for (const f of [...FIELDS, ...IMAGE_KEYS]) {
        const value = String(data[f.key] ?? "");
        const existingId = keyToDocId[f.key];
        if (existingId) {
          await databases.updateDocument(APPWRITE_CONFIG.DATABASE_ID, COLLECTION, existingId, { key: f.key, value });
        } else {
          const created = await databases.createDocument(APPWRITE_CONFIG.DATABASE_ID, COLLECTION, ID.unique(), { key: f.key, value });
          setKeyToDocId((m) => ({ ...m, [f.key]: created.$id }));
        }
      }
      await refreshData();
      toast.success("Settings saved.");
    } catch (e) {
      console.error(e); toast.error(e.message || "Failed to save settings.");
    } finally { setSaving(false); }
  };

  const onImageUpload = async (e, key) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Please upload an image."); return; }
    if (f.size > 20 * 1024 * 1024) { toast.error("Image too large (max 20 MB)."); return; }
    setUploadingKey(key);
    try {
      // Remove old file if present
      if (data[key] && typeof data[key] === "string" && data[key].length < 64) {
        try { await deleteFile(data[key]); } catch {}
      }
      const id = await uploadFile(f);
      set(key, id);
      toast.success("Image uploaded. Remember to click Save Settings.");
    } catch (e) { toast.error(e.message || "Upload failed."); }
    finally { setUploadingKey(null); e.target.value = ""; }
  };

  const removeImage = async (key) => {
    if (data[key]) {
      try { await deleteFile(data[key]); } catch {}
    }
    set(key, "");
  };

  const imgPreviewFor = (v) => {
    if (!v) return "";
    // v could be a file ID or a full URL
    if (v.startsWith("http")) return v;
    return getFilePreviewUrl(v, { width: 400 });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-gov-900">School Settings</h2>
        <p className="font-body text-sm text-gov-600">Update school identity, contact info and other site-wide settings. Click "Save Settings" at the bottom to apply changes.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* General info */}
        <section className="rounded-2xl border border-gov-100 bg-white p-6 shadow-card">
          <h3 className="font-display text-lg font-bold text-gov-900">General Information</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <label key={f.key} className={`block ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>
                <span className="mb-1.5 block font-heading text-xs font-semibold tracking-wide text-gov-700 uppercase">
                  {f.label}{f.required ? " *" : ""}
                </span>
                {f.type === "textarea" ? (
                  <textarea rows={f.key === "principal_message" || f.key === "vision" || f.key === "mission" || f.key === "address" ? 4 : 2} value={data[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} className="w-full resize-y rounded-xl border border-gov-200 px-4 py-2.5 font-body text-sm outline-none focus:border-gov-600 focus:ring-4 focus:ring-gov-100" />
                ) : (
                  <input type={f.type} value={data[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} className="w-full rounded-xl border border-gov-200 px-4 py-2.5 font-body text-sm outline-none focus:border-gov-600 focus:ring-4 focus:ring-gov-100" />
                )}
              </label>
            ))}
          </div>
        </section>

        {/* Images */}
        <section className="rounded-2xl border border-gov-100 bg-white p-6 shadow-card">
          <h3 className="font-display text-lg font-bold text-gov-900">Images & Media</h3>
          <p className="font-body text-sm text-gov-600">Upload logo, principal photo and hero banner images. Images are stored in Appwrite Storage.</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {IMAGE_KEYS.map((k) => {
              const v = data[k.key] || "";
              const preview = imgPreviewFor(v);
              const busy = uploadingKey === k.key;
              return (
                <div key={k.key} className="rounded-xl border border-gov-200 p-4">
                  <p className="font-heading text-xs font-bold tracking-wider text-gov-700 uppercase">{k.label}</p>
                  {preview ? (
                    <div className="relative mt-2">
                      <img src={preview} alt={k.key} className="h-36 w-full rounded-lg object-cover" />
                      <button type="button" onClick={() => removeImage(k.key)} className="absolute top-2 right-2 rounded-full bg-red-500 p-1 text-white"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <label className={`mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gov-200 p-6 font-heading text-xs font-semibold text-gov-600 transition hover:border-gov-400 hover:bg-gov-50 ${busy ? "opacity-60" : ""}`}>
                      <ImageIcon className="h-6 w-6" />{busy ? "Uploading…" : "Upload image"}
                      <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => onImageUpload(e, k.key)} />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Save bar */}
        <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t border-gov-100 bg-white/95 p-4 backdrop-blur lg:-mx-8 lg:px-8">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gov-700 px-6 py-3 font-heading text-sm font-bold text-white shadow-lg transition hover:bg-gov-800 disabled:opacity-60">
            {saving ? "Saving…" : <><Save className="h-4 w-4" /> Save Settings</>}
          </button>
        </div>
      </form>
    </div>
  );
}
