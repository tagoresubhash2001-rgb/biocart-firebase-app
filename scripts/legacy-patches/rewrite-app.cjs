const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// I will extract everything from the first "return" inside "renderContent" down to "return <Home />;" and put the correct ending.
// Actually, it's easier to just do: git restore src/App.tsx and re-apply BOTH fixes correctly using plain string replacements!

// Wait, git is broken. I will write exactly what AppContent should be.
const fixedAppContent = `
import { NotificationProvider } from './contexts/NotificationContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './contexts/AuthContext';
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useApp } from './context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastContainer } from './components/Toast';
import { DynamicIslandNav } from './components/DynamicIslandNav';
import { FloatingSocials } from './components/FloatingSocials';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { ProductDetails } from './components/ProductDetails';
import { CheckoutModal } from './components/CheckoutModal';
import { SEOManager } from './components/SEOManager';
import { BioCartLogo } from './components/BioCartLogo';

const Home = lazy(() => import('./components/Home').then(m => ({ default: m.Home })));
const About = lazy(() => import('./components/About').then(m => ({ default: m.About })));
const Shop = lazy(() => import('./components/Shop').then(m => ({ default: m.Shop })));
const Contact = lazy(() => import('./components/Contact').then(m => ({ default: m.Contact })));
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const DealerPortal = lazy(() => import('./components/Portals').then(m => ({ default: m.DealerPortal })));
const DistributorPortal = lazy(() => import('./components/Portals').then(m => ({ default: m.DistributorPortal })));
const NotFoundPage = lazy(() => import('./components/Portals').then(m => ({ default: m.NotFoundPage })));
// Admin and Vendor components lazy imports disabled
// const AdminConsole = lazy(() => import('./components/admin/AdminConsole'));
// const VendorConsole = lazy(() => import('./components/vendor/VendorConsole'));

const AppContent: React.FC = () => {
  const { currentTab, subView } = useApp();
  const [appLoading, setAppLoading] = useState(true);
    
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppLoading(false);
    }, 1400);
    return () => clearTimeout(timer);
  }, []);

  const renderContent = () => {
    // admin and vendor routing temporarily deactivated
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
          <Suspense fallback={<div className="flex-grow flex items-center justify-center min-h-[50vh]"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>}>
            {(() => {
              if (subView === 'dashboard') return <Dashboard />;
              if (subView === 'dealer-portal') return <DealerPortal />;
              if (subView === 'distributor-portal') return <DistributorPortal />;
              if (subView === '404') return <NotFoundPage />;

              switch (currentTab) {
                case 'home': return <Home />;
                case 'about': return <About />;
                case 'shop': return <Shop />;
                case 'contact': return <Contact />;
                case 'product-details': return <ProductDetails />;
                default: return <Home />;
              }
            })()}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-charcoal-900 text-charcoal-950 dark:text-slate-50 font-body flex flex-col selection:bg-nature-500/30">
      {appLoading && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-charcoal-950 flex flex-col items-center justify-center transition-opacity duration-500" id="global-loader">
          <BioCartLogo size="lg" className="mb-8 animate-pulse" />
          <div className="w-48 h-1 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-nature-600 rounded-full w-1/3 animate-[loading_1s_ease-in-out_infinite]" />
          </div>
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
      <AuthModal />
      <CheckoutModal />
    </div>
  );
};

export default function App() {
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
`;

fs.writeFileSync('src/App.tsx', fixedAppContent);
console.log('App.tsx cleanly rewritten.');
