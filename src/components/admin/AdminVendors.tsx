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
  Copy,
  PackagePlus,
  Eye
} from 'lucide-react';

import { VendorOnboardingModal } from './VendorOnboardingModal';
import { VendorCatalogueAssignmentModal } from './VendorCatalogueAssignmentModal';
import { VendorDetailsDrawer } from './VendorDetailsDrawer';
import { BioCartLoading } from '../ui/BioCartLoading';

const functions = getFunctions(app, 'asia-southeast1');
const createVendorAccountCF = httpsCallable(functions, 'createVendorAccount');
const updateVendorEmailCF = httpsCallable(functions, 'updateVendorEmail');
const reconcileVendorAccountCF = httpsCallable(functions, 'reconcileVendorAccount');
const updateVendorCommercialsCF = httpsCallable(functions, 'updateVendorCommercials');

export const AdminVendors: React.FC = () => {
  const { userProfile } = useAuth();
  const { addToast } = useApp();

  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [editingVendor, setEditingVendor] = useState<Partial<VendorItem> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newVendorCreds, setNewVendorCreds] = useState<{ email: string; tempPassword: string } | null>(null);

  // Modal & Drawer State
  const [assignmentVendor, setAssignmentVendor] = useState<VendorItem | null>(null);
  const [detailVendor, setDetailVendor] = useState<VendorItem | null>(null);

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

  const handleSaveVendorModal = async (vendorData: Partial<VendorItem>) => {
    if (!vendorData || !vendorData.storeName) return;
    setIsSaving(true);
    try {
      if (!editingVendor?.id) {
        // NEW vendor: create a real, login-linked account via Cloud Function
        if (!vendorData.email) {
          addToast('Email is required to create a vendor login', 'warning');
          setIsSaving(false);
          return;
        }
        const result: any = await createVendorAccountCF({
          businessName: vendorData.storeName,
          ownerName: vendorData.ownerName || '',
          email: vendorData.email,
          phone: vendorData.phone || '',
          commissionRate: vendorData.commission?.baseRateBps ? vendorData.commission.baseRateBps / 100 : 10,
          description: vendorData.description || '',
          website: vendorData.website || '',
          legal: vendorData.legal || {},
          addresses: vendorData.addresses || {},
          settlement: vendorData.settlement || {}
        });
        setNewVendorCreds({ email: result.data.email, tempPassword: result.data.tempPassword });
        addToast(`Vendor "${vendorData.storeName}" created with login credentials`, 'success');
      } else {
        // EDIT existing vendor: contact/commission/address/legal fields
        const oldEmail = (editingVendor.email || '').trim().toLowerCase();
        const newEmail = (vendorData.email || '').trim().toLowerCase();

        // If email was modified, call the secure updateVendorEmail backend callable
        if (newEmail && newEmail !== oldEmail) {
          await updateVendorEmailCF({
            vendorId: editingVendor.id,
            newEmail
          });
        }

        // If commercials (commission or settlement) were updated, call backend callable for ledger authority
        const newBps = vendorData.commission?.baseRateBps;
        const oldBps = editingVendor.commission?.baseRateBps;
        if (newBps !== undefined && newBps !== oldBps) {
          await updateVendorCommercialsCF({
            vendorId: editingVendor.id,
            baseRateBps: newBps,
            settlement: vendorData.settlement
          });
        }

        await AdminService.saveVendor({ ...editingVendor, ...vendorData, email: newEmail }, actor);
        addToast(`Vendor "${vendorData.storeName}" updated successfully`, 'success');
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

  const [reconcilingId, setReconcilingId] = useState<string | null>(null);

  const handleReconcileVendor = async (v: VendorItem) => {
    if (!v.email) {
      addToast('Cannot reconcile vendor: Missing email address. Edit vendor to add an email first.', 'warning');
      return;
    }
    setReconcilingId(v.id);
    try {
      const res: any = await reconcileVendorAccountCF({
        vendorId: v.id,
        targetEmail: v.email,
        createAuthIfMissing: true
      });
      if (res?.data?.tempPassword) {
        setNewVendorCreds({
          email: res.data.email,
          tempPassword: res.data.tempPassword
        });
        addToast(`Vendor login created & linked! Auth account provisioned with temporary password.`, 'success');
      } else {
        addToast(`Vendor "${v.storeName}" successfully linked to existing account ${v.email}`, 'success');
      }
    } catch (err: any) {
      addToast(err?.message || 'Failed to reconcile vendor account', 'warning');
    } finally {
      setReconcilingId(null);
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

              <div className="flex flex-col items-end gap-1.5">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  v.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  v.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {v.status}
                </span>
                {(!v.ownerUid || v.ownerUid === 'system' || v.ownerUid === 'biocart') ? (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1" title="Vendor document has no linked Firebase Auth UID">
                    ⚠️ Unlinked Auth
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1" title={`Linked to UID: ${v.ownerUid}`}>
                    <CheckCircle2 className="w-2.5 h-2.5" /> Auth Linked
                  </span>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p><strong className="text-[#777777]">Email:</strong> {v.email || <span className="text-rose-500 italic">No email set</span>}</p>
              <p><strong className="text-[#777777]">Phone:</strong> {v.phone || '—'}</p>
              <p><strong className="text-[#777777]">Platform Commission:</strong> <span className="text-emerald-400 font-bold">{(v.commission?.baseRateBps || 0) / 100}%</span></p>
              {v.ownerUid && v.ownerUid !== 'system' && (
                <p className="text-[10px] text-slate-400 font-mono truncate"><strong className="text-slate-500 font-sans">Auth UID:</strong> {v.ownerUid}</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5 flex-wrap">
                {(!v.ownerUid || v.ownerUid === 'system' || v.ownerUid === 'biocart') && (
                  <button
                    onClick={() => handleReconcileVendor(v)}
                    disabled={reconcilingId === v.id}
                    className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                    title="Provision/link Firebase Auth login account for this vendor"
                  >
                    <KeyRound className="w-3.5 h-3.5" /> {reconcilingId === v.id ? 'Linking...' : 'Reconcile Login'}
                  </button>
                )}

                {v.status === 'pending' && (
                  <button
                    onClick={() => handleStatusChange(v.id, 'active')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                )}
                {v.status === 'active' ? (
                  <button
                    onClick={() => handleStatusChange(v.id, 'suspended')}
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-600" /> Suspend
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusChange(v.id, 'active')}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Reactivate
                  </button>
                )}

                <button
                  onClick={() => setAssignmentVendor(v)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Assign official catalogue products to this vendor"
                >
                  <PackagePlus className="w-3.5 h-3.5 text-emerald-600" /> Products
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setDetailVendor(v)}
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="View complete vendor credentials"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleOpenEditModal(v)}
                  className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                  title="Edit vendor profile"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comprehensive Multi-Step Vendor Onboarding Modal */}
      <VendorOnboardingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingVendor(null);
        }}
        vendor={editingVendor}
        onSave={handleSaveVendorModal}
        isSaving={isSaving}
      />

      {/* Catalogue Products Assignment Modal */}
      {assignmentVendor && (
        <VendorCatalogueAssignmentModal
          isOpen={!!assignmentVendor}
          onClose={() => setAssignmentVendor(null)}
          vendor={assignmentVendor}
        />
      )}

      {/* Detailed Credentials Drawer */}
      {detailVendor && (
        <VendorDetailsDrawer
          isOpen={!!detailVendor}
          onClose={() => setDetailVendor(null)}
          vendor={detailVendor}
          onEdit={() => {
            const v = detailVendor;
            setDetailVendor(null);
            handleOpenEditModal(v);
          }}
        />
      )}
    </div>
  );
};
