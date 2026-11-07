import React, { useState, useEffect } from 'react';
import { AdminService } from '../../services/AdminService';
import { functions, db } from '../../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
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
  const [subOrders, setSubOrders] = useState<any[]>([]);

  useEffect(() => {
    return AdminService.subscribeToOrders((list) => setOrders(list));
  }, []);

  // Live seller sub-orders of the opened order
  useEffect(() => {
    if (!selectedOrder?.id) { setSubOrders([]); return; }
    const unsub = onSnapshot(collection(db, 'orders', selectedOrder.id, 'vendor_orders'), (snap) => {
      setSubOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => setSubOrders([]));
    return () => unsub();
  }, [selectedOrder?.id]);

  // keep the drawer in sync with live order data
  useEffect(() => {
    if (!selectedOrder) return;
    const fresh = orders.find((o) => o.id === selectedOrder.id);
    if (fresh && fresh !== selectedOrder) setSelectedOrder(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const callAction = async (name: string, payload: any, okMessage: string) => {
    try {
      setUpdatingStatus(true);
      const fn = httpsCallable<any, any>(functions, name);
      const res = await fn(payload);
      const refund = res.data?.refund || (res.data?.refundId ? res.data : null);
      addToast(refund ? `${okMessage} Refund ₹${(refund.amountPaise || 0) / 100}: ${refund.status}` : okMessage, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Action failed', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const askReason = (label: string, min = 3) => {
    const r = window.prompt(label);
    if (!r || r.trim().length < min) { if (r !== null) addToast(`Please write at least ${min} characters.`, 'warning'); return null; }
    return r.trim();
  };

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
            <option value="AWAITING_PAYMENT">Awaiting payment</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PROCESSING">Processing</option>
            <option value="PARTIALLY_SHIPPED">Partially shipped</option>
            <option value="SHIPPED">Shipped</option>
            <option value="PARTIALLY_DELIVERED">Partially delivered</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="PAYMENT_EXPIRED">Payment expired</option>
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
                <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-200">
                  <div className="flex justify-between"><span>Payment</span><span className="font-bold uppercase">{selectedOrder.paymentMethod} · {selectedOrder.paymentStatus}</span></div>
                  {selectedOrder.paymentReference && <div className="flex justify-between"><span>Cashfree ref</span><span className="font-mono">{selectedOrder.paymentReference}</span></div>}
                  {selectedOrder.financialSummary && <div className="flex justify-between"><span>Gateway fee</span><span>{selectedOrder.financialSummary.gatewayFeeStatus === 'reconciled' ? `₹${(selectedOrder.financialSummary.gatewayFeePaise || 0) / 100}` : 'pending reconciliation'}</span></div>}
                  {selectedOrder.refundIds?.length > 0 && <div className="flex justify-between"><span>Refunds</span><span className="font-mono">{selectedOrder.refundIds.join(', ')}</span></div>}
                  {selectedOrder.paymentDiscrepancy && <div className="text-rose-600 font-bold">Payment discrepancy: {selectedOrder.paymentDiscrepancyReason}</div>}
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                  {!['cancelled', 'payment_expired', 'delivered'].includes(String(selectedOrder.status)) && (
                    <button
                      onClick={() => { const r = askReason('Reason for cancelling this whole order (the customer is refunded automatically):'); if (r) callAction('updateOrderStatus', { orderId: selectedOrder.id, newStatus: 'cancelled', reason: r }, 'Order cancelled.'); }}
                      disabled={updatingStatus}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-40 cursor-pointer"
                    >Cancel & refund order</button>
                  )}
                  {selectedOrder.paymentMethod === 'cod' && !selectedOrder.codRemitted && ['delivered', 'partially_delivered'].includes(String(selectedOrder.status)) && (
                    <button
                      onClick={() => { const r = askReason('EKART COD remittance reference:'); if (r) callAction('markCodRemitted', { orderId: selectedOrder.id, reference: r }, 'COD marked as remitted.'); }}
                      disabled={updatingStatus}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 hover:bg-white disabled:opacity-40 cursor-pointer"
                    >Mark COD cash received</button>
                  )}
                  <span className="text-[11px] text-slate-400">Order status updates automatically from each seller's shipment.</span>
                </div>
              </div>

              {/* Seller sub-orders */}
              <div>
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-3">Seller Sub-orders</h4>
                <div className="space-y-2">
                  {subOrders.map((so) => (
                    <div key={so.id} className="border border-slate-200 rounded-xl p-3 bg-white text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">{so.vendorStoreName || so.vendorId}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold uppercase text-[10px]">{so.status}</span>
                      </div>
                      <div className="flex justify-between text-slate-500"><span>Items ₹{so.subtotal} · commission {so.commissionPercent}% (₹{so.commissionAmount})</span><span>Vendor ₹{so.vendorPayable}</span></div>
                      <div className="flex justify-between text-slate-500"><span>Earnings: {so.earnings?.state || '—'}</span><span>{so.awbNumber ? `AWB ${so.awbNumber}` : so.shipmentStatus}</span></div>
                      {so.needsAdminAction && <div className="text-amber-700 font-semibold">{so.needsAdminAction}</div>}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {!['cancelled', 'rejected'].includes(String(so.status)) && so.earnings?.state !== 'reversed' && selectedOrder.financialsAllocated && (
                          <button
                            onClick={() => { const r = askReason(`Refund reason for ${so.vendorStoreName || so.vendorId}'s items (₹${(so.customerPaidPaise || 0) / 100}):`); if (r) callAction('processOrderRefund', { orderId: selectedOrder.id, vendorId: so.id, reason: r }, 'Refund started.'); }}
                            disabled={updatingStatus}
                            className="px-2 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold disabled:opacity-40 cursor-pointer"
                          >Refund this seller's items</button>
                        )}
                        {so.status === 'shipped' && (
                          <button
                            onClick={() => { const r = askReason('Courier did not confirm delivery automatically. Enter the reason and proof (e.g. EKART POD reference):', 10); if (r) callAction('adminMarkDelivered', { orderId: selectedOrder.id, vendorId: so.id, reason: r }, 'Marked delivered.'); }}
                            disabled={updatingStatus}
                            className="px-2 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 font-semibold disabled:opacity-40 cursor-pointer"
                          >Confirm delivery manually</button>
                        )}
                      </div>
                    </div>
                  ))}
                  {subOrders.length === 0 && <p className="text-xs text-slate-400">No seller sub-orders.</p>}
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

