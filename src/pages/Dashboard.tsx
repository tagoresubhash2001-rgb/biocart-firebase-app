import React, { useState, useEffect } from 'react';
import { linkWithPopup } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useApp } from '../context/AppContext';
import { User, Package, MapPin, Heart, LogOut, Search, CheckCircle2, ChevronRight, Truck, Link2 } from 'lucide-react';
import { AdminService } from '../services/AdminService';
import { auth, googleProvider } from '../config/firebase';
import { normalizeError } from '../utils/errors';
import { Product } from '../types';
import { ProductCard } from '../components/ui/ProductCard';

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
    setTab
  } = useApp();

    const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'track' | 'wishlist'>('profile');
  const [trackInputId, setTrackInputId] = useState(activeOrderTrackId || '');
  const [realtimeProducts, setRealtimeProducts] = useState<Product[]>([]);
  const [googleLinked, setGoogleLinked] = useState(() => auth.currentUser?.providerData.some((provider) => provider.providerId === 'google.com') ?? false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);

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

  useEffect(() => {
    const unsub = AdminService.subscribeToProducts((list) => {
      setRealtimeProducts(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
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
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 text-center bg-white dark:bg-charcoal-900 rounded-3xl border border-black/5 shadow-xl">
        <User className="w-12 h-12 mx-auto text-charcoal-400 mb-4" />
        <h3 className="font-display font-bold text-xl text-nature-900 dark:text-nature-400">Access Dashboard</h3>
        <p className="text-sm text-charcoal-500 mb-6">Please log in to manage your premium orders and sustainable items.</p>
      </div>
    );
  }

  // Pre-seeded mock orders
  

  // If there's an active order tracked, add it dynamically
  

  const wishlistProducts = realtimeProducts.filter((p) => wishlist.includes(p.id));

  // Determine current tracked order status
  const currentTrackId = trackInputId || activeOrderTrackId || '';
  const isFoundOrder = orders.find(o => o.id === currentTrackId) || (orders.some(o => o.id === currentTrackId));

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackInputId) {
      addToast('Please enter an Order ID to search', 'warning');
      return;
    }
    setActiveOrderTrackId(trackInputId);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12" id="customer-dashboard">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="md:col-span-1 space-y-6" id="dashboard-sidebar">
          {/* User profile card */}
          <div className="p-6 bg-slate-50 dark:bg-charcoal-800/40 border border-slate-150 dark:border-white/5 rounded-3xl text-center space-y-3">
            <div className="w-16 h-16 bg-nature-700 text-white rounded-full mx-auto flex items-center justify-center font-display font-bold text-2xl shadow-md">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h4 className="font-display font-bold text-lg text-charcoal-900 dark:text-white leading-tight">
                {user.name}
              </h4>
              <span className="inline-block bg-nature-50 dark:bg-nature-950/40 text-nature-800 dark:text-nature-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-1 uppercase border border-nature-100 dark:border-nature-900">
                {user.status || 'Eco Member'}
              </span>
            </div>
            <p className="text-xs text-charcoal-500 leading-relaxed truncate">{user.email}</p>
          </div>

          {/* Nav links */}
          <div className="flex flex-col gap-1 bg-slate-50 dark:bg-charcoal-800/40 p-2 border border-slate-150 dark:border-white/5 rounded-3xl">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full text-left py-3 px-4 rounded-2xl text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-nature-700 text-white'
                  : 'text-charcoal-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <User className="w-4.5 h-4.5" />
              <span>My Profile</span>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full text-left py-3 px-4 rounded-2xl text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-nature-700 text-white'
                  : 'text-charcoal-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Package className="w-4.5 h-4.5" />
              <span>Purchase History</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('track');
                if (activeOrderTrackId) setTrackInputId(activeOrderTrackId);
              }}
              className={`w-full text-left py-3 px-4 rounded-2xl text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                activeTab === 'track'
                  ? 'bg-nature-700 text-white'
                  : 'text-charcoal-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Truck className="w-4.5 h-4.5" />
              <span>Track Orders</span>
            </button>
            <button
              onClick={() => setActiveTab('wishlist')}
              className={`w-full text-left py-3 px-4 rounded-2xl text-sm font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                activeTab === 'wishlist'
                  ? 'bg-nature-700 text-white'
                  : 'text-charcoal-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Heart className={`w-4.5 h-4.5 ${activeTab === 'wishlist' ? 'fill-current text-white' : 'text-rose-500 fill-current'}`} />
              <span>My Favorites ({wishlist.length})</span>
            </button>
            <div className="h-[1px] bg-slate-200 dark:bg-white/10 my-1" />
            
            {/* {(user.role === 'admin' || user.role === 'super_admin') && (
                <a
                  href="#admin"
                  className="w-full text-left py-3 px-4 rounded-2xl text-sm font-semibold flex items-center gap-2.5 bg-emerald-600 text-white shadow-md hover:bg-emerald-500 transition-colors"
                >
                  <Search className="w-4.5 h-4.5" />
                  <span>Admin Console</span>
                </a>
              )} */}

            <button
              onClick={logout}
              className="w-full text-left py-3 px-4 rounded-2xl text-sm font-semibold flex items-center gap-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
            >
              <LogOut className="w-4.5 h-4.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Dashboard Panels */}
        <div className="md:col-span-3 bg-white dark:bg-charcoal-900 border border-slate-150 dark:border-white/5 p-8 rounded-3xl hover:-translate-y-1.5 hover:shadow-xl hover:shadow-nature-900/10 transition-all duration-300 ease-[cubic-bezier(0.215,0.61,0.355,1)] shadow-sm" id="dashboard-main-content">
          {activeTab === 'profile' && (
            <div className="space-y-6" id="panel-profile">
              <div className="border-b border-slate-100 dark:border-white/5 pb-4">
                <h3 className="font-display font-bold text-xl text-nature-900 dark:text-nature-400">Profile Preferences</h3>
                <p className="text-xs text-charcoal-500">Manage your credentials, default shipping nodes, and communication preferences.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-charcoal-700 dark:text-slate-300">Registered Name</label>
                  <input
                    type="text"
                    disabled
                    value={user.name}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-charcoal-800 text-charcoal-500 rounded-xl border border-slate-200 dark:border-white/5 text-sm cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-charcoal-700 dark:text-slate-300">Secure Email</label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-charcoal-800 text-charcoal-500 rounded-xl border border-slate-200 dark:border-white/5 text-sm cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-charcoal-700 dark:text-slate-300">Contact Number</label>
                  <input
                    type="text"
                    defaultValue={user.phone || '+91 94949 94949'}
                    className="w-full px-4 py-3 bg-white dark:bg-charcoal-850 text-charcoal-900 dark:text-white rounded-xl border border-slate-200 dark:border-white/10 text-sm focus:border-nature-600 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-charcoal-700 dark:text-slate-300">Default Shipping Hub</label>
                  <input
                    type="text"
                    defaultValue={user.location || 'Guntur, Andhra Pradesh'}
                    className="w-full px-4 py-3 bg-white dark:bg-charcoal-850 text-charcoal-900 dark:text-white rounded-xl border border-slate-200 dark:border-white/10 text-sm focus:border-nature-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-nature-50/50 dark:bg-nature-950/25 border border-nature-100/40 dark:border-nature-900/40 rounded-2xl flex gap-3 text-xs text-nature-800 dark:text-nature-400">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-nature-700" />
                <p className="leading-relaxed">
                  Your BioCart Green Membership is currently active. Enjoy free carbon-neutral shipping on any purchase above ₹499.
                </p>
              </div>

              {!googleLinked && (
                <button type="button" onClick={handleLinkGoogle} disabled={linkingGoogle} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-charcoal-800 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-60">
                  <Link2 className="w-4 h-4" />
                  {linkingGoogle ? 'Connecting Google…' : 'Link Google sign-in to this account'}
                </button>
              )}

              {/* Appearance & Theme Settings Section */}
              <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-3">
                <h4 className="font-display font-bold text-sm text-charcoal-900 dark:text-white uppercase tracking-wider">
                  Appearance & Theme
                </h4>
                <p className="text-xs text-charcoal-500">Choose your preferred BioCart interface theme mode.</p>
                <div className="grid grid-cols-2 gap-4 max-w-sm">
                  <button
                    type="button"
                    onClick={() => {
                      if (theme !== 'light') toggleTheme();
                    }}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 shadow-sm'
                        : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-charcoal-800 text-charcoal-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-600 flex items-center justify-center">
                        {theme === 'light' && <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />}
                      </div>
                      <span>Light Theme (Default)</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (theme !== 'dark') toggleTheme();
                    }}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                      theme === 'dark'
                        ? 'border-emerald-500 bg-emerald-950/60 text-emerald-400 shadow-sm'
                        : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-charcoal-800 text-charcoal-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 flex items-center justify-center">
                        {theme === 'dark' && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                      </div>
                      <span>Dark Theme</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}


          {activeTab === 'orders' && (
            <div className="space-y-6" id="panel-orders">
              <div className="border-b border-slate-100 dark:border-white/5 pb-4">
                <h3 className="font-display font-bold text-xl text-nature-900 dark:text-nature-400">Purchase Log</h3>
                <p className="text-xs text-charcoal-500">Track and view invoices for all of your sustainable purchases.</p>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-12 text-charcoal-500">No purchases found. Let's make your first green transaction!</div>
              ) : (
                <div className="space-y-4" id="orders-list">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="p-5 border border-slate-150 dark:border-white/5 rounded-2xl bg-slate-50/40 dark:bg-charcoal-800/20 space-y-3"
                    >
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-nature-700 dark:text-nature-400">{order.id}</span>
                          <p className="text-xs text-charcoal-400 mt-0.5">Purchased on {order.date}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                            order.status === 'Delivered'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400'
                              : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400'
                          }`}>
                            {order.status}
                          </span>
                          <span className="text-sm font-bold text-charcoal-900 dark:text-white">₹{order.total}</span>
                        </div>
                      </div>

                      <div className="h-[1px] bg-slate-100 dark:bg-white/5" />

                      <ul className="space-y-1.5">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="flex justify-between text-xs text-charcoal-600 dark:text-slate-300">
                            <span>{item.name} <strong className="text-charcoal-400">x{item.qty}</strong></span>
                            <span>₹{item.price * item.qty}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => {
                            setActiveOrderTrackId(order.id);
                            setTrackInputId(order.id);
                            setActiveTab('track');
                          }}
                          className="text-xs font-bold text-nature-700 dark:text-nature-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>Track Live Shipment</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'track' && (
            <div className="space-y-6" id="panel-track">
              <div className="border-b border-slate-100 dark:border-white/5 pb-4">
                <h3 className="font-display font-bold text-xl text-nature-900 dark:text-nature-400">Live Shipments Tracker</h3>
                <p className="text-xs text-charcoal-500">Provide any active tracking ID starting with "BC-" to retrieve transport parameters from Guntur.</p>
              </div>

              {/* ID Input Search */}
              <form onSubmit={handleTrackSubmit} className="flex gap-2" id="track-search-form">
                <div className="relative flex-grow">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-charcoal-400" />
                  <input
                    type="text"
                    required
                    placeholder="Enter Tracking ID (e.g. BC-548123-IN)"
                    value={trackInputId}
                    onChange={(e) => setTrackInputId(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-charcoal-800 text-charcoal-950 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 bg-nature-700 hover:bg-nature-800 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer flex-shrink-0 hover:scale-105 active:scale-95 transition-all duration-300 ease-out shadow-md hover:shadow-nature-700/30"
                >
                  Locate
                </button>
              </form>

              {/* Tracking Visualization */}
              {currentTrackId && isFoundOrder ? (
                <div className="space-y-8 pt-4" id="tracking-visualization">
                  <div className="p-4 bg-nature-50/50 dark:bg-charcoal-800/40 rounded-2xl border border-nature-100/40 dark:border-white/5 flex items-center justify-between text-xs font-semibold">
                    <div>
                      <span className="text-charcoal-400">Order ID:</span>
                      <strong className="font-mono text-nature-800 dark:text-nature-400 ml-1.5">{currentTrackId}</strong>
                    </div>
                    <div>
                      <span className="text-charcoal-400">Source Factory:</span>
                      <strong className="text-nature-800 dark:text-nature-400 ml-1.5">Guntur (Sindulis Agro Units)</strong>
                    </div>
                  </div>

                  {/* Step list vertical line */}
                  <div className="relative pl-8 space-y-8 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-white/5" id="tracking-steps">
                    {/* Step 1 */}
                    <div className="relative flex items-start gap-4">
                      <div className="absolute -left-8 w-7 h-7 rounded-full bg-nature-100 border border-nature-300 flex items-center justify-center text-nature-700">
                        <CheckCircle2 className="w-4 h-4 fill-current" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-charcoal-900 dark:text-white">Order Registered & Approved</h4>
                        <p className="text-xs text-charcoal-400 mt-0.5">Approved via central BioCart checkout ledger.</p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="relative flex items-start gap-4">
                      <div className="absolute -left-8 w-7 h-7 rounded-full bg-nature-100 border border-nature-300 flex items-center justify-center text-nature-700">
                        <CheckCircle2 className="w-4 h-4 fill-current" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-charcoal-900 dark:text-white">Processed at Guntur Factory</h4>
                        <p className="text-xs text-charcoal-400 mt-0.5">Packaged utilizing 100% plastic-free starches at Sindulis Agro industrial nodes.</p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="relative flex items-start gap-4">
                      <div className={`absolute -left-8 w-7 h-7 rounded-full flex items-center justify-center border ${
                        currentTrackId === activeOrderTrackId // newly placed order is only processed, not yet shipped
                          ? 'bg-slate-50 border-slate-200 text-slate-400'
                          : 'bg-nature-100 border-nature-300 text-nature-700'
                      }`}>
                        {currentTrackId === activeOrderTrackId ? (
                          <span className="w-2 h-2 bg-charcoal-400 rounded-full animate-ping" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 fill-current" />
                        )}
                      </div>
                      <div className={currentTrackId === activeOrderTrackId ? 'opacity-60' : ''}>
                        <h4 className="font-semibold text-sm text-charcoal-900 dark:text-white">Dispatched from Guntur Depot</h4>
                        <p className="text-xs text-charcoal-400 mt-0.5">Assigned to carbon-neutral transport fleets.</p>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="relative flex items-start gap-4">
                      <div className={`absolute -left-8 w-7 h-7 rounded-full flex items-center justify-center border ${
                        false // preseeded in transit
                          ? 'bg-nature-100 border-nature-300 text-nature-700'
                          : orders.some(o => o.id === currentTrackId && o.status === 'delivered') // delivered
                          ? 'bg-nature-100 border-nature-300 text-nature-700'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        {false ? (
                          <Truck className="w-3.5 h-3.5" />
                        ) : orders.some(o => o.id === currentTrackId && o.status === 'delivered') ? (
                          <CheckCircle2 className="w-4 h-4 fill-current" />
                        ) : (
                          <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                        )}
                      </div>
                      <div className={orders.some(o => o.id === currentTrackId && ['shipped', 'delivered'].includes(o.status)) ? '' : 'opacity-45'}>
                        <h4 className="font-semibold text-sm text-charcoal-900 dark:text-white">In Transit (Regional Hub)</h4>
                        <p className="text-xs text-charcoal-400 mt-0.5">Enroute via green express freight lines.</p>
                      </div>
                    </div>

                    {/* Step 5 */}
                    <div className="relative flex items-start gap-4">
                      <div className={`absolute -left-8 w-7 h-7 rounded-full flex items-center justify-center border ${
                        orders.some(o => o.id === currentTrackId && o.status === 'delivered')
                          ? 'bg-nature-100 border-nature-300 text-nature-700'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        {orders.some(o => o.id === currentTrackId && o.status === 'delivered') ? (
                          <CheckCircle2 className="w-4 h-4 fill-current" />
                        ) : (
                          <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                        )}
                      </div>
                      <div className={orders.some(o => o.id === currentTrackId && o.status === 'delivered') ? '' : 'opacity-45'}>
                        <h4 className="font-semibold text-sm text-charcoal-900 dark:text-white">Delivered Successfully</h4>
                        <p className="text-xs text-charcoal-400 mt-0.5">Signature verified. Zero plastic packaging discarded.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : currentTrackId ? (
                <div className="text-center py-8 text-charcoal-500 bg-slate-50/50 dark:bg-charcoal-800/10 rounded-2xl border border-dashed border-slate-200">
                  No active shipment logs registered with ID "{currentTrackId}". Please verify syntax.
                </div>
              ) : (
                <div className="text-center py-8 text-charcoal-500 bg-slate-50/50 dark:bg-charcoal-800/10 rounded-2xl border border-dashed border-slate-200">
                  Type any active tracking ID (e.g. BC-548123-IN) above to initiate satellite location feed.
                </div>
              )}
            </div>
          )}

          {activeTab === 'wishlist' && (
            <div className="space-y-6" id="panel-wishlist">
              <div className="border-b border-slate-100 dark:border-white/5 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-xl text-nature-900 dark:text-nature-400 flex items-center gap-2">
                    <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
                    <span>My Favorites</span>
                  </h3>
                  <p className="text-xs text-charcoal-500">Your curated selection of organic products saved for your sustainable garden.</p>
                </div>
                <span className="bg-nature-50 dark:bg-nature-950/40 text-nature-800 dark:text-nature-400 text-xs font-bold px-3 py-1 rounded-full border border-nature-100 dark:border-nature-900">
                  {wishlistProducts.length} {wishlistProducts.length === 1 ? 'Item' : 'Items'}
                </span>
              </div>

              {wishlistProducts.length === 0 ? (
                <div className="text-center py-12 text-charcoal-500 flex flex-col items-center justify-center space-y-4 bg-slate-50/50 dark:bg-charcoal-800/10 rounded-2xl p-8 border border-dashed border-slate-200 dark:border-white/5">
                  <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center">
                    <Heart className="w-8 h-8 text-rose-500" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-base text-charcoal-900 dark:text-white">Your favorites list is empty</p>
                    <p className="text-xs text-charcoal-400 max-w-sm mx-auto mt-1">Explore the BioCart shop and click the heart icon on any product to save it here for later.</p>
                  </div>
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
        </div>
      </div>
    </div>
  );
};
