import React, { useState, useEffect } from 'react';
import { useVendor } from '../../hooks/useVendor';
import { db } from '../../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/AuthService';
import { StorageService } from '../../services/StorageService';
import { 
  Building2, 
  ShieldCheck, 
  Bell, 
  Truck, 
  Wallet, 
  FileText, 
  HelpCircle, 
  Save, 
  RefreshCw, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  KeyRound, 
  Trash2,
  ExternalLink,
  MapPin,
  Lock,
  Mail,
  Phone,
  Image as ImageIcon,
  SlidersHorizontal
} from 'lucide-react';
import { BioCartLoader } from '../ui/BioCartLoader';

import { normalizeVendorSettings, buildVendorUpdatePayload, VendorSettingsFormModel } from '../../utils/vendorMapping';

type SettingsTab = 'profile' | 'security' | 'notifications' | 'shipping' | 'thresholds' | 'financial' | 'documents' | 'support';

export const VendorSettings: React.FC = () => {
  const { vendorId, loading: vendorLoading, refetch: refetchVendor } = useVendor();
  const { addToast } = useApp();
  const { userProfile, firebaseUser, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [rawVendorDoc, setRawVendorDoc] = useState<any>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Business Profile Form State
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [businessType, setBusinessType] = useState('proprietorship');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');

  // Password Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [resetEmailSending, setResetEmailSending] = useState(false);

  // Notification Preferences State
  const [notifyOrders, setNotifyOrders] = useState(true);
  const [notifyLowStock, setNotifyLowStock] = useState(true);
  const [notifySettlements, setNotifySettlements] = useState(true);
  const [notifyAnnouncements, setNotifyAnnouncements] = useState(true);

  // Shipping & Dispatch Preferences State
  const [handlingTimeDays, setHandlingTimeDays] = useState(1);
  const [dispatchDays, setDispatchDays] = useState('Mon-Sat');
  const [returnAccepted, setReturnAccepted] = useState(true);
  const [returnWindowDays, setReturnWindowDays] = useState(7);

  // Order & Shipping Thresholds State (Vendor Custom Overrides vs Platform Defaults)
  const [useCustomThresholds, setUseCustomThresholds] = useState(false);
  const [minOrderValue, setMinOrderValue] = useState<number | undefined>(undefined);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | undefined>(undefined);
  const [codMinValue, setCodMinValue] = useState<number | undefined>(undefined);
  const [codMaxValue, setCodMaxValue] = useState<number | undefined>(undefined);
  const [codAvailable, setCodAvailable] = useState(true);

  // Fetch and hydrate vendor data mapping using the normalization layer
  const fetchVendor = async (forceOverwrite: boolean = false) => {
    if (!vendorId) return;
    try {
      setLoading(true);
      const docRef = doc(db, 'vendors', vendorId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const d = snap.data();
        setRawVendorDoc(d);

        // Normalize data via typed normalization layer
        const norm = normalizeVendorSettings(
          vendorId,
          d,
          firebaseUser?.email,
          userProfile?.name
        );

        // Prevent late async fetch from overwriting user's active in-progress edits unless forced
        if (!isDirty || forceOverwrite) {
          setBusinessName(norm.storeName);
          setOwnerName(norm.ownerName);
          setPhone(norm.phone);
          setEmail(norm.email);
          setDescription(norm.description);
          setWebsite(norm.website);
          setLogoUrl(norm.logoUrl);
          setGstin(norm.gstin);
          setPan(norm.pan);
          setBusinessType(norm.businessType);
          setAddressLine1(norm.addressLine1);
          setCity(norm.city);
          setState(norm.state);
          setPinCode(norm.pinCode);

          setNotifyOrders(norm.notifyOrders);
          setNotifyLowStock(norm.notifyLowStock);
          setNotifySettlements(norm.notifySettlements);
          setNotifyAnnouncements(norm.notifyAnnouncements);

          setHandlingTimeDays(norm.handlingTimeDays);
          setDispatchDays(norm.dispatchDays);
          setReturnAccepted(norm.returnAccepted);
          setReturnWindowDays(norm.returnWindowDays);

          setUseCustomThresholds(norm.useCustomThresholds);
          setMinOrderValue(norm.minOrderValue);
          setFreeShippingThreshold(norm.freeShippingThreshold);
          setCodMinValue(norm.codMinValue);
          setCodMaxValue(norm.codMaxValue);
          setCodAvailable(norm.codAvailable);

          setIsDirty(false);
        }
      }
    } catch (err: any) {
      console.error('Error fetching vendor settings:', err);
      addToast(err?.message || 'Error loading vendor settings', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vendorLoading) return;
    if (!vendorId) {
      setLoading(false);
      return;
    }
    fetchVendor(false);
  }, [vendorId, vendorLoading]);

  // Handle Logo Upload to Firebase Storage
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !vendorId) return;

    if (!file.type.startsWith('image/')) {
      addToast('Please select a valid image file (PNG, JPG, WebP).', 'warning');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast('Image size exceeds 5MB limit.', 'warning');
      return;
    }

    try {
      setUploadingLogo(true);
      const uploadedUrl = await StorageService.uploadImage(file, `vendors/${vendorId}/logo`);
      setLogoUrl(uploadedUrl);
      
      // Auto-save logo URL to Firestore
      await updateDoc(doc(db, 'vendors', vendorId), {
        logo: uploadedUrl,
        updatedAt: new Date().toISOString()
      });
      addToast('Business logo uploaded and updated successfully!', 'success');
    } catch (err: any) {
      console.error('Logo upload error:', err);
      addToast(err?.message || 'Failed to upload logo', 'warning');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!vendorId) return;
    try {
      setLogoUrl('');
      await updateDoc(doc(db, 'vendors', vendorId), {
        logo: '',
        updatedAt: new Date().toISOString()
      });
      addToast('Logo removed', 'success');
    } catch (err: any) {
      addToast('Failed to remove logo', 'warning');
    }
  };

  // Save Business Profile & Settings
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId) return;

    if (!businessName.trim()) {
      addToast('Business / Store Name is required.', 'warning');
      return;
    }

    if (pinCode && !/^\d{6}$/.test(pinCode.trim())) {
      addToast('Please enter a valid 6-digit Indian PIN code.', 'warning');
      return;
    }

    try {
      setSaving(true);

      const formModel: VendorSettingsFormModel = {
        vendorId,
        storeName: businessName.trim(),
        ownerName: ownerName.trim(),
        email,
        phone: phone.trim(),
        website: website.trim(),
        description: description.trim(),
        logoUrl,
        businessType: businessType as any,
        gstin: gstin.trim().toUpperCase(),
        pan: pan.trim().toUpperCase(),
        addressLine1: addressLine1.trim(),
        city: city.trim(),
        state: state.trim(),
        pinCode: pinCode.trim(),
        country: 'India',
        pickupAddressLine1: addressLine1.trim(),
        pickupCity: city.trim(),
        pickupState: state.trim(),
        pickupPinCode: pinCode.trim(),
        sameAsRegistered: true,
        handlingTimeDays: Number(handlingTimeDays) || 1,
        dispatchDays,
        returnAccepted,
        returnWindowDays: Number(returnWindowDays) || 7,
        useCustomThresholds,
        minOrderValue: minOrderValue !== undefined && minOrderValue !== null ? Number(minOrderValue) : undefined,
        freeShippingThreshold: freeShippingThreshold !== undefined && freeShippingThreshold !== null ? Number(freeShippingThreshold) : undefined,
        codMinValue: codMinValue !== undefined && codMinValue !== null ? Number(codMinValue) : undefined,
        codMaxValue: codMaxValue !== undefined && codMaxValue !== null ? Number(codMaxValue) : undefined,
        codAvailable,
        notifyOrders,
        notifyLowStock,
        notifySettlements,
        notifyAnnouncements,
        status: rawVendorDoc?.status || 'active'
      };

      // Construct explicit allowlisted update payload matching security rules
      const payload = buildVendorUpdatePayload(formModel, rawVendorDoc);

      // Perform genuine atomic persistence write
      await updateDoc(doc(db, 'vendors', vendorId), payload);

      // Reset dirty flag after successful write
      setIsDirty(false);

      addToast('Vendor profile and preferences saved successfully!', 'success');

      // Refresh vendor identity across layout and settings
      await refetchVendor();
      await fetchVendor(true);
    } catch (err: any) {
      console.error('Error saving vendor settings:', err);
      if (err?.code === 'permission-denied') {
        addToast('Permission denied: You do not have authorization to update these vendor fields.', 'warning');
      } else if (err?.code === 'unavailable' || err?.message?.includes('offline')) {
        addToast('Network connection offline. Your changes were preserved locally — please retry.', 'warning');
      } else {
        addToast(err?.message || 'Failed to save settings. Please verify permissions.', 'warning');
      }
    } finally {
      setSaving(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      addToast('Please enter your current password.', 'warning');
      return;
    }
    if (newPassword.length < 6) {
      addToast('New password must be at least 6 characters long.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('New password and confirmation do not match.', 'warning');
      return;
    }

    try {
      setPasswordUpdating(true);
      await AuthService.changePassword(currentPassword, newPassword);
      addToast('Password updated successfully! Please keep your credentials secure.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password change error:', err);
      addToast(err?.message || 'Failed to update password. Check your current password.', 'warning');
    } finally {
      setPasswordUpdating(false);
    }
  };

  // Handle Forgot / Reset Password Email Dispatch
  const handleSendResetEmail = async () => {
    const targetEmail = firebaseUser?.email || email;
    if (!targetEmail) {
      addToast('No email associated with this vendor account.', 'warning');
      return;
    }
    try {
      setResetEmailSending(true);
      await AuthService.resetPassword(targetEmail);
      addToast(`Password reset link dispatched to ${targetEmail}. Please check your inbox.`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Failed to send password reset email.', 'warning');
    } finally {
      setResetEmailSending(false);
    }
  };

  if (vendorLoading || loading) {
    return (
      <div className="py-20 flex justify-center">
        <BioCartLoader message="Loading vendor settings..." size="md" />
      </div>
    );
  }

  if (!vendorId) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-rose-200 text-rose-700 shadow-sm max-w-lg mx-auto my-12">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-rose-500" />
        <h3 className="text-lg font-bold mb-1">Vendor Partner Profile Not Found</h3>
        <p className="text-xs text-slate-600 mb-4">
          No authorized vendor record linked to this authenticated session.
        </p>
        <button
          onClick={() => refetchVendor()}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl"
        >
          Retry Verification
        </button>
      </div>
    );
  }

  const tabs: { id: SettingsTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'profile', label: 'Business Profile', icon: Building2 },
    { id: 'security', label: 'Account & Security', icon: ShieldCheck },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'shipping', label: 'Shipping & Fulfilment', icon: Truck },
    { id: 'thresholds', label: 'Order & Shipping Thresholds', icon: SlidersHorizontal },
    { id: 'financial', label: 'Payout & Wallet', icon: Wallet },
    { id: 'documents', label: 'Documents & Verification', icon: FileText },
    { id: 'support', label: 'Help & Status', icon: HelpCircle },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-emerald-600" />
            Vendor Settings Centre
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your verified business identity, store branding, security credentials, and fulfilment policies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
            rawVendorDoc?.status === 'active'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${rawVendorDoc?.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {rawVendorDoc?.status || 'Active'} Partner
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-white border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Business Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
          {/* Logo & Identity Row */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-600 rounded-full" />
              Store Identity & Branding
            </h3>

            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* Logo Box */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-32 h-32 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center relative overflow-hidden group shadow-2xs">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Store Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-3 text-slate-400">
                      <ImageIcon className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                      <span className="text-[10px] font-medium block">Upload Logo</span>
                    </div>
                  )}

                  <label className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white">
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-bold">Change</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                    />
                  </label>

                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center text-emerald-700">
                      <RefreshCw className="w-6 h-6 animate-spin mb-1" />
                      <span className="text-[10px] font-bold">Uploading...</span>
                    </div>
                  )}
                </div>

                {logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Remove Logo
                  </button>
                )}
              </div>

              {/* Main Fields */}
              <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Business / Store Name *</label>
                  <input
                    required
                    type="text"
                    value={businessName}
                    onChange={(e) => { setBusinessName(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. BioCart Direct Official"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Owner / Authorized Representative *</label>
                  <input
                    required
                    type="text"
                    value={ownerName}
                    onChange={(e) => { setOwnerName(e.target.value); setIsDirty(true); }}
                    placeholder="e.g. Subhash Tagore"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Registered Business Email</label>
                  <div className="relative">
                    <input
                      disabled
                      type="email"
                      value={email}
                      className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-mono cursor-not-allowed"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Managed via BioCart Administrator verification.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Business Contact Phone *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setIsDirty(true); }}
                    placeholder="+91 9876543210"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Website (Optional)</label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => { setWebsite(e.target.value); setIsDirty(true); }}
                    placeholder="https://biocart.in"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Legal & Taxation Section */}
          <div className="pt-6 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-600 rounded-full" />
              Taxation & Regulatory Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Business Type</label>
                <select
                  value={businessType}
                  onChange={(e) => { setBusinessType(e.target.value); setIsDirty(true); }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="proprietorship">Sole Proprietorship</option>
                  <option value="partnership">Partnership Firm</option>
                  <option value="llp">Limited Liability Partnership (LLP)</option>
                  <option value="pvt_ltd">Private Limited Company</option>
                  <option value="individual">Individual Agri-Entrepreneur</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN Number</label>
                <input
                  type="text"
                  maxLength={15}
                  value={gstin}
                  onChange={(e) => { setGstin(e.target.value.toUpperCase()); setIsDirty(true); }}
                  placeholder="37AAAAA0000A1Z5"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Business PAN</label>
                <input
                  type="text"
                  maxLength={10}
                  value={pan}
                  onChange={(e) => { setPan(e.target.value.toUpperCase()); setIsDirty(true); }}
                  placeholder="ABCDE1234F"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Registered Location */}
          <div className="pt-6 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-600 rounded-full" />
              Registered Business & Warehouse Address
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Address Line (Door/Street/Landmark)</label>
                <textarea
                  rows={2}
                  value={addressLine1}
                  onChange={(e) => { setAddressLine1(e.target.value); setIsDirty(true); }}
                  placeholder="e.g. 3-5-5 Beside Swami theater, Pattabhipuram"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City / District</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => { setCity(e.target.value); setIsDirty(true); }}
                  placeholder="e.g. Guntur"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => { setState(e.target.value); setIsDirty(true); }}
                  placeholder="e.g. Andhra Pradesh"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Postal PIN Code (India)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => { setPinCode(e.target.value); setIsDirty(true); }}
                  placeholder="522006"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Country</label>
                <input
                  disabled
                  type="text"
                  value="India"
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed font-medium"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="pt-6 border-t border-slate-200">
            <label className="block text-xs font-bold text-slate-700 mb-1">Store / Business Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => { setDescription(e.target.value); setIsDirty(true); }}
              placeholder="Describe your organic products, brand heritage, and farming practices..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Save / Reset Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={() => fetchVendor(true)}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Reset to Saved
            </button>

            <button
              type="submit"
              disabled={saving || uploadingLogo}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Business Profile
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Account & Password Security */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Password Change Card */}
          <form onSubmit={handleChangePassword} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-600" />
                Change Vendor Account Password
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Ensure your vendor partner console is protected with a strong, distinct password.
              </p>
            </div>

            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Current Password *</label>
                <div className="relative">
                  <input
                    required
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password *</label>
                <div className="relative">
                  <input
                    required
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password *</label>
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={passwordUpdating}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                {passwordUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Update Password
              </button>
            </div>
          </form>

          {/* Password Reset Email Link */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-600" />
                Forgot Current Password?
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Dispatch an official BioCart password-reset email to <strong>{firebaseUser?.email || email}</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSendResetEmail}
              disabled={resetEmailSending}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              {resetEmailSending ? 'Sending Link...' : 'Send Reset Link to Email'}
            </button>
          </div>

          {/* Active Session & Logout */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Active Vendor Session</h4>
              <p className="text-xs text-slate-500 mt-1">
                Logged in as <strong>{firebaseUser?.email}</strong> (UID: <code className="text-slate-600 font-mono text-[11px]">{firebaseUser?.uid}</code>)
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                logout();
                window.location.hash = '';
              }}
              className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              Terminate Session (Sign Out)
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: Notifications Preferences */}
      {activeTab === 'notifications' && (
        <form onSubmit={handleSaveProfile} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-600" />
              Automated Alerts & Notifications
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Choose which transactional and operational events dispatch real-time alerts.
            </p>
          </div>

          <div className="space-y-4 max-w-xl">
            <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={notifyOrders}
                onChange={(e) => setNotifyOrders(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <div>
                <p className="text-xs font-bold text-slate-900">New Customer Orders</p>
                <p className="text-[11px] text-slate-500">Receive notifications immediately when a customer purchases items from your catalogue.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={notifyLowStock}
                onChange={(e) => setNotifyLowStock(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <div>
                <p className="text-xs font-bold text-slate-900">Low Stock Threshold Warnings</p>
                <p className="text-[11px] text-slate-500">Get alerted when product inventory dips below 10 units so you can replenish before running out.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={notifySettlements}
                onChange={(e) => setNotifySettlements(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <div>
                <p className="text-xs font-bold text-slate-900">Weekly Wallet Settlement Notices</p>
                <p className="text-[11px] text-slate-500">Weekly disbursement confirmations and financial ledger summary reports.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={notifyAnnouncements}
                onChange={(e) => setNotifyAnnouncements(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <div>
                <p className="text-xs font-bold text-slate-900">Platform & Policy Announcements</p>
                <p className="text-[11px] text-slate-500">BioCart platform updates, logistics changes, and holiday delivery schedules.</p>
              </div>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Notification Preferences
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: Shipping & Fulfilment */}
      {activeTab === 'shipping' && (
        <form onSubmit={handleSaveProfile} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-600" />
              Order Fulfilment & Shipping Parameters
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure dispatch SLA and return handling for orders fulfilled by your warehouse.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Standard Handling Time (Days)</label>
              <select
                value={handlingTimeDays}
                onChange={(e) => setHandlingTimeDays(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                <option value={1}>1 Day (Same / Next-day dispatch)</option>
                <option value={2}>2 Days</option>
                <option value={3}>3 Days</option>
                <option value={5}>5 Days (Bulk or specialized packing)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Operational Dispatch Days</label>
              <select
                value={dispatchDays}
                onChange={(e) => setDispatchDays(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                <option value="Mon-Sat">Monday to Saturday</option>
                <option value="Mon-Fri">Monday to Friday (Standard working days)</option>
                <option value="All-7">All 7 Days (Continuous fulfilment)</option>
              </select>
            </div>

            <div className="md:col-span-2 pt-2">
              <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={returnAccepted}
                  onChange={(e) => setReturnAccepted(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">Accept Standard Customer Returns</p>
                  <p className="text-[11px] text-slate-500">Allow return requests for damaged, defective, or incorrect products per BioCart return policy.</p>
                </div>
              </label>
            </div>

            {returnAccepted && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Return Window (Days)</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={returnWindowDays}
                  onChange={(e) => setReturnWindowDays(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Fulfilment Settings
            </button>
          </div>
        </form>
      )}

      {/* TAB: Order & Shipping Thresholds (Vendor Custom Overrides vs Universal Platform Defaults) */}
      {activeTab === 'thresholds' && (
        <form onSubmit={handleSaveProfile} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
                Order & Shipping Thresholds
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure custom order value and shipping limits for products fulfilled from your store.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                useCustomThresholds
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {useCustomThresholds ? 'Custom Overrides Active' : 'Inherited from Platform Defaults'}
              </span>
            </div>
          </div>

          {/* Mode Switch: Inherited vs Custom Overrides */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomThresholds}
                  onChange={(e) => {
                    setUseCustomThresholds(e.target.checked);
                    if (e.target.checked) {
                      if (minOrderValue === undefined) setMinOrderValue(199);
                      if (freeShippingThreshold === undefined) setFreeShippingThreshold(499);
                      if (codMinValue === undefined) setCodMinValue(299);
                      if (codMaxValue === undefined) setCodMaxValue(5000);
                    }
                  }}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900">Enable Custom Vendor Threshold Overrides</span>
                  <p className="text-[11px] text-slate-500">
                    When disabled, your catalog automatically inherits universal store defaults set by BioCart platform administration.
                  </p>
                </div>
              </label>

              {useCustomThresholds && (
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomThresholds(false);
                    setMinOrderValue(undefined);
                    setFreeShippingThreshold(undefined);
                    setCodMinValue(undefined);
                    setCodMaxValue(undefined);
                    setCodAvailable(true);
                    addToast('Reset to universal platform defaults. Click "Save Threshold Settings" to apply.', 'info');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer underline whitespace-nowrap"
                >
                  Reset to Universal Defaults
                </button>
              )}
            </div>
          </div>

          {/* Threshold Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
            {/* Minimum Order Value */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Minimum Order Value (₹)</label>
                {!useCustomThresholds && (
                  <span className="text-[10px] text-slate-400 font-medium">Platform Default: ₹199</span>
                )}
              </div>
              <input
                type="number"
                min={0}
                max={50000}
                disabled={!useCustomThresholds}
                value={useCustomThresholds ? (minOrderValue ?? 199) : 199}
                onChange={(e) => setMinOrderValue(Number(e.target.value))}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold border transition-colors ${
                  useCustomThresholds
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-500'
                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              />
              <p className="text-[10px] text-slate-500 mt-1">Minimum subtotal required to purchase your products.</p>
            </div>

            {/* Free Shipping Threshold */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Free Shipping Threshold (₹)</label>
                {!useCustomThresholds && (
                  <span className="text-[10px] text-slate-400 font-medium">Platform Default: ₹499</span>
                )}
              </div>
              <input
                type="number"
                min={0}
                max={100000}
                disabled={!useCustomThresholds}
                value={useCustomThresholds ? (freeShippingThreshold ?? 499) : 499}
                onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold border transition-colors ${
                  useCustomThresholds
                    ? 'bg-slate-50 border-slate-300 text-emerald-700 focus:outline-none focus:border-emerald-500'
                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              />
              <p className="text-[10px] text-slate-500 mt-1">Orders above this threshold qualify for free shipping.</p>
            </div>

            {/* Cash on Delivery Availability */}
            <div className="sm:col-span-2 pt-2">
              <label className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!useCustomThresholds}
                  checked={useCustomThresholds ? codAvailable : true}
                  onChange={(e) => setCodAvailable(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 disabled:opacity-50"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">Enable Cash on Delivery (COD) for My Store</p>
                  <p className="text-[11px] text-slate-500">Allow customers to pay via COD for items fulfilled by your warehouse.</p>
                </div>
              </label>
            </div>

            {/* COD Minimum Value */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">COD Minimum Order Value (₹)</label>
                {!useCustomThresholds && (
                  <span className="text-[10px] text-slate-400 font-medium">Platform Default: ₹299</span>
                )}
              </div>
              <input
                type="number"
                min={0}
                max={10000}
                disabled={!useCustomThresholds || !codAvailable}
                value={useCustomThresholds ? (codMinValue ?? 299) : 299}
                onChange={(e) => setCodMinValue(Number(e.target.value))}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold border transition-colors ${
                  useCustomThresholds && codAvailable
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-500'
                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              />
              <p className="text-[10px] text-slate-500 mt-1">Minimum cart value required to use Cash on Delivery.</p>
            </div>

            {/* COD Maximum Value */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">COD Maximum Cap (₹)</label>
                {!useCustomThresholds && (
                  <span className="text-[10px] text-slate-400 font-medium">Platform Default: ₹5,000</span>
                )}
              </div>
              <input
                type="number"
                min={500}
                max={100000}
                disabled={!useCustomThresholds || !codAvailable}
                value={useCustomThresholds ? (codMaxValue ?? 5000) : 5000}
                onChange={(e) => setCodMaxValue(Number(e.target.value))}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold border transition-colors ${
                  useCustomThresholds && codAvailable
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-500'
                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              />
              <p className="text-[10px] text-slate-500 mt-1">Maximum cap to minimize courier return-to-origin (RTO) risk.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Threshold Settings
            </button>
          </div>
        </form>
      )}

      {/* TAB 5: Financial & Payout Information */}
      {activeTab === 'financial' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600" />
              Settlement & Bank Details
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Authoritative payout destination and commission structure configured by BioCart platform administration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <p className="text-xs text-slate-500 font-semibold">Bank Name</p>
              <p className="text-sm font-bold text-slate-900">
                {rawVendorDoc?.settlement?.bankName || 'Not configured by administrator'}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <p className="text-xs text-slate-500 font-semibold">Account Number (Masked)</p>
              <p className="text-sm font-mono font-bold text-slate-900">
                {rawVendorDoc?.settlement?.accountNumber
                  ? `•••• •••• ${rawVendorDoc.settlement.accountNumber.slice(-4)}`
                  : '•••• •••• —'}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <p className="text-xs text-slate-500 font-semibold">IFSC Code</p>
              <p className="text-sm font-mono font-bold text-slate-900">
                {rawVendorDoc?.settlement?.ifscCode || '—'}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <p className="text-xs text-slate-500 font-semibold">Platform Commission Rate</p>
              <p className="text-sm font-bold text-emerald-700">
                {(rawVendorDoc?.commission?.baseRateBps ?? (rawVendorDoc?.commissionRate ? rawVendorDoc.commissionRate * 100 : 0)) / 100}%
              </p>
            </div>
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p leading-relaxed>
              Per financial compliance rules, bank account updates require administrator verification. Contact BioCart administration to modify your registered NEFT/RTGS settlement account.
            </p>
          </div>
        </div>
      )}

      {/* TAB 6: Documents & Verification */}
      {activeTab === 'documents' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              KYC & Compliance Verification
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Legal documents and regulatory certificates on file.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">GST Registration Certificate</p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {rawVendorDoc?.legal?.gstin || rawVendorDoc?.gstNumber || 'Not provided'}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                rawVendorDoc?.legal?.gstin ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {rawVendorDoc?.legal?.gstin ? 'Verified' : 'Optional / Pending'}
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">Permanent Account Number (PAN)</p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {rawVendorDoc?.legal?.pan || 'Not provided'}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                rawVendorDoc?.legal?.pan ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {rawVendorDoc?.legal?.pan ? 'Verified' : 'Optional / Pending'}
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">Partner Agreement & Terms</p>
                <p className="text-[11px] text-slate-500">BioCart Master Vendor Marketplace Agreement</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Active & Bound
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: Help & Support */}
      {activeTab === 'support' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-emerald-600" />
              Vendor Support & Operating Status
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Direct assistance channels and account operational guidelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
              <h4 className="text-xs font-bold text-slate-900">Partner Help Desk</h4>
              <p className="text-xs text-slate-600">
                Email our vendor onboarding and logistics support team directly:
              </p>
              <a
                href="mailto:support@biocart.in"
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                support@biocart.in <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
              <h4 className="text-xs font-bold text-slate-900">Emergency Logistics Contact</h4>
              <p className="text-xs text-slate-600">
                For order delivery, Delhivery pickup escalation, or returns query:
              </p>
              <p className="text-xs font-bold text-slate-800">+91 (Contact BioCart Operations)</p>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800">
            <p className="font-bold mb-0.5">Account Status: Active & Operational</p>
            <p className="text-[11px] text-emerald-700">
              Your vendor partner profile is in good standing. Products published to your catalog are live and discoverable on https://biocart.in.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorSettings;
