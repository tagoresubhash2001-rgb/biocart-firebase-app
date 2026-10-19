import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Plus, Search, Edit3, Trash2, Eye, EyeOff, 
  ArrowUp, ArrowDown, Image as ImageIcon, Save, Check, X,
  Calendar, Clock, User, Tag, HelpCircle, ShoppingBag, 
  Quote, ExternalLink, Link2, AlertCircle, RefreshCw, FileText
} from 'lucide-react';
import { AdminService } from '../../services/AdminService';
import { StorageService } from '../../services/StorageService';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../context/AppContext';
import { BlogPost, BlogBlock, BlogBlockType, BlogStatus } from '../../types/blog';
import { INITIAL_BLOG_POSTS } from '../../data/initialBlogs';

export const AdminBlogs: React.FC = () => {
  const { userProfile } = useAuth();
  const { addToast, setTab } = useApp();

  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | BlogStatus>('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modal / Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'seo' | 'preview'>('content');
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = AdminService.subscribeToBlogs((remoteList) => {
      if (Array.isArray(remoteList)) {
        setBlogs(remoteList);
      } else {
        setBlogs([]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const actor = {
    id: userProfile?.uid || 'admin',
    email: userProfile?.email || 'admin@biocart.com'
  };

  const handleOpenCreateModal = () => {
    const newId = `blog-${Date.now()}`;
    setEditingBlog({
      id: newId,
      title: '',
      slug: '',
      excerpt: '',
      coverImage: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80',
      coverImageAlt: 'BioCart Indian Organic Gardening Guide',
      category: 'Biofertilizers & Composting',
      tags: ['Organic Farming', 'Garden Care'],
      status: 'draft',
      readTimeMinutes: 5,
      featured: false,
      author: {
        id: userProfile?.uid || 'admin',
        name: userProfile?.name || 'BioCart Editorial Team',
        role: 'Agricultural Specialist',
        bio: 'Agronomist and organic soil consultant at BioCart India.',
        avatar: userProfile?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
      },
      seo: {
        title: '',
        metaDescription: '',
        targetKeyword: '',
        secondaryKeywords: [],
        noIndex: false
      },
      blocks: [
        {
          id: `blk-${Date.now()}-1`,
          type: 'heading',
          order: 1,
          data: { level: 2, text: 'Introduction & Key Principles' }
        },
        {
          id: `blk-${Date.now()}-2`,
          type: 'paragraph',
          order: 2,
          data: { text: 'Write the comprehensive guide content here with agronomic details...' }
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setActiveTab('content');
    setIsEditorOpen(true);
  };

  const handleOpenEditModal = (blog: BlogPost) => {
    setEditingBlog(JSON.parse(JSON.stringify(blog)));
    setActiveTab('content');
    setIsEditorOpen(true);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingBlog) return;
    setUploadingCover(true);
    try {
      const downloadUrl = await StorageService.uploadImage(file, 'blogs/covers');
      setEditingBlog({
        ...editingBlog,
        coverImage: downloadUrl
      });
      addToast('Cover image uploaded successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      addToast('Failed to upload cover image', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  // Block management
  const handleAddBlock = (type: BlogBlockType) => {
    if (!editingBlog) return;
    const nextOrder = (editingBlog.blocks.length > 0 ? Math.max(...editingBlog.blocks.map(b => b.order)) : 0) + 1;
    let initialData: Record<string, any> = {};

    switch (type) {
      case 'heading':
        initialData = { level: 2, text: 'New Section Heading' };
        break;
      case 'paragraph':
        initialData = { text: 'Add informative paragraphs with organic farming recommendations.' };
        break;
      case 'list':
        initialData = { style: 'unordered', items: ['Point 1', 'Point 2', 'Point 3'] };
        break;
      case 'callout':
        initialData = { variant: 'tip', title: 'Agronomist Tip', text: 'Important soil or watering tip here.' };
        break;
      case 'quote':
        initialData = { text: 'Pure compost feeds the microbes that feed your plants.', author: 'BioCart Soil Research' };
        break;
      case 'product_card':
        initialData = {
          productId: 'prod_vermicompost_premium',
          productName: 'BioCart Premium Vermicompost',
          price: '₹299',
          url: '/product-details?product=prod_vermicompost_premium',
          buttonText: 'Order Certified Compost',
          description: '100% natural, lab-tested earthworm castings with high humic content.'
        };
        break;
      case 'table':
        initialData = {
          headers: ['Plant Type', 'Pot Size', 'Application Quantity', 'Frequency'],
          rows: [
            ['Flowering Plants', '10 inch', '100 - 150g', 'Every 20 days'],
            ['Vegetables', '12 inch', '200g', 'Every 15 days']
          ]
        };
        break;
      case 'faq':
        initialData = {
          items: [
            { question: 'How often should I apply this fertilizer?', answer: 'For optimal results, apply once every 2 to 3 weeks during active growth.' }
          ]
        };
        break;
      case 'cta':
        initialData = {
          heading: 'Enhance Your Garden Yield Naturally',
          subheading: 'Order organic gardening supplies directly from BioCart India.',
          buttonText: 'Shop BioCart Supplies',
          buttonLink: '/shop'
        };
        break;
      case 'affiliate_link':
        initialData = {
          title: 'Official Soil Testing Kit',
          linkText: 'Check Agricultural Testing Lab',
          url: 'https://biocart.in/soil-consultation',
          disclosure: 'Official BioCart Service Partner'
        };
        break;
      case 'image':
        initialData = {
          url: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&q=80',
          altText: 'Organic compost mixture preparation',
          caption: 'Properly mixed soil aeration components.'
        };
        break;
      default:
        initialData = { text: '' };
    }

    const newBlock: BlogBlock = {
      id: `blk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      order: nextOrder,
      data: initialData
    };

    setEditingBlog({
      ...editingBlog,
      blocks: [...editingBlog.blocks, newBlock]
    });
  };

  const handleUpdateBlockData = (blockId: string, updatedData: Record<string, any>) => {
    if (!editingBlog) return;
    setEditingBlog({
      ...editingBlog,
      blocks: editingBlog.blocks.map(b => b.id === blockId ? { ...b, data: { ...b.data, ...updatedData } } : b)
    });
  };

  const handleRemoveBlock = (blockId: string) => {
    if (!editingBlog) return;
    setEditingBlog({
      ...editingBlog,
      blocks: editingBlog.blocks.filter(b => b.id !== blockId)
    });
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    if (!editingBlog) return;
    const blocks = [...editingBlog.blocks];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;

    const temp = blocks[index];
    blocks[index] = blocks[targetIdx];
    blocks[targetIdx] = temp;

    // re-index order
    blocks.forEach((b, idx) => { b.order = idx + 1; });

    setEditingBlog({
      ...editingBlog,
      blocks
    });
  };

  const handleSaveBlog = async (statusOverride?: BlogStatus) => {
    if (!editingBlog) return;
    if (!editingBlog.title.trim()) {
      addToast('Article title is mandatory', 'warning');
      return;
    }

    // Auto-generate slug if empty
    let cleanSlug = editingBlog.slug?.trim()
      ? editingBlog.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      : editingBlog.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const finalStatus = statusOverride || editingBlog.status;
    const publishedAt = finalStatus === 'published' 
      ? (editingBlog.publishedAt || new Date().toISOString())
      : undefined;

    const payload: BlogPost = {
      ...editingBlog,
      slug: cleanSlug,
      status: finalStatus,
      publishedAt,
      updatedAt: new Date().toISOString(),
      seo: {
        ...editingBlog.seo,
        title: editingBlog.seo?.title || `${editingBlog.title} | BioCart`,
        metaDescription: editingBlog.seo?.metaDescription || editingBlog.excerpt || editingBlog.title
      }
    };

    setIsSaving(true);
    try {
      await AdminService.saveBlog(payload, actor);
      addToast(`Blog successfully saved as [${finalStatus.toUpperCase()}]!`, 'success');
      setIsEditorOpen(false);
    } catch (err: any) {
      console.error(err);
      addToast(`Save failed: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBlog = async (blogId: string) => {
    try {
      await AdminService.deleteBlog(blogId, actor);
      addToast('Blog post deleted successfully', 'info');
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error(err);
      addToast('Failed to delete blog post', 'error');
    }
  };

  // Filtered listing
  const filteredBlogs = blogs.filter(b => {
    const matchStatus = statusFilter === 'All' || b.status === statusFilter;
    const matchCat = categoryFilter === 'All' || b.category === categoryFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchQ = !q || b.title.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q);
    return matchStatus && matchCat && matchQ;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-serif text-slate-900">Blog Publishing CMS & Dynamic SEO</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider">
              Unlimited Sections
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Publish structured agronomy guides, vermicomposting advice, and organic farming articles with custom URLs, metadata, and product links.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={async () => {
              if (window.confirm('Import seed agronomy articles into your Firestore blog collection?')) {
                try {
                  for (const seed of INITIAL_BLOG_POSTS) {
                    await AdminService.saveBlog(seed, actor);
                  }
                  addToast('Successfully imported 3 canonical blog articles into Firestore!', 'success');
                } catch (err: any) {
                  console.error(err);
                  addToast(err.message || 'Failed to import seed articles', 'error');
                }
              }
            }}
            className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer"
            title="Explicitly import seed articles into Firestore"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Seed Articles</span>
          </button>
          <button
            onClick={() => {
              setTab('blogs');
            }}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Eye className="w-4 h-4 text-slate-600" />
            <span>View Public Blog</span>
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-950/10 hover:scale-105 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Blog Article</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-grow">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search blogs by title or URL slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
        >
          <option value="All">All Statuses ({blogs.length})</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Blogs Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-4">Article</th>
                <th className="p-4">Category</th>
                <th className="p-4">Author</th>
                <th className="p-4">Status</th>
                <th className="p-4">Blocks</th>
                <th className="p-4">Published Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
                    <span>Loading blog database...</span>
                  </td>
                </tr>
              ) : filteredBlogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-800">No blog articles found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click "New Blog Article" to create your first article.</p>
                  </td>
                </tr>
              ) : (
                filteredBlogs.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={b.coverImage}
                          alt={b.title}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                        />
                        <div>
                          <h4 className="font-bold text-slate-900 line-clamp-1">{b.title}</h4>
                          <span className="text-[11px] text-slate-400 font-mono">/blogs/{b.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold">
                        {b.category}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-800">
                      {b.author?.name || 'BioCart Team'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        b.status === 'published' ? 'bg-emerald-100 text-emerald-800' :
                        b.status === 'draft' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-semibold text-slate-600">
                      {b.blocks?.length || 0} sections
                    </td>
                    <td className="p-4 text-slate-500">
                      {b.publishedAt 
                        ? new Date(b.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Unpublished'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {b.status === 'published' && (
                          <button
                            onClick={() => setTab('blogs', { blogSlug: b.slug })}
                            className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg"
                            title="View Public Post"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEditModal(b)}
                          className="p-1.5 hover:bg-emerald-100 text-emerald-700 rounded-lg"
                          title="Edit Blog"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(b.id)}
                          className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg"
                          title="Delete Blog"
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Delete Blog Article?</h3>
            <p className="text-xs text-slate-500">This action will remove the article and its SEO configuration permanently from Firestore.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteBlog(deleteConfirmId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Delete Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Master Blog Editor Modal (Unlimited Blocks + Full SEO) */}
      {isEditorOpen && editingBlog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {editingBlog.title ? editingBlog.title : 'New Blog Publication'}
                  </h2>
                  <span className="text-[11px] text-slate-400 font-mono">
                    /blogs/{editingBlog.slug || 'clean-slug'}
                  </span>
                </div>
              </div>

              {/* Tab Selector */}
              <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-2xl text-xs font-bold">
                <button
                  onClick={() => setActiveTab('content')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === 'content' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Content Blocks ({editingBlog.blocks.length})
                </button>
                <button
                  onClick={() => setActiveTab('seo')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === 'seo' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  SEO & Meta
                </button>
              </div>

              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              {activeTab === 'content' ? (
                <>
                  {/* Top Metadata Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Article Title *</label>
                      <input
                        type="text"
                        required
                        value={editingBlog.title}
                        onChange={(e) => setEditingBlog({ ...editingBlog, title: e.target.value })}
                        placeholder="e.g. Complete Vermicompost Guide for Indian Balconies"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-serif text-sm font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">URL Slug *</label>
                      <input
                        type="text"
                        value={editingBlog.slug}
                        onChange={(e) => setEditingBlog({ ...editingBlog, slug: e.target.value })}
                        placeholder="e.g. vermicompost-guide-india"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Category</label>
                      <input
                        type="text"
                        value={editingBlog.category}
                        onChange={(e) => setEditingBlog({ ...editingBlog, category: e.target.value })}
                        placeholder="e.g. Biofertilizers & Composting"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Tags (comma-separated)</label>
                      <input
                        type="text"
                        value={editingBlog.tags.join(', ')}
                        onChange={(e) => setEditingBlog({
                          ...editingBlog,
                          tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        })}
                        placeholder="e.g. Vermicompost, Organic, Soil Health"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-slate-700 font-bold mb-1">Excerpt / Summary *</label>
                      <textarea
                        rows={2}
                        value={editingBlog.excerpt}
                        onChange={(e) => setEditingBlog({ ...editingBlog, excerpt: e.target.value })}
                        placeholder="A concise summary highlighting key gardening insights for readers and search snippets."
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 leading-relaxed"
                      />
                    </div>

                    {/* Cover Image Upload & URL */}
                    <div className="md:col-span-2 flex flex-col sm:flex-row items-center gap-4 pt-2 border-t border-slate-200">
                      <img
                        src={editingBlog.coverImage}
                        alt="Cover preview"
                        className="w-24 h-20 rounded-xl object-cover border border-slate-300"
                      />
                      <div className="flex-grow space-y-1 w-full">
                        <label className="block text-slate-700 font-bold">Featured Cover Image URL</label>
                        <input
                          type="text"
                          value={editingBlog.coverImage}
                          onChange={(e) => setEditingBlog({ ...editingBlog, coverImage: e.target.value })}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                      <label className="px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 rounded-xl font-bold cursor-pointer whitespace-nowrap self-end">
                        {uploadingCover ? 'Uploading...' : 'Upload Image'}
                        <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* Add Content Block Action Ribbon */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <span>Structured Content Blocks</span>
                      </h3>
                      <span className="text-[11px] text-slate-400">Add unlimited sections in any order</span>
                    </div>

                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => handleAddBlock('heading')}
                        className="px-3 py-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm transition-all"
                      >
                        + Heading
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddBlock('paragraph')}
                        className="px-3 py-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm transition-all"
                      >
                        + Paragraph
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddBlock('list')}
                        className="px-3 py-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm transition-all"
                      >
                        + Bullet List
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddBlock('callout')}
                        className="px-3 py-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm transition-all"
                      >
                        + Tip Box
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddBlock('quote')}
                        className="px-3 py-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm transition-all"
                      >
                        + Quote
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddBlock('product_card')}
                        className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold rounded-xl border border-emerald-300 shadow-sm transition-all"
                      >
                        + BioCart Product
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddBlock('table')}
                        className="px-3 py-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm transition-all"
                      >
                        + Data Table
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddBlock('faq')}
                        className="px-3 py-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm transition-all"
                      >
                        + FAQ Accordion
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddBlock('cta')}
                        className="px-3 py-1.5 bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                      >
                        + Banner CTA
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddBlock('affiliate_link')}
                        className="px-3 py-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm transition-all"
                      >
                        + Partner Link
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddBlock('image')}
                        className="px-3 py-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-sm transition-all"
                      >
                        + Image Block
                      </button>
                    </div>
                  </div>

                  {/* Rendered Block Editors List */}
                  <div className="space-y-4">
                    {editingBlog.blocks.map((block, idx) => (
                      <div
                        key={block.id}
                        className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3 relative group"
                      >
                        {/* Block Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                          <span className="font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                            Section {idx + 1}: {block.type}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveBlock(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 hover:bg-slate-100 text-slate-500 rounded disabled:opacity-30"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveBlock(idx, 'down')}
                              disabled={idx === editingBlog.blocks.length - 1}
                              className="p-1 hover:bg-slate-100 text-slate-500 rounded disabled:opacity-30"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveBlock(block.id)}
                              className="p-1 hover:bg-rose-100 text-rose-600 rounded ml-2"
                              title="Delete Block"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Specific Block Input Controls */}
                        {block.type === 'heading' && (
                          <div className="grid grid-cols-4 gap-2">
                            <select
                              value={block.data.level || 2}
                              onChange={(e) => handleUpdateBlockData(block.id, { level: Number(e.target.value) })}
                              className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                            >
                              <option value={2}>Heading H2</option>
                              <option value={3}>Heading H3</option>
                            </select>
                            <input
                              type="text"
                              value={block.data.text || ''}
                              onChange={(e) => handleUpdateBlockData(block.id, { text: e.target.value })}
                              placeholder="Section heading text..."
                              className="col-span-3 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                            />
                          </div>
                        )}

                        {block.type === 'paragraph' && (
                          <textarea
                            rows={3}
                            value={block.data.text || ''}
                            onChange={(e) => handleUpdateBlockData(block.id, { text: e.target.value })}
                            placeholder="Detailed paragraph content..."
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed"
                          />
                        )}

                        {block.type === 'product_card' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <input
                              type="text"
                              value={block.data.productName || ''}
                              onChange={(e) => handleUpdateBlockData(block.id, { productName: e.target.value })}
                              placeholder="Product Title (e.g. BioCart Double-Screened Vermicompost)"
                              className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                            />
                            <input
                              type="text"
                              value={block.data.price || ''}
                              onChange={(e) => handleUpdateBlockData(block.id, { price: e.target.value })}
                              placeholder="Price Display (e.g. ₹299)"
                              className="p-2 bg-slate-50 border border-slate-200 rounded-xl"
                            />
                            <textarea
                              rows={2}
                              value={block.data.description || ''}
                              onChange={(e) => handleUpdateBlockData(block.id, { description: e.target.value })}
                              placeholder="Short product rationale..."
                              className="sm:col-span-2 p-2 bg-slate-50 border border-slate-200 rounded-xl"
                            />
                          </div>
                        )}

                        {block.type === 'callout' && (
                          <div className="space-y-2 text-xs">
                            <div className="grid grid-cols-3 gap-2">
                              <select
                                value={block.data.variant || 'tip'}
                                onChange={(e) => handleUpdateBlockData(block.id, { variant: e.target.value })}
                                className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                              >
                                <option value="tip">Tip Box (Green)</option>
                                <option value="warning">Warning Box (Amber)</option>
                                <option value="info">Info Box (Blue)</option>
                              </select>
                              <input
                                type="text"
                                value={block.data.title || ''}
                                onChange={(e) => handleUpdateBlockData(block.id, { title: e.target.value })}
                                placeholder="Callout title..."
                                className="col-span-2 p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                              />
                            </div>
                            <textarea
                              rows={2}
                              value={block.data.text || ''}
                              onChange={(e) => handleUpdateBlockData(block.id, { text: e.target.value })}
                              placeholder="Callout body text..."
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                            />
                          </div>
                        )}

                        {block.type === 'cta' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <input
                              type="text"
                              value={block.data.heading || ''}
                              onChange={(e) => handleUpdateBlockData(block.id, { heading: e.target.value })}
                              placeholder="Banner Headline..."
                              className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                            />
                            <input
                              type="text"
                              value={block.data.buttonText || ''}
                              onChange={(e) => handleUpdateBlockData(block.id, { buttonText: e.target.value })}
                              placeholder="Button Text..."
                              className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                            />
                            <input
                              type="text"
                              value={block.data.subheading || ''}
                              onChange={(e) => handleUpdateBlockData(block.id, { subheading: e.target.value })}
                              placeholder="Subheading..."
                              className="sm:col-span-2 p-2 bg-slate-50 border border-slate-200 rounded-xl"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* SEO & METADATA TAB */
                <div className="space-y-5 bg-slate-50 p-6 rounded-3xl border border-slate-200 text-xs">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">Custom Google SEO & Social Open Graph</h3>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">SEO Title Tag (50 - 60 chars)</label>
                    <input
                      type="text"
                      value={editingBlog.seo?.title || ''}
                      onChange={(e) => setEditingBlog({
                        ...editingBlog,
                        seo: { ...editingBlog.seo, title: e.target.value }
                      })}
                      placeholder={`${editingBlog.title || 'Article Title'} | BioCart`}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Meta Description (140 - 160 chars)</label>
                    <textarea
                      rows={3}
                      value={editingBlog.seo?.metaDescription || ''}
                      onChange={(e) => setEditingBlog({
                        ...editingBlog,
                        seo: { ...editingBlog.seo, metaDescription: e.target.value }
                      })}
                      placeholder="Concise overview explaining why Indian gardeners should read this article..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Primary Target Keyword</label>
                      <input
                        type="text"
                        value={editingBlog.seo?.targetKeyword || ''}
                        onChange={(e) => setEditingBlog({
                          ...editingBlog,
                          seo: { ...editingBlog.seo, targetKeyword: e.target.value }
                        })}
                        placeholder="e.g. vermicompost for terrace gardening"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Canonical URL Override (Optional)</label>
                      <input
                        type="text"
                        value={editingBlog.seo?.canonicalUrl || ''}
                        onChange={(e) => setEditingBlog({
                          ...editingBlog,
                          seo: { ...editingBlog.seo, canonicalUrl: e.target.value }
                        })}
                        placeholder={`https://biocart.in/blogs/${editingBlog.slug || ''}`}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingBlog.seo?.noIndex || false}
                        onChange={(e) => setEditingBlog({
                          ...editingBlog,
                          seo: { ...editingBlog.seo, noIndex: e.target.checked }
                        })}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>noindex (Block Googlebot from indexing this article)</span>
                    </label>
                  </div>

                  {/* SERP Search Preview */}
                  <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Google SERP Snippet Preview</span>
                    <div className="text-blue-800 text-base font-medium truncate">
                      {editingBlog.seo?.title || `${editingBlog.title || 'Article Title'} | BioCart`}
                    </div>
                    <div className="text-emerald-800 text-xs font-mono">
                      https://biocart.in/blogs/{editingBlog.slug || 'article-slug'}
                    </div>
                    <div className="text-slate-600 text-xs line-clamp-2">
                      {editingBlog.seo?.metaDescription || editingBlog.excerpt || 'Read this in-depth guide on BioCart for organic Indian agriculture.'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Current Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                  editingBlog.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {editingBlog.status}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveBlog('draft')}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveBlog('published')}
                  className="px-6 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Publish to Website</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
