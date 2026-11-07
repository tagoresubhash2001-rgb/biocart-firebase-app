import { ErrorBoundary } from '../ui/ErrorBoundary';
import React, { useState } from 'react';
import { BioCartLogo } from '../ui/BioCartLogo';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Package, ShoppingBag, Wallet, Settings, Tag, LogOut, Menu, X, BellRing } from 'lucide-react';
import { useNewOrderAlerts, enableOrderNotifications, notificationsSupported } from '../../hooks/useNewOrderAlerts';

export type VendorSection = 'dashboard' | 'products' | 'orders' | 'coupons' | 'wallet' | 'settings';

interface Props {
  activeSection: VendorSection;
  onSectionChange: (section: VendorSection) => void;
  vendorData?: any | null;
  vendorId?: string | null;
  children: React.ReactNode;
}

export const VendorLayout: React.FC<Props> = ({ activeSection, onSectionChange, vendorData, vendorId, children }) => {
  const { userProfile, firebaseUser, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { newCount, latest, dismiss } = useNewOrderAlerts(vendorId || vendorData?.id || null);
  const [alertsOn, setAlertsOn] = useState(() => notificationsSupported() && Notification.permission === 'granted');

  // Resolved canonical business name and owner name
  const displayBusinessName = vendorData?.storeName || vendorData?.businessName || (userProfile as any)?.businessName || 'BioCart Partner';
  const displayOwnerName = vendorData?.ownerName || (userProfile?.name && !['biocart', 'biocart vendor', 'biocart user'].includes(userProfile.name.toLowerCase()) ? userProfile.name : '');
  const displayLogo = vendorData?.logo || (userProfile as any)?.logoUrl || null;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'My Products', icon: Package },
    { id: 'orders', label: 'My Orders', icon: ShoppingBag },
    { id: 'coupons', label: 'Coupons', icon: Tag },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="panel min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <BioCartLogo size="sm" showTagline={false} />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900 truncate max-w-[160px]">
              {displayBusinessName}
            </span>
            <span className="text-[9px] font-mono text-emerald-600 uppercase tracking-wider">Vendor Console</span>
          </div>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label={isMobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="p-2 rounded-lg text-slate-700 hover:bg-gray-100 transition-colors"
        >
          {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Backdrop for Mobile */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Desktop fixed, Mobile sliding drawer) */}
      <aside
        className={`w-64 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 z-50 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <BioCartLogo size="md" showTagline={false} />
            <button
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-gray-100"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-900">
            {displayLogo ? (
              <img src={displayLogo} alt="Vendor Logo" className="w-8 h-8 rounded bg-white object-cover border border-gray-200" />
            ) : null}
            <div className="flex flex-col">
              <span className="truncate leading-tight">{displayBusinessName}</span>
              <span className="text-[10px] font-mono text-emerald-600 uppercase tracking-wider mt-1">Vendor Console</span>
            </div>
          </h1>
          <p className="text-sm text-gray-500 mt-2 truncate">{displayOwnerName}</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { onSectionChange(item.id as VendorSection); setIsMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === item.id ? 'bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-600/20' : 'text-slate-600 hover:text-slate-900 hover:bg-emerald-50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'orders' && newCount > 0 && (
                <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center">{newCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button onClick={() => { logout(); window.location.hash = ''; }} className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all">
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-x-hidden">
        <ErrorBoundary>
          <div className="max-w-7xl mx-auto">
            {latest && (
              <div className="mb-4 flex items-center gap-3 p-4 rounded-2xl bg-emerald-600 text-white shadow-lg" id="vendor-new-order-alert" role="alert">
                <BellRing className="w-6 h-6 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-white">New order received!</p>
                  <p className="text-xs text-emerald-50 truncate">{latest.label}</p>
                </div>
                <button onClick={() => { onSectionChange('orders'); dismiss(); }} className="px-3 py-2 rounded-xl bg-white text-emerald-700 text-xs font-bold">Open orders</button>
                <button onClick={dismiss} aria-label="Close" className="p-1 text-white/80 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
            )}
            {!alertsOn && notificationsSupported() && (
              <div className="mb-4 flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs" id="vendor-enable-alerts">
                <BellRing className="w-4 h-4" />
                <span className="flex-1">Turn on order alerts to get a sound and a pop-up as soon as a customer pays for an order.</span>
                <button onClick={async () => setAlertsOn(await enableOrderNotifications())} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold">Turn on alerts</button>
              </div>
            )}
            {children}
          </div>
        </ErrorBoundary>
      </main>
    </div>
  );
};