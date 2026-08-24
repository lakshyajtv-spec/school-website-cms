import { useState } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Upload, X, Save, Image as ImageIcon, Folder } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { createGalleryItem, updateGalleryItem, deleteGalleryItem, uploadFile, deleteFile, getFilePreviewUrl } from "../lib/appwrite.js";

const CATEGORIES = ["Campus", "Events", "Sports", "Annual Day"];
const empty = { title: "", image_id: "", category: "Campus" };

export default function GalleryManager() {
  const { gallery, refreshData } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [filter, setFilter] = useState("All");

  const open = (g) => {
    if (g) {
      setEditing(g.id);
      setForm({ title: g.title, image_id: g.image_id, category: g.category || "Campus" });
    } else {
      setEditing(null);
      setForm(empty);
    }
    setModalOpen(true);
  };
  const close = () => { setModalOpen(false); setEditing(null); setForm(empty); };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Please enter a title."); return; }
    if (!form.image_id) { toast.error("Please upload an image."); return; }
    setSaving(true);
    try {
      if (editing) await updateGalleryItem(editing, form);
      else await createGalleryItem({ ...form, created_at: new Date().toISOString() });
      toast.success(editing ? "Photo updated." : "Photo added.");
      await refreshData();
      close();
    } catch (e) { toast.error(e.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  const onDelete = async (g) => {
    if (!confirm(`Delete photo "${g.title}"?`)) return;
    try {
      await deleteGalleryItem(g.id);
      if (g.image_id) { try { await deleteFile(g.image_id); } catch {} }
      await refreshData();
      toast.success("Photo deleted.");
    } catch (e) { toast.error(e.message || "Delete failed."); }
  };

  const onImageUpload = async (e, { bulk = false } = {}) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    for (const f of files) {
      if (!f.type.startsWith("image/")) { toast.error(`${f.name}: not an image.`); continue; }
      if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name}: too large (max 20 MB).`); continue; }
    }
    if (bulk) {
      setBulkUploading(true);
      let ok = 0;
      for (const f of files) {
        try {
          const id = await uploadFile(f);
          await createGalleryItem({
            title: f.name.replace(/\.[^.]+$/, ""),
            image_id: id,
            category: "Campus",
            created_at: new Date().toISOString(),
          });
          ok++;
        } catch (err) { console.error(err); toast.error(`${f.name}: upload failed`); }
      }
      if (ok > 0) { toast.success(`${ok} photo(s) uploaded.`); await refreshData(); }
      setBulkUploading(false);
      e.target.value = "";
      return;
    }
    // Single
    setUploading(true);
    try {
      if (form.image_id) { try { await deleteFile(form.image_id); } catch {} }
      const id = await uploadFile(files[0]);
      setForm((s) => ({ ...s, image_id: id, title: s.title || files[0].name.replace(/\.[^.]+$/, "") }));
      toast.success("Image uploaded.");
    } catch (e) { toast.error(e.message || "Upload failed."); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const removeImage = async () => {
    if (form.image_id) { try { await deleteFile(form.image_id); } catch {} }
    setForm((s) => ({ ...s, image_id: "" }));
  };

  const categories = ["All", ...CATEGORIES];
  const filtered = filter === "All" ? gallery : gallery.filter((g) => g.category === filter);
  const imgPreview = form.image_id ? getFilePreviewUrl(form.image_id, { width: 600 }) : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-gov-900">Manage Gallery</h2>
          <p className="font-body text-sm text-gov-600">Upload photos and assign them to categories. Bulk-upload multiple images at once.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-gov-300 bg-white px-4 py-2.5 font-heading text-sm font-semibold text-gov-700 transition hover:border-gov-500 hover:bg-gov-50 ${bulkUploading ? "opacity-60" : ""}`}>
            <Upload className="h-4 w-4" /> {bulkUploading ? "Uploading…" : "Bulk Upload"}
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onImageUpload(e, { bulk: true })} disabled={bulkUploading} />
          </label>
          <button onClick={() => open(null)} className="inline-flex items-center gap-2 rounded-xl bg-gov-700 px-4 py-2.5 font-heading text-sm font-semibold text-white shadow-md transition hover:bg-gov-800">
            <Plus className="h-4 w-4" /> Single Upload
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button key={c} onClick={() => setFilter(c)} className={`rounded-full border px-4 py-1.5 font-heading text-xs font-semibold transition ${filter === c ? "border-gov-700 bg-gov-700 text-white" : "border-gov-200 bg-white text-gov-700 hover:border-gov-400"}`}>
            {c} ({c === "All" ? gallery.length : gallery.filter(g => g.category === c).length})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((g) => (
          <div key={g.id} className="gov-card group relative overflow-hidden rounded-2xl border border-gov-100 bg-white">
            <div className="aspect-[4/3] bg-gov-100">
              {g.image ? <img src={g.image} alt={g.title} className="h-full w-full object-cover" /> : (
                <div className="flex h-full w-full items-center justify-center"><ImageIcon className="h-10 w-10 text-gov-300" /></div>
              )}
            </div>
            <div className="p-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-gov-100 px-2 py-0.5 font-heading text-[0.6rem] font-bold text-gov-700 uppercase"><Folder className="h-2.5 w-2.5" />{g.category}</span>
              <p className="mt-1.5 truncate font-heading text-sm font-semibold text-gov-900">{g.title}</p>
              <div className="mt-2 flex gap-1">
                <button onClick={() => open(g)} className="flex-1 rounded-md bg-gov-50 px-2 py-1 font-heading text-[0.7rem] font-semibold text-gov-700 hover:bg-gov-100"><Pencil className="mr-1 inline h-3 w-3" />Edit</button>
                <button onClick={() => onDelete(g)} className="flex-1 rounded-md bg-red-50 px-2 py-1 font-heading text-[0.7rem] font-semibold text-red-600 hover:bg-red-100"><Trash2 className="mr-1 inline h-3 w-3" />Delete</button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border-2 border-dashed border-gov-200 bg-white p-10 text-center">
            <ImageIcon className="mx-auto h-10 w-10 text-gov-300" />
            <p className="mt-2 font-heading text-sm text-gov-500">No photos in this category.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" onClick={close}>
          <form onSubmit={onSubmit} onClick={(e) => e.stopPropagation()} className="my-10 w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gov-100 p-6">
              <h3 className="font-display text-xl font-bold text-gov-900">{editing ? "Edit Photo" : "Add Photo"}</h3>
              <button type="button" onClick={close} className="rounded-lg p-2 text-gov-500 hover:bg-gov-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-6">
              {/* Image preview/upload */}
              {imgPreview ? (
                <div className="relative inline-block">
                  <img src={imgPreview} alt="preview" className="max-h-64 rounded-2xl object-cover" />
                  <button type="button" onClick={removeImage} className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1.5 text-white"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gov-200 bg-gov-50/60 p-10 font-heading text-sm font-semibold text-gov-600 transition hover:border-gov-400 hover:bg-gov-50 ${uploading ? "opacity-60" : ""}`}>
                  <ImageIcon className="h-10 w-10" />{uploading ? "Uploading…" : "Click to upload image"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onImageUpload(e, { bulk: false })} disabled={uploading} />
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block font-heading text-xs font-semibold tracking-wide text-gov-700 uppercase">Title *</span>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-xl border border-gov-200 px-4 py-2.5 font-body text-sm outline-none focus:border-gov-600 focus:ring-4 focus:ring-gov-100" placeholder="Photo title" />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-heading text-xs font-semibold tracking-wide text-gov-700 uppercase">Category</span>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-xl border border-gov-200 bg-white px-4 py-2.5 font-body text-sm outline-none focus:border-gov-600 focus:ring-4 focus:ring-gov-100">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-gov-100 p-6">
              <button type="button" onClick={close} className="rounded-xl border border-gov-200 px-5 py-2.5 font-heading text-sm font-semibold text-gov-700 hover:bg-gov-50">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gov-700 px-5 py-2.5 font-heading text-sm font-semibold text-white transition hover:bg-gov-800 disabled:opacity-60">
                {saving ? "Saving…" : <><Save className="h-4 w-4" /> {editing ? "Update" : "Add Photo"}</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
