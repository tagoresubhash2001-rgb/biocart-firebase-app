import React, { useState, useEffect } from 'react';
import { 
  Truck, Search, RefreshCw, CheckCircle2, Clock, AlertTriangle, 
  ExternalLink, Printer, XCircle, Sliders, Shield, MapPin, 
  Package, ArrowRight, X, ChevronRight, Eye
} from 'lucide-react';
import { ShippingService, ShippingConfig, TrackingResult } from '../../services/ShippingService';
import { ShipmentItem } from '../../types';
import { useApp } from '../../context/AppContext';

export const AdminShipments: React.FC = () => {
  const { addToast } = useApp();
  const [activeTab, setActiveTab] = useState<'shipments' | 'settings'>('shipments');
  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  // Settings State
  const [config, setConfig] = useState<ShippingConfig>({
    ekartEnv: 'production',
    defaultPickupLocation: 'BioCart Central Hub',
    clientName: 'SINDULIS B2C'
  });
  const [apiTokenInput, setApiTokenInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Live Tracking Modal State
  const [selectedAwb, setSelectedAwb] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<TrackingResult | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Action Loading
  const [actionLoadingAwb, setActionLoadingAwb] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = ShippingService.subscribeToShipments((list) => {
      setShipments(list);
      setLoading(false);
    });

    ShippingService.getShippingConfig().then((cfg) => {
      if (cfg) {
        setConfig(cfg);
        if (cfg.ekartToken) {
          setApiTokenInput(cfg.ekartToken);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await ShippingService.saveShippingConfig({
        ekartEnv: config.ekartEnv,
        defaultPickupLocation: config.defaultPickupLocation,
        clientName: config.clientName,
        ekartToken: apiTokenInput.trim() || undefined
      });
      addToast('EKART logistics settings saved securely.', 'success');
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      addToast(err.message || 'Failed to save settings.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTrackLive = async (awb: string) => {
    setSelectedAwb(awb);
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

  const handlePrintLabel = async (awb: string) => {
    setActionLoadingAwb(awb);
    try {
      const res = await ShippingService.getShippingLabel(awb);
      if (res.labelUrl) {
        window.open(res.labelUrl, '_blank');
        addToast('Opening EKART packing slip / shipping label...', 'info');
      } else {
        addToast('Packing slip URL not returned by EKART.', 'warning');
      }
    } catch (err: any) {
      console.error('Failed to get label:', err);
      addToast(err.message || 'Failed to retrieve shipping label.', 'error');
    } finally {
      setActionLoadingAwb(null);
    }
  };

  const handleCancelShipment = async (shipment: ShipmentItem) => {
    const awb = shipment.trackingNumber || shipment.waybill;
    if (!awb) {
      addToast('No AWB found for this shipment.', 'error');
      return;
    }
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel EKART shipment AWB ${awb}? This action cannot be undone.`
    );
    if (!confirmCancel) return;

    setActionLoadingAwb(awb);
    try {
      await ShippingService.cancelShipment(awb, 'Admin cancelled shipment from dashboard');
      addToast(`Shipment ${awb} cancelled successfully.`, 'success');
    } catch (err: any) {
      console.error('Failed to cancel shipment:', err);
      addToast(err.message || 'Failed to cancel shipment.', 'error');
    } finally {
      setActionLoadingAwb(null);
    }
  };

  // Filtered shipments
  const filteredShipments = shipments.filter((s) => {
    const raw = s as any;
    const q = searchQuery.toLowerCase().trim();
    const awb = (s.trackingNumber || s.waybill || '').toLowerCase();
    const orderNo = (s.orderNumber || s.orderId || '').toLowerCase();
    const vendor = (s.vendorId || '').toLowerCase();
    const custName = (raw.customerName || s.shippingAddress?.name || '').toLowerCase();

    const matchesQuery = !q || awb.includes(q) || orderNo.includes(q) || vendor.includes(q) || custName.includes(q);
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;

    return matchesQuery && matchesStatus;
  });

  // Metrics
  const totalCount = shipments.length;
  const inTransitCount = shipments.filter((s) => ['in_transit', 'out_for_delivery', 'manifested'].includes(s.status)).length;
  const deliveredCount = shipments.filter((s) => s.status === 'delivered').length;
  const exceptionCount = shipments.filter((s) => ['failed', 'returned', 'rto'].includes(s.status)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600" />
            EKART Logistics & Shipments
          </h1>
          <p className="text-xs text-slate-500">
            Manage multi-vendor logistics, print packing slips, query live scans, and configure carrier API credentials.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-start">
          <button
            onClick={() => setActiveTab('shipments')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'shipments'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-emerald-600" />
            All Shipments ({totalCount})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-slate-600" />
            Carrier Settings
          </button>
        </div>
      </div>

      {activeTab === 'shipments' ? (
        <>
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Shipments</span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">{totalCount}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block">Active / In Transit</span>
              <span className="text-2xl font-bold text-blue-600 mt-1 block">{inTransitCount}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">Delivered</span>
              <span className="text-2xl font-bold text-emerald-600 mt-1 block">{deliveredCount}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">Exceptions / RTO</span>
              <span className="text-2xl font-bold text-amber-600 mt-1 block">{exceptionCount}</span>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by AWB, Order #, Customer, Vendor ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <label className="text-xs text-slate-500 font-medium">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Statuses</option>
                <option value="created">Created</option>
                <option value="manifested">Manifested</option>
                <option value="in_transit">In Transit</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed / RTO</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Shipments Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">AWB / Waybill</th>
                    <th className="p-3">Order # & Slice</th>
                    <th className="p-3">Destination / Customer</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Carrier / Payment</th>
                    <th className="p-3">Created</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                        <RefreshCw className="w-4 h-4 animate-spin inline mr-2 text-emerald-600" />
                        Streaming shipments from Firestore...
                      </td>
                    </tr>
                  ) : filteredShipments.length > 0 ? (
                    filteredShipments.map((s) => {
                      const raw = s as any;
                      const awb = s.trackingNumber || s.waybill || 'N/A';
                      const isLoadingAction = actionLoadingAwb === awb;

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span className="text-emerald-700 font-mono">{awb}</span>
                              {s.labelUrl && (
                                <button
                                  onClick={() => handlePrintLabel(awb)}
                                  title="View Shipping Label"
                                  className="text-slate-400 hover:text-emerald-600"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block font-normal">
                              Vendor: {s.vendorId || 'Central'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-800">{s.orderNumber || s.orderId}</span>
                            <span className="text-[10px] text-slate-400 block">
                              Items: {raw.itemCount || (raw.items ? raw.items.length : (s.packageDetails?.items?.length || 1))} pkg ({raw.weightGrams || s.packageDetails?.weightGrams ? `${raw.weightGrams || s.packageDetails?.weightGrams}g` : 'Standard'})
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="text-slate-800 font-medium">{raw.customerName || s.shippingAddress?.name || 'Customer'}</span>
                            <span className="text-[10px] text-slate-400 block flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {raw.destinationCity || s.shippingAddress?.city ? `${raw.destinationCity || s.shippingAddress?.city}, ` : ''}{raw.postalCode || raw.pincode || s.shippingAddress?.postalCode || 'PIN'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider inline-block ${
                                s.status === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : s.status === 'in_transit' || s.status === 'out_for_delivery'
                                  ? 'bg-blue-100 text-blue-700'
                                  : s.status === 'cancelled'
                                  ? 'bg-slate-100 text-slate-600'
                                  : (s.status as string) === 'failed' || (s.status as string) === 'returned'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {s.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-mono text-[10px] uppercase text-slate-700 font-medium block">
                              {s.carrier || 'delhivery'}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase font-mono">
                              {raw.paymentMode || s.payment?.mode || 'Prepaid'}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[10px] text-slate-400">
                            {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {awb !== 'N/A' && (
                                <>
                                  <button
                                    onClick={() => handleTrackLive(awb)}
                                    className="p-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 font-medium"
                                    title="Track Live EKART Scans"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    Track
                                  </button>
                                  <button
                                    onClick={() => handlePrintLabel(awb)}
                                    disabled={isLoadingAction}
                                    className="p-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 font-medium disabled:opacity-50"
                                    title="Print Shipping Label"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    Label
                                  </button>
                                  {s.status !== 'cancelled' && s.status !== 'delivered' && (
                                    <button
                                      onClick={() => handleCancelShipment(s)}
                                      disabled={isLoadingAction}
                                      className="p-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 font-medium disabled:opacity-50"
                                      title="Cancel Shipment"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                        No shipments matching the filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Settings Tab */
        <div className="max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
            <Shield className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">EKART API & Logistics Configuration</h2>
              <p className="text-xs text-slate-500">
                Credentials are stored securely in Firestore and executed exclusively via Cloud Functions. Tokens are never exposed to client browsers.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Operating Environment
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    config.ekartEnv === 'staging'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="env"
                    value="staging"
                    checked={config.ekartEnv === 'staging'}
                    onChange={() => setConfig({ ...config, ekartEnv: 'staging' })}
                    className="accent-emerald-600"
                  />
                  <div>
                    <span className="block font-medium">Staging (Sandbox)</span>
                    <span className="text-[10px] text-slate-500">stage-express.delhivery.com</span>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    config.ekartEnv === 'production'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="env"
                    value="production"
                    checked={config.ekartEnv === 'production'}
                    onChange={() => setConfig({ ...config, ekartEnv: 'production' })}
                    className="accent-emerald-600"
                  />
                  <div>
                    <span className="block font-medium">Production (Live)</span>
                    <span className="text-[10px] text-slate-500">track.delhivery.com</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-700">EKART API Token Security</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                In accordance with enterprise secret hygiene, private carrier tokens are managed exclusively via <strong>Firebase Functions Secret Manager (<code>DELHIVERY_API_TOKEN</code>)</strong> on the secure backend and are never loaded into browser memory or stored in Firestore documents.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Registered Pickup Location Name
              </label>
              <input
                type="text"
                placeholder="e.g. BioCart Guntur Central Hub"
                value={config.defaultPickupLocation}
                onChange={(e) => setConfig({ ...config, defaultPickupLocation: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                Must match the pickup warehouse name registered with EKART.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Client / Brand Name
              </label>
              <input
                type="text"
                placeholder="e.g. BIOCART"
                value={config.clientName || 'BIOCART'}
                onChange={(e) => setConfig({ ...config, clientName: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {savingSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                Save Shipping Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Live Tracking Modal */}
      {selectedAwb && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Live EKART Tracking</h3>
                  <span className="text-xs font-mono text-emerald-600 font-semibold">{selectedAwb}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAwb(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {trackingLoading ? (
              <div className="py-12 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                <p className="text-xs">Querying EKART tracking API...</p>
              </div>
            ) : trackingData ? (
              <div className="space-y-4">
                {/* Summary Card */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">Current Status</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                      {trackingData.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 font-medium">
                    {trackingData.carrierStatus}
                  </div>
                  {trackingData.expectedDeliveryDate && (
                    <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Expected Delivery: <strong className="text-slate-800">{new Date(trackingData.expectedDeliveryDate).toLocaleDateString()}</strong>
                    </div>
                  )}
                  {(trackingData.origin || trackingData.destination) && (
                    <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                      <span>Origin: {trackingData.origin || 'BioCart Hub'}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span>Dest: {trackingData.destination || 'Customer'}</span>
                    </div>
                  )}
                </div>

                {/* Scans Timeline */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Activity & Journey Scans
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
                    <p className="text-xs text-slate-400 italic">No package scans reported yet by EKART.</p>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handlePrintLabel(selectedAwb)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Packing Slip
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Unable to load tracking details. Please verify your internet connection or AWB status.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
