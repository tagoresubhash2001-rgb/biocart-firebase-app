import React, { useState, useEffect, useMemo } from 'react';
import { collectionGroup, query, where, orderBy, onSnapshot, doc, getDoc, arrayUnion } from 'firebase/firestore';
import { db, functions } from '../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../../contexts/AuthContext';
import { useVendor } from '../../hooks/useVendor';
import { useApp } from '../../context/AppContext';
import { 
  ShoppingBag, Package, Truck, Printer, Eye, RefreshCw, 
  CheckCircle2, XCircle, ArrowRight, X, MapPin, Download,
  CheckSquare, Square, Filter, Search, Calendar, AlertTriangle, FileText
} from 'lucide-react';
import { ShippingService, TrackingResult } from '../../services/ShippingService';
import { BulkShippingLabelService } from '../../services/BulkShippingLabelService';
import { VendorPackingSlipModal } from './VendorPackingSlipModal';
import { ShipmentItem } from '../../types';

export type OrderWorkflowStatus = 'new' | 'accepted' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'rejected';
export type ShipmentWorkflowStatus = 'pending' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'exception';

interface VendorOrderSlice {
  id: string; // vendor_orders doc id == vendorId
  vendorId: string;
  orderNumber: string;
  items: { productId: string; name: string; sku?: string; price: number; quantity: number; total: number }[];
  subtotal: number;
  commissionPercent: number;
  commissionAmount: number;
  vendorPayable: number;
  orderStatus?: OrderWorkflowStatus;
  status?: OrderWorkflowStatus;
  shipmentStatus: ShipmentWorkflowStatus;
  trackingNumber: string | null;
  carrier?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  notes?: string;
  createdAt?: any;
  ref: any;
  // Parent Order Cache fields for packing slip
  parentOrder?: any;
}

