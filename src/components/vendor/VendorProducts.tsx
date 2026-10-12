import { useAuth } from '../../contexts/AuthContext';
import React, { useState, useEffect } from 'react';
import { AdminService } from '../../services/AdminService';
import { StorageService } from '../../services/StorageService';
import { Product, CategoryItem, VendorItem } from '../../types';
import { useVendor } from '../../hooks/useVendor';
import { useApp } from '../../context/AppContext';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Upload, 
  Check, 
  X, 
  Star, 
  Eye, 
  EyeOff, 
  Sparkles, 
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { MultiImageGalleryManager } from '../ui/MultiImageGalleryManager';

export const VendorProducts: React.FC = () => {
  const { userProfile, firebaseUser } = useAuth();
  const { vendorId, loading: vendorLoading } = useVendor();
  const { addToast } = useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (vendorLoading) return;
    if (!vendorId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubProducts = AdminService.subscribeToVendorProducts(
      vendorId,
      (list) => {
        setProducts(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('VendorProducts subscription error:', err);
        setError(err.message || 'Failed to load vendor products');
        setLoading(false);
      }
    );
    const unsubCategories = AdminService.subscribeToCategories((list) => setCategories(list));
    const unsubVendors = AdminService.subscribeToVendors((list) => setVendors(list));

    return () => {
      unsubProducts();
      unsubCategories();
      unsubVendors();
    };
  }, [vendorId, vendorLoading]);

  const actor = {
    id: userProfile?.uid || firebaseUser?.uid || 'vendor',
    email: userProfile?.email || firebaseUser?.email || 'vendor@biocart.com'
  };

  const handleOpenCreateModal = () => {
    const activeVendorId = vendorId || userProfile?.uid || firebaseUser?.uid || 'biocart';
    setEditingProduct({
      name: '',
      category: categories[0]?.name || 'Organic Fertilizers',
      categoryId: categories[0]?.id || '',
      vendorId: activeVendorId,
      
      price: 199,
      mrp: 299,
      sku: `BC-PROD-${Date.now().toString().slice(-6)}`,
      rating: 4.8,
      reviewsCount: 12,
      image: '/assets/products/prod_vermicompost.png',
      images: ['/assets/products/prod_vermicompost.png'],
      shortDescription: '',
      description: '',
      features: ['100% Pure Organic', 'Bio-Enriched'],
      benefits: ['Promotes root health'],
      usageInstructions: ['Apply to topsoil once a month'],
      ingredients: ['Organic Biomass'],
      weightVariants: ['1kg', '5kg'],
      selectedVariant: '1kg',
      stockStatus: 'In Stock',
      inStock: true,
      badge: 'Best Seller',
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: true,
      isSponsored: false,
      homepageVisible: true,
      shopVisible: true,
      active: true,
      stockQuantity: 100
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct({ ...product });
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name?.trim()) {
      addToast('Product name is required', 'warning');
      return;
    }
    if (!editingProduct.price || editingProduct.price <= 0) {
      addToast('Please enter a valid price', 'warning');
      return;
    }

    try {
      setIsSaving(true);
      const resolvedVendorId = vendorId || userProfile?.uid || firebaseUser?.uid || editingProduct.vendorId || 'biocart';
      const productPayload = {
        ...editingProduct,
        vendorId: resolvedVendorId,
        name: editingProduct.name.trim()
      };
      await AdminService.saveProduct(productPayload, actor);
      addToast(`Product "${productPayload.name}" saved successfully`, 'success');
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (err: any) {
      console.error('Error saving vendor product:', err);
      addToast(err.message || 'Failed to save product to database', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await AdminService.deleteProduct(id, actor);
      addToast('Product deleted from Firestore', 'info');
      setDeleteConfirmId(null);
    } catch (err: any) {
      addToast('Failed to delete product', 'warning');
    }
  };

  const handleToggleFlag = async (product: Product, flag: keyof Product) => {
    try {
      const updated = { ...product, [flag]: !product[flag] };
      await AdminService.saveProduct(updated, actor);
      addToast(`Updated ${product.name}`, 'success');
    } catch (err) {
      addToast('Failed to update product flag', 'warning');
    }
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const url = await StorageService.uploadImage(file, 'products');
      setEditingProduct((prev) => ({
        ...prev,
        image: url,
        images: [url, ...(prev?.images || [])]
      }));
      addToast('Image uploaded to Firebase Storage', 'success');
    } catch (err) {
      addToast('Image upload failed', 'warning');
    } finally {
      setUploadingImage(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            Product Catalog Management
          </h1>
          <p className="text-xs text-[#777777]">Real-time CRUD operations controlling customer shop catalog & homepage cards.</p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-900 text-xs font-semibold rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add New Product
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="relative flex-grow">
          <Search className="w-4 h-4 text-[#777777] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300/80 rounded-xl text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-300/80 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
        >
          <option value="All">All Categories ({products.length})</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Product Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[#777777] uppercase font-mono text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Category</th>
                <th className="p-3">Price / MRP</th>
                <th className="p-3">Stock</th>
                <th className="p-3 text-center">Placements</th>
                <th className="p-3 text-center">Active</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-semibold">Loading your catalog from database...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-rose-500 bg-rose-50/50">
                    <p className="text-xs font-bold mb-1">Failed to load products</p>
                    <p className="text-[11px] text-rose-600 mb-3">{error}</p>
                    <button
                      onClick={() => {
                        setLoading(true);
                        setError(null);
                        AdminService.subscribeToVendorProducts(vendorId || '', (list) => {
                          setProducts(list);
                          setLoading(false);
                        });
                      }}
                      className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs"
                    >
                      Retry Connection
                    </button>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-[#777777]">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-800 mb-0.5">No products found</p>
                    <p className="text-[11px] text-[#777777]">
                      {searchQuery ? `No products match "${searchQuery}".` : 'Click "Add New Product" to list your first item.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-medium text-slate-900 flex items-center gap-3 max-w-[240px]">
                      <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-contain bg-slate-100 flex-shrink-0" />
                      <div>
                        <p className="truncate font-semibold text-slate-800">{p.name}</p>
                        <p className="text-[10px] text-[#777777] truncate">{p.vendorName || 'BioCart Direct'}</p>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-[#777777]">{p.sku}</td>
                    <td className="p-3 text-[#777777]">{p.category}</td>
                    <td className="p-3">
                      <span className="font-bold text-emerald-400">₹{p.price}</span>
                      <span className="text-[10px] text-[#777777] line-through ml-1.5">₹{p.mrp}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        p.inStock ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {p.stockStatus}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleToggleFlag(p, 'isFeatured')}
                          title="Toggle Featured"
                          className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors ${
                            p.isFeatured ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-slate-800 text-[#777777]'
                          }`}
                        >
                          Featured
                        </button>
                        <button
                          onClick={() => handleToggleFlag(p, 'isBestSeller')}
                          title="Toggle Best Seller"
                          className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors ${
                            p.isBestSeller ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-slate-800 text-[#777777]'
                          }`}
                        >
                          BestSeller
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleToggleFlag(p, 'active')}
                        className={`p-1.5 rounded-lg transition-colors ${
                          p.active !== false ? 'text-emerald-400 hover:bg-emerald-950/40' : 'text-slate-600 hover:bg-slate-800'
                        }`}
                      >
                        {p.active !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1.5 text-slate-600 hover:text-emerald-400 hover:bg-slate-800 rounded-lg"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(p.id)}
                          className="p-1.5 text-[#777777] hover:text-rose-400 hover:bg-slate-800 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-white backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl max-w-sm w-full space-y-4">
            <h3 className="text-base font-bold text-slate-900">Delete Product?</h3>
            <p className="text-xs text-[#777777]">This action will remove the product permanently from Firestore real-time database.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-600 text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProduct(deleteConfirmId)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-slate-900 text-xs rounded-lg font-semibold"
              >
                Delete Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-white/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                {editingProduct.id ? 'Edit Product Details' : 'Create New Product'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#777777] hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#777777] mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[#777777] mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[#777777] mb-1">Category</label>
                  <select
                    value={editingProduct.category || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                

                <div>
                  <label className="block text-[#777777] mb-1">Selling Price (â‚¹) *</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.price || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[#777777] mb-1">MRP (â‚¹) *</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.mrp || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, mrp: Number(e.target.value) })}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Multi-Image Gallery Manager */}
              <MultiImageGalleryManager
                images={editingProduct.images || (editingProduct.image ? [editingProduct.image] : [])}
                coverImage={editingProduct.image || ''}
                folder="vendor_products"
                onChange={(updatedImages, updatedCover) => {
                  setEditingProduct({
                    ...editingProduct,
                    images: updatedImages,
                    image: updatedCover
                  });
                }}
              />

              <div>
                <label className="block text-[#777777] mb-1">Short Description</label>
                <input
                  type="text"
                  value={editingProduct.shortDescription || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, shortDescription: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[#777777] mb-1">Full Detailed Description</label>
                <textarea
                  rows={3}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900"
                />
              </div>

              {/* Placement Toggles */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <label className="flex items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    checked={editingProduct.isFeatured ?? true}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isFeatured: e.target.checked })}
                    className="rounded text-emerald-500"
                  />
                  Featured Product
                </label>
                <label className="flex items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    checked={editingProduct.isBestSeller ?? false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isBestSeller: e.target.checked })}
                    className="rounded text-emerald-500"
                  />
                  Best Seller
                </label>
                <label className="flex items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    checked={editingProduct.isNewArrival ?? false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isNewArrival: e.target.checked })}
                    className="rounded text-emerald-500"
                  />
                  New Arrival
                </label>
                <label className="flex items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    checked={editingProduct.active !== false}
                    onChange={(e) => setEditingProduct({ ...editingProduct, active: e.target.checked })}
                    className="rounded text-emerald-500"
                  />
                  Active (Visible)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-semibold shadow-lg shadow-emerald-950/20 flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <span>Save Product to Firestore</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


