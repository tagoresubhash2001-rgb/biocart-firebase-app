import React, { useState } from 'react';
import { StorageService } from '../../services/StorageService';
import { useApp } from '../../context/AppContext';
import { Upload, X, Star, ArrowLeft, ArrowRight, Image as ImageIcon, Loader2 } from 'lucide-react';

interface MultiImageGalleryManagerProps {
  images: string[];
  coverImage: string;
  onChange: (images: string[], coverImage: string) => void;
  folder?: string;
  disabled?: boolean;
}

export const MultiImageGalleryManager: React.FC<MultiImageGalleryManagerProps> = ({
  images,
  coverImage,
  onChange,
  folder = 'products',
  disabled = false
}) => {
  const { addToast } = useApp();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Normalize image list
  const currentImages = Array.isArray(images) ? images.filter(Boolean) : [];
  if (coverImage && !currentImages.includes(coverImage)) {
    currentImages.unshift(coverImage);
  }

  const handleMultipleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validate size and types
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        addToast(`File ${file.name} is not an image and was skipped`, 'warning');
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        addToast(`File ${file.name} exceeds 5MB limit and was skipped`, 'warning');
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    try {
      setUploading(true);
      const uploadedUrls: string[] = [];

      for (let i = 0; i < validFiles.length; i++) {
        setUploadProgress(`Uploading ${i + 1} of ${validFiles.length}...`);
        const url = await StorageService.uploadImage(validFiles[i], folder);
        uploadedUrls.push(url);
      }

      const updatedList = [...currentImages, ...uploadedUrls];
      const newCover = coverImage || updatedList[0] || '';
      onChange(updatedList, newCover);
      addToast(`Successfully uploaded ${uploadedUrls.length} image(s)`, 'success');
    } catch (err: any) {
      console.error('Multi image upload error:', err);
      addToast(err.message || 'Image upload failed', 'warning');
    } finally {
      setUploading(false);
      setUploadProgress('');
      // reset file input
      e.target.value = '';
    }
  };

  const handleSetCover = (imgUrl: string) => {
    // Make it cover image and place first in the array
    const filtered = currentImages.filter(url => url !== imgUrl);
    const updated = [imgUrl, ...filtered];
    onChange(updated, imgUrl);
    addToast('Set as cover / primary image', 'info');
  };

  const handleRemoveImage = (imgUrl: string) => {
    const updated = currentImages.filter(url => url !== imgUrl);
    const newCover = coverImage === imgUrl ? (updated[0] || '') : coverImage;
    onChange(updated, newCover);
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    if (direction === 'left' && index === 0) return;
    if (direction === 'right' && index === currentImages.length - 1) return;

    const targetIdx = direction === 'left' ? index - 1 : index + 1;
    const updated = [...currentImages];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    const newCover = index === 0 || targetIdx === 0 ? updated[0] : coverImage;
    onChange(updated, newCover);
  };

  return (
    <div className="space-y-3 p-3.5 bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-white/10 rounded-2xl">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            Product Image Gallery ({currentImages.length})
          </label>
          <p className="text-[10px] text-slate-500">
            Upload multiple photos. Select which photo is the primary cover image shown across the shop.
          </p>
        </div>

        <label
          className={`px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all shadow-sm ${
            disabled || uploading ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{uploadProgress || 'Uploading...'}</span>
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5" />
              <span>Add Images</span>
            </>
          )}
          <input
            type="file"
            multiple
            accept="image/*"
            disabled={disabled || uploading}
            onChange={handleMultipleFilesUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Gallery Cards Grid */}
      {currentImages.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-1">
          {currentImages.map((url, idx) => {
            const isCover = url === coverImage || (idx === 0 && !coverImage);
            return (
              <div
                key={url + idx}
                className={`group relative rounded-xl border-2 overflow-hidden bg-slate-50 dark:bg-charcoal-800 aspect-square flex items-center justify-center transition-all ${
                  isCover
                    ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-md'
                    : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
                }`}
              >
                <img
                  src={url}
                  alt={`Product img ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain p-1.5"
                />

                {/* Badge for Cover */}
                {isCover && (
                  <span className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded shadow-sm z-10 flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 fill-current" /> Cover
                  </span>
                )}

                {/* Overlay Action Controls */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5 z-20">
                  <div className="flex justify-between items-center">
                    {!isCover && (
                      <button
                        type="button"
                        onClick={() => handleSetCover(url)}
                        title="Set as Cover Image"
                        className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 text-[9px] font-bold"
                      >
                        Set Cover
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(url)}
                      title="Remove Image"
                      className="p-1 rounded bg-rose-600 text-white hover:bg-rose-500 ml-auto"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Reordering Controls */}
                  <div className="flex justify-between items-center mt-auto">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, 'left')}
                      className="p-1 rounded bg-white/20 text-white hover:bg-white/40 disabled:opacity-20"
                      title="Move Left"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <span className="text-[9px] text-white font-mono font-bold">
                      {idx + 1}
                    </span>
                    <button
                      type="button"
                      disabled={idx === currentImages.length - 1}
                      onClick={() => handleMove(idx, 'right')}
                      className="p-1 rounded bg-white/20 text-white hover:bg-white/40 disabled:opacity-20"
                      title="Move Right"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl bg-slate-50/50 dark:bg-charcoal-800/20">
          <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
          <p className="text-xs text-slate-500">No images uploaded yet.</p>
          <p className="text-[10px] text-slate-400">Click "Add Images" above to upload product photos.</p>
        </div>
      )}
    </div>
  );
};
