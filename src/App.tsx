import { AdminService } from './services/AdminService';

import { NotificationProvider, NotificationToasts } from './contexts/NotificationContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './contexts/AuthContext';
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useApp } from './context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { ToastContainer } from './components/ui/Toast';
import { DynamicIslandNav } from './components/layout/DynamicIslandNav';
import { FloatingSocials } from './components/ui/FloatingSocials';
import { Footer } from './components/layout/Footer';
import { AuthModal } from './components/ui/AuthModal';
import { ProductDetails } from './components/ui/ProductDetails';
import { CheckoutModal } from './components/ui/CheckoutModal';
import { SEOManager } from './components/ui/SEOManager';
import { BioCartLogo } from './components/ui/BioCartLogo';
import { BioCartLoader } from './components/ui/BioCartLoader';
import { GenericCMSPage } from './pages/GenericCMSPage';

const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const About = lazy(() => import('./pages/About').then(m => ({ default: m.About })));
const Shop = lazy(() => import('./pages/Shop').then(m => ({ default: m.Shop })));
const Contact = lazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const DealerPortal = lazy(() => import('./pages/Portals').then(m => ({ default: m.DealerPortal })));
const DistributorPortal = lazy(() => import('./pages/Portals').then(m => ({ default: m.DistributorPortal })));
const NotFoundPage = lazy(() => import('./pages/Portals').then(m => ({ default: m.NotFoundPage })));
// Admin and Vendor components lazy imports disabled
const AdminConsole = lazy(() => import('./components/admin/AdminConsole'));
const VendorConsole = lazy(() => import('./components/vendor/VendorConsole'));

const Blogs = lazy(() => import('./pages/Blogs').then(m => ({ default: m.BlogsPage })));

const AppContent: React.FC = () => {
  const { currentTab, subView } = useApp();
  const [appLoading, setAppLoading] = useState(true);
    
  useEffect(() => {
    setAppLoading(false);
  }, []);

  const renderContent = () => {
    // Dynamic routing: renders specialized portals (AdminConsole, VendorConsole, Dashboard) or storefront views
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex-grow flex flex-col"
        >
          <Suspense fallback={<div className="flex-grow flex items-center justify-center min-h-[50vh]"><BioCartLoader message="Loading content..." size="md" /></div>}>
            {(() => {
              
                if (subView === 'admin' || currentTab === 'admin' as any) return <AdminConsole />;
                if (subView === 'vendor' || currentTab === 'vendor' as any) return <VendorConsole />;
                if (subView === 'dashboard' || currentTab === 'dashboard' as any) return <Dashboard />;
                if (subView === 'dealer-portal' || currentTab === 'dealer-portal' as any) return <DealerPortal />;
                if (subView === 'distributor-portal' || currentTab === 'distributor-portal' as any) return <DistributorPortal />;
                if (subView === '404' || currentTab === '404' as any) return <NotFoundPage />;

              switch (currentTab) {
                case 'home': return <Home />;
                case 'about':
                case 'about-us':
                  return <About />;
                case 'contact':
                case 'contact-us':
                  return <Contact />;
                case 'shop': return <Shop />;
                case 'product-details': return <ProductDetails />;
                case 'blogs':
                case 'blog':
                  return <Blogs />;
                default: 
                  return <GenericCMSPage pageId={currentTab} />;
              }
            })()}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-body flex flex-col selection:bg-emerald-500/20">
      {appLoading && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center transition-opacity duration-500" id="global-loader">
          <BioCartLoader message="Welcome to BioCart — Healthy Organic Living" size="lg" />
        </div>
      )}

      <SEOManager />
      {subView !== 'admin' && subView !== 'vendor' && currentTab !== 'admin' && currentTab !== 'vendor' && <DynamicIslandNav />}
      {subView !== 'admin' && subView !== 'vendor' && currentTab !== 'admin' && currentTab !== 'vendor' && <FloatingSocials />}
      
      <main className="flex-grow flex flex-col" id="main-content-flow">
        {renderContent()}
      </main>

      {subView !== 'admin' && subView !== 'vendor' && currentTab !== 'admin' && currentTab !== 'vendor' && <Footer />}
      <ToastContainer />
      <NotificationToasts />
      <AuthModal />
      <CheckoutModal />
    </div>
  );
};

export default function App() {
  React.useEffect(() => {
    
  }, []);
  return (
    <LoadingProvider>
      <NotificationProvider>
        <AuthProvider>
          <AppProvider>
            <AppContent />
          </AppProvider>
        </AuthProvider>
      </NotificationProvider>
    </LoadingProvider>
  );
}
