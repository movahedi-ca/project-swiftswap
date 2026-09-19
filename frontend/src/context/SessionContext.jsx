import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

const SessionContext = createContext({
  authenticated: false,
  displayName: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function SessionProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [displayName, setDisplayName] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const status = await api.authStatus();
      setAuthenticated(Boolean(status.authenticated));
      setDisplayName(status.displayName || null);
    } catch {
      setAuthenticated(false);
      setDisplayName(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Even if the server call fails, drop the local session.
    } finally {
      setAuthenticated(false);
      setDisplayName(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SessionContext.Provider value={{ authenticated, displayName, loading, refresh, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
