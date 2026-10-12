import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../../config/firebase';
import { AdminService } from '../../services/AdminService';
import { VendorItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../context/AppContext';
import {
  Store,
  Plus,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Edit3,
  X,
  Percent,
  Sparkles,
  KeyRound,
  Copy
} from 'lucide-react';

const functions = getFunctions(app, 'asia-southeast1');
const createVendorAccountCF = httpsCallable(functions, 'createVendorAccount');

export const AdminVendors: React.FC = () => {
  const { userProfile } = useAuth();
  const { addToast } = useApp();

  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [editingVendor, setEditingVendor] = useState<Partial<VendorItem> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newVendorCreds, setNewVendorCreds] = useState<{ email: string; tempPassword: string } | null>(null);

  useEffect(() => {
    return AdminService.subscribeToVendors((list) => setVendors(list));
  }, []);

  const actor = {
    id: userProfile?.uid || 'admin',
    email: userProfile?.email || 'admin@biocart.com'
  };

  const handleOpenCreateModal = () => {
    setEditingVendor({
      storeName: '',
      ownerName: '',
      email: '',
      phone: '',
      logo: '',
      status: 'active',
      commission: { baseRateBps: 1000 }
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (vendor: VendorItem) => {
    setEditingVendor({ ...vendor });
    setIsModalOpen(true);
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor || !editingVendor.storeName) return;
    setIsSaving(true);
    try {
      if (!editingVendor.id) {
        // NEW vendor: create a real, login-linked account via the
        // createVendorAccount Cloud Function. Its Firestore doc id will be
        // the new Firebase Auth uid, which is what lets that vendor's own
        // login see only their own data (see firestore.rules isVendorOwner).
        if (!editingVendor.email) {
          addToast('Email is required to create a vendor login', 'warning');
          setIsSaving(false);
          return;
        }
        const result: any = await createVendorAccountCF({
          businessName: editingVendor.storeName,
          ownerName: editingVendor.ownerName || '',
          email: editingVendor.email,
          phone: editingVendor.phone || '',
          commissionRate: editingVendor.commission?.baseRateBps ? editingVendor.commission.baseRateBps / 100 : 10
        });
        setNewVendorCreds({ email: result.data.email, tempPassword: result.data.tempPassword });
        addToast(`Vendor "${editingVendor.storeName}" created with a login`, 'success');
      } else {
        // EDIT existing vendor: contact/commission fields only — this does
        // NOT touch the login or the document id.
        await AdminService.saveVendor(editingVendor, actor);
        addToast(`Vendor "${editingVendor.storeName}" updated`, 'success');
      }
      setIsModalOpen(false);
      setEditingVendor(null);
    } catch (err: any) {
      addToast(err?.message || 'Failed to save vendor', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: VendorItem['status']) => {
    try {
      await AdminService.updateVendorStatus(id, status, actor);
      addToast(`Vendor status updated to ${status}`, 'success');
    } catch (err) {
      addToast('Failed to update vendor status', 'warning');
    }
  };

  const copyCreds = () => {
    if (!newVendorCreds) return;
    navigator.clipboard.writeText(`Email: ${newVendorCreds.email}\nTemp Password: ${newVendorCreds.tempPassword}`);
    addToast('Credentials copied to clipboard', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Store className="w-5 h-5 text-amber-400" />
            Vendor Marketplace Management
          </h1>
          <p className="text-xs text-[#777777]">Approve vendor accounts, manage platform commissions, and assign multi-vendor product catalogs.</p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-900 text-xs font-semibold rounded-xl shadow-lg flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Vendor Partner
        </button>
      </div>

      {/* New vendor credentials banner — shown once, right after creation */}
      {newVendorCreds && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <KeyRound className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-grow text-xs">
            <p className="font-bold text-amber-800 mb-1">Save these vendor login credentials now — the temp password won't be shown again.</p>
            <p className="text-amber-700">Email: <span className="font-mono">{newVendorCreds.email}</span></p>
            <p className="text-amber-700">Temp Password: <span className="font-mono">{newVendorCreds.tempPassword}</span></p>
          </div>
          <button onClick={copyCreds} className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg" title="Copy">
            <Copy className="w-4 h-4" />
          </button>
          <button onClick={() => setNewVendorCreds(null)} className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg" title="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vendors.map((v) => (
          <div key={v.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-slate-300 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {v.logo ? (
                  <img src={v.logo} alt={v.storeName} className="w-12 h-12 rounded-xl object-cover bg-slate-800 border border-slate-200" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-400 flex items-center justify-center font-bold text-sm">
                    {v.storeName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{v.storeName}</h3>
                  <p className="text-[11px] text-[#777777]">Owner: {v.ownerName}</p>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                v.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                v.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {v.status}
              </span>
            </div>

            <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p><strong className="text-[#777777]">Email:</strong> {v.email}</p>
              <p><strong className="text-[#777777]">Phone:</strong> {v.phone}</p>
              <p><strong className="text-[#777777]">Platform Commission:</strong> <span className="text-emerald-400 font-bold">{(v.commission?.baseRateBps || 0) / 100}%</span></p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <div className="flex items-center gap-1.5">
                {v.status === 'pending' && (
                  <button
                    onClick={() => handleStatusChange(v.id, 'active')}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-900 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                )}
                {v.status === 'active' ? (
                  <button
                    onClick={() => handleStatusChange(v.id, 'suspended')}
                    className="px-3 py-1 bg-rose-950/60 text-rose-300 hover:bg-rose-900/60 rounded-lg text-xs flex items-center gap-1"
                  >
                    <AlertOctagon className="w-3.5 h-3.5" /> Suspend
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusChange(v.id, 'active')}
                    className="px-3 py-1 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 rounded-lg text-xs flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                  </button>
                )}
              </div>

              <button
                onClick={() => handleOpenEditModal(v)}
                className="p-1.5 text-[#777777] hover:text-emerald-400 rounded-lg"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Add Vendor Modal */}
      {isModalOpen && editingVendor && (
        <div className="fixed inset-0 z-50 bg-white backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-900">
                {editingVendor.id ? 'Edit Vendor Details' : 'Onboard New Vendor'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#777777] hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!editingVendor.id && (
              <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">
                This creates a real login for the vendor. They'll be able to sign in at <span className="font-mono">/#vendor</span> using the email below.
              </p>
            )}

            <form onSubmit={handleSaveVendor} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#777777] mb-1">Store / Business Name *</label>
                <input
                  type="text"
                  required
                  value={editingVendor.storeName || ''}
                  onChange={(e) => setEditingVendor({ ...editingVendor, storeName: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[#777777] mb-1">Owner Name *</label>
                <input
                  type="text"
                  required
                  value={editingVendor.ownerName || ''}
                  onChange={(e) => setEditingVendor({ ...editingVendor, ownerName: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#777777] mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    disabled={!!editingVendor.id}
                    value={editingVendor.email || ''}
                    onChange={(e) => setEditingVendor({ ...editingVendor, email: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[#777777] mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingVendor.phone || ''}
                    onChange={(e) => setEditingVendor({ ...editingVendor, phone: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#777777] mb-1">Platform Commission Rate (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={(editingVendor.commission?.baseRateBps || 1000) / 100}
                    onChange={(e) => setEditingVendor({ ...editingVendor, commission: { baseRateBps: Number(e.target.value) * 100 } })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold text-emerald-400"
                  />
                  <Percent className="w-4 h-4 text-[#777777] absolute right-3 top-3" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-600 rounded-xl">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-900 font-semibold rounded-xl disabled:opacity-60">
                  {isSaving ? 'Saving...' : 'Save Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
