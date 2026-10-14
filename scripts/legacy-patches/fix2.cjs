const fs = require('fs');
let appContent = fs.readFileSync('src/App.tsx', 'utf8');

// I will extract everything before `const renderContent = () => {`
const beforeRender = appContent.split('const renderContent = () => {')[0];

// I will extract everything after the `renderContent` block.
// How? I can find `<SEOManager />`
const afterRenderMatch = appContent.match(/(\s*<\/AnimatePresence>\s*<SEOManager \/>[\s\S]*)/);
const afterRender = afterRenderMatch ? afterRenderMatch[1] : '';

const newRender = `const renderContent = () => {
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
        </motion.div>`;

if (beforeRender && afterRender) {
  fs.writeFileSync('src/App.tsx', beforeRender + newRender + afterRender);
  console.log('Fixed App.tsx successfully');
} else {
  console.log('Could not parse App.tsx properly to fix it');
}
