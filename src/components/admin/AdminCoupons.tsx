import React, { useEffect, useState } from 'react';
import { couponRepository } from '../../repositories/EnterpriseRepositories';
import { CouponEntity, EntityFactory } from '../../types/backend';
import { Ticket, Plus, Trash2, Edit3, XCircle, Clock, Layers } from 'lucide-react';
import { BioCartLoader } from '../ui/BioCartLoader';
import { MASTER_CATEGORIES } from '../../data/categoryCatalog';

export const AdminCoupons: React.FC = () => {
  const [coupons, setCoupons] = useState<CouponEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponEntity | null>(null);
  
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: 0,
    minPurchase: 0,
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    usageLimit: 100,
    creatorVendorId: 'all', // 'all' or 'biocart'
    scopeType: 'all' as 'all' | 'categories',
    applicableCategories: [] as string[],
    isActive: true
  });
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'vendor'>('all');

  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const result = await couponRepository.find({});
      if (result) {
        setCoupons(result.items as CouponEntity[]);
      }
    } catch (err) {
      console.error("Failed to load coupons", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleOpenModal = (coupon?: CouponEntity) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        type: coupon.discountType,
        value: coupon.discountValue,
        minPurchase: coupon.minOrderAmount,
        startDate: coupon.startDate ? coupon.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
        expiryDate: coupon.endDate ? coupon.endDate.split('T')[0] : '',
        usageLimit: coupon.usageLimit,
        creatorVendorId: coupon.creatorVendorId || 'all',
        scopeType: coupon.applicableCategories && coupon.applicableCategories.length > 0 ? 'categories' : 'all',
        applicableCategories: coupon.applicableCategories || [],
        isActive: coupon.status !== 'inactive'
      });
    } else {
      setEditingCoupon(null);
      setFormData({
        code: '',
        type: 'percentage',
        value: 0,
        minPurchase: 0,
        startDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        usageLimit: 100,
        creatorVendorId: 'all',
        scopeType: 'all',
        applicableCategories: [],
        isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (coupon: CouponEntity) => {
    const nextStatus = coupon.status === 'active' ? 'inactive' : 'active';
    try {
      await couponRepository.update(coupon.id, {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
      fetchCoupons();
    } catch (err) {
      console.error('Failed to toggle coupon status:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: CouponEntity = {
        ...(editingCoupon || EntityFactory.createBase('admin')),
        id: editingCoupon ? editingCoupon.id : formData.code.toUpperCase(),
        code: formData.code.toUpperCase(),
        discountType: formData.type,
        discountValue: formData.value,
        minOrderAmount: formData.minPurchase,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.expiryDate).toISOString(),
        usageLimit: formData.usageLimit,
        usedCount: editingCoupon ? editingCoupon.usedCount : 0,
        creatorRole: editingCoupon?.creatorRole || (formData.creatorVendorId !== 'all' ? 'vendor' : 'admin'),
        creatorVendorId: formData.creatorVendorId === 'all' ? undefined : formData.creatorVendorId,
        applicableCategories: formData.scopeType === 'categories' && formData.applicableCategories.length > 0 ? formData.applicableCategories : undefined,
        status: formData.isActive ? 'active' : 'inactive',
        updatedAt: new Date().toISOString()
      } as CouponEntity;

      if (editingCoupon) {
        await couponRepository.update(editingCoupon.id, payload);
      } else {
        await couponRepository.create(payload.id, payload);
      }
      setIsModalOpen(false);
      fetchCoupons();
    } catch (err) {
      console.error("Failed to save coupon", err);
      alert("Error saving coupon.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this coupon?")) {
      try {
        await couponRepository.delete(id);
        fetchCoupons();
      } catch (err) {
        console.error("Failed to delete coupon", err);
      }
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 ">
      <div className="p-6 md:p-8 border-b border-slate-200  bg-white  flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 ">Discount Coupons</h1>
            <p className="text-sm text-slate-600  mt-1">Manage promotional discount codes.</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-nature-700 hover:bg-nature-800 text-white rounded-lg font-bold transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Coupon
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 md:p-8">
        {/* Role Filters: All, Admin-Created, Vendor-Created */}
        <div className="flex items-center gap-2 mb-6">
          {(['all', 'admin', 'vendor'] as const).map(role => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                filterRole === role
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {role === 'all' ? 'All Coupons' : `${role === 'admin' ? 'Platform (Admin)' : 'Vendor-Created'}`}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <BioCartLoader message="Loading promotional coupons..." size="sm" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coupons.filter(c => {
              if (filterRole === 'admin') return c.creatorRole === 'admin' && !c.creatorVendorId;
              if (filterRole === 'vendor') return c.creatorRole === 'vendor' || !!c.creatorVendorId;
              return true;
            }).map(coupon => (
              <div key={coupon.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-nature-50 text-nature-600 flex items-center justify-center">
                        <Ticket className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-slate-900 uppercase">{coupon.code}</h3>
                          {coupon.creatorVendorId && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                              Vendor: {coupon.creatorVendorId}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleOpenModal(coupon)} className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors" title="Edit Duration & Scope"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(coupon.id)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors" title="Delete Coupon"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-slate-600 py-2 border-t border-slate-100">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Min Order:</span> <span className="font-semibold text-slate-900">₹{coupon.minOrderAmount}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Usage:</span> <span className="font-semibold text-slate-900">{coupon.usedCount} / {coupon.usageLimit}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Validity:</span> 
                      <span className="font-semibold text-slate-900">
                        {new Date(coupon.endDate).toLocaleDateString()}
                        {new Date(coupon.endDate).getTime() < Date.now() ? ' (Expired)' : ''}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Scope:</span> 
                      <span className="font-semibold text-emerald-700 truncate max-w-[170px]">
                        {coupon.applicableCategories && coupon.applicableCategories.length > 0
                          ? `Category: ${coupon.applicableCategories.join(', ')}`
                          : coupon.applicableProductIds && coupon.applicableProductIds.length > 0
                          ? `${coupon.applicableProductIds.length} Products`
                          : 'All Products'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${coupon.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {coupon.status === 'active' ? 'Active' : 'Inactive'}
                  </span>

                  <button
                    onClick={() => handleToggleStatus(coupon)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      coupon.status === 'active'
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {coupon.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
            {coupons.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500">
                No coupons found. Click "Create Coupon" to add one.
              </div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white  rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-6 border-b border-slate-200  flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 ">{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 :text-slate-200"><XCircle className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700  mb-1">Coupon Code</label>
                <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} className="w-full px-4 py-2 rounded-xl border border-slate-200  bg-slate-50  text-slate-900  uppercase font-mono" placeholder="SUMMER20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700  mb-1">Discount Type</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full px-4 py-2 rounded-xl border border-slate-200  bg-slate-50  text-slate-900 ">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700  mb-1">Value ({formData.type === 'percentage' ? '%' : '₹'})</label>
                  <input 
                    required 
                    type="number" 
                    min="1" 
                    max={formData.type === 'percentage' ? 90 : 100000}
                    step="any" 
                    value={formData.value === 0 ? '' : formData.value} 
                    placeholder="e.g. 15"
                    onChange={e => setFormData({...formData, value: e.target.value === '' ? 0 : Number(e.target.value)})} 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200  bg-slate-50  text-slate-900 font-medium" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700  mb-1">Min Order (₹)</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={formData.minPurchase === 0 ? '' : formData.minPurchase} 
                    placeholder="0"
                    onChange={e => setFormData({...formData, minPurchase: e.target.value === '' ? 0 : Number(e.target.value)})} 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200  bg-slate-50  text-slate-900 font-medium" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700  mb-1">Usage Limit</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={formData.usageLimit === 0 ? '' : formData.usageLimit} 
                    placeholder="100"
                    onChange={e => setFormData({...formData, usageLimit: e.target.value === '' ? 0 : Number(e.target.value)})} 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200  bg-slate-50  text-slate-900 font-medium" 
                  />
                </div>
              </div>
              {/* Start Date & Expiry Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    required
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    required
                    type="date"
                    value={formData.expiryDate}
                    onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm"
                  />
                </div>
              </div>

              {/* Duration Presets */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Quick Duration:</span>
                {[7, 14, 30, 60, 90].map(days => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => {
                      const base = formData.startDate ? new Date(formData.startDate) : new Date();
                      const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
                      setFormData({ ...formData, expiryDate: next.toISOString().split('T')[0] });
                    }}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    {days}d
                  </button>
                ))}
              </div>

              {/* Vendor Scope */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Vendor Scope</label>
                <select 
                  value={formData.creatorVendorId} 
                  onChange={e => setFormData({...formData, creatorVendorId: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-medium"
                >
                  <option value="all">All Vendors (Universal Platform Coupon)</option>
                  <option value="biocart">BioCart Direct Official (biocart)</option>
                </select>
              </div>

              {/* Category Scope Selection */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Category Applicability</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, scopeType: 'all', applicableCategories: [] })}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${formData.scopeType === 'all' ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-600'}`}
                    >
                      All Categories
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, scopeType: 'categories' })}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${formData.scopeType === 'categories' ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-600'}`}
                    >
                      Specific Categories
                    </button>
                  </div>
                </div>

                {formData.scopeType === 'categories' && (
                  <div className="grid grid-cols-2 gap-1.5 pt-1 max-h-32 overflow-y-auto p-2 bg-white rounded-lg border border-slate-200">
                    {MASTER_CATEGORIES.map(cat => {
                      const checked = formData.applicableCategories.includes(cat.name);
                      return (
                        <label key={cat.id} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => {
                              if (e.target.checked) {
                                setFormData({ ...formData, applicableCategories: [...formData.applicableCategories, cat.name] });
                              } else {
                                setFormData({ ...formData, applicableCategories: formData.applicableCategories.filter(c => c !== cat.name) });
                              }
                            }}
                            className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300"
                          />
                          <span className="truncate">{cat.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-nature-600 focus:ring-nature-500" />
                  <span className="text-sm font-bold text-slate-700 ">Active Coupon</span>
                </label>
              </div>
              <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md mt-6 cursor-pointer">
                {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
