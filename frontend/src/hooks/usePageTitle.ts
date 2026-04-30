import { useEffect } from 'react';

/**
 * Sets the browser tab title for the current page.
 * Automatically appends " · ResiHub" and restores on unmount.
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · ResiHub`;
    return () => { document.title = 'ResiHub'; };
  }, [title]);
}
