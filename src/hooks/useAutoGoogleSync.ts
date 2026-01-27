import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const LAST_SYNC_KEY = 'google_calendar_last_auto_sync';

export function useAutoGoogleSync(adminPassword: string | null) {
  const syncInProgress = useRef(false);

  useEffect(() => {
    if (!adminPassword) return;

    const shouldSync = (): boolean => {
      const lastSync = localStorage.getItem(LAST_SYNC_KEY);
      if (!lastSync) return true;
      
      const lastSyncTime = parseInt(lastSync, 10);
      const now = Date.now();
      return now - lastSyncTime >= SYNC_INTERVAL_MS;
    };

    const performSync = async () => {
      if (syncInProgress.current) return;
      if (!shouldSync()) return;

      syncInProgress.current = true;
      
      try {
        // Check if Google Calendar is connected first
        const { data: statusData } = await supabase.functions.invoke('airtable-proxy', {
          body: { action: 'google-calendar-status' },
          headers: { 'x-admin-password': adminPassword }
        });

        if (!statusData?.connected) {
          // Not connected, skip sync
          return;
        }

        // Perform the sync
        const { data, error } = await supabase.functions.invoke('import-google-calendar', {
          headers: { 'x-admin-password': adminPassword }
        });

        if (!error && data?.success) {
          localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
          console.log('Auto Google Calendar sync completed:', data);
        }
      } catch (error) {
        console.error('Auto sync error:', error);
      } finally {
        syncInProgress.current = false;
      }
    };

    // Run sync on mount
    performSync();

    // Also set up interval for long sessions
    const interval = setInterval(performSync, SYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [adminPassword]);
}
