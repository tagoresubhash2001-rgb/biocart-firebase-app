import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';

type Section = string;

export interface SearchFeature { id: Section; label: string }

interface ResultItem {
  key: string;
  kind: 'Feature' | 'Product' | 'Vendor' | 'Order' | 'Customer';
  title: string;
  subtitle?: string;
  section: Section;
}

/** Extra words people type for each admin page. */
const FEATURE_KEYWORDS: Record<string, string[]> = {
  dashboard: ['home', 'overview', 'sales', 'revenue', 'stats', 'report'],
  financials: ['finance', 'money', 'commission', 'ledger', 'wallet', 'company wallet', 'gateway fee', 'gmv'],
  products: ['product', 'catalog', 'approve', 'approval', 'pending', 'reject', 'sku', 'price'],
  inventory: ['stock', 'quantity', 'sold out', 'out of stock', 'low stock'],
  categories: ['category', 'categories'],
  coupons: ['coupon', 'discount', 'promo code', 'offer'],
  promotions: ['promotion', 'sponsored', 'ads', 'featured', 'best seller'],
  'promotional-ribbons': ['ribbon', 'banner', 'announcement', 'top bar'],
  pages: ['page', 'home page', 'cms', 'about', 'contact page', 'homepage'],
  blogs: ['blog', 'seo', 'article', 'post'],
  reviews: ['review', 'rating', 'moderation'],
  faqs: ['faq', 'questions', 'help'],
  vendors: ['vendor', 'seller', 'store', 'commission', 'ekart pickup', 'pickup address', 'suspend', 'kyc'],
  payouts: ['payout', 'settlement', 'utr', 'vendor payment', 'tuesday', 'mark as paid'],
  agents: ['agent'],
  customers: ['customer', 'buyer', 'user'],
  users: ['admin user', 'staff', 'role', 'permission'],
  orders: ['order', 'refund', 'cancel', 'payment', 'cashfree', 'delivered', 'cod remitted'],
  shipments: ['shipment', 'ekart', 'courier', 'awb', 'tracking', 'label', 'webhook', 'logistics', 'delivery'],
  'contact-messages': ['message', 'contact', 'enquiry', 'support'],
  settings: ['setting', 'shipping charge', 'free delivery', 'free shipping', 'cod', 'cash on delivery', 'money rules', 'store info', 'logo', 'api'],
  'audit-logs': ['audit', 'log', 'history', 'activity'],
};

const norm = (s: any) => String(s ?? '').toLowerCase();

/**
 * Admin console search: type anything (a feature, product name/SKU, vendor, order ID, customer
 * name/email/phone) and jump to the right page. Ctrl+K / ⌘K focuses it.
 */
export const AdminGlobalSearch: React.FC<{ features: SearchFeature[]; onSelect: (section: Section, label: string) => void }> = ({ features, onSelect }) => {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [data, setData] = useState<ResultItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inputRef.current?.focus(); setOpen(true); }
    };
    const onClick = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, []);

  // Load records once, the first time the admin uses search.
  const loadData = async () => {
    if (loaded) return;
    setLoaded(true);
    try {
      const { collection, getDocs, limit, query, orderBy } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase');
      const safe = async (p: Promise<any>) => { try { return await p; } catch { return null; } };
      const [prod, vend, ord, cust] = await Promise.all([
        safe(getDocs(query(collection(db, 'products'), limit(1000)))),
        safe(getDocs(query(collection(db, 'vendors'), limit(500)))),
        safe(getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(500)))),
        safe(getDocs(query(collection(db, 'users'), limit(1000)))),
      ]);
      const items: ResultItem[] = [];
      prod?.docs.forEach((d: any) => { const x = d.data(); items.push({ key: `p_${d.id}`, kind: 'Product', title: x.name || d.id, subtitle: [x.sku, x.vendorName, x.approvalStatus].filter(Boolean).join(' · '), section: 'products' }); });
      vend?.docs.forEach((d: any) => { const x = d.data(); items.push({ key: `v_${d.id}`, kind: 'Vendor', title: x.storeName || x.businessName || d.id, subtitle: [x.ownerName, x.email, x.status].filter(Boolean).join(' · '), section: 'vendors' }); });
      ord?.docs.forEach((d: any) => { const x = d.data(); items.push({ key: `o_${d.id}`, kind: 'Order', title: d.id, subtitle: [x.shippingAddress?.name, x.shippingAddress?.phone, x.status, x.totalAmount != null ? `₹${x.totalAmount}` : ''].filter(Boolean).join(' · '), section: 'orders' }); });
      cust?.docs.forEach((d: any) => { const x = d.data(); if (x.role && x.role !== 'customer') return; items.push({ key: `c_${d.id}`, kind: 'Customer', title: x.name || x.displayName || x.email || d.id, subtitle: [x.email, x.phone].filter(Boolean).join(' · '), section: 'customers' }); });
      setData(items);
    } catch { /* search still works for features */ }
  };

  const results = useMemo(() => {
    const term = norm(q).trim();
    if (!term) return features.slice(0, 8).map((f) => ({ key: `f_${f.id}`, kind: 'Feature' as const, title: f.label, section: f.id }));
    const feat: ResultItem[] = features
      .filter((f) => norm(f.label).includes(term) || (FEATURE_KEYWORDS[f.id] || []).some((k) => k.includes(term) || term.includes(k)))
      .map((f) => ({ key: `f_${f.id}`, kind: 'Feature', title: f.label, section: f.id }));
    const recs = data.filter((r) => norm(r.title).includes(term) || norm(r.subtitle).includes(term)).slice(0, 20);
    return [...feat, ...recs].slice(0, 25);
  }, [q, data, features]);

  useEffect(() => { setActive(0); }, [q]);

  const choose = (r: ResultItem) => {
    onSelect(r.section, r.kind === 'Feature' ? r.title : `${r.kind}: ${r.title}`);
    setOpen(false);
    setQ('');
    inputRef.current?.blur();
  };

  return (
    <div ref={boxRef} className="relative w-full max-w-md" id="admin-global-search">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-emerald-500 focus-within:bg-white">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); loadData(); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === 'Enter' && results[active]) { e.preventDefault(); choose(results[active]); }
            else if (e.key === 'Escape') { setOpen(false); }
          }}
          placeholder="Search features, products, orders, vendors, customers…"
          className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
          aria-label="Admin search"
        />
        <kbd className="hidden lg:inline text-[10px] font-mono text-slate-400 border border-slate-200 rounded px-1">Ctrl K</kbd>
      </div>
      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-96 overflow-y-auto z-50">
          {results.length === 0 ? (
            <div className="p-3 text-xs text-slate-500">No match for “{q}”.</div>
          ) : results.map((r, i) => (
            <button
              key={r.key}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(r)}
              className={`w-full text-left px-3 py-2 flex items-center gap-3 ${i === active ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
            >
              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${r.kind === 'Feature' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{r.kind}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-slate-900 truncate">{r.title}</span>
                {r.subtitle && <span className="block text-[11px] text-slate-500 truncate">{r.subtitle}</span>}
              </span>
              {i === active && <CornerDownLeft className="w-3.5 h-3.5 text-slate-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
