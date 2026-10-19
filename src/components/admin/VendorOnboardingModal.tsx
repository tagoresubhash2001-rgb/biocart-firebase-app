import React, { useState, useEffect } from 'react';
import { VendorItem } from '../../types';
import {
  Building2,
  FileText,
  MapPin,
  Percent,
  CreditCard,
  CheckCircle2,
  X,
  ChevronRight,
  ChevronLeft,
  Store,
  Phone,
  Mail,
  Globe
} from 'lucide-react';

interface VendorOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: Partial<VendorItem> | null;
  onSave: (vendorData: Partial<VendorItem>) => Promise<void>;
  isSaving: boolean;
}

export const VendorOnboardingModal: React.FC<VendorOnboardingModalProps> = ({
  isOpen,
  onClose,
  vendor,
  onSave,
  isSaving
}) => {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Form state initialized from vendor or defaults
  const [formData, setFormData] = useState<Partial<VendorItem>>({
    storeName: vendor?.storeName || '',
    ownerName: vendor?.ownerName || '',
    email: vendor?.email || '',
    phone: vendor?.phone || '',
    logo: vendor?.logo || '',
    description: vendor?.description || '',
    website: vendor?.website || '',
    legal: {
      businessType: vendor?.legal?.businessType || 'proprietorship',
      pan: vendor?.legal?.pan || '',
      gstin: vendor?.legal?.gstin || '',
      registrationNumber: vendor?.legal?.registrationNumber || '',
      establishedYear: vendor?.legal?.establishedYear || ''
    },
    addresses: {
      registeredAddress: {
        addressLine1: vendor?.addresses?.registeredAddress?.addressLine1 || '',
        addressLine2: vendor?.addresses?.registeredAddress?.addressLine2 || '',
        landmark: vendor?.addresses?.registeredAddress?.landmark || '',
        city: vendor?.addresses?.registeredAddress?.city || '',
        state: vendor?.addresses?.registeredAddress?.state || '',
        pinCode: vendor?.addresses?.registeredAddress?.pinCode || '',
        country: vendor?.addresses?.registeredAddress?.country || 'India'
      },
      pickupAddress: {
        addressLine1: vendor?.addresses?.pickupAddress?.addressLine1 || '',
        addressLine2: vendor?.addresses?.pickupAddress?.addressLine2 || '',
        landmark: vendor?.addresses?.pickupAddress?.landmark || '',
        city: vendor?.addresses?.pickupAddress?.city || '',
        state: vendor?.addresses?.pickupAddress?.state || '',
        pinCode: vendor?.addresses?.pickupAddress?.pinCode || '',
        country: vendor?.addresses?.pickupAddress?.country || 'India',
        contactPerson: vendor?.addresses?.pickupAddress?.contactPerson || '',
        contactPhone: vendor?.addresses?.pickupAddress?.contactPhone || ''
      },
      sameAsRegistered: vendor?.addresses?.sameAsRegistered ?? true
    },
    commission: {
      baseRateBps: vendor?.commission?.baseRateBps || 1000
    },
    settlement: {
      bankName: vendor?.settlement?.bankName || '',
      accountNumber: vendor?.settlement?.accountNumber || '',
      ifscCode: vendor?.settlement?.ifscCode || '',
      accountType: vendor?.settlement?.accountType || 'current'
    }
  });

  // Re-synchronize form state whenever the modal opens or the active vendor changes
  useEffect(() => {
    if (isOpen) {
      setActiveStep(1);
      setEmailError(null);
      setFormData({
        storeName: vendor?.storeName || '',
        ownerName: vendor?.ownerName || '',
        email: vendor?.email || '',
        phone: vendor?.phone || '',
        logo: vendor?.logo || '',
        description: vendor?.description || '',
        website: vendor?.website || '',
        legal: {
          businessType: vendor?.legal?.businessType || 'proprietorship',
          pan: vendor?.legal?.pan || '',
          gstin: vendor?.legal?.gstin || '',
          registrationNumber: vendor?.legal?.registrationNumber || '',
          establishedYear: vendor?.legal?.establishedYear || ''
        },
        addresses: {
          registeredAddress: {
            addressLine1: vendor?.addresses?.registeredAddress?.addressLine1 || '',
            addressLine2: vendor?.addresses?.registeredAddress?.addressLine2 || '',
            landmark: vendor?.addresses?.registeredAddress?.landmark || '',
            city: vendor?.addresses?.registeredAddress?.city || '',
            state: vendor?.addresses?.registeredAddress?.state || '',
            pinCode: vendor?.addresses?.registeredAddress?.pinCode || '',
            country: vendor?.addresses?.registeredAddress?.country || 'India'
          },
          pickupAddress: {
            addressLine1: vendor?.addresses?.pickupAddress?.addressLine1 || '',
            addressLine2: vendor?.addresses?.pickupAddress?.addressLine2 || '',
            landmark: vendor?.addresses?.pickupAddress?.landmark || '',
            city: vendor?.addresses?.pickupAddress?.city || '',
            state: vendor?.addresses?.pickupAddress?.state || '',
            pinCode: vendor?.addresses?.pickupAddress?.pinCode || '',
            country: vendor?.addresses?.pickupAddress?.country || 'India',
            contactPerson: vendor?.addresses?.pickupAddress?.contactPerson || '',
            contactPhone: vendor?.addresses?.pickupAddress?.contactPhone || ''
          },
          sameAsRegistered: vendor?.addresses?.sameAsRegistered ?? true
        },
        commission: {
          baseRateBps: vendor?.commission?.baseRateBps || 1000
        },
        settlement: {
          bankName: vendor?.settlement?.bankName || '',
          accountNumber: vendor?.settlement?.accountNumber || '',
          ifscCode: vendor?.settlement?.ifscCode || '',
          accountType: vendor?.settlement?.accountType || 'current'
        }
      });
    }
  }, [isOpen, vendor]);

  if (!isOpen) return null;

  const validateEmail = (emailStr?: string): boolean => {
    if (!emailStr || !emailStr.trim()) {
      setEmailError('Business email / Login ID is required.');
      return false;
    }
    const clean = emailStr.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) {
      setEmailError('Please enter a valid email address (e.g. partner@store.com).');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleNext = () => {
    if (activeStep === 1) {
      if (!formData.storeName?.trim() || !formData.ownerName?.trim()) {
        alert('Please fill in required fields: Store Name and Owner Name.');
        return;
      }
      if (!validateEmail(formData.email)) {
        return;
      }
    }
    setActiveStep((prev) => Math.min(prev + 1, 5) as any);
  };

  const handlePrev = () => {
    setActiveStep((prev) => Math.max(prev - 1, 1) as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(formData.email)) {
      setActiveStep(1);
      return;
    }

    const cleanEmail = (formData.email || '').trim().toLowerCase();
    const finalData = {
      ...formData,
      email: cleanEmail,
      storeName: (formData.storeName || '').trim(),
      ownerName: (formData.ownerName || '').trim(),
      phone: (formData.phone || '').trim()
    };

    if (finalData.addresses?.sameAsRegistered && finalData.addresses.registeredAddress) {
      finalData.addresses.pickupAddress = {
        ...finalData.addresses.registeredAddress,
        contactPerson: finalData.ownerName || '',
        contactPhone: finalData.phone || ''
      };
    }
    await onSave(finalData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {vendor?.id ? 'Edit Vendor Partner Profile' : 'Comprehensive Vendor Onboarding'}
              </h2>
              <p className="text-xs text-slate-500">Step {activeStep} of 5 — Complete business credentials & logistics settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Navigation */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center justify-between text-xs font-semibold">
          {[
            { step: 1, label: 'Identity', icon: Building2 },
            { step: 2, label: 'Registration & Tax', icon: FileText },
            { step: 3, label: 'Addresses', icon: MapPin },
            { step: 4, label: 'Commission & Payout', icon: Percent },
            { step: 5, label: 'Review & Confirm', icon: CheckCircle2 }
          ].map((item) => {
            const Icon = item.icon;
            const isCurrent = activeStep === item.step;
            const isCompleted = activeStep > item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setActiveStep(item.step as any)}
                className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition-all ${
                  isCurrent
                    ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'
                    : isCompleted
                    ? 'text-slate-700 hover:text-emerald-600'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isCurrent ? 'text-emerald-600' : isCompleted ? 'text-emerald-500' : 'text-slate-400'}`} />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Form Body */}
        <div className="p-6 overflow-y-auto flex-grow space-y-4 text-xs">
          {/* STEP 1: BUSINESS IDENTITY */}
          {activeStep === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Business Identity & Contact Person</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Store / Business Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.storeName || ''}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    placeholder="e.g. GreenRoots Bio-Fertilizers"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Primary Owner / Contact Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.ownerName || ''}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    placeholder="e.g. Subhash Tagore"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-semibold">Business Email * (Login ID)</label>
                    {vendor?.id && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Auth Synced
                      </span>
                    )}
                  </div>
                  <input
                    type="email"
                    required
                    value={formData.email || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, email: val });
                      if (emailError) {
                        validateEmail(val);
                      }
                    }}
                    onBlur={(e) => validateEmail(e.target.value)}
                    placeholder="partner@greenroots.in"
                    className={`w-full p-2.5 bg-slate-50 border rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 transition-colors ${
                      emailError ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                    }`}
                  />
                  {emailError ? (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{emailError}</p>
                  ) : vendor?.id ? (
                    <p className="text-[10px] text-slate-500 mt-1">Updating email securely synchronizes the Firebase login ID and vendor profile.</p>
                  ) : (
                    <p className="text-[10px] text-slate-500 mt-1">Used by the vendor partner to sign in to their vendor dashboard.</p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">Website URL (Optional)</label>
                  <input
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://greenroots.in"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-[11px] font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">Store / Bio Description (Optional)</label>
                  <textarea
                    rows={2}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Certified organic producer of bio-stimulants and compost mixes..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: REGISTRATION & TAX */}
          {activeStep === 2 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Business Registration & Indian Tax Credentials</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Business Registration Type</label>
                  <select
                    value={formData.legal?.businessType || 'proprietorship'}
                    onChange={(e) => setFormData({
                      ...formData,
                      legal: { ...formData.legal, businessType: e.target.value as any }
                    })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium"
                  >
                    <option value="proprietorship">Sole Proprietorship</option>
                    <option value="partnership">Partnership Firm</option>
                    <option value="llp">Limited Liability Partnership (LLP)</option>
                    <option value="private_limited">Private Limited Company</option>
                    <option value="public_limited">Public Limited Company</option>
                    <option value="other">Other / Farmer Producer Org (FPO)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Legal Registration Number (CIN / LLPIN)</label>
                  <input
                    type="text"
                    value={formData.legal?.registrationNumber || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      legal: { ...formData.legal, registrationNumber: e.target.value }
                    })}
                    placeholder="e.g. U01100TG2022PTC123456"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">GSTIN (Optional for un-registered vendors)</label>
                  <input
                    type="text"
                    value={formData.legal?.gstin || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      legal: { ...formData.legal, gstin: e.target.value.toUpperCase() }
                    })}
                    placeholder="36AAAAA0000A1Z5"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Permanent Account Number (PAN)</label>
                  <input
                    type="text"
                    value={formData.legal?.pan || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      legal: { ...formData.legal, pan: e.target.value.toUpperCase() }
                    })}
                    placeholder="ABCDE1234F"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: REGISTERED & SHIPPING ADDRESSES */}
          {activeStep === 3 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Business & Logistics Pickup Addresses</h3>
              <div className="space-y-3">
                <p className="font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  1. Registered Business Address
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 mb-1">Address Line 1 *</label>
                    <input
                      type="text"
                      value={formData.addresses?.registeredAddress?.addressLine1 || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        addresses: {
                          ...formData.addresses,
                          registeredAddress: {
                            ...formData.addresses?.registeredAddress!,
                            addressLine1: e.target.value
                          }
                        }
                      })}
                      placeholder="Plot No. 42, Green Agro Park"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">City / Town</label>
                    <input
                      type="text"
                      value={formData.addresses?.registeredAddress?.city || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        addresses: {
                          ...formData.addresses,
                          registeredAddress: {
                            ...formData.addresses?.registeredAddress!,
                            city: e.target.value
                          }
                        }
                      })}
                      placeholder="Hyderabad"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">State</label>
                    <input
                      type="text"
                      value={formData.addresses?.registeredAddress?.state || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        addresses: {
                          ...formData.addresses,
                          registeredAddress: {
                            ...formData.addresses?.registeredAddress!,
                            state: e.target.value
                          }
                        }
                      })}
                      placeholder="Telangana"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">Postal PIN Code (6 digits)</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={formData.addresses?.registeredAddress?.pinCode || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        addresses: {
                          ...formData.addresses,
                          registeredAddress: {
                            ...formData.addresses?.registeredAddress!,
                            pinCode: e.target.value.replace(/\D/g, '')
                          }
                        }
                      })}
                      placeholder="500081"
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1">Country</label>
                    <input
                      type="text"
                      readOnly
                      value="India"
                      className="w-full p-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.addresses?.sameAsRegistered ?? true}
                      onChange={(e) => setFormData({
                        ...formData,
                        addresses: {
                          ...formData.addresses,
                          sameAsRegistered: e.target.checked
                        }
                      })}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="font-semibold text-slate-800">Delhivery Pickup Address is the same as Registered Address</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: COMMISSION & SETTLEMENT */}
          {activeStep === 4 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Commercial Terms & Payout Bank Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Platform Commission Rate (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={(formData.commission?.baseRateBps || 1000) / 100}
                    onChange={(e) => setFormData({
                      ...formData,
                      commission: { baseRateBps: Math.round(Number(e.target.value) * 100) }
                    })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-emerald-700 font-bold text-sm"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Default marketplace rate is 10% (1000 BPS)</p>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Settlement Bank Name</label>
                  <input
                    type="text"
                    value={formData.settlement?.bankName || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      settlement: { ...formData.settlement, bankName: e.target.value }
                    })}
                    placeholder="HDFC Bank / State Bank of India"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    value={formData.settlement?.accountNumber || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      settlement: { ...formData.settlement, accountNumber: e.target.value }
                    })}
                    placeholder="000123456789"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">IFSC Code (11 characters)</label>
                  <input
                    type="text"
                    maxLength={11}
                    value={formData.settlement?.ifscCode || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      settlement: { ...formData.settlement, ifscCode: e.target.value.toUpperCase() }
                    })}
                    placeholder="HDFC0000123"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW & SUMMARY */}
          {activeStep === 5 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Review & Verify Vendor Credentials</h3>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-slate-700">
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Business / Store Name:</span>
                  <span className="font-bold text-slate-900">{formData.storeName || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Primary Contact:</span>
                  <span className="font-semibold text-slate-900">{formData.ownerName || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Login Email:</span>
                  <span className="font-mono text-emerald-700 font-semibold">{formData.email || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Registration Type:</span>
                  <span className="capitalize">{formData.legal?.businessType || 'Proprietorship'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Platform Commission:</span>
                  <span className="font-bold text-emerald-700">{(formData.commission?.baseRateBps || 1000) / 100}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Account Provisioning:</span>
                  <span className="font-semibold text-emerald-700">Automatic Login Auth Creation</span>
                </div>
              </div>

              {!vendor?.id && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px]">
                  Saving this form calls Firebase Cloud Functions to securely provision Auth credentials, vendor profile, and wallet ledger with zero trust role security.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={activeStep === 1 ? onClose : handlePrev}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            {activeStep === 1 ? (
              'Cancel'
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" /> Previous
              </>
            )}
          </button>

          {activeStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSubmit}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSaving ? 'Provisioning Vendor...' : vendor?.id ? 'Update Vendor' : 'Onboard & Create Login'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
