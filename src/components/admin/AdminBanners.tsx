import React, { useState, useEffect } from 'react';
import { AdminService } from '../../services/AdminService';
import { StorageService } from '../../services/StorageService';
import { BannerItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../context/AppContext';
import { Image as ImageIcon, 
  Plus, 
  Edit3, 
  Trash2, 
  Upload, 
  X, 
  Eye, 
  EyeOff, 
  ExternalLink,
  Sparkles
 } from 'lucide-react';
import { ImageUploader } from './ImageUploader';

export const AdminBanners: React.FC = () => {
  const { userProfile } = useAuth();
  const { addToast } = useApp();

  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [editingBanner, setEditingBanner] = useState<Partial<BannerItem> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    return AdminService.subscribeToBanners((list) => setBanners(list));
  }, []);

  const actor = {
    id: userProfile?.uid || 'admin',
    email: userProfile?.email || 'admin@biocart.com'
  };

  const handleOpenCreateModal = () => {
    setEditingBanner({
      title: '',
      subtitle: '',
      imageUrl: '',
      linkUrl: '#shop',
      sequence: banners.length + 1,
      bannerType: 'hero',
      active: true,
      promotionalLabel: 'SPECIAL OFFER',
      ribbonText: 'PROMO',
      ctaText: 'Explore Collection'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (banner: BannerItem) => {
    setEditingBanner({ ...banner });
    setIsModalOpen(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner || !editingBanner.title) return;
    try {
      await AdminService.saveBanner(editingBanner, actor);
      addToast(`Banner "${editingBanner.title}" saved`, 'success');
      setIsModalOpen(false);
      setEditingBanner(null);
    } catch (err: any) {
      addToast('Failed to save banner', 'warning');
    }
  };

  const handleDeleteBanner = async (id: string) => {
    try {
      await AdminService.deleteBanner(id, actor);
      addToast('Banner removed', 'info');
      setDeleteConfirmId(null);
    } catch (err) {
      addToast('Failed to delete banner', 'warning');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const url = await StorageService.uploadImage(file, 'banners');
      setEditingBanner((prev) => ({ ...prev, imageUrl: url }));
      addToast('Banner image uploaded to Firebase Storage', 'success');
    } catch (err) {
      addToast('Image upload failed', 'warning');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-emerald-400" />
            Homepage Banner & Hero Management
          </h1>
          <p className="text-xs text-[#777777]">Control customer homepage hero carousel slides, promotional banners & CTA buttons live.</p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-900 text-xs font-semibold rounded-xl shadow-lg flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Hero Banner
        </button>
      </div>

      <div className="space-y-4">
        {banners.map((banner) => (
          <div key={banner.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden p-5 flex flex-col md:flex-row items-center gap-6 hover:border-slate-300 transition-all">
            <div className="w-full md:w-64 h-36 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0 border border-slate-200 relative">
              {banner.imageUrl ? (
                <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs font-mono">No Image</div>
              )}
              <span className="absolute top-2 left-2 px-2 py-0.5 bg-white text-emerald-400 font-mono text-[9px] rounded uppercase">
                Sequence #{banner.sequence}
              </span>
            </div>

            <div className="flex-grow space-y-2 text-left w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded uppercase">
                    {banner.promotionalLabel || 'PROMO'}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base">{banner.title}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleOpenEditModal(banner)} className="p-1.5 text-[#777777] hover:text-emerald-400 rounded-lg">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteConfirmId(banner.id)} className="p-1.5 text-[#777777] hover:text-rose-400 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-600">{banner.subtitle}</p>

              <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#777777] pt-2 border-t border-slate-200">
                <span className="flex items-center gap-1 text-emerald-400">
                  <ExternalLink className="w-3.5 h-3.5" /> CTA: {banner.ctaText} → {banner.linkUrl}
                </span>
                <span>Type: <strong className="text-slate-700 capitalize">{banner.bannerType}</strong></span>
                <span>
                  Status: {banner.active !== false ? (
                    <strong className="text-emerald-400">Active</strong>
                  ) : (
                    <strong className="text-[#777777]">Disabled</strong>
                  )}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-white backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl max-w-sm w-full space-y-4">
            <h3 className="text-base font-bold text-slate-900">Delete Banner?</h3>
            <p className="text-xs text-[#777777]">This banner will be removed from customer homepage carousels immediately.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1.5 bg-slate-800 text-slate-600 text-xs rounded-lg">
                Cancel
              </button>
              <button onClick={() => handleDeleteBanner(deleteConfirmId)} className="px-3 py-1.5 bg-rose-600 text-slate-900 text-xs rounded-lg font-semibold">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && editingBanner && (
        <div className="fixed inset-0 z-50 bg-white backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-900">
                {editingBanner.id ? 'Edit Banner' : 'Create New Hero Banner'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#777777] hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#777777] mb-1">Banner Title *</label>
                <input
                  type="text"
                  required
                  value={editingBanner.title || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[#777777] mb-1">Subtitle</label>
                <input
                  type="text"
                  value={editingBanner.subtitle || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[#777777] mb-1">Banner Image URL or Upload *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={editingBanner.imageUrl || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, imageUrl: e.target.value })}
                    className="flex-grow p-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono text-[11px]"
                  />
                  <label className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-900 rounded-xl cursor-pointer flex items-center gap-1 font-medium text-[11px]">
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#777777] mb-1">CTA Button Text</label>
                  <input
                    type="text"
                    value={editingBanner.ctaText || 'Explore Now'}
                    onChange={(e) => setEditingBanner({ ...editingBanner, ctaText: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[#777777] mb-1">CTA Link Hash / URL</label>
                  <input
                    type="text"
                    value={editingBanner.linkUrl || '#shop'}
                    onChange={(e) => setEditingBanner({ ...editingBanner, linkUrl: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#777777] mb-1">Promotional Label</label>
                  <input
                    type="text"
                    value={editingBanner.promotionalLabel || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, promotionalLabel: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[#777777] mb-1">Sequence #</label>
                  <input
                    type="number"
                    value={editingBanner.sequence || 1}
                    onChange={(e) => setEditingBanner({ ...editingBanner, sequence: Number(e.target.value) })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[#777777] mb-1">Banner Type</label>
                  <select
                    value={editingBanner.bannerType || 'hero'}
                    onChange={(e) => setEditingBanner({ ...editingBanner, bannerType: e.target.value as any })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900"
                  >
                    <option value="hero">Home Carousel</option>
                    <option value="home">Home Static</option>
                    <option value="about">About Header</option>
                    <option value="shop">Shop Header</option>
                    <option value="contact">Contact Header</option>
                    <option value="promo">Promo Section</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 py-2">
                <label className="flex items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    checked={editingBanner.active !== false}
                    onChange={(e) => setEditingBanner({ ...editingBanner, active: e.target.checked })}
                    className="rounded text-emerald-500"
                  />
                  Banner Active
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-600 rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-900 font-semibold rounded-xl">
                  Save Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
