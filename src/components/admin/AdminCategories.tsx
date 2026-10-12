import React, { useState, useEffect, useMemo } from 'react';
import { CategoryItem, Product } from '../../types';
import { AdminService } from '../../services/AdminService';
import { StorageService } from '../../services/StorageService';
import { 
  FolderTree, Plus, Edit3, Trash2, X, Upload, Loader2, 
  AlertCircle, Search, RefreshCw, Layers, CheckCircle2, 
  ArrowRight, ShieldAlert, Sparkles, Filter
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../context/AppContext';

export const AdminCategories: React.FC = () => {
  const { userProfile } = useAuth();
  const { addToast } = useApp();

  const actor = {
    id: userProfile?.uid || 'admin',
    email: userProfile?.email || 'admin@biocart.com'
  };

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'featured' | 'roots' | 'subcategories'>('all');

  // Modals State
  const [editingCategory, setEditingCategory] = useState<Partial<CategoryItem> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aliasesInput, setAliasesInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Delete Guard State
  const [deleteCandidate, setDeleteCandidate] = useState<CategoryItem | null>(null);

  // Reconciliation State
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [reconciliationResult, setReconciliationResult] = useState<{
    added: string[];
    updated: string[];
    preserved: string[];
    logs: string[];
  } | null>(null);

  const loadData = () => {
    setLoading(true);
    setError(null);

    const unsubCat = AdminService.subscribeToCategories(
      (list) => {
        setCategories(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message || 'Failed to load categories from database.');
        setLoading(false);
      }
    );

    const unsubProd = AdminService.subscribeToProducts((list) => {
      setProducts(list);
    });

    return () => {
      unsubCat();
      unsubProd();
    };
  };

  useEffect(() => {
    const unsub = loadData();
    return () => unsub();
  }, []);

  // Compute attached products count per category (by name, id, or aliases)
  const categoryProductsMap = useMemo(() => {
    const map = new Map<string, Product[]>();
    categories.forEach((cat) => {
      const attached = products.filter((p) => {
        if (p.categoryId === cat.id) return true;
        if (p.category?.toLowerCase() === cat.name.toLowerCase()) return true;
        if (cat.aliases && cat.aliases.some((a) => a.toLowerCase() === p.category?.toLowerCase())) return true;
        return false;
      });
      map.set(cat.id, attached);
    });
    return map;
  }, [categories, products]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      // Search match
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        cat.name.toLowerCase().includes(q) ||
        cat.slug.toLowerCase().includes(q) ||
        (cat.description && cat.description.toLowerCase().includes(q)) ||
        (cat.aliases && cat.aliases.some((a) => a.toLowerCase().includes(q)));

      if (!matchesSearch) return false;

      // Status Filter
      if (statusFilter === 'active') return cat.active !== false;
      if (statusFilter === 'disabled') return cat.active === false;
      if (statusFilter === 'featured') return cat.isFeatured === true;
      if (statusFilter === 'roots') return !cat.parentId;
      if (statusFilter === 'subcategories') return !!cat.parentId;

      return true;
    });
  }, [categories, searchQuery, statusFilter]);

  // Root categories for parent selection
  const rootCategories = useMemo(() => {
    return categories.filter((c) => !c.parentId);
  }, [categories]);

  const handleOpenCreateModal = () => {
    setEditingCategory({
      name: '',
      slug: '',
      image: '',
      description: '',
      displayOrder: categories.length + 1,
      isFeatured: true,
      active: true,
      parentId: null,
      aliases: []
    });
    setAliasesInput('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: CategoryItem) => {
    setEditingCategory({ ...cat });
    setAliasesInput(cat.aliases ? cat.aliases.join(', ') : '');
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name) return;

    // Process aliases from input
    const parsedAliases = aliasesInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const payload: Partial<CategoryItem> = {
      ...editingCategory,
      aliases: parsedAliases,
      slug: editingCategory.slug || editingCategory.name.toLowerCase().replace(/\s+/g, '-')
    };

    try {
      await AdminService.saveCategory(payload, actor);
      addToast(`Category "${payload.name}" saved successfully`, 'success');
      setIsModalOpen(false);
      setEditingCategory(null);
    } catch (err: any) {
      addToast(err.message || 'Failed to save category', 'warning');
      console.error(err);
    }
  };

  const handleDeleteClick = (cat: CategoryItem) => {
    setDeleteCandidate(cat);
  };

  const confirmDeleteCategory = async () => {
    if (!deleteCandidate) return;
    try {
      await AdminService.deleteCategory(deleteCandidate.id, actor);
      addToast(`Category "${deleteCandidate.name}" deleted`, 'success');
      setDeleteCandidate(null);
    } catch (err: any) {
      addToast(err.message || 'Failed to delete category', 'warning');
      console.error(err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingCategory) return;
    setUploadingImage(true);
    try {
      const url = await StorageService.uploadImage(file, `categories/${Date.now()}_${file.name}`);
      setEditingCategory({ ...editingCategory, image: url });
      addToast('Category image uploaded', 'success');
    } catch (err) {
      addToast('Image upload failed', 'warning');
    } finally {
      setUploadingImage(false);
    }
  };

  // Run reconciliation
  const handleRunReconciliation = async (dryRun: boolean) => {
    setReconciling(true);
    try {
      const res = await AdminService.reconcileCategories({ dryRun, actor });
      setReconciliationResult(res);
      if (!dryRun) {
        addToast(`Reconciliation complete: ${res.added.length} added, ${res.updated.length} updated`, 'success');
      }
    } catch (err: any) {
      addToast(err.message || 'Reconciliation failed', 'warning');
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-emerald-500" />
            Category Catalog Management
          </h1>
          <p className="text-xs text-slate-500">
            Authoritative master catalog with subcategories, alias resolution, product guards, and customer shop sync.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setReconciliationResult(null);
              setIsReconcileModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-xl border border-emerald-200 transition-all shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reconcile Catalog
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <FolderTree className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Total Categories</p>
            <p className="text-base font-bold text-slate-900">{categories.length}</p>
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Root Categories</p>
            <p className="text-base font-bold text-slate-900">{rootCategories.length}</p>
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Featured in Home</p>
            <p className="text-base font-bold text-slate-900">{categories.filter(c => c.isFeatured).length}</p>
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-500">Active in Store</p>
            <p className="text-base font-bold text-slate-900">{categories.filter(c => c.active !== false).length}</p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search categories by name, slug, or alias..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-medium">
          <span className="text-slate-400 flex items-center gap-1 text-[11px] mr-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {(['all', 'active', 'disabled', 'featured', 'roots', 'subcategories'] as const).map((filterKey) => (
            <button
              key={filterKey}
              onClick={() => setStatusFilter(filterKey)}
              className={`px-2.5 py-1 rounded-lg capitalize transition-all whitespace-nowrap text-[11px] ${
                statusFilter === filterKey
                  ? 'bg-slate-900 text-white font-semibold shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {filterKey}
            </button>
          ))}
        </div>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center col-span-full">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
            <p className="text-sm font-medium">Loading categories from database...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500 bg-red-50 rounded-xl col-span-full border border-red-200">
            <AlertCircle className="w-8 h-8 mx-auto mb-4" />
            <p className="font-semibold text-base">Failed to load categories.</p>
            <p className="text-sm mt-1 text-red-600 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => loadData()}
              className="mt-4 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition-all shadow-sm"
            >
              Retry Connection
            </button>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-slate-50 border border-slate-200 border-dashed rounded-xl col-span-full">
            <FolderTree className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-base font-semibold text-slate-900 mb-1">No Categories Match Filter</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchQuery ? `No categories match "${searchQuery}".` : 'Try clearing your filter or click Add Category.'}
            </p>
          </div>
        ) : (
          filteredCategories.map((cat) => {
            const attachedProds = categoryProductsMap.get(cat.id) || [];
            const parentCategory = cat.parentId ? categories.find((c) => c.id === cat.parentId) : null;

            return (
              <div
                key={cat.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5 hover:border-slate-300 transition-all shadow-sm flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Image & Details */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {cat.image ? (
                        <img
                          src={cat.image}
                          alt={cat.name}
                          className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {cat.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm leading-tight flex items-center gap-1.5">
                          {cat.name}
                        </h3>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">/{cat.slug}</p>
                        {parentCategory ? (
                          <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-medium border border-purple-100">
                            <span>Subcategory of:</span>
                            <span className="font-semibold">{parentCategory.name}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                            <span>Root Category</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleOpenEditModal(cat)}
                        title="Edit category"
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(cat)}
                        title="Delete category"
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {cat.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 mt-2 leading-relaxed">
                      {cat.description}
                    </p>
                  )}

                  {/* Aliases Chips */}
                  {cat.aliases && cat.aliases.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {cat.aliases.slice(0, 3).map((alias, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 text-slate-500 rounded text-[10px]"
                        >
                          alias: {alias}
                        </span>
                      ))}
                      {cat.aliases.length > 3 && (
                        <span className="text-[10px] text-slate-400 self-center">
                          +{cat.aliases.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer: Products count & Status Badges */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                        attachedProds.length > 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {attachedProds.length} Products
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Order: {cat.displayOrder}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {cat.isFeatured && (
                      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-semibold text-[9px]">
                        Featured
                      </span>
                    )}
                    {cat.active !== false ? (
                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold text-[9px]">
                        Active
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-semibold text-[9px]">
                        Disabled
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* SAFE DELETE GUARD MODAL */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-xl">
            {categoryProductsMap.get(deleteCandidate.id)?.length ? (
              // Blocked Deletion: Has attached products
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-rose-600">
                  <div className="p-2.5 bg-rose-50 rounded-xl">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Deletion Blocked</h3>
                    <p className="text-xs text-rose-600 font-medium">Protecting Catalog Integrity</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cannot delete category <strong className="text-slate-900">"{deleteCandidate.name}"</strong> because{' '}
                  <strong className="text-slate-900">{categoryProductsMap.get(deleteCandidate.id)?.length} product(s)</strong> are
                  currently assigned to it.
                </p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <p className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">Attached Products:</p>
                  <ul className="list-disc list-inside text-slate-600 text-xs space-y-0.5">
                    {categoryProductsMap.get(deleteCandidate.id)?.slice(0, 4).map((p) => (
                      <li key={p.id} className="truncate">{p.name}</li>
                    ))}
                  </ul>
                  {(categoryProductsMap.get(deleteCandidate.id)?.length || 0) > 4 && (
                    <p className="text-[10px] text-slate-400">
                      +{(categoryProductsMap.get(deleteCandidate.id)?.length || 0) - 4} more products
                    </p>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  To prevent orphaned products, please reassign or delete these products in the Products Catalog first.
                </p>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setDeleteCandidate(null)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
                  >
                    I Understand
                  </button>
                </div>
              </div>
            ) : (
              // Safe Deletion: 0 products attached
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-amber-600">
                  <div className="p-2.5 bg-amber-50 rounded-xl">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Delete Category?</h3>
                    <p className="text-xs text-slate-500">Safe Deletion Confirmed (0 Products Attached)</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to delete <strong className="text-slate-900">"{deleteCandidate.name}"</strong>? This will
                  remove it from customer category filters.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setDeleteCandidate(null)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteCategory}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs rounded-xl font-semibold shadow-sm"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE / EDIT CATEGORY MODAL */}
      {isModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-emerald-600" />
                {editingCategory.id ? 'Edit Category' : 'Create New Category'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3.5 text-xs">
              {/* Category Name */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={editingCategory.name || ''}
                  onChange={(e) => {
                    const name = e.target.value;
                    setEditingCategory({
                      ...editingCategory,
                      name,
                      slug: editingCategory.id ? editingCategory.slug : name.toLowerCase().replace(/\s+/g, '-')
                    });
                  }}
                  placeholder="e.g. Microbial Inoculants"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">URL Slug *</label>
                <input
                  type="text"
                  required
                  value={editingCategory.slug || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value })}
                  placeholder="e.g. microbial-inoculants"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              {/* Parent Category (Hierarchy) */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">Parent Category (Optional Subcategory)</label>
                <select
                  value={editingCategory.parentId || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, parentId: e.target.value || null })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white"
                >
                  <option value="">None (Top-Level Root Category)</option>
                  {rootCategories
                    .filter((c) => c.id !== editingCategory.id)
                    .map((root) => (
                      <option key={root.id} value={root.id}>
                        {root.name}
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Assigning a parent groups this category as a specialized segment under the main catalog.
                </p>
              </div>

              {/* Aliases */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">Aliases & Historical Names (Comma-separated)</label>
                <input
                  type="text"
                  value={aliasesInput}
                  onChange={(e) => setAliasesInput(e.target.value)}
                  placeholder="e.g. Plant Boosters, Seed Treatment, Bio-Stimulants"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Shop and search filters will resolve products matching any of these aliases automatically.
                </p>
              </div>

              {/* Image URL & Upload */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">Category Image URL or Upload</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingCategory.image || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, image: e.target.value })}
                    placeholder="/assets/products/... or https://..."
                    className="flex-grow p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-[11px] focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                  <label className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer flex items-center gap-1.5 font-medium text-xs shadow-sm transition-all flex-shrink-0">
                    {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>Upload</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingCategory.description || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  placeholder="Short overview shown in Customer Discovery cards..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              {/* Display Order */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">Display Order</label>
                <input
                  type="number"
                  value={editingCategory.displayOrder || 0}
                  onChange={(e) => setEditingCategory({ ...editingCategory, displayOrder: parseInt(e.target.value) || 0 })}
                  className="w-28 p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              {/* Checkboxes: Featured & Active */}
              <div className="flex items-center gap-6 py-2 border-t border-slate-100">
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingCategory.isFeatured ?? true}
                    onChange={(e) => setEditingCategory({ ...editingCategory, isFeatured: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="font-medium">Featured on Homepage</span>
                </label>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingCategory.active !== false}
                    onChange={(e) => setEditingCategory({ ...editingCategory, active: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="font-medium">Active in Store</span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-sm transition-all"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECONCILIATION MODAL */}
      {isReconcileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-600" />
                Category Catalog Reconciliation Engine
              </h2>
              <button onClick={() => setIsReconcileModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This non-destructive tool audits your Firestore categories against the authoritative 10-category master catalog.
              It verifies product counts, restores missing canonical categories, and preserves all existing custom categories and user edits.
            </p>

            <div className="flex gap-2">
              <button
                disabled={reconciling}
                onClick={() => handleRunReconciliation(true)}
                className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1.5"
              >
                {reconciling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                Run Dry-Run (Preview)
              </button>
              <button
                disabled={reconciling}
                onClick={() => handleRunReconciliation(false)}
                className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                {reconciling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Execute Reconciliation
              </button>
            </div>

            {/* Reconciliation Results Display */}
            {reconciliationResult && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p className="text-[10px] text-emerald-600 font-semibold uppercase">Added</p>
                    <p className="text-base font-bold text-emerald-800">{reconciliationResult.added.length}</p>
                  </div>
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-[10px] text-blue-600 font-semibold uppercase">Updated</p>
                    <p className="text-base font-bold text-blue-800">{reconciliationResult.updated.length}</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">Preserved</p>
                    <p className="text-base font-bold text-slate-800">{reconciliationResult.preserved.length}</p>
                  </div>
                </div>

                <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] max-h-48 overflow-y-auto space-y-1">
                  <p className="text-slate-400 font-bold border-b border-slate-800 pb-1 mb-1">Audit Log Output:</p>
                  {reconciliationResult.logs.map((log, idx) => (
                    <p key={idx} className="leading-tight">{log}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
