import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

export class StorageService {
  /**
   * Uploads a File object to Firebase Storage under a specified path
   * and returns the public download URL.
   */
  static async uploadImage(file: File, folder: string = 'products'): Promise<string> {
    if (!file) throw new Error('No file provided for upload');
    
    // Create unique filename
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const filePath = `${folder}/${timestamp}_${cleanFileName}`;
    const storageRef = ref(storage, filePath);

    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (_snapshot) => {
          // Progress can be tracked here if needed
        },
        (error) => {
          console.error('Firebase Storage upload error:', error);
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          } catch (urlError) {
            reject(urlError);
          }
        }
      );
    });
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
      console.warn('Failed to delete image from storage (may not exist):', err);
    }
  }
}
