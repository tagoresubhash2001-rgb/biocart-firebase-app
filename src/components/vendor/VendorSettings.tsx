import React, { useState, useEffect } from 'react';
import { useVendor } from '../../hooks/useVendor';
import { db } from '../../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useApp } from '../../context/AppContext';
import { Save, RefreshCw, Upload, Image as ImageIcon } from 'lucide-react';
import { StorageService } from '../../services/StorageService';

export const VendorSettings: React.FC = () => {
  const { vendorId, loading: vendorLoading } = useVendor();
  const { addToast } = useApp();
  
  const [vendorData, setVendorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const fetchVendor = async () => {
    if (!vendorId) return;
    try {
      const docRef = doc(db, 'vendors', vendorId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setVendorData(snap.data());
      }
    } catch (err) {
      console.error('Error fetching vendor settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vendorLoading) return;
    if (!vendorId) {
      setLoading(false);
      return;
    }
    fetchVendor();
  }, [vendorId, vendorLoading]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId || !vendorData) return;
    try {
      setSaving(true);
      await updateDoc(doc(db, 'vendors', vendorId), {
        ...vendorData,
        updatedAt: new Date().toISOString()
      });
      addToast('Vendor settings saved successfully!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to save settings', 'warning');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !vendorId) return;
    try {
      setUploadingLogo(true);
      const url = await StorageService.uploadImage(file, `vendors/${vendorId}/logo`);
      setVendorData((prev: any) => ({ ...prev, logo: url }));
      addToast('Logo uploaded!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Upload failed', 'warning');
    } finally {
      setUploadingLogo(false);
    }
  };

  if (vendorLoading || loading) return <div className="p-8 text-center">Loading settings...</div>;
  if (!vendorId) {
    return (
      <div className="p-8 text-center bg-white  rounded-2xl border border-rose-100  text-rose-600  mt-6 shadow-sm">
        <h3 className="text-xl font-bold mb-2">Vendor profile not found</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-900 ">Vendor Settings</h2>

      <form onSubmit={handleSave} className="bg-white  p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200  space-y-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="w-32 h-32 rounded-xl bg-slate-100  border-2 border-dashed border-slate-300  flex items-center justify-center relative overflow-hidden flex-shrink-0">
            {vendorData?.logo ? (
              <img src={vendorData.logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-8 h-8 text-slate-400" />
            )}
            <label className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
              <Upload className="w-6 h-6 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingLogo} />
            </label>
            {uploadingLogo && (
              <div className="absolute inset-0 bg-white/80  flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-grow space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Business Name *</label>
                <input required type="text" value={vendorData?.businessName || ''} onChange={e => setVendorData({...vendorData, businessName: e.target.value})} className="w-full p-2.5 bg-slate-50  border border-slate-200  rounded-xl focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Owner Name *</label>
                <input required type="text" value={vendorData?.ownerName || ''} onChange={e => setVendorData({...vendorData, ownerName: e.target.value})} className="w-full p-2.5 bg-slate-50  border border-slate-200  rounded-xl focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Email *</label>
                <input required type="email" value={vendorData?.email || ''} onChange={e => setVendorData({...vendorData, email: e.target.value})} className="w-full p-2.5 bg-slate-50  border border-slate-200  rounded-xl focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Phone *</label>
                <input required type="text" value={vendorData?.phone || ''} onChange={e => setVendorData({...vendorData, phone: e.target.value})} className="w-full p-2.5 bg-slate-50  border border-slate-200  rounded-xl focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">GST Number</label>
                <input type="text" value={vendorData?.gstNumber || ''} onChange={e => setVendorData({...vendorData, gstNumber: e.target.value})} className="w-full p-2.5 bg-slate-50  border border-slate-200  rounded-xl focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-100 ">
          <h3 className="font-semibold text-slate-800 ">Business Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Business Address</label>
              <textarea rows={2} value={vendorData?.address || ''} onChange={e => setVendorData({...vendorData, address: e.target.value})} className="w-full p-2.5 bg-slate-50  border border-slate-200  rounded-xl focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">City</label>
              <input type="text" value={vendorData?.city || ''} onChange={e => setVendorData({...vendorData, city: e.target.value})} className="w-full p-2.5 bg-slate-50  border border-slate-200  rounded-xl focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">State</label>
              <input type="text" value={vendorData?.state || ''} onChange={e => setVendorData({...vendorData, state: e.target.value})} className="w-full p-2.5 bg-slate-50  border border-slate-200  rounded-xl focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Pincode</label>
              <input type="text" value={vendorData?.pincode || ''} onChange={e => setVendorData({...vendorData, pincode: e.target.value})} className="w-full p-2.5 bg-slate-50  border border-slate-200  rounded-xl focus:outline-none focus:border-emerald-500" />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-100 ">
          <label className="block text-xs font-semibold text-slate-500 mb-1">Business Description</label>
          <textarea rows={4} value={vendorData?.description || ''} onChange={e => setVendorData({...vendorData, description: e.target.value})} className="w-full p-2.5 bg-slate-50  border border-slate-200  rounded-xl focus:outline-none focus:border-emerald-500" />
        </div>

        <div className="flex gap-4 pt-4 justify-end">
          <button type="button" onClick={fetchVendor} disabled={saving} className="px-6 py-2.5 rounded-xl border border-slate-200  font-bold text-sm hover:bg-slate-50 :bg-white/5 transition-colors">
            Reset
          </button>
          <button type="submit" disabled={saving || uploadingLogo} className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};
