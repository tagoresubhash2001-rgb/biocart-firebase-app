import React, { useState } from 'react';
import {
  X,
  Building2,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import { VendorFinancialSummary } from '../../services/AnalyticsService';

interface InitiateSettlementModalProps {
  vendor: VendorFinancialSummary;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (vendorId: string, amountPaise: number, reason: string) => Promise<void>;
}

export const InitiateSettlementModal: React.FC<InitiateSettlementModalProps> = ({
  vendor,
  isOpen,
  onClose,
  onSubmit
}) => {
  const [amountRupees, setAmountRupees] = useState<string>(
    ((vendor.walletAvailablePaise || 0) / 100).toString()
  );
  const [reason, setReason] = useState<string>('Authorized manual vendor payout');
  const [confirmStep, setConfirmStep] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const availableRupees = (vendor.walletAvailablePaise || 0) / 100;
  const parsedAmountRupees = parseFloat(amountRupees) || 0;
  const parsedAmountPaise = Math.round(parsedAmountRupees * 100);

  const isEligible = vendor.isBankVerified && availableRupees > 0;
  const isExceeding = parsedAmountRupees > availableRupees;
  const isInvalidAmount = parsedAmountRupees <= 0 || isNaN(parsedAmountRupees);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!confirmStep) {
      if (isExceeding) {
        setErrorMsg(`Amount cannot exceed eligible available balance of ₹${availableRupees.toLocaleString('en-IN')}`);
        return;
      }
      if (isInvalidAmount) {
        setErrorMsg('Please specify a valid transfer amount greater than ₹0.');
        return;
      }
      if (!vendor.isBankVerified) {
        setErrorMsg('Cannot initiate transfer: Vendor bank account is unverified or incomplete.');
        return;
      }
      if (!reason.trim()) {
        setErrorMsg('An audit reason is required for manual settlement release.');
        return;
      }
      setConfirmStep(true);
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(vendor.vendorId, parsedAmountPaise, reason.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Manual settlement request failed.');
      setConfirmStep(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <DollarSign className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Initiate Manual Settlement</h2>
              <p className="text-xs text-slate-500 font-mono">Vendor: {vendor.storeName} ({vendor.vendorId})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Balance Breakdown Grid */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">Available Payout Balance</span>
              <span className="text-lg font-bold text-emerald-700">₹{availableRupees.toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Pending Hold Balance</span>
              <span className="text-sm font-semibold text-slate-700">₹{((vendor.walletPendingPaise || 0) / 100).toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Amount in Settlement</span>
              <span className="text-xs font-medium text-amber-700">₹{((vendor.walletSettlingPaise || 0) / 100).toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Total Lifetime Settled</span>
              <span className="text-xs font-medium text-slate-600">₹{((vendor.walletPaidOutPaise || 0) / 100).toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Verified Beneficiary Bank Details */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-white">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-500" />
                Registered Bank Destination
              </span>
              {vendor.isBankVerified ? (
                <span className="text-emerald-700 flex items-center gap-1 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Verified
                </span>
              ) : (
                <span className="text-rose-700 flex items-center gap-1 font-bold text-[11px] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                  Unverified / Missing
                </span>
              )}
            </div>

            <div className="text-xs space-y-1 text-slate-600 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Bank:</span>
                <span className="font-semibold text-slate-800">{vendor.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Account:</span>
                <span className="font-semibold text-slate-800">{vendor.accountNumberMasked}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">IFSC:</span>
                <span className="font-semibold text-slate-800">{vendor.ifscCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Beneficiary:</span>
                <span className="font-semibold text-slate-800">{vendor.beneficiaryName}</span>
              </div>
            </div>
          </div>

          {!confirmStep ? (
            <>
              {/* Amount Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Settlement Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={availableRupees}
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(e.target.value)}
                    disabled={!isEligible}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                  <span>Max eligible: ₹{availableRupees.toLocaleString('en-IN')}</span>
                  <button
                    type="button"
                    onClick={() => setAmountRupees(availableRupees.toString())}
                    className="text-emerald-700 font-bold hover:underline"
                  >
                    Max Amount
                  </button>
                </div>
              </div>

              {/* Audit Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Manual Settlement <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Approved vendor special request / mid-cycle festival payout clearance"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-amber-900 text-xs">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Manual payouts reserve funds immediately and call the payment gateway. Unsuccessful transfers automatically roll back to the vendor's available balance.
                </span>
              </div>
            </>
          ) : (
            /* Confirmation Step */
            <div className="space-y-3 bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs text-emerald-950">
              <div className="font-bold text-sm text-emerald-900 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-700" />
                Confirm Bank Transfer Authorization
              </div>
              <p>
                You are about to transfer <strong>₹{parsedAmountRupees.toLocaleString('en-IN')}</strong> to{' '}
                <strong>{vendor.storeName}</strong> ({vendor.bankName} - {vendor.accountNumberMasked}).
              </p>
              <div className="bg-white/70 p-2.5 rounded-lg border border-emerald-200 text-[11px] space-y-1">
                <div><strong>Reason:</strong> {reason}</div>
                <div><strong>Remaining Available:</strong> ₹{(availableRupees - parsedAmountRupees).toLocaleString('en-IN')}</div>
              </div>
              <p className="text-[11px] text-emerald-800">
                This transaction is authoritative and will be recorded in the double-entry financial ledger.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            {confirmStep ? (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmStep(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Back to Edit
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? 'Transferring...' : 'Confirm & Disburse Funds'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isEligible || isExceeding || isInvalidAmount}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Review & Authorize
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
