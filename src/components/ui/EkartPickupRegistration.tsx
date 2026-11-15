import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, Truck } from 'lucide-react';
import { ShippingService } from '../../services/ShippingService';
import { useApp } from '../../context/AppContext';

interface Props {
  vendorId: string;
  /** The `ekart` field of the vendor document, if any. */
  ekart?: { pickupAlias?: string; pickupRegisteredAt?: string } | null;
  onRegistered?: () => void;
}

/**
 * Shows whether the vendor's pickup address is registered with EKART and lets an
 * admin or the vendor register it. EKART cannot collect parcels until this is done.
 */
export const EkartPickupRegistration: React.FC<Props> = ({ vendorId, ekart, onRegistered }) => {
  const { addToast } = useApp();
  const [busy, setBusy] = useState(false);
  const [alias, setAlias] = useState(ekart?.pickupAlias || '');
  const [registeredAt, setRegisteredAt] = useState(ekart?.pickupRegisteredAt || '');
  const [error, setError] = useState('');

  useEffect(() => {
    setAlias(ekart?.pickupAlias || '');
    setRegisteredAt(ekart?.pickupRegisteredAt || '');
  }, [ekart?.pickupAlias, ekart?.pickupRegisteredAt]);

  const handleRegister = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await ShippingService.registerPickupAddress(vendorId);
      setAlias(res.alias);
      setRegisteredAt(res.registeredAt);
      addToast(res.message || 'Pickup address registered with EKART.', 'success');
      onRegistered?.();
    } catch (err: any) {
      const msg = err?.message || 'EKART did not accept the pickup address.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="flex items-start gap-2">
        {alias ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        )}
        <div className="text-xs">
          <p className="font-bold text-slate-900">EKART pickup address</p>
          {alias ? (
            <p className="text-slate-600">
              Registered with EKART as <span className="font-mono font-semibold text-slate-900">{alias}</span>
              {registeredAt ? ` on ${new Date(registeredAt).toLocaleString('en-IN')}` : ''}.
            </p>
          ) : (
            <p className="text-amber-700 font-semibold">
              Not registered. EKART shipments cannot be created until the pickup address is registered.
            </p>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-600 font-medium break-words">{error}</p>}

      <button
        type="button"
        onClick={handleRegister}
        disabled={busy || !vendorId}
        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
        {alias ? 'Re-register pickup address with EKART' : 'Register pickup address with EKART'}
      </button>
      <p className="text-[11px] text-slate-500">
        Uses the saved pickup address and phone number. Save any address changes first, then register again.
      </p>
    </div>
  );
};
