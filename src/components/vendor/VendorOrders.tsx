import React, { useState, useEffect } from 'react';
import { collectionGroup, query, where, orderBy, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useVendor } from '../../hooks/useVendor';
import { useApp } from '../../context/AppContext';
import { 
  ShoppingBag, Package, Truck, Printer, Eye, RefreshCw, 
  CheckCircle2, XCircle, ArrowRight, X, MapPin 
} from 'lucide-react';
import { ShippingService, TrackingResult } from '../../services/ShippingService';
import { ShipmentItem } from '../../types';

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
  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [shippingActionOrder, setShippingActionOrder] = useState<string | null>(null);

  // Live tracking modal state
  const [trackingAwb, setTrackingAwb] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<TrackingResult | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const [orderQueryError, setOrderQueryError] = useState<string | null>(null);

  useEffect(() => {
    if (!vendorId) return;
    setOrderQueryError(null);

    // 1. Subscribe to vendor orders
    const parseAndSortVendorOrders = (snap: any) => {
      const list: VendorOrderSlice[] = [];
      snap.forEach((docSnap: any) => {
        list.push({ id: docSnap.id, ref: docSnap.ref, ...(docSnap.data() as any) });
      });
      list.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      return list;
    };

    let fallbackUnsub: (() => void) | null = null;
    const q = query(
      collectionGroup(db, 'vendor_orders'),
      where('vendorId', '==', vendorId),
      orderBy('createdAt', 'desc')
    );

    const unsubOrders = onSnapshot(q, (snap) => {
      setOrders(parseAndSortVendorOrders(snap));
      setOrderQueryError(null);
    }, (err) => {
      console.warn('Vendor orders composite query failed, attempting unindexed query:', err);
      const fallbackQ = query(
        collectionGroup(db, 'vendor_orders'),
        where('vendorId', '==', vendorId)
      );
      fallbackUnsub = onSnapshot(fallbackQ, (fallbackSnap) => {
        setOrders(parseAndSortVendorOrders(fallbackSnap));
        setOrderQueryError(null);
      }, (fallbackErr: any) => {
        console.error('Vendor orders subscription error:', fallbackErr);
        setOrderQueryError(fallbackErr?.message || 'Unable to load orders. Firestore collection-group indexing or permissions may be required.');
      });
    });

    // 2. Subscribe to vendor shipments
    const unsubShipments = ShippingService.subscribeToShipments((list) => {
      setShipments(list);
    }, vendorId);

    return () => {
      unsubOrders();
      if (fallbackUnsub) fallbackUnsub();
      unsubShipments();
    };
  }, [vendorId]);

  const handleUpdateShipment = async (order: VendorOrderSlice, status: VendorOrderSlice['shipmentStatus']) => {
    try {
      await updateDoc(order.ref, { shipmentStatus: status });
      addToast(`Order ${order.orderNumber} marked as ${status}`, 'success');
    } catch (err) {
      addToast('Failed to update shipment status', 'warning');
    }
  };

  const handleCreateShipment = async (order: VendorOrderSlice) => {
    setShippingActionOrder(order.orderNumber);
    try {
      const res = await ShippingService.createShipment({
        orderNumber: order.orderNumber,
        vendorId: order.vendorId || vendorId || '',
        goodsDescription: order.items.map(i => i.name).join(', ').substring(0, 50)
      });
      addToast(`Delhivery shipment created! AWB: ${res.waybill}`, 'success');
    } catch (err: any) {
      console.error('Failed to create shipment:', err);
      addToast(err.message || 'Failed to dispatch with Delhivery', 'error');
    } finally {
      setShippingActionOrder(null);
    }
  };

  const handleTrackLive = async (awb: string) => {
    setTrackingAwb(awb);
    setTrackingLoading(true);
    setTrackingData(null);
    try {
      const res = await ShippingService.trackShipment(awb);
      setTrackingData(res);
    } catch (err: any) {
      console.error('Tracking failed:', err);
      addToast(err.message || 'Failed to query live tracking from Delhivery.', 'error');
    } finally {
      setTrackingLoading(false);
    }
  };

  const handlePrintLabel = async (awb: string) => {
    try {
      const res = await ShippingService.getShippingLabel(awb);
      if (res.labelUrl) {
        window.open(res.labelUrl, '_blank');
      } else {
        addToast('Packing slip URL not returned.', 'warning');
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to retrieve shipping label.', 'error');
    }
  };

  // Find shipment matching order
  const getShipmentForOrder = (orderNumber: string) => {
    return shipments.find((s) => s.orderNumber === orderNumber || s.orderId === orderNumber);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-emerald-600" />
          My Vendor Orders & Logistics
        </h1>
        <p className="text-xs text-slate-500">
          Manage fulfillment for your items, dispatch packages via Delhivery, print shipping slips, and track shipments in real time.
        </p>
      </div>

      {orderQueryError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">Error loading vendor orders</p>
            <p className="text-red-700">{orderQueryError}</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3">Order #</th>
                <th className="p-3">Items</th>
                <th className="p-3">Subtotal</th>
                <th className="p-3">Commission</th>
                <th className="p-3">You Receive</th>
                <th className="p-3">Shipment Status</th>
                <th className="p-3 text-right">Delhivery Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length > 0 ? (
                orders.map((o) => {
                  const shipment = getShipmentForOrder(o.orderNumber);
                  const awb = shipment?.trackingNumber || shipment?.waybill || o.trackingNumber;
                  const isProcessing = shippingActionOrder === o.orderNumber;

                  return (
                    <tr key={o.id + o.orderNumber} className="hover:bg-slate-50/50 transition-colors align-top">
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {o.orderNumber}
                        {awb && (
                          <div className="text-[10px] font-mono text-emerald-600 mt-1 flex items-center gap-1">
                            <Truck className="w-3 h-3 text-emerald-600" />
                            AWB: {awb}
                          </div>
                        )}
                      </td>
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
                          className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold uppercase bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          {SHIPMENT_STAGES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-right">
                        {awb ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleTrackLive(awb)}
                              className="px-2.5 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 font-semibold"
                              title="Track Live Delhivery Status"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Track
                            </button>
                            <button
                              onClick={() => handlePrintLabel(awb)}
                              className="px-2.5 py-1 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 font-semibold"
                              title="Print Packing Slip"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Label
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleCreateShipment(o)}
                            disabled={isProcessing}
                            className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shadow-sm flex items-center gap-1.5 font-bold disabled:opacity-50 ml-auto"
                          >
                            {isProcessing ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Truck className="w-3.5 h-3.5" />
                            )}
                            Ship with Delhivery
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    <Truck className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    No orders for your products yet. They'll stream here in real time once a customer buys.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Tracking Modal */}
      {trackingAwb && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Live Delhivery Tracking</h3>
                  <span className="text-xs font-mono text-emerald-600 font-semibold">{trackingAwb}</span>
                </div>
              </div>
              <button
                onClick={() => setTrackingAwb(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {trackingLoading ? (
              <div className="py-12 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                <p className="text-xs">Querying Delhivery tracking API...</p>
              </div>
            ) : trackingData ? (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">Carrier Status</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                      {trackingData.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 font-medium">
                    {trackingData.carrierStatus}
                  </div>
                  {trackingData.expectedDeliveryDate && (
                    <div className="mt-2 text-[11px] text-slate-500">
                      Expected Delivery: <strong className="text-slate-800">{new Date(trackingData.expectedDeliveryDate).toLocaleDateString()}</strong>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Tracking Journey
                  </h4>
                  {trackingData.scans && trackingData.scans.length > 0 ? (
                    <div className="relative border-l-2 border-slate-200 ml-3 space-y-4 py-1">
                      {trackingData.scans.map((scan, idx) => (
                        <div key={idx} className="relative pl-5">
                          <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-emerald-600 border-2 border-white shadow-sm" />
                          <div className="text-xs font-semibold text-slate-800">{scan.instructions || scan.status}</div>
                          <div className="text-[10px] text-slate-500">
                            {scan.location ? `${scan.location} • ` : ''}
                            {scan.timestamp ? new Date(scan.timestamp).toLocaleString() : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No package scans reported yet by Delhivery.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Unable to load tracking details.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

