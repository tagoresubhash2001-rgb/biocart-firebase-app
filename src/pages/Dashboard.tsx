import React, { useState, useEffect } from 'react';
import { linkWithPopup, linkWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useApp } from '../context/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  Package, 
  MapPin, 
  Heart, 
  LogOut, 
  Search, 
  CheckCircle2, 
  ChevronRight, 
  Truck, 
  Link2, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Edit3, 
  Lock, 
  Check, 
  X, 
  Key, 
  Mail, 
  Phone, 
  Calendar, 
  ArrowRight,
  ExternalLink,
  ShoppingBag,
  Clock,
  AlertCircle,
  Copy,
  Shield,
  Smartphone,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { AdminService } from '../services/AdminService';
import { UserService } from '../services/UserService';
import { AddressService } from '../services/AddressService';
import { AuthService } from '../services/AuthService';
import { auth, googleProvider } from '../config/firebase';
import { normalizeError } from '../utils/errors';
import { Product, ShipmentItem } from '../types';
import { AddressEntity } from '../types/backend';
import { ProductCard } from '../components/ui/ProductCard';
import { ShippingService, TrackingResult } from '../services/ShippingService';
import { BioCartLoader } from '../components/ui/BioCartLoader';

type DashboardTab = 'overview' | 'profile' | 'orders' | 'track' | 'wishlist' | 'addresses' | 'security';

