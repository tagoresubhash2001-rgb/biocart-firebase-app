import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { Leaf, Heart, ShoppingBag, User, Menu, X, Search } from 'lucide-react';
import { BioCartLogo } from '../ui/BioCartLogo';

export const DynamicIslandNav: React.FC = () => {
  const {
    currentTab,
    subView,
    setTab,
    setSubView,
    theme,
    toggleTheme,
    cart,
    wishlist,
    user,
    setCartOpen,
    setAuthModalOpen,
    searchQuery,
    setSearchQuery,
  } = useApp();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Use refs to handle scroll state without triggering unnecessary component re-renders
  const scrollRef = useRef({ lastScrolled: false });

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const shouldBeScrolled = currentScrollY > 30;
          
          if (shouldBeScrolled !== scrollRef.current.lastScrolled) {
            scrollRef.current.lastScrolled = shouldBeScrolled;
            setIsScrolled(shouldBeScrolled);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Check initial scroll position immediately
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const totalCartItems = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.quantityInCart || 0), 0);
  }, [cart]);

  const navLinks = useMemo(() => [
    { label: 'Home', tab: 'home' as const },
    { label: 'Shop', tab: 'shop' as const },
  ], []);


  // Use stable useCallback for all event handlers to optimize performance and prevent re-renders
  const handleProfileClick = useCallback(() => {
    if (user) {
      setSubView('dashboard');
    } else {
      setAuthModalOpen(true);
    }
  }, [user, setSubView, setAuthModalOpen]);

  const handleWishlistClick = useCallback(() => {
    if (user) {
      setSubView('dashboard');
      window.location.hash = 'dashboard?tab=wishlist';
    } else {
      setAuthModalOpen(true);
    }
  }, [user, setSubView, setAuthModalOpen]);

  const handleLogoClick = useCallback(() => {
    setTab('home');
    setSubView(null);
  }, [setTab, setSubView]);

  const handleNavLinkClick = useCallback((tab: any) => {
    setTab(tab);
    setSubView(null);
  }, [setTab, setSubView]);

  const handleCartClick = useCallback(() => {
    setCartOpen(true);
  }, [setCartOpen]);

  const handleHoverStart = useCallback(() => setIsHovered(true), []);
  const handleHoverEnd = useCallback(() => setIsHovered(false), []);

  const handleToggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const handleMobileNavLinkClick = useCallback((tab: any) => {
    handleNavLinkClick(tab);
    setIsMobileMenuOpen(false);
  }, [handleNavLinkClick]);

  const handleToggleTheme = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  const handleMobileProfileClick = useCallback(() => {
    handleProfileClick();
    setIsMobileMenuOpen(false);
  }, [handleProfileClick]);

  const handleMobileCartClick = useCallback(() => {
    setCartOpen(true);
    setIsMobileMenuOpen(false);
  }, [setCartOpen]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (currentTab !== 'shop' || subView !== null) {
      setTab('shop');
      setSubView(null);
    }
  }, [currentTab, subView, setTab, setSubView, setSearchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, [setSearchQuery]);

  const isCollapsed = isScrolled && !isHovered;

  // Render static links component using useMemo to prevent re-renders unless currentTab/subView changes
  const desktopLinksMarkup = useMemo(() => {
    return (
      <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 rounded-full p-1" id="nav-desktop-links">
        {navLinks.map((link) => {
          const isActive = currentTab === link.tab && subView === null;
          return (
            <button
              key={link.tab}
              onClick={() => handleNavLinkClick(link.tab)}
              className={`relative px-4 py-2 text-sm font-semibold rounded-full transition-colors cursor-pointer ${
                isActive
                  ? 'text-white !text-white'
                  : 'text-black dark:text-slate-200 hover:text-[#004643] dark:hover:text-white'
              }`}
              id={`nav-link-${link.tab}`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-[#004643] rounded-full -z-10 shadow-sm"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className={isActive ? 'text-white !text-white' : ''}>{link.label}</span>
            </button>
          );
        })}
      </div>
    );
  }, [navLinks, currentTab, subView, handleNavLinkClick]);

  // Render global search markup using useMemo
  const desktopSearchMarkup = useMemo(() => {
    return (
      <div className="relative hidden lg:block overflow-hidden" id="nav-global-search-input">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search BioCart..."
          className="w-[180px] pl-9 pr-8 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 focus:bg-white dark:focus:bg-charcoal-900 border border-slate-200/40 dark:border-white/5 focus:border-nature-600 dark:focus:border-nature-500 focus:outline-none rounded-full text-xs text-charcoal-950 dark:text-white transition-all duration-200"
        />
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700 dark:hover:text-white p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }, [searchQuery, handleSearchChange, handleClearSearch]);

  return (
    <>
      {/* 
        Outer fixed container wraps the island at its premium top coordinate.
        Using pointer-events-none allows clicks outside the island to flow directly to pages.
      */}
      <div 
        className="fixed top-4 md:top-5 lg:top-6 left-0 right-0 z-50 flex justify-center px-4 md:px-6 pointer-events-none select-none" 
        id="dynamic-island-wrapper"
      >
        <motion.nav
          onMouseEnter={handleHoverStart}
          onMouseLeave={handleHoverEnd}
          animate={{
            width: isCollapsed ? '160px' : '95%',
            maxWidth: isCollapsed ? '160px' : '1120px',
            height: isCollapsed ? '48px' : '64px',
            borderRadius: isCollapsed ? '24px' : '32px',
            backgroundColor: theme === 'light' 
              ? (isScrolled ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.85)') 
              : (isScrolled ? 'rgba(18, 24, 29, 0.96)' : 'rgba(18, 24, 29, 0.88)'),
            backdropFilter: isScrolled ? 'blur(16px)' : 'blur(12px)',
            boxShadow: isScrolled
              ? '0 20px 40px -12px rgba(15, 61, 46, 0.18), 0 0 1px 1px rgba(15, 61, 46, 0.05)'
              : '0 4px 24px -5px rgba(0, 0, 0, 0.04)',
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', damping: 28, stiffness: 220, mass: 0.8 }}
          style={{ willChange: 'transform, width, height, background-color, backdrop-filter, border-radius' }}
          className="flex items-center justify-between border border-white/40 dark:border-white/10 overflow-hidden w-full pointer-events-auto transition-all duration-300 rounded-full px-5 md:px-7"
          id="dynamic-island-nav"
        >
          {/* ZONE 1: Left Brand Logo (Morphs to spinning leaf when collapsed) */}
          <div className="flex items-center shrink-0" id="nav-left-zone">
            <AnimatePresence mode="wait">
              {!isCollapsed ? (
                <motion.div
                  key="expanded-logo"
                  initial={{ opacity: 0, x: -10, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onClick={handleLogoClick}
                  className="cursor-pointer"
                >
                  <BioCartLogo size="sm" showTagline={true} onDesktopOnlyTagline={true} className="scale-95 origin-left" />
                </motion.div>
              ) : (
                <motion.div
                  key="collapsed-leaf"
                  initial={{ opacity: 0, scale: 0.6, rotate: -45 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.6, rotate: 45 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="flex items-center justify-center p-1.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-full cursor-pointer hover:scale-110 active:scale-95"
                  onClick={handleHoverStart}
                  title="Click to Expand Navigation"
                >
                  <Leaf className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 animate-spin-slow" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ZONE 2: Centered Links & Search (Only shown when expanded) */}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                key="center-links-search"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="hidden md:flex items-center gap-4"
                id="nav-desktop-center-container"
              >
                {desktopLinksMarkup}
                {desktopSearchMarkup}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ZONE 3: Right Action Buttons (Swaps with compact cart/expand menu when collapsed) */}
          <div className="flex items-center gap-3 shrink-0" id="nav-right-zone">
            <AnimatePresence mode="wait">
              {!isCollapsed ? (
                <motion.div
                  key="expanded-actions"
                  initial={{ opacity: 0, x: 10, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2 md:gap-3"
                  id="nav-action-buttons"
                >
                  {/* Wishlist Icon */}

                  <button
                    onClick={handleWishlistClick}
                    className="relative p-2 text-black dark:text-slate-300 hover:text-nature-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors cursor-pointer"
                    id="wishlist-nav-btn"
                  >
                    <Heart className="w-4 h-4" />
                    {wishlist.length > 0 && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                    )}
                  </button>

                  {/* Cart Icon */}
                  <button
                    onClick={handleCartClick}
                    className="relative p-2 text-black dark:text-slate-300 hover:text-[#004643] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors cursor-pointer"
                    id="cart-nav-btn"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {totalCartItems > 0 && (
                      <span className="absolute -top-1 -right-1 bg-[#004643] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full scale-90 shadow-sm">
                        {totalCartItems}
                      </span>
                    )}
                  </button>

                  {/* Profile / Account Icon */}
                  <button
                    onClick={handleProfileClick}
                    className={`p-2 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer ${
                      subView === 'dashboard'
                        ? 'bg-[#004643] text-white !text-white'
                        : 'text-black dark:text-slate-300 hover:text-[#004643] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                    id="profile-nav-btn"
                  >
                    <User className="w-4 h-4" />
                    {user && (
                      <span className="hidden lg:inline text-xs font-semibold max-w-[80px] truncate">
                        {user.name.split(' ')[0]}
                      </span>
                    )}
                  </button>

                  {/* Mobile Menu Toggle */}
                  <button
                    onClick={handleToggleMobileMenu}
                    className="md:hidden p-2 text-black dark:text-slate-300 hover:text-nature-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors cursor-pointer"
                    id="mobile-menu-toggle-btn"
                  >
                    {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="collapsed-actions"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1"
                  id="nav-scrolled-compact-content"
                >
                  {/* Compact Cart Button */}
                  <button
                    onClick={handleCartClick}
                    className="relative p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors cursor-pointer hover:scale-110 active:scale-95"
                    id="compact-cart-btn"
                  >
                    <ShoppingBag className="w-4.5 h-4.5 text-nature-800 dark:text-white" />
                    {totalCartItems > 0 && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-800 rounded-full animate-pulse" />
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.nav>
      </div>

      {/* Mobile Menu Backdrop & Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
            onClick={handleCloseMobileMenu}
            id="mobile-menu-overlay"
          >
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="absolute top-24 left-4 right-4 bg-white dark:bg-charcoal-900 rounded-3xl p-6 shadow-2xl border border-black/5 dark:border-white/10 flex flex-col gap-4 z-40"
              onClick={(e) => e.stopPropagation()}
              id="mobile-menu-drawer"
            >
              {/* Mobile Global Search Bar */}
              <div className="relative w-full" id="mobile-global-search">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search BioCart catalog..."
                  className="w-full pl-10 pr-9 py-2.5 bg-black/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:border-nature-600 focus:outline-none text-xs text-charcoal-950 dark:text-white"
                />
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700 dark:hover:text-white p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2" id="mobile-menu-links">
                {navLinks.map((link) => {
                  const isActive = currentTab === link.tab && subView === null;
                  return (
                    <button
                      key={link.tab}
                      onClick={() => handleMobileNavLinkClick(link.tab)}
                      className={`w-full text-left py-3 px-4 rounded-xl font-medium text-lg transition-colors ${
                        isActive
                          ? 'bg-nature-50 dark:bg-nature-950/40 text-nature-800 dark:text-nature-400 border-l-4 border-emerald-800'
                          : 'text-charcoal-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                      id={`mobile-nav-link-${link.tab}`}
                    >
                      {link.label}
                    </button>
                  );
                })}
              </div>

              <div className="h-[1px] bg-black/10 dark:bg-white/10" />



              <div className="grid grid-cols-2 gap-3" id="mobile-menu-quick-actions">
                <button
                  onClick={handleMobileProfileClick}
                  className="flex items-center justify-center gap-2 py-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 rounded-xl font-medium text-sm text-charcoal-800 dark:text-white cursor-pointer"
                  id="mobile-menu-profile"
                >
                  <User className="w-4.5 h-4.5" />
                  <span>{user ? 'Dashboard' : 'Sign In'}</span>
                </button>
                <button
                  onClick={handleMobileCartClick}
                  className="flex items-center justify-center gap-2 py-3 bg-[#004643] hover:bg-[#003532] text-white rounded-xl font-medium text-sm cursor-pointer shadow-sm"
                  id="mobile-menu-cart"
                >
                  <ShoppingBag className="w-4.5 h-4.5 text-white" />
                  <span className="!text-white">Cart ({totalCartItems})</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
