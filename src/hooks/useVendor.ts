import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function useVendor() {
  const { userProfile } = useAuth();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.uid) {
      setVendorId(null);
      setLoading(false);
      return;
    }

    // Only accounts with vendor, admin, or super_admin roles can resolve a vendor identity
    if (!['vendor', 'admin', 'super_admin'].includes(userProfile.role)) {
      setVendorId(null);
      setLoading(false);
      return;
    }

    const fetchVendor = async () => {
      try {
        // 1. Direct lookup: check if vendor document ID matches auth uid
        const directDoc = await getDoc(doc(db, 'vendors', userProfile.uid));
        if (directDoc.exists() && directDoc.data().status === 'active') {
          setVendorId(directDoc.id);
          return;
        }
        setVendorId(null);
      } catch (err) {
        console.error('Error resolving vendor identity:', err);
        setVendorId(null);
      } finally {
        setLoading(false);
      }
    };
    fetchVendor();
  }, [userProfile?.uid, userProfile?.role]);

  return { vendorId, loading, user: userProfile };
}