export const Dashboard: React.FC = () => {
  const {
    user,
    logout,
    theme,
    toggleTheme,
    wishlist,
    toggleWishlist,
    addToCart,
    activeOrderTrackId,
    setActiveOrderTrackId,
    addToast,
    setActiveProductDetails,
    setCartOpen,
    setTab,
    setAuthModalOpen,
    setAuthModalMode,
    setSubView
  } = useApp();

  const { changePassword, sendEmailVerification, refreshProfile, firebaseUser, isAuthenticating } = useAuth();

  // Tab state with hash parameter support (e.g. #dashboard?tab=wishlist)
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => {
    try {
      const hash = window.location.hash;
      if (hash.includes('tab=')) {
        const tabParam = hash.split('tab=')[1]?.split('&')[0];
        if (['overview', 'profile', 'orders', 'track', 'wishlist', 'addresses', 'security'].includes(tabParam)) {
          return tabParam as DashboardTab;
        }
      }
    } catch (e) {
      // Fallback
    }
    return 'overview';
  });

  // Track hash changes for sub-tabs
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.includes('tab=')) {
        const tabParam = hash.split('tab=')[1]?.split('&')[0];
        if (['overview', 'profile', 'orders', 'track', 'wishlist', 'addresses', 'security'].includes(tabParam)) {
          setActiveTab(tabParam as DashboardTab);
        }
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const switchTab = (tab: DashboardTab) => {
    setActiveTab(tab);
    window.location.hash = `dashboard?tab=${tab}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);

  // Tracking state
  const [trackInputId, setTrackInputId] = useState(activeOrderTrackId || '');

  // Products for wishlist resolution
  const [realtimeProducts, setRealtimeProducts] = useState<Product[]>([]);

  // Google link state
  const [googleLinked, setGoogleLinked] = useState(() => 
    auth.currentUser?.providerData.some((provider) => provider.providerId === 'google.com') ?? false
  );
  const [linkingGoogle, setLinkingGoogle] = useState(false);

  // Personal Info Form State
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileLocation, setProfileLocation] = useState(user?.location || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Keep profile inputs in sync with user changes
  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
      setProfileLocation(user.location || '');
    }
  }, [user]);

  // Saved Addresses State
  const [addresses, setAddresses] = useState<AddressEntity[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressEntity | null>(null);
  const [addrFormName, setAddrFormName] = useState('');
  const [addrFormPhone, setAddrFormPhone] = useState('');
  const [addrFormStreet, setAddrFormStreet] = useState('');
  const [addrFormCity, setAddrFormCity] = useState('');
  const [addrFormState, setAddrFormState] = useState('Andhra Pradesh');
  const [addrFormPostalCode, setAddrFormPostalCode] = useState('');
  const [addrFormIsDefault, setAddrFormIsDefault] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);

  // New Password Setup for Google-only users
  const [newAccountPassword, setNewAccountPassword] = useState('');
  const [confirmAccountPassword, setConfirmAccountPassword] = useState('');
  const [settingAccountPassword, setSettingAccountPassword] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);

  // Customer ID Copy State & Handler
  const [copiedCustomerId, setCopiedCustomerId] = useState(false);
  const handleCopyCustomerId = (id?: string) => {
    const val = id || (user as any)?.customerId;
    if (!val) return;
    navigator.clipboard.writeText(val).then(() => {
      setCopiedCustomerId(true);
      addToast(`Customer ID ${val} copied to clipboard`, 'success');
      setTimeout(() => setCopiedCustomerId(false), 2000);
    }).catch(() => {
      addToast(`Failed copying Customer ID`, 'warning');
    });
  };

  // EKART Logistics & Shipment Tracking State
  const [trackingShipments, setTrackingShipments] = useState<ShipmentItem[]>([]);
  const [liveEKARTTracking, setLiveEKARTTracking] = useState<Record<string, TrackingResult>>({});
  const [loadingLiveAwb, setLoadingLiveAwb] = useState<string | null>(null);

  const handleFetchLiveTracking = async (awb: string) => {
    setLoadingLiveAwb(awb);
    try {
      const res = await ShippingService.trackShipment(awb);
      setLiveEKARTTracking((prev) => ({ ...prev, [awb]: res }));
      addToast(`Live EKART tracking updated for AWB ${awb}`, 'info');
    } catch (err: any) {
      console.error('Failed to track EKART shipment:', err);
      addToast(err.message || 'Failed to fetch live carrier scans.', 'warning');
    } finally {
      setLoadingLiveAwb(null);
    }
  };

  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this order? This cannot be undone.')) {
      return;
    }
    setCancellingOrderId(orderId);
    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('../config/firebase');
      const cancelFn = httpsCallable<{ orderId: string; reason?: string }, { success: boolean }>(functions, 'cancelOrder');
      await cancelFn({ orderId, reason: 'Cancelled by customer from Dashboard' });
      addToast('Order cancelled successfully.', 'success');
      if (selectedOrderDetails?.id === orderId) {
        setSelectedOrderDetails((prev: any) => prev ? { ...prev, status: 'cancelled' } : null);
      }
    } catch (err: any) {
      console.error('Failed to cancel order:', err);
      addToast(err?.message || 'Failed to cancel order.', 'error');
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Fetch Realtime Products for Wishlist
  useEffect(() => {
    const unsub = AdminService.subscribeToProducts((list) => {
      setRealtimeProducts(list);
    });
    return () => unsub();
  }, []);

  // Fetch Orders
  useEffect(() => {
    if (!user?.uid) return;
    setLoadingOrders(true);

    const parseAndSortOrders = (docs: any[]) => {
      const list = docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      return list;
    };

    let fallbackUnsub: (() => void) | null = null;
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setOrders(parseAndSortOrders(snap.docs));
      setLoadingOrders(false);
    }, (err) => {
      console.warn('Orders composite query failed, attempting unindexed query with client-side sort:', err);
      const fallbackQ = query(
        collection(db, 'orders'),
        where('userId', '==', user.uid)
      );
      fallbackUnsub = onSnapshot(fallbackQ, (fallbackSnap) => {
        setOrders(parseAndSortOrders(fallbackSnap.docs));
        setLoadingOrders(false);
      }, (fallbackErr) => {
        console.error('Customer orders subscription error:', fallbackErr);
        setLoadingOrders(false);
      });
    });

    return () => {
      unsub();
      if (fallbackUnsub) fallbackUnsub();
    };
  }, [user?.uid]);

  // Load Saved Addresses
  const loadAddresses = async () => {
    if (!user?.uid) return;
    setLoadingAddresses(true);
    try {
      const list = await AddressService.getUserAddresses(user.uid);
      setAddresses(list);
    } catch (e) {
      console.warn('Error loading addresses:', e);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      loadAddresses();
    }
  }, [user?.uid]);

  // Synchronize EKART shipments for current search/order
  useEffect(() => {
    const activeId = (trackInputId || activeOrderTrackId || '').trim();
    if (!activeId) {
      setTrackingShipments([]);
      return;
    }

    const colRef = collection(db, 'shipments');
    const q = query(colRef, where('orderNumber', '==', activeId));

    const unsub = onSnapshot(q, (snap) => {
      const list: ShipmentItem[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as ShipmentItem));
      if (list.length > 0) {
        setTrackingShipments(list);
      } else {
        const awbQ = query(colRef, where('trackingNumber', '==', activeId));
        onSnapshot(awbQ, (awbSnap) => {
          const awbList: ShipmentItem[] = [];
          awbSnap.forEach((d) => awbList.push({ id: d.id, ...d.data() } as ShipmentItem));
          setTrackingShipments(awbList);
        });
      }
    }, (err) => {
      console.warn('Shipments query failed:', err);
    });

    return () => unsub();
  }, [trackInputId, activeOrderTrackId]);

  // Handle Google Linking
  const handleLinkGoogle = async () => {
    if (!auth.currentUser) return;
    setLinkingGoogle(true);
    try {
      await linkWithPopup(auth.currentUser, googleProvider);
      setGoogleLinked(true);
      addToast('Google sign-in is now linked to this BioCart account.', 'success');
    } catch (error) {
      addToast(normalizeError(error).message, 'warning');
    } finally {
      setLinkingGoogle(false);
    }
  };

  // Handle Personal Info Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    if (!profileName.trim() || profileName.trim().length < 2) {
      addToast('Please enter a valid full name (at least 2 characters)', 'warning');
      return;
    }
    setSavingProfile(true);
    try {
      await UserService.updateProfile(user.uid, {
        name: profileName.trim(),
        phone: profilePhone.trim() || undefined,
        phoneNumber: profilePhone.trim() || undefined,
        location: profileLocation.trim() || undefined,
      });
      await refreshProfile();
      setEditingProfile(false);
      addToast('Profile updated successfully!', 'success');
    } catch (error) {
      addToast(normalizeError(error).message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Address Save
  const handleOpenAddressModal = (address?: AddressEntity) => {
    if (address) {
      setEditingAddress(address);
      setAddrFormName(address.name);
      setAddrFormPhone(address.phone);
      setAddrFormStreet(address.street);
      setAddrFormCity(address.city);
      setAddrFormState(address.state || 'Andhra Pradesh');
      setAddrFormPostalCode(address.postalCode);
      setAddrFormIsDefault(address.isDefault);
    } else {
      setEditingAddress(null);
      setAddrFormName(user?.name || '');
      setAddrFormPhone(user?.phone || '');
      setAddrFormStreet('');
      setAddrFormCity('Guntur');
      setAddrFormState('Andhra Pradesh');
      setAddrFormPostalCode('522001');
      setAddrFormIsDefault(addresses.length === 0);
    }
    setShowAddressModal(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    // PIN code validation: 6 digits Indian PIN code
    const cleanPin = addrFormPostalCode.trim();
    if (!/^\d{6}$/.test(cleanPin)) {
      addToast('Please enter a valid 6-digit Indian Postal PIN code (e.g. 522001)', 'warning');
      return;
    }

    if (!addrFormName.trim() || !addrFormPhone.trim() || !addrFormStreet.trim() || !addrFormCity.trim()) {
      addToast('Please fill out all required address fields', 'warning');
      return;
    }

    setSavingAddress(true);
    try {
      await AddressService.saveAddress({
        id: editingAddress?.id,
        userId: user.uid,
        addressType: 'shipping',
        name: addrFormName.trim(),
        phone: addrFormPhone.trim(),
        street: addrFormStreet.trim(),
        city: addrFormCity.trim(),
        state: addrFormState.trim(),
        postalCode: cleanPin,
        country: 'India',
        isDefault: addrFormIsDefault
      });
      setShowAddressModal(false);
      await loadAddresses();
      addToast(editingAddress ? 'Address updated successfully!' : 'Address added successfully!', 'success');
    } catch (error) {
      addToast(normalizeError(error).message, 'error');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      await AddressService.deleteAddress(id);
      await loadAddresses();
      addToast('Address deleted successfully', 'info');
    } catch (error) {
      addToast(normalizeError(error).message, 'error');
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    if (!user?.uid) return;
    try {
      await AddressService.setDefaultAddress(user.uid, id);
      await loadAddresses();
      addToast('Default address updated!', 'success');
    } catch (error) {
      addToast(normalizeError(error).message, 'error');
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      addToast('New password must be at least 6 characters long', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('New passwords do not match', 'warning');
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      // notification handled in context
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle Setting Initial Password for Google Users
  const handleSetAccountPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    if (newAccountPassword.length < 6) {
      addToast('New password must be at least 6 characters long', 'warning');
      return;
    }
    if (newAccountPassword !== confirmAccountPassword) {
      addToast('New passwords do not match', 'warning');
      return;
    }

    setSettingAccountPassword(true);
    try {
      const email = firebaseUser.email;
      if (!email) {
        throw new Error('An email address is required to enable password sign-in.');
      }
      const cred = EmailAuthProvider.credential(email, newAccountPassword);
      try {
        await linkWithCredential(firebaseUser, cred);
      } catch (linkErr: any) {
        if (linkErr.code === 'auth/provider-already-linked') {
          await updatePassword(firebaseUser, newAccountPassword);
        } else {
          throw linkErr;
        }
      }
      setNewAccountPassword('');
      setConfirmAccountPassword('');
      await refreshProfile();
      addToast('Password credentials set successfully! You can now sign in with either your password or Google.', 'success');
    } catch (error: any) {
      const norm = normalizeError(error);
      if (norm.code === 'auth/requires-recent-login') {
        addToast('For security, please sign out and sign in again before creating a password, or use the email link below.', 'warning');
      } else {
        addToast(norm.message, 'error');
      }
    } finally {
      setSettingAccountPassword(false);
    }
  };

  // Handle Sending Password Reset / Setup Link to Email
  const handleSendPasswordResetEmail = async () => {
    if (!user?.email) {
      addToast('No email address associated with this account.', 'error');
      return;
    }
    setSendingPasswordReset(true);
    try {
      await AuthService.resetPassword(user.email);
      addToast(`Password setup instructions sent to ${user.email}. Please check your inbox!`, 'success');
    } catch (error: any) {
      addToast(normalizeError(error).message, 'error');
    } finally {
      setSendingPasswordReset(false);
    }
  };

  // Handle Email Verification Resend
  const handleResendEmailVerification = async () => {
    setSendingVerification(true);
    try {
      await sendEmailVerification();
    } catch (error) {
      // notification handled in context
    } finally {
      setSendingVerification(false);
    }
  };

  // Tracking Search Form
  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = trackInputId.trim();
    if (!query) {
      addToast('Please enter an Order ID or Customer ID to search', 'warning');
      return;
    }
    const matched = orders.find(o => o.id === query || o.orderNumber === query || o.customerId === query);
    if (matched) {
      setActiveOrderTrackId(matched.id);
    } else {
      setActiveOrderTrackId(query);
    }
  };

  const providerData = firebaseUser?.providerData || [];
  const isGoogleLinked = providerData.some(p => p.providerId === 'google.com');
  const isPasswordLinked = providerData.some(p => p.providerId === 'password');

  if (isAuthenticating) {
    return (
      <div className="max-w-md mx-auto pt-32 pb-24 px-8 text-center bg-white rounded-3xl border border-slate-100 shadow-xl" id="dashboard-auth-loader">
        <BioCartLoader message="Synchronizing your BioCart customer profile and order history..." size="md" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto pt-32 pb-16 px-8 text-center bg-white rounded-3xl border border-slate-150 shadow-xl">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-full mx-auto flex items-center justify-center mb-4">
          <User className="w-8 h-8" />
        </div>
        <h3 className="font-display font-bold text-xl text-slate-900">Sign in to BioCart Account</h3>
        <p className="text-sm text-slate-500 my-4 leading-relaxed">
          Please log in to manage your orders, saved addresses, wishlist, and profile settings.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              setAuthModalMode('login');
              setAuthModalOpen(true);
            }}
            className="w-full py-3 bg-[#004643] hover:bg-[#003532] text-white rounded-xl text-sm font-semibold transition-all shadow-md cursor-pointer"
          >
            Sign In Now
          </button>
          <button
            onClick={() => {
              setSubView(null);
              setTab('home');
              window.location.hash = '';
            }}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all cursor-pointer"
          >
            Return to Storefront
          </button>
        </div>
      </div>
    );
  }

  // Calculate Metrics from REAL Customer Data
  const totalOrdersCount = orders.length;
  const activeOrdersCount = orders.filter(o => ['pending', 'processing', 'shipped', 'placed'].includes(o.status?.toLowerCase())).length;
  const completedOrdersCount = orders.filter(o => ['delivered', 'completed'].includes(o.status?.toLowerCase())).length;
  const wishlistProducts = realtimeProducts.filter((p) => wishlist.includes(p.id));
  const currentTrackId = trackInputId || activeOrderTrackId || '';
  const isFoundOrder = orders.find(o => o.id === currentTrackId || o.orderNumber === currentTrackId);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-12 sm:pt-32 sm:pb-16" id="customer-dashboard">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-6" id="dashboard-sidebar">
          
          {/* User Profile Summary Card */}
          <div className="p-6 bg-slate-50 border border-slate-200/80 rounded-3xl text-center space-y-3 shadow-sm">
            <div className="relative w-20 h-20 mx-auto">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.name} 
                  className="w-20 h-20 rounded-full object-cover border-2 border-emerald-600 shadow-md" 
                />
              ) : (
                <div className="w-20 h-20 bg-emerald-700 text-white rounded-full mx-auto flex items-center justify-center font-display font-bold text-2xl shadow-md border-2 border-emerald-600/30">
                  {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              )}
              {firebaseUser?.emailVerified && (
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm" title="Verified Account">
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            <div>
              <h4 className="font-display font-bold text-lg text-slate-900 leading-tight">
                {user.name}
              </h4>
              <div className="mt-1.5 flex items-center justify-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer ID:</span>
                <span className="font-mono font-bold text-xs text-emerald-800">
                  {(user as any).customerId || 'Allocating...'}
                </span>
                {(user as any).customerId && (
                  <button
                    type="button"
                    onClick={() => handleCopyCustomerId((user as any).customerId)}
                    className="p-1 text-slate-400 hover:text-emerald-700 transition-colors cursor-pointer"
                    title="Copy Customer ID"
                  >
                    {copiedCustomerId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                {user.role === 'super_admin' ? (
                  <span className="inline-block bg-purple-100 text-purple-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border border-purple-200">
                    Super Admin
                  </span>
                ) : user.role === 'admin' ? (
                  <span className="inline-block bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border border-emerald-200">
                    Administrator
                  </span>
                ) : (
                  <span className="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border border-emerald-200">
                    {user.status || 'Eco Member'}
                  </span>
                )}
                {isGoogleLinked && (
                  <span className="inline-block bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200" title="Google Account Connected">
                    Google
                  </span>
                )}
                {isPasswordLinked && (
                  <span className="inline-block bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-300" title="Password Login Enabled">
                    Password
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-600 truncate px-2">{user.email || user.phone}</p>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col gap-1 bg-slate-50 p-2.5 border border-slate-200/80 rounded-3xl shadow-sm">
            <button
              onClick={() => switchTab('overview')}
              className={`w-full text-left py-3 px-4 rounded-2xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <User className="w-4.5 h-4.5" />
                <span>Overview</span>
              </div>
              <ChevronRight className={`w-4 h-4 ${activeTab === 'overview' ? 'text-white' : 'text-slate-400'}`} />
            </button>

            <button
              onClick={() => switchTab('profile')}
              className={`w-full text-left py-3 px-4 rounded-2xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Edit3 className="w-4.5 h-4.5" />
                <span>Personal Info</span>
              </div>
              <ChevronRight className={`w-4 h-4 ${activeTab === 'profile' ? 'text-white' : 'text-slate-400'}`} />
            </button>

            <button
              onClick={() => switchTab('orders')}
              className={`w-full text-left py-3 px-4 rounded-2xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Package className="w-4.5 h-4.5" />
                <span>My Orders</span>
              </div>
              {orders.length > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'orders' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {orders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                switchTab('track');
                if (activeOrderTrackId) setTrackInputId(activeOrderTrackId);
              }}
              className={`w-full text-left py-3 px-4 rounded-2xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'track'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Truck className="w-4.5 h-4.5" />
                <span>Track Orders</span>
              </div>
              <ChevronRight className={`w-4 h-4 ${activeTab === 'track' ? 'text-white' : 'text-slate-400'}`} />
            </button>

            <button
              onClick={() => switchTab('wishlist')}
              className={`w-full text-left py-3 px-4 rounded-2xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'wishlist'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Heart className={`w-4.5 h-4.5 ${activeTab === 'wishlist' ? 'fill-current text-white' : 'text-rose-500 fill-current'}`} />
                <span>Wishlist</span>
              </div>
              {wishlist.length > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'wishlist' ? 'bg-emerald-800 text-white' : 'bg-rose-100 text-rose-700'
                }`}>
                  {wishlist.length}
                </span>
              )}
            </button>

            <button
              onClick={() => switchTab('addresses')}
              className={`w-full text-left py-3 px-4 rounded-2xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'addresses'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4.5 h-4.5" />
                <span>Saved Addresses</span>
              </div>
              {addresses.length > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'addresses' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {addresses.length}
                </span>
              )}
            </button>

            <button
              onClick={() => switchTab('security')}
              className={`w-full text-left py-3 px-4 rounded-2xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Lock className="w-4.5 h-4.5" />
                <span>Security & Settings</span>
              </div>
              <ChevronRight className={`w-4 h-4 ${activeTab === 'security' ? 'text-white' : 'text-slate-400'}`} />
            </button>

            <div className="h-[1px] bg-slate-200 my-1" />

            <button
              onClick={logout}
              className="w-full text-left py-3 px-4 rounded-2xl text-sm font-semibold flex items-center gap-2.5 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4.5 h-4.5" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Quick Helpful Links */}
          <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-3xl space-y-3 text-xs text-slate-600">
            <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Help & Policies</h5>
            <ul className="space-y-2">
              <li>
                <button onClick={() => setTab('contact-us')} className="hover:text-emerald-700 flex items-center gap-1.5 cursor-pointer">
                  <ExternalLink className="w-3 h-3" />
                  <span>Contact Agri-Expert</span>
                </button>
              </li>
              <li>
                <button onClick={() => setTab('shipping-and-customs')} className="hover:text-emerald-700 flex items-center gap-1.5 cursor-pointer">
                  <ExternalLink className="w-3 h-3" />
                  <span>Shipping & Delivery Policy</span>
                </button>
              </li>
              <li>
                <button onClick={() => setTab('returns-and-refunds')} className="hover:text-emerald-700 flex items-center gap-1.5 cursor-pointer">
                  <ExternalLink className="w-3 h-3" />
                  <span>Returns & Refunds</span>
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Right Main Content Area */}
        <div className="lg:col-span-3 bg-white border border-slate-200/80 p-6 sm:p-8 rounded-3xl shadow-sm min-h-[500px]" id="dashboard-main-content">
          
          {/* SECTION A: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8" id="panel-overview">
              <div>
                <h3 className="font-display font-bold text-2xl text-slate-900">Welcome, {user.name}</h3>
                <p className="text-sm text-slate-500 mt-1">Here is a quick snapshot of your BioCart green shopping account.</p>
              </div>

              {/* Real Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div 
                  onClick={() => switchTab('orders')}
                  className="p-5 bg-emerald-50/60 border border-emerald-100 rounded-2xl hover:border-emerald-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-emerald-800">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Orders</span>
                    <Package className="w-4.5 h-4.5" />
                  </div>
                  <p className="text-2xl font-display font-bold text-emerald-950 mt-2">{totalOrdersCount}</p>
                </div>

                <div 
                  onClick={() => switchTab('orders')}
                  className="p-5 bg-amber-50/60 border border-amber-100 rounded-2xl hover:border-amber-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-amber-800">
                    <span className="text-xs font-bold uppercase tracking-wider">Active</span>
                    <Clock className="w-4.5 h-4.5" />
                  </div>
                  <p className="text-2xl font-display font-bold text-amber-950 mt-2">{activeOrdersCount}</p>
                </div>

                <div 
                  onClick={() => switchTab('wishlist')}
                  className="p-5 bg-rose-50/60 border border-rose-100 rounded-2xl hover:border-rose-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-rose-800">
                    <span className="text-xs font-bold uppercase tracking-wider">Wishlist</span>
                    <Heart className="w-4.5 h-4.5 fill-current" />
                  </div>
                  <p className="text-2xl font-display font-bold text-rose-950 mt-2">{wishlist.length}</p>
                </div>

                <div 
                  onClick={() => switchTab('addresses')}
                  className="p-5 bg-blue-50/60 border border-blue-100 rounded-2xl hover:border-blue-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-blue-800">
                    <span className="text-xs font-bold uppercase tracking-wider">Addresses</span>
                    <MapPin className="w-4.5 h-4.5" />
                  </div>
                  <p className="text-2xl font-display font-bold text-blue-950 mt-2">{addresses.length}</p>
                </div>
              </div>

              {/* Account Quick Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-emerald-700" />
                      <span>Email Authentication</span>
                    </h4>
                    {firebaseUser?.emailVerified ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Verified
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        Pending Verification
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 truncate">{user.email || 'No email attached'}</p>
                  {!firebaseUser?.emailVerified && user.email && (
                    <button
                      onClick={handleResendEmailVerification}
                      disabled={sendingVerification}
                      className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      {sendingVerification ? 'Sending link…' : 'Send verification email'}
                    </button>
                  )}
                </div>

                <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-700" />
                      <span>Registered Contact</span>
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Primary
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{user.phone || 'No phone number provided'}</p>
                  <button
                    onClick={() => switchTab('profile')}
                    className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Update contact details
                  </button>
                </div>
              </div>

              {/* Recent Orders Preview */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base text-slate-900">Recent Purchases</h4>
                  {orders.length > 0 && (
                    <button
                      onClick={() => switchTab('orders')}
                      className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      View All Orders ({orders.length})
                    </button>
                  )}
                </div>

                {loadingOrders ? (
                  <div className="py-8 text-center text-slate-400">Loading order records...</div>
                ) : orders.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                    <ShoppingBag className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">No purchases yet</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Explore our organic fertilizers, potting mixes, and eco-friendly gardening gear.
                    </p>
                    <button
                      onClick={() => setTab('shop')}
                      className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      Explore BioCart Shop
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 3).map((ord) => (
                      <div 
                        key={ord.id} 
                        className="p-4 border border-slate-200 rounded-2xl bg-white hover:border-emerald-300 transition-all flex flex-wrap items-center justify-between gap-3 shadow-xs"
                      >
                        <div>
                          <span className="font-mono text-xs font-bold text-emerald-800">{ord.id}</span>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Placed on {ord.createdAt ? new Date(ord.createdAt?.seconds ? ord.createdAt.seconds * 1000 : ord.createdAt).toLocaleDateString('en-IN') : 'Recent'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                            ord.status?.toLowerCase() === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {ord.status || 'Processing'}
                          </span>
                          <span className="text-sm font-bold text-slate-900">₹{ord.totalAmount || ord.total || 0}</span>
                          <button
                            onClick={() => {
                              setSelectedOrderDetails(ord);
                              switchTab('orders');
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 cursor-pointer"
                            title="View Details"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* SECTION B: PERSONAL INFORMATION */}
          {activeTab === 'profile' && (
            <div className="space-y-6" id="panel-profile">
              <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-2xl text-slate-900">Personal Information</h3>
                  <p className="text-xs text-slate-500 mt-1">Manage your identity details, contact numbers, and default shipping hub.</p>
                </div>
                {!editingProfile && (
                  <button
                    onClick={() => setEditingProfile(true)}
                    className="px-4 py-2 border border-slate-300 hover:border-emerald-600 hover:text-emerald-700 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Info</span>
                  </button>
                )}
              </div>

              {/* Permanent BioCart Customer ID Card */}
              <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs" id="permanent-customer-id-card">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">Customer ID</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                      Permanent Account Code
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-950 mt-1.5 tracking-tight" id="customer-id-display">
                    {(user as any).customerId || 'Allocating Customer ID...'}
                  </div>
                  <p className="text-xs text-emerald-800 mt-1">
                    Your unique identifier for order dispatch, support inquiries, and parcel tracking across BioCart.
                  </p>
                </div>
                {(user as any).customerId && (
                  <button
                    type="button"
                    onClick={() => handleCopyCustomerId((user as any).customerId)}
                    className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-center"
                    id="copy-customer-id-btn"
                  >
                    {copiedCustomerId ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-emerald-600" />
                        <span>Copy Customer ID</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Full Name *</label>
                    <input
                      type="text"
                      disabled={!editingProfile || savingProfile}
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      required
                      className={`w-full px-4 py-3 rounded-xl border text-sm transition-all ${
                        editingProfile 
                          ? 'bg-white border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-slate-900' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed'
                      }`}
                    />
                  </div>

                  {/* Registered Email (Protected Identity Field) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>Email Address</span>
                      <span className="text-[10px] text-slate-400 font-normal">Primary Login ID</span>
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl text-sm cursor-not-allowed"
                    />
                  </div>

                  {/* Contact Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Mobile Number</label>
                    <input
                      type="text"
                      disabled={!editingProfile || savingProfile}
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className={`w-full px-4 py-3 rounded-xl border text-sm transition-all ${
                        editingProfile 
                          ? 'bg-white border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-slate-900' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed'
                      }`}
                    />
                  </div>

                  {/* Default Shipping Hub */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Preferred Shipping Region</label>
                    <input
                      type="text"
                      disabled={!editingProfile || savingProfile}
                      value={profileLocation}
                      onChange={(e) => setProfileLocation(e.target.value)}
                      placeholder="e.g. Guntur, Andhra Pradesh"
                      className={`w-full px-4 py-3 rounded-xl border text-sm transition-all ${
                        editingProfile 
                          ? 'bg-white border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-slate-900' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed'
                      }`}
                    />
                  </div>
                </div>

                {editingProfile && (
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                    </button>
                    <button
                      type="button"
                      disabled={savingProfile}
                      onClick={() => {
                        setEditingProfile(false);
                        setProfileName(user.name);
                        setProfilePhone(user.phone || '');
                        setProfileLocation(user.location || '');
                      }}
                      className="px-5 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </form>

              {/* BioCart Membership Note */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex gap-3 text-xs text-emerald-800">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-700" />
                <p className="leading-relaxed">
                  Your BioCart Eco Membership is currently active. Enjoy free carbon-neutral shipping on any purchase of ₹1,499 and above and priority dispatch from our Guntur processing units.
                </p>
              </div>

              {/* Google Link Status */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Google Single Sign-On</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {googleLinked 
                      ? 'Your BioCart account is linked to Google sign-in.' 
                      : 'Connect your Google account for one-click authentication.'}
                  </p>
                </div>
                {!googleLinked ? (
                  <button 
                    type="button" 
                    onClick={handleLinkGoogle} 
                    disabled={linkingGoogle} 
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                  >
                    <Link2 className="w-4 h-4 text-emerald-700" />
                    <span>{linkingGoogle ? 'Connecting Google…' : 'Link Google Account'}</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
                    <Check className="w-3.5 h-3.5" />
                    <span>Linked</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* SECTION C: MY ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-6" id="panel-orders">
              <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-2xl text-slate-900">Order History</h3>
                  <p className="text-xs text-slate-500 mt-1">Review invoices, order snapshots, and delivery timelines.</p>
                </div>
                {selectedOrderDetails && (
                  <button
                    onClick={() => setSelectedOrderDetails(null)}
                    className="px-3.5 py-1.5 border border-slate-300 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
                  >
                    Back to All Orders
                  </button>
                )}
              </div>

              {loadingOrders ? (
                <div className="py-16 text-center text-slate-400">Loading purchase records...</div>
              ) : selectedOrderDetails ? (
                /* Order Details View */
                <div className="space-y-6" id="order-details-view">
                  <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-emerald-800">{selectedOrderDetails.id}</span>
                          {(selectedOrderDetails.customerId || (user as any).customerId) && (
                            <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200" title="Customer Identifier">
                              Customer: {selectedOrderDetails.customerId || (user as any).customerId}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Order Date: {selectedOrderDetails.createdAt ? new Date(selectedOrderDetails.createdAt?.seconds ? selectedOrderDetails.createdAt.seconds * 1000 : selectedOrderDetails.createdAt).toLocaleString('en-IN') : 'Recent'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                          {selectedOrderDetails.status || 'Confirmed'}
                        </span>
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 uppercase">
                          Payment: {selectedOrderDetails.paymentMethod || 'COD'}
                        </span>
                      </div>
                    </div>

                    <div className="h-[1px] bg-slate-200" />

                    {/* Order Items */}
                    <div>
                      <h5 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-3">Purchased Items</h5>
                      <div className="space-y-2">
                        {(selectedOrderDetails.items || []).map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 text-sm">
                            <div>
                              <p className="font-semibold text-slate-900">{item.name}</p>
                              <p className="text-xs text-slate-500">Qty: {item.qty || item.quantity || 1} × ₹{item.price || 0}</p>
                            </div>
                            <span className="font-bold text-slate-900">
                              ₹{(item.price || 0) * (item.qty || item.quantity || 1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Price Breakdown */}
                    <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>₹{selectedOrderDetails.subtotal || selectedOrderDetails.total || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shipping Charges</span>
                        <span>₹{selectedOrderDetails.shippingAmount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST / Taxes</span>
                        <span>₹{selectedOrderDetails.taxAmount || 0}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                        <span>Total Paid</span>
                        <span className="text-emerald-700">₹{selectedOrderDetails.totalAmount || selectedOrderDetails.total || 0}</span>
                      </div>
                    </div>

                    {/* Shipping Address Snapshot */}
                    {selectedOrderDetails.shippingAddress && (
                      <div className="pt-3 border-t border-slate-200">
                        <h5 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-2">Shipping Destination Snapshot</h5>
                        <p className="text-xs text-slate-800 font-semibold">{selectedOrderDetails.shippingAddress.name} ({selectedOrderDetails.shippingAddress.phone})</p>
                        <p className="text-xs text-slate-600">{selectedOrderDetails.shippingAddress.address || selectedOrderDetails.shippingAddress.street}</p>
                        <p className="text-xs text-slate-600">
                          {selectedOrderDetails.shippingAddress.city}, {selectedOrderDetails.shippingAddress.state} - {selectedOrderDetails.shippingAddress.zip || selectedOrderDetails.shippingAddress.postalCode}
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      {['placed', 'processing', 'awaiting_payment'].includes((selectedOrderDetails.status || '').toLowerCase()) && (
                        <button
                          onClick={() => handleCancelOrder(selectedOrderDetails.id)}
                          disabled={cancellingOrderId === selectedOrderDetails.id}
                          className="px-4 py-2 border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {cancellingOrderId === selectedOrderDetails.id ? 'Cancelling...' : 'Cancel Order'}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setActiveOrderTrackId(selectedOrderDetails.id);
                          setTrackInputId(selectedOrderDetails.id);
                          switchTab('track');
                        }}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Truck className="w-4 h-4" />
                        <span>Track Live Status</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-16 text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-8 space-y-3">
                  <Package className="w-10 h-10 text-slate-400 mx-auto" />
                  <h4 className="font-bold text-base text-slate-900">No Orders Placed Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    When you purchase organic agricultural products on BioCart, your confirmed invoices and order history will appear here.
                  </p>
                  <button
                    onClick={() => setTab('shop')}
                    className="mt-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-4" id="orders-list">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="p-5 border border-slate-200 rounded-2xl bg-white hover:border-emerald-300 transition-all shadow-xs space-y-3"
                    >
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-emerald-800">{order.id}</span>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Purchased on {order.createdAt ? new Date(order.createdAt?.seconds ? order.createdAt.seconds * 1000 : order.createdAt).toLocaleDateString('en-IN') : 'Recent'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                            order.status?.toLowerCase() === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {order.status || 'Processing'}
                          </span>
                          <span className="text-sm font-bold text-slate-900">₹{order.totalAmount || order.total || 0}</span>
                        </div>
                      </div>

                      <div className="h-[1px] bg-slate-100" />

                      <ul className="space-y-1.5">
                        {(order.items || []).map((item: any, idx: number) => (
                          <li key={idx} className="flex justify-between text-xs text-slate-700">
                            <span>{item.name} <strong className="text-slate-400">x{item.qty || item.quantity || 1}</strong></span>
                            <span>₹{(item.price || 0) * (item.qty || item.quantity || 1)}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setSelectedOrderDetails(order)}
                            className="text-xs font-bold text-slate-600 hover:text-emerald-700 cursor-pointer"
                          >
                            View Full Invoice & Snapshot
                          </button>
                          {['placed', 'processing', 'awaiting_payment'].includes((order.status || '').toLowerCase()) && (
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              disabled={cancellingOrderId === order.id}
                              className="text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer disabled:opacity-50"
                            >
                              {cancellingOrderId === order.id ? 'Cancelling...' : 'Cancel'}
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setActiveOrderTrackId(order.id);
                            setTrackInputId(order.id);
                            switchTab('track');
                          }}
                          className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Track Shipment</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION D: TRACK ACTIVE ORDER */}
          {activeTab === 'track' && (
            <div className="space-y-6" id="panel-track">
              <div className="border-b border-slate-200 pb-4">
                <h3 className="font-display font-bold text-2xl text-slate-900">Shipment Status Tracker</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your BioCart Order ID to retrieve real-time fulfillment status from our distribution center.
                </p>
              </div>

              {/* ID Input Search */}
              <form onSubmit={handleTrackSubmit} className="flex gap-2" id="track-search-form">
                <div className="relative flex-grow">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Enter Order ID (e.g. BC-548123 or Firestore Document ID)"
                    value={trackInputId}
                    onChange={(e) => setTrackInputId(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-600 focus:bg-white focus:outline-none text-sm text-slate-900 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer flex-shrink-0 shadow-md"
                >
                  Locate
                </button>
              </form>

              {/* Tracking Visualization */}
              {trackingShipments.length > 0 ? (
                <div className="space-y-6 pt-2" id="ekart-multi-package-tracking">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between text-xs font-semibold gap-2">
                    <div className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-emerald-700" />
                      <div>
                        <span className="text-slate-500">Logistics Carrier:</span>
                        <strong className="text-emerald-950 ml-1.5 font-bold">EKART Express Logistics</strong>
                      </div>
                    </div>
                    <div className="text-emerald-800 font-mono text-[11px]">
                      {trackingShipments.length} Package{trackingShipments.length > 1 ? 's' : ''} in Consignment
                    </div>
                  </div>

                  <div className="space-y-4">
                    {trackingShipments.map((shp, idx) => {
                      const awb = shp.trackingNumber || shp.waybill || 'N/A';
                      const liveData = liveEKARTTracking[awb];
                      const isLoadingAwb = loadingLiveAwb === awb;
                      const scans = liveData?.scans || shp.scans || [];

                      return (
                        <div key={shp.id || idx} className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-emerald-600" />
                                <span className="text-xs font-bold text-slate-900">
                                  Package #{idx + 1} • {shp.vendorId ? `Vendor: ${shp.vendorId}` : 'BioCart Hub'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-mono text-xs font-bold text-emerald-700">AWB: {awb}</span>
                                {awb !== 'N/A' && (
                                  <button
                                    onClick={() => handleCopyCustomerId(awb)}
                                    className="p-1 text-slate-400 hover:text-slate-600"
                                    title="Copy AWB"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  (liveData?.status || shp.status) === 'delivered'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : ['in_transit', 'out_for_delivery', 'manifested'].includes(liveData?.status || shp.status)
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {(liveData?.status || shp.status || 'manifested').replace(/_/g, ' ')}
                              </span>

                              {awb !== 'N/A' && (
                                <button
                                  onClick={() => handleFetchLiveTracking(awb)}
                                  disabled={isLoadingAwb}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                  title="Query live EKART tracking"
                                >
                                  {isLoadingAwb ? (
                                    <RefreshCw className="w-3 h-3 animate-spin text-emerald-600" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3" />
                                  )}
                                  Refresh Scans
                                </button>
                              )}
                            </div>
                          </div>

                          {(liveData?.expectedDeliveryDate || shp.expectedDeliveryDate) && (
                            <div className="text-xs text-slate-600 flex items-center gap-1.5 bg-slate-50 p-2.5 rounded-xl">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                Estimated Delivery:{' '}
                                <strong className="text-slate-900">
                                  {new Date(liveData?.expectedDeliveryDate || shp.expectedDeliveryDate || '').toLocaleDateString('en-IN', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short'
                                  })}
                                </strong>
                              </span>
                            </div>
                          )}

                          {/* Scans Timeline */}
                          <div>
                            <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                              EKART Courier Scans
                            </h5>
                            {scans.length > 0 ? (
                              <div className="relative border-l-2 border-slate-200 ml-2.5 space-y-3 py-1">
                                {scans.map((scan, sIdx) => (
                                  <div key={sIdx} className="relative pl-4">
                                    <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-600 border-2 border-white" />
                                    <div className="text-xs font-semibold text-slate-800">
                                      {scan.instructions || scan.status}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      {scan.location ? `${scan.location} • ` : ''}
                                      {scan.timestamp ? new Date(scan.timestamp).toLocaleString('en-IN') : ''}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">
                                Package manifested with EKART. Click "Refresh Scans" once the package is picked up.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : currentTrackId && isFoundOrder ? (
                <div className="space-y-8 pt-4" id="tracking-visualization">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between text-xs font-semibold gap-2">
                    <div>
                      <span className="text-slate-500">Tracking Reference:</span>
                      <strong className="font-mono text-emerald-900 ml-1.5">{currentTrackId}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Dispatch Node:</span>
                      <strong className="text-emerald-900 ml-1.5">Guntur (Sindulis Agro Units)</strong>
                    </div>
                  </div>

                  {/* Step List Timeline */}
                  <div className="relative pl-8 space-y-8 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200" id="tracking-steps">
                    {/* Step 1 */}
                    <div className="relative flex items-start gap-4">
                      <div className="absolute -left-8 w-7 h-7 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
                        <CheckCircle2 className="w-4 h-4 fill-current" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900">Order Registered & Approved</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Payment confirmed via BioCart secure checkout ledger.</p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="relative flex items-start gap-4">
                      <div className="absolute -left-8 w-7 h-7 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
                        <CheckCircle2 className="w-4 h-4 fill-current" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900">Packaging at Guntur Hub</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Packaged utilizing 100% plastic-free biodegradable materials.</p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="relative flex items-start gap-4">
                      <div className={`absolute -left-8 w-7 h-7 rounded-full flex items-center justify-center border ${
                        ['shipped', 'delivered'].includes(isFoundOrder.status?.toLowerCase())
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                          : 'bg-slate-100 border-slate-300 text-slate-400'
                      }`}>
                        {['shipped', 'delivered'].includes(isFoundOrder.status?.toLowerCase()) ? (
                          <CheckCircle2 className="w-4 h-4 fill-current" />
                        ) : (
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-ping" />
                        )}
                      </div>
                      <div className={!['shipped', 'delivered'].includes(isFoundOrder.status?.toLowerCase()) ? 'opacity-60' : ''}>
                        <h4 className="font-semibold text-sm text-slate-900">Dispatched with EKART</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Enroute via partner agricultural transport logistics.</p>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="relative flex items-start gap-4">
                      <div className={`absolute -left-8 w-7 h-7 rounded-full flex items-center justify-center border ${
                        isFoundOrder.status?.toLowerCase() === 'delivered'
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                          : 'bg-slate-100 border-slate-300 text-slate-400'
                      }`}>
                        {isFoundOrder.status?.toLowerCase() === 'delivered' ? (
                          <CheckCircle2 className="w-4 h-4 fill-current" />
                        ) : (
                          <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                        )}
                      </div>
                      <div className={isFoundOrder.status?.toLowerCase() !== 'delivered' ? 'opacity-50' : ''}>
                        <h4 className="font-semibold text-sm text-slate-900">Delivered Successfully</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Order verified and handed over at destination address.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : currentTrackId ? (
                <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="font-semibold text-slate-800">Reference "{currentTrackId}" not found in your orders.</p>
                  <p className="text-xs text-slate-500">Please enter a valid BioCart Order Number or EKART AWB.</p>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Truck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Enter an Order ID or EKART AWB above to view shipment progress.</p>
                </div>
              )}
            </div>
          )}

          {/* SECTION E: WISHLIST */}
          {activeTab === 'wishlist' && (
            <div className="space-y-6" id="panel-wishlist">
              <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-2xl text-slate-900 flex items-center gap-2">
                    <Heart className="w-6 h-6 fill-rose-500 text-rose-500" />
                    <span>My Wishlist</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Saved products for your sustainable farm and garden.</p>
                </div>
                <span className="bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                  {wishlistProducts.length} {wishlistProducts.length === 1 ? 'Item' : 'Items'}
                </span>
              </div>

              {wishlistProducts.length === 0 ? (
                <div className="text-center py-16 text-slate-500 flex flex-col items-center justify-center space-y-4 bg-slate-50 rounded-2xl p-8 border border-dashed border-slate-200">
                  <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center">
                    <Heart className="w-8 h-8 text-rose-500" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-base text-slate-900">Your wishlist is currently empty</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Explore the BioCart catalog and tap the heart icon on any product to save it here for later.
                    </p>
                  </div>
                  <button
                    onClick={() => setTab('shop')}
                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    Browse Organic Catalog
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="wishlist-grid">
                  {wishlistProducts.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      isWishlisted={true}
                      onToggleWishlist={toggleWishlist}
                      onQuickView={(prod) => {
                        setActiveProductDetails(prod);
                        setTab('product-details');
                      }}
                      onAddToCart={(prod) => {
                        addToCart(prod, 1);
                        addToast(`Added ${prod.name} to cart!`, 'success');
                      }}
                      onBuyNow={(prod) => {
                        addToCart(prod, 1);
                        setCartOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION F: SAVED ADDRESSES */}
          {activeTab === 'addresses' && (
            <div className="space-y-6" id="panel-addresses">
              <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-2xl text-slate-900">Saved Addresses</h3>
                  <p className="text-xs text-slate-500 mt-1">Manage delivery locations and set your primary shipping node.</p>
                </div>
                <button
                  onClick={() => handleOpenAddressModal()}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Address</span>
                </button>
              </div>

              {loadingAddresses ? (
                <div className="py-16 text-center text-slate-400">Loading saved addresses...</div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-16 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-8 space-y-3">
                  <MapPin className="w-10 h-10 text-slate-400 mx-auto" />
                  <h4 className="font-bold text-base text-slate-900">No Addresses Saved</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Add your farm or home delivery address for faster one-click checkout.
                  </p>
                  <button
                    onClick={() => handleOpenAddressModal()}
                    className="mt-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    Add Your First Address
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="address-grid">
                  {addresses.map((addr) => (
                    <div 
                      key={addr.id} 
                      className={`p-5 rounded-2xl border transition-all space-y-3 relative ${
                        addr.isDefault 
                          ? 'border-emerald-600 bg-emerald-50/30 shadow-xs' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{addr.name}</span>
                          {addr.isDefault && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenAddressModal(addr)}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                            title="Edit Address"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                            title="Delete Address"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {addr.street}<br />
                        {addr.city}, {addr.state} - <strong className="font-mono text-slate-900">{addr.postalCode}</strong><br />
                        {addr.country}
                      </p>

                      <p className="text-xs text-slate-700 font-semibold flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{addr.phone}</span>
                      </p>

                      {!addr.isDefault && (
                        <div className="pt-2 border-t border-slate-100">
                          <button
                            onClick={() => handleSetDefaultAddress(addr.id)}
                            className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                          >
                            Set as Default Shipping Address
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Address Edit/Add Modal */}
              {showAddressModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                  <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="font-display font-bold text-lg text-slate-900">
                        {editingAddress ? 'Edit Address' : 'Add New Delivery Address'}
                      </h4>
                      <button
                        onClick={() => setShowAddressModal(false)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveAddress} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Recipient Name *</label>
                          <input
                            type="text"
                            required
                            value={addrFormName}
                            onChange={(e) => setAddrFormName(e.target.value)}
                            placeholder="Full Name"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-emerald-600 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Mobile Number *</label>
                          <input
                            type="text"
                            required
                            value={addrFormPhone}
                            onChange={(e) => setAddrFormPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-emerald-600 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Street Address / House / Landmark *</label>
                        <input
                          type="text"
                          required
                          value={addrFormStreet}
                          onChange={(e) => setAddrFormStreet(e.target.value)}
                          placeholder="Plot No., Street, Landmark"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-emerald-600 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">City / District *</label>
                          <input
                            type="text"
                            required
                            value={addrFormCity}
                            onChange={(e) => setAddrFormCity(e.target.value)}
                            placeholder="Guntur"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-emerald-600 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">State *</label>
                          <input
                            type="text"
                            required
                            value={addrFormState}
                            onChange={(e) => setAddrFormState(e.target.value)}
                            placeholder="Andhra Pradesh"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-emerald-600 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Postal PIN Code *</label>
                          <input
                            type="text"
                            required
                            maxLength={6}
                            value={addrFormPostalCode}
                            onChange={(e) => setAddrFormPostalCode(e.target.value)}
                            placeholder="522001"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:border-emerald-600 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id="is-default-checkbox"
                          checked={addrFormIsDefault}
                          onChange={(e) => setAddrFormIsDefault(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                        <label htmlFor="is-default-checkbox" className="text-xs text-slate-700 font-semibold cursor-pointer">
                          Make this my default shipping address
                        </label>
                      </div>

                      <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setShowAddressModal(false)}
                          className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingAddress}
                          className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                        >
                          {savingAddress ? 'Saving...' : 'Save Address'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION G: ACCOUNT SECURITY & SETTINGS */}
          {activeTab === 'security' && (
            <div className="space-y-8" id="panel-security">
              <div className="border-b border-slate-200 pb-4">
                <h3 className="font-display font-bold text-2xl text-slate-900">Security & Account Settings</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Manage your credentials, connected sign-in providers, and administrative status.
                </p>
              </div>

              {/* Connected Sign-In Methods Status */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4.5 h-4.5 text-emerald-700" />
                    <span>Connected Authentication Methods</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your active sign-in credentials associated with BioCart Account UID <span className="font-mono text-slate-700">{user.uid}</span>.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Google Provider Card */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    isGoogleLinked 
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                          </svg>
                        </div>
                        <div>
                          <h5 className="font-bold text-sm">Google Authentication</h5>
                          <p className="text-[11px] opacity-75">{user.email || 'Google Account'}</p>
                        </div>
                      </div>
                      {isGoogleLinked ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                          <Check className="w-3 h-3" />
                          <span>Linked</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleLinkGoogle}
                          disabled={linkingGoogle}
                          className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-50 cursor-pointer disabled:opacity-50"
                        >
                          {linkingGoogle ? 'Linking...' : 'Connect'}
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] mt-3 opacity-80 leading-relaxed">
                      {isGoogleLinked
                        ? 'Google OAuth login is active and verified for this account.'
                        : 'Link your Google account to log in with 1-click.'}
                    </p>
                  </div>

                  {/* Password Provider Card */}
                  <div className={`p-4 rounded-2xl border transition-all ${
                    isPasswordLinked 
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' 
                      : 'bg-amber-50/60 border-amber-200 text-amber-950'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center shadow-xs ${
                          isPasswordLinked ? 'bg-white border-slate-200 text-emerald-700' : 'bg-white border-amber-200 text-amber-600'
                        }`}>
                          <Key className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-bold text-sm">Email & Password</h5>
                          <p className="text-[11px] opacity-75">{isPasswordLinked ? 'Active Password Protection' : 'Not Configured'}</p>
                        </div>
                      </div>
                      {isPasswordLinked ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                          <Check className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                          <span>Google Only</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] mt-3 opacity-80 leading-relaxed">
                      {isPasswordLinked
                        ? 'Standard email and password credentials are registered and enabled.'
                        : 'No password is set yet. Set a password below to enable direct email & password sign-in.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Password Management Form: Changes dynamically based on provider status */}
              {isPasswordLinked ? (
                /* CASE A: User has password enabled -> Change Password Form */
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <Lock className="w-4.5 h-4.5 text-emerald-700" />
                      <span>Change Account Password</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Enter your current password to authorize a password change. Minimum 6 characters.
                    </p>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-md bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Current Password *</label>
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:border-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">New Password *</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:border-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Confirm New Password *</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:border-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        type="submit"
                        disabled={changingPassword}
                        className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                      >
                        {changingPassword ? 'Updating Password...' : 'Update Password'}
                      </button>
                      <button
                        type="button"
                        onClick={handleSendPasswordResetEmail}
                        disabled={sendingPasswordReset}
                        className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer text-center"
                      >
                        {sendingPasswordReset ? 'Sending reset link...' : 'Forgot current password? Send reset link to email'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* CASE B: Google-only user -> Set Password Form without requiring current password */
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <Key className="w-4.5 h-4.5 text-emerald-700" />
                      <span>Set Account Password</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Create a password to enable logging in directly with your email without relying solely on Google Sign-In.
                    </p>
                  </div>

                  <div className="max-w-md bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        Your account was authenticated using <strong>Google Sign-In</strong>. You do not need an existing password. Setting a password will link email & password login while keeping your Google access completely intact.
                      </p>
                    </div>

                    <form onSubmit={handleSetAccountPassword} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">New Account Password *</label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={newAccountPassword}
                          onChange={(e) => setNewAccountPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:border-emerald-600 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Confirm Password *</label>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={confirmAccountPassword}
                          onChange={(e) => setConfirmAccountPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:border-emerald-600 focus:outline-none"
                        />
                      </div>

                      <div className="pt-2 flex flex-col gap-2">
                        <button
                          type="submit"
                          disabled={settingAccountPassword}
                          className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                        >
                          {settingAccountPassword ? 'Linking Password...' : 'Save Account Password'}
                        </button>
                        <button
                          type="button"
                          onClick={handleSendPasswordResetEmail}
                          disabled={sendingPasswordReset}
                          className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer text-center"
                        >
                          {sendingPasswordReset ? 'Sending link...' : 'Prefer email? Send password setup link to my email'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Email Verification Section */}
              <div className="pt-6 border-t border-slate-200 space-y-3">
                <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Mail className="w-4.5 h-4.5 text-emerald-700" />
                  <span>Email Verification</span>
                </h4>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-800 font-semibold">{user.email || 'No email attached'}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {firebaseUser?.emailVerified 
                        ? 'Your email is officially verified with Firebase Authentication.' 
                        : 'Unverified. Verify to ensure access recovery and administrative roles.'}
                    </p>
                  </div>
                  {!firebaseUser?.emailVerified && user.email && (
                    <button
                      onClick={handleResendEmailVerification}
                      disabled={sendingVerification}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    >
                      {sendingVerification ? 'Sending...' : 'Send Verification Link'}
                    </button>
                  )}
                  {firebaseUser?.emailVerified && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
                      <Check className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Theme Settings (Default Light Theme Preserved) */}
              <div className="pt-6 border-t border-slate-200 space-y-3">
                <h4 className="font-bold text-base text-slate-900">Theme & Display Mode</h4>
                <p className="text-xs text-slate-500">BioCart operates with crisp light theme as our canonical sustainable brand design.</p>
                <div className="max-w-xs p-3.5 rounded-2xl border-2 border-emerald-600 bg-emerald-50 text-emerald-950 font-bold text-xs flex items-center justify-between shadow-xs">
                  <span>Light Theme (BioCart Eco Default)</span>
                  <Check className="w-4 h-4 text-emerald-700" />
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
export default Dashboard;
