import React, { useState, useEffect } from 'react';
import { AdminService } from '../../services/AdminService';
import { ShoppingBag, Search, ExternalLink, Package } from 'lucide-react';

export const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    return AdminService.subscribeToOrders((list) => setOrders(list));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-blue-400" />
          Orders Foundation & Multi-Vendor Tracking
        </h1>
        <p className="text-xs text-[#777777]">View customer purchases, payment methods, and multi-vendor sub-orders foundation.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[#777777] uppercase font-mono text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3">Order #</th>
                <th className="p-3">Customer ID / Email</th>
                <th className="p-3">Payment Method</th>
                <th className="p-3">Payment Status</th>
                <th className="p-3">Total Amount</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {orders.length > 0 ? (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-mono font-bold text-emerald-400">{o.orderNumber || o.id}</td>
                    <td className="p-3 text-slate-600">{o.userId || 'Guest Checkout'}</td>
                    <td className="p-3 uppercase font-mono text-[10px] text-[#777777]">{o.paymentMethod || 'COD'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-semibold rounded text-[10px] uppercase">
                        {o.paymentStatus || 'completed'}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900">₹{o.totalAmount || 0}</td>
                    <td className="p-3 text-[#777777] font-mono text-[10px]">
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#777777] text-xs">
                    No orders submitted yet. Checkout orders will stream here in real time.
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