const ORDER_STAGES: { key: OrderWorkflowStatus; label: string; color: string }[] = [
  { key: 'new', label: '🆕 New', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'accepted', label: '✅ Accepted', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'processing', label: '⚙️ Processing', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'packed', label: '📦 Packed', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'shipped', label: '🚚 Shipped', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'delivered', label: '🏠 Delivered', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { key: 'cancelled', label: '❌ Cancelled', color: 'bg-red-50 text-red-700 border-red-200' },
  { key: 'rejected', label: '🚫 Rejected', color: 'bg-slate-100 text-slate-700 border-slate-300' },
];

export const VendorOrders: React.FC = () => {
  const { vendorId, vendorData } = useVendor();
  const { addToast } = useApp();

  const [orders, setOrders] = useState<VendorOrderSlice[]>([]);
  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [parentOrdersCache, setParentOrdersCache] = useState<Record<string, any>>({});
  const [shippingActionOrder, setShippingActionOrder] = useState<string | null>(null);

  // Search, Filters & Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [shipmentFilter, setShipmentFilter] = useState<string>('all');
  const [awbFilter, setAwbFilter] = useState<'all' | 'with_awb' | 'without_awb'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');

  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  // Packing Slip Modal State
  const [activePackingSlipOrder, setActivePackingSlipOrder] = useState<VendorOrderSlice | null>(null);

  // Live Tracking Modal State
  const [trackingAwb, setTrackingAwb] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<TrackingResult | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Bulk Label Progress State
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ total: number; completed: number; message: string } | null>(null);

  const [orderQueryError, setOrderQueryError] = useState<string | null>(null);

  useEffect(() => {
    if (!vendorId) return;
    setOrderQueryError(null);

    // 1. Subscribe to vendor orders
    const parseAndSortVendorOrders = (snap: any) => {
      const list: VendorOrderSlice[] = [];
      snap.forEach((docSnap: any) => {
        const data = docSnap.data();
        // Vendors only see orders that are paid (or COD-confirmed). Unpaid/expired checkouts are hidden.
        if (['awaiting_payment', 'payment_expired'].includes(String(data.status || ''))) return;
        list.push({ 
          id: docSnap.id, 
          ref: docSnap.ref, 
          orderStatus: data.orderStatus || data.status || 'new',
          ...data 
        });
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
      const parsed = parseAndSortVendorOrders(snap);
      setOrders(parsed);
      setOrderQueryError(null);

      // Delivery details come from the order's fulfilment snapshot (vendors cannot read parent orders).
      setParentOrdersCache(Object.fromEntries(parsed.map((vo: any) => [vo.orderNumber, { shippingAddress: vo.fulfilment || {}, paymentMethod: vo.paymentMethod }])));
    }, (err) => {
      console.warn('Vendor orders composite query failed, attempting unindexed query:', err);
      const fallbackQ = query(
        collectionGroup(db, 'vendor_orders'),
        where('vendorId', '==', vendorId)
      );
      fallbackUnsub = onSnapshot(fallbackQ, (fallbackSnap) => {
        const parsed = parseAndSortVendorOrders(fallbackSnap);
        setOrders(parsed);
        setOrderQueryError(null);

        setParentOrdersCache(Object.fromEntries(parsed.map((vo: any) => [vo.orderNumber, { shippingAddress: vo.fulfilment || {}, paymentMethod: vo.paymentMethod }])));
      }, (fallbackErr: any) => {
        console.error('Vendor orders subscription error:', fallbackErr);
        setOrderQueryError(fallbackErr?.message || 'Unable to load orders. Permissions or indexing may be required.');
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

  // Find shipment matching order
  const getShipmentForOrder = (orderNumber: string) => {
    return shipments.find((s) => s.orderNumber === orderNumber || s.orderId === orderNumber);
  };

  // Filtered Orders Calculation
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Text Search
      const searchMatch = !searchQuery.trim() || 
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.items.some(it => it.name.toLowerCase().includes(searchQuery.toLowerCase()));

      // 2. Order Status
      const currentStatus = (o.orderStatus || o.status || 'new').toLowerCase();
      const statusMatch = statusFilter === 'all' || currentStatus === statusFilter;

      // 3. Shipment Status
      const shipmentMatch = shipmentFilter === 'all' || o.shipmentStatus === shipmentFilter;

      // 4. AWB availability
      const shipment = getShipmentForOrder(o.orderNumber);
      const hasAwb = Boolean(shipment?.trackingNumber || shipment?.waybill || o.trackingNumber);
      const awbMatch = awbFilter === 'all' 
        ? true 
        : awbFilter === 'with_awb' ? hasAwb : !hasAwb;

      // 5. Date filter
      let dateMatch = true;
      if (dateFilter !== 'all') {
        const orderTime = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : new Date(o.createdAt || 0).getTime();
        const now = Date.now();
        if (dateFilter === 'today') {
          dateMatch = (now - orderTime) <= 86400000;
        } else if (dateFilter === '7days') {
          dateMatch = (now - orderTime) <= 7 * 86400000;
        } else if (dateFilter === '30days') {
          dateMatch = (now - orderTime) <= 30 * 86400000;
        }
      }

      return searchMatch && statusMatch && shipmentMatch && awbMatch && dateMatch;
    });
  }, [orders, shipments, searchQuery, statusFilter, shipmentFilter, awbFilter, dateFilter]);

  // Order Lifecycle Transition Handler
  const handleTransitionStatus = async (order: VendorOrderSlice, nextStatus: OrderWorkflowStatus) => {
    const currentStatus = order.orderStatus || order.status || 'new';

    // State Transition Validation Rules:
    // New -> Accepted | Rejected | Cancelled
    // Accepted -> Processing | Cancelled
    // Processing -> Packed
    // Packed -> Shipped (Triggered upon AWB dispatch)
    // Shipped -> Delivered
    if (currentStatus === 'cancelled' || currentStatus === 'rejected') {
      addToast(`Order ${order.orderNumber} is in terminal ${currentStatus} status and cannot be modified.`, 'warning');
      return;
    }

    if (currentStatus === 'delivered') {
      addToast('Order has already been delivered.', 'info');
      return;
    }

    if (nextStatus === 'rejected') {
      const reason = window.prompt('Please enter the reason for rejecting this order (e.g. Out of stock / Unable to fulfill):');
      if (!reason) {
        addToast('Rejection reason is required.', 'warning');
        return;
      }
      try {
        const updateVendorOrderStatusFn = httpsCallable(functions, 'updateVendorOrderStatus');
        await updateVendorOrderStatusFn({
          orderId: order.orderNumber,
          vendorId: order.vendorId || vendorId || '',
          newStatus: 'rejected',
          rejectionReason: reason
        });
        addToast(`Order ${order.orderNumber} rejected. Reason logged.`, 'info');
      } catch (e: any) {
        addToast(`Failed to reject order: ${e.message}`, 'error');
      }
      return;
    }

    try {
      const updateVendorOrderStatusFn = httpsCallable(functions, 'updateVendorOrderStatus');
      await updateVendorOrderStatusFn({
        orderId: order.orderNumber,
        vendorId: order.vendorId || vendorId || '',
        newStatus: nextStatus
      });
      addToast(`${({ accepted: currentStatus === 'processing' ? '⬅️ Back to ✅ Accepted' : '✅ Accepted', processing: currentStatus === 'packed' ? '⬅️ Back to ⚙️ Processing' : '⚙️ Processing started', packed: '📦 Packed — now book EKART', rejected: '🚫 Rejected', cancelled: '❌ Cancelled' } as Record<string, string>)[nextStatus] || nextStatus}: ${order.orderNumber}`, 'success');
    } catch (err: any) {
      console.error('Failed to update status:', err);
      addToast(err?.message || 'Failed to update order status', 'error');
    }
  };

  // EKART Shipment Dispatch
  const handleCreateShipment = async (order: VendorOrderSlice) => {
    if (String((order as any).status || order.orderStatus) !== 'packed') {
      addToast('Mark the order as Packed first, then book EKART.', 'warning');
      return;
    }
    // Weight is taken automatically from what the customer ordered (size × quantity).
    const autoWeight = Math.round(Number((order as any).totalWeightGrams) || 0);
    const weightLabel = autoWeight >= 1000 ? `${(autoWeight / 1000).toLocaleString('en-IN')} kg` : `${autoWeight} g`;
    const weightInput = window.prompt(
      autoWeight > 0
        ? `📦 Parcel weight from this order: ${weightLabel} (${autoWeight} g).\nPress OK to use it, or type a higher weight in grams if you add heavy packing:`
        : 'This order has no product weight on record. Enter the packed parcel weight in grams (e.g. 1200):',
      String(autoWeight > 0 ? autoWeight : 1000),
    );
    if (!weightInput) return;
    const sizeInput = window.prompt('Parcel size in cm as Length x Width x Height (e.g. 20x15x10):', '20x15x10');
    if (!sizeInput) return;
    const weightGrams = Math.round(Number(weightInput.replace(/[^0-9.]/g, '')));
    const [lengthCm, widthCm, heightCm] = sizeInput.toLowerCase().split(/[x*×, ]+/).map((n) => Math.round(Number(n)));
    if (autoWeight > 0 && weightGrams < autoWeight) {
      addToast(`Weight cannot be less than the ordered products (${weightLabel}).`, 'warning');
      return;
    }
    if (!(weightGrams > 0) || !(lengthCm > 0) || !(widthCm > 0) || !(heightCm > 0)) {
      addToast('Please enter a valid weight and size (e.g. 1000 and 20x15x10).', 'warning');
      return;
    }
    setShippingActionOrder(order.orderNumber);
    try {
      const res = await ShippingService.createShipment({
        orderNumber: order.orderNumber,
        vendorId: order.vendorId || vendorId || '',
        weightGrams, lengthCm, widthCm, heightCm,
      });
      addToast(`EKART shipment booked! Tracking ID: ${res.waybill}`, 'success');
    } catch (err: any) {
      console.error('Failed to create shipment:', err);
      addToast(err.message || 'Failed to dispatch with EKART', 'error');
    } finally {
      setShippingActionOrder(null);
    }
  };

  // Live EKART Tracking
  const handleTrackLive = async (awb: string) => {
    setTrackingAwb(awb);
    setTrackingLoading(true);
    setTrackingData(null);
    try {
      const res = await ShippingService.trackShipment(awb);
      setTrackingData(res);
    } catch (err: any) {
      console.error('Tracking failed:', err);
      addToast(err.message || 'Failed to query live tracking from EKART.', 'error');
    } finally {
      setTrackingLoading(false);
    }
  };

  // Individual Label Print / Download
  const handlePrintLabel = async (awb: string) => {
    try {
      const res = await ShippingService.getShippingLabel(awb);
      if (res.labelUrl) {
        window.open(res.labelUrl, '_blank');
      } else {
        addToast('Shipping label link not returned by carrier.', 'warning');
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to retrieve shipping label.', 'error');
    }
  };

  // Selection Checkbox Toggle
  const toggleSelectOrder = (orderNum: string) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderNum)) next.delete(orderNum);
      else next.add(orderNum);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.orderNumber)));
    }
  };

  // Bulk Label Download (Phase 5)
  const handleBulkDownloadLabels = async () => {
    const selectedList = orders.filter(o => selectedOrders.has(o.orderNumber));
    if (selectedList.length === 0) {
      addToast('Please select at least one order with an active AWB to print labels.', 'warning');
      return;
    }

    // Filter only orders with valid AWBs
    const eligibleJobs: { orderNumber: string; waybill: string }[] = [];
    let skippedCount = 0;

    selectedList.forEach(o => {
      const shipment = getShipmentForOrder(o.orderNumber);
      const awb = shipment?.trackingNumber || shipment?.waybill || o.trackingNumber;
      if (awb) {
        eligibleJobs.push({ orderNumber: o.orderNumber, waybill: awb });
      } else {
        skippedCount++;
      }
    });

    if (eligibleJobs.length === 0) {
      addToast(`None of the ${selectedList.length} selected orders have an AWB allocated yet. Ship them with EKART first.`, 'warning');
      return;
    }

    setBulkGenerating(true);
    setBulkProgress({ total: eligibleJobs.length, completed: 0, message: 'Initiating carrier label retrieval...' });

    const downloadedPdfs: { waybill: string; orderNumber: string; pdfBytes: Uint8Array }[] = [];
    const failures: { orderNumber: string; waybill: string; error: string }[] = [];

    for (let i = 0; i < eligibleJobs.length; i++) {
      const job = eligibleJobs[i];
      setBulkProgress({
        total: eligibleJobs.length,
        completed: i,
        message: `Fetching label for order ${job.orderNumber} (AWB: ${job.waybill})...`
      });

      try {
        const labelInfo = await ShippingService.getShippingLabel(job.waybill);
        if (!labelInfo.labelUrl) {
          throw new Error('Carrier returned empty label URL');
        }
        const bytes = await BulkShippingLabelService.fetchLabelPdfBytes(labelInfo.labelUrl);
        downloadedPdfs.push({
          waybill: job.waybill,
          orderNumber: job.orderNumber,
          pdfBytes: bytes
        });
      } catch (err: any) {
        console.warn(`Label fetch failed for ${job.waybill}:`, err);
        failures.push({
          orderNumber: job.orderNumber,
          waybill: job.waybill,
          error: err.message || 'Download failed'
        });
      }
    }

    if (downloadedPdfs.length === 0) {
      setBulkGenerating(false);
      setBulkProgress(null);
      addToast(`Failed to retrieve labels for selected orders. ${failures[0]?.error || ''}`, 'error');
      return;
    }

    try {
      setBulkProgress({
        total: eligibleJobs.length,
        completed: eligibleJobs.length,
        message: `Merging ${downloadedPdfs.length} standard 4×6 inch labels into single PDF...`
      });

      const mergedPdfBytes = await BulkShippingLabelService.mergeShippingLabels(downloadedPdfs);
      const filename = `BioCart_Labels_${vendorId}_${new Date().toISOString().slice(0, 10)}.pdf`;
      BulkShippingLabelService.downloadPdf(mergedPdfBytes, filename);

      addToast(
        `Generated combined PDF with ${downloadedPdfs.length} labels! ${skippedCount > 0 ? `(${skippedCount} orders skipped without AWB)` : ''}`,
        'success'
      );
    } catch (mergeErr: any) {
      console.error('Merge labels error:', mergeErr);
      addToast(`Could not merge PDFs: ${mergeErr.message}`, 'error');
    } finally {
      setBulkGenerating(false);
      setBulkProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
            Vendor Order Processing & EKART Logistics
          </h1>
          <p className="text-xs text-slate-500">
            Accept incoming orders, pack products, print BioCart packing slips, allocate EKART AWBs, and download batch 4×6 labels.
          </p>
        </div>

        {/* Bulk Action Buttons */}
        <div className="flex items-center gap-2">
          {selectedOrders.size > 0 && (
            <button
              onClick={handleBulkDownloadLabels}
              disabled={bulkGenerating}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {bulkGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Download 4×6 Labels ({selectedOrders.size})</span>
            </button>
          )}
        </div>
      </div>

      {/* Query error alert */}
      {orderQueryError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">Error loading vendor orders</p>
            <p className="text-red-700">{orderQueryError}</p>
          </div>
        </div>
      )}

      {/* 2. Search, Filter & Date Range Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search order #, product name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Order Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Order Stages</option>
              <option value="new">🆕 New</option>
              <option value="accepted">✅ Accepted</option>
              <option value="processing">⚙️ Processing</option>
              <option value="packed">📦 Packed</option>
              <option value="shipped">🚚 Shipped</option>
              <option value="delivered">🏠 Delivered</option>
              <option value="cancelled">❌ Cancelled</option>
              <option value="rejected">🚫 Rejected</option>
            </select>
          </div>

          {/* AWB Availability Filter */}
          <div>
            <select
              value={awbFilter}
              onChange={(e) => setAwbFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Label States</option>
              <option value="with_awb">AWB Allocated (Ready)</option>
              <option value="without_awb">No AWB (Action Required)</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Past 7 Days</option>
              <option value="30days">Past 30 Days</option>
            </select>
          </div>

        </div>

        {/* Quick Batch Selection Info Bar */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAllFiltered}
              className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-emerald-700 cursor-pointer"
            >
              {selectedOrders.size > 0 && selectedOrders.size === filteredOrders.length ? (
                <CheckSquare className="w-4 h-4 text-emerald-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Select All Filtered ({filteredOrders.length})</span>
            </button>
            {selectedOrders.size > 0 && (
              <span className="text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                {selectedOrders.size} orders selected
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-400">
            Thermal 4×6 inch standard PDF packing labels • Barcode intact
          </div>
        </div>
      </div>

      {/* 3. Orders Management Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3 w-10 text-center">
                  <span className="sr-only">Select</span>
                </th>
                <th className="p-3">Order # & Date</th>
                <th className="p-3">Products & Qty</th>
                <th className="p-3">Net Earning</th>
                <th className="p-3">Workflow State</th>
                <th className="p-3">Packing Slip</th>
                <th className="p-3 text-right">EKART Dispatch & Label</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((o) => {
                  const shipment = getShipmentForOrder(o.orderNumber);
                  const awb = shipment?.trackingNumber || shipment?.waybill || o.trackingNumber;
                  const isProcessing = shippingActionOrder === o.orderNumber;
                  const currentStatus = o.orderStatus || o.status || 'new';
                  const isSelected = selectedOrders.has(o.orderNumber);

                  const stageObj = ORDER_STAGES.find(st => st.key === currentStatus) || ORDER_STAGES[0];

                  return (
                    <tr 
                      key={o.id + o.orderNumber} 
                      className={`hover:bg-slate-50/50 transition-colors align-top ${
                        isSelected ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOrder(o.orderNumber)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </td>

                      {/* Order Number & Meta */}
                      <td className="p-3 font-mono">
                        <span className="font-bold text-slate-900 block">{o.orderNumber}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {o.createdAt?.seconds 
                            ? new Date(o.createdAt.seconds * 1000).toLocaleDateString('en-IN') 
                            : 'Recent'}
                        </span>
                        {awb && (
                          <div className="text-[10px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                            <Truck className="w-3 h-3 text-emerald-600 shrink-0" />
                            AWB: {awb}
                          </div>
                        )}
                      </td>

                      {/* Line Items */}
                      <td className="p-3 max-w-xs">
                        {(o.items || []).map((it, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-slate-700 py-0.5 truncate">
                            <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{it.name}</span>
                            <span className="font-bold text-slate-900">×{it.quantity}</span>
                          </div>
                        ))}
                        {Number((o as any).totalWeightGrams) > 0 && (
                          <div className="text-[10px] text-slate-500 pt-0.5">⚖️ Parcel weight: {Number((o as any).totalWeightGrams) >= 1000 ? `${Number((o as any).totalWeightGrams) / 1000} kg` : `${(o as any).totalWeightGrams} g`}</div>
                        )}
                      </td>

                      {/* Financials */}
                      <td className="p-3 font-mono">
                        <div className="text-[10px] text-slate-500">Order value: ₹{(((o as any).commissionBasePaise ?? (o as any).subtotalPaise ?? 0) / 100).toFixed(2)}</div>
                        <div className="text-[10px] text-rose-500">BioCart commission{o.commissionPercent != null ? ` (${o.commissionPercent}%)` : ''}: -₹{Number(o.commissionAmount || 0).toFixed(2)}</div>
                        <div className="text-[10px] text-rose-500">EKART courier: {(o as any).courierChargePaise ? `-₹${(((o as any).courierChargePaise || 0) / 100).toFixed(2)}` : (o as any).awbNumber ? 'being calculated' : 'charged when you book EKART'}</div>
                        <div className="font-bold text-emerald-700">You get: ₹{((((o as any).vendorPayablePaise || 0) - ((o as any).courierChargePaise || 0)) / 100).toFixed(2)}</div>
                        <div className="text-[10px] text-slate-500">{(o as any).earnings?.state === 'eligible' ? 'In next Tuesday payout' : (o as any).earnings?.state === 'in_settlement' ? 'In settlement — being paid' : (o as any).earnings?.state === 'settled' ? 'Paid to your bank' : (o as any).earnings?.state === 'reversed' ? 'Refunded — not payable' : 'Payable after delivery'}</div>
                      </td>

                      {/* Workflow State Selector */}
                      <td className="p-3 space-y-1.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${stageObj.color}`}>
                          {stageObj.label}
                        </span>

                        {/* Order Advancement Actions */}
                        {currentStatus === 'new' && (
                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              onClick={() => handleTransitionStatus(o, 'accepted')}
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              ✅ Accept
                            </button>
                            <button
                              onClick={() => handleTransitionStatus(o, 'rejected')}
                              className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-[10px] font-bold cursor-pointer"
                            >
                              ❌ Reject
                            </button>
                          </div>
                        )}

                        {/* Step tracker: ✅ → ⚙️ → 📦 → 🚚 → 🏠 */}
                        {['accepted', 'processing', 'packed', 'shipped', 'delivered'].includes(currentStatus) && (
                          <div className="flex items-center gap-0.5 text-[13px] pt-0.5" title="Accepted → Processing → Packed → Shipped → Delivered">
                            {[['accepted', '✅'], ['processing', '⚙️'], ['packed', '📦'], ['shipped', '🚚'], ['delivered', '🏠']].map(([k, e], i, arr) => {
                              const reached = arr.findIndex(([kk]) => kk === currentStatus) >= i;
                              return (
                                <React.Fragment key={k}>
                                  <span className={reached ? '' : 'opacity-25 grayscale'}>{e}</span>
                                  {i < arr.length - 1 && <span className={`text-[9px] ${reached ? 'text-emerald-600' : 'text-slate-300'}`}>›</span>}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        )}

                        {['accepted', 'processing', 'packed'].includes(currentStatus) && !awb && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {currentStatus === 'processing' && (
                              <button
                                onClick={() => handleTransitionStatus(o, 'accepted')}
                                className="px-2 py-0.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-[10px] font-bold cursor-pointer"
                                title="Move back one step"
                              >
                                ⬅️ ✅ Accepted
                              </button>
                            )}
                            {currentStatus === 'packed' && (
                              <button
                                onClick={() => handleTransitionStatus(o, 'processing')}
                                className="px-2 py-0.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-[10px] font-bold cursor-pointer"
                                title="Move back one step"
                              >
                                ⬅️ ⚙️ Processing
                              </button>
                            )}
                            {currentStatus === 'accepted' && (
                              <button
                                onClick={() => handleTransitionStatus(o, 'processing')}
                                className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold cursor-pointer"
                              >
                                ⚙️ Processing ➡️
                              </button>
                            )}
                            {currentStatus === 'processing' && (
                              <button
                                onClick={() => handleTransitionStatus(o, 'packed')}
                                className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold cursor-pointer"
                              >
                                📦 Packed ➡️
                              </button>
                            )}
                            {currentStatus === 'packed' && (
                              <span className="text-[10px] text-slate-500">Next: 🚚 Dispatch EKART</span>
                            )}
                          </div>
                        )}

                        {currentStatus === 'rejected' && o.rejectionReason && (
                          <p className="text-[10px] text-red-600 italic">
                            Reason: {o.rejectionReason}
                          </p>
                        )}
                      </td>

                      {/* Packing Slip Action (Phase 3) */}
                      <td className="p-3">
                        <button
                          onClick={() => setActivePackingSlipOrder(o)}
                          className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg transition-colors flex items-center gap-1.5 font-bold text-xs cursor-pointer shadow-2xs"
                          title="Print official BioCart packing slip with watermark"
                        >
                          <FileText className="w-3.5 h-3.5 text-stone-600" />
                          <span>Order Slip</span>
                        </button>
                      </td>

                      {/* EKART Action (Phase 4) */}
                      <td className="p-3 text-right">
                        {awb ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleTrackLive(awb)}
                              className="px-2.5 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                              title="Track Live EKART Status"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Track
                            </button>
                            <button
                              onClick={() => handlePrintLabel(awb)}
                              className="px-2.5 py-1 text-xs bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1 font-bold border border-emerald-200/60 cursor-pointer"
                              title="Download official 4×6 carrier label"
                            >
                              <Printer className="w-3.5 h-3.5 text-emerald-700" />
                              4×6 Label
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleCreateShipment(o)}
                            disabled={isProcessing || currentStatus === 'rejected' || currentStatus === 'cancelled'}
                            className="px-3 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-all shadow-sm flex items-center gap-1.5 font-bold disabled:opacity-50 ml-auto cursor-pointer"
                          >
                            {isProcessing ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Truck className="w-3.5 h-3.5" />
                            )}
                            Dispatch EKART
                          </button>
                        )}
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 text-xs">
                    <Truck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No orders match your active search and filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Packing Slip Modal Component (Phase 3) */}
      {activePackingSlipOrder && (() => {
        const parent = parentOrdersCache[activePackingSlipOrder.orderNumber] || {};
        const shippingAddr = parent.shippingAddress || {};
        const shipment = getShipmentForOrder(activePackingSlipOrder.orderNumber);
        const awb = shipment?.trackingNumber || shipment?.waybill || activePackingSlipOrder.trackingNumber;

        return (
          <VendorPackingSlipModal
            orderNumber={activePackingSlipOrder.orderNumber}
            orderDate={activePackingSlipOrder.createdAt}
            invoiceNumber={parent.invoiceNumber || `INV-${activePackingSlipOrder.orderNumber}`}
            vendor={{
              storeName: vendorData?.storeName || vendorData?.businessName || 'BioCart Official Vendor',
              businessName: vendorData?.businessName,
              ownerName: vendorData?.ownerName,
              phone: vendorData?.phone || vendorData?.contact?.phone,
              email: vendorData?.email || vendorData?.contact?.email,
              gstin: vendorData?.legal?.gstin,
              address: vendorData?.addresses?.registeredAddress?.addressLine1 || vendorData?.addresses?.pickupAddress?.addressLine1,
            }}
            customer={{
              name: shippingAddr.name || shippingAddr.fullName || 'Customer',
              phone: shippingAddr.phoneNumber || shippingAddr.phone || 'N/A',
              street: [shippingAddr.address || shippingAddr.street, shippingAddr.addressLine2, shippingAddr.landmark].filter(Boolean).join(', ') || 'Address on record',
              city: shippingAddr.city || '',
              state: shippingAddr.state || '',
              postalCode: shippingAddr.zip || shippingAddr.postalCode || shippingAddr.pincode || '',
              country: shippingAddr.country || 'India',
            }}
            items={activePackingSlipOrder.items.map(it => ({
              productId: it.productId,
              name: it.name,
              sku: it.sku,
              quantity: it.quantity,
              price: it.price,
              total: it.total || it.price * it.quantity
            }))}
            financials={{
              subtotal: activePackingSlipOrder.subtotal,
              totalPayable: activePackingSlipOrder.subtotal,
              paymentMethod: parent.paymentMethod || 'Prepaid',
              paymentStatus: parent.paymentStatus || 'Completed'
            }}
            awbNumber={awb}
            onClose={() => setActivePackingSlipOrder(null)}
          />
        );
      })()}

      {/* 5. Live EKART Tracking Modal */}
      {trackingAwb && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Live EKART Tracking</h3>
                  <span className="text-xs font-mono text-emerald-700 font-semibold">{trackingAwb}</span>
                </div>
              </div>
              <button
                onClick={() => setTrackingAwb(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {trackingLoading ? (
              <div className="py-12 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                <p className="text-xs">Querying EKART carrier network...</p>
              </div>
            ) : trackingData ? (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">Carrier Status</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                      {trackingData.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-800 font-medium">
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
                          <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-emerald-600 border-2 border-white shadow-xs" />
                          <div className="text-xs font-semibold text-slate-800">{scan.instructions || scan.status}</div>
                          <div className="text-[10px] text-slate-500">
                            {scan.location ? `${scan.location} • ` : ''}
                            {scan.timestamp ? new Date(scan.timestamp).toLocaleString() : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No package scans reported yet by EKART.</p>
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

      {/* 6. Bulk Label Generation Floating Overlay */}
      {bulkGenerating && bulkProgress && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white p-5 rounded-2xl shadow-2xl border border-slate-700 max-w-sm w-full space-y-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-white">Generating 4×6 Bulk Labels</h4>
              <p className="text-[11px] text-slate-300">{bulkProgress.message}</p>
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(bulkProgress.completed / (bulkProgress.total || 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

    </div>
  );
};
