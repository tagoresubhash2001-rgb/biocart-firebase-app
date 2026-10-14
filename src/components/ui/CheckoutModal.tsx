import React, { useState, useEffect } from 'react';
import { functions } from '../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { X, ShoppingBag, Trash2, ArrowRight, ShieldCheck, CreditCard, Sparkles, CheckCircle2, MapPin } from 'lucide-react';
import { AddressService } from '../../services/AddressService';
import { AddressEntity } from '../../types/backend';

export const CheckoutModal: React.FC = () => {
  const {
    isCartOpen,
    setCartOpen,
    cart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    user,
    addToast,
    setActiveOrderTrackId,
    setTab,
    setSubView
  } = useApp();

  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  
  // Saved addresses
  const [savedAddresses, setSavedAddresses] = useState<AddressEntity[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('custom');

  // Checkout Form fields
  const [shippingName, setShippingName] = useState(user?.name || '');
  const [shippingPhone, setShippingPhone] = useState(user?.phone || '');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingState, setShippingState] = useState('');
  const [shippingZip, setShippingZip] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'cod'>('upi');

  useEffect(() => {
    if (user?.uid) {
      AddressService.getUserAddresses(user.uid)
        .then((addrs) => {
          setSavedAddresses(addrs);
          if (addrs.length > 0) {
            const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
            setSelectedAddressId(defaultAddr.id);
            setShippingName(defaultAddr.name || user.name || '');
            setShippingPhone(defaultAddr.phone || user.phone || '');
            setShippingAddress(defaultAddr.street || '');
            setShippingCity(defaultAddr.city || '');
            setShippingState(defaultAddr.state || '');
            setShippingZip(defaultAddr.postalCode || '');
          }
        })
        .catch((err) => {
          console.warn('Failed to load saved addresses:', err);
        });
    }
  }, [user?.uid]);

  const handleSelectSavedAddress = (addrId: string) => {
    setSelectedAddressId(addrId);
    if (addrId === 'custom') {
      return;
    }
    const found = savedAddresses.find((a) => a.id === addrId);
    if (found) {
      setShippingName(found.name || user?.name || '');
      setShippingPhone(found.phone || user?.phone || '');
      setShippingAddress(found.street || '');
      setShippingCity(found.city || '');
      setShippingState(found.state || '');
      setShippingZip(found.postalCode || '');
    }
  };
  
  const [createdOrderId, setCreatedOrderId] = useState('');

  if (!isCartOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.price * (item.quantityInCart || 0), 0);
  const shippingFee = subtotal > 499 ? 0 : 50; // Free shipping over 499
  const GST = Math.round(subtotal * 0.18); // 18% GST
  const total = subtotal + shippingFee + GST;

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingName || !shippingPhone || !shippingAddress || !shippingZip) {
      addToast('Please fill out all required fields', 'warning');
      return;
    }
    
    try {
      if (!user) {
        addToast('Please sign in or create an account to complete your checkout', 'warning');
        return;
      }

      const orderData = {
        userId: user.uid,
        customerId: (user as any)?.customerId || '',
        subtotal,
        discountAmount: 0,
        shippingAmount: shippingFee,
        taxAmount: GST,
        totalAmount: total,
        paymentMethod: paymentMethod,
        shippingAddress: {
          name: shippingName,
          phone: shippingPhone,
          address: shippingAddress,
          city: shippingCity,
          state: shippingState,
          zip: shippingZip
        },
        billingAddress: {
          name: shippingName,
          phone: shippingPhone,
          address: shippingAddress,
          city: shippingCity,
          state: shippingState,
          zip: shippingZip
        }
      };
      
      // Prepare cart items for the Cloud Function payload
      const functionCartItems = cart.map(item => ({
        productId: item.id,
        quantity: item.quantityInCart || 1
      }));

      let orderId = '';
      try {
        const createOrderFn = httpsCallable<any, { orderId: string }>(functions, 'createOrder');
        const resp = await createOrderFn({
          items: functionCartItems,
          shippingAddress: orderData.shippingAddress,
          billingAddress: orderData.billingAddress,
          paymentMethod
        });
        if (resp?.data?.orderId) {
          orderId = resp.data.orderId;
        }
      } catch (fnErr: any) {
        console.warn('Cloud Function createOrder call details:', fnErr);
        // Client-submitted prices and inventory changes are not trustworthy.
        // Keep the fallback available only for an explicitly configured emulator.
        const functionsEmulator = import.meta.env.DEV && import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === 'true';
        if (!functionsEmulator) throw fnErr;
      }

      if (!orderId && import.meta.env.DEV && import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === 'true') {
        const OrderService = (await import('../../services/OrderService')).OrderService;
        const result = await OrderService.createOrder(
          orderData.userId || 'guest',
          functionCartItems,
          orderData.shippingAddress,
          paymentMethod
        );
        orderId = result.orderId;
      }

      if (!orderId) throw new Error('Order service did not return an order ID. Please retry.');

      setCreatedOrderId(orderId);
      setStep('success');
      addToast('Order placed successfully!', 'success');
    } catch (error: any) {
      addToast(error.message || 'Failed to place order', 'error');
    }
  };

  const handleSuccessClose = () => {
    setActiveOrderTrackId(createdOrderId);
    clearCart();
    setStep('cart');
    setCartOpen(false);
    setSubView('dashboard'); // Direct user to order tracking page
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-md" id="checkout-overlay">
        {/* Backdrop click (only allowed when not on success screen) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 cursor-pointer"
          onClick={() => {
            if (step !== 'success') {
              setCartOpen(false);
            }
          }}
        />

        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 200 }}
          className="relative w-full max-w-lg h-full bg-white dark:bg-charcoal-900 shadow-2xl border-l border-black/5 dark:border-white/10 flex flex-col z-10"
          id="checkout-drawer"
        >
          {/* Close/Back Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5" id="checkout-header">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-nature-700" />
              <h3 className="font-display font-bold text-lg text-nature-900 dark:text-nature-400">
                {step === 'cart' && `Shopping Bag (${cart.length})`}
                {step === 'checkout' && 'Secure Checkout'}
                {step === 'success' && 'Order Confirmed'}
              </h3>
            </div>
            {step !== 'success' && (
              <button
                onClick={() => setCartOpen(false)}
                className="p-2 text-charcoal-500 hover:text-charcoal-900 dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                id="checkout-close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Core Step Rendering */}
          <div className="flex-grow overflow-y-auto" id="checkout-body">
            {step === 'cart' && (
              <div className="p-6 h-full flex flex-col" id="step-cart">
                {cart.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-8 space-y-4" id="empty-cart-state">
                    <div className="bg-nature-50 dark:bg-nature-950/40 p-5 rounded-full border border-nature-100 dark:border-nature-900">
                      <ShoppingBag className="w-10 h-10 text-nature-700 dark:text-nature-400" />
                    </div>
                    <h4 className="font-display font-bold text-xl text-charcoal-900 dark:text-white">Your Shopping Bag is Empty</h4>
                    <p className="text-sm text-charcoal-500 dark:text-slate-400 max-w-xs leading-relaxed">
                      Explore our premium plastic-free home gardening and eco-friendly wellness products to fill up your bag.
                    </p>
                    <button
                      onClick={() => {
                        setCartOpen(false);
                        setTab('shop');
                      }}
                      className="px-6 py-2.5 bg-nature-700 hover:bg-nature-800 text-white rounded-xl text-sm font-semibold shadow-md transition-colors cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300 ease-out shadow-md hover:shadow-nature-700/30"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  <div className="flex-grow flex flex-col space-y-6" id="cart-items-container">
                    {/* Cart list */}
                    <div className="flex-grow overflow-y-auto space-y-4 pr-1 max-h-[50vh]">
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-charcoal-800/40 rounded-2xl border border-slate-150 dark:border-white/5"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                          />
                          <div className="flex-grow min-w-0">
                            <h4 className="font-display font-bold text-sm text-charcoal-900 dark:text-white truncate">
                              {item.name}
                            </h4>
                            <p className="text-xs text-nature-700 dark:text-nature-400 font-semibold mb-1">
                              ₹{item.price} each
                            </p>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-charcoal-900 p-0.5">
                                <button
                                  onClick={() => updateCartQuantity(item.id, (item.quantityInCart || 0) - 1)}
                                  className="w-6 h-6 flex items-center justify-center text-xs text-charcoal-600 dark:text-white rounded hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center text-xs font-semibold text-charcoal-900 dark:text-white">
                                  {item.quantityInCart}
                                </span>
                                <button
                                  onClick={() => updateCartQuantity(item.id, (item.quantityInCart || 0) + 1)}
                                  className="w-6 h-6 flex items-center justify-center text-xs text-charcoal-600 dark:text-white rounded hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Order summary breakdown */}
                    <div className="p-5 bg-slate-50 dark:bg-charcoal-800/40 rounded-2xl border border-slate-150 dark:border-white/5 space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-charcoal-500">Items Subtotal</span>
                        <span className="font-semibold text-charcoal-900 dark:text-white">₹{subtotal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-charcoal-500">Shipping Delivery</span>
                        <span className="font-semibold text-charcoal-900 dark:text-white">
                          {shippingFee === 0 ? <span className="text-emerald-600">FREE</span> : `₹${shippingFee}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-charcoal-500">GST (18%)</span>
                        <span className="font-semibold text-charcoal-900 dark:text-white">₹{GST}</span>
                      </div>
                      <div className="h-[1px] bg-slate-200 dark:bg-white/10 my-1" />
                      <div className="flex justify-between text-base font-bold">
                        <span className="text-charcoal-900 dark:text-white">Estimated Total</span>
                        <span className="text-nature-700 dark:text-nature-400">₹{total}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setStep('checkout')}
                      className="w-full flex items-center justify-center gap-2 py-4 bg-nature-700 hover:bg-nature-800 text-white rounded-xl font-medium shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300 ease-out shadow-md hover:shadow-nature-700/30"
                    >
                      <span>Proceed to Secure Checkout</span>
                      <ArrowRight className="w-4.5 h-4.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === 'checkout' && (
              <form onSubmit={handleCheckoutSubmit} className="p-6 space-y-6" id="step-checkout">
                {/* Contact and shipping */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2">
                    <h4 className="font-display font-bold text-sm uppercase tracking-wider text-charcoal-500">
                      Shipping Details
                    </h4>
                    {savedAddresses.length > 0 && (
                      <span className="text-[11px] text-nature-700 dark:text-nature-400 font-semibold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {savedAddresses.length} saved
                      </span>
                    )}
                  </div>

                  {savedAddresses.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-charcoal-600 dark:text-slate-300">Select Delivery Address</label>
                      <div className="grid grid-cols-1 gap-2">
                        {savedAddresses.map((addr) => (
                          <div
                            key={addr.id}
                            onClick={() => handleSelectSavedAddress(addr.id)}
                            className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                              selectedAddressId === addr.id
                                ? 'border-nature-600 bg-nature-50/50 dark:bg-nature-950/20 text-charcoal-900 dark:text-white ring-1 ring-nature-600'
                                : 'border-slate-200 dark:border-white/10 hover:border-slate-300 bg-white dark:bg-charcoal-800 text-charcoal-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold flex items-center gap-1.5">
                                {addr.name}
                                {addr.isDefault && (
                                  <span className="px-1.5 py-0.2 bg-nature-100 dark:bg-nature-900/60 text-nature-800 dark:text-nature-300 text-[10px] rounded font-medium">Default</span>
                                )}
                              </span>
                              <span className="text-[11px] text-charcoal-500">{addr.phone}</span>
                            </div>
                            <p className="text-[11px] text-charcoal-600 dark:text-slate-400 mt-1 truncate">
                              {addr.street}, {addr.city}, {addr.state} - {addr.postalCode}
                            </p>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleSelectSavedAddress('custom')}
                          className={`p-2 rounded-xl border text-xs text-left cursor-pointer transition-all ${
                            selectedAddressId === 'custom'
                              ? 'border-nature-600 bg-nature-50/30 text-nature-800 dark:text-nature-300 font-semibold'
                              : 'border-dashed border-slate-300 text-charcoal-500 hover:border-slate-400'
                          }`}
                        >
                          + Enter a different address
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-charcoal-600 dark:text-slate-300">Recipient Name</label>
                      <input
                        type="text"
                        required
                        value={shippingName}
                        onChange={(e) => setShippingName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-charcoal-800 text-charcoal-950 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-charcoal-600 dark:text-slate-300">Contact Number</label>
                      <input
                        type="tel"
                        required
                        value={shippingPhone}
                        onChange={(e) => setShippingPhone(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-charcoal-800 text-charcoal-950 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-charcoal-600 dark:text-slate-300">Street Address</label>
                    <input
                      type="text"
                      required
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-charcoal-800 text-charcoal-950 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-charcoal-600 dark:text-slate-300">City</label>
                      <input
                        type="text"
                        required
                        value={shippingCity}
                        onChange={(e) => setShippingCity(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-charcoal-800 text-charcoal-950 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-charcoal-600 dark:text-slate-300">State</label>
                      <input
                        type="text"
                        required
                        value={shippingState}
                        onChange={(e) => setShippingState(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-charcoal-800 text-charcoal-950 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-charcoal-600 dark:text-slate-300">PIN Code</label>
                      <input
                        type="text"
                        required
                        value={shippingZip}
                        onChange={(e) => setShippingZip(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-charcoal-800 text-charcoal-950 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Simulated Payment */}
                <div className="space-y-4">
                  <h4 className="font-display font-bold text-sm uppercase tracking-wider text-charcoal-500 border-b border-slate-100 dark:border-white/5 pb-2">
                    Select Payment (Secure Sandbox)
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('upi')}
                      className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        paymentMethod === 'upi'
                          ? 'border-nature-700 bg-nature-50/50 dark:bg-nature-950/20 text-nature-800 dark:text-nature-400 font-bold'
                          : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-charcoal-800 text-charcoal-600'
                      }`}
                    >
                      <Sparkles className="w-5 h-5 text-nature-700" />
                      <span className="text-xs font-semibold">UPI Auto</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        paymentMethod === 'card'
                          ? 'border-nature-700 bg-nature-50/50 dark:bg-nature-950/20 text-nature-800 dark:text-nature-400 font-bold'
                          : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-charcoal-800 text-charcoal-600'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-nature-700" />
                      <span className="text-xs font-semibold">Razorpay Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cod')}
                      className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        paymentMethod === 'cod'
                          ? 'border-nature-700 bg-nature-50/50 dark:bg-nature-950/20 text-nature-800 dark:text-nature-400 font-bold'
                          : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-charcoal-800 text-charcoal-600'
                      }`}
                    >
                      <ShoppingBag className="w-5 h-5 text-nature-700" />
                      <span className="text-xs font-semibold">Cash / COD</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-2xl flex gap-3 text-xs text-emerald-800 dark:text-emerald-400">
                  <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-600" />
                  <p className="leading-relaxed">
                    Your connection is encrypted. Sindulis Agro Products ensures fully safe, certified PCI-compliant gateway proxies.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep('cart')}
                    className="w-1/3 py-3.5 border border-slate-350 dark:border-white/10 text-charcoal-700 dark:text-white rounded-xl text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Back to Bag
                  </button>
                  <button
                    type="submit"
                    className="flex-grow flex items-center justify-center gap-2 py-3.5 bg-[#004643] hover:bg-[#003532] text-white rounded-xl font-bold shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-95 duration-200 shadow-[#004643]/30 !text-white"
                  >
                    <span className="!text-white">Authorize & Pay • ₹{total}</span>
                  </button>
                </div>
              </form>
            )}

            {step === 'success' && (
              <div className="p-8 h-full flex flex-col items-center justify-center text-center space-y-6" id="step-success">
                <div className="bg-nature-100 dark:bg-nature-950/60 p-4 rounded-full border border-nature-200 dark:border-nature-900">
                  <CheckCircle2 className="w-12 h-12 text-[#004643] dark:text-nature-400" />
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-display font-bold text-2xl text-charcoal-900 dark:text-white">Payment Received!</h4>
                  <p className="text-sm text-charcoal-500 dark:text-slate-400 max-w-sm leading-relaxed">
                    Thank you for supporting plastic-free, organic living! Your transaction has been approved, and we have registered your dispatch parcel in our primary logistics facility.
                  </p>
                </div>

                <div className="p-5 bg-nature-50 dark:bg-charcoal-800/40 border border-nature-100/40 dark:border-white/5 rounded-2xl w-full">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal-500 block mb-1">
                    Your Order Tracking ID
                  </span>
                  <span className="font-mono text-xl font-bold text-[#004643] dark:text-white tracking-wider block">
                    {createdOrderId}
                  </span>
                  <span className="text-xs text-charcoal-400 block mt-2">
                    Copy this ID. You can track this live in your dashboard.
                  </span>
                </div>

                <button
                  onClick={handleSuccessClose}
                  className="w-full py-4 bg-[#004643] hover:bg-[#003532] text-white rounded-xl font-bold shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-95 duration-200 shadow-[#004643]/30 !text-white"
                  id="success-view-order-btn"
                >
                  <span className="!text-white">View Order Status in Dashboard</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
