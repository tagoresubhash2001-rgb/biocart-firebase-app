import React, { useEffect, useState } from 'react';
import { UserService } from '../../services/UserService';
import { UserProfile } from '../../types/backend';
import { Search, Shield, User, Clock, CheckCircle, XCircle } from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const result = await UserService.getUsers();
      if (result) {
        setUsers(result.items as UserProfile[]);
      }
    } catch (err) {
      console.error("Failed to load users for admin", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (isMounted) fetchUsers();
    return () => { isMounted = false; };
  }, []);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.uid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 ">
      <div className="p-6 md:p-8 border-b border-slate-200  bg-white  flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 ">Users & Customers</h1>
            <p className="text-sm text-slate-600  mt-1">View and manage registered users.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name, email, or UID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100  border border-slate-200  rounded-lg text-sm text-slate-900  focus:outline-none focus:border-nature-600 focus:ring-1 focus:ring-nature-600"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 md:p-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-nature-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white  rounded-2xl border border-slate-200  shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50  text-slate-600  border-b border-slate-200 ">
                  <tr>
                    <th className="px-6 py-4 font-bold">User</th>
                    <th className="px-6 py-4 font-bold">Contact</th>
                    <th className="px-6 py-4 font-bold">Role</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 ">
                  {filteredUsers.map((user) => (
                    <tr key={user.uid} className="hover:bg-slate-50 :bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200  flex items-center justify-center text-slate-500 overflow-hidden">
                            {user.photoURL ? (
                              <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 ">{user.name}</span>
                            <span className="text-xs text-slate-500 font-mono">ID: {user.uid}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-slate-700 ">{user.email}</span>
                          {user.phoneNumber && <span className="text-xs text-slate-500">{user.phoneNumber}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 ${
                          user.role === 'admin' || user.role === 'super_admin'
                            ? 'bg-purple-100 text-purple-700  ' 
                            : 'bg-slate-100 text-slate-700  '
                        }`}>
                          {(user.role === 'admin' || user.role === 'super_admin') && <Shield className="w-3 h-3" />}
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                          user.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-700  ' 
                            : 'bg-rose-100 text-rose-700  '
                        }`}>
                          {user.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-500 ">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        No users found matching "{searchQuery}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
