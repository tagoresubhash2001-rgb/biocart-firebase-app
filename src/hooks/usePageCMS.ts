import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export const usePageCMS = (pageId: string) => {
  const [cmsData, setCmsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pageId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const unsub = onSnapshot(doc(db, 'pages', pageId), (docSnap) => {
      if (docSnap.exists()) {
        setCmsData(docSnap.data());
      } else {
        setCmsData(null);
      }
      setLoading(false);
    }, (err) => {
      console.warn('Error fetching CMS for page:', pageId, err);
      // Fallback
      setCmsData(null);
      setLoading(false);
    });

    return () => unsub();
  }, [pageId]);

  return { cmsData, loading };
};
