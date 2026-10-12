import React, { useState } from 'react';
import { 
  CMSPage, PageSection, SectionType 
} from '../../types/cms';
import { 
  Save, Eye, Globe, ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, 
  EyeOff, CheckCircle2, AlertCircle, Smartphone, Tablet, Monitor,
  Layout, Sparkles, Megaphone, HelpCircle, Mail, MessageSquare, 
  Copy, Undo, ChevronDown, ChevronRight, Layers, Sliders
} from 'lucide-react';
import { SectionEditor } from './SectionEditor';
import { AdminService } from '../../services/AdminService';
import { useApp } from '../../context/AppContext';

interface VisualPageEditorProps {
  page: CMSPage;
  onBack: () => void;
  onPageUpdated: (page: CMSPage) => void;
}

export const VisualPageEditor: React.FC<VisualPageEditorProps> = ({
  page,
  onBack,
  onPageUpdated
}) => {
  const { addToast } = useApp();
  
  // Working state uses draft sections if present, otherwise live published sections
  const [sections, setSections] = useState<PageSection[]>(
    page.draftSections && page.draftSections.length > 0 
      ? page.draftSections 
      : [...page.sections]
  );
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    sections[0]?.id || null
  );
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [seo, setSeo] = useState(page.seo || {});

  const handleUpdateSection = (updated: PageSection) => {
    setSections(prev => prev.map(s => s.id === updated.id ? updated : s));
    setHasUnsavedChanges(true);
  };

  const handleToggleSectionVisibility = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSections(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
    setHasUnsavedChanges(true);
  };

  const handleMoveSection = (idx: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === sections.length - 1)) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const newSecs = [...sections];
    const [moved] = newSecs.splice(idx, 1);
    newSecs.splice(targetIdx, 0, moved);
    // re-index order
    const ordered = newSecs.map((s, i) => ({ ...s, order: i + 1 }));
    setSections(ordered);
    setHasUnsavedChanges(true);
  };

  const handleDuplicateSection = (sec: PageSection, e: React.MouseEvent) => {
    e.stopPropagation();
    const cloned: PageSection = {
      ...sec,
      id: `${sec.type}-${Date.now()}`,
      title: `${sec.title} (Copy)`,
      order: sec.order + 1,
      data: JSON.parse(JSON.stringify(sec.data))
    };
    const newSecs = [...sections, cloned].map((s, i) => ({ ...s, order: i + 1 }));
    setSections(newSecs);
    setActiveSectionId(cloned.id);
    setHasUnsavedChanges(true);
    addToast('Section duplicated', 'info');
  };

  const handleDeleteSection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sections.length <= 1) {
      addToast('Pages must contain at least one section', 'warning');
      return;
    }
    const filtered = sections.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i + 1 }));
    setSections(filtered);
    if (activeSectionId === id) {
      setActiveSectionId(filtered[0]?.id || null);
    }
    setHasUnsavedChanges(true);
    addToast('Section removed', 'info');
  };

  const handleAddSection = (type: SectionType) => {
    const newSection: PageSection = {
      id: `${type}-${Date.now()}`,
      type,
      title: `New ${type.replace(/_/g, ' ')} Section`,
      enabled: true,
      order: sections.length + 1,
      data: {
        title: `Heading for ${type.replace(/_/g, ' ')}`,
        content: 'Enter your custom block content here...'
      }
    };
    setSections([...sections, newSection]);
    setActiveSectionId(newSection.id);
    setHasUnsavedChanges(true);
    addToast('Added new section block', 'success');
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      await AdminService.savePageDraft(page.id, sections);
      const updatedPage: CMSPage = {
        ...page,
        draftSections: sections,
        hasDraft: true,
        updatedAt: new Date().toISOString()
      };
      onPageUpdated(updatedPage);
      setHasUnsavedChanges(false);
      addToast('Draft saved successfully! (Not live yet)', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to save draft', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (isPublishing) return;
    
    // 1. Validate content
    if (!sections || sections.length === 0) {
      addToast('Cannot publish an empty page. Please add at least one section.', 'warning');
      return;
    }

    setIsPublishing(true);
    try {
      const payload: Partial<CMSPage> = {
        ...page,
        sections,
        draftSections: [],
        hasDraft: false,
        seo,
        status: 'published'
      };

      await AdminService.publishPageCMS(page.id, payload);
      
      // If home page, also sync legacy fields to ensure backwards compatibility
      if (page.id === 'home') {
        const heroSec = sections.find(s => s.type === 'hero');
        const ribbonSec = sections.find(s => s.type === 'promotional_ribbon');
        if (heroSec || ribbonSec) {
          try {
            await AdminService.saveHomepageCMS({
              ...(heroSec ? { hero: heroSec.data } : {}),
              ...(ribbonSec ? { promotionalRibbon: { enabled: ribbonSec.enabled, ...ribbonSec.data } } : {})
            });
          } catch (syncErr) {
            console.warn('Non-critical legacy homepage sync warning:', syncErr);
          }
        }
      }

      const updatedPage: CMSPage = {
        ...page,
        sections,
        draftSections: [],
        hasDraft: false,
        status: 'published',
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      onPageUpdated(updatedPage);
      setHasUnsavedChanges(false);
      addToast(`Page "${page.title}" published live to storefront!`, 'success');
    } catch (err: any) {
      console.error('[VisualPageEditor] Publish failed:', err);
      const msg = err?.message || 'Publishing failed. Your draft has been preserved locally.';
      addToast(msg, 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const activeSection = sections.find(s => s.id === activeSectionId) || sections[0];

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-slate-100 dark:bg-charcoal-950 -m-6 animate-fade-in">
      {/* Top WordPress-style Editor Bar */}
      <header className="h-16 bg-white dark:bg-charcoal-900 border-b border-slate-200 dark:border-white/10 px-4 md:px-6 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (hasUnsavedChanges && !confirm('You have unsaved changes. Leave anyway?')) return;
              onBack();
            }}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-charcoal-800 transition-colors"
            title="Return to Page Management"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-1.5">
                {page.title}
              </h2>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                page.status === 'published' 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' 
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
              }`}>
                {page.status}
              </span>
              {page.hasDraft && (
                <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                  Draft Pending
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono">Slug: /{page.slug}</p>
          </div>
        </div>

        {/* Device Switcher & Preview Controls */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-charcoal-800 p-1 rounded-xl">
          <button
            onClick={() => setPreviewDevice('desktop')}
            className={`p-1.5 rounded-lg transition-colors ${previewDevice === 'desktop' ? 'bg-white dark:bg-charcoal-900 shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
            title="Desktop Resolution"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPreviewDevice('tablet')}
            className={`p-1.5 rounded-lg transition-colors ${previewDevice === 'tablet' ? 'bg-white dark:bg-charcoal-900 shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
            title="Tablet Viewport"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPreviewDevice('mobile')}
            className={`p-1.5 rounded-lg transition-colors ${previewDevice === 'mobile' ? 'bg-white dark:bg-charcoal-900 shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
            title="Mobile Screen"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
              previewMode 
                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                : 'border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{previewMode ? 'Exit Preview' : 'Live Preview'}</span>
          </button>

          <button
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-charcoal-700 dark:hover:bg-charcoal-600 text-slate-800 dark:text-white transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving Draft...' : 'Save Draft'}
          </button>

          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isPublishing ? 'Publishing...' : 'Publish Live'}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Section Navigation Panel */}
        {!previewMode && (
          <aside className="w-80 bg-white dark:bg-charcoal-900 border-r border-slate-200 dark:border-white/10 flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-charcoal-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                Page Sections ({sections.length})
              </span>
              
              {/* Add Section dropdown */}
              <div className="relative group">
                <button
                  className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold px-2 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Block</span>
                </button>
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-charcoal-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl py-1.5 hidden group-hover:block z-40">
                  {[
                    { type: 'hero', label: 'Hero Carousel' },
                    { type: 'promotional_ribbon', label: 'Promotional Ribbon' },
                    { type: 'stats', label: 'Trust Statistics' },
                    { type: 'product_carousel', label: 'Product Carousel' },
                    { type: 'brand_philosophy', label: 'Brand Philosophy' },
                    { type: 'lifestyle_bento', label: 'Modern Homes Bento' },
                    { type: 'faq', label: 'FAQ Accordions' },
                    { type: 'newsletter', label: 'Newsletter Circular' },
                    { type: 'rich_text', label: 'Rich Text Article' }
                  ].map(b => (
                    <button
                      key={b.type}
                      onClick={() => handleAddSection(b.type as SectionType)}
                      className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 flex items-center gap-2"
                    >
                      <Plus className="w-3 h-3 text-emerald-500" />
                      <span>{b.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* List of sections with Reorder, Hide, Duplicate & Delete buttons */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {sections.map((sec, idx) => {
                const isActive = activeSectionId === sec.id;
                return (
                  <div
                    key={sec.id}
                    onClick={() => setActiveSectionId(sec.id)}
                    className={`p-3 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between group ${
                      isActive 
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm' 
                        : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-charcoal-800/40 hover:bg-white'
                    } ${!sec.enabled ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-charcoal-700 text-slate-600 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <p className={`font-bold truncate ${isActive ? 'text-emerald-800 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>
                          {sec.title || sec.type}
                        </p>
                        <p className="text-[10px] text-slate-400 capitalize">{sec.type.replace(/_/g, ' ')}</p>
                      </div>
                    </div>

                    {/* Quick action bar */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleMoveSection(idx, 'up', e)}
                        disabled={idx === 0}
                        className="p-1 hover:text-emerald-600 disabled:opacity-20"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleMoveSection(idx, 'down', e)}
                        disabled={idx === sections.length - 1}
                        className="p-1 hover:text-emerald-600 disabled:opacity-20"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleToggleSectionVisibility(sec.id, e)}
                        className={`p-1 ${sec.enabled ? 'text-slate-400 hover:text-slate-600' : 'text-amber-500'}`}
                        title={sec.enabled ? 'Hide Section' : 'Show Section'}
                      >
                        {sec.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={(e) => handleDuplicateSection(sec, e)}
                        className="p-1 text-slate-400 hover:text-emerald-600"
                        title="Duplicate Block"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteSection(sec.id, e)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                        title="Delete Block"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* Center Canvas / Preview or Active Configuration Panel */}
        <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
          {previewMode ? (
            /* Responsive Viewport Simulator */
            <div className={`transition-all duration-300 w-full bg-white dark:bg-charcoal-900 rounded-2xl shadow-xl overflow-hidden border border-slate-300 dark:border-white/10 ${
              previewDevice === 'mobile' 
                ? 'max-w-sm min-h-[700px]' 
                : previewDevice === 'tablet' 
                  ? 'max-w-2xl min-h-[800px]' 
                  : 'max-w-6xl min-h-screen'
            }`}>
              <div className="p-3 bg-slate-800 text-white text-xs flex justify-between items-center font-mono">
                <span>SIMULATED {previewDevice.toUpperCase()} VIEWPORT</span>
                <span>STATUS: {page.status.toUpperCase()}</span>
              </div>
              <div className="p-6 space-y-12">
                {sections.filter(s => s.enabled).map(sec => (
                  <div key={sec.id} className="border-b border-slate-100 pb-8 last:border-b-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                        Block: {sec.type}
                      </span>
                      {sec.type === 'hero' && sec.data.banners && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded">
                          {sec.data.banners.length} Active Banners
                        </span>
                      )}
                      {sec.type === 'promotional_ribbon' && sec.data.ads && (
                        <span className="text-[10px] bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded">
                          {sec.data.ads.length} Promo Ads
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold mt-2 text-slate-900 dark:text-white">
                      {sec.data.title || sec.data.titleLine1 || sec.title}
                    </h3>
                    {sec.data.subtitle && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{sec.data.subtitle}</p>
                    )}

                    {/* Rich preview for hero multi-banners */}
                    {sec.type === 'hero' && sec.data.banners && sec.data.banners.length > 0 ? (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {sec.data.banners.map((b: any, bIdx: number) => (
                          <div key={b.id || bIdx} className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm bg-slate-900 text-white p-3 flex flex-col justify-end min-h-[140px]">
                            {b.imageUrl && (
                              <img src={b.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                            )}
                            <div className="relative z-10">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-500/80 rounded uppercase tracking-wider text-white">
                                {b.badgeText || `Banner #${bIdx + 1}`}
                              </span>
                              <p className="font-bold text-xs mt-1 truncate">{b.titleLine1 || b.title || 'Banner Slide'}</p>
                              {b.subtitle && <p className="text-[10px] text-slate-300 truncate">{b.subtitle}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : sec.data.imageUrl ? (
                      <img src={sec.data.imageUrl} alt="" className="mt-3 rounded-xl max-h-64 w-full object-cover shadow" />
                    ) : null}

                    {/* Rich preview for promotional ribbon ads */}
                    {sec.type === 'promotional_ribbon' && sec.data.ads && sec.data.ads.length > 0 && (
                      <div className="mt-3 bg-emerald-900 text-emerald-100 rounded-lg p-2.5 flex flex-wrap gap-2 text-xs">
                        {sec.data.ads.map((ad: any, aIdx: number) => (
                          <div key={ad.id || aIdx} className="inline-flex items-center gap-1.5 bg-emerald-800/80 px-2.5 py-1 rounded-full border border-emerald-700/60 text-[11px]">
                            <span className="font-bold uppercase tracking-wider text-emerald-300">{ad.campaignLabel || 'PROMO'}</span>
                            <span className="text-white/90">{ad.text}</span>
                            {ad.ctaText && <span className="underline text-emerald-300 ml-1">{ad.ctaText} →</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {sec.data.content && (
                      <div className="prose text-xs text-slate-600 dark:text-slate-300 mt-3" dangerouslySetInnerHTML={{ __html: sec.data.content }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Section Customizer Panel */
            <div className="w-full max-w-3xl bg-white dark:bg-charcoal-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm p-6 space-y-6">
              <div className="border-b border-slate-200 dark:border-white/10 pb-4 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-emerald-600" />
                    {activeSection?.title || 'Section Editor'}
                  </h3>
                  <p className="text-xs text-slate-400 capitalize">
                    Configuring type: {activeSection?.type.replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${activeSection?.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {activeSection?.enabled ? 'Visible' : 'Hidden'}
                  </span>
                </div>
              </div>

              {activeSection && (
                <SectionEditor
                  section={activeSection}
                  onChange={handleUpdateSection}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
