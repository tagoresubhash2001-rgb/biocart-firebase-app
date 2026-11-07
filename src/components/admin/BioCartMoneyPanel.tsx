import React, { useEffect, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';

const rs = (p: any) => `₹${(Math.round(Number(p) || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Live, all-time money summary straight from the backend books (company_wallet/main and
 * vendor_wallets). Same numbers the settlement engine uses — nothing is recalculated here.
 */
export const BioCartMoneyPanel: React.FC = () => {
  const [c, setC] = useState<any>({});
  const [v, setV] = useState({ pending: 0, available: 0, settling: 0, paidOut: 0, adjustmentDue: 0, courier: 0, reversed: 0, reversedCount: 0 });

  useEffect(() => {
    const u1 = onSnapshot(doc(db, 'company_wallet', 'main'), (s) => setC(s.data() || {}), () => undefined);
    const u2 = onSnapshot(collection(db, 'vendor_wallets'), (snap) => {
      const t = { pending: 0, available: 0, settling: 0, paidOut: 0, adjustmentDue: 0, courier: 0, reversed: 0, reversedCount: 0 };
      snap.docs.forEach((d) => {
        const w: any = d.data();
        t.pending += Number(w.pending || 0); t.available += Number(w.available || 0); t.settling += Number(w.settling || 0);
        t.paidOut += Number(w.paidOut || 0); t.adjustmentDue += Number(w.adjustmentDue || 0);
        t.courier += Number(w.lifetimeCourierCharges || 0); t.reversed += Number(w.lifetimeReversedPaise || 0); t.reversedCount += Number(w.reversedOrderCount || 0);
      });
      setV(t);
    }, () => undefined);
    return () => { u1(); u2(); };
  }, []);

  const commission = Number(c.commissionEarnedPaise || 0);
  const shipping = Number(c.shippingIncomePaise || 0);
  const cashfree = Number(c.gatewayFeesPaise || 0);
  const subsidy = Number(c.couponSubsidyPaise || 0);
  const net = commission + shipping - cashfree - subsidy;

  const Row = ({ label, value, note, strong, minus }: { label: string; value: any; note?: string; strong?: boolean; minus?: boolean }) => (
    <div className="flex justify-between gap-3 py-1.5 border-b border-slate-100 last:border-b-0">
      <span className={strong ? 'font-bold text-slate-900' : 'text-slate-600'}>{label}{note && <span className="block text-[10px] text-slate-400">{note}</span>}</span>
      <span className={`font-mono ${strong ? 'font-bold text-slate-900' : minus ? 'text-rose-600' : 'text-slate-800'}`}>{minus ? '− ' : ''}{rs(value)}</span>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6" id="biocart-money-panel">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 text-xs">
        <h3 className="font-bold text-sm text-slate-900 mb-2">BioCart's money (all time, live)</h3>
        <Row label="Customers paid (total)" value={c.customerCollectionsPaise} />
        <Row label="BioCart commission from sellers" value={commission} />
        <Row label="Delivery charges paid by customers" value={shipping} note="100% BioCart" />
        <Row label="Cashfree fees (actual)" value={cashfree} minus note="From Cashfree's daily settlement report; paid by BioCart" />
        <Row label="BioCart-funded coupons" value={subsidy} minus />
        <Row label="BioCart earnings" value={net} strong note="commission + delivery charges − Cashfree fees − coupons" />
        <Row label="Refunds sent to customers" value={c.customerRefundsPaise} minus />
        <Row label="EKART charges recovered from sellers" value={c.courierChargesFromVendorsPaise} note="Covers what EKART bills BioCart for sellers' parcels" />
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-5 text-xs">
        <h3 className="font-bold text-sm text-slate-900 mb-2">Money owed to sellers (live)</h3>
        <Row label="Pending — not delivered yet" value={v.pending} />
        <Row label="Delivered — ready for Tuesday payout" value={v.available} />
        <Row label="In settlement — to transfer now" value={v.settling} />
        <Row label="Paid to sellers (with UTR)" value={v.paidOut} />
        <Row label="To recover from sellers" value={v.adjustmentDue} minus note="Refunds/courier after payout — deducted in the next settlement" />
        <Row label="EKART courier charged to sellers" value={v.courier} />
        <Row label={`Reversed — cancelled / not delivered (${v.reversedCount} orders)`} value={v.reversed} />
      </div>
    </div>
  );
};
