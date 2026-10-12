import React, { useEffect, useState } from 'react';
import { couponRepository } from '../../repositories/EnterpriseRepositories';
import { CouponEntity, EntityFactory } from '../../types/backend';
import { Ticket, Plus, Trash2, Edit3, XCircle } from 'lucide-react';

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
    expiryDate: '',
    usageLimit: 100,
    isActive: true
  });

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
        expiryDate: coupon.endDate ? coupon.endDate.split('T')[0] : '',
        usageLimit: coupon.usageLimit,
        isActive: coupon.status !== 'inactive'
      });
    } else {
      setEditingCoupon(null);
      setFormData({
        code: '',
        type: 'percentage',
        value: 0,
        minPurchase: 0,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        usageLimit: 100,
        isActive: true
      });
    }
    setIsModalOpen(true);
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
        endDate: new Date(formData.expiryDate).toISOString(),
        startDate: editingCoupon?.startDate || new Date().toISOString(),
        usageLimit: formData.usageLimit,
        usedCount: editingCoupon ? editingCoupon.usedCount : 0,
        status: formData.isActive ? 'active' : 'inactive'
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
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-nature-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coupons.map(coupon => (
              <div key={coupon.id} className="bg-white  p-6 rounded-2xl border border-slate-200  shadow-sm flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-nature-50 text-nature-600   flex items-center justify-center">
                      <Ticket className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900  uppercase">{coupon.code}</h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `$${coupon.discountValue} OFF`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleOpenModal(coupon)} className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(coupon.id)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                
                <div className="mt-auto space-y-2 text-sm text-slate-600 ">
                  <div className="flex justify-between">
                    <span>Min Order:</span> <span className="font-medium text-slate-900 ">${coupon.minOrderAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Usage:</span> <span className="font-medium text-slate-900 ">{coupon.usedCount} / {coupon.usageLimit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Valid until:</span> <span className="font-medium text-slate-900 ">{new Date(coupon.endDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span> <span className={`font-medium ${coupon.status === 'active' ? 'text-emerald-500' : 'text-rose-500'}`}>{coupon.status === 'active' ? 'Active' : 'Inactive'}</span>
                  </div>
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
                <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} className="w-full px-4 py-2 rounded-xl border border-slate-200  bg-slate-50  text-slate-900  uppercase" placeholder="SUMMER20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700  mb-1">Discount Type</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full px-4 py-2 rounded-xl border border-slate-200  bg-slate-50  text-slate-900 ">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700  mb-1">Value</label>
                  <input required type="number" min="0" step="0.01" value={formData.value} onChange={e => setFormData({...formData, value: Number(e.target.value)})} className="w-full px-4 py-2 rounded-xl border border-slate-200  bg-slate-50  text-slate-900 " />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700  mb-1">Min Order ($)</label>
                  <input type="number" min="0" value={formData.minPurchase} onChange={e => setFormData({...formData, minPurchase: Number(e.target.value)})} className="w-full px-4 py-2 rounded-xl border border-slate-200  bg-slate-50  text-slate-900 " />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700  mb-1">Usage Limit</label>
                  <input type="number" min="1" value={formData.usageLimit} onChange={e => setFormData({...formData, usageLimit: Number(e.target.value)})} className="w-full px-4 py-2 rounded-xl border border-slate-200  bg-slate-50  text-slate-900 " />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700  mb-1">Expiry Date</label>
                  <input required type="date" value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200  bg-slate-50  text-slate-900 " />
                </div>
                <div className="flex flex-col justify-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-nature-600 focus:ring-nature-500" />
                    <span className="text-sm font-bold text-slate-700 ">Active</span>
                  </label>
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-nature-600 hover:bg-nature-700 text-white rounded-xl font-bold transition-colors mt-6">
                {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
