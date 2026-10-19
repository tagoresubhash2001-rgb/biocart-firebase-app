import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { storage, functions } from '../config/firebase';

/**
 * Converts a browser File object to a base64 Data URL.
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(new Error('Failed to read file: ' + (err || 'unknown error')));
    reader.readAsDataURL(file);
  });
}

export class StorageService {
  /**
   * Uploads an image file to BioCart Media Storage.
   * Prioritizes trusted backend Cloud Function (uploadMediaAsset) which directly
   * streams to the biocart-production-storage bucket without CORS preflight failures.
   * Automatically falls back to direct Storage upload with timeout protection.
   */
  static async uploadImage(
    file: File, 
    folder: string = 'cms',
    onProgress?: (percent: number) => void
  ): Promise<string> {
    if (!file) throw new Error('No file provided for upload');

    // Enforce 10MB file limit
    if (file.size > 10 * 1024 * 1024) {
      throw new Error(`File "${file.name}" exceeds the 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
    }

    // 30-second timeout safeguard to prevent infinite hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Upload operation timed out after 30 seconds. Please check your network connection.'));
      }, 30000);
      // Clean up timer if node environment, otherwise browser handles it
      if (typeof timer === 'object' && timer && 'unref' in timer) (timer as any).unref();
    });

    const executionPromise = (async (): Promise<string> => {
      // 1. Primary Strategy: Authenticated Cloud Function upload
      try {
        if (onProgress) onProgress(20);
        const dataUrl = await fileToDataUrl(file);
        if (onProgress) onProgress(45);

        const uploadFn = httpsCallable<{ dataUrl: string; filename: string; folder: string }, { success: boolean; url: string }>(
          functions, 
          'uploadMediaAsset'
        );

        if (onProgress) onProgress(65);
        const res = await uploadFn({
          dataUrl,
          filename: file.name,
          folder
        });

        if (res.data?.url) {
          if (onProgress) onProgress(100);
          return res.data.url;
        }
      } catch (backendError: any) {
        console.warn('Backend uploadMediaAsset call returned an issue, falling back to direct Firebase Storage:', backendError?.message || backendError);
      }

      // 2. Fallback Strategy: Direct Firebase Storage upload
      if (onProgress) onProgress(70);
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const timestamp = Date.now();
      const filePath = `${folder}/${timestamp}_${cleanFileName}`;
      const storageRef = ref(storage, filePath);

      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.totalBytes > 0 && onProgress) {
              const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              onProgress(Math.max(70, pct));
            }
          },
          (error) => {
            console.error('Firebase Storage direct upload error:', error);
            reject(new Error(error.message || 'Direct Firebase Storage upload failed.'));
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              if (onProgress) onProgress(100);
              resolve(downloadUrl);
            } catch (urlError: any) {
              reject(new Error('Failed to retrieve media download URL: ' + (urlError?.message || 'unknown error')));
            }
          }
        );
      });
    })();

    return Promise.race([executionPromise, timeoutPromise]);
  }

  /**
   * Deletes an image from Firebase Storage by URL or Ref path.
   */
  static async deleteImage(urlOrPath: string): Promise<void> {
    if (!urlOrPath || !urlOrPath.startsWith('http')) return;
    try {
      const fileRef = ref(storage, urlOrPath);
      await deleteObject(fileRef);
    } catch (err) {
      console.warn('Failed to delete image from storage (may not exist or was external URL):', err);
    }
  }
}
