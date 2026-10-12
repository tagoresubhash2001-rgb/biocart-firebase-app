import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

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
        if (directDoc.exists()) {
          setVendorId(directDoc.id);
          return;
        }

        // 2. Query lookup: check if ownerUid field matches auth uid
        const q = query(collection(db, 'vendors'), where('ownerUid', '==', userProfile.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setVendorId(snap.docs[0].id);
          return;
        }

        // 3. Fallback for vendor-role accounts whose document ID is their auth uid
        if (userProfile.role === 'vendor') {
          setVendorId(userProfile.uid);
          return;
        }

        setVendorId(null);
      } catch (err) {
        console.error('Error resolving vendor identity:', err);
        if (userProfile.role === 'vendor') {
          setVendorId(userProfile.uid);
        } else {
          setVendorId(null);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchVendor();
  }, [userProfile?.uid, userProfile?.role]);

  return { vendorId, loading, user: userProfile };
}
