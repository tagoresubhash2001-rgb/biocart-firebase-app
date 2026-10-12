import React, { useEffect, useState } from 'react';
import { Package, ShoppingBag, Wallet } from 'lucide-react';
import { collection, query, where, doc, collectionGroup, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useVendor } from '../../hooks/useVendor';

export const VendorDashboardHome: React.FC = () => {
  const { vendorId } = useVendor();

  const [productCount, setProductCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    if (!vendorId) return;

    const qProd = query(collection(db, 'products'), where('vendorId', '==', vendorId));
    const unsubProd = onSnapshot(qProd, (snap) => setProductCount(snap.size));

    const qOrder = query(collectionGroup(db, 'vendor_orders'), where('vendorId', '==', vendorId));
    const unsubOrder = onSnapshot(qOrder, (snap) => setOrderCount(snap.size));

    // FIXED: read the vendor's own wallet doc directly (vendor_wallets/{vendorId})
    // instead of subscribing to the whole collection and filtering client-side —
    // the whole-collection read was also blocked by Firestore rules regardless.
    const walletRef = doc(db, 'vendor_wallets', vendorId);
    const unsubWallet = onSnapshot(walletRef, (snap) => {
      if (snap.exists()) setWalletBalance(snap.data().availableBalance || 0);
    });

    return () => {
      unsubProd();
      unsubOrder();
      unsubWallet();
    };
  }, [vendorId]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Vendor Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div><p className="text-slate-500">Wallet Balance</p><h3 className="text-3xl font-bold text-slate-900">₹{walletBalance.toLocaleString()}</h3></div>
            <Wallet className="w-8 h-8 text-emerald-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div><p className="text-slate-500">Orders</p><h3 className="text-3xl font-bold text-slate-900">{orderCount}</h3></div>
            <ShoppingBag className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div><p className="text-slate-500">My Products</p><h3 className="text-3xl font-bold text-slate-900">{productCount}</h3></div>
            <Package className="w-8 h-8 text-indigo-500" />
          </div>
        </div>
      </div>
      <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl">
        <p>Welcome to your Vendor Panel. Realtime data is now active.</p>
      </div>
    </div>
  );
};
