import { useState } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Pin, PinOff, Upload, FileText, X, Save } from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { createNotice, updateNotice, deleteNotice, togglePinNotice, uploadFile, deleteFile, getFileViewUrl } from "../lib/appwrite.js";

const empty = { title: "", description: "", date: new Date().toISOString().slice(0,10), pdf_url: "", is_pinned: false };

export default function NoticesManager() {
  const { notices, refreshData } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const open = (n) => {
    if (n) {
      setEditing(n.id);
      setForm({ title: n.title, description: n.description, date: n.date, pdf_url: n.pdf_url, is_pinned: !!n.is_pinned });
    } else {
      setEditing(null);
      setForm(empty);
    }
    setModalOpen(true);
  };
  const close = () => { setModalOpen(false); setEditing(null); setForm(empty); };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Please fill in title and description."); return;
    }
    setSaving(true);
    try {
      const data = { ...form };
      if (editing) await updateNotice(editing, data);
      else await createNotice(data);
      toast.success(editing ? "Notice updated." : "Notice published.");
      await refreshData();
      close();
    } catch (e) {
      console.error(e); toast.error(e.message || "Failed to save notice.");
    } finally { setSaving(false); }
  };

  const onPinToggle = async (n) => {
    try { await togglePinNotice(n.id, !n.is_pinned); await refreshData(); toast.success(n.is_pinned ? "Unpinned." : "Pinned."); }
    catch (e) { toast.error(e.message || "Failed."); }
  };

  const onDelete = async (n) => {
    if (!confirm("Delete this notice permanently?")) return;
    try {
      await deleteNotice(n.id);
      if (n.pdf_url) await deleteFile(n.pdf_url);
      await refreshData();
      toast.success("Notice deleted.");
    } catch (e) { toast.error(e.message || "Delete failed."); }
  };

  const onPdfUpload = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file."); return;
    }
    if (f.size > 20 * 1024 * 1024) { toast.error("PDF too large (max 20 MB)."); return; }
    setUploading(true);
    try {
      // Delete old PDF if replacing
      if (form.pdf_url) { try { await deleteFile(form.pdf_url); } catch {} }
      const id = await uploadFile(f);
      setForm((s) => ({ ...s, pdf_url: id }));
      toast.success("PDF uploaded.");
    } catch (e) { toast.error(e.message || "Upload failed."); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const removePdf = async () => {
    if (form.pdf_url) { try { await deleteFile(form.pdf_url); } catch {} }
    setForm((s) => ({ ...s, pdf_url: "" }));
  };

  const sorted = [...notices].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || (b.date > a.date ? 1 : -1));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-gov-900">Manage Notices</h2>
          <p className="font-body text-sm text-gov-600">Publish, pin, edit and delete school notices. Pinned notices appear first.</p>
        </div>
        <button onClick={() => open(null)} className="inline-flex items-center gap-2 rounded-xl bg-gov-700 px-4 py-2.5 font-heading text-sm font-semibold text-white shadow-md transition hover:bg-gov-800">
          <Plus className="h-4 w-4" /> New Notice
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gov-100 bg-white shadow-card">
        <table className="w-full">
          <thead className="bg-gov-50 text-left">
            <tr>
              <th className="px-4 py-3 font-heading text-xs font-bold tracking-wider text-gov-700 uppercase">Title</th>
              <th className="hidden px-4 py-3 font-heading text-xs font-bold tracking-wider text-gov-700 uppercase md:table-cell">Date</th>
              <th className="hidden px-4 py-3 font-heading text-xs font-bold tracking-wider text-gov-700 uppercase md:table-cell">PDF</th>
              <th className="px-4 py-3 font-heading text-xs font-bold tracking-wider text-gov-700 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gov-100">
            {sorted.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center font-body text-sm text-gov-500">No notices yet. Click "New Notice" to create one.</td></tr>
            )}
            {sorted.map((n) => (
              <tr key={n.id} className="transition hover:bg-gov-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {n.is_pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-saffron" />}
                    <p className="font-heading text-sm font-semibold text-gov-900">{n.title}</p>
                  </div>
                  <p className="mt-0.5 line-clamp-1 font-body text-xs text-gov-600">{n.description}</p>
                  <p className="mt-0.5 font-body text-xs text-gov-500 md:hidden">{n.date}</p>
                </td>
                <td className="hidden px-4 py-3 font-body text-sm text-gov-700 md:table-cell">{n.date}</td>
                <td className="hidden px-4 py-3 md:table-cell">
                  {n.pdf_url ? (
                    <a href={n.pdfPreview} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md bg-gov-100 px-2 py-1 font-heading text-xs font-semibold text-gov-700 hover:bg-gov-200">
                      <FileText className="h-3 w-3" /> View
                    </a>
                  ) : <span className="text-gov-400">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onPinToggle(n)} title={n.is_pinned ? "Unpin" : "Pin"} className="rounded-lg p-2 text-gov-600 hover:bg-gov-100">
                      {n.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    </button>
                    <button onClick={() => open(n)} title="Edit" className="rounded-lg p-2 text-gov-600 hover:bg-gov-100">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => onDelete(n)} title="Delete" className="rounded-lg p-2 text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" onClick={close}>
          <form onSubmit={onSubmit} onClick={(e) => e.stopPropagation()} className="my-10 w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gov-100 p-6">
              <h3 className="font-display text-xl font-bold text-gov-900">{editing ? "Edit Notice" : "New Notice"}</h3>
              <button type="button" onClick={close} className="rounded-lg p-2 text-gov-500 hover:bg-gov-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-6">
              <label className="block">
                <span className="mb-1.5 block font-heading text-xs font-semibold tracking-wide text-gov-700 uppercase">Title *</span>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-xl border border-gov-200 px-4 py-2.5 font-body text-sm outline-none focus:border-gov-600 focus:ring-4 focus:ring-gov-100" placeholder="Notice title" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block font-heading text-xs font-semibold tracking-wide text-gov-700 uppercase">Date *</span>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-xl border border-gov-200 px-4 py-2.5 font-body text-sm outline-none focus:border-gov-600 focus:ring-4 focus:ring-gov-100" />
                </label>
                <label className="flex items-end gap-2">
                  <input type="checkbox" id="pin" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} className="h-4 w-4 rounded border-gov-300 text-gov-700 focus:ring-gov-500" />
                  <label htmlFor="pin" className="font-heading text-sm font-semibold text-gov-800">Pin this notice to top</label>
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block font-heading text-xs font-semibold tracking-wide text-gov-700 uppercase">Description *</span>
                <textarea rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full resize-none rounded-xl border border-gov-200 px-4 py-2.5 font-body text-sm outline-none focus:border-gov-600 focus:ring-4 focus:ring-gov-100" placeholder="Notice content…" />
              </label>
              <div>
                <span className="mb-1.5 block font-heading text-xs font-semibold tracking-wide text-gov-700 uppercase">Attach PDF (optional)</span>
                {form.pdf_url ? (
                  <div className="flex items-center justify-between rounded-xl border border-gov-200 bg-gov-50 p-3">
                    <a href={getFileViewUrl(form.pdf_url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-heading text-sm font-semibold text-gov-700">
                      <FileText className="h-4 w-4" /> Attached PDF
                    </a>
                    <button type="button" onClick={removePdf} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gov-200 px-4 py-6 font-heading text-sm font-semibold text-gov-600 transition hover:border-gov-400 hover:bg-gov-50 ${uploading ? "opacity-60" : ""}`}>
                    <Upload className="h-5 w-5" /> {uploading ? "Uploading…" : "Click to upload PDF"}
                    <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={onPdfUpload} disabled={uploading} />
                  </label>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gov-100 p-6">
              <button type="button" onClick={close} className="rounded-xl border border-gov-200 px-5 py-2.5 font-heading text-sm font-semibold text-gov-700 hover:bg-gov-50">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gov-700 px-5 py-2.5 font-heading text-sm font-semibold text-white transition hover:bg-gov-800 disabled:opacity-60">
                {saving ? "Saving…" : <><Save className="h-4 w-4" /> {editing ? "Update" : "Publish"}</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
