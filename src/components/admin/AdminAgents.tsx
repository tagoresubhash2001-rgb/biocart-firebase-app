import React, { useState, useEffect } from 'react';
import { AgentEntity, AgentPermission } from '../../types';
import { AdminService } from '../../services/AdminService';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../context/AppContext';
import {
  UserCheck,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Shield,
  Edit3,
  X,
  Lock,
  Mail,
  Phone,
  User,
  Layers,
  KeyRound
} from 'lucide-react';
import { BioCartLoading } from '../ui/BioCartLoading';

const ALL_PERMISSIONS: { key: AgentPermission; label: string; desc: string }[] = [
  { key: 'view_vendors', label: 'View Vendors List', desc: 'Browse all active and pending marketplace vendors' },
  { key: 'create_vendor_draft', label: 'Create Vendor Onboarding Drafts', desc: 'Initiate vendor applications and save initial drafts' },
  { key: 'onboard_vendor', label: 'Onboard & Create Vendor Accounts', desc: 'Provision real vendor accounts with verified credentials' },
  { key: 'edit_vendor_details', label: 'Edit Vendor Business Details', desc: 'Update vendor contact and operational addresses' },
  { key: 'upload_vendor_documents', label: 'Upload Vendor Documents', desc: 'Attach business documents, certificates, and GST records' },
  { key: 'submit_vendor_review', label: 'Submit Vendors for Admin Approval', desc: 'Hand over completed vendor dossiers to Super Admins' },
  { key: 'view_assigned_products', label: 'View Assigned Vendor Products', desc: 'Audit products currently listed under assigned vendors' },
  { key: 'assign_catalogue_products', label: 'Assign Catalogue Products', desc: 'Link master catalogue items to approved vendor stores' }
];

export const AdminAgents: React.FC = () => {
  const { userProfile, firebaseUser } = useAuth();
  const { addToast } = useApp();

  const [agents, setAgents] = useState<AgentEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Partial<AgentEntity> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    return AdminService.subscribeToAgents((list) => {
      setAgents(list);
      setLoading(false);
    });
  }, []);

  const actor = {
    id: userProfile?.uid || firebaseUser?.uid || 'admin',
    email: userProfile?.email || firebaseUser?.email || 'admin@biocart.in'
  };

  const handleOpenCreateModal = () => {
    setEditingAgent({
      name: '',
      email: '',
      phone: '',
      status: 'active',
      permissions: ['view_vendors', 'create_vendor_draft', 'onboard_vendor'],
      internalNotes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (agent: AgentEntity) => {
    setEditingAgent({ ...agent });
    setIsModalOpen(true);
  };

  const handleTogglePermission = (perm: AgentPermission) => {
    if (!editingAgent) return;
    const current = editingAgent.permissions || [];
    const exists = current.includes(perm);
    const updated = exists ? current.filter((p) => p !== perm) : [...current, perm];
    setEditingAgent({ ...editingAgent, permissions: updated });
  };

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent?.name?.trim() || !editingAgent?.email?.trim()) {
      addToast('Agent name and login email are required', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      await AdminService.saveAgent(editingAgent, actor);
      addToast(
        editingAgent.id
          ? `Agent "${editingAgent.name}" updated successfully`
          : `Agent "${editingAgent.name}" created and assigned permissions`,
        'success'
      );
      setIsModalOpen(false);
      setEditingAgent(null);
    } catch (err: any) {
      addToast(err?.message || 'Failed to save agent profile', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (agent: AgentEntity) => {
    const nextStatus = agent.status === 'active' ? 'suspended' : 'active';
    try {
      await AdminService.updateAgentStatus(agent.id, nextStatus, actor);
      addToast(`Agent status changed to ${nextStatus}`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Failed to update agent status', 'warning');
    }
  };

  const filteredAgents = agents.filter((a) => {
    return (
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.phone && a.phone.includes(searchTerm))
    );
  });

  if (loading) {
    return <BioCartLoading message="Loading Authorized Agents..." subMessage="Fetching onboarder agents from Firestore" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            Agent Management & Delegation
          </h1>
          <p className="text-xs text-slate-500">
            Provision and control authorized marketplace agents who assist with vendor onboarding and catalogue assignments under least-privilege rules.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Authorized Agent
        </button>
      </div>

      {/* Security Notice Banner */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-950">
        <Shield className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Zero-Trust Agent Boundaries Active:</span> Agents cannot modify Store Settings, promote themselves, change financial commission parameters, or access unauthorized customer records. All agent actions are linked and recorded in System Audit Logs.
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search agents by name, email, or phone..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.map((agent) => (
          <div
            key={agent.id}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                    {agent.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{agent.name}</h3>
                    <p className="text-[11px] font-mono text-emerald-700">{agent.email}</p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    agent.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                >
                  {agent.status}
                </span>
              </div>

              {agent.phone && (
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{agent.phone}</span>
                </p>
              )}

              {/* Assigned Permissions Badges */}
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Assigned Privileges ({agent.permissions?.length || 0}):
                </p>
                <div className="flex flex-wrap gap-1">
                  {(agent.permissions || []).map((perm) => (
                    <span
                      key={perm}
                      className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-medium border border-slate-200"
                    >
                      {perm.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {(!agent.permissions || agent.permissions.length === 0) && (
                    <span className="text-slate-400 text-[11px] italic">No active permissions</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => handleToggleStatus(agent)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  agent.status === 'active'
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                {agent.status === 'active' ? (
                  <>
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-600" /> Suspend Agent
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Activate Agent
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleOpenEditModal(agent)}
                className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                title="Edit agent permissions"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {filteredAgents.length === 0 && (
          <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
            <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-sm text-slate-800">No agents registered yet</p>
            <p className="text-xs text-slate-400 mt-1">Click "Add Authorized Agent" to delegate vendor onboarding.</p>
          </div>
        )}
      </div>

      {/* Agent Modal */}
      {isModalOpen && editingAgent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editingAgent.id ? 'Edit Agent Privileges' : 'Provision Authorized Agent'}
                  </h2>
                  <p className="text-xs text-slate-500">Configure credentials and specific least-privilege permissions</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveAgent} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Agent Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editingAgent.name || ''}
                    onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Login Email Address *</label>
                  <input
                    type="email"
                    required
                    disabled={!!editingAgent.id}
                    value={editingAgent.email || ''}
                    onChange={(e) => setEditingAgent({ ...editingAgent, email: e.target.value })}
                    placeholder="agent@biocart.in"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 disabled:opacity-60 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={editingAgent.phone || ''}
                    onChange={(e) => setEditingAgent({ ...editingAgent, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Permissions Matrix */}
              <div className="pt-2 border-t border-slate-200">
                <p className="font-bold text-slate-900 mb-1">Granular Agent Permissions Matrix</p>
                <p className="text-[11px] text-slate-500 mb-3">Select the operational capabilities granted to this agent:</p>

                <div className="space-y-2 border border-slate-200 rounded-2xl p-3 bg-slate-50">
                  {ALL_PERMISSIONS.map((perm) => {
                    const isChecked = (editingAgent.permissions || []).includes(perm.key);
                    return (
                      <label
                        key={perm.key}
                        className="flex items-start gap-2.5 p-2 bg-white border border-slate-200 rounded-xl hover:border-slate-300 cursor-pointer select-none transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(perm.key)}
                          className="w-4 h-4 mt-0.5 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <div>
                          <p className="font-bold text-slate-900 text-xs">{perm.label}</p>
                          <p className="text-[11px] text-slate-500">{perm.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSaving ? 'Saving Agent...' : editingAgent.id ? 'Save Permissions' : 'Create Agent Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
