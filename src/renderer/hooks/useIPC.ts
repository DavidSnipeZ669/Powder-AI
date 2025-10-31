import { useMemo } from 'react';

/**
 * Custom hook to access the Powder IPC API
 * Returns typed access to all available IPC channels and events
 */
export function useIPC() {
  return useMemo(() => {
    if (typeof window === 'undefined' || !('powder' in window)) {
      throw new Error('Powder API not available');
    }

    return window.powder;
  }, []);
}
