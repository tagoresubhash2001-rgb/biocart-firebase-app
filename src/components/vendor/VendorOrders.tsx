import React, { useState, useEffect } from 'react';
import { collectionGroup, query, where, orderBy, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useVendor } from '../../hooks/useVendor';
import { useApp } from '../../context/AppContext';
import { ShoppingBag, Package, Truck } from 'lucide-react';

interface VendorOrderSlice {
  id: string; // vendor_orders doc id == vendorId
  vendorId: string;
  orderNumber: string;
  items: { productId: string; name: string; price: number; quantity: number; total: number }[];
  subtotal: number;
  commissionPercent: number;
  commissionAmount: number;
  vendorPayable: number;
  shipmentStatus: 'pending' | 'packed' | 'shipped' | 'delivered';
  trackingNumber: string | null;
  createdAt?: any;
  ref: any;
}

const SHIPMENT_STAGES: VendorOrderSlice['shipmentStatus'][] = ['pending', 'packed', 'shipped', 'delivered'];

export const VendorOrders: React.FC = () => {
  const { vendorId, loading } = useVendor();
  const { addToast } = useApp();

  const [orders, setOrders] = useState<VendorOrderSlice[]>([]);

  useEffect(() => {
    if (!vendorId) return;
    // FIXED: this previously subscribed to the entire `orders` collection
    // (every vendor's, every customer's orders) with no filter at all.
    // It now only ever reads this vendor's own order slices.
    const q = query(
      collectionGroup(db, 'vendor_orders'),
      where('vendorId', '==', vendorId),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: VendorOrderSlice[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ref: docSnap.ref, ...(docSnap.data() as any) });
      });
      setOrders(list);
    }, (err) => console.error('Vendor orders subscription error:', err));
    return () => unsub();
  }, [vendorId]);

  const handleUpdateShipment = async (order: VendorOrderSlice, status: VendorOrderSlice['shipmentStatus']) => {
    try {
      await updateDoc(order.ref, { shipmentStatus: status });
      addToast(`Order ${order.orderNumber} marked as ${status}`, 'success');
    } catch (err) {
      addToast('Failed to update shipment status', 'warning');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-blue-400" />
          My Orders
        </h1>
        <p className="text-xs text-[#777777]">Only the items from your store, across all customer orders.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[#777777] uppercase font-mono text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3">Order #</th>
                <th className="p-3">Items</th>
                <th className="p-3">Your Subtotal</th>
                <th className="p-3">Commission</th>
                <th className="p-3">You Receive</th>
                <th className="p-3">Shipment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length > 0 ? (
                orders.map((o) => (
                  <tr key={o.id + o.orderNumber} className="hover:bg-slate-50/50 transition-colors align-top">
                    <td className="p-3 font-mono font-bold text-emerald-600">{o.orderNumber}</td>
                    <td className="p-3">
                      {(o.items || []).map((it, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-slate-700">
                          <Package className="w-3 h-3 text-slate-400" />
                          {it.name} × {it.quantity}
                        </div>
                      ))}
                    </td>
                    <td className="p-3 font-semibold text-slate-900">₹{o.subtotal?.toFixed(2)}</td>
                    <td className="p-3 text-rose-500">-₹{o.commissionAmount?.toFixed(2)} ({o.commissionPercent}%)</td>
                    <td className="p-3 font-bold text-emerald-600">₹{o.vendorPayable?.toFixed(2)}</td>
                    <td className="p-3">
                      <select
                        value={o.shipmentStatus}
                        onChange={(e) => handleUpdateShipment(o, e.target.value as VendorOrderSlice['shipmentStatus'])}
                        className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold uppercase"
                      >
                        {SHIPMENT_STAGES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#777777] text-xs">
                    <Truck className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    No orders for your products yet. They'll stream here in real time once a customer buys.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
