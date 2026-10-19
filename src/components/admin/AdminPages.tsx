import React, { useState, useEffect } from 'react';
import { 
  FileText, Layout, Store, HelpCircle, Shield, Edit3, 
  Save, ChevronRight, Loader2, CheckCircle2, AlertCircle,
  Plus, Search, Copy, Trash2, Eye, EyeOff, ExternalLink,
  Globe, Palette, Sliders, Sparkles, Check, X, Filter, RefreshCw
} from 'lucide-react';
import { CMSPage, GlobalAppearance } from '../../types/cms';
import { INITIAL_CMS_PAGES } from '../../data/initialCMSPages';
import { AdminService } from '../../services/AdminService';
import { VisualPageEditor } from './VisualPageEditor';
import { useApp } from '../../context/AppContext';

const DEFAULT_GLOBAL_APPEARANCE: GlobalAppearance = {
  header: {
    announcementRibbonEnabled: true,
    announcementText: '✨ FREE EXPRESS DISPATCH ON ALL ORGANIC COMMODITIES OVER ₹999 across India',
    announcementLink: '#shop',
    sticky: true,
    showSearch: true,
    showWishlist: true,
  },
  footer: {
    brandDescription: "BioCart is India's premier certified regenerative marketplace connecting organic cultivators, agronomists, and urban growers with lab-verified inputs.",
    phone: '+91 (0) 80 4567 8900',
    email: 'dispatch@biocart.ag',
    address: 'Plot 42, Green Agro Hub, Sector 18, Bangalore, KA - 560001',
    socialLinks: {
      instagram: 'https://instagram.com/biocart',
      facebook: 'https://facebook.com/biocart',
      youtube: 'https://youtube.com/biocart',
      twitter: 'https://twitter.com/biocart',
      linkedin: 'https://linkedin.com/company/biocart'
    },
    copyrightText: '© 2026 BioCart Agriculture Technologies Pvt Ltd. All rights reserved. Registered under APEDA & NPOP Guidelines.'
  },
  typography: {
    fontFamily: 'Plus Jakarta Sans',
    headingFont: 'Playfair Display'
  },
  colors: {
    primary: '#059669',
    secondary: '#10B981',
    accent: '#F59E0B',
    background: '#F8FAFC'
  }
};

