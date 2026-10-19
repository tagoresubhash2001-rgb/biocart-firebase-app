import React, { useState, useEffect } from 'react';
import { useVendor } from '../../hooks/useVendor';
import { useApp } from '../../context/AppContext';
import { CouponService } from '../../services/CouponService';
import { AdminService } from '../../services/AdminService';
import { CouponEntity } from '../../types/backend';
import { Product } from '../../types';
import { 
  Tag, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Calendar, 
  Percent, 
  DollarSign, 
  Search,
  Filter,
  RefreshCw,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import { BioCartLoader } from '../ui/BioCartLoader';
import { MASTER_CATEGORIES } from '../../data/categoryCatalog';

export const VendorCoupons: React.FC = () => {
  const { vendorId, loading: vendorLoading } = useVendor();
  const { addToast } = useApp();

  const [coupons, setCoupons] = useState<CouponEntity[]>([]);
  const [vendorProducts, setVendorProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponEntity | null>(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minOrderAmount, setMinOrderAmount] = useState<number>(0);
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<number>(500);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationDays, setDurationDays] = useState<number>(30);
  const [usageLimit, setUsageLimit] = useState<number>(100);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [scopeType, setScopeType] = useState<'all' | 'products' | 'categories'>('all');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // 1. Subscribe to Real-Time Vendor Coupons
  useEffect(() => {
    if (vendorLoading || !vendorId) return;

    setLoading(true);
    const unsubscribe = CouponService.subscribeToVendorCoupons(
      vendorId,
      (list) => {
        setCoupons(list);
        setLoading(false);
      },
      (err) => {
        console.error('[VendorCoupons] Failed to load coupons:', err);
        setLoading(false);
        addToast('Failed to load coupons. Please check network connection.', 'warning');
      }
    );

    // Fetch vendor products for product-scoping options
    AdminService.subscribeToVendorProducts(
      vendorId,
      (prods) => setVendorProducts(prods),
      () => {}
    );

    return () => unsubscribe();
  }, [vendorId, vendorLoading]);

  // Open Create / Edit Modal
  const handleOpenModal = (coupon?: CouponEntity) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setCode(coupon.code);
      setDescription(coupon.description || '');
      setDiscountType(coupon.discountType);
      setDiscountValue(coupon.discountValue);
      setMinOrderAmount(coupon.minOrderAmount || 0);
      setMaxDiscountAmount(coupon.maxDiscountAmount || 0);
      const startStr = coupon.startDate ? coupon.startDate.split('T')[0] : '';
      const endStr = coupon.endDate ? coupon.endDate.split('T')[0] : '';
      setStartDate(startStr);
      setEndDate(endStr);
      if (startStr && endStr) {
        const diffMs = new Date(endStr).getTime() - new Date(startStr).getTime();
        const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
        setDurationDays(days > 0 ? days : 30);
      } else {
        setDurationDays(30);
      }
      setUsageLimit(coupon.usageLimit || 100);
      setIsActive(coupon.status !== 'inactive');
      
      const prods = coupon.applicableProductIds || [];
      const cats = coupon.applicableCategories || [];
      setSelectedProductIds(prods);
      setSelectedCategories(cats);

      if (prods.length > 0) {
        setScopeType('products');
      } else if (cats.length > 0) {
        setScopeType('categories');
      } else {
        setScopeType('all');
      }
    } else {
      setEditingCoupon(null);
      setCode('');
      setDescription('');
      setDiscountType('percentage');
      setDiscountValue(10);
      setMinOrderAmount(299);
      setMaxDiscountAmount(200);
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(thirtyDaysLater);
      setDurationDays(30);
      setUsageLimit(50);
      setIsActive(true);
      setScopeType('all');
      setSelectedProductIds([]);
      setSelectedCategories([]);
    }
    setIsModalOpen(true);
  };

  const handleDurationChange = (days: number) => {
    setDurationDays(days);
    const baseStart = startDate ? new Date(startDate) : new Date();
    const newEnd = new Date(baseStart.getTime() + days * 24 * 60 * 60 * 1000);
    setEndDate(newEnd.toISOString().split('T')[0]);
  };

  // Submit Form (Create / Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) return;

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      addToast('Coupon code is required.', 'warning');
      return;
    }

    if (discountValue <= 0) {
      addToast('Discount value must be greater than zero.', 'warning');
      return;
    }

    if (discountType === 'percentage' && discountValue > 90) {
      addToast('Percentage discount cannot exceed 90%.', 'warning');
      return;
    }

    if (scopeType === 'products' && selectedProductIds.length === 0) {
      addToast('Please select at least one eligible product for product-scoped coupons.', 'warning');
      return;
    }

    if (scopeType === 'categories' && selectedCategories.length === 0) {
      addToast('Please select at least one eligible category for category-scoped coupons.', 'warning');
      return;
    }

    const startTimestamp = startDate ? new Date(startDate).getTime() : Date.now();
    const endTimestamp = new Date(endDate).getTime();
    if (isNaN(endTimestamp)) {
      addToast('Please provide a valid expiry date.', 'warning');
      return;
    }
    if (endTimestamp <= startTimestamp) {
      addToast('Expiry date must be after the start date.', 'warning');
      return;
    }

    if (Number(usageLimit) <= 0) {
      addToast('Usage limit must be at least 1.', 'warning');
      return;
    }

    try {
      setIsSaving(true);

      const finalProductIds = scopeType === 'products' && selectedProductIds.length > 0 ? selectedProductIds : undefined;
      const finalCategories = scopeType === 'categories' && selectedCategories.length > 0 ? selectedCategories : undefined;

      const basePayload: any = {
        description: description.trim(),
        discountType,
        discountValue: Number(discountValue),
        minOrderAmount: Number(minOrderAmount) || 0,
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        endDate: new Date(endDate).toISOString(),
        usageLimit: Number(usageLimit) || 1,
        status: isActive ? 'active' : 'inactive'
      };

      if (discountType === 'percentage' && Number(maxDiscountAmount) > 0) {
        basePayload.maxDiscountAmount = Number(maxDiscountAmount);
      }

      if (scopeType === 'products' && finalProductIds) {
        basePayload.applicableProductIds = finalProductIds;
      }

      if (scopeType === 'categories' && finalCategories) {
        basePayload.applicableCategories = finalCategories;
      }

      if (editingCoupon) {
        await CouponService.updateVendorCoupon(vendorId, editingCoupon.id, basePayload);
        addToast(`Coupon "${cleanCode}" updated successfully!`, 'success');
      } else {
        await CouponService.createVendorCoupon(vendorId, {
          ...basePayload,
          code: cleanCode
        });
        addToast(`Vendor Coupon "${cleanCode}" created successfully!`, 'success');
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving coupon:', err);
      // Preserve form values in state so user doesn't lose inputs; show clear toast
      addToast(err?.message || 'Failed to save coupon.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Coupon
  const handleDelete = async (coupon: CouponEntity) => {
    if (!vendorId) return;
    const confirm = window.confirm(`Are you sure you want to permanently delete coupon "${coupon.code}"?`);
    if (!confirm) return;

    try {
      await CouponService.deleteVendorCoupon(vendorId, coupon.id);
      addToast(`Coupon "${coupon.code}" deleted.`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Failed to delete coupon.', 'warning');
    }
  };

  // Filtered List
  const filteredCoupons = coupons.filter((c) => {
    const matchesSearch = c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const isExpired = c.endDate && new Date(c.endDate).getTime() < Date.now();
    if (statusFilter === 'active') return matchesSearch && c.status === 'active' && !isExpired;
    if (statusFilter === 'inactive') return matchesSearch && c.status === 'inactive';
    if (statusFilter === 'expired') return matchesSearch && isExpired;
    return matchesSearch;
  });

  if (vendorLoading || loading) {
    return (
      <div className="py-20 flex justify-center">
        <BioCartLoader message="Loading vendor promotional coupons..." size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Tag className="w-4 h-4" />
            <span>Store Marketing & Promotions</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Vendor Coupons
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create exclusive store discount codes. Discounts are funded from your vendor store earnings and strictly scoped to your products.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Store Coupon
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-col sm:flex-row gap-3 justify-between items-center shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search coupon codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          {(['all', 'active', 'inactive', 'expired'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                statusFilter === filter
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Coupons Grid */}
      {filteredCoupons.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-300">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
            🏷️
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No coupons found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
            {searchQuery 
              ? 'No coupons match your active search and filter criteria.' 
              : 'You have not created any promotional coupons for your products yet.'}
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Create Your First Coupon
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCoupons.map((coupon) => {
            const isExpired = coupon.endDate && new Date(coupon.endDate).getTime() < Date.now();
            const usagePercent = Math.min(100, Math.round(((coupon.usedCount || 0) / (coupon.usageLimit || 1)) * 100));

            return (
              <div
                key={coupon.id}
                className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold text-sm rounded-xl tracking-wider">
                        {coupon.code}
                      </span>
                      {coupon.creatorRole === 'admin' && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold text-[10px] rounded-lg">
                          Admin Universal
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isExpired
                          ? 'bg-rose-100 text-rose-700'
                          : coupon.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isExpired ? 'Expired' : coupon.status}
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="text-2xl font-extrabold text-slate-900">
                      {coupon.discountType === 'percentage'
                        ? `${coupon.discountValue}% OFF`
                        : `₹${coupon.discountValue} FLAT OFF`}
                    </div>
                    {coupon.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {coupon.description}
                      </p>
                    )}
                  </div>

                  {/* Rules Summary */}
                  <div className="space-y-1.5 py-3 border-y border-gray-100 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Min Order Spend:</span>
                      <span className="font-semibold text-slate-800">
                        {coupon.minOrderAmount ? `₹${coupon.minOrderAmount}` : 'No minimum'}
                      </span>
                    </div>
                    {coupon.maxDiscountAmount && coupon.discountType === 'percentage' && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Max Cap:</span>
                        <span className="font-semibold text-slate-800">₹{coupon.maxDiscountAmount}</span>
                      </div>
                    )}
                    {/* Remaining Validity Time */}
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" /> Validity:
                      </span>
                      <span className={`font-semibold ${isExpired ? 'text-rose-600' : 'text-slate-800'}`}>
                        {(() => {
                          if (!coupon.endDate) return 'Permanent / Ongoing';
                          const endMs = new Date(coupon.endDate).getTime();
                          const diffMs = endMs - Date.now();
                          if (diffMs <= 0) return 'Expired';
                          const daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                          const hoursLeft = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                          if (daysLeft > 0) return `${daysLeft}d ${hoursLeft}h left (${new Date(coupon.endDate).toLocaleDateString()})`;
                          return `${hoursLeft}h left (Expires Today)`;
                        })()}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Scope:</span>
                      <span className="font-semibold text-emerald-700">
                        {coupon.applicableProductIds && coupon.applicableProductIds.length > 0
                          ? `${coupon.applicableProductIds.length} Selected Product(s)`
                          : coupon.applicableCategories && coupon.applicableCategories.length > 0
                          ? `Category: ${coupon.applicableCategories.join(', ')}`
                          : 'All Store Products'}
                      </span>
                    </div>
                  </div>

                  {/* Usage Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-slate-500 font-medium mb-1">
                      <span>Redeemed</span>
                      <span>{coupon.usedCount || 0} / {coupon.usageLimit} ({usagePercent}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-end gap-2 pt-4 mt-2 border-t border-gray-100">
                  {coupon.creatorRole === 'admin' ? (
                    <span className="text-[11px] text-slate-400 italic font-medium px-2 py-1 bg-slate-50 rounded-lg">
                      Managed by Platform Administrator
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleOpenModal(coupon)}
                        className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer"
                        title="Edit Coupon"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(coupon)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                        title="Delete Coupon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Tag className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingCoupon ? 'Edit Store Coupon' : 'Create Store Coupon'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingCoupon}
                  placeholder="e.g. ORGANIC15"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-mono font-bold uppercase focus:bg-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Unique uppercase identifier customers enter at checkout.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Offer Description</label>
                <input
                  type="text"
                  placeholder="e.g. 15% off all natural fertilizers"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {discountType === 'percentage' ? 'Discount Percentage (%) *' : 'Discount Amount (₹) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={discountType === 'percentage' ? 90 : 10000}
                    value={discountValue === 0 ? '' : discountValue}
                    placeholder="e.g. 15"
                    onChange={(e) => setDiscountValue(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Min Order Amount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={minOrderAmount === 0 ? '' : minOrderAmount}
                    placeholder="0"
                    onChange={(e) => setMinOrderAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {discountType === 'percentage' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Max Discount Cap (₹)</label>
                    <input
                      type="number"
                      min={10}
                      value={maxDiscountAmount === 0 ? '' : maxDiscountAmount}
                      placeholder="e.g. 200"
                      onChange={(e) => setMaxDiscountAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* Validity & Duration Controls */}
              <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    Validity Period & Duration
                  </label>
                  <span className="text-[11px] font-medium text-slate-500">
                    {durationDays} Day Duration
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {[7, 14, 30, 60, 90].map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => handleDurationChange(d)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        durationDays === d
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white border border-gray-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {d} Days
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (e.target.value && durationDays) {
                          const base = new Date(e.target.value);
                          const nextEnd = new Date(base.getTime() + durationDays * 24 * 60 * 60 * 1000);
                          setEndDate(nextEnd.toISOString().split('T')[0]);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Expiry Date *</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        if (startDate && e.target.value) {
                          const diff = new Date(e.target.value).getTime() - new Date(startDate).getTime();
                          const calcDays = Math.round(diff / (1000 * 60 * 60 * 24));
                          if (calcDays > 0) setDurationDays(calcDays);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Scope & Applicability (Product vs Category vs All) */}
              <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-3">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Coupon Scope & Applicability
                </label>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setScopeType('all')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      scopeType === 'all'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-gray-200 hover:bg-slate-100'
                    }`}
                  >
                    All Store Products
                  </button>
                  <button
                    type="button"
                    onClick={() => setScopeType('categories')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      scopeType === 'categories'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-gray-200 hover:bg-slate-100'
                    }`}
                  >
                    By Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setScopeType('products')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      scopeType === 'products'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-gray-200 hover:bg-slate-100'
                    }`}
                  >
                    Specific Products
                  </button>
                </div>

                {scopeType === 'categories' && (
                  <div className="pt-2 space-y-2">
                    <p className="text-[11px] text-slate-500 font-medium">Select eligible store categories:</p>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-white rounded-xl border border-gray-200">
                      {MASTER_CATEGORIES.map((cat) => {
                        const checked = selectedCategories.includes(cat.name);
                        return (
                          <label key={cat.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-1 rounded hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCategories([...selectedCategories, cat.name]);
                                } else {
                                  setSelectedCategories(selectedCategories.filter(c => c !== cat.name));
                                }
                              }}
                              className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                            />
                            <span className="truncate">{cat.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {scopeType === 'products' && (
                  <div className="pt-2 space-y-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 font-medium">Select eligible products:</span>
                      <span className="font-bold text-emerald-700">{selectedProductIds.length} Selected</span>
                    </div>
                    <div className="max-h-44 overflow-y-auto space-y-1.5 p-2 bg-white rounded-xl border border-gray-200">
                      {vendorProducts.length === 0 ? (
                        <p className="text-xs text-slate-400 py-3 text-center">No products found in your store.</p>
                      ) : (
                        vendorProducts.map((p) => {
                          const checked = selectedProductIds.includes(p.id);
                          return (
                            <label key={p.id} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedProductIds([...selectedProductIds, p.id]);
                                  } else {
                                    setSelectedProductIds(selectedProductIds.filter(id => id !== p.id));
                                  }
                                }}
                                className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                              />
                              <img src={p.image} alt={p.name} className="w-6 h-6 object-cover rounded" />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-800 truncate">{p.name}</p>
                                <p className="text-[10px] text-slate-400">₹{p.price} • {p.category}</p>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Maximum Total Redemptions</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={usageLimit === 0 ? '' : usageLimit}
                  placeholder="50"
                  onChange={(e) => setUsageLimit(e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="coupon-active-check"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                />
                <label htmlFor="coupon-active-check" className="text-xs font-bold text-slate-800">
                  Enable and activate this coupon immediately
                </label>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 leading-relaxed">
                <strong>Platform Policy:</strong> Vendor-created coupons discount only eligible products belonging to your store ({vendorId}). The discount amount is absorbed by your vendor earnings and is strictly audited during settlement.
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/3 py-2.5 border border-gray-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-grow py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {editingCoupon ? 'Update Coupon' : 'Create Store Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default VendorCoupons;
