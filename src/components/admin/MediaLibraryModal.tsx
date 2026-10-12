import React, { useState } from 'react';
import { 
  Image as ImageIcon, Upload, Trash2, Check, Search, 
  X, AlertCircle, FileText, ExternalLink 
} from 'lucide-react';
import { StorageService } from '../../services/StorageService';

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (url: string) => void;
  folder?: string;
}

// Built-in verified high-resolution media catalogue
export const SYSTEM_MEDIA_LIBRARY = [
  {
    id: 'sys-hero-1',
    name: 'Flagship Living Soil Farm',
    url: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1920&q=80',
    category: 'Hero & Backgrounds'
  },
  {
    id: 'sys-hero-2',
    name: 'Vibrant Green Sproutlings',
    url: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19657?auto=format&fit=crop&w=1600&q=80',
    category: 'Hero & Backgrounds'
  },
  {
    id: 'sys-hero-3',
    name: 'Microbial Enriched Soil',
    url: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=1600&q=80',
    category: 'Hero & Backgrounds'
  },
  {
    id: 'sys-prod-vermi',
    name: 'Premium Vermicompost Pouch',
    url: '/assets/products/prod_vermicompost.png',
    category: 'Products'
  },
  {
    id: 'sys-prod-neem',
    name: 'Cold-Pressed Neem Oil',
    url: '/assets/products/prod_neem_oil.png',
    category: 'Products'
  },
  {
    id: 'sys-prod-coco',
    name: 'Low-EC Coco Peat Block',
    url: '/assets/products/prod_coco_peat.png',
    category: 'Products'
  },
  {
    id: 'sys-prod-coir',
    name: 'Biodegradable Coir Pots',
    url: '/assets/products/prod_coir_pots.png',
    category: 'Products'
  },
  {
    id: 'sys-prod-seaweed',
    name: 'Organic Seaweed Extract',
    url: '/assets/products/prod_seaweed.png',
    category: 'Products'
  },
  {
    id: 'sys-prod-seeds',
    name: 'Heirloom Vegetable Seeds',
    url: '/assets/products/prod_veg_seeds.png',
    category: 'Products'
  },
  {
    id: 'sys-founder-1',
    name: 'Founder Prashanthi Pallapothula',
    url: '/assets/founder_prashanthi.jpg',
    category: 'Founders & Team'
  },
  {
    id: 'sys-founder-2',
    name: 'Founder Tagore Subhash Maguluri',
    url: '/assets/founder_tagore.jpg',
    category: 'Founders & Team'
  },
  {
    id: 'sys-lifestyle-1',
    name: 'Modern Balcony Organic Farming',
    url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80',
    category: 'Lifestyle'
  },
  {
    id: 'sys-lifestyle-2',
    name: 'Zero-Plastic Packaging Harvest',
    url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
    category: 'Lifestyle'
  }
];

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  folder = 'cms'
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'upload' | 'custom_url'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [customUrl, setCustomUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [userUploadedItems, setUserUploadedItems] = useState<{ id: string; name: string; url: string; category: string }[]>(() => {
    try {
      const saved = localStorage.getItem('biocart_media_library');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  if (!isOpen) return null;

  const allItems = [...userUploadedItems, ...SYSTEM_MEDIA_LIBRARY];

  const categories = ['All', 'Hero & Backgrounds', 'Products', 'Founders & Team', 'Lifestyle', 'User Uploads'];

  const filteredItems = allItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' 
      || (selectedCategory === 'User Uploads' && userUploadedItems.some(u => u.id === item.id))
      || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds 5MB limit');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      const publicUrl = await StorageService.uploadImage(file, folder);
      
      const newItem = {
        id: `upload-${Date.now()}`,
        name: file.name,
        url: publicUrl,
        category: 'User Uploads'
      };
      
      const updated = [newItem, ...userUploadedItems];
      setUserUploadedItems(updated);
      try {
        localStorage.setItem('biocart_media_library', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage quota exceeded', e);
      }
      
      onSelectImage(publicUrl);
      onClose();
    } catch (err: any) {
      setUploadError(err.message || 'Image upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleApplyCustomUrl = () => {
    if (!customUrl.trim()) return;
    onSelectImage(customUrl.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-charcoal-900 rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-white/10 animate-fade-in">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-charcoal-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-emerald-600" />
              BioCart Media Asset Manager
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select verified store assets or upload new optimized imagery
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="px-6 pt-3 flex gap-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-charcoal-900">
          <button
            onClick={() => setActiveTab('library')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'library'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Media Library ({allItems.length})
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Upload File
          </button>
          <button
            onClick={() => setActiveTab('custom_url')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'custom_url'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Insert from URL
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'library' && (
            <div className="space-y-6">
              {/* Filter and Search */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search media by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-charcoal-800 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                        selectedCategory === cat
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-charcoal-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectImage(item.url);
                      onClose();
                    }}
                    className="group border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-emerald-500 hover:shadow-lg transition-all bg-white dark:bg-charcoal-800 relative flex flex-col"
                  >
                    <div className="aspect-square bg-slate-100 dark:bg-charcoal-900 overflow-hidden relative">
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-emerald-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Select
                        </span>
                      </div>
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.category}</p>
                    </div>
                  </div>
                ))}
              </div>

              {filteredItems.length === 0 && (
                <div className="py-16 text-center text-slate-400">
                  <p className="text-sm">No assets found matching your search</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="h-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-white/20 rounded-2xl bg-slate-50 dark:bg-charcoal-800/40">
              <Upload className="w-12 h-12 text-emerald-600 mb-4 animate-bounce" />
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                Upload New Image Asset
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 text-center max-w-sm">
                Supported formats: PNG, JPG, WEBP, SVG. Maximum file size: 5 MB.
              </p>

              {uploadError && (
                <div className="mb-4 flex items-center gap-2 text-xs text-rose-600 bg-rose-50 px-4 py-2 rounded-xl">
                  <AlertCircle className="w-4 h-4" />
                  {uploadError}
                </div>
              )}

              <label className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl cursor-pointer shadow-md transition-all">
                {isUploading ? 'Uploading to Storage...' : 'Browse Computer Files'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {activeTab === 'custom_url' && (
            <div className="max-w-xl mx-auto py-12 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  Direct Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/images/banner.jpg"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-charcoal-800 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {customUrl && (
                <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 flex items-center justify-center">
                  <img
                    src={customUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as any).style.display = 'none';
                    }}
                  />
                </div>
              )}

              <button
                onClick={handleApplyCustomUrl}
                disabled={!customUrl.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-md transition-all text-sm"
              >
                Insert Image into Content Block
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
