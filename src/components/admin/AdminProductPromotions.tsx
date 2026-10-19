import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Plus, X, Edit2, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AdminProductPromotions: React.FC = () => {
  const { addToast } = useApp();
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [productId, setProductId] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'product_promotions'));
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fetched.sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));
      setPromotions(fetched);
    } catch (e) {
      console.error(e);
      addToast('Error loading product promotions', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setProductId('');
    setTitle('');
    setSubtitle('');
    setCtaLabel('');
    setDisplayOrder(0);
    setIsActive(true);
  };

  const handleOpenModal = (r?: any) => {
    if (r) {
      setEditingId(r.id);
      setProductId(r.productId || '');
      setTitle(r.title || '');
      setSubtitle(r.subtitle || '');
      setCtaLabel(r.ctaLabel || '');
      setDisplayOrder(r.displayOrder || 0);
      setIsActive(r.active ?? true);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      addToast('Product ID is required', 'warning');
      return;
    }
    try {
      const id = editingId || `promo_${Date.now()}`;
      await setDoc(doc(db, 'product_promotions', id), {
        id,
        productId,
        title,
        subtitle,
        ctaLabel,
        displayOrder: Number(displayOrder),
        active: isActive,
        updatedAt: serverTimestamp(),
        ...(editingId ? {} : { createdAt: serverTimestamp() })
      }, { merge: true });
      
      addToast('Promotion saved successfully', 'success');
      setIsModalOpen(false);
      loadPromotions();
    } catch (e) {
      console.error(e);
      addToast('Error saving promotion', 'warning');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this promotion?')) return;
    try {
      await deleteDoc(doc(db, 'product_promotions', id));
      addToast('Promotion deleted', 'success');
      loadPromotions();
    } catch (e) {
      addToast('Error deleting', 'warning');
    }
  };

  if (loading) return <div className="p-8">Loading promotions...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Product Promotions</h2>
        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-nature-700 text-white px-4 py-2 rounded-xl text-sm font-semibold">
          <Plus className="w-4 h-4" /> Add Promotion
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-6 py-4 font-semibold">Title</th>
              <th className="px-6 py-4 font-semibold">Product ID</th>
              <th className="px-6 py-4 font-semibold">Order</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {promotions.map(r => (
              <tr key={r.id}>
                <td className="px-6 py-4 font-medium text-slate-800">{r.title}</td>
                <td className="px-6 py-4 text-blue-600">{r.productId}</td>
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
            {promotions.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No promotions found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6">
            <div className="flex justify-between mb-4">
              <h3 className="font-bold text-lg">{editingId ? 'Edit Promotion' : 'New Promotion'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Target Product ID</label>
                <input type="text" value={productId} onChange={e => setProductId(e.target.value)} required className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Ad Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Ad Subtitle</label>
                <input type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)} required className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">CTA Label</label>
                <input type="text" value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
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
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition-all cursor-pointer">Save Promotion</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
