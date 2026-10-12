import React, { useEffect, useState } from 'react';
import { AdminService } from '../../services/AdminService';
import { Product, CategoryItem, VendorItem, Review, StoreSettings, AuditLog } from '../../types';
import { SEED_PRODUCTS } from '../../data/seedData';
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  Store, 
  Package, 
  AlertTriangle, 
  Star, 
  TrendingUp, 
  ArrowUpRight, 
  RefreshCw,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { AdminSection } from './AdminLayout';

interface AdminDashboardProps {
  onNavigate: (section: AdminSection) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Seed initial data idempotently if empty
    AdminService.seedInitialCatalogIfEmpty().catch(console.error);
    const unsubProducts = AdminService.subscribeToProducts(
      (list) => {
        setProducts(list);
        setLoading(false);
      },
      (error) => {
        console.error('AdminDashboard products subscription error:', error);
        setLoading(false);
      }
    );
    const unsubCategories = AdminService.subscribeToCategories((list) => setCategories(list));
    const unsubVendors = AdminService.subscribeToVendors((list) => setVendors(list));
    const unsubReviews = AdminService.subscribeToReviews((list) => setReviews(list));
    const unsubUsers = AdminService.subscribeToUsers((list) => setUsers(list));
    const unsubOrders = AdminService.subscribeToOrders((list) => setOrders(list));
    const unsubLogs = AdminService.subscribeToAuditLogs((list) => setAuditLogs(list));


    

