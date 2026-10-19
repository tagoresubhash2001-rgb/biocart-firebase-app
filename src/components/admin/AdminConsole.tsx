import React, { useState, useEffect } from 'react';
import { AdminLayout, AdminSection } from './AdminLayout';
import { AdminDashboard } from './AdminDashboard';
import { AdminProducts } from './AdminProducts';
import { AdminCategories } from './AdminCategories';
import { AdminPages } from './AdminPages';
import { AdminFAQs } from './AdminFAQs';
import { AdminAuditLogs } from './AdminAuditLogs';
import { AdminReviews } from './AdminReviews';
import { AdminVendors } from './AdminVendors';
import { AdminCustomers } from './AdminCustomers';
import { AdminOrders } from './AdminOrders';
import { AdminSettings } from './AdminSettings';
import { AdminInventory } from './AdminInventory';
import { AdminCoupons } from './AdminCoupons';
import { AdminProductPromotions } from './AdminProductPromotions';
import { AdminContactMessages } from './AdminContactMessages';
import { AdminUsers } from './AdminUsers';
import { AdminShipments } from './AdminShipments';
import { AdminAgents } from './AdminAgents';
import { AdminPromotionalRibbons } from './AdminPromotionalRibbons';
import { AdminBlogs } from './AdminBlogs';
import { AdminPayouts } from './AdminPayouts';
import { AdminFinancials } from './AdminFinancials';
import { AuthGuard } from '../../guards/AuthGuard';
import { RoleGuard } from '../../guards/RoleGuard';

const VALID_SECTIONS: AdminSection[] = [
  'dashboard', 'financials', 'products', 'categories', 'pages', 'blogs', 'reviews',
  'vendors', 'payouts', 'agents', 'customers', 'orders', 'shipments', 'settings', 'audit-logs',
  'faqs', 'inventory', 'coupons', 'promotions', 'promotional-ribbons', 'contact-messages', 'users'
];

export const AdminConsole: React.FC = () => {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('admin/')) {
        const sec = hash.split('/')[1];
        if (VALID_SECTIONS.includes(sec as AdminSection)) {
          setActiveSection(sec as AdminSection);
        }
      } else if (hash === 'admin') {
        setActiveSection('dashboard');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSelectSection = (sec: AdminSection) => {
    setActiveSection(sec);
    window.location.hash = `admin/${sec}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const content = (
    <AdminLayout activeSection={activeSection} onSelectSection={handleSelectSection}>
      {(() => {
        switch (activeSection) {
          case 'dashboard':
            return <AdminDashboard onNavigate={handleSelectSection} />;
          case 'financials':
            return <AdminFinancials />;
          case 'products':
            return <AdminProducts />;
          case 'categories':
            return <AdminCategories />;
          case 'pages':
            return <AdminPages />;
          case 'blogs':
            return <AdminBlogs />;
          case 'reviews':
            return <AdminReviews />;
          case 'vendors':
            return <AdminVendors />;
          case 'payouts':
            return <AdminPayouts />;
          case 'agents':
            return <AdminAgents />;
          case 'customers':
            return <AdminCustomers />;
          case 'orders':
            return <AdminOrders />;
          case 'shipments':
            return <AdminShipments />;
          case 'faqs':
            return <AdminFAQs />;
          case 'settings':
            return <AdminSettings />;
          case 'audit-logs':
            return <AdminAuditLogs />;
          case 'inventory':
            return <AdminInventory />;
          case 'coupons':
            return <AdminCoupons />;
          case 'promotions':
            return <AdminProductPromotions />;
          case 'promotional-ribbons':
            return <AdminPromotionalRibbons />;
          case 'contact-messages':
            return <AdminContactMessages />;
          case 'users':
            return <AdminUsers />;
          default:
            return <AdminDashboard onNavigate={handleSelectSection} />;
        }
      })()}
    </AdminLayout>
  );

  return (
    <AuthGuard>
      <RoleGuard allowedRoles={['admin', 'super_admin']}>
        {content}
      </RoleGuard>
    </AuthGuard>
  );
};

export default AdminConsole;
