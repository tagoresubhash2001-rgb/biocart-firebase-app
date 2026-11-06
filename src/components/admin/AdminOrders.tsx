import React, { useState, useEffect } from 'react';
import { AdminService } from '../../services/AdminService';
import { functions } from '../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { ShoppingBag, Search, ExternalLink, Package, Filter, X, Eye, Truck, CheckCircle, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const { addToast } = useApp();

  useEffect(() => {
    return AdminService.subscribeToOrders((list) => setOrders(list));
  }, []);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = (
      (o.orderNumber && o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.id && o.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.userId && o.userId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.shippingAddress?.name && o.shippingAddress.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    const orderStatus = (o.status || o.orderStatus || 'placed').toLowerCase();
    const matchesStatus = statusFilter === 'ALL' || orderStatus === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingStatus(true);
      const updateOrderStatusFn = httpsCallable(functions, 'updateOrderStatus');
      await updateOrderStatusFn({ orderId, newStatus });
      addToast(`Order ${orderId} status updated to ${newStatus}`, 'success');
      if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.orderNumber === orderId)) {
        setSelectedOrder((prev: any) => prev ? { ...prev, status: newStatus, orderStatus: newStatus } : null);
      }
    } catch (err: any) {
      console.error('Failed to update order status:', err);
      addToast(err?.message || 'Failed to update order status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
            Orders Management & Multi-Vendor Tracking
          </h1>
          <p className="text-xs text-slate-500">
            Real-time customer purchases, carrier status, vendor sub-orders, and order fulfillment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by order #, customer, name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-64 shadow-xs"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:border-emerald-500 shadow-xs cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PLACED">Placed</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3">Order #</th>
                <th className="p-3">Customer / Recipient</th>
                <th className="p-3">Status</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Total Amount</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((o) => {
                  const currentStatus = (o.status || o.orderStatus || 'placed').toLowerCase();
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-mono font-bold text-emerald-700">{o.orderNumber || o.id}</td>
                      <td className="p-3">
                        <p className="font-semibold text-slate-900">{o.shippingAddress?.name || o.userId || 'Customer'}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{o.shippingAddress?.phone || o.userId}</p>
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          currentStatus === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : currentStatus === 'cancelled'
                            ? 'bg-rose-100 text-rose-800'
                            : currentStatus === 'shipped'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {currentStatus}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-[10px] uppercase text-slate-600 font-bold block">{o.paymentMethod || 'COD'}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{o.paymentStatus || 'pending'}</span>
                      </td>
                      <td className="p-3 font-bold text-slate-900">₹{o.totalAmount || 0}</td>
                      <td className="p-3 text-slate-400 font-mono text-[10px]">
                        {o.createdAt ? new Date(o.createdAt?.seconds ? o.createdAt.seconds * 1000 : o.createdAt).toLocaleDateString('en-IN') : 'Recent'}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    No orders matching the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  Order {selectedOrder.orderNumber || selectedOrder.id}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {selectedOrder.id}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status & Transition Actions */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Status</span>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                    {selectedOrder.status || selectedOrder.orderStatus || 'placed'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                  <span className="text-xs text-slate-500 font-medium mr-1">Update Status:</span>
                  {['placed', 'processing', 'shipped', 'delivered', 'cancelled'].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(selectedOrder.id, st)}
                      disabled={updatingStatus || (selectedOrder.status || '').toLowerCase() === st}
                      className="px-2.5 py-1 text-xs font-bold capitalize rounded-lg border border-slate-300 hover:bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items Snapshot */}
              <div>
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-3">Order Line Items</h4>
                <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-white">
                  {(selectedOrder.items || []).map((it: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100 last:border-b-0">
                      <div>
                        <p className="font-semibold text-slate-900">{it.name}</p>
                        <p className="text-[11px] text-slate-400">Qty: {it.qty || it.quantity || 1} • Rate: ₹{it.price || 0} • Vendor: {it.vendorId || 'biocart'}</p>
                      </div>
                      <span className="font-bold text-slate-800">₹{(it.price || 0) * (it.qty || it.quantity || 1)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="p-4 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-600 bg-white">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{selectedOrder.subtotal || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount / Coupon</span>
                  <span>-₹{selectedOrder.discountAmount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST / Tax</span>
                  <span>₹{selectedOrder.taxAmount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping Fee</span>
                  <span>₹{selectedOrder.shippingAmount || 0}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                  <span>Total Amount</span>
                  <span className="text-emerald-700">₹{selectedOrder.totalAmount || 0}</span>
                </div>
              </div>

              {/* Destination Address */}
              {selectedOrder.shippingAddress && (
                <div>
                  <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-2">Shipping Destination</h4>
                  <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 text-xs space-y-0.5">
                    <p className="font-bold text-slate-900">{selectedOrder.shippingAddress.name} ({selectedOrder.shippingAddress.phone})</p>
                    <p className="text-slate-600">{selectedOrder.shippingAddress.address || selectedOrder.shippingAddress.street}</p>
                    <p className="text-slate-600">
                      {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} - {selectedOrder.shippingAddress.zip || selectedOrder.shippingAddress.postalCode}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

