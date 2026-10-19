import { AuthGuard } from '../../guards/AuthGuard';
import React, { useState, useEffect } from 'react';
import { VendorLayout, VendorSection } from './VendorLayout';
import { VendorDashboardHome } from './VendorDashboardHome';
import { VendorProducts } from './VendorProducts';
import { VendorOrders } from './VendorOrders';
import { VendorWallet } from './VendorWallet';
import { VendorSettings } from './VendorSettings';
import { VendorCoupons } from './VendorCoupons';
import { RoleGuard } from '../../guards/RoleGuard';
import { useVendor } from '../../hooks/useVendor';

import { BioCartLoader } from '../ui/BioCartLoader';

export const VendorConsole: React.FC = () => {
  const [activeSection, setActiveSection] = useState<VendorSection>('dashboard');
  const { vendorId, vendorData, loading, error, errorMessage, refetch } = useVendor();

  useEffect(() => {
    const handleLocationChange = () => {
      // 1. Check window.location.hash (e.g., #vendor/settings or #settings)
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('vendor/')) {
        const sec = hash.split('/')[1];
        if (sec) setActiveSection(sec as VendorSection);
        return;
      } else if (['dashboard', 'products', 'orders', 'coupons', 'wallet', 'settings'].includes(hash)) {
        setActiveSection(hash as VendorSection);
        return;
      }

      // 2. Check window.location.pathname (e.g., /vendor/settings or /vendor/coupons)
      const pathParts = window.location.pathname.replace(/^\/+/, '').split('/');
      if (pathParts[0] === 'vendor') {
        const subRoute = pathParts[1];
        if (subRoute && ['dashboard', 'products', 'orders', 'coupons', 'wallet', 'settings'].includes(subRoute)) {
          setActiveSection(subRoute as VendorSection);
          return;
        }
      }
    };
    
    // Run once on mount
    handleLocationChange();
    
    // Listen for external navigation and history events
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <BioCartLoader message="Verifying vendor partner credentials..." size="md" />
      </div>
    );
  }

  if (error === 'network_error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <div className="p-8 text-center bg-white border border-amber-200 text-slate-800 shadow-xl rounded-3xl max-w-md w-full space-y-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto font-bold text-xl">
            ⚡
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Temporary Connection Issue</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {errorMessage || 'Unable to reach Firebase servers or network was suspended. Please check your connection.'}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!vendorId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <div className="p-8 text-center bg-white border border-rose-200 text-slate-800 shadow-xl rounded-3xl max-w-md w-full space-y-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center mx-auto font-bold text-xl">
            🛡️
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Access Denied</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {errorMessage || 'No authorized vendor identity found for this account. Please contact BioCart administration.'}
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => refetch()}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Check Identity Again
            </button>
            <a
              href="/#contact-us"
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    );
  }


  const handleSectionChange = (sec: VendorSection) => {
    setActiveSection(sec);
    window.location.hash = `vendor/${sec}`;
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard': return <VendorDashboardHome />;
      case 'products': return <VendorProducts />;
      case 'orders': return <VendorOrders />;
      case 'coupons': return <VendorCoupons />;
      case 'wallet': return <VendorWallet />;
      case 'settings': return <VendorSettings />;
      default: return <VendorDashboardHome />;
    }
  };

  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['vendor', 'admin', 'super_admin']}>
        <VendorLayout activeSection={activeSection} onSectionChange={handleSectionChange} vendorData={vendorData}>
          {renderContent()}
        </VendorLayout>
      </RoleGuard>
    </AuthGuard>
  );
};
export default VendorConsole;