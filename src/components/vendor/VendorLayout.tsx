import { ErrorBoundary } from '../ui/ErrorBoundary';
import React, { useState } from 'react';
import { BioCartLogo } from '../ui/BioCartLogo';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Package, Leaf, ShoppingBag, Wallet, LogOut, Menu, X, Store , Settings } from 'lucide-react';

export type VendorSection = 'dashboard' | 'products' | 'orders' | 'wallet';

interface Props {
  activeSection: VendorSection;
  onSectionChange: (section: VendorSection) => void;
  children: React.ReactNode;
}

export const VendorLayout: React.FC<Props> = ({ activeSection, onSectionChange, children }) => {
  const { userProfile, firebaseUser, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'My Products', icon: Package },
    { id: 'orders', label: 'My Orders', icon: ShoppingBag },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="panel min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 z-50">
        <div className="p-6">
          <div className="mb-4">
            <BioCartLogo size="md" showTagline={false} />
          </div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-900">
            {userProfile?.logoUrl ? (
                <img src={userProfile.logoUrl} alt="Vendor Logo" className="w-8 h-8 rounded bg-white object-cover border border-gray-200" />
              ) : null}
              <div className="flex flex-col">
                <span className="truncate leading-tight">{userProfile?.businessName || userProfile?.name || 'BioCart Vendor'}</span>
                <span className="text-[10px] font-mono text-emerald-600 uppercase tracking-wider mt-1">Vendor Console</span>
              </div>
          </h1>
          <p className="text-sm text-gray-500 mt-2">{userProfile?.name || firebaseUser?.email}</p>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { onSectionChange(item.id as VendorSection); setIsMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === item.id ? 'bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-600/20' : 'text-slate-600 hover:text-slate-900 hover:bg-emerald-50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button onClick={() => { logout(); window.location.hash = ''; }} className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all">
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-8">
<ErrorBoundary>

        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      
</ErrorBoundary>
</main>
    </div>
  );
};