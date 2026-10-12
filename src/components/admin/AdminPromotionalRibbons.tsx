import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Plus, X, Edit2, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AdminPromotionalRibbons: React.FC = () => {
  const { addToast } = useApp();
  const [ribbons, setRibbons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [text, setText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadRibbons();
  }, []);

  const loadRibbons = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'promotion_ribbons'));
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fetched.sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));
      setRibbons(fetched);
    } catch (e) {
      console.error(e);
      addToast('Error loading ribbons', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setText('');
    setLinkUrl('');
    setDisplayOrder(0);
    setIsActive(true);
  };

  const handleOpenModal = (r?: any) => {
    if (r) {
      setEditingId(r.id);
      setText(r.text || '');
      setLinkUrl(r.linkUrl || '');
      setDisplayOrder(r.displayOrder || 0);
      setIsActive(r.active ?? true);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = editingId || `ribbon_${Date.now()}`;
      await setDoc(doc(db, 'promotion_ribbons', id), {
        id,
        text,
        linkUrl,
        displayOrder: Number(displayOrder),
        active: isActive,
        updatedAt: serverTimestamp(),
        ...(editingId ? {} : { createdAt: serverTimestamp() })
      }, { merge: true });
      
      addToast('Ribbon saved successfully', 'success');
      setIsModalOpen(false);
      loadRibbons();
    } catch (e) {
      console.error(e);
      addToast('Error saving ribbon', 'warning');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ribbon?')) return;
    try {
      await deleteDoc(doc(db, 'promotion_ribbons', id));
      addToast('Ribbon deleted', 'success');
      loadRibbons();
    } catch (e) {
      addToast('Error deleting', 'warning');
    }
  };

  if (loading) return <div className="p-8">Loading ribbons...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Promotional Ribbons</h2>
        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-nature-700 text-white px-4 py-2 rounded-xl text-sm font-semibold">
          <Plus className="w-4 h-4" /> Add Ribbon
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-6 py-4 font-semibold">Text</th>
              <th className="px-6 py-4 font-semibold">Link</th>
              <th className="px-6 py-4 font-semibold">Order</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ribbons.map(r => (
              <tr key={r.id}>
                <td className="px-6 py-4 font-medium text-slate-800">{r.text}</td>
                <td className="px-6 py-4 text-blue-600">{r.linkUrl}</td>
                <td className="px-6 py-4">{r.displayOrder}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${r.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {r.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleOpenModal(r)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(r.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded ml-2"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {ribbons.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No ribbons found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6">
            <div className="flex justify-between mb-4">
              <h3 className="font-bold text-lg">{editingId ? 'Edit Ribbon' : 'New Ribbon'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Ribbon Text</label>
                <input type="text" value={text} onChange={e => setText(e.target.value)} required className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Link URL (optional)</label>
                <input type="text" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Display Order</label>
                  <input type="number" value={displayOrder} onChange={e => setDisplayOrder(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4" />
                    <span className="text-sm font-semibold">Active</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-nature-700 text-white rounded-lg">Save Ribbon</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
