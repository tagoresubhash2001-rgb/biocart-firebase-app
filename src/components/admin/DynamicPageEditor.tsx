import React from 'react';
import { ImageUploader } from './ImageUploader';
import { Plus, Trash2 } from 'lucide-react';

interface DynamicPageEditorProps {
  pageData: any;
  updateField: (field: string, value: any) => void;
  schemaType: 'standard' | 'category' | 'legal' | 'custom';
  pageId?: string;
}

export const DynamicPageEditor: React.FC<DynamicPageEditorProps> = ({
  pageData,
  updateField,
  schemaType,
  pageId
}) => {
  const CUSTOM_IMAGE_LABELS: Record<string, Record<string, string>> = {
    'about-us': {
      'image': 'Hero Banner Image',
      'image2': 'Our Story Image',
      'image3': 'Manufacturing / Factory Image',
      'image4': 'Prashanthi Pallapothula (Founder)',
      'image5': 'Tagore Subhash Maguluri (Founder)',
      'image6': 'Certifications Image',
      'image7': 'Gallery Image'
    },
    'contact-us': {
      'image': 'Contact Us Hero Image',
      'image2': 'Headquarters Office Image'
    }
  };

  const getLabel = (key: string, defaultLabel: string) => {
    if (pageId && CUSTOM_IMAGE_LABELS[pageId] && CUSTOM_IMAGE_LABELS[pageId][key]) {
      return CUSTOM_IMAGE_LABELS[pageId][key];
    }
    return defaultLabel;
  };

  if (schemaType === 'legal') {
    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={pageData.title || ''}
            onChange={(e) => updateField('title', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
          <input
            type="text"
            value={pageData.lastUpdated || ''}
            onChange={(e) => updateField('lastUpdated', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
        {pageData.sections?.map((sec: any, idx: number) => (
          <div key={idx} className="p-4 bg-gray-50 rounded border border-gray-200 relative mb-4">
            <button 
              onClick={() => {
                const newSecs = [...pageData.sections];
                newSecs.splice(idx, 1);
                updateField('sections', newSecs);
              }}
              className="absolute top-4 right-4 text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <div className="space-y-4 pr-10">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
                <input
                  type="text"
                  value={sec.title || ''}
                  onChange={(e) => {
                    const newSecs = [...pageData.sections];
                    newSecs[idx].title = e.target.value;
                    updateField('sections', newSecs);
                  }}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section Content</label>
                <textarea
                  value={sec.content || ''}
                  onChange={(e) => {
                    const newSecs = [...pageData.sections];
                    newSecs[idx].content = e.target.value;
                    updateField('sections', newSecs);
                  }}
                  className="w-full p-2 border border-gray-300 rounded h-32 focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sec.visible !== false}
                  onChange={(e) => {
                    const newSecs = [...pageData.sections];
                    newSecs[idx].visible = e.target.checked;
                    updateField('sections', newSecs);
                  }}
                />
                <span className="text-sm font-medium">Visible</span>
              </div>
            </div>
          </div>
        ))}
        <button
          onClick={() => updateField('sections', [...(pageData.sections || []), { title: '', content: '', visible: true }])}
          className="flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
        >
          <Plus className="h-4 w-4" /> Add Section
        </button>
      </div>
    );
  }

  if (schemaType === 'category') {
    return (
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hero Title</label>
          <input
            type="text"
            value={pageData.heroTitle || ''}
            onChange={(e) => updateField('heroTitle', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={pageData.description || ''}
            onChange={(e) => updateField('description', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded h-24 focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category Image</label>
          <ImageUploader
            currentUrl={pageData.image}
            onUploadSuccess={(url) => updateField('image', url)}
            onRemove={() => updateField('image', '')}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Benefits</label>
          {(pageData.benefits || []).map((benefit: string, idx: number) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input
                type="text"
                value={benefit}
                onChange={(e) => {
                  const newB = [...pageData.benefits];
                  newB[idx] = e.target.value;
                  updateField('benefits', newB);
                }}
                className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="Benefit..."
              />
              <button 
                onClick={() => {
                  const newB = [...pageData.benefits];
                  newB.splice(idx, 1);
                  updateField('benefits', newB);
                }}
                className="p-2 text-red-500 hover:bg-red-50 rounded"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => updateField('benefits', [...(pageData.benefits || []), ''])}
            className="text-sm text-green-600 font-medium mt-1"
          >
            + Add Benefit
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">FAQs</label>
          {(pageData.faqs || []).map((faq: any, idx: number) => (
            <div key={idx} className="bg-gray-50 p-4 rounded border border-gray-200 mb-3">
              <input
                type="text"
                value={faq.question || ''}
                onChange={(e) => {
                  const newFaqs = [...pageData.faqs];
                  newFaqs[idx].question = e.target.value;
                  updateField('faqs', newFaqs);
                }}
                className="w-full p-2 border border-gray-300 rounded mb-2 focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="Question"
              />
              <textarea
                value={faq.answer || ''}
                onChange={(e) => {
                  const newFaqs = [...pageData.faqs];
                  newFaqs[idx].answer = e.target.value;
                  updateField('faqs', newFaqs);
                }}
                className="w-full p-2 border border-gray-300 rounded h-20 focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="Answer"
              />
              <button
                onClick={() => {
                  const newFaqs = [...pageData.faqs];
                  newFaqs.splice(idx, 1);
                  updateField('faqs', newFaqs);
                }}
                className="text-sm text-red-500 mt-2 flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" /> Remove FAQ
              </button>
            </div>
          ))}
          <button
            onClick={() => updateField('faqs', [...(pageData.faqs || []), { question: '', answer: '' }])}
            className="text-sm text-green-600 font-medium"
          >
            + Add FAQ
          </button>
        </div>
      </div>
    );
  }

  // custom or standard
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title / Hero Title</label>
        <input
          type="text"
          value={pageData.title || pageData.heroTitle || ''}
          onChange={(e) => updateField(pageData.heroTitle !== undefined ? 'heroTitle' : 'title', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Content / Description</label>
        <textarea
          value={pageData.content || pageData.description || ''}
          onChange={(e) => updateField(pageData.content !== undefined ? 'content' : 'description', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded h-64 focus:ring-2 focus:ring-green-500 outline-none"
          placeholder="Content..."
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{getLabel("image", "Main Image")}</label>
        <ImageUploader
          currentUrl={pageData.image}
          onUploadSuccess={(url) => updateField('image', url)}
          onRemove={() => updateField('image', '')}
        />
      </div>
      
      {schemaType === 'custom' && (
        <div className="pt-6 border-t border-gray-200">
          <h4 className="text-sm font-bold text-gray-900 mb-4">Additional Page Images</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[2, 3, 4, 5, 6, 7].map((num) => (
              <div key={num} className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">{getLabel(`image${num}`, `Image ${num}`)}</label>
                <ImageUploader
                  currentUrl={pageData[`image${num}`]}
                  onUploadSuccess={(url) => updateField(`image${num}`, url)}
                  onRemove={() => updateField(`image${num}`, '')}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(pageData).map(key => {
        if (['title', 'heroTitle', 'content', 'description', 'image', 'id'].includes(key)) return null;
        if (typeof pageData[key] === 'string') {
          return (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{key}</label>
              <textarea
                value={pageData[key] || ''}
                onChange={(e) => updateField(key, e.target.value)}
                className="w-full p-2 border border-gray-300 rounded h-24 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};
