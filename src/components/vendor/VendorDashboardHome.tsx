import React, { useEffect, useMemo, useState } from 'react';
import { Package, ShoppingBag, Wallet, Clock, CheckCircle2, Banknote, Info } from 'lucide-react';
import { collection, query, where, doc, collectionGroup, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useVendor } from '../../hooks/useVendor';

const rs = (paise: number) => `₹${(Math.round(Number(paise) || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Next Tuesday 6 PM IST settlement run (today if it is Tuesday before 6 PM). */
function nextSettlementLabel(): string {
  const nowIst = new Date(Date.now() + 5.5 * 3600_000);
  const day = nowIst.getUTCDay();
  let add = (2 - day + 7) % 7;
  if (add === 0 && nowIst.getUTCHours() >= 18) add = 7;
  const d = new Date(nowIst.getTime() + add * 86400_000);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) + ', 6:00 PM';
}

const STATE_LABEL: Record<string, string> = {
  pending: 'Waiting for delivery',
  awaiting_cod_remittance: 'Delivered – waiting for COD cash',
  eligible: 'In next Tuesday payout',
  in_settlement: 'In settlement – being paid',
  settled: 'Paid to your bank',
  reversed: 'Refunded – not payable',
  none: 'Not paid yet',
};

export const VendorDashboardHome: React.FC = () => {
  const { vendorId, vendorData } = useVendor();

  const [productCount, setProductCount] = useState(0);
  const [subOrders, setSubOrders] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>({});

  const displayBusinessName = vendorData?.storeName || vendorData?.businessName || 'BioCart Direct Official';
  const displayOwnerName = vendorData?.ownerName || '';

  const [dashboardError, setDashboardError] = useState<string | null>(null);

  useEffect(() => {
    if (!vendorId) return;
    setDashboardError(null);

    const qProd = query(collection(db, 'products'), where('vendorId', '==', vendorId));
    const unsubProd = onSnapshot(qProd, (snap) => setProductCount(snap.size), (err) => {
      console.warn('Vendor products snapshot error:', err);
      setDashboardError(err.message);
    });

    const qOrder = query(collectionGroup(db, 'vendor_orders'), where('vendorId', '==', vendorId));
    const unsubOrder = onSnapshot(qOrder, (snap) => {
      setSubOrders(snap.docs.map((d) => ({ id: d.ref.parent.parent?.id || d.id, ...d.data() })));
    }, (err) => {
      console.warn('Vendor orders snapshot error:', err);
      setDashboardError(err.message);
    });

    const unsubWallet = onSnapshot(doc(db, 'vendor_wallets', vendorId), (snap) => {
      setWallet(snap.exists() ? snap.data() : {});
    }, (err) => {
      console.warn('Vendor wallet snapshot error:', err);
      setDashboardError(err.message);
    });

    return () => { unsubProd(); unsubOrder(); unsubWallet(); };
  }, [vendorId]);

  // Only paid / confirmed orders are real orders for the seller.
  const paidOrders = useMemo(() => subOrders
    .filter((o) => !['awaiting_payment', 'payment_expired'].includes(String(o.status || '')))
    .sort((a, b) => String(b.confirmedAt || b.updatedAt || '').localeCompare(String(a.confirmedAt || a.updatedAt || ''))), [subOrders]);

  const newOrders = paidOrders.filter((o) => o.status === 'new').length;
  const commissionPaid = Number(wallet.lifetimeCommission || 0);

  const cards = [
    { label: 'Pending (waiting for delivery)', value: rs(wallet.pending), note: 'Becomes available when EKART marks the order delivered', icon: Clock, color: 'text-amber-500' },
    { label: 'Available for next payout', value: rs(wallet.available), note: `Paid in the settlement on ${nextSettlementLabel()}`, icon: CheckCircle2, color: 'text-emerald-600' },
    { label: 'Being paid now', value: rs(wallet.settling), note: 'In a settlement; BioCart is transferring it', icon: Wallet, color: 'text-blue-500' },
    { label: 'Paid to your bank (total)', value: rs(wallet.paidOut), note: Number(wallet.adjustmentDue || 0) > 0 ? `Refund adjustment to deduct: ${rs(wallet.adjustmentDue)}` : 'With UTR in Wallet → Settlements', icon: Banknote, color: 'text-indigo-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{displayBusinessName}</h2>
        <p className="text-sm text-slate-500 mt-1">
          Vendor Console Overview {displayOwnerName ? `• Managed by ${displayOwnerName}` : ''}
        </p>
      </div>

      {dashboardError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs">
          <p className="font-bold">Error loading live vendor metrics</p>
          <p className="text-red-700">{dashboardError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" id="vendor-money-cards">
        {cards.map((c) => (
          <div key={c.label} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start">
              <p className="text-slate-500 text-sm">{c.label}</p>
              <c.icon className={`w-6 h-6 ${c.color}`} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{c.value}</h3>
            <p className="text-[11px] text-slate-500 mt-1">{c.note}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-start">
          <div><p className="text-slate-500 text-sm">Paid orders</p><h3 className="text-2xl font-bold text-slate-900">{paidOrders.length}</h3>
            <p className="text-[11px] text-slate-500">{newOrders > 0 ? `${newOrders} new — accept them in My Orders` : 'No new orders waiting'}</p></div>
          <ShoppingBag className="w-6 h-6 text-blue-500" />
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-start">
          <div><p className="text-slate-500 text-sm">My products</p><h3 className="text-2xl font-bold text-slate-900">{productCount}</h3></div>
          <Package className="w-6 h-6 text-indigo-500" />
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm">Total sales / BioCart commission</p>
          <h3 className="text-xl font-bold text-slate-900">{rs(wallet.lifetimeGross)} <span className="text-sm font-medium text-rose-600">− {rs(commissionPaid)}</span></h3>
          <p className="text-[11px] text-slate-500">Commission rate set by BioCart in your agreement</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden" id="vendor-earnings-breakdown">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-600" />
          <h3 className="font-bold text-slate-900 text-sm">How each order pays you</h3>
        </div>
        {paidOrders.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No paid orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="text-left px-4 py-2">Order</th>
                  <th className="text-right px-4 py-2">Product value</th>
                  <th className="text-right px-4 py-2">BioCart commission</th>
                  <th className="text-right px-4 py-2">Your share</th>
                  <th className="text-left px-4 py-2">Payout status</th>
                </tr>
              </thead>
              <tbody>
                {paidOrders.slice(0, 10).map((o) => {
                  const base = Number(o.commissionBasePaise ?? o.subtotalPaise ?? 0);
                  const comm = Number(o.commissionPaise ?? o.commissionAmountPaise ?? 0);
                  const share = Number(o.vendorPayablePaise ?? 0);
                  return (
                    <tr key={o.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-mono">{o.orderNumber || o.id}<div className="text-[10px] text-slate-400 font-sans">{(o.items || []).map((i: any) => `${i.name} ×${i.quantity}`).join(', ')}</div></td>
                      <td className="px-4 py-2 text-right">{rs(base)}</td>
                      <td className="px-4 py-2 text-right text-rose-600">− {rs(comm)}{o.commissionPercent != null ? ` (${o.commissionPercent}%)` : ''}</td>
                      <td className="px-4 py-2 text-right font-bold text-emerald-700">{rs(share)}</td>
                      <td className="px-4 py-2">{STATE_LABEL[String(o.earnings?.state || 'none')] || o.earnings?.state}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="px-5 py-3 text-[11px] text-slate-500 border-t border-slate-100">
              Shipping charges and the Cashfree payment fee are BioCart's — they are never taken from your share.
              Your share moves to "Available" after delivery and is paid in the Tuesday 6 PM settlement for the previous Tue–Mon week.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
