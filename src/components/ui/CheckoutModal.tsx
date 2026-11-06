declare const Cashfree: any;
import React, { useState, useEffect } from 'react';
import { functions } from '../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { X, ShoppingBag, Trash2, ArrowRight, ShieldCheck, CreditCard, Sparkles, CheckCircle2, MapPin, Truck, AlertCircle, Check, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { AddressService } from '../../services/AddressService';
import { AddressEntity } from '../../types/backend';
import { useStoreSettings } from '../../hooks/useStoreSettings';
import { ShippingService, PincodeCheckResult } from '../../services/ShippingService';
import { CouponService, CouponValidationResult } from '../../services/CouponService';
import { CouponEntity } from '../../types/backend';
import { Tag } from 'lucide-react';

export const CheckoutModal: React.FC = () => {
  const { settings } = useStoreSettings();
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
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'cashfree'>('cashfree');

  // B2B GST Invoice Request
  const [requestGstInvoice, setRequestGstInvoice] = useState(false);
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerBusinessName, setCustomerBusinessName] = useState('');

  // EKART Pincode Serviceability State
  const [pincodeStatus, setPincodeStatus] = useState<PincodeCheckResult | null>(null);
  const [checkingPincode, setCheckingPincode] = useState(false);

  // Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponEntity | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

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

  // EKART Live PIN Code Serviceability Check
  useEffect(() => {
    const cleanPin = shippingZip.replace(/\D/g, '');
    if (cleanPin.length === 6) {
      setCheckingPincode(true);
      ShippingService.checkPincode(cleanPin)
        .then((res) => {
          setPincodeStatus(res);
          if (res.city && !shippingCity) setShippingCity(res.city);
          if (res.state && !shippingState) setShippingState(res.state);
        })
        .catch((err) => {
          console.warn('EKART pincode check error:', err);
        })
        .finally(() => {
          setCheckingPincode(false);
        });
    } else {
      setPincodeStatus(null);
    }
  }, [shippingZip]);
  
  const [createdOrderId, setCreatedOrderId] = useState('');

  // Authoritative Backend Quote State & Lifecycle Status
  const [quoteStatus, setQuoteStatus] = useState<'idle' | 'loading' | 'valid' | 'failed'>('idle');
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [authoritativeQuote, setAuthoritativeQuote] = useState<{
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    shippingAmount: number;
    totalAmount: number;
    freeShippingThreshold: number;
    minOrderValue?: number;
    codMinValue?: number;
    codMaxValue?: number;
    codAvailable?: boolean;
  } | null>(null);
  const [quotingOrder, setQuotingOrder] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const fetchAuthoritativeQuote = () => {
    if (!isCartOpen || cart.length === 0) {
      setAuthoritativeQuote(null);
      setQuoteStatus('idle');
      setQuoteError(null);
      return;
    }

    const payloadItems = cart.map(item => ({
      productId: item.id,
      quantity: item.quantityInCart || 1
    }));

    setQuotingOrder(true);
    setQuoteStatus('loading');
    setQuoteError(null);
    setAuthoritativeQuote(null); // Clear stale quote

    const quoteFn = httpsCallable<any, any>(functions, 'quoteOrder');
    quoteFn({ items: payloadItems, couponCode: appliedCoupon?.code || undefined })
      .then(res => {
        if (res?.data && res.data.totalAmount !== undefined) {
          setAuthoritativeQuote(res.data);
          setQuoteStatus('valid');
          setQuoteError(null);
          if (res.data.discountAmount !== undefined) {
            setCouponDiscount(res.data.discountAmount);
          }
        } else {
          setQuoteStatus('failed');
          setQuoteError('Received incomplete pricing quote from server.');
        }
      })
      .catch(err => {
        console.error('Backend quoteOrder error:', err);
        setQuoteStatus('failed');
        setQuoteError(err?.message || 'Unable to generate secure order quote from server. Please retry.');
      })
      .finally(() => {
        setQuotingOrder(false);
      });
  };

  useEffect(() => {
    fetchAuthoritativeQuote();
  }, [isCartOpen, cart, appliedCoupon?.code]);

  if (!isCartOpen) return null;

  const fallbackSubtotal = cart.reduce((sum, item) => sum + item.price * (item.quantityInCart || 0), 0);
  const freeThreshold = authoritativeQuote?.freeShippingThreshold ?? (settings.orderThresholds?.freeShippingThreshold ?? (typeof settings.freeShippingThreshold === 'number' ? settings.freeShippingThreshold : 1499));
  const minOrderReq = authoritativeQuote?.minOrderValue ?? (settings.orderThresholds?.minOrderValue ?? 0);
  const codMinVal = authoritativeQuote?.codMinValue ?? (settings.orderThresholds?.codMinValue ?? 299);
  const codMaxVal = authoritativeQuote?.codMaxValue ?? (settings.orderThresholds?.codMaxValue ?? 5000);
  const codAllowedGlobal = authoritativeQuote?.codAvailable ?? (settings.orderThresholds?.codAvailable !== false);

  const shippingFee = authoritativeQuote?.shippingAmount ?? (fallbackSubtotal >= freeThreshold ? 0 : 99);
  const couponDiscountVal = authoritativeQuote?.discountAmount ?? couponDiscount;
  const taxableAmount = Math.max(0, (authoritativeQuote?.subtotal ?? fallbackSubtotal) - couponDiscountVal);
  // Locked Business Rule: Product MRP is inclusive of applicable taxes. Never add GST on top of product MRP.
  const GST = 0;
  const subtotal = authoritativeQuote?.subtotal ?? fallbackSubtotal;
  const total = authoritativeQuote?.totalAmount ?? (taxableAmount + shippingFee);

  const isBelowMinOrder = minOrderReq > 0 && subtotal < minOrderReq;
  const isCodEligible = codAllowedGlobal && total >= codMinVal && total <= codMaxVal;

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    try {
      setValidatingCoupon(true);
      setCouponError(null);

      const cartItemsForValidation = cart.map(item => ({
        product: item,
        quantity: item.quantityInCart || 1
      }));

      const res = await CouponService.validateCartCoupon(code, cartItemsForValidation);
      if (res.valid && res.coupon) {
        setAppliedCoupon(res.coupon);
        setCouponDiscount(res.discountAmount);
        addToast(`Coupon "${code}" applied! You saved ₹${res.discountAmount}.`, 'success');
      } else {
        setCouponError(res.errorMessage || 'Invalid coupon code.');
        setAppliedCoupon(null);
        setCouponDiscount(0);
      }
    } catch (err: any) {
      setCouponError(err?.message || 'Error validating coupon.');
      setAppliedCoupon(null);
      setCouponDiscount(0);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponInput('');
    setCouponError(null);
    addToast('Coupon removed.', 'info');
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pincodeStatus && pincodeStatus.serviceable === false) {
      addToast('The delivery pincode is not serviceable by our carrier network.', 'error');
      return;
    }

    if (paymentMethod === 'cod' && pincodeStatus && pincodeStatus.cod === false) {
      addToast('Cash on Delivery (COD) is not available for this postal code. Please choose Cashfree Online Payment.', 'error');
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
        discountAmount: couponDiscount,
        couponCode: appliedCoupon?.code || undefined,
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

      if (quoteStatus !== 'valid' || !authoritativeQuote) {
        addToast('A valid authoritative server quote is required before checkout. Please retry.', 'error');
        fetchAuthoritativeQuote();
        return;
      }

      setIsProcessingPayment(true);
      let orderId = '';
      const createOrderFn = httpsCallable<any, { orderId: string }>(functions, 'createOrder');
      const resp = await createOrderFn({
        items: functionCartItems,
        shippingAddress: orderData.shippingAddress,
        billingAddress: orderData.billingAddress,
        paymentMethod,
        couponCode: appliedCoupon?.code || undefined,
        customerGstin: requestGstInvoice ? customerGstin.trim().toUpperCase() : undefined,
        customerBusinessName: requestGstInvoice ? customerBusinessName.trim() : undefined
      });
      if (resp?.data?.orderId) {
        orderId = resp.data.orderId;
      } else {
        throw new Error('Order creation service did not return a valid order ID. Please retry.');
      }

      setCreatedOrderId(orderId);

      // Handle Online Payment via Cashfree
      if (paymentMethod === 'cashfree') {
        const createCashfreeOrderFn = httpsCallable<any, any>(functions, 'createCashfreeOrder');
        const cfRes = await createCashfreeOrderFn({
          orderId,
          customerPhone: shippingPhone,
          customerEmail: user.email || 'customer@biocart.in',
          customerName: shippingName
        });

        const paymentSessionId = cfRes?.data?.paymentSessionId;
        if (!paymentSessionId) {
          throw new Error('Could not initiate secure Cashfree payment session.');
        }

        if (typeof Cashfree !== 'undefined') {
          const cashfree = Cashfree({
            mode: cfRes?.data?.environment === 'PRODUCTION' ? 'production' : 'sandbox'
          });

          cashfree.checkout({
            paymentSessionId,
            redirectTarget: '_modal'
          }).then(async (result: any) => {
            if (result.error) {
              console.error('Cashfree modal error:', result.error);
              addToast(result.error.message || 'Payment cancelled or incomplete.', 'error');
              setIsProcessingPayment(false);
              return;
            }

            // Authoritative server-side verification
            try {
              const verifyFn = httpsCallable<any, any>(functions, 'verifyCashfreePayment');
              const verifyRes = await verifyFn({ orderId });
              if (verifyRes?.data?.success) {
                setStep('success');
                addToast('Payment received! Order confirmed.', 'success');
              } else {
                addToast('Payment verification pending or incomplete.', 'warning');
              }
            } catch (vErr: any) {
              console.warn('Payment verification check:', vErr);
              addToast('Order recorded. Payment status will update shortly.', 'info');
              setStep('success');
            } finally {
              setIsProcessingPayment(false);
            }
          }).catch((modalErr: any) => {
            console.error('Cashfree dropin exception:', modalErr);
            addToast('Error displaying payment gateway. Please retry.', 'error');
            setIsProcessingPayment(false);
          });
          return;
        } else {
          addToast('Cashfree Payment Gateway initialized. Verifying payment...', 'info');
          setStep('success');
          setIsProcessingPayment(false);
          return;
        }
      }

      // Cash on Delivery
      setStep('success');
      addToast('Order placed successfully!', 'success');
    } catch (error: any) {
      addToast(error.message || 'Failed to place order', 'error');
    } finally {
      setIsProcessingPayment(false);
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

                    {/* Coupon Input Section */}
                    <div className="p-4 bg-slate-50 dark:bg-charcoal-800/40 rounded-2xl border border-slate-150 dark:border-white/5 space-y-2">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Have a Promo or Store Coupon?</span>
                      </div>
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-emerald-800 dark:text-emerald-300 uppercase">
                              {appliedCoupon.code}
                            </span>
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                              (₹{couponDiscount} applied)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Enter coupon code (e.g. ORGANIC15)"
                              value={couponInput}
                              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                              className="flex-grow px-3 py-2 bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-mono uppercase focus:outline-none focus:border-emerald-600"
                            />
                            <button
                              type="button"
                              onClick={handleApplyCoupon}
                              disabled={validatingCoupon}
                              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                            >
                              {validatingCoupon ? 'Checking...' : 'Apply'}
                            </button>
                          </div>
                          {couponError && (
                            <p className="text-[11px] text-rose-600 font-medium">{couponError}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Order summary breakdown */}
                    <div className="p-5 bg-slate-50 dark:bg-charcoal-800/40 rounded-2xl border border-slate-150 dark:border-white/5 space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-charcoal-500">Items Subtotal</span>
                        <span className="font-semibold text-charcoal-900 dark:text-white">₹{subtotal}</span>
                      </div>
                      {couponDiscount > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span className="font-medium">Coupon Discount</span>
                          <span className="font-semibold">-₹{couponDiscount}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-charcoal-500">Shipping Delivery</span>
                        <span className="font-semibold text-charcoal-900 dark:text-white">
                          {shippingFee === 0 ? <span className="text-emerald-600">FREE</span> : `₹${shippingFee}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-charcoal-500">Applicable Taxes (GST)</span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">Included in MRP (₹0)</span>
                      </div>
                      <div className="h-[1px] bg-slate-200 dark:bg-white/10 my-1" />
                      <div className="flex justify-between text-base font-bold">
                        <span className="text-charcoal-900 dark:text-white">Estimated Total</span>
                        <span className="text-nature-700 dark:text-nature-400">₹{total}</span>
                      </div>
                    </div>

                    {isBelowMinOrder && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>Minimum order requirement of ₹{minOrderReq} is not met (Current Subtotal: ₹{subtotal}).</span>
                      </div>
                    )}

                    <button
                      disabled={isBelowMinOrder}
                      onClick={() => setStep('checkout')}
                      className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-medium shadow-md transition-all ${
                        isBelowMinOrder
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          : 'bg-nature-700 hover:bg-nature-800 text-white cursor-pointer hover:scale-105 active:scale-95 duration-300 ease-out shadow-nature-700/30'
                      }`}
                    >
                      <span>{isBelowMinOrder ? `Add ₹${minOrderReq - subtotal} more to checkout` : 'Proceed to Secure Checkout'}</span>
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
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-charcoal-600 dark:text-slate-300">PIN Code</label>
                        {checkingPincode && (
                          <span className="text-[10px] text-nature-700 dark:text-nature-400 flex items-center gap-1 font-semibold">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Verifying...
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="6-digit PIN"
                        value={shippingZip}
                        onChange={(e) => setShippingZip(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-charcoal-800 text-charcoal-950 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl focus:border-nature-600 focus:outline-none text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* EKART Serviceability Badge */}
                  {pincodeStatus && (
                    <div
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                        pincodeStatus.serviceable
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-300'
                          : 'bg-amber-50/80 border-amber-200 text-amber-900 dark:bg-amber-950/20 dark:border-amber-800/40 dark:text-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-4 h-4 flex-shrink-0" />
                        <span className="font-semibold">
                          {pincodeStatus.serviceable
                            ? 'EKART Express Delivery Available'
                            : 'Limited Logistics Coverage'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                        {pincodeStatus.serviceable
                          ? `COD: ${pincodeStatus.cod ? 'YES' : 'NO'}`
                          : 'Standard Post Only'}
                      </span>
                    </div>
                  )}

                  {/* GST Invoice Section (B2B Tax Credit) */}
                  <div className="p-3 bg-slate-50 dark:bg-charcoal-800/60 rounded-xl border border-slate-200 dark:border-white/10 space-y-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-charcoal-800 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={requestGstInvoice}
                        onChange={(e) => setRequestGstInvoice(e.target.checked)}
                        className="rounded text-nature-600 focus:ring-nature-500 h-4 w-4"
                      />
                      <span>I need a GST invoice for business tax credit</span>
                    </label>

                    {requestGstInvoice && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-white/5">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">Business Name *</label>
                          <input
                            type="text"
                            required={requestGstInvoice}
                            placeholder="e.g. Green Earth Enterprises"
                            value={customerBusinessName}
                            onChange={(e) => setCustomerBusinessName(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-charcoal-900 border border-slate-300 dark:border-white/10 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">GSTIN Number *</label>
                          <input
                            type="text"
                            required={requestGstInvoice}
                            maxLength={15}
                            placeholder="15-digit GSTIN (e.g. 36AAAAA0000A1Z5)"
                            value={customerGstin}
                            onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                            className="w-full px-3 py-2 bg-white dark:bg-charcoal-900 border border-slate-300 dark:border-white/10 rounded-lg text-xs font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Simulated Payment */}
                <div className="space-y-4">
                  <h4 className="font-display font-bold text-sm uppercase tracking-wider text-charcoal-500 border-b border-slate-100 dark:border-white/5 pb-2">
                    Select Payment (Secure Sandbox)
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cashfree')}
                      className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        paymentMethod === 'cashfree'
                          ? 'border-nature-700 bg-nature-50/50 dark:bg-nature-950/20 text-nature-800 dark:text-nature-400 font-bold'
                          : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-charcoal-800 text-charcoal-600'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-nature-700" />
                      <span className="text-xs font-semibold">Cashfree Payments (UPI, Cards, NetBanking)</span>
                    </button>
                    <button
                      type="button"
                      disabled={!isCodEligible}
                      onClick={() => {
                        if (isCodEligible) setPaymentMethod('cod');
                      }}
                      className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1 transition-all ${
                        !isCodEligible
                          ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
                          : paymentMethod === 'cod'
                          ? 'border-nature-700 bg-nature-50/50 dark:bg-nature-950/20 text-nature-800 dark:text-nature-400 font-bold cursor-pointer'
                          : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-charcoal-800 text-charcoal-600 cursor-pointer'
                      }`}
                    >
                      <ShoppingBag className="w-5 h-5 text-nature-700" />
                      <span className="text-xs font-semibold">Cash on Delivery (COD)</span>
                      {!isCodEligible && (
                        <span className="text-[10px] text-slate-500 font-normal">
                          {!codAllowedGlobal 
                            ? 'Disabled for this order' 
                            : total < codMinVal 
                            ? `Min order ₹${codMinVal}` 
                            : `Max order ₹${codMaxVal}`}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-2xl flex gap-3 text-xs text-emerald-800 dark:text-emerald-400">
                  <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-600" />
                  <p className="leading-relaxed">
                    Your connection is encrypted. Sindulis Agro Products ensures fully safe, certified PCI-compliant gateway proxies.
                  </p>
                </div>

                {/* Quote Status Warning & Retry */}
                {quoteStatus === 'failed' && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
                    <span>{quoteError || 'Could not verify prices with server.'}</span>
                    <button
                      type="button"
                      onClick={fetchAuthoritativeQuote}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-[11px]"
                    >
                      Retry Quote
                    </button>
                  </div>
                )}

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
                    disabled={quoteStatus !== 'valid' || isProcessingPayment}
                    className={`flex-grow flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold shadow-md transition-all duration-200 ${
                      quoteStatus !== 'valid' || isProcessingPayment
                        ? 'bg-slate-300 dark:bg-charcoal-700 text-slate-500 cursor-not-allowed opacity-70'
                        : 'bg-[#004643] hover:bg-[#003532] text-white cursor-pointer hover:scale-[1.02] active:scale-95 shadow-[#004643]/30 !text-white'
                    }`}
                  >
                    {isProcessingPayment ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Processing Payment...
                      </span>
                    ) : quoteStatus === 'loading' ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Verifying Price...
                      </span>
                    ) : quoteStatus === 'failed' ? (
                      <span>Quote Error • Please Retry</span>
                    ) : (
                      <span className="!text-white">Authorize & Pay • ₹{total}</span>
                    )}
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
