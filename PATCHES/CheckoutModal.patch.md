# Patch: src/components/CheckoutModal.tsx

This file is too long (400+ lines of UI) to safely hand you as a full replacement — instead, apply this exact patch (find the OLD block, replace with the NEW block). Everything else in the file stays untouched.

## 1. Add imports (top of file, after the existing imports)

**FIND:**
```tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { X, ShoppingBag, Trash2, ArrowRight, ShieldCheck, CreditCard, Sparkles, CheckCircle2 } from 'lucide-react';
```

**REPLACE WITH:**
```tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { X, ShoppingBag, Trash2, ArrowRight, ShieldCheck, CreditCard, Sparkles, CheckCircle2 } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../config/firebase';

const functions = getFunctions(app);
const createOrderCF = httpsCallable(functions, 'createOrder');
```

## 2. Replace the fake checkout handler with a real one

**FIND:**
```tsx
  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingName || !shippingPhone || !shippingAddress || !shippingZip) {
      addToast('Please fill out all required fields', 'warning');
      return;
    }
    
    // Simulate transaction
    const orderId = `BC-${Math.floor(100000 + Math.random() * 900000)}-IN`;
    setCreatedOrderId(orderId);
    setStep('success');
    addToast('Payment authorization successful via BioCart Secure Gateway!', 'success');
  };
```

**REPLACE WITH:**
```tsx
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingName || !shippingPhone || !shippingAddress || !shippingZip) {
      addToast('Please fill out all required fields', 'warning');
      return;
    }

    // FIXED: this previously never wrote an order anywhere — it just faked
    // a random order id client-side and showed a fake success message.
    // No inventory was checked, nothing was persisted, and the "Payment
    // authorization successful" toast was shown even though no payment or
    // order actually happened. This now calls the real createOrder Cloud
    // Function, which validates stock, computes totals server-side, splits
    // the order per vendor, and only then returns a real order id.
    setIsPlacingOrder(true);
    try {
      const addressPayload = {
        name: shippingName,
        phone: shippingPhone,
        street: shippingAddress,
        city: shippingCity,
        state: shippingState,
        postalCode: shippingZip
      };

      const result: any = await createOrderCF({
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantityInCart || 1
        })),
        shippingAddress: addressPayload,
        billingAddress: addressPayload
        // couponCode: appliedCouponCode  -- wire this in if/when a coupon-code field exists in this modal
      });

      setCreatedOrderId(result.data.orderId);
      setStep('success');
      addToast('Order placed successfully!', 'success');
    } catch (err: any) {
      console.error('createOrder failed:', err);
      addToast(err?.message || 'Could not place your order. Please try again.', 'warning');
    } finally {
      setIsPlacingOrder(false);
    }
  };
```

## 3. Disable the submit button while placing the order

Find the submit `<button type="submit">` inside the checkout form (the one that currently says something like "Place Order" / "Pay Now") and add `disabled={isPlacingOrder}` to it, and change its label to show `isPlacingOrder ? 'Placing Order...' : 'Place Order'` (adjust to match whatever the existing button text says — don't change anything else about its styling).

## Why payment is still COD/mock here
Razorpay isn't wired in yet (that's Phase 4, later). `createOrder` currently always sets `paymentMethod: 'cod'` and `paymentStatus: 'pending'` — that's expected for now. The important fix in this patch is that a REAL order document now gets written, stock actually gets checked and decremented, and the vendor split actually happens — none of which was true before.