export const AdminPages: React.FC = () => {
  const { addToast } = useApp();
  const [pages, setPages] = useState<CMSPage[]>(INITIAL_CMS_PAGES);
  const [editingPage, setEditingPage] = useState<CMSPage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'published' | 'draft'>('All');
  const [isLoading, setIsLoading] = useState(false);

  // Appearance Modal
  const [isAppearanceModalOpen, setIsAppearanceModalOpen] = useState(false);
  const [appearance, setAppearance] = useState<GlobalAppearance>(DEFAULT_GLOBAL_APPEARANCE);
  const [isSavingAppearance, setIsSavingAppearance] = useState(false);

  // New Page Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newCategory, setNewCategory] = useState<'Navigation' | 'Support' | 'Legal' | 'Custom'>('Custom');
  const [newTemplate, setNewTemplate] = useState<'standard' | 'homepage' | 'category' | 'legal' | 'custom'>('standard');

  useEffect(() => {
    setIsLoading(true);
    // 1. Subscribe to Firestore CMS pages
    const unsubPages = AdminService.subscribeToPages((firestorePages) => {
      // Filter out legacy shop category records from Firestore so they never pollute CMS pages
      const validFirestorePages = firestorePages.filter((fp) => {
        const id = fp.id || '';
        const slug = fp.slug || '';
        const isShopCat = fp.category === 'Shop' || 
          id.startsWith('cat-') || 
          ['organic-fertilizers', 'coir-potting-mix', 'plant-care-solutions', 'organic-seeds', 'gardening-gear', 'healthy-living', 'potting-mix', 'plant-care', 'seeds'].includes(slug);
        return !isShopCat;
      });

      // Merge initial pages with Firestore stored pages
      const merged: CMSPage[] = INITIAL_CMS_PAGES.map((initial) => {
        const found = validFirestorePages.find((fp) => fp.id === initial.id || fp.slug === initial.slug);
        return found ? { ...initial, ...found } : initial;
      });

      // Add any custom-created pages that don't exist in INITIAL_CMS_PAGES
      validFirestorePages.forEach((fp) => {
        if (!merged.some((m) => m.id === fp.id)) {
          merged.push(fp as CMSPage);
        }
      });

      setPages(merged);
      setIsLoading(false);
    });

    // 2. Subscribe to Global Appearance
    const unsubAppearance = AdminService.subscribeToGlobalAppearance((data) => {
      if (data) {
        setAppearance({ ...DEFAULT_GLOBAL_APPEARANCE, ...data });
      }
    });

    return () => {
      unsubPages();
      unsubAppearance();
    };
  }, []);

  const handleOpenEditor = (page: CMSPage) => {
    setEditingPage(page);
  };

  const handlePageUpdated = (updatedPage: CMSPage) => {
    setPages((prev) => prev.map((p) => (p.id === updatedPage.id ? updatedPage : p)));
    setEditingPage(updatedPage);
  };

  const handleTogglePublish = async (page: CMSPage, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (page.status === 'published') {
        await AdminService.unpublishPageCMS(page.id);
        setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, status: 'draft' } : p)));
        addToast(`"${page.title}" changed to Draft mode`, 'info');
      } else {
        await AdminService.publishPageCMS(page.id, page);
        setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, status: 'published' } : p)));
        addToast(`"${page.title}" is now Published live!`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Failed to update page status', 'error');
    }
  };

  const handleDuplicatePage = async (page: CMSPage, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const copyId = `${page.id}-copy-${Date.now().toString().slice(-4)}`;
      const copySlug = `${page.slug}-copy`;
      const duplicated: CMSPage = {
        ...page,
        id: copyId,
        slug: copySlug,
        title: `${page.title} (Copy)`,
        status: 'draft',
        hasDraft: true,
        category: 'Custom',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: undefined,
        sections: page.sections.map((s) => ({
          ...s,
          id: `${s.id}-copy-${Math.random().toString(36).substr(2, 4)}`
        }))
      };

      await AdminService.savePageCMS(copyId, duplicated);
      setPages((prev) => [duplicated, ...prev]);
      addToast(`Duplicated "${page.title}" as Draft copy`, 'success');
    } catch (err: any) {
      console.error(err);
      addToast('Failed to duplicate page', 'error');
    }
  };

  const handleDeletePage = async (page: CMSPage, e: React.MouseEvent) => {
    e.stopPropagation();
    if (page.id === 'home' || page.id === 'shop-catalog') {
      addToast('System root pages cannot be deleted.', 'error');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${page.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await AdminService.deletePageCMS(page.id);
      setPages((prev) => prev.filter((p) => p.id !== page.id));
      addToast(`Deleted page "${page.title}"`, 'info');
    } catch (err: any) {
      console.error(err);
      addToast('Failed to delete page', 'error');
    }
  };

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSlug.trim()) {
      addToast('Please provide both page title and slug.', 'error');
      return;
    }

    const cleanSlug = newSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const pageId = `page-${cleanSlug}`;

    const newPage: CMSPage = {
      id: pageId,
      slug: cleanSlug,
      title: newTitle.trim(),
      category: newCategory,
      template: newTemplate,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sections: [
        {
          id: `hero-${Date.now()}`,
          type: 'hero',
          title: 'Hero Banner',
          enabled: true,
          order: 1,
          data: {
            titleLine1: newTitle.trim(),
            subtitle: 'Welcome to this custom page.',
            primaryButtonText: 'Explore Now',
            imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1600&q=80'
          }
        },
        {
          id: `rich-${Date.now()}`,
          type: 'rich_text',
          title: 'Main Content',
          enabled: true,
          order: 2,
          data: {
            heading: 'About This Section',
            body: '<p>Start authoring your rich page content here using the WordPress visual section editor.</p>'
          }
        }
      ]
    };

    try {
      await AdminService.savePageCMS(pageId, newPage);
      setPages((prev) => [newPage, ...prev]);
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewSlug('');
      addToast(`Created new page "${newPage.title}"`, 'success');
      setEditingPage(newPage);
    } catch (err: any) {
      console.error(err);
      addToast('Failed to create page', 'error');
    }
  };

  const handleSaveAppearance = async () => {
    setIsSavingAppearance(true);
    try {
      await AdminService.saveGlobalAppearance(appearance);
      addToast('Global Appearance saved & live on storefront!', 'success');
      setIsAppearanceModalOpen(false);
    } catch (err: any) {
      console.error(err);
      addToast('Failed to save appearance settings', 'error');
    } finally {
      setIsSavingAppearance(false);
    }
  };

  // Filtering
  const filteredPages = pages.filter((p) => {
    const matchesSearch = 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // If a page is being edited in the visual editor
  if (editingPage) {
    return (
      <VisualPageEditor
        page={editingPage}
        onBack={() => setEditingPage(null)}
        onPageUpdated={handlePageUpdated}
      />
    );
  }

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'Navigation': return Layout;
      case 'Shop': return Store;
      case 'Support': return HelpCircle;
      case 'Legal': return Shield;
      default: return FileText;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
              WordPress-Style Page CMS
            </span>
            <span className="text-xs text-slate-400 font-medium">
              • 17 Canonical Store Pages + Custom Pages
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Page Management & Visual Builder
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Build, reorder sections, edit media, save drafts, and publish changes in real-time across the BioCart customer storefront.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setIsAppearanceModalOpen(true)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-all flex items-center gap-2"
          >
            <Palette className="w-4 h-4 text-emerald-600" />
            Global Appearance
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-900/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Page
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search pages by title, slug, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            {['All', 'Navigation', 'Support', 'Legal', 'Custom'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  categoryFilter === cat
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            {(['All', 'published', 'draft'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md capitalize font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pages Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-6">Page Title</th>
                <th className="py-3.5 px-4">URL / Slug</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Sections</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Last Modified</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No pages found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try clearing your search query or filters.</p>
                  </td>
                </tr>
              ) : (
                filteredPages.map((page) => {
                  const CategoryIcon = getCategoryIcon(page.category);
                  const isPublished = page.status === 'published';
                  const activeSectionCount = page.sections?.filter((s) => s.enabled)?.length || 0;
                  const totalSectionCount = page.sections?.length || 0;

                  return (
                    <tr
                      key={page.id}
                      onClick={() => handleOpenEditor(page)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Title */}
                      <td className="py-4 px-6">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors mt-0.5">
                            <CategoryIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                                {page.title}
                              </span>
                              {page.hasDraft && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                  Unpublished Draft
                                </span>
                              )}
                            </div>
                            {page.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 max-w-xs md:max-w-md">
                                {page.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* URL / Slug */}
                      <td className="py-4 px-4 font-mono text-[11px] text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span>/#{page.slug}</span>
                          <a
                            href={`#${page.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="Preview on live site"
                            className="text-slate-400 hover:text-emerald-600 transition-colors p-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {page.category || 'Standard'}
                        </span>
                      </td>

                      {/* Sections */}
                      <td className="py-4 px-4 text-slate-600 font-medium">
                        <span>{activeSectionCount}</span>
                        <span className="text-slate-400 text-[10px]"> / {totalSectionCount} sections</span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <button
                          onClick={(e) => handleTogglePublish(page, e)}
                          title="Click to toggle publish status"
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 border transition-all ${
                            isPublished
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isPublished ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          {isPublished ? 'Published' : 'Draft'}
                        </button>
                      </td>

                      {/* Last Modified */}
                      <td className="py-4 px-4 text-[11px] text-slate-500">
                        {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : 'Initial'}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditor(page)}
                            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Open Visual Editor"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={(e) => handleDuplicatePage(page, e)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Duplicate Page"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          <a
                            href={`#${page.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Live Storefront Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </a>

                          {page.id !== 'home' && page.id !== 'shop-catalog' && (
                            <button
                              onClick={(e) => handleDeletePage(page, e)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Page"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create New Page Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900">Add New Page</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePage} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Page Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Regenerative Farming Guide"
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    if (!newSlug) {
                      setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                    }
                  }}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Page URL Slug *</label>
                <div className="flex items-center">
                  <span className="px-3 py-2.5 bg-slate-100 text-slate-500 text-xs border border-r-0 border-slate-200 rounded-l-lg font-mono">
                    /#
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="farming-guide"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-r-lg font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:border-emerald-500 focus:outline-none bg-white"
                >
                  <option value="Navigation">Navigation</option>
                  <option value="Shop">Shop</option>
                  <option value="Support">Support</option>
                  <option value="Legal">Legal</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" />
                  Create & Open Editor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Appearance Settings Modal */}
      {isAppearanceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-slate-900">Global Storefront Appearance</h3>
                  <p className="text-[11px] text-slate-500">Configure global Header ribbon, Footer copy, contact coordinates, and brand colors.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAppearanceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 mt-6">
              {/* Header / Announcement Ribbon */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Top Announcement Ribbon</h4>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appearance.header.announcementRibbonEnabled}
                      onChange={(e) =>
                        setAppearance((prev) => ({
                          ...prev,
                          header: { ...prev.header, announcementRibbonEnabled: e.target.checked }
                        }))
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    Enable Ribbon
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ribbon Text</label>
                  <input
                    type="text"
                    value={appearance.header.announcementText}
                    onChange={(e) =>
                      setAppearance((prev) => ({
                        ...prev,
                        header: { ...prev.header, announcementText: e.target.value }
                      }))
                    }
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ribbon Link</label>
                  <input
                    type="text"
                    value={appearance.header.announcementLink}
                    onChange={(e) =>
                      setAppearance((prev) => ({
                        ...prev,
                        header: { ...prev.header, announcementLink: e.target.value }
                      }))
                    }
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Footer Information */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Footer Branding & Information</h4>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Brand Description</label>
                  <textarea
                    rows={2}
                    value={appearance.footer.brandDescription}
                    onChange={(e) =>
                      setAppearance((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, brandDescription: e.target.value }
                      }))
                    }
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Support Phone</label>
                    <input
                      type="text"
                      value={appearance.footer.phone}
                      onChange={(e) =>
                        setAppearance((prev) => ({
                          ...prev,
                          footer: { ...prev.footer, phone: e.target.value }
                        }))
                      }
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Support Email</label>
                    <input
                      type="email"
                      value={appearance.footer.email}
                      onChange={(e) =>
                        setAppearance((prev) => ({
                          ...prev,
                          footer: { ...prev.footer, email: e.target.value }
                        }))
                      }
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Registered Agro Hub Address</label>
                  <input
                    type="text"
                    value={appearance.footer.address}
                    onChange={(e) =>
                      setAppearance((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, address: e.target.value }
                      }))
                    }
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Copyright Statement</label>
                  <input
                    type="text"
                    value={appearance.footer.copyrightText}
                    onChange={(e) =>
                      setAppearance((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, copyrightText: e.target.value }
                      }))
                    }
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              {/* Social Channels */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Social Media URL Coordinates</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Instagram URL</label>
                    <input
                      type="url"
                      value={appearance.footer.socialLinks.instagram || ''}
                      onChange={(e) =>
                        setAppearance((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            socialLinks: { ...prev.footer.socialLinks, instagram: e.target.value }
                          }
                        }))
                      }
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">YouTube URL</label>
                    <input
                      type="url"
                      value={appearance.footer.socialLinks.youtube || ''}
                      onChange={(e) =>
                        setAppearance((prev) => ({
                          ...prev,
                          footer: {
                            ...prev.footer,
                            socialLinks: { ...prev.footer.socialLinks, youtube: e.target.value }
                          }
                        }))
                      }
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
              <button
                type="button"
                onClick={() => setIsAppearanceModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAppearance}
                disabled={isSavingAppearance}
                className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 shadow disabled:opacity-50"
              >
                {isSavingAppearance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save & Apply Live
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPages;
