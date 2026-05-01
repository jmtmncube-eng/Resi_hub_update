import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

/**
 * Tracks which residence the admin is currently scoped to. `null` means
 * "all residences" — used on the Health tab for portfolio rollups.
 *
 * Persisted to localStorage so the choice survives reloads and route
 * changes. Only meaningful for admins; other roles ignore it.
 */

interface ResidenceContextValue {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}

const ResidenceContext = createContext<ResidenceContextValue | null>(null);

const STORAGE_KEY = 'resihub.selectedResidenceId';

export function ResidenceProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedIdRaw] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });

  function setSelectedId(id: string | null) {
    setSelectedIdRaw(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else    localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore — incognito etc */ }
  }

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSelectedIdRaw(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <ResidenceContext.Provider value={{ selectedId, setSelectedId }}>
      {children}
    </ResidenceContext.Provider>
  );
}

export function useResidence(): ResidenceContextValue {
  const ctx = useContext(ResidenceContext);
  if (!ctx) throw new Error('useResidence must be used within <ResidenceProvider>');
  return ctx;
}
