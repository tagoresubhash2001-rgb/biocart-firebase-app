const fs = require('fs');

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

// Undo the bad comments first:
// I'll just use a cleaner replacement.
// Instead of trying to parse, I'll just restore from git and do it right?
// The git index was corrupted earlier, let's just do a clean regex replacement.
// Wait, I can just replace the whole renderContent function safely.
appContent = appContent.replace(
  /const renderContent = \(\) => \{[\s\S]*?\}\s*return \([\s\S]*?\<Suspense[\s\S]*?\<\/AnimatePresence\>;\n    \}/,
  `const renderContent = () => {
      // Admin and Vendor routing temporarily disabled
      return (
        <AnimatePresence mode="wait">
          {subView === 'dashboard' && <Dashboard />}
          {subView === 'dealer-portal' && <DealerPortal />}
          {subView === 'distributor-portal' && <DistributorPortal />}
          {subView === '404' && <NotFoundPage />}
          {!subView && (
            <motion.div
              key={currentTab as string}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex-grow flex flex-col"
            >
              {currentTab === 'home' && <Home />}
              {currentTab === 'about' && <About />}
              {currentTab === 'shop' && <Shop />}
              {currentTab === 'contact' && <Contact />}
              {currentTab === 'product-details' && <ProductDetails />}
            </motion.div>
          )}
        </AnimatePresence>
      );
    }`
);
fs.writeFileSync('src/App.tsx', appContent);
console.log('App.tsx fixed');
