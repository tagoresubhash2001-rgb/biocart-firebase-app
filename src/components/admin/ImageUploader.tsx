import React, { useState } from 'react';
import { Image as ImageIcon, Upload, Trash2, ExternalLink } from 'lucide-react';
import { MediaLibraryModal } from './MediaLibraryModal';

interface ImageUploaderProps {
  currentUrl?: string;
  onUploadSuccess: (url: string) => void;
  onRemove: () => void;
  folder?: string;
  label?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  currentUrl,
  onUploadSuccess,
  onRemove,
  folder = 'cms',
  label = 'Section Image / Media'
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-2">
      {label && <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">{label}</label>}
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-charcoal-800/50">
        {currentUrl ? (
          <div className="relative w-28 h-20 rounded-lg overflow-hidden border border-slate-300 dark:border-white/10 bg-slate-200 shrink-0">
            <img
              src={currentUrl}
              alt="Media Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=400&q=80';
              }}
            />
            <button
              type="button"
              onClick={onRemove}
              className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full shadow-md transition-colors"
              title="Remove image"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="w-28 h-20 rounded-lg border-2 border-dashed border-slate-300 dark:border-white/20 flex flex-col items-center justify-center text-slate-400 bg-white dark:bg-charcoal-900 shrink-0">
            <ImageIcon className="w-5 h-5 mb-1 opacity-50" />
            <span className="text-[10px] font-medium">No Image</span>
          </div>
        )}

        <div className="flex-1 space-y-1.5 w-full">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              {currentUrl ? 'Replace from Media Library' : 'Choose from Media Library'}
            </button>
            {currentUrl && (
              <a
                href={currentUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                title="View Full Resolution"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 break-all truncate">
            {currentUrl ? currentUrl : 'Select from verified store assets or upload directly to Firebase Storage'}
          </p>
        </div>
      </div>

      <MediaLibraryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelectImage={onUploadSuccess}
        folder={folder}
      />
    </div>
  );
};
