import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';

export interface UseVendorResult {
  vendorId: string | null;
  vendorData: any | null;
  loading: boolean;
  error: 'unauthenticated' | 'unauthorized_role' | 'vendor_not_found' | 'network_error' | 'permission_denied' | null;
  errorMessage: string | null;
  user: any;
  refetch: () => Promise<void>;
}

export function useVendor(): UseVendorResult {
  const { userProfile, firebaseUser, isAuthenticating } = useAuth();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorData, setVendorData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<UseVendorResult['error']>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Safety timeout: If identity resolution or Firestore connection stalls, never leave the user hanging indefinitely
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoading(current => {
        if (current) {
          setError('network_error');
          setErrorMessage('Connection timed out while verifying vendor partner credentials. Please check your network and retry.');
          return false;
        }
        return current;
      });
    }, 12000); // 12 second bounded timeout
    return () => clearTimeout(timer);
  }, [loading]);

  const resolveIdentity = useCallback(async () => {
    // Wait until Auth is fully initialized
    if (isAuthenticating) {
      setLoading(true);
      return;
    }

    if (!firebaseUser?.uid) {
      setVendorId(null);
      setVendorData(null);
      setError('unauthenticated');
      setErrorMessage('User session not authenticated. Please log in.');
      setLoading(false);
      return;
    }

    const currentRole = userProfile?.role;
    // Strictly restrict vendor console resolution to authorized roles
    if (!currentRole || !['vendor', 'admin', 'super_admin'].includes(currentRole)) {
      setVendorId(null);
      setVendorData(null);
      setError('unauthorized_role');
      setErrorMessage('Your account does not hold vendor partner privileges.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setErrorMessage(null);

    const uid = firebaseUser.uid;
    const email = (firebaseUser.email || userProfile?.email || '').trim().toLowerCase();

    try {
      // Tier 1a: Explicit vendorId from user profile — fast direct lookup
      if (userProfile?.vendorId) {
        const profileVendorRef = doc(db, 'vendors', userProfile.vendorId);
        const profileVendorSnap = await getDoc(profileVendorRef);
        if (profileVendorSnap.exists()) {
          const data = profileVendorSnap.data();
          if (data.status === 'active' || data.status === 'approved') {
            setVendorId(profileVendorSnap.id);
            setVendorData(data);
            setLoading(false);
            return;
          }
        }
      }

      // Tier 1b: Canonical lookup — check if vendor doc ID is the auth uid
      const directDocRef = doc(db, 'vendors', uid);
      const directDoc = await getDoc(directDocRef);
      if (directDoc.exists()) {
        const data = directDoc.data();
        if (data.status === 'active' || data.status === 'approved') {
          setVendorId(directDoc.id);
          setVendorData(data);
          setLoading(false);
          return;
        } else {
          setError('vendor_not_found');
          setErrorMessage(`Vendor account status is "${data.status}". Please contact administration.`);
          setLoading(false);
          return;
        }
      }

      // Tier 2: Ownership mapping lookup — query vendors where ownerUid == uid
      const ownerQuery = query(
        collection(db, 'vendors'),
        where('ownerUid', '==', uid),
        limit(1)
      );
      const ownerSnap = await getDocs(ownerQuery);
      if (!ownerSnap.empty) {
        const docSnap = ownerSnap.docs[0];
        const data = docSnap.data();
        if (data.status === 'active' || data.status === 'approved') {
          setVendorId(docSnap.id);
          setVendorData(data);
          setLoading(false);
          return;
        } else {
          setError('vendor_not_found');
          setErrorMessage(`Vendor account status is "${data.status}". Please contact administration.`);
          setLoading(false);
          return;
        }
      }

      // Tier 3: Secondary reconciliation signal — query vendors where email == authenticated email
      if (email) {
        const emailQuery = query(
          collection(db, 'vendors'),
          where('email', '==', email),
          limit(2)
        );
        const emailSnap = await getDocs(emailQuery);
        // Only link when the match is unique and unambiguous
        if (emailSnap.size === 1) {
          const docSnap = emailSnap.docs[0];
          const data = docSnap.data();
          if (data.status === 'active' || data.status === 'approved') {
            setVendorId(docSnap.id);
            setVendorData(data);
            setLoading(false);
            return;
          }
        }
      }

      // Tier 4: For Admin accounts only, if biocart default official vendor exists, permit management
      if ((currentRole === 'admin' || currentRole === 'super_admin')) {
        const officialDoc = await getDoc(doc(db, 'vendors', 'biocart'));
        if (officialDoc.exists()) {
          const data = officialDoc.data();
          setVendorId(officialDoc.id);
          setVendorData(data);
          setLoading(false);
          return;
        }
      }

      // Not found
      setVendorId(null);
      setVendorData(null);
      setError('vendor_not_found');
      setErrorMessage('No authorized vendor partner identity found for this account.');
    } catch (err: any) {
      console.error('[useVendor] Error resolving vendor identity:', err);
      setVendorId(null);
      setVendorData(null);
      if (err?.code === 'permission-denied') {
        setError('permission_denied');
        setErrorMessage('Security permissions error. Verify your email is verified and profile is active.');
      } else if (err?.code === 'unavailable' || err?.message?.includes('network') || err?.message?.includes('offline')) {
        setError('network_error');
        setErrorMessage('Network connection lost or service temporarily unavailable.');
      } else {
        setError('network_error');
        setErrorMessage(err?.message || 'Error communicating with vendor backend.');
      }
    } finally {
      setLoading(false);
    }
  }, [firebaseUser?.uid, firebaseUser?.email, userProfile?.role, userProfile?.email, isAuthenticating]);

  useEffect(() => {
    resolveIdentity();
  }, [resolveIdentity]);

  return {
    vendorId,
    vendorData,
    loading,
    error,
    errorMessage,
    user: userProfile,
    refetch: resolveIdentity
  };
}
