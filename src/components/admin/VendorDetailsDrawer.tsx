import React, { useState } from 'react';
import { VendorItem } from '../../types';
import {
  Store,
  X,
  Building2,
  FileText,
  MapPin,
  Percent,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  Globe,
  Clock,
  ShieldCheck,
  Edit3
} from 'lucide-react';

interface VendorDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: VendorItem;
  onEdit: () => void;
  onViewDashboard?: () => void;
}

export const VendorDetailsDrawer: React.FC<VendorDetailsDrawerProps> = ({
  isOpen,
  onClose,
  vendor,
  onEdit,
  onViewDashboard
}) => {
  if (!isOpen) return null;

  const regAddress = vendor.addresses?.registeredAddress;
  const pickupAddress = vendor.addresses?.pickupAddress;

  // Mask bank account number (show only last 4 digits)
  const maskBankAccount = (acc?: string) => {
    if (!acc || acc.length < 5) return '••••••••';
    return `••••••••${acc.slice(-4)}`;
  };

  // Mask PAN
  const maskPAN = (pan?: string) => {
    if (!pan || pan.length < 5) return '••••••••';
    return `${pan.slice(0, 2)}••••••${pan.slice(-2)}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 rounded-2xl text-emerald-700">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{vendor.storeName}</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    vendor.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : vendor.status === 'pending'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                >
                  {vendor.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">Vendor ID: <span className="font-mono">{vendor.id}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-grow overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* 1. Identity & Owner Details */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 border-b border-slate-200 pb-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Business Identity & Contact</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-slate-500 block">Owner / Contact:</span>
                <span className="font-semibold text-slate-900">{vendor.ownerName || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Login Email:</span>
                <span className="font-mono font-medium text-emerald-800">{vendor.email || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Phone:</span>
                <span className="font-semibold text-slate-900">{vendor.phone || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Website:</span>
                <span className="text-slate-700">{vendor.website ? <a href={vendor.website} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline">{vendor.website}</a> : '—'}</span>
              </div>
            </div>
            {vendor.description && (
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 block mb-0.5">Bio / Description:</span>
                <p className="text-slate-800 text-[11px] leading-relaxed">{vendor.description}</p>
              </div>
            )}
          </div>

          {/* 2. Registration & Tax Details */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 border-b border-slate-200 pb-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Registration & Tax Identifiers</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-slate-500 block">Business Type:</span>
                <span className="capitalize font-semibold text-slate-900">{vendor.legal?.businessType || 'Proprietorship'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Reg. Number:</span>
                <span className="font-mono text-slate-800">{vendor.legal?.registrationNumber || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">GSTIN:</span>
                <span className="font-mono text-slate-800">{vendor.legal?.gstin || 'Unregistered'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">PAN:</span>
                <span className="font-mono text-slate-800">{maskPAN(vendor.legal?.pan)}</span>
              </div>
            </div>
          </div>

          {/* 3. Addresses */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 border-b border-slate-200 pb-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Addresses (Logistics & Registered)</span>
            </div>

            <div>
              <span className="text-slate-500 font-semibold block mb-0.5">Registered Address:</span>
              {regAddress?.addressLine1 ? (
                <p className="text-slate-800 font-medium">
                  {regAddress.addressLine1}, {regAddress.city}, {regAddress.state} - {regAddress.pinCode}, {regAddress.country}
                </p>
              ) : (
                <p className="text-slate-400 italic">No registered address specified</p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200">
              <span className="text-slate-500 font-semibold block mb-0.5">EKART Pickup Address:</span>
              {pickupAddress?.addressLine1 ? (
                <p className="text-slate-800 font-medium">
                  {pickupAddress.addressLine1}, {pickupAddress.city}, {pickupAddress.state} - {pickupAddress.pinCode}, {pickupAddress.country}
                </p>
              ) : (
                <p className="text-slate-400 italic">Same as registered address</p>
              )}
            </div>
          </div>

          {/* 4. Commercial Terms & Payout */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 border-b border-slate-200 pb-2">
              <Percent className="w-4 h-4 text-emerald-600" />
              <span>Commercial Terms & Bank Details</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-slate-500 block">Platform Commission:</span>
                <span className="font-bold text-emerald-700 text-sm">{(vendor.commission?.baseRateBps || 1000) / 100}%</span>
              </div>
              <div>
                <span className="text-slate-500 block">Settlement Bank:</span>
                <span className="font-semibold text-slate-900">{vendor.settlement?.bankName || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Account Number:</span>
                <span className="font-mono text-slate-800">{maskBankAccount(vendor.settlement?.accountNumber)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">IFSC Code:</span>
                <span className="font-mono text-slate-800">{vendor.settlement?.ifscCode || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            {onViewDashboard && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewDashboard();
                }}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Store className="w-3.5 h-3.5 text-emerald-700" /> View Dashboard
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Full Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