    return () => {
      unsubProducts();
      unsubCategories();
      unsubVendors();
      unsubReviews();
      unsubUsers();
      unsubOrders();
      unsubLogs();


    };
  }, []);

  // Compute live real-time metrics
  const effectiveProducts = products.length > 0 ? products : SEED_PRODUCTS;
  const activeProducts = effectiveProducts.filter((p) => p.active !== false).length;
  const outOfStockProducts = effectiveProducts.filter((p) => !p.inStock || (p.stockQuantity !== undefined && p.stockQuantity <= 0)).length;
  const pendingReviews = reviews.filter((r) => r.status === 'pending').length;
  const pendingVendors = vendors.filter((v) => v.status === 'pending').length;
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

  const statCards = [
    { title: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, sub: `${orders.length} Completed Orders`, icon: DollarSign, color: 'from-emerald-600 to-teal-500', link: 'orders' as AdminSection },
    { title: 'Total Orders', value: orders.length.toString(), sub: 'Live Marketplace Checkout', icon: ShoppingBag, color: 'from-blue-600 to-cyan-500', link: 'orders' as AdminSection },
    { title: 'Total Customers', value: users.length.toString(), sub: 'Registered BioCart Accounts', icon: Users, color: 'from-purple-600 to-indigo-500', link: 'customers' as AdminSection },
    { title: 'Registered Vendors', value: vendors.length.toString(), sub: `${pendingVendors} Pending Approval`, icon: Store, color: 'from-amber-600 to-orange-500', link: 'vendors' as AdminSection },
    { title: 'Total Products', value: effectiveProducts.length.toString(), sub: `${activeProducts} Active | ${outOfStockProducts} Low/Out Stock`, icon: Package, color: 'from-teal-600 to-emerald-500', link: 'products' as AdminSection },
    { title: 'Pending Reviews', value: pendingReviews.toString(), sub: 'Requires Admin Moderation', icon: Star, color: 'from-rose-600 to-pink-500', link: 'reviews' as AdminSection }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
        <p className="text-xs text-[#777777] font-mono">Syncing real-time Firestore database metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-200 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono mb-1">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>LIVE FIRESTORE REAL-TIME CONTROL</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Marketplace Operations Overview</h1>
          <p className="text-xs text-[#777777] mt-1">Real-time status of BioCart vendor catalog, inventory, and dynamic frontend controls.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('products')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-900 font-medium text-xs rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2"
          >
            <Package className="w-4 h-4" />
            Manage Products
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-700 font-medium text-xs rounded-xl border border-slate-300 transition-all"
          >
            Store Settings
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              onClick={() => onNavigate(card.link)}
              className="group cursor-pointer p-5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl transition-all shadow-md flex items-start justify-between"
            >
              <div>
                <p className="text-xs text-[#777777] font-medium">{card.title}</p>
                <h2 className="text-2xl font-bold text-slate-900 mt-1 group-hover:text-emerald-400 transition-colors">{card.value}</h2>
                <p className="text-[11px] text-[#777777] mt-1">{card.sub}</p>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-br ${card.color} text-slate-900 shadow-md group-hover:scale-105 transition-transform`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Alerts & Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Moderation & Approvals */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Required Action Items
            </h3>
            <span className="text-[11px] font-mono text-[#777777]">Real-Time Queue</span>
          </div>

          <div className="space-y-3">
            {pendingVendors > 0 ? (
              <div 
                onClick={() => onNavigate('vendors')} 
                className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl cursor-pointer hover:bg-amber-900/40 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-200">{pendingVendors} Pending Vendor Application(s)</p>
                    <p className="text-[11px] text-amber-400/80">Review business licenses and approve marketplace seller status.</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-amber-400" />
              </div>
            ) : (
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <p className="text-xs text-emerald-300">All vendor onboarding applications are up to date.</p>
              </div>
            )}

            {pendingReviews > 0 ? (
              <div 
                onClick={() => onNavigate('reviews')} 
                className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl cursor-pointer hover:bg-rose-900/40 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
                    <Star className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-rose-200">{pendingReviews} Unmoderated Product Review(s)</p>
                    <p className="text-[11px] text-rose-400/80">Approve customer feedback for visible display on product pages.</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-rose-400" />
              </div>
            ) : (
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <p className="text-xs text-emerald-300">All customer reviews are moderated.</p>
              </div>
            )}

            {outOfStockProducts > 0 && (
              <div 
                onClick={() => onNavigate('products')} 
                className="p-3 bg-purple-950/40 border border-purple-800/50 rounded-xl cursor-pointer hover:bg-purple-900/40 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-purple-200">{outOfStockProducts} Out of Stock / Low Stock Item(s)</p>
                    <p className="text-[11px] text-purple-400/80">Update inventory levels or notify vendor suppliers.</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-purple-400" />
              </div>
            )}
          </div>
        </div>

        {/* Recent Audit Trail */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Recent Admin Activity Log
            </h3>
            <button onClick={() => onNavigate('audit-logs')} className="text-[11px] text-emerald-400 hover:underline">
              View All
            </button>
          </div>

          <div className="space-y-2.5">
            {auditLogs.length > 0 ? (
              auditLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/50 flex items-center justify-between text-xs">
                  <div className="truncate max-w-[70%]">
                    <p className="text-slate-700 font-medium truncate">{log.action}</p>
                    <p className="text-[10px] text-[#777777] font-mono">{log.actorEmail}</p>
                  </div>
                  <span className="text-[10px] text-[#777777] font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#777777] py-4 text-center">No recent audit logs recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Top Products Summary Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h3 className="font-semibold text-sm text-slate-900">BioCart Featured Catalog Summary</h3>
            <p className="text-[11px] text-[#777777]">Live products controlling customer homepage & shop categories</p>
          </div>
          <button
            onClick={() => onNavigate('products')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
          >
            Manage Catalog <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[#777777] uppercase font-mono text-[10px]">
              <tr>
                <th className="p-3">Product Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Price</th>
                <th className="p-3">MRP</th>
                <th className="p-3">Stock Status</th>
                <th className="p-3">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {products.slice(0, 6).map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 font-medium text-slate-900 flex items-center gap-3">
                    <img src={product.image} alt={product.name} className="w-8 h-8 rounded-lg object-cover bg-slate-800" />
                    <span className="truncate max-w-[200px]">{product.name}</span>
                  </td>
                  <td className="p-3 text-[#777777]">{product.category}</td>
                  <td className="p-3 font-mono text-[11px] text-[#777777]">{product.sku}</td>
                  <td className="p-3 font-semibold text-emerald-400">₹{product.price}</td>
                  <td className="p-3 text-[#777777] line-through">₹{product.mrp}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      product.inStock ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {product.stockStatus}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {product.isFeatured && <span className="px-1.5 py-0.5 text-[9px] bg-blue-500/20 text-blue-400 rounded">Featured</span>}
                      {product.isBestSeller && <span className="px-1.5 py-0.5 text-[9px] bg-amber-500/20 text-amber-400 rounded">BestSeller</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
