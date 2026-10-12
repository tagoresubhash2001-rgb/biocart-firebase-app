import { AuthGuard } from '../../guards/AuthGuard';
import React, { useState, useEffect } from 'react';
import { VendorLayout, VendorSection } from './VendorLayout';
import { VendorDashboardHome } from './VendorDashboardHome';
import { VendorProducts } from './VendorProducts';
import { VendorOrders } from './VendorOrders';
import { VendorWallet } from './VendorWallet';
import { VendorSettings } from './VendorSettings';
import { RoleGuard } from '../../guards/RoleGuard';
import { useVendor } from '../../hooks/useVendor';

export const VendorConsole: React.FC = () => {
  const [activeSection, setActiveSection] = useState<VendorSection>('dashboard');
  const { vendorId, loading } = useVendor();

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('vendor/')) {
        const sec = hash.split('/')[1];
        setActiveSection(sec as VendorSection);
      } else if (hash === 'vendor') {
        setActiveSection('dashboard');
      }
    };
    
    // Run once on mount
    handleHashChange();
    
    // Listen for external changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-slate-50"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!vendorId) return <div className="flex items-center justify-center min-h-screen bg-slate-50"><div className="p-8 text-center bg-white border border-red-200 text-red-700 shadow rounded-2xl"><h1>Access Denied</h1><p>No authorized vendor identity found for this account. Please contact BioCart administration.</p></div></div>;


  const handleSectionChange = (sec: VendorSection) => {
    setActiveSection(sec);
    window.location.hash = `vendor/${sec}`;
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard': return <VendorDashboardHome />;
      case 'products': return <VendorProducts />;
      case 'orders': return <VendorOrders />;
      case 'wallet': return <VendorWallet />;
      case 'settings': return <VendorSettings />;
      default: return <VendorDashboardHome />;
    }
  };

  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['vendor', 'admin', 'super_admin']}>
        <VendorLayout activeSection={activeSection} onSectionChange={handleSectionChange}>
          {renderContent()}
        </VendorLayout>
      </RoleGuard>
    </AuthGuard>
  );
};
export default VendorConsole;