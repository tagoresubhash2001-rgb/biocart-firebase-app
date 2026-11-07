import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../context/AppContext';
import { BioCartLogo } from '../ui/BioCartLogo';
import { AdminGlobalSearch } from './AdminGlobalSearch';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Image as ImageIcon,
  Home as HomeIcon,
  Star,
  Users,
  UserCog,
  Store,
  ShoppingBag,
  Settings as SettingsIcon,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Sparkles,
  Menu,
  X,
  ExternalLink,
  Tag,
  Boxes,
  Megaphone,
  Flag,
  Mail,
  HelpCircle,
  Truck,
  UserCheck,
  Banknote,
  DollarSign
} from 'lucide-react';

export type AdminSection =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'pages'
  | 'blogs'
  | 'reviews'
  | 'vendors'
  | 'financials'
  | 'payouts'
  | 'agents'
  | 'customers'
  | 'orders'
  | 'shipments'
  | 'settings'
  | 'audit-logs'
  | 'coupons'
  | 'inventory'
  | 'promotions'
  | 'promotional-ribbons'
  | 'contact-messages'
  | 'users'
  | 'faqs';

interface AdminLayoutProps {
  activeSection: AdminSection;
  onSelectSection: (section: AdminSection) => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeSection,
  onSelectSection,
  children
}) => {
  const { userProfile, logout } = useAuth();
  const { setTab, setSubView, addToast } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const navItems: { id: AdminSection; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'financials', label: 'Financial Control Center', icon: DollarSign },
    { id: 'products', label: 'Products Catalog', icon: Package },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'coupons', label: 'Coupons', icon: Tag },
    { id: 'promotions', label: 'Product Promotions', icon: Megaphone },
    { id: 'promotional-ribbons', label: 'Promotional Ribbons', icon: Flag },
    { id: 'pages', label: 'Page Management', icon: HomeIcon },
    { id: 'blogs', label: 'Blog CMS & SEO', icon: Sparkles },
    { id: 'reviews', label: 'Reviews Moderation', icon: Star },
    { id: 'faqs', label: 'FAQs', icon: HelpCircle },
    { id: 'vendors', label: 'Vendors Marketplace', icon: Store },
    { id: 'payouts', label: 'Payouts & Settlements', icon: Banknote },
    { id: 'agents', label: 'Agent Management', icon: UserCheck },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'users', label: 'Admin Users', icon: UserCog },
    { id: 'orders', label: 'Orders Foundation', icon: ShoppingBag },
    { id: 'shipments', label: 'Logistics & EKART', icon: Truck },
    { id: 'contact-messages', label: 'Contact Messages', icon: Mail },
    { id: 'settings', label: 'Store Settings', icon: SettingsIcon },
    { id: 'audit-logs', label: 'Audit Logs', icon: ShieldCheck },
  ];

  const handleGoToFrontend = () => {
    setSubView(null);
    setTab('home');
    window.location.hash = '';
    addToast('Navigated to BioCart Customer Frontend', 'info');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 flex flex-col font-sans">
      {/* Top Admin Navigation Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-2 text-slate-500 hover:text-slate-900 rounded-lg focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onSelectSection('dashboard')}>
            <BioCartLogo size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">BioCart</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                  Admin Console
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Real-Time Marketplace Control Center</p>
            </div>
          </div>
        </div>

        <div className="hidden md:flex flex-1 justify-center px-4">
          <AdminGlobalSearch
            features={navItems.map((n) => ({ id: n.id, label: n.label }))}
            onSelect={(section, label) => {
              onSelectSection(section as AdminSection);
              const page = navItems.find((n) => n.id === section)?.label || section;
              addToast(label === page ? `Opened ${page}` : `Opened ${page} — ${label}`, 'info');
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGoToFrontend}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">View Customer Store</span>
          </button>

          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-3 pl-2">
            <div className="text-right hidden md:block">
              <p className="text-xs font-semibold text-slate-700">{userProfile?.name || 'Administrator'}</p>
              <p className="text-[11px] font-mono text-emerald-600 capitalize">{userProfile?.role || 'admin'}</p>
            </div>
            <button
              onClick={() => logout()}
              title="Logout from Admin Console"
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-grow relative">
        {/* Sidebar Desktop */}
        <aside className="w-64 bg-white border-r border-slate-200 p-4 hidden md:flex flex-col justify-between flex-shrink-0 overflow-y-auto">
          <div className="space-y-1">
            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-3 mb-2">Navigation</p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectSection(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-200" />}
                </button>
              );
            })}
          </div>

          <div className="mt-8 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-700 font-semibold mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-Time Sync Active</span>
            </div>
            <p className="text-[11px] text-slate-500">Firestore listeners active • Instant publish sync</p>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex">
            <div className="w-72 bg-white h-full p-4 border-r border-slate-200 flex flex-col justify-between overflow-y-auto shadow-xl">
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
                  <span className="font-bold text-slate-900">BioCart Admin Menu</span>
                  <button onClick={() => setMobileSidebarOpen(false)} className="text-slate-400 hover:text-slate-900">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="mb-4">
                  <AdminGlobalSearch
                    features={navItems.map((n) => ({ id: n.id, label: n.label }))}
                    onSelect={(section) => { onSelectSection(section as AdminSection); setMobileSidebarOpen(false); }}
                  />
                </div>
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelectSection(item.id);
                          setMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium ${
                          isActive
                            ? 'bg-emerald-600 text-white font-semibold'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleGoToFrontend}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Go to Customer Store
              </button>
            </div>
          </div>
        )}

        {/* Main Admin Section Viewport */}
        <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};
