import React, { useState, useEffect } from 'react';
import { AdminService } from '../../services/AdminService';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../context/AppContext';
import { Users, Shield, AlertOctagon, CheckCircle2 } from 'lucide-react';

export const AdminCustomers: React.FC = () => {
  const { userProfile } = useAuth();
  const { addToast } = useApp();

  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    return AdminService.subscribeToUsers((list) => setUsers(list));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          Customer Accounts & Profiles
        </h1>
        <p className="text-xs text-[#777777]">View registered BioCart customer accounts, access levels, and account status.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[#777777] uppercase font-mono text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3">User Profile</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3 font-mono">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.length > 0 ? (
                users.map((u) => (
                  <tr key={u.id || u.uid} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-medium text-slate-900 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-purple-950 text-purple-300 font-bold flex items-center justify-center text-xs">
                        {(u.name || u.displayName || 'User').slice(0, 2).toUpperCase()}
                      </div>
                      <span>{u.name || u.displayName || 'BioCart Customer'}</span>
                    </td>
                    <td className="p-3 text-[#777777] font-mono">{u.email}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-slate-800 text-purple-300 rounded font-mono text-[10px] capitalize">
                        {u.role || 'customer'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.status === 'suspended' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {u.status || 'active'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[10px] text-[#777777]">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#777777] text-xs">
                    No customer accounts loaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
