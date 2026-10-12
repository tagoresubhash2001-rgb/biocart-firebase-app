import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../types';
import { useAuth } from '../contexts/AuthContext';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}

interface AppContextType {
  currentTab: string;
  subView: string | null;
  theme: 'light' | 'dark';
  cart: Product[];
  wishlist: string[];
  user: { uid?: string; name: string; email: string; phone?: string; location?: string; status?: string } | null;
  toasts: ToastMessage[];
  activeProductDetails: Product | null;
  searchQuery: string;
  selectedCategory: string;
  activeOrderTrackId: string | null;
  isCartOpen: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register' | 'forgot';
  
  setTab: (tab: string) => void;
  setSubView: (view: string | null) => void;

  toggleTheme: () => void;
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  login: (email: string, name?: string, password?: string) => void;
  loginWithGoogleProvider: () => void;
  logout: () => void;
  addToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
  setActiveProductDetails: (product: Product | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setActiveOrderTrackId: (trackId: string | null) => void;
  setCartOpen: (open: boolean) => void;
  setAuthModalOpen: (open: boolean) => void;
  setAuthModalMode: (mode: 'login' | 'register' | 'forgot') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    userProfile, 
    isAuthenticated, 
    loginWithEmail, 
    registerWithEmail, 
    logout: firebaseLogout, 
    loginWithGoogle,
    resetPassword
  } = useAuth();

  const user = React.useMemo(() => {
    if (!isAuthenticated || !userProfile) return null;
    return {
      uid: userProfile.uid,
      name: userProfile.name,
      email: userProfile.email,
      phone: userProfile.phone || userProfile.phoneNumber || '',
      location: userProfile.location || '',
      status: userProfile.role === 'super_admin' ? 'Super Admin' : (userProfile.role === 'admin' ? 'Admin' : 'Premium Green Member')
    };
  }, [userProfile, isAuthenticated]);

  const [currentTab, setCurrentTabState] = useState<string>('home');
  const [subView, setSubViewState] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [cart, setCart] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('biocart-cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('biocart-wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save cart and wishlist to localStorage on updates
  useEffect(() => {
    try {
      localStorage.setItem('biocart-cart', JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('biocart-wishlist', JSON.stringify(wishlist));
    } catch (e) {
      console.error('Failed to save wishlist to localStorage', e);
    }
  }, [wishlist]);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [activeProductDetails, setActiveProductDetails] = useState<Product | null>(() => {
    try {
      const saved = localStorage.getItem('biocart-active-product');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (activeProductDetails) {
        localStorage.setItem('biocart-active-product', JSON.stringify(activeProductDetails));
      } else {
        localStorage.removeItem('biocart-active-product');
      }
    } catch (e) {
      console.warn('Failed to save active product to localStorage', e);
    }
  }, [activeProductDetails]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeOrderTrackId, setActiveOrderTrackId] = useState<string | null>(null);
  const [isCartOpen, setCartOpen] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'forgot'>('login');


  // Theme: BioCart is permanently Light Theme only.
  // Always remove the dark class and reset any stale localStorage preference.
  useEffect(() => {
    // Force light theme unconditionally — remove any stale dark preference
    localStorage.setItem('biocart-theme', 'light');
    localStorage.setItem('biocart-theme-migrated', 'true');
    document.documentElement.classList.remove('dark');
    setTheme('light');

    // Synchronize tab with hash on load
    const hash = window.location.hash.replace('#', '');
    const pathname = window.location.pathname.replace(/^\/+/g, '');
    
    // Proper redirections for localhost links (pathnames like /shop or /admin/products)
    if (pathname && !hash) {
      if (
        ['home', 'about', 'shop', 'contact', 'product-details', 'dashboard', 'dealer-portal', 'distributor-portal', 'admin', 'vendor'].includes(pathname) ||
        pathname.startsWith('admin/') || 
        pathname.startsWith('vendor/')
      ) {
        window.location.href = '/#' + pathname;
        return;
      }
    }
    
    const handleHash = () => {
      const newHash = window.location.hash.replace('#', '') || 'home';
      if (['dashboard', 'dealer-portal', 'distributor-portal', 'admin', 'vendor'].includes(newHash)) {
        setSubViewState(newHash);
      } else if (newHash.startsWith('admin/')) {
        setSubViewState('admin');
      } else if (newHash.startsWith('vendor/')) {
        setSubViewState('vendor');
      } else {
        setCurrentTabState(newHash);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const setTab = (tab: string) => {
    setCurrentTabState(tab);
    setSubViewState(null);
    window.location.hash = tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setSubView = (view: string | null) => {
    setSubViewState(view);
    if (view) {
      window.location.hash = view;
    } else {
      window.location.hash = currentTab;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleTheme = () => {
    // BioCart is permanently Light Theme — dark mode is disabled.
    document.documentElement.classList.remove('dark');
    localStorage.setItem('biocart-theme', 'light');
    setTheme('light');
  };

  const addToCart = (product: Product, quantity: number = 1) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        addToast(`Updated quantity of ${product.name} to ${existingItem.quantityInCart! + quantity}`, 'success');
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantityInCart: (item.quantityInCart || 0) + quantity }
            : item
        );
      }
      addToast(`Added ${product.name} to your cart`, 'success');
      return [...prevCart, { ...product, quantityInCart: quantity }];
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === productId ? { ...item, quantityInCart: quantity } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    const item = cart.find((i) => i.id === productId);
    if (item) {
      addToast(`Removed ${item.name} from cart`, 'info');
    }
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const toggleWishlist = (productId: string) => {
    setWishlist((prevWishlist) => {
      const exists = prevWishlist.includes(productId);
      if (exists) {
        addToast('Removed from wishlist', 'info');
        return prevWishlist.filter((id) => id !== productId);
      } else {
        addToast('Added to your wishlist', 'success');
        return [...prevWishlist, productId];
      }
    });
  };

  const login = async (email: string, name: string = 'Tagore Subhash', password?: string) => {
    try {
      if (authModalMode === 'login') {
        if (!password) {
          addToast('Please enter your password', 'warning');
          return;
        }
        await loginWithEmail(email, password);
      } else if (authModalMode === 'register') {
        if (!password) {
          addToast('Please set a secure password', 'warning');
          return;
        }
        await registerWithEmail(email, password, name);
      } else if (authModalMode === 'forgot') {
        await resetPassword(email);
      }
      setAuthModalOpen(false);
    } catch (err: any) {
      console.error('Firebase Auth action failed:', err);
    }
  };

  const loginWithGoogleProvider = async () => {
    try {
      await loginWithGoogle();
      setAuthModalOpen(false);
    } catch (err: any) {
      console.error('Firebase Google Auth failed:', err);
    }
  };

  const logout = async () => {
    try {
      await firebaseLogout();
      setSubViewState(null);
      setCurrentTabState('home');
    } catch (err: any) {
      console.error('Firebase Logout failed:', err);
    }
  };

  const addToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <AppContext.Provider
      value={{
        currentTab,
        subView,
        theme,
        cart,
        wishlist,
        user,
        toasts,
        activeProductDetails,
        searchQuery,
        selectedCategory,
        activeOrderTrackId,
        isCartOpen,
        isAuthModalOpen,
        authModalMode,
        setTab,
        setSubView,
        toggleTheme,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        toggleWishlist,
        login,
        loginWithGoogleProvider,
        logout,
        addToast,
        removeToast,
        setActiveProductDetails,
        setSearchQuery,
        setSelectedCategory,
        setActiveOrderTrackId,
        setCartOpen,
        setAuthModalOpen,
        setAuthModalMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
