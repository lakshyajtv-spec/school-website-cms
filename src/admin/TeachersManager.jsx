import { useState } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Upload, UserCircle, X, Save, Image as ImageIcon } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { createTeacher, updateTeacher, deleteTeacher, uploadFile, deleteFile, getFilePreviewUrl } from "../lib/appwrite.js";

const empty = { name: "", designation: "", subject: "", qualification: "", image_id: "", order: 0 };

export default function TeachersManager() {
  const { teachers, refreshData } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const open = (t) => {
    if (t) {
      setEditing(t.id);
      setForm({ name: t.name, designation: t.designation, subject: t.subject, qualification: t.qualification, image_id: t.image_id, order: t.order || 0 });
    } else {
      setEditing(null);
      setForm({ ...empty, order: teachers.length + 1 });
    }
    setModalOpen(true);
  };
  const close = () => { setModalOpen(false); setEditing(null); setForm(empty); };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.designation.trim() || !form.subject.trim()) {
      toast.error("Please fill in name, designation and subject."); return;
    }
    setSaving(true);
    try {
      if (editing) await updateTeacher(editing, form);
      else await createTeacher(form);
      toast.success(editing ? "Teacher updated." : "Teacher added.");
      await refreshData();
      close();
    } catch (e) { toast.error(e.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  const onDelete = async (t) => {
    if (!confirm(`Delete teacher "${t.name}"?`)) return;
    try {
      await deleteTeacher(t.id);
      if (t.image_id) { try { await deleteFile(t.image_id); } catch {} }
      await refreshData();
      toast.success("Teacher removed.");
    } catch (e) { toast.error(e.message || "Delete failed."); }
  };

  const onImageUpload = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Please upload an image."); return; }
    if (f.size > 20 * 1024 * 1024) { toast.error("Image too large (max 20 MB)."); return; }
    setUploading(true);
    try {
      if (form.image_id) { try { await deleteFile(form.image_id); } catch {} }
      const id = await uploadFile(f);
      setForm((s) => ({ ...s, image_id: id }));
      toast.success("Image uploaded.");
    } catch (e) { toast.error(e.message || "Upload failed."); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const removeImage = async () => {
    if (form.image_id) { try { await deleteFile(form.image_id); } catch {} }
    setForm((s) => ({ ...s, image_id: "" }));
  };

  const sorted = [...teachers].sort((a, b) => a.order - b.order);
  const imgPreview = form.image_id ? getFilePreviewUrl(form.image_id, { width: 400, height: 400 }) : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-gov-900">Manage Teachers</h2>
          <p className="font-body text-sm text-gov-600">Add, edit and remove faculty members. Set display order using the "Order" field (lower = first).</p>
        </div>
        <button onClick={() => open(null)} className="inline-flex items-center gap-2 rounded-xl bg-gov-700 px-4 py-2.5 font-heading text-sm font-semibold text-white shadow-md transition hover:bg-gov-800">
          <Plus className="h-4 w-4" /> Add Teacher
        </button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sorted.map((t) => (
          <div key={t.id} className="gov-card overflow-hidden rounded-2xl border border-gov-100 bg-white">
            <div className="relative h-48 bg-gradient-to-br from-gov-100 to-gov-200">
              {t.image ? (
                <img src={t.image} alt={t.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center"><UserCircle className="h-20 w-20 text-gov-400" /></div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gov-900/80 to-transparent p-3">
                <span className="inline-block rounded-full bg-gold-400 px-2 py-0.5 font-heading text-[0.65rem] font-bold tracking-wider text-gov-900 uppercase">{t.designation}</span>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-display text-base font-bold text-gov-900">{t.name || "—"}</h3>
              <p className="font-heading text-sm font-semibold text-gov-700">{t.subject}</p>
              {t.qualification && <p className="mt-1 font-body text-xs text-gov-600">{t.qualification}</p>}
              <p className="mt-1 font-heading text-[0.65rem] font-bold tracking-widest text-gov-400">ORDER: {t.order}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => open(t)} className="flex-1 rounded-lg bg-gov-50 px-3 py-1.5 font-heading text-xs font-semibold text-gov-700 hover:bg-gov-100"><Pencil className="mr-1 inline h-3 w-3" />Edit</button>
                <button onClick={() => onDelete(t)} className="flex-1 rounded-lg bg-red-50 px-3 py-1.5 font-heading text-xs font-semibold text-red-600 hover:bg-red-100"><Trash2 className="mr-1 inline h-3 w-3" />Delete</button>
              </div>
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="col-span-full rounded-2xl border-2 border-dashed border-gov-200 bg-white p-10 text-center">
            <UserCircle className="mx-auto h-10 w-10 text-gov-300" />
            <p className="mt-2 font-heading text-sm text-gov-500">No teachers added yet.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" onClick={close}>
          <form onSubmit={onSubmit} onClick={(e) => e.stopPropagation()} className="my-10 w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gov-100 p-6">
              <h3 className="font-display text-xl font-bold text-gov-900">{editing ? "Edit Teacher" : "Add Teacher"}</h3>
              <button type="button" onClick={close} className="rounded-lg p-2 text-gov-500 hover:bg-gov-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-6">
              {/* Photo upload */}
              <div>
                <span className="mb-1.5 block font-heading text-xs font-semibold tracking-wide text-gov-700 uppercase">Photo</span>
                {imgPreview ? (
                  <div className="relative inline-block">
                    <img src={imgPreview} alt="preview" className="h-32 w-32 rounded-2xl object-cover" />
                    <button type="button" onClick={removeImage} className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gov-200 bg-gov-50/60 p-8 font-heading text-sm font-semibold text-gov-600 transition hover:border-gov-400 hover:bg-gov-50 ${uploading ? "opacity-60" : ""}`}>
                    <ImageIcon className="h-8 w-8" />{uploading ? "Uploading…" : "Click to upload photo"}
                    <input type="file" accept="image/*" className="hidden" onChange={onImageUpload} disabled={uploading} />
                  </label>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block font-heading text-xs font-semibold tracking-wide text-gov-700 uppercase">Full Name *</span>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-gov-200 px-4 py-2.5 font-body text-sm outline-none focus:border-gov-600 focus:ring-4 focus:ring-gov-100" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-heading text-xs font-semibold tracking-wide text-gov-700 uppercase">Designation *</span>
                  <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g., PGT, Principal" className="w-full rounded-xl border border-gov-200 px-4 py-2.5 font-body text-sm outline-none focus:border-gov-600 focus:ring-4 focus:ring-gov-100" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-heading text-xs font-semibold tracking-wide text-gov-700 uppercase">Subject *</span>
                  <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g., Mathematics" className="w-full rounded-xl border border-gov-200 px-4 py-2.5 font-body text-sm outline-none focus:border-gov-600 focus:ring-4 focus:ring-gov-100" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block font-heading text-xs font-semibold tracking-wide text-gov-700 uppercase">Qualification</span>
                  <input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} placeholder="e.g., M.Sc., B.Ed." className="w-full rounded-xl border border-gov-200 px-4 py-2.5 font-body text-sm outline-none focus:border-gov-600 focus:ring-4 focus:ring-gov-100" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-heading text-xs font-semibold tracking-wide text-gov-700 uppercase">Display Order</span>
                  <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })} className="w-full rounded-xl border border-gov-200 px-4 py-2.5 font-body text-sm outline-none focus:border-gov-600 focus:ring-4 focus:ring-gov-100" />
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gov-100 p-6">
              <button type="button" onClick={close} className="rounded-xl border border-gov-200 px-5 py-2.5 font-heading text-sm font-semibold text-gov-700 hover:bg-gov-50">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gov-700 px-5 py-2.5 font-heading text-sm font-semibold text-white transition hover:bg-gov-800 disabled:opacity-60">
                {saving ? "Saving…" : <><Save className="h-4 w-4" /> {editing ? "Update" : "Add Teacher"}</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
