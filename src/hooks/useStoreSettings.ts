import { useState, useEffect } from 'react';
import { StoreSettings } from '../types';
import { AdminService, DEFAULT_STORE_SETTINGS } from '../services/AdminService';

/**
 * Real-time hook for consuming canonical store settings across customer and admin views.
 * Subscribes to settings/general in Firestore, with graceful fallback to DEFAULT_STORE_SETTINGS.
 */
export const useStoreSettings = () => {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const unsub = AdminService.subscribeToSettings((liveSettings) => {
      if (isMounted) {
        setSettings(liveSettings);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  return { settings, loading };
};
